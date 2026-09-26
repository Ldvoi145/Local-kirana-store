-- ============================================================
-- 009: realtime for vendor dashboard (new orders + requests).
-- Run once in the Supabase SQL editor.
-- Publishes orders + suggestions over supabase_realtime so the
-- dashboard hears INSERTs instantly. Row access still follows RLS:
-- vendors only receive rows for shops they own.
-- ============================================================

do $$ begin
  alter publication supabase_realtime add table orders;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table suggestions;
exception when duplicate_object then null; end $$;
