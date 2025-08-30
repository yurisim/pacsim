# **Project Roadmap: Digital Operation Pacific Shield**

## **Phase 0: Foundation & Architecture (Sprint 0)**

_This phase is about making key decisions, establishing the technical groundwork, defining data structures, and preparing the development environment before writing any game-specific code._

1.  **Project Initialization & Version Control:**

    - [X] Initialize a monorepo using Git to house both the frontend and backend projects.
    - [X] Establish main, develop, and feature branching strategies.
    - [X] Configure repository on GitHub/GitLab.

2.  **Backend Setup (Node.js/NestJS/Prisma/MongoDB):**

    - [X] Initialize a Node.js project (`npm init`).
    - [X] Install core dependencies: NestJS, Prisma, Socket.IO, JWT, Swagger
    - [X] **Define the Prisma Schema (`schema.prisma`):**
      - [X] Implement all models from the design document (`Game`, `Team`, `AircraftInstance`, `FOS`, `ATOLine`, etc.).
      - [X] Add `roomCode` field to the `Game` model.
      - [X] Refine the `Player` model to represent a session-based identity.
      - [X] Add dedicated models for `SatelliteInstance`, `Hospital`, and `Patient` to support CSpOC and MEDCOM gameplay.
      - [x] Define all required `enum` types (e.g., `GamePhase`, `RunwayStatus`, `SatelliteType`, `HospitalTask`).
      - [x] Establish all relationships between models (e.g., `Game` to `Team`, `Team` to `AircraftInstance`).
    - [x] **Create Database Service:**
      - [x] Implement a service to connect to the MongoDB database.
      - [x] Generate the Prisma Client.
    - [ ] **API Scaffolding:**
      - [X] Create placeholder REST API endpoints for key actions (`/api/game`, `/api/auth`).
      - [ ] Create a `/api/game/create` endpoint for GMs to create a new game session and generate a `roomCode`.
      - [ ] Create a `/api/game/join` endpoint for players to join a game using a `roomCode`.
      - [ ] Set up basic routing structure.
    - [ ] **WebSocket Server Setup:**
      - [ ] Integrate Socket.IO with the NestJS server using a Gateway.
      - [ ] Define initial WebSocket namespaces (e.g., `/game`).
      - [ ] Create placeholder listeners for core game events (`connection`, `disconnect`, `action`).

3.  **Frontend Setup (Angular/NgRx/Angular Material):**

    - [ ] Initialize a new Angular project using the CLI (`ng new`).
    - [ ] Install core dependencies: `@angular/material`, `@ngrx/store`, `@ngrx/effects`, `@ngrx/store-devtools`, `leaflet`.
    - [ ] Install `socket.io-client` for WebSocket communication.
    - [ ] **Establish Project Structure:**
      - [ ] Create folders for `/core`, `/features`, `/shared`.
      - [ ] Inside `/shared`, create subfolders for `/components`, `/models`, `/services`.
    - [ ] **Define TypeScript Models:**
      - [ ] Create a TypeScript interface/class for every entity in the Prisma schema (`game.model.ts`, `team.model.ts`, etc.). This ensures type safety between frontend and backend.
    - [ ] **Set up NgRx Store:**
      - [ ] Define the root `AppState` interface.
      - [ ] Create an initial `game` feature slice with placeholder actions, reducers, and selectors.
    - [ ] **Create Core Services:**
      - [ ] `ApiService`: For handling all HTTP requests to the backend.
      - [ ] `WebSocketService`: For managing the Socket.IO connection and dispatching received events as NgRx actions.
        - [ ] Implement robust reconnection logic (e.g., exponential backoff) to handle unstable network conditions.
      - [ ] `AuthService`: For handling game joining via room code and managing the session JWT.

4.  **Initial UI Scaffolding:**
    - [ ] Set up Angular routing for a `/join` page (for entering a room code) and a `/game/:id` page.
    - [ ] Implement a basic `AppComponent` with a toolbar and a router outlet.
    - [ ] Create placeholder components for the main game views: `GameBoardComponent`, `MobDashboardComponent`, `CaocDashboardComponent`.

---

## **Phase 1: Visualizing the Game State (Read-Only)**

_Focus on creating the static visual elements of the game. At this stage, things don't need to be fully interactive yet. The goal is to render the entire game board and all its pieces based on data from the backend._

1.  **Game Board Rendering:**

    - [ ] **Implement `GameBoardComponent`:**
      - [ ] Integrate Leaflet.js to display a static map image.
      - [ ] Implement or integrate a hex grid overlay library. Each hex must be programmatically identifiable (e.g., `data-hex-id="407"`).
      - [ ] Write a function to render the DF-26 threat ring and country borders.
    - [ ] **Create a `GameTokenComponent`:**
      - [ ] A generic component that takes an `asset` object as input.
      - [ ] Uses `ngSwitch` to render the correct image, text (strength), and team color based on the asset's type.
    - [ ] **Integrate Backend Data:**
      - [ ] Create a `[Game] Load Game` NgRx effect that fetches the full game state from the backend API when a player loads the game page.
      - [ ] Create NgRx selectors to get all aircraft, ground units, and threat tokens from the state.
      - [ ] In `GameBoardComponent`, subscribe to these selectors and use `ngFor` to render a `GameTokenComponent` for each asset at its correct hex/airfield location.

