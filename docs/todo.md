- [ ] ### **Phase 0: Planning, Architecture, and Project Setup (The Foundation)**

This phase is about making key decisions and preparing your development environment before writing any game-specific code.

- [x] **Step 1: Deep Dive Requirements Analysis**
    - [X] **Deconstruct the Game:** Read the User Guide thoroughly and extract all game entities, rules, and interactions. Create a design document.
        - [X] **Entities:** Teams (CAOC, CSpOC, MOBs, MEDCOM), Aircraft (F-16, F-22, C-17, etc.), Personnel Counters, Equipment Counters, Commodities, FOSs, Satellites, PLA Tokens, Risk Tokens.
        - [X] **State Variables:** Mission Points, Demoralization Points, Turn Number, Game Phase (Crisis/Conflict), Political Access Status, Airfield Status (MOG, Runway Condition), Commodity Levels, Asset Locations (Hex ID or Airfield).
        - [X] **Actions:** Plan flights (ATO), Move assets, Request RFIs, Complete Airfield Tasks, Launch Sorties, Attack PLA forces, Use Risk Tokens, Place Satellites.
        - [X] **Rules:** Movement range, combat adjudication (dice rolls), point calculations, logistics tax, FOS setup prerequisites.

- [ ] **Step 2: Define the Technology Stack**
    - [ ] **Frontend (Angular):**
        - [X] **Angular Version:** Latest stable version (e.g., Angular 16+).
        - [ ] **UI Component Library:** **Angular Material**. This will provide high-quality, pre-built components (buttons, dialogs, tables) to accelerate UI development.
        - [ ] **State Management:** **NgRx**. This is crucial. A game like this has a complex, shared state. NgRx provides a robust, predictable way to manage this state, handle actions, and update the UI reactively.
        - [ ] **Mapping/Hex Grid:** **Leaflet.js** with a hex grid plugin. Leaflet is a powerful, lightweight mapping library perfect for creating the main game board.
        - [ ] **Drag & Drop:** Angular CDK's Drag and Drop module for moving tokens and planning loadouts.
    - [ ] **Backend (The Server):**
        - [ ] **Runtime:** **Node.js** with **Express.js**. This is a common, powerful, and fast combination for building APIs and real-time servers.
        - [ ] **Real-time Communication:** **WebSockets (via Socket.IO)**. This is non-negotiable for a multiplayer game. It allows the server to push updates to all clients instantly (e.g., when one player moves a piece, everyone else sees it move).
        - [ ] **Database:** **MongoDB**. A NoSQL database is ideal for storing flexible game state objects (e.g., a game session document containing all piece locations, player resources, etc.).
    - [ ] **Authentication:** JWT (JSON Web Tokens) for managing user sessions and roles.

- [ ] **Step 3: Project Setup**
    - [ ] 1.  **Initialize Git Repository:** Create a new repository on GitHub/GitLab.
    - [ ] 2.  **Setup Backend:** Create a Node.js/Express project. Install `socket.io`, `mongoose` (for MongoDB), `jsonwebtoken`, and `express`. Define initial API endpoints and WebSocket event listeners.
    - [ ] 3.  **Setup Frontend:** Use the Angular CLI (`ng new operation-pacific-shield`).
    - [ ] 4.  **Install Frontend Dependencies:** `npm install @angular/material @ngrx/store @ngrx/effects leaflet socket.io-client`.
    - [ ] 5.  **Define Project Structure:** Create a clear folder structure in your Angular project:
        - [ ] `/components`: Reusable UI components (e.g., `game-token`, `ato-table`).
        - [ ] `/services`: Logic services (e.g., `game-logic.service`, `api.service`, `websocket.service`).
        - [ ] `/store`: All NgRx files (actions, reducers, effects, selectors).
        - [ ] `/models`: TypeScript interfaces for all game entities (`aircraft.model.ts`, `fos.model.ts`).

---

- [ ] ### **Phase 1: Building the Core Visual Interface (The "Board")**

Focus on creating the static visual elements of the game. At this stage, things don't need to be fully interactive yet.

