# CLAUDE.md

## Project Overview

Operation Pacific Shield (OPS) is a real-time multiplayer wargaming platform implementing a digital version of the "Operation Pacific Shield" tabletop wargame. This is a military training exercise designed for Officer Training School (OTS) that simulates Agile Combat Employment (ACE) concepts in a contested Pacific theater.

## Core Architecture

### Tech Stack
- **Frontend**: Angular 20 + Angular Material 3 + Tailwind CSS + NgRx + MapLibre GL
- **Backend**: NestJS + Prisma + PostgreSQL + Socket.IO WebSockets
- **Monorepo**: Nx 21.4.1 workspace with TypeScript throughout
- **Testing**: Jest (unit) + Playwright (E2E) + Wallaby.js (live testing)

### Applications Structure
- `apps/pac-shield` - Angular frontend (main UI)
- `apps/pac-shield-api` - NestJS backend API
- `apps/pac-shield-e2e` - Playwright E2E tests
- `apps/pac-shield-api-e2e` - API integration tests

### Key Architectural Patterns

#### Dual Code Generation from Prisma
The system uses a unique dual-generation approach:
- **Backend DTOs**: Generated to `apps/pac-shield-api/src/app/generated/` for NestJS validation
- **Frontend Interfaces**: Generated to `apps/pac-shield/src/app/generated/` for Angular type safety
- Both share the same schema source (`apps/pac-shield-api/src/prisma/schema.prisma`)

#### Real-time Multiplayer via WebSockets
- **Connection Pattern**: Socket.IO rooms based on `gameId` for session isolation
- **Backend Gateway**: `EventsGateway` handles connection/disconnection and room management
- **Game-specific Gateway**: `GameGateway` handles game logic events
- **Frontend Service**: WebSocket service manages connection state and event handling

#### Material 3 Design System Integration
- Uses Angular Material 3 with comprehensive token system in `styles.scss`
- Custom utility classes map Material Design tokens (`md-*` classes)
- Dual theme support (light/dark) with CSS variables
- Strict no-hardcoded-colors policy enforced

## Common Development Commands

### Development Server Commands
```bash
# Start backend API (runs on http://localhost:3000)
npx nx serve pac-shield-api

# Start frontend UI (runs on http://localhost:4200)
npx nx serve pac-shield

# Build applications
npx nx build pac-shield
npx nx build pac-shield-api
```

### Database Management (Prisma)
```bash
# After modifying schema.prisma, run this sequence:
npx nx prisma-generate pac-shield-api    # Generate Prisma client + DTOs
npx nx prisma-db-push pac-shield-api     # Apply schema to database

# Additional database commands:
npx nx prisma-studio pac-shield-api      # Open database GUI
npx nx prisma-db-reset pac-shield-api    # Reset database (destructive)
```

### Testing
```bash
# Unit tests
npx nx test pac-shield               # Frontend tests
npx nx test pac-shield-api          # Backend tests

# E2E tests (use MCP Playwright server in WARP, not terminal commands)
# Terminal E2E commands are disabled - use browser automation tools instead
```

### Code Quality
```bash
# Linting
npx nx lint pac-shield
npx nx lint pac-shield-api
```

## Critical Development Rules

### Database Schema Changes
1. **Always modify** `apps/pac-shield-api/src/prisma/schema.prisma` first
2. **Never skip** `npx nx prisma-generate pac-shield-api` after schema changes
3. **Never manually edit** `generated/` directories - they are auto-generated
4. Use uppercase for all role enums (`PLAYER`, `COMMANDER`, `GM`, etc.)

