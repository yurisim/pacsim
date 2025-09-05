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
- **Generated Folder**: You will NOT attempt to add or modify files in a generated folder.
- **Test Framework**: Use Jest syntax (`jest.spyOn`), not Jasmine (`spyOn`)
- **Case Sensitivity**: Player roles must be uppercase everywhere
- **WebSocket Rooms**: Always use `gameId` as room identifier

### Form Components

## Angular Material Component Toolbox (v20)

## Buttons & indicators

- Button

  - UI: Clickable action for commands and navigation.
  - Import:
    ```ts
    import { MatButtonModule } from '@angular/material/button';
    ```
  - Variants: text, raised/elevated, outlined, filled, tonal; icon buttons; FAB.

- Button toggle

  - UI: Groupable on/off toggles for option sets.
  - Import:
    ```ts
    import { MatButtonToggleModule } from '@angular/material/button-toggle';
    ```
  - Variants: single vs multiple selection groups; appearance options.

- Badge

  - UI: Small status/count indicator attached to a host element.
  - Import:
    ```ts
    import { MatBadgeModule } from '@angular/material/badge';
    ```
  - Variants: position (before/after, above/below), size, color, overlap.

- Chips

  - UI: Compact elements to represent inputs, filters, or actions.
  - Import:
    ```ts
    import { MatChipsModule } from '@angular/material/chips';
    ```
  - Variants: input chips, selectable chips, with autocomplete.

- Icon

  - UI: Display Material icons (font ligatures or SVG).
  - Import:
    ```ts
    import { MatIconModule } from '@angular/material/icon';
    ```
  - Variants: font vs SVG registry; color, size.

- Progress bar

  - UI: Linear indicator of operation progress.
  - Import:
    ```ts
    import { MatProgressBarModule } from '@angular/material/progress-bar';
    ```
  - Variants: determinate, indeterminate, buffer, query.

- Progress spinner

  - UI: Circular indicator of ongoing tasks.
  - Import:
    ```ts
    import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
    ```
  - Variants: determinate, indeterminate; diameter, strokeWidth.

- Ripples
  - UI: Material ink ripple interaction effect.
  - Import:
    ```ts
    import { MatRippleModule } from '@angular/material/core;
    ```
  - Variants: centered, unbounded, disabled, radius.

## Form controls

- Autocomplete

  - UI: Suggests options while typing.
  - Import:
    ```ts
    import { MatAutocompleteModule } from '@angular/material/autocomplete';
    ```
  - Variants: simple, filtered, custom display/option templates.

- Checkbox

  - UI: Binary selection with optional indeterminate state.
  - Import:
    ```ts
    import { MatCheckboxModule } from '@angular/material/checkbox';
    ```
  - Variants: label position, color, indeterminate.

- Datepicker

  - UI: Calendar/date selection (with adapter).
  - Import:
    ```ts
    import { MatDatepickerModule } from '@angular/material/datepicker';
    import { MatNativeDateModule } from '@angular/material/core';
    ```
  - Variants: single date vs range; touch UI; native, Moment, or Luxon adapters.

- Form field

  - UI: Container for inputs with label, hint, errors.
  - Import:
    ```ts
    import { MatFormFieldModule } from '@angular/material/form-field';
    ```
  - Variants: appearance styles, hint/subscript, prefix/suffix.

- Input

  - UI: Text input for single or multi-line content.
  - Import:
    ```ts
    import { MatInputModule } from '@angular/material/input';
    ```
  - Variants: text, password, textarea (with autosize via CDK).

- Radio button

  - UI: Mutually exclusive option selection.
  - Import:
    ```ts
    import { MatRadioModule } from '@angular/material/radio';
    ```
  - Variants: label position, color, reactive forms.

- Select

  - UI: Dropdown selection with templated options.
  - Import:
    ```ts
    import { MatSelectModule } from '@angular/material/select';
    ```
  - Variants: single, multiple, custom trigger, panel classes.

- Slider

  - UI: Numeric input via sliding thumb.
  - Import:
    ```ts
    import { MatSliderModule } from '@angular/material/slider';
    ```
  - Variants: min/max, step, discrete mode with ticks, vertical.