- [ ] **Step 1: The Main Game Board Component (`GameBoardComponent`)**
    - [ ] Integrate Leaflet.js to render a map.
    - [ ] Use a plugin or custom logic to draw the hex grid overlay. Make each hex identifiable (e.g., by ID `307`, `408`).
    - [ ] Add click listeners to the hexes to log their ID to the console for now.
    - [ ] Visually represent the DF-26 threat ring.

- [ ] **Step 2: Asset and Token Components (`GameTokenComponent`)**
    - [ ] Create a generic component that can display any game piece (aircraft, personnel, etc.).
    - [ ] It should accept an `Input()` object defining its type, image, strength, team color, etc.
    - [ ] Render these tokens on the game board at specific hex coordinates. Start with hardcoded positions.

- [ ] **Step 3: Player Dashboards and Sidebars**
    - [ ] Create components for the different UI sections:
        - [ ] `MobBoardComponent`: Visually replicate the "Main Operating Base" board for holding on-station personnel and commodities.
        - [ ] `FosBoardComponent`: Replicate the "Airfield Board" for a single FOS, showing RFI answers and task completion slots.
        - [ ] `ScoreboardComponent`: Display the Mission Points for each team.
        - [ ] `AtoPlannerComponent`: A simple table to represent the Air Tasking Order.

- [ ] **Step 4: Data Modeling**
    - [ ] Create all the TypeScript interfaces (`.model.ts` files) for your game entities defined in Phase 0. This provides strong typing and code completion.
    - [ ] Create a `GameDataService` to hold static "database" information, like the stats for an F-16 (range, strength) or the pallet position cost of a Fire Truck.

---

- [ ] ### **Phase 2: Implementing Core Game Logic and Automation (The "Rules Engine")**

This is where the game comes to life. You'll wire up the UI to the game's rules and state.

- [ ] **Step 1: Set up NgRx State Management**
    - [ ] Define the structure of your global `AppState`. This will be a single large object holding everything: `turn`, `phase`, `teams`, `assets`, `airfields`, etc.
    - [ ] Create your first set of Actions: `[Game] Load Game`, `[Asset] Move Asset`, `[FOS] Complete Task`.
    - [ ] Create Reducers to handle how the state changes when an action is dispatched. For example, the reducer for `Move Asset` will update the location of that asset in the state tree.
    - [ ] Use Selectors to allow components to subscribe to specific pieces of the state (e.g., a component can select just the list of commodities for Kadena).

- [ ] **Step 2: Implement the Turn Structure**
    - [ ] On the backend, create a "Game Engine" service. This will manage the game loop:
        - [ ] Advance turn number.
        - [ ] Manage phases (Planning -> Execution -> Hotwash).
        - [ ] Trigger timed events.
        - [ ] This engine will be the ultimate source of truth.

- [ ] **Step 3: Automate Rules and Adjudication**
    - [ ] Create several Angular services that contain the game's logic:
        - [ ] `MovementService`: Contains functions like `isValidMove(asset, startHex, endHex)` which checks range, overflight rights, etc.
        - [ ] `CombatService`: Contains a function `adjudicateCombat(attacker, defender)` which performs the dice rolls, applies modifiers, and returns the result.
        - [ ] `ScoringService`: Listens for specific NgRx actions (like `[Fighter] Launch Sortie Success`) and calculates the resulting MP changes.

- [ ] **Step 4: Make It Interactive**
    - [ ] Use the Angular CDK to make your `GameTokenComponent` draggable.
    - [ ] When a token is dropped on a new hex, dispatch an NgRx `[Asset] Move Asset` action with the payload (`assetId`, `targetHexId`).
    - [ ] The action is processed by the reducer, the state updates, and thanks to the reactive nature of NgRx selectors, the token's position updates on the screen for everyone.

---

- [ ] ### **Phase 3: Multiplayer and Role-Based Views (The "Players")**

This phase transforms the single-player prototype into a fully-fledged, multi-user experience.

