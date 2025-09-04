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
import { AutoCompleteModule } from 'primeng/autocomplete'; // Type-ahead search with dropdown options
// Usage: <p-autocomplete [(ngModel)]="selectedCountry" [suggestions]="filteredCountries" (completeMethod)="filterCountries($event)" field="name" />

import { CascadeSelectModule } from 'primeng/cascadeselect'; // Hierarchical selection (country > state > city)
// Usage: <p-cascadeselect [(ngModel)]="selectedCity" [options]="countries" optionLabel="cname" optionGroupLabel="states" />

import { CheckboxModule } from 'primeng/checkbox'; // Boolean checkbox input
// Usage: <p-checkbox [(ngModel)]="checked" [binary]="true" inputId="binary" />

import { ColorPickerModule } from 'primeng/colorpicker'; // Color selection with palette and hex input
// Usage: <p-colorpicker [(ngModel)]="color" />

import { DatepickerModule } from 'primeng/datepicker'; // Modern date/time picker with calendar
// Usage: <p-datepicker [(ngModel)]="date" />

import { EditorModule } from 'primeng/editor'; // Rich text WYSIWYG editor
// Usage: <p-editor [(ngModel)]="text" [style]="{'height':'320px'}" />

import { FloatLabelModule } from 'primeng/floatlabel'; // Floating label animation for inputs
// Usage: <p-floatlabel><input pInputText [(ngModel)]="value" /><label for="float-input">Username</label></p-floatlabel>

import { IconFieldModule } from 'primeng/iconfield'; // Input field with integrated icons
// Usage: <p-iconfield iconPosition="left"><i class="pi pi-search"></i><input pInputText /></p-iconfield>

import { IftaLabelModule } from 'primeng/iftalabel'; // International Form Text Association labels
// Usage: <p-iftalabel><input pInputText [(ngModel)]="value" /><label>Username</label></p-iftalabel>

import { InputGroupModule } from 'primeng/inputgroup'; // Group inputs with addons and buttons
// Usage: <p-inputgroup><span class="p-inputgroup-addon">@</span><input pInputText placeholder="Username" /></p-inputgroup>

import { InputMaskModule } from 'primeng/inputmask'; // Formatted input with masks (phone, date, etc.)
// Usage: <p-inputmask [(ngModel)]="value" mask="(999) 999-9999" placeholder="(999) 999-9999" />

import { InputNumberModule } from 'primeng/inputnumber'; // Numeric input with formatting and validation
// Usage: <p-inputnumber [(ngModel)]="value" mode="currency" currency="USD" locale="en-US" />

import { InputOtpModule } from 'primeng/inputotp'; // One-time password/PIN entry with individual digit boxes
// Usage: <p-inputotp [(ngModel)]="value" [length]="6" />

import { InputTextModule } from 'primeng/inputtext'; // Basic single-line text input
// Usage: <input pInputText [(ngModel)]="value" [invalid]="isInvalid('username')" />

import { KeyFilterModule } from 'primeng/keyfilter'; // Restrict input to specific characters/patterns
// Usage: <input pInputText pKeyFilter="int" [(ngModel)]="value" />

import { KnobModule } from 'primeng/knob'; // Circular dial input for numeric values
// Usage: <p-knob [(ngModel)]="value" [size]="150" />

import { ListboxModule } from 'primeng/listbox'; // Selectable list with single/multiple selection
// Usage: <p-listbox [(ngModel)]="selectedCity" [options]="cities" optionLabel="name" />

import { MultiSelectModule } from 'primeng/multiselect'; // Multiple item selection with checkboxes
// Usage: <p-multiselect [(ngModel)]="selectedCities" [options]="cities" optionLabel="name" placeholder="Choose" />

import { PasswordModule } from 'primeng/password'; // Password input with strength meter and reveal toggle
// Usage: <p-password [(ngModel)]="password" [feedback]="true" />

import { RadioButtonModule } from 'primeng/radiobutton'; // Exclusive selection radio buttons
// Usage: <p-radiobutton [(ngModel)]="selectedOption" value="New York" inputId="city1" />

