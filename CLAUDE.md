# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Nx Monorepo Commands

### Development
```bash
# Start frontend and backend together (backend runs automatically via proxy)
npx nx serve pac-shield

# Start only the backend API
npx nx serve pac-shield-api

# Build applications
npx nx build pac-shield
npx nx build pac-shield-api
```

### Testing
```bash
# Unit tests
npx nx test pac-shield
npx nx test pac-shield-api

# E2E tests (requires backend running separately)
npx nx e2e pac-shield-e2e
npx nx e2e pac-shield-api-e2e

# Run specific E2E test file
npx nx e2e-ci--src/player-settings.spec.ts pac-shield-e2e

# Linting
npx nx lint pac-shield
npx nx lint pac-shield-api
```

### Database (Prisma)
```bash
# After schema changes - run in sequence:
npx nx prisma-generate pac-shield-api    # Generate client
npx nx prisma-db-push pac-shield-api     # Push to database

# Database utilities
npx nx prisma-studio pac-shield-api      # Open database browser
npx nx prisma-db-reset pac-shield-api    # Reset database
npx nx prisma-all pac-shield-api         # Format + validate + generate
```

## Architecture Overview

### Tech Stack
- **Frontend**: Angular 20 (standalone components) + PrimeNG + Tailwind CSS
- **Backend**: NestJS + Prisma ORM + PostgreSQL + Socket.IO
- **Testing**: Jest (unit) + Playwright (E2E)
- **Monorepo**: Nx 21.4.1

### Key Applications
- `apps/pac-shield`: Angular frontend - multiplayer wargaming simulation interface
- `apps/pac-shield-api`: NestJS backend - game logic, WebSocket events, database
- `apps/pac-shield-e2e`: Playwright E2E tests for frontend
- `apps/pac-shield-api-e2e`: Jest E2E/integration tests for API

### Data Layer (Critical)
**Source of Truth**: `apps/pac-shield-api/src/prisma/schema.prisma`

The Prisma schema defines the entire game simulation data model with complex relationships between games, players, teams, aircraft, assets, etc. This schema uses **dual code generation**:

1. **NestJS DTOs**: Generated to `apps/pac-shield-api/src/app/generated/`
2. **Angular Interfaces**: Generated to `apps/pac-shield/src/app/generated/`

**After schema changes, always run**: `npx nx prisma-generate pac-shield-api`

### Real-time Communication Pattern
WebSocket architecture using Socket.IO rooms:

1. **Backend Gateway**: `apps/pac-shield-api/src/app/events.gateway.ts`
   - Each game = separate room (identified by `gameId`)
   - Handles `joinGame` and `gameEvent` messages

2. **Frontend Service**: `apps/pac-shield/src/app/shared/services/websocket.service.ts`
   - Connects to gateway, joins game rooms
   - Emits `gameEvent` with `{gameId, eventName, data}`
   - Components subscribe via `listen(eventName)`

3. **Event Flow**:
   ```
   Component → WebSocketService.emit() → Gateway → Broadcast to room → Other clients receive
   ```

### Frontend Architecture
- **Standalone Components**: All Angular components are standalone (no modules)
- **PrimeNG + Tailwind**: UI component library + utility-first CSS
- **Lazy Routes**: All feature routes are lazy-loaded
- **Feature Structure**: Components organized by feature (home, lobby, game, join)

### Backend Architecture
- **NestJS Controllers**: Handle HTTP requests
- **Services**: Business logic and database operations
- **Prisma**: Type-safe database access
- **WebSocket Gateway**: Real-time game events

### Testing Strategy
- **Unit Tests**: Use Jest, avoid over-mocking simple integrations
- **E2E Tests**: Focus on critical user journeys, test real integrations
- **API E2E**: Test endpoints with real database (using test database)

**IMPORTANT**: E2E tests (both Playwright and API E2E) are highly valued and critical for maintaining system reliability. Always prioritize running and maintaining these tests when making changes.

### Important Patterns

#### Role Management
Player roles use **uppercase enum values** throughout:
- Database: `PLAYER`, `COMMANDER`, `DEPUTY`, `STRATEGIST`, `GM`
- Frontend/Backend: Must maintain consistency with uppercase

#### Authentication Flow
- JWT tokens for player identification
- Players join games via room codes
- Auth service manages player sessions

#### PrimeNG Dialog Pattern
When working with PrimeNG dialogs:
- Use `BrowserAnimationsModule` in tests to avoid animation errors
- Handle both object and string values from AutoComplete components
- Always test dialog close functionality (X button + ESC key)

### Common Pitfalls
- **Schema First**: Always check `schema.prisma` before implementing data features
- **Generate After Changes**: Never forget `prisma-generate` after schema modifications
- **Test Framework**: Use Jest syntax (`jest.spyOn`), not Jasmine (`spyOn`)
- **Case Sensitivity**: Player roles must be uppercase everywhere
- **WebSocket Rooms**: Always use `gameId` as room identifier