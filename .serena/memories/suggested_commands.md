# Suggested Commands

## Infrastructure Management
```bash
# Start PostgreSQL container
task docker:up   # or task podman:up

# Stop containers
task docker:down  # or task podman:down

# Remove containers and volumes
task docker:remove  # or task podman:remove

# Show container status
task docker:ps    # or task podman:ps

# View container logs
task docker:logs  # or task podman:logs
```

## Database Operations
```bash
# Apply Prisma migrations to database
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate

# Open Prisma Studio (GUI for database)
pnpm prisma studio

# Reset database (drop, create, and apply migrations)
pnpm prisma migrate reset
```

## Code Quality
```bash
# Format and fix code with Biome
pnpm run fix

# Format with unsafe fixes (auto-fixes more issues)
pnpm run fix:unsafe

# Type checking (important to run before committing)
pnpm run typechk
```

## Testing
```bash
# Run Method A tests (commit + truncate strategy)
pnpm run test:A

# Run all tests
pnpm vitest run

# Run tests in watch mode
pnpm vitest

# Run specific test file or pattern
pnpm vitest run [pattern]

# Run tests with coverage
pnpm vitest run --coverage
```

## Development Workflow
```bash
# Install dependencies
pnpm install

# Update dependencies
pnpm update

# Add new dependency
pnpm add [package-name]

# Add dev dependency
pnpm add -D [package-name]
```

## Git Operations (Darwin/macOS)
```bash
# Standard git commands
git status
git diff
git add .
git commit -m "message"
git push
git pull
git branch
git checkout [branch]
git merge [branch]
```

## File Operations (Darwin/macOS)
```bash
# List files
ls -la

# Find files
find . -name "*.ts"

# Search in files (using ripgrep)
rg "pattern"

# Navigate directories
cd [path]
pwd

# View file contents
cat [file]
less [file]
```