import { RatingModule } from 'primeng/rating'; // Star rating input component
// Usage: <p-rating [(ngModel)]="val" />

import { SelectModule } from 'primeng/select'; // Dropdown selection (replaces deprecated Dropdown)
// Usage: <p-select [(ngModel)]="selectedCity" [options]="cities" optionLabel="name" placeholder="Select a City" />

import { SelectButtonModule } from 'primeng/selectbutton'; // Button-style selection for small option sets
// Usage: <p-selectbutton [(ngModel)]="value" [options]="options" optionLabel="label" />

import { SliderModule } from 'primeng/slider'; // Range slider for numeric input
// Usage: <p-slider [(ngModel)]="value" />

import { TextareaModule } from 'primeng/textarea'; // Multi-line text input with auto-resize
// Usage: <textarea pTextarea [(ngModel)]="value" rows="5" cols="30" [autoResize]="true" />

import { ToggleButtonModule } from 'primeng/togglebutton'; // Two-state toggle button
// Usage: <p-togglebutton [(ngModel)]="checked" />

import { ToggleSwitchModule } from 'primeng/toggleswitch'; // iOS-style toggle switch
// Usage: <p-toggleswitch [(ngModel)]="checked" />

import { TreeSelectModule } from 'primeng/treeselect'; // Tree structure selection with hierarchy
// Usage: <p-treeselect [(ngModel)]="selectedNodes" [options]="nodes" placeholder="Select Item" />
```

### Button Components

```typescript
import { ButtonModule } from 'primeng/button'; // Standard action buttons with styling variants
// Usage: <p-button><span pButtonLabel>Click Me</span></p-button>

import { SpeedDialModule } from 'primeng/speeddial'; // Floating action button with expandable menu
// Usage: <p-speeddial [model]="items" direction="up" />

import { SplitButtonModule } from 'primeng/splitbutton'; // Button with primary action and dropdown menu
// Usage: <p-splitbutton label="Save" [model]="items" (onClick)="save()" />
```

### Data Display

```typescript
import { DataViewModule } from 'primeng/dataview'; // Flexible data display with list/grid layouts
// Usage: <p-dataview [value]="products" layout="grid"><ng-template #gridItem let-product><div class="col-12 sm:col-6 lg:col-12 xl:col-4 p-2">{{product.name}}</div></ng-template></p-dataview>

import { OrderListModule } from 'primeng/orderlist'; // Reorderable list with drag-drop or buttons
// Usage: <p-orderlist [value]="products" header="Manage Products"><ng-template #item let-product>{{product.name}}</ng-template></p-orderlist>

import { OrgChartModule } from 'primeng/organizationchart'; // Hierarchical organization chart visualization
// Usage: <p-organizationchart [value]="data"><ng-template #person let-person>{{person.data.name}}</ng-template></p-organizationchart>

import { PaginatorModule } from 'primeng/paginator'; // Data pagination controls
// Usage: <p-paginator [rows]="10" [totalRecords]="120" (onPageChange)="paginate($event)" />

import { PickListModule } from 'primeng/picklist'; // Dual-list selection (available vs selected)
// Usage: <p-picklist [source]="sourceProducts" [target]="targetProducts"><ng-template #item let-product>{{product.name}}</ng-template></p-picklist>

import { TableModule } from 'primeng/table'; // Full-featured data table with sorting, filtering, pagination[2]
// Usage: <p-table [value]="products" [tableStyle]="{ 'min-width': '60rem' }"><ng-template #header><tr><th>Name</th><th>Price</th></tr></ng-template><ng-template #body let-product><tr><td>{{product.name}}</td><td>{{product.price}}</td></tr></ng-template></p-table>

import { TimelineModule } from 'primeng/timeline'; // Chronological event timeline display
// Usage: <p-timeline [value]="events" align="alternate"><ng-template #content let-event>{{event.name}}</ng-template></p-timeline>

import { TreeModule } from 'primeng/tree'; // Hierarchical tree structure with expand/collapse
// Usage: <p-tree [value]="files" />

