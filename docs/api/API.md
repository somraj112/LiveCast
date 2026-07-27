# API Documentation

## Base URL

```
http://localhost:3001/api/v1
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer {token}
```

## Endpoints

### Authentication

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: 200 OK
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### Register
```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}

Response: 201 Created
{
  "token": "jwt_token_here",
  "user": { ... }
}
```

#### Logout
```
POST /auth/logout
Authorization: Bearer {token}

Response: 200 OK
{
  "message": "Logged out successfully"
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
