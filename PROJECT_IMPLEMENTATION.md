# Jira Clone API Implementation Record

## Purpose

This document records the backend implementation from the initial project foundation through the authenticated project-listing endpoint.

## Technology Stack

- NestJS 11 with TypeScript
- PostgreSQL
- Prisma ORM 7 with `@prisma/adapter-pg`
- Redis for refresh-token storage
- Passport JWT and local authentication
- `class-validator` and `class-transformer`
- Swagger API documentation
- Jest for unit testing

## Project Foundation

The application is structured as a NestJS API with these main areas:

- `src/main.ts`: application bootstrap, validation, exception handling, response envelopes, and Swagger.
- `src/app.module.ts`: application module wiring.
- `src/config`: environment configuration and validation.
- `src/prisma`: Prisma client module and service.
- `src/cache/redis`: Redis module, service, and constants.
- `src/common`: shared DTOs, pagination, HTTP envelopes, exceptions, filters, and interceptors.
- `src/modules/auth`: registration, login, JWT access tokens, refresh-token rotation, guards, and strategies.
- `src/modules/user`: user lookup and user-facing operations.
- `src/modules/project`: project CRUD, project membership, and project responses.
- `prisma/schema.prisma`: PostgreSQL data model.
- `prisma/migrations`: versioned database migrations.

## Database Model

The Prisma schema contains:

- `User`
- `Project`
- `ProjectUsers`
- `BaseEntity`
- `Status`
- `Sprint`
- `Task`

Important relationships and constraints:

- A project owns one `BaseEntity` record for its name, description, status, and timestamps.
- A user belongs to projects through `ProjectUsers`.
- `(projectId, userId)` is unique, preventing duplicate memberships.
- Project, sprint, task, and membership relationships use the configured cascade or `SetNull` behavior.
- Project roles are `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER`.
- The `OWNER` role was added through migration `20260923120000_add_owner_project_role`.

## Authentication

Authentication is implemented with Passport:

1. Users register with validated account data.
2. Passwords are hashed with bcrypt.
3. Local authentication validates login credentials.
4. JWT access tokens are issued for authenticated requests.
5. `JwtAuthGuard` validates bearer tokens and loads the current user.
6. The project controller is protected at controller scope, so all project endpoints require authentication.
7. The JWT strategy removes `hashPassword` before attaching the user to the request.

## Response and Validation Conventions

The global `ValidationPipe` uses transformation and whitelisting. Unknown request properties are rejected with `forbidNonWhitelisted: true`.

The global response interceptor wraps normal responses in:

```json
{
  "data": {}
}
```

Paginated project responses use this structure inside `data`:

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

Project response fields are mapped explicitly instead of returning raw Prisma records. They include project identity, name, description, status, membership summaries, counts, and timestamps. Password hashes and other raw user fields are not exposed.

## Project Creation

The project creation endpoint is:

```http
POST /project
Authorization: Bearer <access-token>
```

The request accepts:

- `name`: required string
- `description`: optional string
- `statusId`: optional integer

Creation behavior:

- Only authenticated users can call the endpoint.
- The authenticated user ID comes from the JWT request context.
- The base entity, project, and creator membership are created in one Prisma transaction.
- The creator is automatically added to `ProjectUsers` with the `OWNER` role.
- The client cannot provide the creator role in the create DTO.
- Owner membership cannot be changed through the assignment endpoint.
- If either database write fails, the transaction rolls back.
- The created project is returned through the standard project response DTO.

## Authenticated Project Retrieval

The project-listing endpoint is:

```http
GET /project?page=1&limit=10&search=launch
Authorization: Bearer <access-token>
```

Implementation behavior:

- `JwtAuthGuard` rejects unauthenticated requests.
- The controller obtains the user ID from `@CurrentUser('id')`.
- The service filters with:

```ts
users: { some: { userId } }
```

- Prisma returns only projects where the authenticated user has a `ProjectUsers` membership.
- Project details are mapped through the explicit response DTO.
- Pagination and optional case-insensitive search are supported.
- Multiple memberships are returned in one paginated result.
- A user with no memberships receives an empty `data` array and pagination metadata.
- The previous `GET /project/user/:userId` route was removed so a caller cannot request another user's project list by changing a URL parameter.

## Tests Added

`src/modules/project/project.service.spec.ts` verifies:

1. A user belonging to multiple projects receives all matching projects.
2. The Prisma query uses the authenticated user's membership ID.
3. A user with no projects receives an empty list and no error.
4. The query scope cannot be replaced with another user ID through the listing method.

## Validation Performed

Successful checks:

- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:migrate:status`
- `npm run typecheck`
- `npm run build`
- `npx jest src/modules/project/project.service.spec.ts --runInBand`

The repository-wide lint command still reports unrelated existing formatting and type-safety findings in other files. The focused project-listing tests pass.

## Current Endpoint Summary

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| `POST` | `/project` | Required | Create a project and owner membership |
| `GET` | `/project` | Required | List projects belonging to the authenticated user |
| `GET` | `/project/:id` | Required | Retrieve one project the user belongs to |
| `PATCH` | `/project/:id` | Required | Update a project |
| `DELETE` | `/project/:id` | Required | Delete a project |
| `POST` | `/project/:id/users` | Required | Add or update a project membership, excluding owner-role changes |
