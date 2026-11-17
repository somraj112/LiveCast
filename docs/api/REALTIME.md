# Realtime rooms and chat

The Express HTTP server also hosts Socket.IO at `/socket.io`. Set `FRONTEND_URL` to
the exact permitted browser origin and `NEXT_PUBLIC_SOCKET_URL` to the backend origin.
Both HTTP polling and WebSocket upgrades are supported. No database migration is required;
the existing ChatMessage, Moderator, and Ban models are used.

## Authentication and room access

Connect with `auth: { token: accessToken }`. Tokens are verified using the existing JWT
issuer/audience/type checks, and accounts are checked in the database. Connections expire
with their access token; the web client refreshes the session before reconnecting and
rejoins the room to recover the latest 50 undeleted messages. It does not resend messages
automatically after an uncertain acknowledgement.

Only LIVE streams can be joined. PUBLIC and UNLISTED streams are available to authenticated
users; PRIVATE streams require ownership or a Moderator assignment for that stream.
Being a user with the global MODERATOR role alone does not confer room moderation rights.
Banned accounts cannot join or send. Each action checks current stream access, assignment,
and ban state. Room IDs, message IDs, user IDs, and payloads are validated server-side.

## Client events

Every event accepts an acknowledgement callback returning either
`{ success: true, data: ... }` or `{ success: false, error: { code, message } }`.

| Event | Payload | Result |
| --- | --- | --- |
| `stream:join` | `{ streamId }` | `{ streamId, userId, canModerate, messages, bans, count }` |
| `stream:leave` | `{ streamId }` | `{ streamId }`; safe to repeat |
| `chat:send` | `{ streamId, message }` | `{ message }` after database persistence |
| `chat:delete` | `{ streamId, messageId }` | `{ messageId }`; sets ChatMessage.deleted |
| `moderation:ban` | `{ streamId, userId, reason? }` | `{ userId }`; upserts Ban and ejects all target connections |
| `moderation:unban` | `{ streamId, userId }` | `{ userId }`; removes Ban; target may rejoin |

The last three events require the owner or an assigned moderator, joined to that stream.
Delete is constrained by both message ID and stream ID. Owners and assigned moderators
cannot be banned. Only moderators receive the existing ban list on join.

Messages are trimmed, must contain 1–2000 characters, and are rendered as plain React text.
Each socket accepts at most 30 commands per 10 seconds. Chat sends also require 750ms
between messages per account across its connections. Payloads are capped at 16 KiB.

## Server events

| Event | Payload |
| --- | --- |
| `chat:message` | Saved message with public sender ID/username |
| `chat:deleted` | `{ streamId, messageId }` |
| `stream:viewers` | `{ streamId, count }` |
| `stream:banned` | `{ streamId }`, sent to every ejected connection |
| `moderation:banned` | `{ streamId, userId, reason, user: { username } }` |
| `moderation:unbanned` | `{ streamId, userId }` |

Counts represent distinct connected authenticated accounts, excluding the stream owner;
multiple tabs count once. Join, leave, disconnect, and ban publish fresh counts.
They are presence counts, not durable analytics. Reconnect history excludes deleted content.

## Runtime scope and verification

This milestone runs on one persistent Node process with the default in-memory adapter.
Room mutations are serialized per stream to order message sends, moderation, and history
snapshots. Before deploying multiple replicas, introduce a shared adapter, shared presence,
shared rate limits, and cross-process ordering. Persisted messages and bans survive restarts;
presence does not. Replays are bounded to 50 messages; older-history pagination is not provided.
Media playback is a separate milestone. Stream status is rechecked on each chat action.

Run `npm test --workspace @streamline/server` for real client/server Socket.IO tests plus
the existing API tests. The new suite covers authentication, visibility/status restrictions,
membership, persistence/broadcast ordering, unique viewer counts, disconnect cleanup,
moderation authorization, deleted-message replay, multi-tab bans, unban, validation,
rate limits, and failed database writes. Prisma is mocked, so these tests do not verify a
running PostgreSQL instance. Open a live listing's “Join live conversation” link or the
creator studio's “Open chat & moderation” link to use the browser UI.

Socket.IO references: [rooms](https://socket.io/docs/v4/rooms/) and
[connection middleware](https://socket.io/docs/v4/middlewares/).
