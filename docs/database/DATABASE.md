# Database

LiveCast uses PostgreSQL through Prisma ORM. The Prisma schema is the source of truth for application models and database relations.

## Models

| Model | Purpose |
| --- | --- |
| `User` | Viewer, creator, and moderator accounts |
| `Stream` | Creator broadcasts and their lifecycle |
| `Category` | Stream discovery categories |
| `StreamTag` / `StreamTagMap` | Searchable stream tags |
| `Follow` | Viewer-to-creator follows |
| `ChatMessage` | Messages sent during a stream |
| `Moderator` / `Ban` | Stream-level moderation assignments and restrictions |
| `ViewHistory` | Viewer sessions and watch duration |
| `StreamAnalytics` | Aggregated audience and engagement metrics |
| `Recording` | Playback metadata for completed streams |
| `Notification` | Live, follow, system, and reminder notifications |

The schema uses UUID primary keys, snake_case PostgreSQL table and column names, foreign keys, uniqueness constraints, and query indexes for stream discovery, chat history, notifications, analytics, and creator pages.

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` for your PostgreSQL instance.
2. Generate the Prisma Client.

   ```bash
   npm run db:generate --workspace @streamline/server
   ```

3. Apply the development migration.

   ```bash
   npm run db:migrate --workspace @streamline/server
   ```

4. Start Prisma Studio when you need to inspect local data.

   ```bash
   npm run db:studio --workspace @streamline/server
   ```

Use `db:deploy` in deployment environments to apply committed migrations. Do not run `migrate dev` in production.

## Files

- `apps/server/prisma/schema.prisma` defines the application models.
- `apps/server/prisma/migrations` contains versioned PostgreSQL migrations.
- `apps/server/prisma.config.ts` loads `DATABASE_URL` and configures migration paths.
- `apps/server/src/config/db.js` exposes the shared Prisma client using Prisma's PostgreSQL driver adapter.
