# **Project Roadmap: Digital Operation Pacific Shield**

**Objective:** To create a real-time, multi-user, web-based version of the "Operation Pacific Shield" wargame, replicating the data-rich dashboards and complex game logic defined in the user guide and Excel prototype. The new platform will be built on Angular with an NgRx state management backend and real-time communication via WebSockets.

---

## **Phase 1: UI/UX Foundation & Core Dashboard Replication**

**Goal:** Build the main application shell and recreate the key static information displays from the Excel `Mission Dashboard` and `Team` tabs. This phase focuses on rendering the game state, not yet interacting with it.

1.  **Implement Civilization-Style Main Layout:**

    - [ ] Display `Block`, `Day`, `Turn`, `Game Phase` (Crisis/Conflict), and `Victory Condition` progress. This directly replicates the top section of the `Mission Dashboard`.
    - [ ] **`HexGridMapComponent`:** Render the main game board from Appendix A. It should be pannable and zoomable.

2.  **Recreate Core Dashboard Widgets (from `Mission Dashboard` Excel Sheet):**

    - [ ] **`BaseAccessWidgetComponent`:**
      - [ ] Display country flags with their current access level ("Full Access," "Overflight," "No Access") and the underlying dice roll value.
      - [ ] Use dynamic CSS to apply green, yellow, and red color-coding.
    - [ ] **`AircraftApportionmentWidgetComponent`:**
      - [ ] Display the current number of apportioned C-17, C-130, and C-5 aircraft with their icons and call signs (MOOSE, ARROW, BOSCO).
    - [ ] **`AirfieldCapacityStatusWidgetComponent` (CFACC View):**
      - [ ] Create a master table that consolidates FOS data from all teams, mirroring the "Airfield Capacity & Capability" Excel table.
      - [ ] Display columns for `FOS #`, `Turn Est`, `Capability`, `Assessed`, `Improv`, `Ramp Size (MOG)`, `Ramp Status %`, `Comms Status`, `Consecutive Strikes`, and `Runway Status`.
      - [ ] Implement logic to hide or show "Unknown" based on game rules for communication denial (Data-Sharing Denied).
    - [ ] **`VictoryProgressWidgetComponent`:**
      - [ ] Implement two charts:
        1.  A progress bar for the overall "Victory Condition Progress."
        2.  A bar chart for "Mission Points by Team."

3.  **Implement Generic `GameTokenComponent`:**

    - [ ] A single component capable of rendering all game pieces (aircraft, personnel, equipment, commodities, PLA threats) based on an input object.
    - [ ] Use NATO-standard military symbology where applicable.
    - [ ] Display key information like strength value (for combat units).
    - [ ] Implement drag-and-drop functionality using Angular CDK.

4.  **Data Integration (Read-Only):**
    - [ ] Create NgRx state slices for all major game entities: `teams`, `airfields`, `assets`, `gameTurn`, etc.
    - [ ] Create an NgRx effect (`[Game] Load Game`) to fetch the entire game state from the backend API.
    - [ ] Connect all widgets and components created in this phase to the NgRx store using selectors to display the fetched data.

---

## **Phase 2: Core Gameplay Mechanics & Player Interaction**

**Goal:** Enable players to perform the most common actions defined in the user guide. The focus is on implementing the core game loop of planning and execution, with real-time state updates across all clients.

1.  **Air Tasking Order (ATO) Implementation:**

    - [ ] **`MobAtoComponent` (Team Tab View):**
      - [ ] Replicate the team-specific ATO table from the Excel sheet.
      - [ ] Rows should populate when the CFACC allocates an aircraft.
      - [ ] Implement dropdowns for all user-editable fields: `Start Location` (Airfield/Hex), `En Route Destination`, `Final Destination`, `Intention`, `Alternate Location`, `Risk`, and `Configuration`.
    - [ ] **`CaocMasterAtoComponent` (Mission Dashboard View):**
      - [ ] Display a consolidated, read-only view of all flight plans from all teams.
      - [ ] Add "Approve PPR" / "Deny PPR" buttons for the CFACC player.
    - [ ] **`StationWorkloadComponent`:**
      - [ ] Recreate the "Station Workload" table to track MOG and PPR limits for all airfields.
      - [ ] Use dynamic CSS to flag overages in red, as seen in the Excel sheet.
    - [ ] **NgRx/WebSocket Logic:** Dispatch actions for creating/updating flight plans, which are sent to the backend, validated, and broadcast to all clients to update the UI in real-time.

