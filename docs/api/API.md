# API Documentation

## Base URL

```
http://localhost:3001/api/v1
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer {access_token}
```

## Endpoints

### Authentication

#### Register
```
POST /auth/register
Content-Type: application/json

{
  "username": "creator_name",
  "email": "user@example.com",
  "password": "a-secure-password"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "accessToken": "short_lived_jwt",
    "user": { ... }
  }
}
```

The rotating refresh token is returned as a secure HTTP-only cookie rather than in JSON.

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "a-secure-password"
}

Response: 200 OK (same data shape and refresh cookie as register)
```

#### Refresh
```
POST /auth/refresh
Cookie: livecast_refresh={refresh_token}

Response: 200 OK (rotates the refresh cookie and returns a new access token)
```

#### Current user
```
GET /auth/me
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": { "user": { ... } }
}
```

#### Logout
```
POST /auth/logout
Cookie: livecast_refresh={refresh_token}

Response: 200 OK
{
  "success": true,
  "data": { "message": "Logged out successfully." }
}
```

### Stream management

Creator endpoints require a `CREATOR` access token. Stream responses from list, create,
update, schedule, start, and end never contain the stream key.

#### Creator dashboard list
```http
GET /creator/streams
Authorization: Bearer {access_token}
```

#### Create a draft
```http
POST /creator/streams
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "Friday night studio session",
  "description": "A live set from the studio.",
  "categoryId": "category_uuid",
  "visibility": "PUBLIC"
}
```

#### Update stream details
```http
PATCH /creator/streams/{stream_id}
Authorization: Bearer {access_token}
```

Updates are allowed only while the stream is `DRAFT` or `SCHEDULED`.

#### Schedule, start, and end
```http
POST /creator/streams/{stream_id}/schedule
{ "scheduledAt": "2026-11-12T14:30:00.000Z" }

POST /creator/streams/{stream_id}/start
POST /creator/streams/{stream_id}/end
```

Valid transitions are `DRAFT → SCHEDULED → LIVE → ENDED`; creators may also start a
draft immediately. Starting an ended stream or ending a non-live stream returns `409`.

#### Delete a stream
```http
DELETE /creator/streams/{stream_id}
Authorization: Bearer {access_token}
```

Live streams must be ended before deletion.

#### Retrieve the private stream key
```http
GET /creator/streams/{stream_id}/stream-key
Authorization: Bearer {access_token}
```

This ownership-protected response uses `Cache-Control: no-store`. The key is never
included in public endpoints or creator dashboard list responses.

#### Public stream details
```http
GET /streams/{stream_id}
```

Returns scheduled, live, or ended `PUBLIC`/`UNLISTED` streams. Draft and private streams
return `404`, and the response never contains the stream key.

#### Categories
```http
GET /categories
```

### Content

#### Get All Videos
```
GET /content/videos?page=1&limit=20
Response: 200 OK
{
  "data": [
    {
      "id": "video_id",
      "title": "Video Title",
      "description": "Description",
      "duration": 3600,
      "thumbnail": "url",
      "uploadedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

#### Upload Video
```
POST /content/videos
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- file: video_file
- title: "Video Title"
- description: "Description"

Response: 201 Created
{
  "id": "video_id",
  "title": "Video Title",
  "status": "processing"
}
```

## Error Responses

```
400 Bad Request
{
  "error": "Invalid input",
  "details": "Email is required"
}

401 Unauthorized
{
  "error": "Unauthorized",
  "details": "Token expired or invalid"
}

404 Not Found
{
  "error": "Not found",
  "details": "Resource not found"
}

500 Internal Server Error
{
  "error": "Internal server error",
  "details": "An unexpected error occurred"
}
```
