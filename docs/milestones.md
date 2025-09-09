# **Project Roadmap: Digital Operation Pacific Shield**

## **Phase 0: Foundation & Architecture (Sprint 0)**

_This phase is about making key decisions, establishing the technical groundwork, defining data structures, and preparing the development environment before writing any game-specific code._

1.  **Project Initialization & Version Control:**

    - [x] Initialize a monorepo using Git to house both the frontend and backend projects.
    - [x] Establish main, develop, and feature branching strategies.
    - [x] Configure repository on GitHub/GitLab.

2.  **Backend Setup (Node.js/NestJS/Prisma/PostgreSQL):**

    - [x] Initialize a Node.js project (`npm init`).
    - [x] Install core dependencies: NestJS, Prisma, Socket.IO, JWT, Swagger
    - [x] **Define the Prisma Schema (`schema.prisma`):**
      - [x] Implement all models from the design document (`Game`, `Team`, `AircraftInstance`, `FOS`, `ATOLine`, etc.).
      - [x] Add `roomCode` field to the `Game` model.
      - [x] Refine the `Player` model to represent a session-based identity.
      - [x] Add dedicated models for `SatelliteInstance`, `Hospital`, and `Patient` to support CSpOC and MEDCOM gameplay.
      - [x] Define all required `enum` types (e.g., `GamePhase`, `RunwayStatus`, `SatelliteType`, `HospitalTask`).
      - [x] Establish all relationships between models (e.g., `Game` to `Team`, `Team` to `AircraftInstance`).
    - [x] **Create Database Service:**
      - [x] Implement a service to connect to the PostgreSQL database.
      - [x] Generate the Prisma Client.
    - [x] **API Scaffolding:**
      - [x] Create placeholder REST API endpoints for key actions (`/api/game`, `/api/auth`).
      - [x] Create a `/api/game/create` endpoint for GMs to create a new game session and generate a `roomCode`.
      - [x] Create a `/api/game/join` endpoint for players to join a game using a `roomCode`.
      - [x] Set up basic routing structure.
    - [x] **WebSocket Server Setup:**
      - [x] Integrate Socket.IO with the NestJS server using a Gateway.
      - [x] Define initial WebSocket namespaces (e.g., `/game`).
      - [x] Create placeholder listeners for core game events (`connection`, `disconnect`, `action`).

3.  **Frontend Setup (Angular/NgRx):**

    - [x] Initialize a new Angular project using the CLI (`ng new`).
    - [x] Install core dependencies: `@ngrx/store`, `@ngrx/effects`, `@ngrx/store-devtools`, `maplibre-gl`.
    - [x] Install `socket.io-client` for WebSocket communication.
    - [x] **Establish Project Structure:**
      - [x] Create folders for `/core`, `/features`, `/shared`.
      - [x] Inside `/shared`, create subfolders for `/components`, `/models`, `/services`.
    - [x] **Define TypeScript Models:**
      - [x] Create a TypeScript interface/class for every entity in the Prisma schema (`game.model.ts`, `team.model.ts`, etc.). This ensures type safety between frontend and backend.
    - [x] **Set up NgRx Store:**
      - [x] Define the root `AppState` interface.
      - [x] Create an initial `game` feature slice with placeholder actions, reducers, and selectors.
    - [x] **Create Core Services:**
      - [x] `ApiService`: For handling all HTTP requests to the backend.
      - [x] `WebSocketService`: For managing the Socket.IO connection and dispatching received events as NgRx actions.
        - [x] Implement robust reconnection logic (e.g., exponential backoff) to handle unstable network conditions.
      - [x] `AuthService`: For handling game joining via room code and managing the session JWT.

4.  **Initial UI Scaffolding:**
    - [x] Set up Angular routing for a `/join` page (for entering a room code), a `/game/:id` page, and a `/lobby/:gameId` page.
    - [x] Implement a basic `AppComponent` with a toolbar and a router outlet.
    - [x] Create placeholder components for the main game views: `GameBoardComponent`, `MobDashboardComponent`, `CaocDashboardComponent`.
    - [x] **Advanced Authentication Flow:**
      - [x] Implement comprehensive player name conflict resolution with PIN system.
      - [x] Add room code validation with real-time feedback.
      - [x] Support JWT-based session persistence across browser sessions.
      - [x] Create lobby system with team assignment and player settings management.
      - [x] Implement Game Master setup flow with secure PIN generation.

