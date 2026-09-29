-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "rate_limits_window_start_idx" ON "rate_limits"("window_start");

-- Same as rooms: nothing is reachable through Supabase's Data API.
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;

-- A least-privilege role for the app at runtime: it can read and write these two tables and nothing else.
-- It's created without a login; enable it with a password of your own (see README "Database role").
-- Migrations keep running as the owner (postgres) through DIRECT_URL.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'focusd_app') THEN
    CREATE ROLE focusd_app NOLOGIN NOINHERIT;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO focusd_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "rooms", "rate_limits" TO focusd_app;

-- RLS stays on; these policies let only the app role through.
CREATE POLICY "focusd_app_rooms" ON "rooms" FOR ALL TO focusd_app USING (true) WITH CHECK (true);
CREATE POLICY "focusd_app_rate_limits" ON "rate_limits" FOR ALL TO focusd_app USING (true) WITH CHECK (true);

-- Supabase grants new public tables to its API roles by default. Take that back too, as a second layer behind RLS.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON "rooms", "rate_limits" FROM %I', r);
    END IF;
  END LOOP;
END
$$;