- [ ] **Step 1: Implement Real-Time Communication**
    - [ ] Create a `WebSocketService` in Angular that connects to your Socket.IO server.
    - [ ] When a player performs an action (e.g., moves a piece), the NgRx Effect for that action sends the action data to the backend via WebSocket.
    - [ ] The backend validates the action, updates its master state in MongoDB, and then **broadcasts** the validated action to *all* connected clients.
    - [ ] The `WebSocketService` in each client's browser listens for these broadcasted actions and dispatches them to their local NgRx store, ensuring all screens are perfectly synchronized.

- [ ] **Step 2: User Authentication and Roles**
    - [ ] Build a simple login page.
    - [ ] Upon login, the backend returns a JWT containing the user's role (e.g., `role: "CFACC"` or `role: "Kadena_MC"`).
    - [ ] Store this JWT in the browser's local storage.

- [ ] **Step 3: Role-Based UI and Data Scoping**
    - [ ] Use **Angular Route Guards** to control access to different pages/views based on the user's role.
    - [ ] Modify your UI components to show/hide elements based on role. For example:
        - [ ] **MOB Commander:** Can only see their own `MobBoardComponent` and plan their own ATO lines.
        - [ ] **CFACC:** Sees a read-only view of all MOB ATOs and has buttons to "Approve PPR." They see the master `MissionDashboardComponent`.
        - [ ] **Game Master (GM):** Has special UI controls to manually change game state, trigger Event Cards, and override rules for adjudication.
    - [ ] The backend API and WebSockets should also enforce these rules. A request from the Kadena player to move an Andersen AFB asset should be rejected by the server.

---

- [ ] ### **Phase 4: Digitizing the Spreadsheet and Advanced Features (The "Polish")**

This phase focuses on recreating the rich data displays from the guide's OPS Execution Spreadsheet and improving usability.

- [ ] **Step 1: Build Interactive Data Tables**
    - [ ] Recreate the tables from the User Guide (pp. 51-72) using the Angular Material Table component.
        - [ ] `MissionDashboardComponent`: This will be the main view for the CFACC. It will contain child components for Political Assessment, Aircraft Apportionment, Airfield Capacity, etc. All data is fed directly from the NgRx store.
        - [ ] `TeamTabComponent`: A view for MOB commanders that consolidates their FOS status, commodities, and fighters assigned.
        - [ ] **Dynamic Updating:** These tables should update in real-time as the game state changes, without needing a page refresh.

- [ ] **Step 2: Implement Load Planning**
    - [ ] Create a `LoadPlannerComponent` that opens in a dialog window.
    - [ ] It should show an aircraft's capacity (personnel/pallets) and allow the user to add/remove assets.
    - [ ] The UI should provide immediate feedback if the user exceeds the aircraft's capacity.

- [ ] **Step 3: Game Persistence and Sessions**
    - [ ] The backend should save the entire game state to MongoDB at the end of each turn.
    - [ ] Implement a "game lobby" where a GM can start a new game or resume a previously saved one.

- [ ] **Step 4: User Experience Enhancements**
    - [ ] **Notifications:** Use a "toaster" notification service (like `ngx-toastr`) to provide feedback on actions ("Flight plan for AW01 approved.").
    - [ ] **Game Log:** Create a component that displays a running history of all major actions taken in the game.
    - [ ] **Tooltips and Help:** Add tooltips to explain complex UI elements or game rules directly on the interface.

---

- [ ] ### **Phase 5: Deployment and Maintenance**

- [ ] **Step 1: Containerization**
    - [ ] Use **Docker** to create containers for your Angular frontend, your Node.js backend, and your MongoDB database. This makes deployment consistent and reliable.

- [ ] **Step 2: Cloud Deployment**
    - [ ] Deploy your containers to a cloud provider like AWS (using ECS/ECR), Google Cloud (Cloud Run), or DigitalOcean.

- [ ] **Step 3: Continuous Integration/Continuous Deployment (CI/CD)**
    - [ ] Set up a pipeline using GitHub Actions or Jenkins to automatically test and deploy new versions of the application when you push changes to your Git repository.

By following this detailed, phased plan, you can systematically tackle the complexity of digitizing Operation Pacific Shield, resulting in a robust, interactive, and engaging web-based simulation.
