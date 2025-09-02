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

## PrimeNG Component Toolbox (v20)

This project uses PrimeNG v20 as the UI component library. Below is a comprehensive list of available components organized by category. Always import components from their specific modules (e.g., `import { ButtonModule } from 'primeng/button';`).

### Form Components
```typescript
// Text Input & Selection
import { AutoCompleteModule } from 'primeng/autocomplete';   // Type-ahead search with dropdown options
import { CascadeSelectModule } from 'primeng/cascadeselect'; // Hierarchical selection (country > state > city)
import { CheckboxModule } from 'primeng/checkbox';           // Boolean checkbox input
import { ColorPickerModule } from 'primeng/colorpicker';     // Color selection with palette and hex input
import { DatepickerModule } from 'primeng/datepicker';       // Modern date/time picker with calendar
import { EditorModule } from 'primeng/editor';               // Rich text WYSIWYG editor
import { FloatLabelModule } from 'primeng/floatlabel';       // Floating label animation for inputs
import { IconFieldModule } from 'primeng/iconfield';         // Input field with integrated icons
import { IftaLabelModule } from 'primeng/iftalabel';         // International Form Text Association labels
import { InputGroupModule } from 'primeng/inputgroup';       // Group inputs with addons and buttons
import { InputMaskModule } from 'primeng/inputmask';         // Formatted input with masks (phone, date, etc.)
import { InputNumberModule } from 'primeng/inputnumber';     // Numeric input with formatting and validation
import { InputOtpModule } from 'primeng/inputotp';           // One-time password/PIN entry with individual digit boxes
import { InputTextModule } from 'primeng/inputtext';         // Basic single-line text input
import { KeyFilterModule } from 'primeng/keyfilter';         // Restrict input to specific characters/patterns
import { KnobModule } from 'primeng/knob';                   // Circular dial input for numeric values
import { ListboxModule } from 'primeng/listbox';             // Selectable list with single/multiple selection
import { MultiSelectModule } from 'primeng/multiselect';     // Multiple item selection with checkboxes
import { PasswordModule } from 'primeng/password';           // Password input with strength meter and reveal toggle
import { RadioButtonModule } from 'primeng/radiobutton';     // Exclusive selection radio buttons
import { RatingModule } from 'primeng/rating';               // Star rating input component
import { SelectModule } from 'primeng/select';               // Dropdown selection (replaces deprecated Dropdown)
import { SelectButtonModule } from 'primeng/selectbutton';   // Button-style selection for small option sets
import { SliderModule } from 'primeng/slider';               // Range slider for numeric input
import { TextareaModule } from 'primeng/textarea';           // Multi-line text input with auto-resize
import { ToggleButtonModule } from 'primeng/togglebutton';   // Two-state toggle button
import { ToggleSwitchModule } from 'primeng/toggleswitch';   // iOS-style toggle switch
import { TreeSelectModule } from 'primeng/treeselect';       // Tree structure selection with hierarchy
```

### Button Components
```typescript
import { ButtonModule } from 'primeng/button';               // Standard action buttons with styling variants
import { SpeedDialModule } from 'primeng/speeddial';         // Floating action button with expandable menu
import { SplitButtonModule } from 'primeng/splitbutton';     // Button with primary action and dropdown menu
```

### Data Display
```typescript
import { DataViewModule } from 'primeng/dataview';           // Flexible data display with list/grid layouts
import { OrderListModule } from 'primeng/orderlist';         // Reorderable list with drag-drop or buttons
import { OrgChartModule } from 'primeng/organizationchart';  // Hierarchical organization chart visualization
import { PaginatorModule } from 'primeng/paginator';         // Data pagination controls
import { PickListModule } from 'primeng/picklist';           // Dual-list selection (available vs selected)
import { TableModule } from 'primeng/table';                 // Full-featured data table with sorting, filtering, pagination
import { TimelineModule } from 'primeng/timeline';           // Chronological event timeline display
import { TreeModule } from 'primeng/tree';                   // Hierarchical tree structure with expand/collapse
import { TreeTableModule } from 'primeng/treetable';         // Hierarchical data table with tree structure
import { VirtualScrollerModule } from 'primeng/virtualscroller'; // High-performance scrolling for large datasets
```

### Panel Components
```typescript
import { AccordionModule } from 'primeng/accordion';         // Collapsible content panels
import { CardModule } from 'primeng/card';                   // Content cards with header, body, footer
import { DividerModule } from 'primeng/divider';             // Visual content separator with optional text
import { FieldsetModule } from 'primeng/fieldset';           // Grouped form fields with collapsible border
import { PanelModule } from 'primeng/panel';                 // Collapsible content panel with toggle
import { ScrollPanelModule } from 'primeng/scrollpanel';     // Custom styled scrollable container
import { SplitterModule } from 'primeng/splitter';           // Resizable split panes (horizontal/vertical)
import { StepperModule } from 'primeng/stepper';             // Step-by-step wizard navigation
import { TabsModule } from 'primeng/tabs';                   // Tab panel navigation (replaces TabView)
import { ToolbarModule } from 'primeng/toolbar';             // Action bar with grouped buttons and content
```

