-- Migration: 003_add_food_type_and_fix_notifications
-- Adds food_type column to stores and fixes notification policies

-- Add food_type column to stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS food_type text;

-- Fix notifications insert policy for sellers
-- Allow sellers to insert notifications for customers involved in their orders
DROP POLICY IF EXISTS "Notifications: insert own" ON notifications;

CREATE POLICY "Notifications: insert own or order-related"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM orders
      WHERE orders.customer_id = notifications.user_id
        AND orders.store_id IN (
          SELECT stores.id FROM stores WHERE stores.user_id = auth.uid()
        )
    )
  );
