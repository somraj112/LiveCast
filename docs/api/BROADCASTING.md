# OBS → Mux → LiveCast playback

LiveCast uses Mux managed live streams: creators send RTMPS video from OBS; viewers watch
HLS in `/streams/{streamId}` using native HLS or hls.js. Live video and finalized recordings
use signed playback policies. Authentication is required for playback, including public
streams, consistent with the current chat experience. Private streams allow only the owner
and assigned stream moderators. A ban prevents issuing new playback URLs.

## Configure the service

1. In a Mux environment, create a Video API access token with read/write permissions.
   Create a playback signing key and retain its base64-encoded RSA private PEM.
2. Set server environment variables `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`,
   `MUX_SIGNING_KEY_ID`, and `MUX_SIGNING_PRIVATE_KEY`. Generate and securely retain
   `STREAM_KEY_ENCRYPTION_KEY` with `openssl rand -hex 32`. Losing this key makes stored
   ingest keys unreadable. Keep all of these values server-side.
3. Configure a Mux webhook in the same environment pointing to
   `https://YOUR_API_HOST/api/v1/webhooks/mux`. Set its signing secret as
   `MUX_WEBHOOK_SECRET`. Local testing needs a public HTTPS tunnel to the backend; the
   callback URL must not point to the frontend. The raw-body route must remain before
   Express JSON parsing.
4. Apply `npm run db:deploy --workspace @streamline/server`, then run
   `npm run db:generate --workspace @streamline/server`. Restart the API.
5. Keep `MUX_TEST_MODE=true` for the first experiment. Mux test streams are watermarked,
   limited to five minutes, and their recorded assets are removed after 24 hours. Set
   `MUX_TEST_MODE=false` only when ready to use billable provider resources.

No provider resource is created on app startup. Provisioning occurs only when an authorized
creator requests OBS setup. The code does not create Mux accounts, access tokens, signing
keys, subscriptions, or webhooks automatically.

## Run an actual broadcast

1. Sign in as a CREATOR. Create a draft in Creator studio, then click **Set up OBS broadcast**.
2. In OBS, choose Settings → Stream → Custom. Copy the displayed server URL
   (`rtmps://global-live.mux.com:443/app`) and private stream key into their separate fields.
   Use H.264 video/AAC audio and a two-second keyframe interval.
3. Start streaming **in OBS**. The local status stays DRAFT/SCHEDULED until Mux confirms
   the stream is playable. Refresh the creator dashboard after that callback; discovery
   will list a PUBLIC live stream. A scheduled listing can show a waiting player beforehand.
4. Open **Watch broadcast** as the creator or join a live listing as a signed-in viewer.
   The player polls playback state every ten seconds without resetting the video on every
   poll. Private streams must be opened by direct link by an authorized account.
5. Stop streaming in OBS and wait through Mux's 60-second reconnection window, or request
   **Stop broadcast** in Creator studio to disable the provider ingest. Stopping is accepted
   asynchronously; callbacks confirm the final state. The recording appears after finalization.
6. Use a new LiveCast stream for each broadcast. Finished ingest resources are disabled;
   the same stream cannot be restarted. **Start demo room** retains the old chat-only
   experiment for streams that have not been provisioned with Mux.

The old `/stream-key` endpoint returns a demo UUID and is not an OBS credential. Use the
`/broadcast` endpoint or OBS setup UI for actual ingest. Deleting a non-live managed stream
first deletes its Mux ingest resource and known recording asset; local deletion proceeds only
if those provider requests succeed. This also removes the provider recording permanently.

## HTTP contract

| Endpoint | Access | Result |
| --- | --- | --- |
| `POST /api/v1/creator/streams/{id}/broadcast` | Owner, CREATOR | `{ ingestUrl, streamKey }`, no-store |
| `POST /api/v1/creator/streams/{id}/broadcast/stop` | Owner, CREATOR | `202 { stopping: true }` |
| `GET /api/v1/streams/{id}/playback` | Authenticated and authorized | `{ title, status, source, recording }`, no-store |
| `POST /api/v1/webhooks/mux` | Valid Mux HMAC signature | Status/recording update acknowledgement |

