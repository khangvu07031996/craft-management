# API Documentation

## 🎯 Quick Access

- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs.json
- **API Base URL**: http://localhost:3000/api

## 📖 Using Swagger UI

### Step 1: Start the Server

```bash
npm run dev
```

### Step 2: Open Swagger UI

Open your browser and navigate to:
```
http://localhost:3000/api-docs
```

### Step 3: Test Authentication

1. **Register a New User**
   - Find `POST /api/auth/register` under "Authentication" tag
   - Click "Try it out"
   - Modify the request body (or use default)
   - Click "Execute"
   - Copy the `token` from the response

2. **Authorize**
   - Click the "Authorize" button (🔒) at the top right
   - Enter: `Bearer YOUR_TOKEN_HERE` (replace with your actual token)
   - Click "Authorize"
   - Click "Close"

3. **Test Protected Endpoints**
   - Now you can test any endpoint under "Users" section
   - All requests will automatically include your authentication token

## 📋 API Endpoints Overview

### Authentication Endpoints (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login existing user |
| GET | `/api/auth/me` | Get current user profile (requires auth) |

### User Management Endpoints (Protected - Requires Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create a new user |
| PUT | `/api/users/:id` | Update user information |
| DELETE | `/api/users/:id` | Delete a user |

### Health Check (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check API health status |

## 🔐 Authentication

This API uses JWT (JSON Web Token) for authentication.

### How to Authenticate

1. **Register or Login** to get a JWT token
2. Include the token in the `Authorization` header:
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

### Token Expiry

- Default expiry: 7 days
- Configurable via `JWT_EXPIRES_IN` in `.env`

## 📝 Request/Response Examples

### 1. Register a New User

**Request:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "age": 30
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "name": "John Doe",
      "age": 30,
      "created_at": "2025-11-07T10:00:00.000Z",
      "updated_at": "2025-11-07T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "name": "John Doe",
      "age": 30,
      "created_at": "2025-11-07T10:00:00.000Z",
      "updated_at": "2025-11-07T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Get All Users (Protected)

**Request:**
```http
GET /api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "name": "John Doe",
      "age": 30,
      "created_at": "2025-11-07T10:00:00.000Z",
      "updated_at": "2025-11-07T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### 4. Get Current User Profile (Protected)

**Request:**
```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "name": "John Doe",
    "age": 30,
    "created_at": "2025-11-07T10:00:00.000Z",
    "updated_at": "2025-11-07T10:00:00.000Z"
  }
}
```

### 5. Update User (Protected)

**Request:**
```http
PUT /api/users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "John Updated Doe",
  "age": 31
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "name": "John Updated Doe",
    "age": 31,
    "created_at": "2025-11-07T10:00:00.000Z",
    "updated_at": "2025-11-07T10:05:00.000Z"
  }
}
```

### 6. Delete User (Protected)

**Request:**
```http
DELETE /api/users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Email and password are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided. Please authenticate."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found with ID: 550e8400-e29b-41d4-a716-446655440000"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Email is already registered"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Server error during registration",
  "error": "Detailed error message (only in development)"
}
```

## 🔧 Data Models

### User Object

```typescript
{
  id: string;           // UUID
  email: string;        // Email address
  name: string;         // Full name
  age?: number;         // Age (optional)
  created_at: Date;     // Creation timestamp
  updated_at: Date;     // Last update timestamp
}
```

### Register/Create User Request

```typescript
{
  email: string;        // Required, valid email
  password: string;     // Required, min 6 characters
  name: string;         // Required
  age?: number;         // Optional
}
```

### Login Request

```typescript
{
  email: string;        // Required
  password: string;     // Required
}
```

### Update User Request

```typescript
{
  email?: string;       // Optional, valid email
  name?: string;        // Optional
  age?: number;         // Optional
}
```

## 💡 Tips for Testing

1. **Use Swagger UI First** - It's the easiest way to test the API
2. **Save Your Token** - Copy it after login/register
3. **Test Public Endpoints First** - Register/Login don't need auth
4. **Then Test Protected Endpoints** - After authorizing in Swagger
5. **Check Response Status Codes** - They indicate success or error type
6. **Read Error Messages** - They tell you exactly what went wrong

## 🔗 Additional Resources

- [README.md](README.md) - Full project documentation
- [SETUP.md](SETUP.md) - Setup and installation guide
- [DOCKER.md](DOCKER.md) - Docker deployment guide

