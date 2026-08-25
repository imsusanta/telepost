-- Align public.subscription_payments with what the payment edge functions write.
--
-- Background: 20260112000000_user_payment_system.sql created this table without a
-- plan_id column, and with a payment_status CHECK constraint limited to
-- ('pending', 'success', 'failed', 'refunded'). Both create-razorpay-order and
-- verify-razorpay-payment reference plan_id, and razorpay-webhook records
-- 'underpaid' when a capture does not cover the order amount. Without this
-- migration:
--
--   * create-razorpay-order fails on insert  -> "Could not record the order."
--   * verify-razorpay-payment fails on select -> "Payment record not found for
--     this account", and it fails AFTER the money has been taken.
--   * razorpay-webhook cannot flag an underpayment, so the row keeps saying
--     'pending' and the underpayment is invisible.

-- 1. plan_id ------------------------------------------------------------------
-- Nullable on purpose: payments that arrive through a Razorpay Payment Link
-- have no order row created by this app and therefore no plan. ON DELETE SET
-- NULL keeps payment history intact if a plan is ever removed.

ALTER TABLE public.subscription_payments
    ADD COLUMN IF NOT EXISTS plan_id UUID
    REFERENCES public.subscription_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_payments_plan_id
    ON public.subscription_payments(plan_id);

-- 2. payment_status vocabulary ------------------------------------------------
-- The original constraint was created inline by CREATE TABLE, so its generated
-- name is not guaranteed across environments that were set up at different
-- times. Drop whichever CHECK constraint governs payment_status, then add a
-- named one so future migrations can rely on the name.

DO $payments$
DECLARE
    constraint_row RECORD;
BEGIN
    FOR constraint_row IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'subscription_payments'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%payment_status%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.subscription_payments DROP CONSTRAINT %I',
            constraint_row.conname
        );
    END LOOP;
END;
$payments$;

ALTER TABLE public.subscription_payments
    ADD CONSTRAINT subscription_payments_payment_status_check
    CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded', 'underpaid'));

-- 3. Backfill -----------------------------------------------------------------
-- Older rows stored no plan reference at all. Where the description still names
-- the plan ("Payment for Pro plan"), link it back up. This is best-effort and
-- deliberately conservative: it only fills rows that are currently NULL and
-- where exactly one active plan matches.

UPDATE public.subscription_payments sp
SET plan_id = p.id
FROM public.subscription_plans p
WHERE sp.plan_id IS NULL
  AND sp.description IS NOT NULL
  AND sp.description ILIKE '%' || p.name || '%'
  AND (
      SELECT COUNT(*)
      FROM public.subscription_plans p2
      WHERE sp.description ILIKE '%' || p2.name || '%'
  ) = 1;