---

## **Phase 1: Visualizing the Game State (Read-Only)**

_Focus on creating the static visual elements of the game. At this stage, things don't need to be fully interactive yet. The goal is to render the entire game board and all its pieces based on data from the backend._

1.  **Game Board Rendering:**

    - [x] **Implement `GameBoardComponent`:**
      - [x] Create basic component structure with proper routing.
      - [x] Integrate MapLibre GL to display the pacific region
      - [x] Implement h3-js hex grid overlay. Each hex must be programmatically identifiable (e.g., `data-hex-id="407"`).
      - [x] Overlay the hex grid on top of the map.
    - [ ] **Implement Civilization-style Layout Components:**
      - [ ] Create base layout with central map (75% width), right sidebar (25% width), and bottom panel (25% height)
      - [ ] Implement responsive grid system for dashboard panels
      - [ ] Create collapsible sidebar for mobile/tablet viewports
    - [ ] **Create a `GameTokenComponent`:**
      - [ ] A generic component that takes an `asset` object as input.
      - [ ] Uses `ngSwitch` to render the correct image, text (strength), and team color based on the asset's type.
      - [ ] Implement NATO-standard military symbology for units
      - [ ] Add hover states and selection highlighting
      - [ ] Include drag-and-drop functionality with visual feedback
    - [ ] **Implement Context-Sensitive Right Sidebar:**
      - [ ] Create `UnitDetailsComponent` for selected asset information
      - [ ] Build `TeamResourcesComponent` for inventory and personnel tracking
      - [ ] Add adaptive layout that adjusts based on selection state
    - [ ] **Integrate Backend Data:**
      - [ ] Create a `[Game] Load Game` NgRx effect that fetches the full game state from the backend API when a player loads the game page.
      - [ ] Create NgRx selectors to get all aircraft, ground units, and threat tokens from the state.
      - [ ] In `GameBoardComponent`, subscribe to these selectors and use `ngFor` to render a `GameTokenComponent` for each asset at its correct hex/airfield location.
      - [ ] Implement real-time state synchronization across all connected clients

2.  **Role-Specific Dashboard Overlays (Civilization-style):**
    - [x] **Implement `MobDashboardComponent` (Sliding Panel Overlay):**
      - [x] Create basic component structure.
      - [ ] Design sliding panel from right (40% screen width)
      - [ ] Create personnel assets section with location tracking
      - [ ] Implement equipment & commodities inventory with visual indicators
      - [ ] Build controlled FOSs status board with task completion progress
      - [ ] Add available aircraft section with status and action buttons
      - [ ] Use NgRx selectors to get the specific MOB's inventory and assets
    - [ ] **Implement `FosDashboardComponent` (Tech Tree Style):**
      - [ ] Create a UI that visually represents the FOS board with interconnected task nodes
      - [ ] Implement task dependency visualization showing prerequisites
      - [ ] Use selectors to get the state of a specific FOS
      - [ ] Use CSS classes and progress indicators for task completion status
      - [ ] Add RFI request interface with dice roll visualization
    - [ ] **Implement `ScoreboardComponent` (Status Bar Integration):**
      - [ ] Integrate into main layout's bottom panel status section
      - [ ] Create visual MP/DP meters with progress toward victory
      - [ ] Add turn/phase indicator with "Next Turn" Civilization-style button
      - [ ] Display real-time resource counters (personnel, equipment, commodities)
    - [x] **Implement `CaocDashboardComponent` (Full-Screen Command Interface):**
      - [x] Create basic component structure.
      - [ ] Design full-screen modal with tabbed sections (ATO, Resources, Intel, Operations)
      - [ ] Create interactive ATO table with bulk approval capabilities
      - [ ] Implement PPR queue with status indicators and batch processing
      - [ ] Build asset allocation matrix showing available aircraft
      - [ ] Add theater status overview with operational metrics
    - [ ] **Implement `CSpOCBoardComponent` (Orbital Visualization):**
      - [ ] Create orbital track visualization (GEO ring, MEO/LEO tracks)
      - [ ] Implement satellite positioning system with movement indicators
      - [ ] Build intelligence collection results panel with actionable recommendations
      - [ ] Add cyber warfare assets management interface
      - [ ] Create Ground Based Radar (GBR) deployment controls
      - [ ] Subscribe to `satelliteInstances` and render with orbital context
    - [ ] **Implement `MedcomDashboardComponent` (Medical Network Status):**
      - [ ] Design hospital network status board with bed capacity visualization
      - [ ] Create patient triage and treatment protocol displays
      - [ ] Implement active MEDEVAC operations tracking
      - [ ] Build medical supply inventory management interface
      - [ ] Add emergency protocol activation controls
      - [ ] Create `HospitalStatusComponent` with visual bed occupancy and supply status

