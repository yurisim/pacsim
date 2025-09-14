# CFACC Allocation System - API Endpoints

This document outlines the RESTful API endpoints for the CFACC aircraft allocation system. These endpoints will be organized under the `/api/allocation` route.

---

## 1. Allocation Cycle

### `POST /api/allocation/cycles`

-   **Description**: Creates a new allocation cycle for the current game turn. This is typically an automated, GM-triggered event at the start of a turn.
-   **Request Body**: `{ "gameId": number, "turn": number }`
-   **Response**: The created `AllocationCycle` object.

### `GET /api/allocation/cycles/game/:gameId/latest`

-   **Description**: Retrieves the latest allocation cycle for a given game.
-   **Response**: The latest `AllocationCycle` object.

### `PUT /api/allocation/cycles/:cycleId`

-   **Description**: Updates the status of an allocation cycle (e.g., from `REQUESTS_OPEN` to `ANALYSIS`).
-   **Request Body**: `{ "status": "ANALYSIS" }`
-   **Response**: The updated `AllocationCycle` object.

---

## 2. Aircraft Pool

### `GET /api/allocation/pool`

-   **Description**: Retrieves the pool of unallocated aircraft available for the current turn.
-   **Query Params**: `?gameId=<number>&turn=<number>`
-   **Response**: An array of `AircraftInstance` objects with `allocationStatus: 'AVAILABLE'`.

---

## 3. MOB Aircraft Requests

### `POST /api/allocation/requests`

-   **Description**: Submits a new aircraft request from a MOB.
-   **Authorization**: MOB roles only.
-   **Request Body**: A `CreateAircraftRequestDto` object:
    ```json
    {
      "allocationCycleId": 1,
      "teamId": 2,
      "aircraftType": "C17",
      "quantityRequested": 2,
      "missionJustification": "FOS establishment",
      "priority": 1,
      "rationale": "Critical for establishing a new forward operating site."
    }
    ```
-   **Response**: The created `AircraftRequest` object.

### `GET /api/allocation/requests/cycle/:cycleId`

-   **Description**: Retrieves all aircraft requests for a specific allocation cycle.
-   **Authorization**: CFACC and GM roles.
-   **Response**: An array of `AircraftRequest` objects, including related `Team` data.

### `GET /api/allocation/requests/team/:teamId`

-   **Description**: Retrieves all aircraft requests submitted by a specific team for the current cycle.
-   **Authorization**: Members of the team, CFACC, GM.
-   **Response**: An array of `AircraftRequest` objects.

### `PUT /api/allocation/requests/:requestId`

-   **Description**: Allows a MOB to update their own pending aircraft request.
-   **Authorization**: MOB roles (owner of the request).
-   **Request Body**: An `UpdateAircraftRequestDto` object.
-   **Response**: The updated `AircraftRequest` object.

### `DELETE /api/allocation/requests/:requestId`

-   **Description**: Allows a MOB to withdraw their own pending aircraft request.
-   **Authorization**: MOB roles (owner of the request).
-   **Response**: `{ "success": true }`

---

## 4. CFACC Allocation Workflow

### `PUT /api/allocation/requests/:requestId/review`

-   **Description**: Allows the CFACC to update the status of a request and add notes.
-   **Authorization**: CFACC, GM roles.
-   **Request Body**:
    ```json
    {
      "status": "MODIFIED",
      "quantityAllocated": 1,
      "cfaccNotes": "Only one C-17 available this turn. Re-evaluate needs."
    }
    ```
-   **Response**: The updated `AircraftRequest` object.

### `POST /api/allocation/allocations`

-   **Description**: Creates a new aircraft allocation, linking an aircraft to a request and a team. This is the core action of the CFACC.
-   **Authorization**: CFACC, GM roles.
-   **Request Body**:
    ```json
    {
      "allocationCycleId": 1,
      "aircraftRequestId": 5,
      "aircraftInstanceId": 101,
      "allocatedToTeamId": 2
    }
    ```
-   **Response**: The created `AircraftAllocation` object.

### `DELETE /api/allocation/allocations/:allocationId`

-   **Description**: Deletes an aircraft allocation, returning the aircraft to the unallocated pool.
-   **Authorization**: CFACC, GM roles.
-   **Response**: `{ "success": true }`

### `GET /api/allocation/allocations/cycle/:cycleId`

-   **Description**: Retrieves all aircraft allocations for a specific cycle.
-   **Response**: An array of `AircraftAllocation` objects, including related data.
