# Codebase Structure

## Root Directory
```
prisma-vitest-bench/
├── .serena/              # Serena configuration
├── prisma/               # Prisma schema and migrations
│   ├── schema.prisma     # Database schema definition
│   └── migrations/       # Database migrations
├── postgres/             # PostgreSQL initialization scripts
│   └── initdb.d/        # Docker initialization scripts
├── src/                  # Source code
│   ├── core/            # Domain layer (Onion Architecture)
│   └── infrastructure/  # Infrastructure layer
├── package.json         # Dependencies and scripts
├── pnpm-lock.yaml      # Lock file
├── tsconfig.json       # TypeScript configuration
├── vitest.config.ts    # Vitest test configuration
├── biome.jsonc         # Biome formatter/linter config
├── compose.yml         # Docker Compose configuration
├── Taskfile.yaml       # Task runner configuration
├── Taskfile.container.yaml  # Container tasks
├── mise.toml           # Mise configuration
├── README.md           # Project documentation
└── CLAUDE.md          # Claude Code instructions
```

## Source Code Structure (`src/`)

### Core Domain Layer (`src/core/`)
```
core/
├── +shared/              # Shared domain utilities
│   ├── interface/
│   │   ├── clock.ts     # Clock abstraction
│   │   └── transaction.ts  # Transaction interface
│   └── helpers/
│       └── zod.ts       # Zod helper functions (zodParser)
├── tenant/              # Tenant domain
│   └── value-object.ts # TenantId, TenantName
├── user/                # User domain
│   ├── value-object.ts # UserId, UserEmail, UserName
│   └── usecase/
│       └── dto.ts      # UserDto (discriminated union)
└── article/             # Article domain
    ├── value-object.ts  # ArticleId, ArticleTitle, etc.
    └── usecase/
        ├── +dto.ts      # ArticleDto
        └── +repository.ts  # Repository interface
```

### Infrastructure Layer (`src/infrastructure/`)
```
infrastructure/
└── postgres/            # PostgreSQL implementation
    ├── prisma.ts       # Prisma client setup
    ├── repository/     # Repository implementations
    │   └── article.ts  # ArticleRepository
    ├── converter/      # Entity converters
    │   ├── article.ts  # Article conversion logic
    │   └── user.ts    # User conversion logic
    └── __test__/       # Test implementations
        ├── +global-setup.ts        # Global test setup
        ├── bypass-rls-prisma.ts   # RLS bypass for tests
        ├── test-env.ts            # Test environment
        ├── A_each-commit-truncate/   # Method A tests
        │   ├── +each-file-setup.ts
        │   └── article-repository.test.ts
        ├── B_each-tx-rollback/       # Method B tests
        └── C_single-tx-each-savepoint/  # Method C tests
```

## Key Design Patterns

### Onion Architecture Layers
1. **Domain Core** (`src/core/`): Pure business logic, no external dependencies
2. **Infrastructure** (`src/infrastructure/`): External service integrations

### Value Objects with Branded Types
- All domain identifiers use branded types for compile-time safety
- Parse functions provided via companion objects

### Repository Pattern
- Interfaces defined in domain layer
- Implementations in infrastructure layer
- Supports different transaction strategies

### Test Organization
- Three different test strategies in separate directories
- Global setup for migrations
- Per-file setup for test-specific configuration
- Factory pattern for test data generation

## Configuration Files

### TypeScript (`tsconfig.json`)
- Strict mode enabled
- Path aliases configured
- ES2022 target

### Vitest (`vitest.config.ts`)
- Project-based configuration
- Different setups for each test method
- Global setup for migrations

### Biome (`biome.jsonc`)
- Formatting rules (single quotes, 2 spaces)
- Linting rules (recommended + custom)
- Import organization

### Docker Compose (`compose.yml`)
- PostgreSQL 17
- Volume persistence
- Init scripts mounting

## Environment Structure
- Development, shadow, and test databases
- Admin and app database users
- RLS (Row Level Security) support
- Environment variables validated with Zod