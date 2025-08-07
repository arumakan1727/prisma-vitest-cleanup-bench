# Task Completion Checklist

When completing any coding task, ensure the following steps are performed:

## 1. Code Quality Checks

### Type Checking (REQUIRED)
```bash
pnpm run typechk
```
Must pass without errors before considering task complete.

### Code Formatting (REQUIRED)
```bash
pnpm run fix
```
Or for more aggressive fixes:
```bash
pnpm run fix:unsafe
```

## 2. Testing

### Run Relevant Tests
- If modifying repository code: Run appropriate test suite
  ```bash
  pnpm run test:A  # For Method A tests
  # or
  pnpm vitest run  # For all tests
  ```

### Verify Test Pass
- All existing tests must continue to pass
- New functionality should have corresponding tests

## 3. Code Review Checklist

### Architecture Compliance
- [ ] Code follows Onion Architecture pattern
- [ ] Domain logic stays in `src/core/`
- [ ] Infrastructure concerns in `src/infrastructure/`
- [ ] No infrastructure dependencies in domain layer

### Naming Conventions
- [ ] Zod schemas prefixed with `z`
- [ ] Branded types used for value objects
- [ ] DTOs use discriminated unions where appropriate
- [ ] Files follow naming patterns (`+` prefix for special files)

### Type Safety
- [ ] No `any` types (unless absolutely necessary)
- [ ] Proper use of branded types
- [ ] Zod schemas validate all external data

### Database Changes
- [ ] Prisma schema updated if needed
- [ ] Migrations created: `pnpm prisma migrate dev`
- [ ] Prisma client regenerated: `pnpm prisma generate`

## 4. Pre-Commit Verification

Run in order:
1. `pnpm run fix` - Format code
2. `pnpm run typechk` - Type check
3. `pnpm vitest run` - Run tests (if applicable)

## 5. Common Issues to Check

- No commented-out code left behind
- No console.log statements (unless intentional)
- No hardcoded values that should be configuration
- Environment variables properly typed in `env.ts`
- Proper error handling implemented

## Notes
- The project uses CLAUDE.md for additional project-specific instructions
- Always ensure Docker/Podman containers are running for database operations
- RLS (Row Level Security) considerations for database operations