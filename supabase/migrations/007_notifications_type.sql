-- Migration: 007_notifications_type
-- Adds a `type` discriminator to notifications so the inbox can pick an icon.
-- Allowed values mirror the categories of events that produce notifications:
--   order    - order status changes (accepted/ready/completed/declined)
--   message  - new chat message in an order thread
--   promotion - platform announcements / promos
--   system   - catch-all (account/security/other)
-- Existing rows default to 'system'.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'system'
    CHECK (type IN ('order', 'message', 'promotion', 'system'));

CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON notifications (type);
