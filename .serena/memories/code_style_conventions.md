# Code Style and Conventions

## Architecture Pattern
**Onion Architecture** with clear separation of concerns:
- `src/core/`: Domain layer (business logic)
  - `+shared/`: Shared interfaces and helpers
  - Domain modules (`user/`, `article/`, `tenant/`): Value objects and use cases
- `src/infrastructure/`: Infrastructure layer
  - `postgres/`: PostgreSQL/Prisma implementation
    - `__test__/`: Test implementations
    - `converter/`: Entity-to-Prisma model converters
    - `repository/`: Repository implementations

## TypeScript Configuration
- Strict type checking enabled
- No implicit any
- Path aliases configured with tsconfig paths

## Biome Formatter Settings
- **Quote Style**: Single quotes
- **Trailing Commas**: ES5 style
- **Indent**: 2 spaces
- **Line Width**: 100 characters
- **Import Organization**: Automatic sorting enabled
- **JSX Attributes**: Automatic sorting enabled

## Naming Conventions

### Zod Schemas
- All Zod schemas prefixed with `z` (e.g., `zUserId`, `zUserEmail`)
- Export pattern:
  ```typescript
  export const zUserId = z.int().min(0).brand<'UserId'>();
  export type UserId = z.infer<typeof zUserId>;
  export const UserId = { parse: zodParser(zUserId) };
  ```

### Value Objects
- Use branded types for type safety
- Always provide parse functions via companion objects
- Example: `UserId`, `UserEmail`, `UserName`

### DTOs (Data Transfer Objects)
- Use discriminated unions for status/type variations
- Example pattern:
  ```typescript
  const zUserActiveDto = z.object({ status: z.literal('active'), ... });
  const zUserDeletedDto = z.object({ status: z.literal('deleted'), ... });
  export const zUserDto = z.discriminatedUnion('status', [...]);
  ```

### Files and Directories
- Special files prefixed with `+` (e.g., `+shared/`, `+dto.ts`, `+repository.ts`)
- Test files: `*.test.ts`
- Test setup files: `+*-setup.ts`
- Value objects: `value-object.ts`
- Converters: Located in `converter/` directory
- Repositories: Located in `repository/` directory

## Import Style
- Use ES modules
- Type imports: `import type * as z from 'zod';`
- Organize imports (automatic with Biome)

## Testing Conventions
- Test files colocated in `__test__/` directories
- Global setup in `+global-setup.ts`
- Per-file setup in `+each-file-setup.ts`
- Use factories for test data generation (`@quramy/prisma-fabbrica`)

## Error Handling
- TODO: Wrap Zod parse errors with Domain Errors (noted in code)
- Use type-safe error handling patterns

## Database Conventions
- Use Prisma schema with explicit table names (`@@map`)
- Use UUID(7) for tenant IDs
- Use autoincrement for user IDs
- Timestamps: `createdAt`, `updatedAt` with `@db.Timestamptz`
- Foreign key constraints with cascade delete where appropriate

## Environment Variables
- Validated at startup using Zod
- Separate URLs for:
  - `APP_DATABASE_URL`: Application database
  - `APP_TEST_DATABASE_URL`: Test database
  - `ADMIN_DATABASE_URL`: Admin database (migrations)
  - `ADMIN_SHADOW_DATABASE_URL`: Shadow database (Prisma)

## Comments
- Minimal comments in code
- Use TypeScript types for self-documentation
- TODO comments for pending tasks