### UI Development Standards
- **Material Components Only**: Use Angular Material components for all interactive elements
- **Tailwind-First Styling**: ALWAYS use Tailwind CSS utility classes for styling - never write custom CSS unless absolutely necessary
- **Token-Based Styling**: Use Material 3 CSS variables as in `styles.scss`, never hardcoded colors/hex values
- **Button Sizing**: Buttons should size to content, not fill containers
- **Form Labels**: Always use `<mat-label>` instead of placeholders for accessibility
- **Theme Support**: Ensure components work in both light and dark themes
- **Responsive Design**: Use Tailwind responsive prefixes (sm:, md:, lg:, xl:) for all layouts
- **Control Flow**: Use new Angular control flow syntax (`@if`, `@for`, `@switch`) instead of structural directives (`*ngIf`, `*ngFor`, `*ngSwitch`)

#### Angular Material 20 Button Syntax
Use the correct Material 20 button directives:
- **Text buttons**: `<button matButton>Basic</button>`
- **Elevated buttons**: `<button matButton="elevated">Basic</button>`
- **Outlined buttons**: `<button matButton="outlined">Basic</button>`
- **Filled buttons**: `<button matButton="filled">Basic</button>`
- **Tonal buttons**: `<button matButton="tonal">Basic</button>`
- **Icon buttons**: `<button matIconButton><mat-icon>icon</mat-icon></button>`
- **FAB buttons**: `<button matFab><mat-icon>icon</mat-icon></button>`

### WebSocket Architecture
- **Room Isolation**: Always use `gameId` as Socket.IO room identifier
- **Event Naming**: Use consistent event naming conventions (`joinGame`, `gameEvent`)
- **Connection Handling**: Handle reconnection scenarios gracefully
- **State Synchronization**: Broadcast state changes to all room participants

### Testing Approach
- **Unit Tests**: Focus on business logic, avoid testing Angular Material components directly  
- **E2E Tests**: Use MCP Playwright server for browser automation
- **Real-time Testing**: Test WebSocket events and multi-user scenarios

## Game Domain Knowledge

### Core Game Concepts
- **Teams**: CAOC (air operations), CSpOC (space), MOBs (main bases), MEDCOM (medical)
- **Assets**: Aircraft instances, personnel, equipment tracked individually in database
- **Locations**: Forward Operating Sites (FOS) with detailed capability tracking
- **Real-time State**: Turn-based gameplay with live synchronization across all players

### Key Game Mechanics
- **Mission Points (MP)**: Primary victory condition scoring system
- **Political Access**: Country-by-country flight permissions affecting gameplay
- **Logistics Tax**: End-of-day resource consumption based on deployed personnel
- **Combat Resolution**: Dice-based system with strength modifiers

## Environment Setup

### Database Requirements
- PostgreSQL database (connection string in `.env`)
- Database URL format: `postgresql://user:pass@host:port/dbname`

### Development Prerequisites
- Node.js/Yarn for package management
- PostgreSQL for database persistence
- Environment variables configured in `apps/pac-shield-api/src/prisma/.env`

## Specialized Agent Guidance

When working with specific aspects of this codebase, consider using specialized Claude agents:

- **API Contract Changes**: Use `api-contract-sentinel` for schema/DTO validation
- **E2E Test Issues**: Use `e2e-reliability-marshal` for Playwright reliability
- **UI Consistency**: Use `material-tailwind-guardian` for Material 3 compliance
- **State Management**: Use `ngrx-state-auditor` for NgRx patterns
- **Security Reviews**: Use `security-hardening-officer` for auth/WebSocket security
- **Real-time Issues**: Use `websocket-resilience-officer` for connection reliability

## File Structure Conventions

### Generated Code Locations
- `apps/pac-shield/src/app/generated/` - Angular interfaces from Prisma
- `apps/pac-shield-api/src/app/generated/` - NestJS DTOs from Prisma
- Never modify these directories manually

### Key Configuration Files
- `nx.json` - Nx workspace configuration
- `apps/pac-shield-api/src/prisma/schema.prisma` - Database schema
- `apps/pac-shield/src/styles.scss` - Material 3 theming and tokens
- `.env` - Database connection and JWT secrets

This document captures the essential knowledge needed to be productive in this complex multiplayer gaming platform codebase.
