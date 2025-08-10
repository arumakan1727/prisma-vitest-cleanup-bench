<lang>Japanese</lang>
<character_encode>UTF-8</character_encode>

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript benchmarking project that tests different database cleanup strategies for infrastructure layer repository tests using Prisma ORM with PostgreSQL. The project compares three approaches:
- Method A: Transaction per test case with commit + TRUNCATE TABLE CASCADE
- Method B: Transaction per test case with rollback (supports parallel execution)
- Method C: In-memory PGlite with transaction per test case + rollback (supports parallel execution)

## Commands

### Code Quality
```bash
# Format and fix code with Biome
pnpm run fix

# Format with unsafe fixes (auto-fixes more issues)
pnpm run fix:unsafe

# Type checking
pnpm run typechk
```

### Testing
```bash
# Run Method A tests (commit + truncate)
pnpm run test:A

# Run all tests
pnpm vitest run

# Run specific test pattern
pnpm vitest run [pattern]
```

## Architecture

### Onion Architecture Structure
- `src/core/`: Domain layer with business logic
  - `+shared/`: Shared interfaces and helpers (Clock, Transaction, Zod helpers)
  - `article/`, `tenant/`, `user/`: Domain entities with value objects and use cases
- `src/infrastructure/`: Infrastructure layer
  - `postgres/`: PostgreSQL/Prisma implementation
    - `__test__/`: Test suites for different cleanup strategies
    - `converter/`: Entity-to-Prisma model converters
    - `repository/`: Repository implementations

### Database Configuration
- Uses PostgreSQL with Row Level Security (RLS)
- Two database users:
  - `admin`: Superuser with RLS bypass (for migrations and tests)
  - `app`: Regular user with RLS enforcement
- Separate databases for development, shadow, and testing
- Method C uses PGlite (embedded PostgreSQL) for in-memory testing
  - Dependencies: `@electric-sql/pglite` and `pglite-prisma-adapter`

### Testing Strategy
The project implements three test database cleanup approaches in separate directories:
- `A_each-commit-truncate/`: Tests run in transactions that commit, then TRUNCATE CASCADE
- `B_each-tx-rollback/`: Each test runs in a transaction that rolls back
- `C_pglite-each-tx-rollback/`: Uses in-memory PGlite database with transaction rollback per test
  - PGlite is an embedded PostgreSQL that runs entirely in memory
  - Migrations are applied once in global setup and saved as a snapshot (tgz file)
  - Each test file loads the snapshot to start with a clean migrated database
  - Test isolation is achieved through transaction rollback (same as Method B)

### Environment Variables
Required environment variables (see compose.yml and env.ts):
- `APP_DATABASE_URL`: Application database connection URL
- `APP_TEST_DATABASE_URL`: Test database connection URL
- `ADMIN_DATABASE_URL`: Admin database URL for migrations
- `ADMIN_SHADOW_DATABASE_URL`: Shadow database URL for Prisma
- `PGPASSWORD`, `PGDATABASE`, `PGPORT`: PostgreSQL configuration

## Zod Schema Definition Patterns

This codebase follows specific patterns for Zod schema definitions:

### Naming Conventions
- All Zod schemas are prefixed with `z` (e.g., `zUserId`, `zArticleTitle`)
- Exported as both schema and type: `export const zUserId` and `export type UserId`
- Companion objects are exported with same name with the type: `export const UserId = { parse: zodParser(zUserId) }`

### Value Objects with Branded Types
All value objects use branded types for type safety:
```typescript
// Example from src/core/user/value-object.ts
export const zUserId = z.int().min(0).brand<'UserId'>();
export type UserId = z.infer<typeof zUserId>;
export const UserId = { parse: zodParser(zUserId) };

export const zUserEmail = z.email().brand<'UserEmail'>();
export type UserEmail = ...;
export const UserEmail = { parse: ... };

export const zUserName = z.string().min(1).max(20).brand<'UserName'>();
```

### Discriminated Unions
Prefer use strict & expressive type definition.
User loves discriminatedUnion.

**Don't use `any`, `as`.**

```typescript
// Example from src/core/user/usecase/dto.ts
const zUserActiveDto = z.object({
  status: z.literal('active'),
  id: zUserId,
  name: zUserName,
  email: zUserEmail,
});

const zUserDeletedDto = z.object({
  status: z.literal('deleted'),
  name: zUserName,
});

export const zUserDto = z.discriminatedUnion('status', [zUserActiveDto, zUserDeletedDto]);
export type UserDto = z.infer<typeof zUserDto>;
export const UserDto = { parse: zodParse(zUserDto) };
```

### Custom Zod Helper
The project uses a custom `zodParser` helper (src/core/+shared/helpers/zod.ts):
```typescript
export const zodParser = <T extends z.ZodType>(schema: T) => {
  return (x: z.input<T>): z.output<T> => { ... };
};
```

### Companion object
Each zod schemas has Comanion Object.
It has `parse` function.

### Environment Configuration
Environment variables are validated at startup:
```typescript
const zEnv = z.object({
  APP_DATABASE_URL: z.url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});
export const env = zEnv.parse(process.env);
```

## Coding workflow

1. Search related files: List sibling files, parent files, children files.
2. Write code
3. `pnpm typechk`
4. `pnpm fix`
5. run test
6. Refactor

## MCP Servers

Using MCP Server well can help users. Please use it often.

### typescript LSP MCP (lsmcp)

LSP 機能やコード編集、メモリ機能など。ファイル全体を読み込んだりするよりも効率的なので積極的に使う。
