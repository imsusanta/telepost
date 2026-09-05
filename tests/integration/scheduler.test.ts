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

describe("scheduler locking and recovery", () => {
  beforeAll(async () => {
    await applySchema(pool);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE scheduled_telegram_posts, telegram_stories, telegram_posts, channels, subscription_payments, subscriptions, profiles CASCADE");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("does not send future posts during normal scheduling", async () => {
    const { userA } = await seedUsers(pool);
    const futureId = randomUUID();
    await pool.query(
      `INSERT INTO scheduled_telegram_posts (id, user_id, chat_id, quiz_data, scheduled_time, status)
       VALUES ($1, $2, 'chat', '{"questions":[]}', now() + interval '2 hours', 'pending')`,
      [futureId, userA],
    );
    const claimed = await pool.query(`SELECT * FROM claim_due_scheduled_posts($1, 5, 'worker-1')`, [userA]);
    expect(claimed.rowCount).toBe(0);
    const row = await pool.query(`SELECT status FROM scheduled_telegram_posts WHERE id = $1`, [futureId]);
    expect(row.rows[0].status).toBe("pending");
  });

  it("prevents user A from claiming user B's posts", async () => {
    const { userA, userB } = await seedUsers(pool);
    const postB = randomUUID();
    await pool.query(
      `INSERT INTO scheduled_telegram_posts (id, user_id, chat_id, quiz_data, scheduled_time, status)
       VALUES ($1, $2, 'chat', '{"questions":[]}', now() - interval '1 minute', 'pending')`,
      [postB, userB],
    );
    const claimedByA = await pool.query(`SELECT * FROM claim_due_scheduled_posts($1, 5, 'worker-a')`, [userA]);
    expect(claimedByA.rowCount).toBe(0);
    const claimedByIds = await pool.query(
      `SELECT * FROM claim_scheduled_posts_by_ids(ARRAY[$1]::uuid[], $2, 'worker-a')`,
      [postB, userA],
    );
    expect(claimedByIds.rowCount).toBe(0);
    const row = await pool.query(`SELECT status FROM scheduled_telegram_posts WHERE id = $1`, [postB]);
    expect(row.rows[0].status).toBe("pending");
  });

  it("does not change post status when a rejected claim happens", async () => {
    const { userA, userB } = await seedUsers(pool);
    const postId = randomUUID();
    await pool.query(
      `INSERT INTO telegram_posts (id, user_id, content, status)
       VALUES ($1, $2, 'hello', 'draft')`,
      [postId, userB],
    );
    const claimed = await pool.query(
      `SELECT * FROM claim_telegram_post_for_dispatch($1, $2, 'worker-a', true)`,
      [postId, userA],
    );
    expect(claimed.rowCount).toBe(0);
    const row = await pool.query(`SELECT status, lease_owner FROM telegram_posts WHERE id = $1`, [postId]);
    expect(row.rows[0].status).toBe("draft");
    expect(row.rows[0].lease_owner).toBeNull();
  });

  it("prevents concurrent workers from claiming the same job", async () => {
    const { userA } = await seedUsers(pool);
    const postId = randomUUID();
    await pool.query(
      `INSERT INTO scheduled_telegram_posts (id, user_id, chat_id, quiz_data, scheduled_time, status)
       VALUES ($1, $2, 'chat', '{"questions":[]}', now() - interval '1 minute', 'pending')`,
      [postId, userA],
    );

    const client1 = await pool.connect();
    const client2 = await pool.connect();
    try {
      await client1.query("BEGIN");
      await client2.query("BEGIN");
      const first = await client1.query(`SELECT id FROM claim_due_scheduled_posts(NULL, 5, 'worker-1')`);
      const second = await client2.query(`SELECT id FROM claim_due_scheduled_posts(NULL, 5, 'worker-2')`);
      await client1.query("COMMIT");
      await client2.query("COMMIT");
      const ids = [...first.rows, ...second.rows].map((row) => row.id);
      expect(ids).toEqual([postId]);
      expect(first.rowCount + second.rowCount).toBe(1);
    } finally {
      client1.release();
      client2.release();
    }
  });

  it("does not steal an active lease during recovery", async () => {
    const { userA } = await seedUsers(pool);
    const postId = randomUUID();
    await pool.query(
      `INSERT INTO scheduled_telegram_posts
        (id, user_id, chat_id, quiz_data, scheduled_time, status, lease_owner, lease_expires_at, attempts)
       VALUES ($1, $2, 'chat', '{"questions":[]}', now() - interval '1 minute', 'processing', 'worker-live', now() + interval '5 minutes', 1)`,
      [postId, userA],
    );
    await pool.query(`SELECT recover_scheduler_jobs()`);
    const row = await pool.query(
      `SELECT status, lease_owner FROM scheduled_telegram_posts WHERE id = $1`,
      [postId],
    );
    expect(row.rows[0].status).toBe("processing");
    expect(row.rows[0].lease_owner).toBe("worker-live");
  });

  it("recovers only abandoned leases", async () => {
    const { userA } = await seedUsers(pool);
    const postId = randomUUID();
    await pool.query(
      `INSERT INTO scheduled_telegram_posts
        (id, user_id, chat_id, quiz_data, scheduled_time, status, lease_owner, lease_expires_at, attempts)
       VALUES ($1, $2, 'chat', '{"questions":[]}', now() - interval '1 minute', 'processing', 'worker-dead', now() - interval '1 minute', 1)`,
      [postId, userA],
    );
    await pool.query(`SELECT recover_scheduler_jobs()`);
    const row = await pool.query(
      `SELECT status, lease_owner FROM scheduled_telegram_posts WHERE id = $1`,
      [postId],
    );
    expect(row.rows[0].status).toBe("pending");
    expect(row.rows[0].lease_owner).toBeNull();
  });

  it("partial quiz retries skip already-recorded successful polls", async () => {
    const { userA } = await seedUsers(pool);
    const postId = randomUUID();
    await pool.query(
      `INSERT INTO scheduled_telegram_posts
        (id, user_id, chat_id, quiz_data, scheduled_time, status, lease_owner, attempts, delivery_progress)
       VALUES ($1, $2, 'chat', '{"questions":[{},{},{}]}', now() - interval '1 minute', 'processing', 'worker-1', 1,
               '{"intro_sent":true,"polls_sent":[0,1]}'::jsonb)`,
      [postId, userA],
    );
    const recorded = await pool.query(
      `SELECT record_scheduled_post_progress($1, 'worker-1', '{"intro_sent":true,"polls_sent":[0,1,2]}'::jsonb)`,
      [postId],
    );
    expect(recorded.rows[0].record_scheduled_post_progress).toBe(true);
    const row = await pool.query(`SELECT delivery_progress FROM scheduled_telegram_posts WHERE id = $1`, [postId]);
    expect(row.rows[0].delivery_progress.polls_sent).toEqual([0, 1, 2]);
    const stolen = await pool.query(
      `SELECT record_scheduled_post_progress($1, 'other-worker', '{"polls_sent":[]}'::jsonb)`,
      [postId],
    );
    expect(stolen.rows[0].record_scheduled_post_progress).toBe(false);
    const unchanged = await pool.query(`SELECT delivery_progress FROM scheduled_telegram_posts WHERE id = $1`, [postId]);
    expect(unchanged.rows[0].delivery_progress.polls_sent).toEqual([0, 1, 2]);
  });

  it("does not let user A claim user B's scheduled story", async () => {
    const { userA, userB } = await seedUsers(pool);
    const storyId = randomUUID();
    await pool.query(
      `INSERT INTO telegram_stories (story_id, user_id, media_type, status, scheduled_time)
       VALUES ($1, $2, 'text', 'scheduled', now() - interval '1 minute')`,
      [storyId, userB],
    );
    const claimed = await pool.query(
      `SELECT * FROM claim_telegram_story_for_dispatch($1, $2, 'worker-a', true)`,
      [storyId, userA],
    );
    expect(claimed.rowCount).toBe(0);
    const due = await pool.query(`SELECT * FROM claim_due_telegram_stories($1, 5, 'worker-a')`, [userA]);
    expect(due.rowCount).toBe(0);
  });

  it("skips stories that already have a Telegram message id", async () => {
    const { userA } = await seedUsers(pool);
    const storyId = randomUUID();
    await pool.query(
      `INSERT INTO telegram_stories (story_id, user_id, media_type, status, scheduled_time, telegram_message_id)
       VALUES ($1, $2, 'text', 'scheduled', now() - interval '1 minute', '99')`,
      [storyId, userA],
    );
    const claimed = await pool.query(`SELECT * FROM claim_due_telegram_stories($1, 5, 'worker-1')`, [userA]);
    expect(claimed.rowCount).toBe(0);
  });

  it("does not reclaim a post that already has telegram_message_id", async () => {
    const { userA } = await seedUsers(pool);
    const postId = randomUUID();
    await pool.query(
      `INSERT INTO telegram_posts (id, user_id, content, status, telegram_message_id)
       VALUES ($1, $2, 'hello', 'draft', 'already-sent')`,
      [postId, userA],
    );
    const claimed = await pool.query(
      `SELECT * FROM claim_telegram_post_for_dispatch($1, $2, 'worker-1', true)`,
      [postId, userA],
    );
    expect(claimed.rowCount).toBe(0);
  });

  it("does not reclaim a post after Telegram accept was recorded as dispatch_started", async () => {
    const { userA } = await seedUsers(pool);
    const postId = randomUUID();
    await pool.query(
      `INSERT INTO telegram_posts (id, user_id, content, status, lease_owner, lease_expires_at, dispatch_started_at)
       VALUES ($1, $2, 'hello', 'draft', 'worker-dead', now() - interval '1 minute', now() - interval '1 minute')`,
      [postId, userA],
    );
    const claimed = await pool.query(
      `SELECT * FROM claim_telegram_post_for_dispatch($1, $2, 'worker-retry', true)`,
      [postId, userA],
    );
    expect(claimed.rowCount).toBe(0);
  });

  it("does not reclaim a story after dispatch_started_at is set", async () => {
    const { userA } = await seedUsers(pool);
    const storyId = randomUUID();
    await pool.query(
      `INSERT INTO telegram_stories (story_id, user_id, media_type, status, scheduled_time, dispatch_started_at)
       VALUES ($1, $2, 'text', 'scheduled', now() - interval '1 minute', now())`,
      [storyId, userA],
    );
    const claimed = await pool.query(
      `SELECT * FROM claim_telegram_story_for_dispatch($1, $2, 'worker-retry', true)`,
      [storyId, userA],
    );
    expect(claimed.rowCount).toBe(0);
    const due = await pool.query(`SELECT * FROM claim_due_telegram_stories($1, 5, 'worker-retry')`, [userA]);
    expect(due.rowCount).toBe(0);
  });
});