---

## **Phase 2: Core Gameplay Mechanics & Interaction**

_This is where the game comes to life. The goal is to enable players to perform the most common actions and see the state update in real-time._

1.  **Asset Movement:**

        - [ ] Integrate Angular Material Drag and Drop directives into `GameTokenComponent`.

    - [ ] When a token is dropped onto a valid target (a hex or another board area):
      - [ ] The component dispatches an NgRx action, e.g., `[Asset] Move Request ({ assetId, targetLocation })`.
    - [ ] **Create `AssetEffects` in NgRx:**
      - [ ] The effect listens for `Move Request`.
      - [ ] It calls a `GameLogicService` to validate the move (checking range, political access, etc.).
      - [ ] If valid, it sends the action to the backend via the `WebSocketService`.
    - [ ] **Backend Logic:**
      - [ ] The WebSocket server receives the `[Asset] Move` action.
      - [ ] It performs final server-side validation.
      - [ ] It updates the asset's location in the MongoDB database.
      - [ ] It broadcasts a `[Asset] Move Success ({ assetId, newLocation })` action to the specific game room.
    - [ ] **Frontend Update:**
      - [ ] The `WebSocketService` on all clients receives the `Move Success` event and dispatches it to their local NgRx store.
      - [ ] The reducer updates the state, and the UI reactively moves the token on everyone's screen.

2.  **Air Tasking Order (ATO) Implementation with Civilization-style Interfaces:**

    - [ ] Create an interactive `AtoTableComponent` using Angular Material Table with enhanced visual design.
    - [ ] The table's data source should be an NgRx selector for the game's `atoLines`.
    - [ ] **For MOB Players:**
      - [ ] Add a "New Flight Plan" button that opens a comprehensive `FlightPlannerDialogComponent`.
      - [ ] Implement mission planner dialog with:
        - [ ] Aircraft selection with visual representation and status indicators
        - [ ] Route planning with range validation and fuel calculations
        - [ ] Mission loadout configuration (weapons, fuel, special equipment)
        - [ ] Mission parameters (time on station, altitude, ROE)
        - [ ] Warning system for political clearances and weather advisories
      - [ ] On submit, dispatch a `[ATO] Create Line Request` action, which is sent to the backend.
    - [ ] **For CAOC Players:**
      - [ ] The table should display "Approve PPR" / "Deny PPR" buttons with batch processing capabilities.
      - [ ] Implement PPR approval queue with status indicators and filtering.
      - [ ] Add theater status overview showing operational metrics.
      - [ ] Clicking these buttons dispatches actions (`[ATO] Approve PPR Request`) to the backend.

3.  **FOS Management:**

    - [ ] **RFI Logic:**
      - [ ] In the `FosDashboardComponent`, make the RFI slots clickable.
      - [ ] Clicking an RFI dispatches a `[FOS] Request RFI` action.
      - [ ] The backend processes this, simulates the dice roll, updates the `RFI_Answers` in the database for that FOS, and broadcasts the result.
    - [ ] **Task Completion:**
      - [ ] Implement drag-and-drop functionality to move personnel tokens onto the task slots.
      - [ ] When a valid set of tokens is dropped on a task, a "Complete Task" button appears.
      - [ ] Clicking it dispatches a `[FOS] Complete Task Request`, which is validated and broadcasted by the backend.

