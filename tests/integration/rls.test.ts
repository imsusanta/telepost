import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applySchema, databaseUrl } from "./db.ts";

const pool = new pg.Pool({ connectionString: databaseUrl(), max: 8 });

async function seedUsers(client: pg.Pool | pg.PoolClient) {
  const userA = randomUUID();
  const userB = randomUUID();
  await client.query(
    `INSERT INTO profiles (id, email) VALUES ($1, 'a@example.com'), ($2, 'b@example.com')`,
    [userA, userB],
  );
  return { userA, userB };
}

async function asAppUser<T>(userId: string, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
    await client.query("SET LOCAL ROLE telepost_app");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

describe("tenant RLS and delivery uniqueness", () => {
  beforeAll(async () => {
    await applySchema(pool);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE scheduled_telegram_posts, telegram_stories, telegram_posts, channels, subscription_payments, subscriptions, profiles CASCADE");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("rejects a second post with the same Telegram chat and message id", async () => {
    const { userA } = await seedUsers(pool);
    await pool.query(
      `INSERT INTO telegram_posts (user_id, content, status, telegram_chat_id, telegram_message_id)
       VALUES ($1, 'hello', 'posted', '-1001', '42')`,
      [userA],
    );
    await expect(pool.query(
      `INSERT INTO telegram_posts (user_id, content, status, telegram_chat_id, telegram_message_id)
       VALUES ($1, 'hello again', 'posted', '-1001', '42')`,
      [userA],
    )).rejects.toMatchObject({ code: "23505" });
  });

  it("rejects a second story with the same Telegram chat and message id", async () => {
    const { userA } = await seedUsers(pool);
    await pool.query(
      `INSERT INTO telegram_stories (user_id, media_type, status, telegram_chat_id, telegram_message_id)
       VALUES ($1, 'text', 'posted', '-1001', '99')`,
      [userA],
    );
    await expect(pool.query(
      `INSERT INTO telegram_stories (user_id, media_type, status, telegram_chat_id, telegram_message_id)
       VALUES ($1, 'text', 'posted', '-1001', '99')`,
      [userA],
    )).rejects.toMatchObject({ code: "23505" });
  });

  it("prevents user A from reading or inserting user B's channel", async () => {
    const { userA, userB } = await seedUsers(pool);
    await pool.query(
      `INSERT INTO channels (user_id, name, telegram_channel_id) VALUES ($1, 'B channel', '@b')`,
      [userB],
    );

    const visible = await asAppUser(userA, async (client) => {
      const result = await client.query(`SELECT name FROM channels`);
      return result.rows;
    });
    expect(visible).toEqual([]);

    await expect(asAppUser(userA, (client) =>
      client.query(
        `INSERT INTO channels (user_id, name) VALUES ($1, 'stolen')`,
        [userB],
      )
    )).rejects.toMatchObject({ code: "42501" });
  });

  it("prevents user A from reassigning a channel to user B", async () => {
    const { userA, userB } = await seedUsers(pool);
    const inserted = await pool.query(
      `INSERT INTO channels (user_id, name) VALUES ($1, 'A channel') RETURNING id`,
      [userA],
    );
    const channelId = inserted.rows[0].id;

    await expect(asAppUser(userA, (client) =>
      client.query(`UPDATE channels SET user_id = $1 WHERE id = $2`, [userB, channelId])
    )).rejects.toMatchObject({ code: "42501" });

    const row = await pool.query(`SELECT user_id FROM channels WHERE id = $1`, [channelId]);
    expect(row.rows[0].user_id).toBe(userA);
  });

  it("lets the owner insert and update their own story without changing ownership", async () => {
    const { userA } = await seedUsers(pool);
    const storyId = await asAppUser(userA, async (client) => {
      const inserted = await client.query(
        `INSERT INTO telegram_stories (user_id, media_type, status, caption)
         VALUES ($1, 'text', 'draft', 'hello') RETURNING story_id`,
        [userA],
      );
      await client.query(
        `UPDATE telegram_stories SET caption = 'updated' WHERE story_id = $1`,
        [inserted.rows[0].story_id],
      );
      return inserted.rows[0].story_id as string;
    });
    const row = await pool.query(`SELECT caption, user_id FROM telegram_stories WHERE story_id = $1`, [storyId]);
    expect(row.rows[0].caption).toBe("updated");
    expect(row.rows[0].user_id).toBe(userA);
  });
});