import { TreeTableModule } from 'primeng/treetable'; // Hierarchical data table with tree structure
// Usage: <p-treetable [value]="files"><ng-template #header><tr><th>Name</th><th>Size</th></tr></ng-template><ng-template #body let-rowNode let-rowData="rowData"><tr><td>{{rowData.name}}</td><td>{{rowData.size}}</td></tr></ng-template></p-treetable>

import { VirtualScrollerModule } from 'primeng/virtualscroller'; // High-performance scrolling for large datasets
// Usage: <p-virtualscroller [value]="items" [itemSize]="50"><ng-template #item let-item let-options="options">{{item}}</ng-template></p-virtualscroller>
```

### Panel Components

```typescript
import { AccordionModule } from 'primeng/accordion'; // Collapsible content panels
// Usage: <p-accordion><p-accordionpanel><p-accordionheader>Header</p-accordionheader><p-accordioncontent>Content</p-accordioncontent></p-accordionpanel></p-accordion>

import { CardModule } from 'primeng/card'; // Content cards with header, body, footer
// Usage: <p-card header="Advanced Card" subheader="Card subtitle"><p>Content</p><ng-template #footer><p-button label="Save" /></ng-template></p-card>

import { DividerModule } from 'primeng/divider'; // Visual content separator with optional text
// Usage: <p-divider align="left" type="dashed"><span class="p-tag">Badge</span></p-divider>

import { FieldsetModule } from 'primeng/fieldset'; // Grouped form fields with collapsible border
// Usage: <p-fieldset legend="Godfather I" [toggleable]="true">Content</p-fieldset>

import { PanelModule } from 'primeng/panel'; // Collapsible content panel with toggle
// Usage: <p-panel header="Header" [toggleable]="true">Content</p-panel>

import { ScrollPanelModule } from 'primeng/scrollpanel'; // Custom styled scrollable container
// Usage: <p-scrollpanel [style]="{'width': '100%', 'height': '200px'}">Content</p-scrollpanel>

import { SplitterModule } from 'primeng/splitter'; // Resizable split panes (horizontal/vertical)
// Usage: <p-splitter [style]="{'height': '300px'}"><p-splitterpanel class="flex items-center justify-center">Panel 1</p-splitterpanel><p-splitterpanel class="flex items-center justify-center">Panel 2</p-splitterpanel></p-splitter>

import { StepperModule } from 'primeng/stepper'; // Step-by-step wizard navigation
// Usage: <p-stepper><p-stepperpanel header="Header I"><ng-template #content>Content I</ng-template></p-stepperpanel><p-stepperpanel header="Header II"><ng-template #content>Content II</ng-template></p-stepperpanel></p-stepper>

import { TabsModule } from 'primeng/tabs'; // Tab panel navigation (replaces TabView)
// Usage: <p-tabs value="0"><p-tablist><p-tab value="0">Tab 1</p-tab><p-tab value="1">Tab 2</p-tab></p-tablist><p-tabpanels><p-tabpanel value="0">Panel 1</p-tabpanel><p-tabpanel value="1">Panel 2</p-tabpanel></p-tabpanels></p-tabs>

import { ToolbarModule } from 'primeng/toolbar'; // Action bar with grouped buttons and content
// Usage: <p-toolbar><ng-template #start><p-button label="New" /></ng-template><ng-template #end><p-button label="Delete" /></ng-template></p-toolbar>
```

### Overlay Components

```typescript
import { ConfirmDialogModule } from 'primeng/confirmdialog'; // Modal confirmation dialogs with customizable actions
// Usage: <p-confirmdialog /> (in template) + this.confirmationService.confirm({message: 'Are you sure?', accept: () => {...}})

import { ConfirmPopupModule } from 'primeng/confirmpopup'; // Inline confirmation popup near trigger element
// Usage: <p-confirmpopup /> (in template) + this.confirmationService.confirm({target: event.target, message: 'Are you sure?'})

import { DialogModule } from 'primeng/dialog'; // Modal dialog windows with header and footer
// Usage: <p-dialog header="Header" [(visible)]="visible" [modal]="true"><p>Content</p></p-dialog>

import { DrawerModule } from 'primeng/drawer'; // Slide-out side panel overlay
// Usage: <p-drawer [(visible)]="visible" header="Drawer">Content</p-drawer>

