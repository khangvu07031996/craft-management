# Quick Setup Guide

## 🚀 Quick Start (Easiest Way)

### First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL in Docker and initialize database
npm run db:init

# 3. Start the application (in a new terminal)
npm run dev
```

That's it! Your app is now running at `http://localhost:3000` 🎉

### Everyday Usage

```bash
# Start everything (PostgreSQL + App)
npm run app:start
```

## 📝 Available Commands

### Quick Commands (Most Used)

| Command | Description |
|---------|-------------|
| `npm run app:start` | Start PostgreSQL (if not running) + Start app |
| `npm run dev` | Start app only (requires PostgreSQL running) |
| `npm run db:init` | Start PostgreSQL + Create database tables |

### Database Commands

| Command | Description |
|---------|-------------|
| `npm run docker:db` | Start PostgreSQL container |
| `npm run docker:db:stop` | Stop PostgreSQL container |
| `npm run docker:db:logs` | View PostgreSQL logs |
| `npm run docker:db:reset` | Reset database (⚠️ deletes all data) |
| `npm run db:setup` | Run database migrations/setup |

### Build & Deploy Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm run lint` | Check code style |

### Full Docker Stack (PostgreSQL + App)

| Command | Description |
|---------|-------------|
| `npm run docker:full` | Run everything in Docker |
| `npm run docker:full:stop` | Stop all Docker containers |
| `npm run docker:full:logs` | View all logs |
| `npm run docker:full:reset` | Reset everything (⚠️ deletes all data) |

## 🔧 Environment Variables

All environment variables are stored in `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=craft_management
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345678
JWT_EXPIRES_IN=7d
```

**Note:** The `.env` file is already created. You can edit it to change any settings.

## 🧪 Testing the API

### Option 1: Using Swagger UI (Easiest - Recommended!)

Open your browser and go to: **`http://localhost:3000/api-docs`**

You'll see an interactive API documentation where you can:
- ✅ Test all endpoints with a beautiful UI
- ✅ See request/response examples
- ✅ Authenticate with JWT tokens easily
- ✅ No need to remember curl commands!

**Quick Start with Swagger:**
1. Go to `http://localhost:3000/api-docs`
2. Find "POST /api/auth/register" under Authentication
3. Click "Try it out"
4. Edit the request body and click "Execute"
5. Copy the token from the response
6. Click "Authorize" button (🔒 icon at top)
7. Enter: `Bearer YOUR_TOKEN_HERE`
8. Now test any endpoint!

### Option 2: Using curl Commands

#### 1. Health Check

```bash
curl http://localhost:3000/api/health
```

#### 2. Register a User

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

#### 3. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the token from the response!

#### 4. Get All Users (with authentication)

```bash
# Replace YOUR_TOKEN with the token from login/register
TOKEN="YOUR_TOKEN_HERE"

curl http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

#### 5. Get Current User Profile

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## 🐛 Troubleshooting

### PostgreSQL won't start

```bash
# Check if port 5432 is in use
lsof -i :5432

# Stop local PostgreSQL if running
brew services stop postgresql  # macOS
# or
sudo systemctl stop postgresql  # Linux
```

### App won't start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process using port 3000
kill -9 $(lsof -t -i:3000)
```

### Database connection error

```bash
# Check PostgreSQL is running
docker ps

# View PostgreSQL logs
npm run docker:db:logs

# Restart PostgreSQL
npm run docker:db:stop
npm run docker:db
```

### Reset everything

```bash
# Stop all containers and delete data
npm run docker:db:reset

# Or completely remove everything
docker-compose down -v
docker volume rm craft-management_postgres_data
npm run db:init
```

## 📂 Project Structure

```
craft-management/
├── src/                    # Source code
│   ├── config/            # Configuration (database, etc.)
│   ├── controllers/       # Request handlers
│   ├── database/          # Database setup
│   ├── middleware/        # Express middleware
│   ├── models/           # Data models
│   ├── routes/           # API routes
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   └── app.ts            # Main application
├── dist/                  # Compiled JavaScript (auto-generated)
├── .env                   # Environment variables
├── docker-compose.yml     # PostgreSQL container
├── Dockerfile            # App container (optional)
└── package.json          # Dependencies and scripts
```

## 🎯 Development Workflow

1. **Start PostgreSQL** (first time)
   ```bash
   npm run db:init
   ```

2. **Start developing**
   ```bash
   npm run dev
   ```
   The server will auto-restart when you edit files.

3. **Test your changes**
   Use curl or Postman to test API endpoints

4. **Stop when done**
   ```bash
   # Press Ctrl+C to stop the app
   # PostgreSQL keeps running in background
   
   # To stop PostgreSQL:
   npm run docker:db:stop
   ```

## 📚 More Information

- Full documentation: See [README.md](README.md)
- Docker guide: See [DOCKER.md](DOCKER.md)
- API endpoints: See [README.md](README.md#-api-endpoints)

## 💡 Tips

- PostgreSQL data persists even after restart (stored in Docker volume)
- Use `npm run docker:db:logs` to debug database issues
- The `.env` file is ignored by git (safe to store local settings)
- Use `npm run docker:db:reset` to start fresh with empty database
- Production deployment: Use `npm run docker:full` for containerized setup