4.  **CSpOC Gameplay Implementation:**

    - [ ] **Satellite Movement Logic (Backend):** Implement the end-of-turn logic to advance all LEO/MEO satellites one position along their tracks.
    - [ ] **"Look" Action:**
      - [ ] Allow CSpOC players to dispatch a `[CSpOC] Satellite Look Request` action.
      - [ ] Backend logic should determine what is visible based on satellite type, orbit (single hex vs. H3 resolution area), and fidelity (one-pass vs. two-pass identification).
      - [ ] Broadcast the revealed information to the CSpOC player.

5.  **MEDCOM Gameplay Implementation:**
    - [ ] **Casualty Generation (Backend):** When a PLA strike on a FOS is successful, the `EndTurnService` must calculate casualties based on personnel present and create new `Patient` documents in the database.
    - [ ] **MEDEVAC Flights:**
      - [ ] The `FlightPlannerDialogComponent` must be updated to include a "MEDEVAC" configuration.
      - [ ] When planning a MEDEVAC, the UI must allow the player to select casualties at a FOS to load onto the aircraft.
      - [ ] The backend must validate that the MEDCOM player has the required commodity tokens (bandages, IV, etc.) to perform the flight.
    - [ ] **Patient Triage & Treatment (Backend):** The `EndTurnService` must check hospital status. If the required tasks are complete, it should "cure" patients based on their casualty type and the turn they arrived (e.g., green patients cured in 1 turn).

---

## **Phase 3: Role-Based Views & Advanced Game Rules**

_This phase transforms the single-player prototype into a fully-fledged, multi-user experience. The goal is to refine the experience for different player roles and implement the more complex game rules._

1.  **Session Authentication & Authorization:**

    - [x] Implement a `JoinGameComponent` with a form to submit a room code.
    - [x] The `AuthService` sends the room code to an `/api/game/join` endpoint.
    - [x] The backend validates the room code, checks for an available slot, and generates a session-specific JWT containing the `gameId` and assigned `role`.
    - [x] The frontend stores the session JWT in `localStorage`.
    - [x] Implement an `HttpInterceptor` to automatically attach the JWT to all outgoing API and WebSocket requests.
    - [ ] Implement Angular Route Guards (`SessionAuthGuard`, `RoleGuard`) to protect game routes.
      - [x] Implement SessionAuthGuard and apply to game and lobby routes
      - [ ] Implement RoleGuard

2.  **Role-Specific UI (Conditional Rendering):**

    - [ ] In your components, use `*ngIf` based on the current user's role to show/hide UI elements.
      - `*ngIf="user.role === 'CFACC'"` on the "Approve PPR" button.
      - `*ngIf="user.teamId === currentMob.id"` to prevent players from interacting with other teams' dashboards.
    - [ ] The backend must re-validate every single action against the user's role and team ownership. **Never trust the client.**

3.  **Combat Adjudication with Enhanced UI (Conflict Phase):**

    - [ ] Add logic to the `GameLogicService` and backend to check if `gamePhase === 'CONFLICT'`.
    - [ ] When a fighter is moved onto a hex with an enemy token, open an enhanced `CombatDialogComponent`.
    - [ ] Implement comprehensive combat dialog featuring:
      - [ ] Visual unit representations with detailed statistics
      - [ ] Combat modifier calculations with explanations
      - [ ] Force package options for coordinated attacks
      - [ ] Real-time dice rolling with animation
      - [ ] Detailed result explanation and damage assessment
    - [ ] Add engagement confirmation with tactical overview.
    - [ ] This triggers a `[Combat] Adjudicate Request` action with all combat parameters.
    - [ ] The backend performs the dice rolls, determines the outcome, updates/deletes the database documents for the involved units, and broadcasts the result.
    - [ ] The result should be displayed to all players via enhanced notifications and detailed combat log entries.
    - [ ] Implement post-combat unit status updates and damage visualization on the map.