Responses use the standard `{ success, data }` or `{ success: false, error: { code, message } }`
envelope. `source` is null while waiting/processing or if no media exists. Otherwise it has
`{ url, kind: "live" | "recording", expiresAt }`. Recording metadata contains ID, duration in
whole seconds, and creation time. Public discovery/profile/detail responses never include
ingest keys or encrypted ingest credentials. The studio list contains only safe provisioning
state, not credentials.

## Callback and failure behavior

- Verify HMAC SHA-256 against the raw body and `mux-signature`; accept timestamps within
  five minutes and multiple rotation signatures. Never log or store the raw webhook payload:
  Mux live-stream event bodies may include the ingest key.
- `video.live_stream.active` sets LIVE. `video.live_stream.idle` ends a completed session
  after its reconnect window; initial idle events without a session are ignored.
- `video.asset.ready` is deliberately ignored for final recordings: it can occur during the
  live broadcast. `video.asset.live_stream_completed` stores final asset ID, signed playback
  ID, manifest/thumbnail base URLs, and duration, and sets ENDED even if idle arrives later.
- `video.asset.deleted` removes recording metadata, including expired test assets.
- Transactions lock the Stream row; durable ProviderEvent IDs deduplicate callbacks. Stale
  live status events do not overwrite newer status, and ENDED is terminal.
- A finished provider ingest is disabled. If that request fails after committing a callback,
  return 502 so Mux retries; duplicate event delivery still retries provider cleanup.
- A durable Broadcast reservation prevents concurrent setup calls creating duplicate provider
  resources. If provisioning has an ambiguous network failure, future setup calls return
  `BROADCAST_SETUP_PENDING` instead of blindly creating a second resource. An operator must
  reconcile the resource in Mux using `passthrough = LiveCast stream ID`. If a remote resource
  exists, disable/delete it before clearing the pending reservation and retrying setup. If
  none exists, confirm the original request cannot still complete before clearing it. Never
  reset pending reservations automatically. API failures are sanitized to avoid key exposure.

Signed video URLs are bearer capabilities, valid for at least one hour (longer for recordings
so they cover the video duration). Bans and permission changes stop renewal but cannot revoke
an already-issued URL immediately. Signed thumbnail base URLs in the database also require
their own image-audience token before use; this milestone does not expose thumbnail playback.
HLS has broadcast latency and is not two-way WebRTC. Realtime rooms still require one
persistent Node process as documented in REALTIME.md.

## Verification

Normal API/socket tests: `npm test --workspace @streamline/server`.

The additional eight broadcasting integration tests opt into a disposable PostgreSQL database
whose name ends in `_test`. Apply migrations to that database, generate Prisma, then run:

```sh
TEST_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/livecast_broadcast_test npm test --workspace @streamline/server
```

These tests use real Prisma/PostgreSQL transactions and HTTP routes, while mocking only
provider HTTP responses. They cover concurrent setup, ownership/RBAC, encryption, ambiguous
failures, signature/age validation, duplicate/stale callbacks, final recordings, signed JWTs,
private access, bans, stop requests, and retryable cleanup. They do not transmit video to Mux.
The OBS-to-Mux media test needs real credentials and a reachable webhook URL.

References: [live streaming](https://www.mux.com/docs/guides/start-live-streaming),
[OBS setup](https://www.mux.com/docs/guides/configure-broadcast-software),
[recording lifecycle](https://www.mux.com/docs/guides/stream-recordings-of-live-streams),
[webhook verification](https://www.mux.com/docs/core/verify-webhook-signatures),
[signed playback](https://www.mux.com/docs/guides/secure-video-playback), and
[test stream limits](https://www.mux.com/docs/api-reference/video/live-streams/create-live-stream).