import { DynamicDialogModule } from 'primeng/dynamicdialog'; // Programmatically created dialogs with component content
// Usage: this.dialogService.open(ProductListDemo, {header: 'Product List', width: '70%'})

import { PopoverModule } from 'primeng/popover'; // Contextual overlay panel with arrow pointer
// Usage: <p-popover #op><p>Content</p></p-popover><p-button (click)="op.toggle($event)" label="Toggle" />

import { TooltipModule } from 'primeng/tooltip'; // Hover tooltips (directive-based)
// Usage: <input type="text" pTooltip="Enter your username" />
```

### File Components

```typescript
import { UploadModule } from 'primeng/upload'; // File upload with drag-drop, progress, and preview
// Usage: <p-upload mode="basic" name="demo[]" url="./upload.php" accept="image/*" maxFileSize="1000000" (onUpload)="onUpload($event)" />
```

### Menu Components

```typescript
import { BreadcrumbModule } from 'primeng/breadcrumb'; // Hierarchical navigation breadcrumbs
// Usage: <p-breadcrumb [model]="items" [home]="home" />

import { ContextMenuModule } from 'primeng/contextmenu'; // Right-click context menu
// Usage: <p-contextmenu #cm [model]="items" /><img (contextmenu)="cm.show($event)" />

import { DockModule } from 'primeng/dock'; // macOS-style dock with magnification effect
// Usage: <p-dock [model]="dockItems" position="bottom" />

import { MenuModule } from 'primeng/menu'; // Standard vertical menu list
// Usage: <p-menu [model]="items" />

import { MenubarModule } from 'primeng/menubar'; // Horizontal menu bar with dropdowns
// Usage: <p-menubar [model]="items" />

import { MegaMenuModule } from 'primeng/megamenu'; // Large dropdown menu with multi-column layout
// Usage: <p-megamenu [model]="items" orientation="horizontal" />

import { PanelMenuModule } from 'primeng/panelmenu'; // Accordion-style nested menu
// Usage: <p-panelmenu [model]="items" />

import { TieredMenuModule } from 'primeng/tieredmenu'; // Multi-level nested dropdown menu
// Usage: <p-tieredmenu [model]="items" />
```

### Chart Components

```typescript
import { ChartModule } from 'primeng/chart'; // Chart.js integration for data visualization
// Usage: <p-chart type="line" [data]="data" />
```

### Message Components

```typescript
import { MessageModule } from 'primeng/message'; // Single inline message display[9]
// Usage: <p-message severity="error" size="small" variant="simple">Username is required.</p-message>

import { ToastModule } from 'primeng/toast'; // Toast notification system
// Usage: <p-toast /> (in template) + this.messageService.add({severity:'success', summary: 'Success', detail: 'Message Content'})
```

### Media Components

```typescript
import { CarouselModule } from 'primeng/carousel'; // Image/content carousel with navigation
// Usage: <p-carousel [value]="products" [numVisible]="3" [numScroll]="3"><ng-template #item let-product>{{product.name}}</ng-template></p-carousel>

import { GalleriaModule } from 'primeng/galleria'; // Advanced image gallery with thumbnails and fullscreen
// Usage: <p-galleria [value]="images" [responsiveOptions]="responsiveOptions" [containerStyle]="{'max-width': '640px'}" [numVisible]="5" />

import { ImageModule } from 'primeng/image'; // Enhanced image display with preview and zoom
// Usage: <p-image src="https://primefaces.org/cdn/primeng/images/galleria/galleria10.jpg" alt="Image" width="250" [preview]="true" />

import { ImageCompareModule } from 'primeng/imagecompare'; // Before/after image comparison with slider
// Usage: <p-imagecompare leftImage="image1.jpg" rightImage="image2.jpg" />
```

### Miscellaneous Components

```typescript
import { AnimateOnScrollModule } from 'primeng/animateonscroll'; // Scroll-triggered CSS animations
// Usage: <div pAnimateOnScroll enterClass="fadein" leaveClass="fadeout">Content</div>

import { AutoFocusModule } from 'primeng/autofocus'; // Automatic focus management directive
// Usage: <input pInputText pAutoFocus />

