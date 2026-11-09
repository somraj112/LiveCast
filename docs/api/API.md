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
