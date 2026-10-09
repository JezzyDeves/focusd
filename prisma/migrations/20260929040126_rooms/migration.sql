-- CreateEnum
CREATE TYPE "Mode" AS ENUM ('focus', 'short', 'long');

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "host_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_mode" "Mode",
    "sync_start_at" TIMESTAMP(3),
    "sync_end_at" TIMESTAMP(3),
    "sync_checkins" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- Supabase exposes the public schema through its Data API to anyone with the publishable key.
-- RLS with no policies closes that off; the app reaches this table only through Prisma, server-side.
ALTER TABLE "rooms" ENABLE ROW LEVEL SECURITY;