import { AvatarModule } from 'primeng/avatar'; // User avatar display with image, icon, or initials
// Usage: <p-avatar label="P" styleClass="mr-2" size="xlarge" shape="circle" />

import { BadgeModule } from 'primeng/badge'; // Notification badges for status indicators
// Usage: <i class="pi pi-bell mr-4 p-text-secondary" pBadge value="2" />

import { BlockUIModule } from 'primeng/blockui'; // UI blocking overlay during operations
// Usage: <p-blockui [blocked]="blockedPanel"><p>Panel Content</p></p-blockui>

import { ChipModule } from 'primeng/chip'; // Compact information display with optional close
// Usage: <p-chip label="Action" icon="pi pi-check" />

import { FocusTrapModule } from 'primeng/focustrap'; // Accessibility focus management for modals
// Usage: <div pFocusTrap>Modal content</div>

import { FluidModule } from 'primeng/fluid'; // Responsive fluid layout container[2]
// Usage: <div pFluid>Responsive content</div>

import { InplaceModule } from 'primeng/inplace'; // Inline editing with display/edit mode toggle
// Usage: <p-inplace><ng-template #display>{{text || 'Click to Edit'}}</ng-template><ng-template #content><input type="text" pInputText [(ngModel)]="text" /></ng-template></p-inplace>

import { MeterGroupModule } from 'primeng/metergroup'; // Multiple progress meters with labels
// Usage: <p-metergroup [value]="value" />

import { ScrollTopModule } from 'primeng/scrolltop'; // Back-to-top floating button
// Usage: <p-scrolltop />

import { SkeletonModule } from 'primeng/skeleton'; // Loading skeleton placeholder animation
// Usage: <p-skeleton width="10rem" height="4rem" />

import { ProgressBarModule } from 'primeng/progressbar'; // Linear progress indicator with percentage
// Usage: <p-progressbar [value]="50" />

import { ProgressSpinnerModule } from 'primeng/progressspinner'; // Circular loading spinner
// Usage: <p-progressspinner />

import { RippleModule } from 'primeng/ripple'; // Material Design ripple click effect
// Usage: <div pRipple class="ripple-surface">Click me</div>

import { StyleClassModule } from 'primeng/styleclass'; // Dynamic CSS class manipulation
// Usage: <button pStyleClass="@next" enterFromClass="hidden" enterActiveClass="my-fadein" leaveToClass="hidden" leaveActiveClass="my-fadeout">Toggle</button>

import { TagModule } from 'primeng/tag'; // Colored content tags with severity levels[5]
// Usage: <p-tag [value]="product.inventoryStatus" [severity]="getSeverity(product.inventoryStatus)" />

import { TerminalModule } from 'primeng/terminal'; // Command line terminal interface
// Usage: <p-terminal welcomeMessage="Welcome to PrimeNG" prompt="primeng $" />
```

### Utilities

```typescript
import { FilterService } from 'primeng/api'; // Data filtering utilities for tables and lists
// Usage: this.filterService.filter(this.cars, ['brand'], 'BMW', 'contains');
```

### Services & APIs (Import from 'primeng/api')

```typescript
import { MessageService } from 'primeng/api'; // Service for managing toast notifications
// Usage: this.messageService.add({severity:'success', summary:'Success', detail:'Message sent'});

import { ConfirmationService } from 'primeng/api'; // Service for confirmation dialogs
// Usage: this.confirmationService.confirm({message: 'Do you want to delete this record?', accept: () => {...}});

import { DialogService } from 'primeng/dynamicdialog'; // Service for programmatic dialog creation
// Usage: this.dialogService.open(ProductListDemo, {header: 'Select a Product', width: '70%'});

import { OverlayService } from 'primeng/api'; // Service for overlay component management
// Usage: this.overlayService.listen(this.overlayRef, () => {...});

import { PrimeTemplate } from 'primeng/api'; // Template directive for custom content
// Usage: <ng-template pTemplate="content" let-items>Custom content</ng-template>

import { TreeDragDropService } from 'primeng/api'; // Service for tree component drag-drop
// Usage: Inject service and use for enabling drag-drop in Tree components
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
