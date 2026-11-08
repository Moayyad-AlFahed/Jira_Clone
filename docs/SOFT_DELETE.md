# Soft delete in the Jira Clone API

This app uses **Prisma + PostgreSQL**. Soft delete means rows stay in the database; **`deletedAt`** is set instead of calling `prisma.*.delete()`.

## Where it applies

| Model / resource | Soft delete? | Column | Notes |
|------------------|--------------|--------|--------|
| **BaseEntity** | Yes | `deletedAt`, `deletedById` | Shared by Project, Sprint, Task |
| **User** | Yes | `deletedAt` | Login/register use active rows only |
| **ProjectUsers** | No | — | Remove member = hard delete junction row |
| **Status** | No | — | Lookup; blocked if still referenced |

## HTTP endpoints

| Method | Path | Behavior |
|--------|------|----------|
| `DELETE` | `/project/:id` | Owner soft-deletes project + child sprint/task BaseEntities |
| `POST` | `/project/:id/restore` | Owner restores project tree |
| `DELETE` | `/user/me` | Soft-delete current user + revoke refresh tokens |
| `POST` | `/auth/restore-account` | Email + password restores a deleted user (no JWT) |
| `POST` | `/user/:id/restore` | Self only (`id` must match JWT); prefer `restore-account` after delete |

## Read path rule

Every list/detail query for domain data must filter active records:

- Projects: `baseEntity: { deletedAt: null, ... }`
- Users: `...activeUserWhere` from `src/common/prisma/soft-delete.where.ts`

Soft-deleted projects behave like **404** on get/list.

## Write path rule

Use helpers in `src/common/prisma/soft-delete.operations.ts`:

- `softDeleteBaseEntity` / `restoreBaseEntity`
- `softDeleteManyBaseEntities` / `restoreManyBaseEntities` (project children)
- `softDeleteUser` / `restoreUser`

Do **not** hard-delete Project/Sprint/Task/User in normal product flows.

## User email / username

Full-table unique constraints were replaced with **partial unique indexes** (PostgreSQL):

- Active users: unique `email` and `username` where `deletedAt IS NULL`
- Allows re-registration after a soft-deleted account keeps the old row

Migration: `prisma/migrations/20261108100000_add_soft_delete/migration.sql`

## Auth notes

- JWT validation loads only **active** users (`findActiveById`).
- After `DELETE /user/me`, refresh tokens are cleared via Redis pattern `auth:refresh:{userId}:*`.
- Short-lived access tokens may still work until expiry; plan for token TTL accordingly.

## Flow (project)

```text
DELETE /project/:id
  → set deletedAt on project BaseEntity
  → set deletedAt on all sprint/task BaseEntity ids for that project

POST /project/:id/restore
  → clear deletedAt on the same set of BaseEntity rows
```

## Related docs

- Cursor agent skill: `.cursor/skills/soft-delete/SKILL.md`
