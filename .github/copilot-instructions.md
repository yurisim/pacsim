# PacSim Workspace Instructions

This document provides essential guidance for AI coding agents working within the PacSim monorepo.

## 1. High-Level Architecture

This is an [Nx](https://nx.dev) monorepo containing a full-stack wargaming simulation application.

-   `apps/pac-shield`: The Angular frontend application.
-   `apps/pac-shield-api`: The NestJS backend API.
-   `apps/pac-shield-e2e` & `apps/pac-shield-api-e2e`: Playwright and Jest E2E test suites.

The core of the application is a complex simulation game. The entire data model is defined in the Prisma schema, which is the best place to understand the game's rules and entities.

-   **Key File:** `apps/pac-shield-api/src/prisma/schema.prisma`

## 2. Backend (NestJS & Prisma)

The backend drives the game logic and data persistence.

### Prisma ORM

-   **Schema is King:** The single source of truth for the database is `apps/pac-shield-api/src/prisma/schema.prisma`. Before implementing any feature that touches data, review this file to understand the existing models.
-   **Database Migrations:** After changing the `schema.prisma` file, you must generate and apply migrations. Use the provided Nx targets to do this.
    -   `npx nx prisma-generate pac-shield-api` - To generate the Prisma client after schema changes.
    -   `npx nx prisma-db-push pac-shield-api` - To push schema changes to the dev database.
-   **Database:** The application uses a PostgreSQL database.

## 3. Frontend (Angular)

The frontend is the user interface for the game simulation.

### Real-time Communication

The frontend and backend use WebSockets for real-time game events.

-   **Backend Gateway:** `apps/pac-shield-api/src/app/events.gateway.ts` manages WebSocket connections. It uses `socket.io` rooms, with each game instance being a separate room identified by `gameId`.
-   **Frontend Service:** `apps/pac-shield/src/app/shared/services/websocket.service.ts` is the Angular service that connects to the gateway.
-   **Event Pattern:**
    1.  The frontend joins a room using the `joinGame` event.
    2.  To send an update, the frontend emits a generic `gameEvent` with a `gameId`, `eventName`, and a `data` payload.
    3.  The backend broadcasts this `gameEvent` to all other clients in the same `gameId` room.
    4.  Frontend components subscribe to specific `eventName`s through the `WebSocketService`'s `listen()` method.

## 4. Developer Workflows

### Running the Application

To run the full application for development, you need to start both the frontend and the backend API. The `serve` command for the frontend is configured to automatically start the backend.

```bash
# This starts the Angular dev server and the NestJS backend
npx nx serve pac-shield
```

### Testing

The project has multiple levels of tests. Use the appropriate one for your changes.

-   **Unit Tests:** Run tests for a specific project.
    ```bash
    npx nx test pac-shield
    npx nx test pac-shield-api
    ```
-   **E2E Tests:** Run end-to-end tests for the applications. The backend API must be running.
    ```bash
    # In one terminal, start the API
    npx nx serve pac-shield-api

    # In another terminal, run the tests
    npx nx e2e pac-shield-e2e
    npx nx e2e pac-shield-api-e2e
    ```

### Code Generation

This is an Nx workspace. Use Nx generators to create new components, services, libraries, etc., to ensure they are scaffolded correctly.

```bash
# Example: Generate an Angular component
npx nx g @nx/angular:component my-component --project=pac-shield
```
