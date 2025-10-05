# CFACC Allocation System - Implementation Roadmap

This document provides a step-by-step implementation roadmap for the CFACC aircraft allocation system. The work is broken down into remaining sprints.

---

## ✅ Sprint 1: Backend Foundation - COMPLETE

All backend infrastructure has been implemented:
- ✅ Database models: `AllocationCycle`, `AircraftRequest`, `AircraftAllocation`, `AircraftPool`
- ✅ Enums: `AllocationCycleStatus`, `AllocationRequestStatus`, `AircraftAllocationStatus`
- ✅ Allocation module with controller and service
- ✅ All API endpoints with role-based access control
- ✅ Notification service with WebSocket integration
- ✅ Aircraft pool service with statistics and refresh logic
- ✅ Unit tests for core services

---

## Sprint 2: Frontend MOB Workflow

**Goal**: Develop the UI for MOBs to request aircraft.

**Completed:**
- ✅ NgRx state, actions, reducers, selectors, and effects
- ✅ WebSocket service for real-time updates
- ✅ Notification components (badge, center, toast)

**Remaining:**

1.  **Create `AircraftRequestDialogComponent`**:
    -   Build the Angular component for the request submission form.
    -   Implement the form with validation as designed.
    -   Dispatch a `[Allocation] CreateRequest` action on submit.

2.  **Integrate MOB Dashboard**:
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
    -   ✅ WebSocket events already implemented in `game.gateway.ts`
    -   ✅ Frontend already handles real-time updates via `AllocationWebSocketService`
    -   Verify all events are properly propagated to UI components

3.  **End-to-End Testing**:
    -   Create Playwright E2E tests for the full workflow:
        1.  MOB submits a request.
        2.  CFACC sees the request on the dashboard.
        3.  CFACC allocates an aircraft.
        4.  MOB sees the allocated aircraft and can create a flight plan.

4.  **Final Review and Bug Fixing**:
    -   Conduct a final review of the feature with stakeholders.
    -   Address any bugs or UI/UX issues.
