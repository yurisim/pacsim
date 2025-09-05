# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Nx Commands

### Development
```bash
# Start frontend + backend (backend via proxy)
npx nx serve pac-shield

# Backend only
npx nx serve pac-shield-api

# Build
npx nx build pac-shield
npx nx build pac-shield-api
```

### Testing & Quality
```bash
# Unit tests
npx nx test pac-shield
npx nx test pac-shield-api

# E2E tests (requires backend running)
npx nx e2e pac-shield-e2e
npx nx e2e pac-shield-api-e2e

# Linting
npx nx lint pac-shield
npx nx lint pac-shield-api
```

### Database (Prisma)
```bash
# After schema changes (run in sequence):
npx nx prisma-generate pac-shield-api    # Generate client
npx nx prisma-db-push pac-shield-api     # Push to database

# Utilities
npx nx prisma-studio pac-shield-api      # Database browser
npx nx prisma-db-reset pac-shield-api    # Reset database
```

## Architecture

**Tech Stack**: Angular 20 + Angular Material + Tailwind | NestJS + Prisma + PostgreSQL + Socket.IO | Jest + Playwright | Nx 21.4.1

**Key Apps**:
- `apps/pac-shield`: Angular frontend
- `apps/pac-shield-api`: NestJS backend  
- `apps/pac-shield-e2e`: Playwright E2E tests
- `apps/pac-shield-api-e2e`: API E2E tests

### Data Layer (Critical)

**Source of Truth**: `apps/pac-shield-api/src/prisma/schema.prisma`

**Dual Code Generation**:
1. NestJS DTOs → `apps/pac-shield-api/src/app/generated/`  
2. Angular Interfaces → `apps/pac-shield/src/app/generated/`

**After schema changes**: `npx nx prisma-generate pac-shield-api`

### WebSocket Architecture

**Pattern**: Socket.IO rooms (gameId-based)
- Backend: `apps/pac-shield-api/src/app/events.gateway.ts`
- Frontend: `apps/pac-shield/src/app/shared/services/websocket.service.ts`
- Flow: `Component → WebSocket.emit({gameId, eventName, data}) → Gateway → Broadcast`

### UI Standards

**Material 3 + Tailwind Policy**:
- Use Angular Material MDC components for all UI elements
- All colors/typography from M3 tokens in `styles.scss` (never hardcoded hex)
- Tailwind allowed only for layout (flex, grid, spacing, sizing)
- Theme: Dark default, light via `body.light-mode`, density support planned

**Button Syntax (Angular Material v20)**:
- Text: `<button matButton>Basic</button>`
- Elevated: `<button matButton="elevated">Basic</button>`
- Outlined: `<button matButton="outlined">Basic</button>`
- Filled: `<button matButton="filled">Basic</button>`
- Tonal: `<button matButton="tonal">Basic</button>`
- Icon: `<button matIconButton><mat-icon>icon</mat-icon></button>`
- FAB: `<button matFab><mat-icon>icon</mat-icon></button>`
- Mini FAB: `<button matMiniFab><mat-icon>icon</mat-icon></button>`
- Extended FAB: `<button matFab extended><mat-icon>icon</mat-icon>Text</button>`

**Button Hierarchy**:
- Primary/High emphasis: `matButton="filled"` 
- Secondary/Medium emphasis: `matButton="tonal"`
- Low emphasis: `matButton` (text)
- Destructive: Add `color="warn"` to any variant

## Critical Patterns

### Role Management
Player roles are **UPPERCASE** everywhere: `PLAYER`, `COMMANDER`, `DEPUTY`, `STRATEGIST`, `GM`

### Testing Priority
E2E tests (Playwright + API E2E) are **critical** for reliability. Always prioritize running and maintaining when making changes.

## Common Pitfalls

- ❌ **Never** modify files in `generated/` folders
- ❌ **Never** skip `prisma-generate` after schema changes  
- ❌ **Never** use Jasmine syntax (`spyOn`) - use Jest (`jest.spyOn`)
- ❌ **Never** use Tailwind colors - use M3 tokens only
- ❌ **Never** hardcode colors - use CSS variables (`var(--mat-sys-*)`)
- ✅ **Always** check `schema.prisma` before data features
- ✅ **Always** use `gameId` for WebSocket rooms
- ✅ **Always** maintain uppercase role consistency