2.  **Dashboard and Side Panel Rendering:**
    - [ ] **Implement `MobDashboardComponent`:**
      - [ ] Create static UI layouts for the MOB board (On-Station Personnel, Commodities, etc.).
      - [ ] Use NgRx selectors to get the specific MOB's inventory.
      - [ ] Use `ngFor` and the `GameTokenComponent` to display all assets currently located at the MOB.
    - [ ] **Implement `FosDashboardComponent`:**
      - [ ] Create a UI that visually represents the FOS board (RFI answers, 16 task slots).
      - [ ] Use selectors to get the state of a specific FOS.
      - [ ] Use CSS classes (`.task-complete`, `.task-incomplete`) to style the task slots based on the FOS's `Completed_Tasks` array.
    - [ ] **Implement `ScoreboardComponent`:**
      - [ ] A simple component that subscribes to team-specific `missionPoints` and `demoralizationPoints` from the NgRx store and displays them.
    - [ ] **Implement `CSpOCBoardComponent`:**
      - [ ] Create a UI to render the orbital tracks (LEO, MEO, GEO).
      - [ ] Subscribe to `satelliteInstances` from the NgRx store and render `GameTokenComponent`s for each satellite on its correct orbit/position.
    - [ ] **Implement `MedcomDashboardComponent`:**
      - [ ] Create a UI to display the status of the four main hospitals.
      - [ ] Implement a `HospitalStatusComponent` to show bed space, completed tasks, and patient counts for a single hospital.

---

## **Phase 2: Core Gameplay Mechanics & Interaction**

_This is where the game comes to life. The goal is to enable players to perform the most common actions and see the state update in real-time._

1.  **Asset Movement:**

    - [ ] Integrate the Angular CDK Drag and Drop module into `GameTokenComponent`.
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

2.  **Air Tasking Order (ATO) Implementation:**

    - [ ] Create an interactive `AtoTableComponent` using Angular Material Table.
    - [ ] The table's data source should be an NgRx selector for the game's `atoLines`.
    - [ ] **For MOB Players:**
      - [ ] Add a "New Flight Plan" button that opens a dialog (`FlightPlannerDialogComponent`).
      - [ ] The dialog should contain forms (dropdowns, inputs) to select aircraft, start/end locations, and intent.
      - [ ] On submit, dispatch a `[ATO] Create Line Request` action, which is sent to the backend.
    - [ ] **For CAOC Players:**
      - [ ] The table should display "Approve PPR" / "Deny PPR" buttons for each pending ATO line.
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
      - [ ] Backend logic should determine what is visible based on satellite type, orbit (single hex vs. honeycomb), and fidelity (one-pass vs. two-pass identification).
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

    - [ ] Implement a `JoinGameComponent` with a form to submit a room code.
    - [ ] The `AuthService` sends the room code to an `/api/game/join` endpoint.
    - [ ] The backend validates the room code, checks for an available slot, and generates a session-specific JWT containing the `gameId` and assigned `role`.
    - [ ] The frontend stores the session JWT in `localStorage`.
    - [ ] Implement an `HttpInterceptor` to automatically attach the JWT to all outgoing API and WebSocket requests.
    - [ ] Implement Angular Route Guards (`SessionAuthGuard`, `RoleGuard`) to protect game routes.

2.  **Role-Specific UI (Conditional Rendering):**

    - [ ] In your components, use `*ngIf` based on the current user's role to show/hide UI elements.
      - `*ngIf="user.role === 'CFACC'"` on the "Approve PPR" button.
      - `*ngIf="user.teamId === currentMob.id"` to prevent players from interacting with other teams' dashboards.
    - [ ] The backend must re-validate every single action against the user's role and team ownership. **Never trust the client.**

3.  **Combat Adjudication (Conflict Phase):**

    - [ ] Add logic to the `GameLogicService` and backend to check if `gamePhase === 'CONFLICT'`.
    - [ ] When a fighter is moved onto a hex with an enemy token, open a `CombatDialogComponent`.
    - [ ] The dialog shows the attacker and defender. The player clicks "Engage."
    - [ ] This triggers a `[Combat] Adjudicate Request` action.
    - [ ] The backend performs the dice rolls, determines the outcome, updates/deletes the database documents for the involved units, and broadcasts the result.
    - [ ] The result should be displayed to all players via a notification/toast and a log entry.

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

1.  **UI/UX Enhancements:**

    - [ ] Implement a `GameLogComponent` that displays a running text log of all major events.
    - [ ] Add a notification/toast service (`ngx-toastr`) for immediate feedback on actions.
    - [ ] Add tooltips (using Angular Material Tooltips) to explain complex UI elements.
    - [ ] Refine all CSS for a clean, professional look.

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
    - [ ] Conduct thorough end-to-end testing of all game mechanics.
    - [ ] Perform user acceptance testing (UAT) with a group of test players.
    - [ ] Track and resolve bugs found during testing.
