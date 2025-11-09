# Role-Based Authorization (RBAC)

## 📋 Overview

The application now implements Role-Based Access Control (RBAC) with two roles:
- **Admin**: Full access to all endpoints
- **Member**: Limited access to specific endpoints

## 🎭 User Roles

### Admin Role
- Can view all users
- Can create new users
- Can update any user
- Can delete any user
- Full system access

### Member Role
- Can view their own profile
- Can view specific users by ID
- Cannot list all users
- Cannot create, update, or delete users

## 🔐 Endpoint Access Control

### Public Endpoints (No Authentication Required)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Everyone |
| POST | `/api/auth/login` | Login user | Everyone |
| GET | `/api/health` | Health check | Everyone |

### Protected Endpoints (Authentication + Role Required)

#### Authentication Endpoints
| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/auth/me` | Get current user profile | Any authenticated user |

#### User Management Endpoints
| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/users` | Get all users | **Admin only** |
| GET | `/api/users/:id` | Get user by ID | Member or Admin |
| POST | `/api/users` | Create new user | **Admin only** |
| PUT | `/api/users/:id` | Update user | **Admin only** |
| DELETE | `/api/users/:id` | Delete user | **Admin only** |

## 🚀 Usage Examples

### 1. Register as Admin

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "name": "Admin User",
    "role": "admin"
  }'
```

### 2. Register as Member (Default)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "member@example.com",
    "password": "member123",
    "name": "Member User"
  }'
```

Note: If `role` is not specified, it defaults to `member`.

### 3. Admin Accessing All Users

```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

### 4. Member Trying to Access All Users

```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer MEMBER_TOKEN"
```

**Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Access denied. Required role: admin",
  "currentRole": "member"
}
```

### 5. Member Accessing Specific User

```bash
curl http://localhost:3000/api/users/USER_ID \
  -H "Authorization: Bearer MEMBER_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "...",
    "name": "...",
    "role": "member"
  }
}
```

### 6. Member Accessing Their Own Profile

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer MEMBER_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "member@example.com",
    "name": "Member User",
    "role": "member"
  }
}
```

## 🔍 Testing with Swagger UI

1. **Open Swagger UI**: http://localhost:3000/api-docs

2. **Register an Admin User**:
   - Go to `POST /api/auth/register`
   - Click "Try it out"
   - Set `role` to `admin`
   - Execute

3. **Copy the Token**

4. **Authorize**:
   - Click "Authorize" button (🔒)
   - Enter: `Bearer YOUR_ADMIN_TOKEN`
   - Click "Authorize"

5. **Test Admin Endpoints**:
   - Try `GET /api/users` - Should succeed
   - Try `POST /api/users` - Should succeed

6. **Test with Member Token**:
   - Register a member user
   - Get their token
   - Authorize with member token
   - Try `GET /api/users` - Should fail with 403
   - Try `GET /api/users/:id` - Should succeed

## 📊 Response Codes

| Code | Description | When |
|------|-------------|------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | No token or invalid token |
| 403 | Forbidden | User doesn't have required role |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists (e.g., email) |
| 500 | Server Error | Internal server error |

## 🛡️ Security Features

### Password Security
- Passwords are hashed using bcrypt with salt
- Never stored in plain text
- Never returned in API responses

### Role Security
- Roles are stored in database
- Cannot be changed after creation (unless via admin)
- Validated on every request to protected endpoints

### Token Security
- JWT tokens expire after 7 days (configurable)
- Tokens include user ID and email
- Role is fetched fresh from database on each request

## 💻 Implementation Details

### Database Schema

```sql
CREATE TYPE user_role AS ENUM ('admin', 'member');

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'member' NOT NULL,
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
```

### Middleware Chain

1. **authenticate** - Verifies JWT token
2. **requireRole** - Checks user has required role
3. **Controller** - Executes business logic

Example:
```typescript
router.get('/users', authenticate, requireAdmin, userController.getAllUsers);
```

### Role Middleware

```typescript
// Admin only
requireAdmin

// Member or Admin
requireMember

// Custom roles
requireRole(UserRole.ADMIN, UserRole.MEMBER)
```

## 🔧 Configuration

### Environment Variables

No additional environment variables needed. Roles are hardcoded enums:

```typescript
export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}
```

### Adding New Roles

To add a new role:

1. Update the enum in `src/types/user.types.ts`:
```typescript
export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  MODERATOR = 'moderator',  // New role
}
```

2. Update database enum:
```sql
ALTER TYPE user_role ADD VALUE 'moderator';
```

3. Create middleware shortcuts in `src/middleware/role.middleware.ts`:
```typescript
export const requireModerator = requireRole(UserRole.MODERATOR, UserRole.ADMIN);
```

4. Apply to routes as needed

## 📝 Best Practices

1. **Always use HTTPS in production**
2. **Rotate JWT secrets regularly**
3. **Log role-based access denials for audit**
4. **Consider adding more granular permissions**
5. **Implement role change audit trail**
6. **Add rate limiting per role**
7. **Consider implementing refresh tokens**

## 🐛 Troubleshooting

### 403 Error Even with Valid Token

**Check:**
- User role in database matches required role
- Token is not expired
- Token contains correct user ID
- Database connection is working

### Role Not Being Saved

**Check:**
- Database migration was run successfully
- `role` column exists in users table
- Enum type `user_role` is created

### Can't Create Admin User

**Solution:**
- First user can register as admin
- Or manually update database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

## 📚 Further Reading

- [JWT Authentication Guide](./API_DOCUMENTATION.md)
- [Swagger Documentation](./SWAGGER.md)
- [Setup Guide](./SETUP.md)
- [Main README](./README.md)

---

**Last Updated**: November 7, 2025
**Version**: 1.0.0

