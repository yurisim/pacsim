# CFACC Allocation System - Implementation Roadmap

This document provides a step-by-step implementation roadmap for the CFACC aircraft allocation system. The work is broken down into four sprints.

---

## Sprint 1: Backend Foundation

**Goal**: Implement the database schema and core backend services.

1.  **Database Migration**:
    -   Add the new models (`AllocationCycle`, `AircraftRequest`, `AircraftAllocation`) and enums to `schema.prisma`.
    -   Run `npx prisma migrate dev` to apply the changes to the database.

2.  **Generate DTOs**:
    -   Run `npx prisma generate` to create the new DTOs and update the Prisma client.

3.  **Create Allocation Module**:
    -   Create a new `allocation` module in `apps/pac-shield-api/src/app/`.
    -   Create `allocation.controller.ts`, `allocation.service.ts`, and `allocation.module.ts`.

4.  **Implement API Endpoints**:
    -   Implement all the endpoints defined in `docs/cfr_api.md`.
    -   Focus on the business logic in the `AllocationService`, including validation and role-based access control.

5.  **Unit Tests**:
    -   Write unit tests for the `AllocationService` to ensure the business logic is correct.

---

## Sprint 2: Frontend MOB Workflow

**Goal**: Develop the UI for MOBs to request aircraft.

1.  **Create NgRx State**:
    -   Create a new `allocation` store feature with the state, actions, reducers, and selectors defined in `docs/cfr_ui_ux.md`.
    -   Add `allocation.effects.ts` to handle the API calls.

2.  **Create `AircraftRequestDialogComponent`**:
    -   Build the Angular component for the request submission form.
    -   Implement the form with validation as designed.
    -   Dispatch a `[Allocation] CreateRequest` action on submit.

3.  **Integrate MOB Dashboard**:
    -   Add a new "Requests" tab to the MOB's view.
    -   Display a list of their submitted `AircraftRequest` items and their status.
    -   Add the "Request Aircraft" button to open the dialog.

---

## Sprint 3: Frontend CFACC Workflow

**Goal**: Build the CFACC's allocation dashboard.

1.  **Create `CfaccAllocationDashboardComponent`**:
    -   Develop the main component for the CFACC dashboard.
    -   Implement the three-panel layout as designed.

2.  **Implement Request Review Panel**:
    -   Create a table to display all incoming aircraft requests.
    -   Use NgRx selectors to get the data from the store.

3.  **Implement Aircraft Pool Panel**:
    -   Display the list of unallocated aircraft.

4.  **Implement Drag-and-Drop Allocation**:
    -   Use the Angular CDK's `DragDropModule` to enable drag-and-drop from the pool to the requests.
    -   On drop, dispatch a `[Allocation] CreateAllocation` action.

5.  **Develop Decision Support Panel**:
    -   Display the relevant strategic information for the CFACC.

---

## Sprint 4: Integration and Testing

**Goal**: Finalize integration, perform end-to-end testing, and ensure the system is game-ready.

1.  **Integrate with Game Loop**:
    -   Ensure the `AllocationCycle` is created at the start of each turn.
    -   Lock the flight planner (`FlightPlannerDialogComponent`) to only use allocated aircraft.

2.  **WebSocket Integration**:
    -   Add WebSocket events to the `game.gateway.ts` to provide real-time updates for all allocation actions (new requests, allocations, status changes).
    -   Handle these events on the frontend to update the NgRx store.

3.  **End-to-End Testing**:
    -   Create Playwright E2E tests for the full workflow:
        1.  MOB submits a request.
        2.  CFACC sees the request on the dashboard.
        3.  CFACC allocates an aircraft.
        4.  MOB sees the allocated aircraft and can create a flight plan.

4.  **Final Review and Bug Fixing**:
    -   Conduct a final review of the feature with stakeholders.
    -   Address any bugs or UI/UX issues.