- Slide toggle
  - UI: Switch-style on/off control.
  - Import:
    ```ts
    import { MatSlideToggleModule } from '@angular/material/slide-toggle';
    ```
  - Variants: label position, color, disabled.

## Navigation

- Menu

  - UI: Context and navigation menus.
  - Import:
    ```ts
    import { MatMenuModule } from '@angular/material/menu';
    ```
  - Variants: nested menus, icons, context menu.

- Sidenav

  - UI: Side navigation drawer plus content container.
  - Import:
    ```ts
    import { MatSidenavModule } from '@angular/material/sidenav';
    ```
  - Variants: modes (side, over, push); opened state; responsive.

- Toolbar

  - UI: Top app bar for titles and actions.
  - Import:
    ```ts
    import { MatToolbarModule } from '@angular/material/toolbar';
    ```
  - Variants: single vs multi-row; density; color.

- Tabs

  - UI: Organize content into tabbed views.
  - Import:
    ```ts
    import { MatTabsModule } from '@angular/material/tabs';
    ```
  - Variants: lazy rendering, alignment, stretch, dynamic tabs.

- Stepper
  - UI: Wizard-like multi-step flows.
  - Import:
    ```ts
    import { MatStepperModule } from '@angular/material/stepper';
    ```
  - Variants: linear vs non-linear; horizontal/vertical.

## Layout

- Card

  - UI: Structured container for content and actions.
  - Import:
    ```ts
    import { MatCardModule } from '@angular/material/card';
    ```
  - Variants: header, media, actions; outlined.

- Divider

  - UI: Thin line separating content.
  - Import:
    ```ts
    import { MatDividerModule } from '@angular/material/divider';
    ```
  - Variants: horizontal, vertical, inset.

- Expansion panel

  - UI: Expand/collapse content areas.
  - Import:
    ```ts
    import { MatExpansionModule } from '@angular/material/expansion';
    ```
  - Variants: accordion; multi-expand; panel headers and actions.

- Grid list

  - UI: Tiled grid layout with rows and columns.
  - Import:
    ```ts
    import { MatGridListModule } from '@angular/material/grid-list';
    ```
  - Variants: rowHeight strategies; colspan/rowspan; gutter size.

- List

  - UI: Lists of text and interactive content.
  - Import:
    ```ts
    import { MatListModule } from '@angular/material/list';
    ```
  - Variants: action lists; selection lists; multi-line items.

- Tree
  - UI: Hierarchical data display.
  - Import:
    ```ts
    import { MatTreeModule } from '@angular/material/tree';
    ```
  - Variants: flat vs nested; toggle and padding controls.

## Popups & modals

- Dialog

  - UI: Modal container for custom content.
  - Import:
    ```ts
    import { MatDialogModule } from '@angular/material/dialog';
    ```
  - Variants: data injection; width/height/position; focus restoration.

- Bottom sheet

  - UI: Modal sheet from the bottom.
  - Import:
    ```ts
    import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
    ```
  - Variants: action sheets; dismiss behavior; backdrop.

- Snackbar

  - UI: Temporary alerts at screen bottom.
  - Import:
    ```ts
    import { MatSnackBarModule } from '@angular/material/snack-bar';
    ```
  - Variants: action button; duration; panel classes; custom component.

- Tooltip
  - UI: Contextual text on hover/focus.
  - Import:
    ```ts
    import { MatTooltipModule } from '@angular/material/tooltip';
    ```
  - Variants: position, show/hide delay, disabled.

## Data table

- Table

  - UI: Template-driven data table.
  - Import:
    ```ts
    import { MatTableModule } from '@angular/material/table';
    ```
  - Variants: sticky headers/columns; dynamic columns; trackBy.

- Paginator

  - UI: Pagination controls for lists/tables.
  - Import:
    ```ts
    import { MatPaginatorModule } from '@angular/material/paginator';
    ```
  - Variants: page size options; internationalization; server-side paging.

- Sort
  - UI: Sorting behavior for table headers.
  - Import:
    ```ts
    import { MatSortModule } from '@angular/material/sort';
    ```
  - Variants: start directions; disable clear; custom data accessors.

### Usage Guidelines

1. **Import Strategy**: Always import only the modules you need in each component
2. Use Material 3 design as needed, https://m3.material.io/
3. **Icons**: Use Material Icons for consistent iconography, https://fonts.google.com/icons