4.  **Scoring and End-of-Turn Automation:**

    - [ ] Create an `EndTurnService` on the backend.
    - [ ] This service will be triggered by a GM action.
    - [ ] It will iterate through all teams and FOSs to:
      - [ ] Calculate and apply the Logistics Commodities Tax.
      - [ ] Calculate and award Demoralization Points.
      - [ ] Calculate and award Mission Points for sorties and completed assessments.
      - [ ] Implement Resource Point (RP) Logic by checking Task #13 and incrementing RPs.
      - [ ] Implement Risk Token Adjudication logic for any actions flagged with it.
      - [ ] Advance the `gameTurn` counter.
    - [ ] All state changes are broadcast to the relevant game room.

5.  **MFR Logic Implementation:**
    - [ ] Create API endpoints for submitting MFRs.
    - [ ] Create a section in the GM Interface for approving/denying MFRs.

---

## **Phase 4: Polish, Deployment, and Maintenance**

_This phase focuses on finalizing the user experience, recreating rich data displays, and making the application production-ready._

1.  **UI/UX Enhancements - Civilization-Inspired Interface:**

    - [ ] Implement a `GameLogComponent` that displays a running text log of all major events.
    - [ ] Add a notification/toast service (`ngx-toastr`) for immediate feedback on actions.
    - [ ] Add tooltips (using Angular Material Tooltips) to explain complex UI elements.
    - [ ] Refine all CSS for a clean, professional look.
    - [x] Migrate UI Angular Material v20 with Material 3 theming
    - [x] Migrate iconography to MatIcon and update E2E selectors
    - [x] Add dark/light ThemeToggle component and ThemeService
    - [x] Implement Logout button with conditional toolbar display
    - [x] Implement OTP input for room code on Join screen
    - [x] Add notification service using MatSnackBar (NotificationService) for user feedback
    - [ ] Implement Civilization-style main interface layout:
      - [ ] Create responsive grid layout with central map area (75%), side panel (25%), and bottom action bar
      - [ ] Design and implement top toolbar with team badges and phase controls
      - [ ] Create context-sensitive right sidebar for unit details and team resources
      - [ ] Implement bottom panel with status indicators, ATO table, and notification feed
    - [ ] Develop role-specific dashboard overlays:
      - [ ] MOB sliding panel with personnel, equipment, and FOS status
      - [ ] CAOC command dashboard with ATO management and resource allocation
      - [ ] CSpOC operations console with orbital track visualization
      - [ ] MEDCOM dashboard with hospital network status board
    - [ ] Create Civilization-style interactive map components:
      - [ ] Implement map layer toggle controls (political boundaries, threat zones, etc.)
      - [ ] Add hover/click interactions for hexes and assets
      - [ ] Design range and movement overlays with visual pathing
      - [ ] Create context menus for unit-specific actions

2.  **Game Master (GM) Interface:**

    - [ ] Create a special GM dashboard, protected by a `RoleGuard`.
    - [ ] The GM dashboard should allow for:
      - [ ] Manually editing any game state variable (e.g., player points, asset locations).
      - [ ] Triggering Event/Risk cards.
      - [ ] Advancing the game turn.
      - [ ] Creating/starting/ending game sessions.

3.  **Containerization & Deployment:**

    - [ ] Create a `Dockerfile` for the Angular application (multi-stage build for optimization).
    - [ ] Create a `Dockerfile` for the Node.js backend.
    - [ ] Create a `docker-compose.yml` file to orchestrate the frontend, backend, and a PostgreSQL container for local development.
    - [ ] Set up a CI/CD pipeline (e.g., GitHub Actions) to automatically build and test the code on every push.
    - [ ] Deploy the containers to a cloud service (e.g., AWS, Google Cloud, DigitalOcean).

4.  **Testing and Bug Fixing:**
    - [x] Adopt Playwright for end-to-end testing
    - [x] Add Playwright tests for route guards and toolbar
    - [x] Add API E2E test for JWT claims on join
    - [x] Add E2E test for "Start New Game" flow
    - [ ] Conduct thorough end-to-end testing of all game mechanics.
    - [ ] Perform user acceptance testing (UAT) with a group of test players.
    - [ ] Track and resolve bugs found during testing.
