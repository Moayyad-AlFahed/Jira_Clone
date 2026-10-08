# Jira Clone API

A NestJS backend for a Jira-style project management system. This repository contains the API layer for user authentication, project workspaces, membership management, and the shared database model that supports a larger issue-tracking workflow.

This is not a frontend application. It is the server-side foundation for a Jira-like product built with TypeScript, NestJS, Prisma, PostgreSQL, and Redis.

## Overview

The project models a SaaS-style collaboration platform where users can:

- register and log in to the system
- create and manage projects
- join projects with different roles
- track project metadata and membership
- work with a data model designed for sprints, tasks, and statuses

The current implementation focuses on the backend foundation and authenticated project operations. The schema and architecture already include sprint and task entities, but the primary live endpoints in the codebase are the authentication flow and project management APIs.

## Tech stack

- NestJS 11
- TypeScript
- PostgreSQL
- Prisma ORM 7
- Redis (for refresh-token storage and cache support)
- Passport + JWT authentication
- Swagger/OpenAPI documentation
- class-validator and class-transformer
- Jest for testing

## Current implemented features

### Authentication

The API exposes these authentication endpoints:

- `POST /auth/register` – create a new user account
- `POST /auth/login` – validate credentials and return JWT tokens
- `POST /auth/refresh` – rotate refresh tokens and issue a new token pair

Authentication behavior includes:

- bcrypt password hashing
- local strategy validation for email/password login
- JWT access token validation via Passport
- refresh token rotation and storage support through Redis
- protected project routes using `JwtAuthGuard`

### Project management

The project module implements the following API:

- `POST /project` – create a new project
- `GET /project` – list projects for the authenticated user with pagination and optional search
- `GET /project/:id` – fetch a single project the user belongs to
- `PATCH /project/:id` – update an existing project
- `DELETE /project/:id` – delete a project
- `POST /project/:id/users` – add or update a project membership assignment

Project-level behavior includes:

- authenticated users only
- project ownership via `ProjectUsers` membership and role `OWNER`
- per-user access filtering based on membership
- project response DTOs that avoid returning raw password hashes
- pagination response format with `data` and `meta`

### Role and membership model

The Prisma model currently supports these project roles:

- `OWNER`
- `ADMIN`
- `MEMBER`
- `VIEWER`

The application enforces project membership checks before project access and updates. The project creator is automatically added as the owner when a project is created.

## Database model

The database schema includes these main entities:

- `User`
- `Project`
- `ProjectUsers`
- `BaseEntity`
- `Status`
- `Sprint`
- `Task`

The schema is designed around Jira-like concepts:

- projects are backed by a shared `BaseEntity` record
- users belong to projects via `ProjectUsers`
- tasks belong to a project and can optionally be linked to a sprint and assignee
- statuses describe task/project lifecycle states
- project, sprint, and task relationships are set up with cascade/delete rules

## Project structure

```text
src/
  app.module.ts
  main.ts
  config/
  common/
  cache/redis/
  modules/
    auth/
    project/
    user/
  prisma/
prisma/
  schema.prisma
  migrations/
```

Key areas:

- `src/modules/auth` – registration, login, JWT handling, refresh tokens
- `src/modules/project` – project CRUD, membership updates, pagination and filtering
- `src/modules/user` – user-related logic and user data access
- `src/prisma` – Prisma service and client setup
- `src/cache/redis` – Redis connection and token storage helpers
- `src/common` – validation, exceptions, response envelope, pagination utilities

## Environment variables

Create a `.env` file in the project root with values like the following:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jira_clone"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
CACHE_ENABLED="true"
REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"
```

## Getting started

### Install dependencies

```bash
npm install
```

### Generate Prisma client and apply migrations

```bash
npx prisma generate
npx prisma migrate dev
```

If you want to seed the database:

```bash
npm run prisma:seed
```

## Run the app

### Development mode

```bash
npm run start:dev
```

### Production build

```bash
npm run build
npm run start:prod
```

## Swagger / API docs

Once the app is running, the API documentation is available at:

```text
http://localhost:3001/api/docs
```

Swagger is configured with bearer-auth support and documents the current NestJS API surface.

## Available scripts

```bash
npm run build
npm run start
npm run start:dev
npm run start:prod
npm run test
npm run test:cov
npm run typecheck
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:dev
npm run prisma:studio
```

## API conventions

The application uses a global validation pipe and response envelope pattern. Successful responses are wrapped like this:

```json
{
  "data": {}
}
```

Paginated responses commonly follow this pattern:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

## Current project status

This repository is in active backend development for a Jira-inspired workflow. The current codebase includes:

- user authentication and JWT lifecycle
- protected project endpoints
- project creation and listing with membership checks
- Prisma/PostgreSQL schema for project, sprint, task, and status data
- Redis-backed refresh token support
- API documentation and validation middleware

The schema and domain model anticipate more advanced issue-management features such as sprint and task workflows, but the immediate implemented API surface is centered on authentication and project operations.

## License

This project is currently configured as an unpublished private backend API and does not include a public license declaration in the repository.