### Overlay Components
```typescript
import { ConfirmDialogModule } from 'primeng/confirmdialog'; // Modal confirmation dialogs with customizable actions
import { ConfirmPopupModule } from 'primeng/confirmpopup';   // Inline confirmation popup near trigger element
import { DialogModule } from 'primeng/dialog';               // Modal dialog windows with header and footer
import { DrawerModule } from 'primeng/drawer';               // Slide-out side panel overlay
import { DynamicDialogModule } from 'primeng/dynamicdialog'; // Programmatically created dialogs with component content
import { PopoverModule } from 'primeng/popover';             // Contextual overlay panel with arrow pointer
import { TooltipModule } from 'primeng/tooltip';             // Hover tooltips (directive-based)
```

### File Components
```typescript
import { UploadModule } from 'primeng/upload';               // File upload with drag-drop, progress, and preview
```

### Menu Components
```typescript
import { BreadcrumbModule } from 'primeng/breadcrumb';       // Hierarchical navigation breadcrumbs
import { ContextMenuModule } from 'primeng/contextmenu';     // Right-click context menu
import { DockModule } from 'primeng/dock';                   // macOS-style dock with magnification effect
import { MenuModule } from 'primeng/menu';                   // Standard vertical menu list
import { MenubarModule } from 'primeng/menubar';             // Horizontal menu bar with dropdowns
import { MegaMenuModule } from 'primeng/megamenu';           // Large dropdown menu with multi-column layout
import { PanelMenuModule } from 'primeng/panelmenu';         // Accordion-style nested menu
import { TieredMenuModule } from 'primeng/tieredmenu';       // Multi-level nested dropdown menu
```

### Chart Components
```typescript
import { ChartModule } from 'primeng/chart';                 // Chart.js integration for data visualization
```

### Message Components
```typescript
import { MessageModule } from 'primeng/message';             // Single inline message display
import { ToastModule } from 'primeng/toast';                 // Toast notification system
```

### Media Components
```typescript
import { CarouselModule } from 'primeng/carousel';           // Image/content carousel with navigation
import { GalleriaModule } from 'primeng/galleria';           // Advanced image gallery with thumbnails and fullscreen
import { ImageModule } from 'primeng/image';                 // Enhanced image display with preview and zoom
import { ImageCompareModule } from 'primeng/imagecompare';   // Before/after image comparison with slider
```

### Miscellaneous Components
```typescript
import { AnimateOnScrollModule } from 'primeng/animateonscroll'; // Scroll-triggered CSS animations
import { AutoFocusModule } from 'primeng/autofocus';         // Automatic focus management directive
import { AvatarModule } from 'primeng/avatar';               // User avatar display with image, icon, or initials
import { BadgeModule } from 'primeng/badge';                 // Notification badges for status indicators
import { BlockUIModule } from 'primeng/blockui';             // UI blocking overlay during operations
import { ChipModule } from 'primeng/chip';                   // Compact information display with optional close
import { FocusTrapModule } from 'primeng/focustrap';         // Accessibility focus management for modals
import { FluidModule } from 'primeng/fluid';                 // Responsive fluid layout container
import { InplaceModule } from 'primeng/inplace';             // Inline editing with display/edit mode toggle
import { MeterGroupModule } from 'primeng/metergroup';       // Multiple progress meters with labels
import { ScrollTopModule } from 'primeng/scrolltop';         // Back-to-top floating button
import { SkeletonModule } from 'primeng/skeleton';           // Loading skeleton placeholder animation
import { ProgressBarModule } from 'primeng/progressbar';     // Linear progress indicator with percentage
import { ProgressSpinnerModule } from 'primeng/progressspinner'; // Circular loading spinner
import { RippleModule } from 'primeng/ripple';               // Material Design ripple click effect
import { StyleClassModule } from 'primeng/styleclass';       // Dynamic CSS class manipulation
import { TagModule } from 'primeng/tag';                     // Colored content tags with severity levels
import { TerminalModule } from 'primeng/terminal';           // Command line terminal interface
```

### Utilities
```typescript
import { FilterService } from 'primeng/api';                 // Data filtering utilities for tables and lists
```

### Services & APIs (Import from 'primeng/api')
```typescript
import { MessageService } from 'primeng/api';               // Service for managing toast notifications
import { ConfirmationService } from 'primeng/api';          // Service for confirmation dialogs
import { DialogService } from 'primeng/dynamicdialog';      // Service for programmatic dialog creation
import { OverlayService } from 'primeng/api';               // Service for overlay component management
import { PrimeTemplate } from 'primeng/api';                // Template directive for custom content
import { TreeDragDropService } from 'primeng/api';          // Service for tree component drag-drop
```

### Usage Guidelines

1. **Import Strategy**: Always import only the modules you need in each component
2. **Standalone Components**: Add PrimeNG modules to the `imports` array of standalone components  
3. **Services**: Register services like `MessageService` in providers array or app config
4. **Theming**: The project uses PrimeNG's Aura theme with Tailwind CSS integration
5. **Icons**: Use PrimeIcons (`pi pi-*`) for consistent iconography
6. **Responsive**: Most components support responsive design out of the box
7. **Accessibility**: PrimeNG components follow WCAG guidelines by default

### Common Patterns Used in Project
- **Dialog Workflows**: DynamicDialogModule for programmatic popups
- **Form Validation**: Reactive forms with PrimeNG form components
- **Data Tables**: TableModule for player lists and game data  
- **Navigation**: Button components with router integration
- **Feedback**: ToastModule for user notifications
- **Input Groups**: InputGroupModule for enhanced form layouts
- **Selection**: AutoComplete (not Dropdown) for all dropdown needs
- **OTP/PIN Entry**: InputOtpModule for secure code entry
