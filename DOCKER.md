# Docker Setup Guide

This guide explains how to use Docker with the Craft Management application.

## Prerequisites

- Docker installed ([Download Docker](https://www.docker.com/get-started))
- Docker Compose installed (usually comes with Docker Desktop)

## Quick Start

### Option 1: PostgreSQL Only (Recommended for Development)

Run PostgreSQL in Docker and the app locally:

```bash
# Start PostgreSQL
npm run docker:db

# Wait a few seconds for PostgreSQL to initialize
# Then run the app locally
npm run dev
```

The PostgreSQL database will be available at `localhost:5432`

### Option 2: Full Stack (Both PostgreSQL and App)

Run both PostgreSQL and the application in Docker:

```bash
# Build and start all services
npm run docker:full

# The app will be available at http://localhost:3000
```

## Docker Commands

### PostgreSQL Only

```bash
# Start PostgreSQL container
npm run docker:db
# or
docker-compose up -d

# Stop PostgreSQL container
npm run docker:db:stop
# or
docker-compose down

# View PostgreSQL logs
npm run docker:db:logs
# or
docker-compose logs -f postgres

# Restart PostgreSQL
docker-compose restart postgres

# Remove PostgreSQL container and volumes (⚠️ deletes all data)
docker-compose down -v
```

### Full Stack (App + PostgreSQL)

```bash
# Start all services
npm run docker:full
# or
docker-compose -f docker-compose.full.yml up -d

# Stop all services
npm run docker:full:stop
# or
docker-compose -f docker-compose.full.yml down

# View all logs
npm run docker:full:logs
# or
docker-compose -f docker-compose.full.yml logs -f

# Rebuild and restart (after code changes)
docker-compose -f docker-compose.full.yml up -d --build

# Remove all containers and volumes (⚠️ deletes all data)
docker-compose -f docker-compose.full.yml down -v
```

## Connecting to PostgreSQL

### From your local machine (app running locally)

```bash
# .env configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=craft_management
DB_USER=postgres
DB_PASSWORD=postgres
```

### From within Docker network (full stack)

```bash
# .env configuration (or docker-compose.full.yml)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=craft_management
DB_USER=postgres
DB_PASSWORD=postgres
```

## Using PostgreSQL Client

### Connect with psql (inside container)

```bash
docker exec -it craft-management-db psql -U postgres -d craft_management
```

Common psql commands:
```sql
-- List all tables
\dt

-- Describe users table
\d users

-- Select all users
SELECT * FROM users;

-- Exit psql
\q
```

### Connect with GUI Tools

You can use any PostgreSQL client (pgAdmin, DBeaver, TablePlus, etc.):

- **Host**: localhost
- **Port**: 5432
- **Database**: craft_management
- **Username**: postgres
- **Password**: postgres

## Environment Variables

### Development (PostgreSQL in Docker, App local)

Create `.env` file:

```bash
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=craft_management
DB_USER=postgres
DB_PASSWORD=postgres

JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
```

### Production (Full Stack in Docker)

Environment variables are set in `docker-compose.full.yml`. You can override them by creating a `.env` file or using environment-specific compose files.

## Data Persistence

PostgreSQL data is stored in a Docker volume named `postgres_data`. This means:

- ✅ Data persists even when you stop/restart containers
- ✅ Data survives container removal (unless you use `-v` flag)
- ⚠️ Data is lost if you run `docker-compose down -v`

To backup data:

```bash
# Backup
docker exec craft-management-db pg_dump -U postgres craft_management > backup.sql

# Restore
docker exec -i craft-management-db psql -U postgres craft_management < backup.sql
```

## Troubleshooting

### Port Already in Use

If port 5432 is already in use:

**Option 1**: Stop local PostgreSQL
```bash
# macOS
brew services stop postgresql

# Linux
sudo systemctl stop postgresql
```

**Option 2**: Change port in `docker-compose.yml`
```yaml
ports:
  - "5433:5432"  # Use 5433 on host instead
```

Then update `.env`:
```
DB_PORT=5433
```

### Connection Refused

```bash
# Check if container is running
docker ps

# Check container logs
docker logs craft-management-db

# Check if PostgreSQL is ready
docker exec craft-management-db pg_isready -U postgres
```

### Reset Everything

To start fresh:

```bash
# Stop and remove containers and volumes
npm run docker:db:stop
docker volume rm craft-management_postgres_data

# Start again
npm run docker:db
```

## Docker Compose Files

### `docker-compose.yml` (PostgreSQL only)

- Simple setup for development
- Only runs PostgreSQL
- App runs locally with `npm run dev`

### `docker-compose.full.yml` (Full stack)

- Complete production-like setup
- Runs both PostgreSQL and app in Docker
- Better for deployment/testing

## Health Checks

The PostgreSQL container includes a health check:

```bash
# Check container health
docker inspect craft-management-db --format='{{.State.Health.Status}}'

# Wait for healthy status
docker-compose up -d
docker wait craft-management-db --condition=healthy
```

## Production Deployment

For production, consider:

1. Use secrets management (not plain text passwords)
2. Set up automated backups
3. Use environment-specific compose files
4. Enable SSL for PostgreSQL
5. Set up monitoring and logging
6. Use Docker secrets or encrypted environment variables
7. Configure resource limits

Example production compose file structure:
```
docker-compose.yml          # Base configuration
docker-compose.prod.yml     # Production overrides
docker-compose.dev.yml      # Development overrides
```

Deploy:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)

