ALTER TABLE "recordings" ADD COLUMN "mux_asset_id" TEXT, ADD COLUMN "playback_id" TEXT;
CREATE UNIQUE INDEX "recordings_mux_asset_id_key" ON "recordings"("mux_asset_id");

CREATE TABLE "broadcasts" (
  "stream_id" UUID NOT NULL,
  "mux_stream_id" TEXT,
  "playback_id" TEXT,
  "key_ciphertext" TEXT,
  "last_event_at" TIMESTAMP(3),
  "stop_requested" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("stream_id"),
  CONSTRAINT "broadcasts_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "broadcasts_mux_stream_id_key" ON "broadcasts"("mux_stream_id");

CREATE TABLE "provider_events" (
  "id" TEXT NOT NULL,
  "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "provider_events_pkey" PRIMARY KEY ("id")
);
