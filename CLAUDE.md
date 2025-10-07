# CLAUDE.md

## 🚀 QUICK START

### ⏱️ Before Any Coding (30 seconds)
1. **✅ No API violations**: `grep -r "'/api/" apps/pac-shield/src/` → Must be zero
2. **✅ No barrel exports**: `find apps/pac-shield/src -name "index.ts"` → Must be zero
3. **✅ Use Environment URLs**: All HTTP calls use `${environment.apiUrl}/path`

### 🤖 Specialized Agents
- **🔍 Standards Enforcer** → Pre-flight checks, violation detection
- **🕵️ Anti-Patterns Detective** → Debug production issues, fix common mistakes
- **📝 Prompt Template Guide** → Better AI collaboration templates

---

## Project Overview
**Pacific Shield**: Real-time multiplayer wargaming platform (Angular 20 + NestJS + PostgreSQL + WebSockets)

### Key Commands
```bash
# Development
npx nx serve pac-shield-api     # Backend (port 3000)
npx nx serve pac-shield         # Frontend (port 4200)

# Database (after schema changes)
npx nx prisma-generate pac-shield-api
npx nx prisma-db-push pac-shield-api

# Testing & Quality
npx nx test pac-shield
npx nx lint pac-shield
```

## 🚨 CRITICAL RULES

### 🚫 NEVER CREATE index.ts FILES
- **Why**: Breaks Angular tree-shaking, increases bundle size massively
- **Do**: Import directly `./component/component.component`
- **Check**: `find apps/pac-shield/src -name "index.ts"` must return zero

### ⚠️ NEVER USE HARDCODED API PATHS
- **Why**: `/api/` paths fail in production (wrong domain)
- **Do**: Always use `${environment.apiUrl}/endpoint`
- **Check**: `grep -r "'/api/" apps/pac-shield/src/` must return zero

### 🎨 MANDATORY UI STANDARDS
- **Components**: Angular Material only, no custom HTML controls
- **Styling**: Tailwind utilities only, no custom CSS files
- **Control Flow**: `@if/@for/@switch` only, no `*ngIf/*ngFor/*ngSwitch`
- **Imports**: Direct paths only, no barrel exports
- **Icons**: NEVER use Tailwind text size classes on `<mat-icon>` elements
  - **Why**: Material icons have built-in sizing that works with Material Design typography
  - **Wrong**: `<mat-icon class="text-4xl">icon</mat-icon>`
  - **Correct**: `<mat-icon>icon</mat-icon>`
  - **Check**: `grep -r "mat-icon.*text-[0-9xs]" apps/pac-shield/src/` must return zero

### 🗃️ Database Schema & DTO Generation
1. Edit `apps/pac-shield-api/src/prisma/schema.prisma`
2. Run `npx nx prisma-generate pac-shield-api`
3. **NEVER edit `generated/` directories** - changes will be overwritten

#### Prisma DTO Generator Annotations (brakebein/prisma-generator-nestjs-dto)

**Common Annotations:**
- `/// @DtoCreateOptional` - Include field in CreateDTO as optional
- `/// @DtoCreateRequired` - Include field in CreateDTO as required (for @default fields)
- `/// @DtoReadOnly` - Omit from Create/Update DTOs (auto-managed fields)
- `/// @DtoRelationIncludeId` - **CRITICAL**: Include relation's scalar ID field in DTOs
  - **Must place on relation field, scalar ID must come AFTER relation in schema**
  - Example:
    ```prisma
    /// @DtoRelationIncludeId
    game     Game @relation(fields: [gameId], references: [id])
    gameId   Int  // Must come AFTER the relation field
    ```

**When IDs aren't included:**
- Foreign key fields are excluded by default from generated DTOs
- Create custom request DTOs that extend generated DTOs (e.g., `CreateNotificationRequestDto`)
- Use Prisma's `connect` syntax in services:
  ```typescript
  this.prisma.model.create({
    data: {
      ...dtoData,
      relation: { connect: { id: relationId } }
    }
  });
  ```

## Architecture Essentials
- **Dual Generation**: Backend DTOs + Frontend interfaces from same Prisma schema
- **WebSockets**: Socket.IO rooms by `gameId`, real-time multiplayer sync
- **Jamming System**: Simulates military communication disruption with offline-first caching
- **Material 3**: Full design system with light/dark themes

## File Structure
- `apps/pac-shield/` - Angular frontend
- `apps/pac-shield-api/` - NestJS backend
- `apps/pac-shield-e2e/` - Playwright tests
- Generated code: `apps/*/src/app/generated/` (never edit manually)