# CLAUDE.md

Guidance for Claude Code when working with PAC Shield - a real-time multiplayer wargaming platform.

## Quick Commands

**Development**: `npx nx serve pac-shield` | **Build**: `npx nx build pac-shield`  
**Tests**: `npx nx test pac-shield` | **E2E**: `npx nx e2e pac-shield-e2e`  
**Schema Changes**: `npx nx prisma-generate pac-shield-api` → `npx nx prisma-db-push pac-shield-api`

## Tech Stack

**Angular 20** + Material 3 + Tailwind | **NestJS** + Prisma + PostgreSQL + Socket.IO | **Jest** + Playwright | **Nx 21.4.1**

## Architecture Patterns

**Data Layer**: `schema.prisma` → dual generation (NestJS DTOs + Angular interfaces)  
**WebSocket**: Socket.IO rooms (gameId-based) - Backend: `events.gateway.ts` | Frontend: `websocket.service.ts`  
**UI**: Material 3 tokens only (`styles.scss`), Tailwind for layout only  
**Roles**: UPPERCASE everywhere (`PLAYER`, `COMMANDER`, `DEPUTY`, `STRATEGIST`, `GM`)

## Specialized Agents

Use Claude's specialized agents for specific tasks:

- **api-contract-sentinel**: Schema changes, DTO validation, type safety between frontend/backend
- **e2e-reliability-marshal**: Flaky Playwright tests, test fixtures, E2E reliability 
- **material-tailwind-guardian**: UI components, M3 compliance, theming, button syntax
- **ngrx-state-auditor**: State management review, selector optimization, action hygiene
- **security-hardening-officer**: JWT flows, CORS, WebSocket auth, security audits
- **websocket-resilience-officer**: Connection stability, reconnection logic, real-time reliability

## Critical Rules

- ❌ **Never** modify `generated/` folders or skip `prisma-generate`
- ❌ **Never** use hardcoded colors, Jasmine syntax, or Tailwind colors  
- ✅ **Always** check `schema.prisma`, use `gameId` for WebSocket rooms, run E2E tests