2.  **FOS Management (Team Tab Interaction):**

    - [ ] **`FosRfiComponent`:**
      - [ ] Create the UI from the "Airfield RFI" Excel tab.
      - [ ] Allow players to click to "ask" an RFI. This sends a request to the backend.
      - [ ] Backend simulates the dice roll, updates the FOS state, and broadcasts the result, which updates the UI for all players.
    - [ ] **`FosTaskBoardComponent`:**
      - [ ] Replicate the "Forward Operating Site Task Completed" boards.
      - [ ] Allow players to drag-and-drop personnel/equipment tokens onto task slots to signify assignment.
      - [ ] Implement a "Complete Task" action that validates the required resources are present and updates the task's status.

3.  **Logistics & Load Planning:**

    - [ ] **`LoadPlannerDialogComponent`:**
      - [ ] Create a modal/dialog that replicates the "REACH 01" load planner.
      - [ ] The dialog should show the selected aircraft's pallet and personnel capacity based on its ATO configuration.
      - [ ] Allow players to input quantities for personnel and equipment.
      - [ ] Validate that the load does not exceed capacity.
    - [ ] **`UstranscomRequestComponent`:**
      - [ ] Create the interface for MOBs to request resources from USTRANSCOM, mirroring the "AEW Requests" sheet.

4.  **CSpOC & MEDCOM Dashboards:**

    - [ ] **`CSpocDashboardComponent`:**
      - [ ] Build the dedicated UI for the CSpOC player, including orbital track visualization.
      - [ ] Implement the "Satellite Look" action.
      - [ ] Display intelligence results and allow for offensive actions (e.g., attacking enemy satellites).
    - [ ] **`MedcomDashboardComponent`:**
      - [ ] Replicate the MEDCOM Excel tab, showing hospital bed space and task completion status.
      - [ ] Implement logic for MEDEVAC flights, allowing MEDCOM players to assign patients to aircraft via the ATO.
      - [ ] Automate patient status updates at the end of each turn based on completed hospital tasks.

5.  **Allocation Notifications MVP**

    - [ ] Badge, Toast, Notification Center
    - [ ] NgRx slice and WebSocket handling
    - [ ] Unread count, priority visuals, basic ARIA

6.  **Scoring Scaffolding**

    - [ ] Add Award API and service method (backend) to increment Mission Points with an audited reason (e.g., RFI_COMPLETED, CRISIS_SORTIE, CONFLICT_KILL_TIER10/7/5)
    - [ ] Emit “award” events into a Game Log stream (temporary in-memory/audit entry)
    - [ ] Wire NgRx/WS to reflect updated Mission Points on the Scoreboard

7.  **UI/UX Update**
    - [ ] Game Stats minimized header: remove MP/DP/RP summary; leave reserved placeholder for future TODO list

---

## **Phase 3: Advanced Rules, Automation & Role Enforcement**

**Goal:** Implement the complex game logic, automate end-of-turn calculations, and enforce role-based permissions to create a complete, multi-user experience.

1.  **Multiplayer & Role-Based Views:**

    - [ ] **Implement Authentication & Authorization:** Use Route Guards to ensure only logged-in users can access games and that their role (`CFACC`, `MOB`, `CSpOC`, `GM`, etc.) is enforced.
    - [ ] **Conditional UI Rendering:** Use `*ngIf` extensively to show/hide UI elements based on user role (e.g., only CFACC sees "Approve PPR," only the correct MOB can edit their ATO).
    - [ ] **Backend Validation:** Ensure every action sent to the server is re-validated against the user's role and team ownership. **Never trust the client.**

2.  **Combat Adjudication (Conflict Phase):**

    - [ ] **`CombatDialogComponent`:** When a friendly fighter attacks a PLA token, open a dialog showing both units, their strengths, and any roll modifiers (from GPS, jamming, etc.).
    - [ ] **Backend Dice Rolls:** The backend must handle the dice rolls according to the rules (e.g., F-22 rolls d20, PLA 4th-gen fighter rolls d12).
    - [ ] **State Updates:** The backend updates the database (removing the defeated token) and broadcasts the combat result to all players with a visual notification.
    - [ ] **PLA Airfield Strikes:** Implement the logic from the "Airfield Attack" tab. At the start of a turn, the backend will simulate PLA strikes, calculate damage to runways and ramps, and update the `AirfieldCapacityStatusWidget`.

3.  **End-of-Turn Automation (Backend `EndTurnService`):**

    - [ ] **Trigger:** Create a GM-controlled action to advance the game turn.
    - [ ] **Calculations:** The service will automatically:
      - Apply the **Logistics Commodities Tax** to all occupied airfields.
      - Calculate and apply **Demoralization Points (DP)** for inadequate food/water or beddown.
      - Award **Mission Points (MP)** for successful fighter sorties and completed airfield assessments.
      - Award **Resource Points (RP)** for Host Nation Relationship tasks.
      - Process **USTRANSCOM resupply** missions and **sealift** commodity deliveries.
      - Advance all LEO/MEO satellites in their orbits for the CSpOC.

