import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applySchema, databaseUrl } from "./db.ts";

const pool = new pg.Pool({ connectionString: databaseUrl(), max: 8 });

async function seedPlan(client: pg.Pool, billingPeriod = "monthly", price = 29) {
  const userId = randomUUID();
  const planId = randomUUID();
  await client.query(`INSERT INTO profiles (id, email) VALUES ($1, 'buyer@example.com')`, [userId]);
  await client.query(
    `INSERT INTO subscription_plans (id, name, display_name, price, billing_period)
     VALUES ($1, $2, 'Basic', $3, $4)`,
    [planId, `plan-${planId.slice(0, 8)}`, price, billingPeriod],
  );
  return { userId, planId };
}

async function insertOrder(
  client: pg.Pool | pg.PoolClient,
  input: { userId: string; planId: string; orderId: string; paise: number; period: string },
) {
  await client.query(
    `INSERT INTO subscription_payments
      (user_id, plan_id, amount, amount_paise, plan_billing_period, currency, razorpay_order_id, payment_status)
     VALUES ($1, $2, $3, $4, $5, 'INR', $6, 'pending')`,
    [input.userId, input.planId, input.paise / 100, input.paise, input.period, input.orderId],
  );
}

describe("payment finalization", () => {
  beforeAll(async () => {
    await applySchema(pool);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE subscription_payments, subscriptions, profiles, subscription_plans CASCADE");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("rejects mismatched ownership, amount, and currency", async () => {
    const { userId, planId } = await seedPlan(pool);
    const otherUser = randomUUID();
    await pool.query(`INSERT INTO profiles (id, email) VALUES ($1, 'other@example.com')`, [otherUser]);
    await insertOrder(pool, { userId, planId, orderId: "order_own", paise: 2900, period: "monthly" });

    await expect(pool.query(
      `SELECT finalize_razorpay_payment('order_own', 'pay_1', $1, 2900, 'INR', 'captured', NULL)`,
      [otherUser],
    )).rejects.toThrow(/ownership mismatch/);

    const amountMismatch = await pool.query(
      `SELECT finalize_razorpay_payment('order_own', 'pay_1', $1, 9900, 'INR', 'captured', NULL) AS payload`,
      [userId],
    );
    expect(amountMismatch.rows[0].payload.success).toBe(false);
    expect(amountMismatch.rows[0].payload.error).toBe("amount mismatch");

    await expect(pool.query(
      `SELECT finalize_razorpay_payment('order_own', 'pay_1', $1, 2900, 'USD', 'captured', NULL)`,
      [userId],
    )).rejects.toThrow(/currency mismatch/);

    const payment = await pool.query(`SELECT payment_status FROM subscription_payments WHERE razorpay_order_id = 'order_own'`);
    expect(payment.rows[0].payment_status).toBe("underpaid");
    const sub = await pool.query(`SELECT * FROM subscriptions WHERE user_id = $1`, [userId]);
    expect(sub.rowCount).toBe(0);
  });

  it("applies entitlement duration from the purchased plan", async () => {
    const { userId, planId } = await seedPlan(pool, "monthly", 29);
    await insertOrder(pool, { userId, planId, orderId: "order_month", paise: 2900, period: "monthly" });
    const result = await pool.query(
      `SELECT finalize_razorpay_payment('order_month', 'pay_month', $1, 2900, 'INR', 'captured', 'sig') AS payload`,
      [userId],
    );
    const payload = result.rows[0].payload;
    expect(payload.success).toBe(true);
    expect(payload.billing_period).toBe("monthly");
    const end = new Date(payload.period_end).getTime();
    const start = new Date(payload.period_start).getTime();
    const days = (end - start) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(27);
    expect(days).toBeLessThan(32);

    const yearly = await seedPlan(pool, "yearly", 99);
    await insertOrder(pool, {
      userId: yearly.userId,
      planId: yearly.planId,
      orderId: "order_year",
      paise: 9900,
      period: "yearly",
    });
    const yearlyResult = await pool.query(
      `SELECT finalize_razorpay_payment('order_year', 'pay_year', $1, 9900, 'INR', 'captured', 'sig') AS payload`,
      [yearly.userId],
    );
    const yearlyDays =
      (new Date(yearlyResult.rows[0].payload.period_end).getTime() -
        new Date(yearlyResult.rows[0].payload.period_start).getTime()) /
      (24 * 60 * 60 * 1000);
    expect(yearlyDays).toBeGreaterThan(360);
    expect(yearlyDays).toBeLessThan(367);
  });

  it("does not extend a subscription twice when verification is replayed", async () => {
    const { userId, planId } = await seedPlan(pool);
    await insertOrder(pool, { userId, planId, orderId: "order_replay", paise: 2900, period: "monthly" });
    const first = await pool.query(
      `SELECT finalize_razorpay_payment('order_replay', 'pay_replay', $1, 2900, 'INR', 'captured', 'sig') AS payload`,
      [userId],
    );
    const second = await pool.query(
      `SELECT finalize_razorpay_payment('order_replay', 'pay_replay', $1, 2900, 'INR', 'captured', 'sig') AS payload`,
      [userId],
    );
    expect(second.rows[0].payload.already_finalized).toBe(true);
    expect(second.rows[0].payload.period_end).toBe(first.rows[0].payload.period_end);
    const payments = await pool.query(`SELECT count(*)::int AS n FROM subscription_payments WHERE user_id = $1 AND payment_status = 'success'`, [userId]);
    expect(payments.rows[0].n).toBe(1);
  });

  it("finalizes only once under concurrent webhook and browser verification", async () => {
    const { userId, planId } = await seedPlan(pool);
    await insertOrder(pool, { userId, planId, orderId: "order_race", paise: 2900, period: "monthly" });

    const client1 = await pool.connect();
    const client2 = await pool.connect();
    try {
      const run = (client: pg.PoolClient, paymentId: string) =>
        client.query(
          `SELECT finalize_razorpay_payment('order_race', $2, $1, 2900, 'INR', 'captured', 'sig') AS payload`,
          [userId, paymentId],
        );
      const results = await Promise.allSettled([
        run(client1, "pay_browser"),
        run(client2, "pay_webhook"),
      ]);
      const fulfilled = results.filter((result) => result.status === "fulfilled") as PromiseFulfilledResult<pg.QueryResult>[];
      const rejected = results.filter((result) => result.status === "rejected");
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);
      expect(fulfilled.length + rejected.length).toBe(2);

      const sub = await pool.query(`SELECT current_period_end FROM subscriptions WHERE user_id = $1`, [userId]);
      expect(sub.rowCount).toBe(1);
      const successRows = await pool.query(
        `SELECT razorpay_payment_id FROM subscription_payments WHERE razorpay_order_id = 'order_race' AND payment_status = 'success'`,
      );
      expect(successRows.rowCount).toBe(1);
    } finally {
      client1.release();
      client2.release();
    }
  });

  it("leaves no partial payment or entitlement state when the transaction rolls back", async () => {
    const { userId, planId } = await seedPlan(pool);
    await insertOrder(pool, { userId, planId, orderId: "order_tx", paise: 2900, period: "monthly" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `SELECT finalize_razorpay_payment('order_tx', 'pay_tx', $1, 2900, 'INR', 'captured', 'sig')`,
        [userId],
      );
      const inside = await client.query(`SELECT payment_status FROM subscription_payments WHERE razorpay_order_id = 'order_tx'`);
      expect(inside.rows[0].payment_status).toBe("success");
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
    const payment = await pool.query(`SELECT payment_status FROM subscription_payments WHERE razorpay_order_id = 'order_tx'`);
    expect(payment.rows[0].payment_status).toBe("pending");
    const sub = await pool.query(`SELECT * FROM subscriptions WHERE user_id = $1`, [userId]);
    expect(sub.rowCount).toBe(0);
    const profile = await pool.query(`SELECT payment_status, payment_expires_at FROM profiles WHERE id = $1`, [userId]);
    expect(profile.rows[0].payment_status).toBe("pending");
    expect(profile.rows[0].payment_expires_at).toBeNull();
  });
});
