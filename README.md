# User Management API with Authentication

A complete user management application built with Node.js, TypeScript, Express.js, and PostgreSQL. Features include user registration, login with JWT authentication, and full CRUD operations.

## 📋 Features

- ✅ User Registration & Login
- ✅ JWT Authentication
- ✅ Password Hashing with bcrypt
- ✅ PostgreSQL Database
- ✅ Protected API Routes
- ✅ Full User CRUD Operations
- ✅ Input Validation
- ✅ Centralized Error Handling
- ✅ Request Logging

## 🛠️ Tech Stack

- **Node.js** - JavaScript runtime
- **TypeScript** - Typed JavaScript
- **Express.js** - Web framework
- **PostgreSQL** - Relational database
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **CORS** - Cross-Origin Resource Sharing
- **dotenv** - Environment variables management

## 📦 Installation

### 1. Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### 2. Clone repository

```bash
git clone <repository-url>
cd craft-management
```

### 3. Install dependencies

```bash
npm install
```

### 4. Setup PostgreSQL Database

**Option A: Using Docker (Recommended - Easiest)**

```bash
# Start PostgreSQL in Docker
npm run docker:db

# Wait a few seconds for initialization
```

That's it! PostgreSQL is now running in Docker. See [DOCKER.md](DOCKER.md) for more details.

**Option B: Using Local PostgreSQL**

If you have PostgreSQL installed locally:

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE craft_management;

# Exit
\q
```

### 5. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=craft_management
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

### 6. Initialize Database Tables

The database tables will be automatically created when you start the server for the first time. Alternatively, you can run:

```bash
npm run build
node dist/database/setup.js
```

## 🚀 Run Application

### Development mode (with hot reload)

```bash
npm run dev
```

### Production mode

```bash
# Build project
npm run build

# Run compiled code
npm start
```

Server will run at: `http://localhost:3000`

## 📚 API Documentation

### Swagger/OpenAPI Documentation

Interactive API documentation is available via Swagger UI:

**Swagger UI**: `http://localhost:3000/api-docs`

The API is documented using **OpenAPI 3.0** specification in `swagger.yaml`:
- ✅ All endpoints documented in YAML format
- ✅ Interactive API testing interface  
- ✅ Complete request/response schemas
- ✅ Authentication testing with JWT
- ✅ Example requests and responses

**OpenAPI Files**:
- **YAML Spec**: `swagger.yaml` (main documentation file)
- **JSON Spec**: `http://localhost:3000/api-docs.json`

### How to Use Swagger

1. Open `http://localhost:3000/api-docs` in your browser
2. Click on "Authentication" section
3. Try "POST /api/auth/register" or "POST /api/auth/login"
4. Copy the token from the response
5. Click "Authorize" button at the top
6. Enter: `Bearer YOUR_TOKEN_HERE`
7. Now you can test all protected endpoints!

### Editing API Documentation

To add or modify API documentation, edit the `swagger.yaml` file at the project root. See [SWAGGER.md](SWAGGER.md) for detailed instructions.

## 📚 API Endpoints

### Authentication Endpoints

#### 1. Register New User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "age": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "age": 30,
      "created_at": "2025-11-07T10:00:00.000Z",
      "updated_at": "2025-11-07T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 2. Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "age": 30,
      "created_at": "2025-11-07T10:00:00.000Z",
      "updated_at": "2025-11-07T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 3. Get Current User Profile (Protected)

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "age": 30,
    "created_at": "2025-11-07T10:00:00.000Z",
    "updated_at": "2025-11-07T10:00:00.000Z"
  }
}
```

### User Endpoints (All Protected - Require Authentication)

All user endpoints require an `Authorization` header with a valid JWT token:

```
Authorization: Bearer <your-jwt-token>
```

#### 4. Get All Users

```http
GET /api/users
Authorization: Bearer <token>
```

#### 5. Get User by ID

```http
GET /api/users/:id
Authorization: Bearer <token>
```

#### 6. Create New User

```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "age": 25
}
```

#### 7. Update User

```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "age": 26
}
```

#### 8. Delete User

```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

### Health Check

```http
GET /api/health
```

## 🧪 Test API Examples

### Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "age": 25
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get all users (with authentication)

```bash
# Save your token from login/register response
TOKEN="your-jwt-token-here"

curl http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

### Get current user profile

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## 📁 Project Structure

```
craft-management/
├── src/
│   ├── config/           # Configuration files
│   │   └── database.ts   # PostgreSQL connection
│   ├── controllers/      # Controllers handle logic
│   │   ├── auth.controller.ts
│   │   └── user.controller.ts
│   ├── database/         # Database setup
│   │   ├── init.sql      # SQL schema
│   │   └── setup.ts      # Database initialization
│   ├── middleware/       # Middleware functions
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── logger.middleware.ts
│   ├── models/          # Data models
│   │   └── user.model.ts
│   ├── routes/          # API routes
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   └── index.ts
│   ├── types/           # TypeScript type definitions
│   │   └── user.types.ts
│   ├── utils/           # Utility functions
│   │   └── jwt.ts       # JWT helpers
│   └── app.ts           # Main application file
├── dist/                # Compiled JavaScript (auto-generated)
├── .env                 # Environment variables
├── .env.example         # Example environment variables
├── .gitignore          # Git ignore rules
├── package.json        # Project dependencies
├── tsconfig.json       # TypeScript configuration
└── README.md           # Documentation
```

## 🔧 Scripts

- `npm run dev` - Run in development mode with hot reload
- `npm run build` - Build project to JavaScript
- `npm start` - Run compiled code
- `npm run lint` - Check code style

## 🔐 Security Features

- **Password Hashing**: All passwords are hashed using bcrypt with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Protected Routes**: User endpoints require valid JWT token
- **Email Validation**: Email format validation on registration
- **Password Requirements**: Minimum 6 characters
- **SQL Injection Prevention**: Using parameterized queries with pg library

## ⚠️ Important Notes

### Database Connection
- Make sure PostgreSQL is running before starting the server
- The application will automatically create tables on first run
- Default credentials are in `.env.example` - **change them in production!**

### JWT Secret
- **CRITICAL**: Change `JWT_SECRET` in `.env` for production
- Use a strong, random string (at least 32 characters)
- Never commit your `.env` file to version control

### Production Deployment
- Set `NODE_ENV=production`
- Use environment variables for sensitive data
- Enable HTTPS
- Set up proper CORS configuration
- Use a process manager like PM2
- Set up database backups
- Monitor logs and errors

## 🚧 Future Enhancements

Features that can be added:

- [ ] Email verification
- [ ] Password reset functionality
- [ ] Refresh tokens
- [ ] Role-based access control (Admin, User roles)
- [ ] Rate limiting
- [ ] Input validation with Joi/Zod
- [ ] API documentation with Swagger
- [ ] Unit tests and integration tests
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Pagination for user lists
- [ ] Search and filter functionality

## 🐛 Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED
```
**Solution**: Make sure PostgreSQL is running and credentials in `.env` are correct

### Authentication Error
```
Error: No token provided
```
**Solution**: Include `Authorization: Bearer <token>` header in your requests

### Port Already in Use
```
Error: EADDRINUSE: address already in use :::3000
```
**Solution**: Change `PORT` in `.env` or kill the process using port 3000

## 📄 License

ISC

## 👤 Author

Craft Management Team

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