4.  **Turn Management:**

    - [ ] Implement a "Ready" or "End Turn" button for each MOB Commander.
    - [ ] The GM dashboard should show which teams are ready.
    - [ ] The GM has the final authority to advance the turn once all teams are ready or time expires.

5.  **Notifications Enforcement & End Phase Integration**

    - [ ] Action-required acknowledgment enforcement
    - [ ] Audit surfaces for notification delivery/ack status
    - [ ] Role/room scoping validation
    - [ ] End Phase modal “Outstanding Actions” integration via NgRx selectors

6.  **Scoring Rules Implementation**

    - [ ] RFIs Completion: +5 MP per FOS upon completing all 10 RFIs (initial + follow-up). Idempotent award (per FOS per cycle) with audited entry
    - [ ] Crisis Sorties: +5 MP per fighter sortie launched from a FOS into an activated operational hex with required fuel and munitions present at launch (munitions not expended in Crisis). Validate origin ≠ MOB. Idempotent per sortie per turn
    - [ ] Conflict Kills: Tiered MPs for destroying PLA targets (20→+10, 12→+7, 10→+5). Munitions expended in Conflict on successful attack
    - [ ] Idempotency & Audit: Unique award keys for de-duplication; persistent audit entries per award
    - [ ] Game Log integration: Emit domain-normalized “award” entries for UI logs

7.  **EndTurnService Scoring Hooks**
    - [ ] Centralize and/or finalize scoring application at end-of-turn where appropriate; ensure real-time updates broadcast upon calculation completion

---

## **Phase 4: Polish, Deployment & Game Master Tools**

**Goal:** Refine the user experience to match the data density and clarity of the Excel prototype, create powerful GM tools, and deploy the application for production use.

1.  **UI/UX Polish & Refinement:**

    - [ ] **`GameLogComponent`:** Persistent, cross-domain action log (global history), separate from the bottom-panel Event Log (ephemeral feed). Consumes the normalized, shared notification schema and other domain events. Provides filtering and export capabilities.
    - [ ] **Notifications & Tooltips:** Toast polish, tooltips, theme tokens, motion. Implement a toast notification system for immediate feedback on actions. Add tooltips to all icons and complex data points to explain game rules. Ensure theme tokens and motion guidelines are applied consistently.
    - [ ] **Visualizations:** Add visual effects for combat, asset movement paths, and status changes (e.g., a damaged runway icon).
    - [ ] **Final Styling:** Ensure the entire application has a consistent, professional, and military-simulation aesthetic.

2.  **Comprehensive Game Master (GM) Dashboard:**

    - [ ] **Full State Control:** Allow the GM to view and manually edit any part of the game state (e.g., change a country's base access, add/remove commodities, move any unit).
    - [ ] **Event Management:** Create an interface for the GM to trigger Event and Risk cards as described in the PDF.
    - [ ] **Game Lifecycle Management:** Tools to create new games, load saved games, manage player assignments, and end sessions.
    - [ ] **Rule Adjudication:** Provide tools to resolve MFRs (Memorandums for Record) and handle edge cases that arise during gameplay.

3.  **Containerization & Deployment:**

    - [ ] **Create `Dockerfile`s:** One for the Angular front-end and one for the Node.js back-end.
    - [ ] **Create `docker-compose.yml`:** Orchestrate the front-end, back-end, and database containers for easy local development.
    - [ ] **Set up CI/CD Pipeline:** Use GitHub Actions or similar to automate testing and building of containers on every code push.
    - [ ] **Deploy to Production:** Deploy the application to a cloud provider (e.g., AWS, DigitalOcean) for live use.

4.  **Testing & User Acceptance:**

    - [ ] Conduct thorough end-to-end testing of all gameplay loops and role interactions.
    - [ ] Run a full-scale User Acceptance Test (UAT) with a group of Officer Trainees to gather feedback and identify bugs.
    - [ ] Iterate on feedback to ensure the digital version is an effective and engaging training tool.

5.  **Notifications & Logs Finalization**

    - [ ] Shared notification schema adopted by CSpOC/MEDCOM/GM
    - [ ] Persistent Game Log with filters/export, ingesting normalized events from all domains

6.  **Scoring & Logs Validation**
    - [ ] Cross-verify award entries in persistent Game Log with UI totals
    - [ ] UAT checklist for RFIs/Crisis/Conflict scoring scenarios
    - [ ] Exportable award audit (CSV/JSON) for after-action review
