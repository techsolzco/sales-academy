-- Migration 029: Add display_order to tools table
-- Controls the order tools appear in student dashboard, dropdowns, etc.
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/musnmhafbxxvnhjchyta/sql

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Index for ordering queries
CREATE INDEX IF NOT EXISTS idx_tools_display_order
  ON tools(display_order ASC, name ASC);

-- Seed initial display_order based on created_at order (existing tools get 10, 20, 30...)
WITH ordered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at ASC)) * 10 AS ord
  FROM tools
  WHERE deleted_at IS NULL
)
UPDATE tools t
SET display_order = o.ord
FROM ordered o
WHERE t.id = o.id
  AND t.display_order = 0;
