# Jira Clone Project Status

This file is a simple snapshot of the current backend and the work still needed to complete the Jira-style workflow described by the ERD.

## Project Direction

The API is being built with NestJS, Prisma, PostgreSQL, and Redis. The data model supports users, projects, sprints, tasks, statuses, and project memberships with roles.

## What Is Done

### Foundation

- NestJS application structure is in place.
- Environment configuration and validation are present.
- Prisma 7 is configured with the PostgreSQL adapter.
- The initial database migration exists.
- Prisma client generation and database scripts are available in `package.json`.
- Redis module and service are available for cache and token storage.
- Shared DTO, exception, filter, and response-envelope folders are established.

### Authentication and Users

- User registration is implemented.
- Email and username uniqueness are checked during registration.
- Passwords are hashed with bcrypt.
- Local and JWT authentication strategies are configured.
- Access and refresh tokens are generated.
- Refresh tokens are hashed and stored in Redis with an expiration time.
- Refresh-token rotation and revocation are implemented.
- User lookup by email, username, and ID is available.

### Database and Seed Data

The Prisma schema currently contains these ERD entities:

- `User`
- `Project`
- `ProjectUsers`
- `Sprint`
- `Task`
- `Status`
- `BaseEntity`

The schema also includes:

- Project roles: `ADMIN`, `MEMBER`, and `VIEWER`.
- Status types: `TODO`, `IN_PROGRESS`, and `DONE`.
- Relationships between projects, users, sprints, tasks, and statuses.
- Cascade and `SetNull` delete behavior for related records.
- Unique project membership per user.
- Seed data for users, statuses, one project, sprints, memberships, and tasks.

## What Is Partially Done

### Project API

Project routes exist for:

- Creating a project
- Listing projects
- Getting one project
- Updating a project
- Deleting a project

However, the controller currently calls placeholder methods in `ProjectService`. These methods return text and do not yet read from or write to PostgreSQL.

### Domain Building Blocks

DTOs and exception folders exist for several domain areas, including projects, sprints, statuses, and tasks. The database relationships are also defined. The application still needs the service logic, controllers, validation rules, and authorization that make these building blocks functional.

## What Needs To Be Implemented

### 1. Complete Project Management

- Replace project service placeholders with Prisma queries.
- Create the project and its required `BaseEntity` record together.
- Return project details with members, sprints, tasks, and status when appropriate.
- Add update and delete behavior with clear ownership rules.
- Add pagination and filtering for project lists when the API grows.
- Prevent access to projects where the current user is not a member.

### 2. Add Project Membership Management

- Add endpoints to invite or add a user to a project.
- Add endpoints to list, update, and remove project members.
- Enforce the `ADMIN`, `MEMBER`, and `VIEWER` role rules.
- Prevent duplicate memberships using the existing unique constraint.
- Decide whether a project must always have at least one administrator.

### 3. Implement Sprint Management

- Add sprint controller, service, and module wiring.
- Create, read, update, and delete sprints.
- Validate sprint dates, especially that the end date is not before the start date.
- Link sprints to the correct project.
- Decide how tasks behave when a sprint is deleted or closed.

### 4. Implement Task Management

- Add task controller, service, and module wiring.
- Create, read, update, and delete tasks.
- Link each task to a project and optionally to a sprint and assignee.
- Support changing task status, sprint, assignee, and due date.
- Ensure a task's sprint belongs to the same project as the task.
- Ensure an assignee is a member of the task's project.
- Add task list filters for status, sprint, assignee, and due date.

### 5. Implement Status Management

- Add status controller and service behavior.
- Decide whether statuses are global defaults or configurable per project.
- Prevent deleting a status that is still used by entities, or define a replacement status.
- Validate status names and status types.

### 6. Add Authorization and Request Validation

- Protect project, sprint, task, status, and membership routes with JWT guards.
- Add role-based authorization for project actions.
- Apply DTO validation consistently with `ValidationPipe`.
- Validate numeric route parameters and invalid IDs.
- Avoid returning password hashes or other private user data.
- Standardize not-found, conflict, validation, and forbidden responses.

### 7. Add Tests and API Documentation

- Add unit tests for services and authorization rules.
- Add integration or e2e tests for registration, login, refresh, project, sprint, and task flows.
- Test membership boundaries: an outsider, viewer, member, and admin should not have the same permissions.
- Add Swagger documentation for request and response DTOs.
- Replace the default Nest README with project-specific setup and API instructions.

## Suggested Implementation Order

1. Complete project CRUD with Prisma and authenticated ownership checks.
2. Add project membership and role guards.
3. Implement sprint CRUD and date validation.
4. Implement task CRUD, assignment, status changes, and filters.
5. Finalize status rules and deletion behavior.
6. Add tests, Swagger documentation, and a project-specific README.

## ERD Decisions To Confirm

The ERD and schema provide the main relationships, but these product decisions should be confirmed before the remaining modules are built:

- Are statuses shared by every project or customizable per project?
- Can a task exist without a sprint? The schema currently allows this.
- Can a task be assigned to a user who is not a project member? It should normally be prevented.
- Should every project have an administrator at all times?
- Can a project, sprint, or task be permanently deleted, or should soft deletion be added?
- Should `BaseEntity` remain the shared table for names, descriptions, and statuses, or should each domain entity own those fields directly?

## Current Overall Status

**Foundation: Ready**

**Authentication: Mostly implemented**

**Database model and seed data: Implemented**

**Project, sprint, task, status, and membership workflows: To be implemented**

**Tests and API documentation: To be expanded**
