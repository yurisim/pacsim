# Operation Pacific Shield (OPS)

This repository contains the digital implementation of the "Operation Pacific Shield" (OPS) wargame, a culminating capstone exercise for the Officer Training School (OTS). The application provides an experiential learning environment for Officer Trainees (OTs) to plan, brief, and execute a joint scheme of maneuver in a high-intensity, contested, and operationally limited environment.

The primary goal is to employ Agile Combat Employment (ACE) concepts in a fictional conflict. Players manage resources, establish Forward Operating Sites (FOS), and coordinate between different command teams to achieve mission objectives and accumulate Mission Points (MP).

## Core Application Features

- **Multi-Team Gameplay:** Supports distinct teams, including a Combined Air Operations Center (CAOC), a Combined Space Operations Center (CSpOC), and multiple Main Operating Bases (MOBs), each with unique roles and responsibilities.
- **Real-time Game State:** Utilizes WebSockets to ensure all players have a live, synchronized view of the game board, assets, and events.
- **Persistent Game Sessions:** Game states are saved to a database, allowing for sessions to be paused and resumed.
- **Complex Rule Enforcement:** The system is designed to programmatically enforce the game's complex rules for movement, combat, logistics, and scoring.
- **Dynamic Scenarios:** Simulates the fog and friction of war through event cards, political shifts, and resource constraints.

## Technical Overview

This project is a monorepo managed by [Nx](https://nx.dev).

- **Frontend (`pac-shield`):** An [Angular](https://angular.io/) application providing the main user interface, game board visualization, and player controls.
- **Backend (`pac-shield-api`):** A [NestJS](https://nestjs.com/) application that manages game logic, API endpoints, and WebSocket communication.
- **Database:** A PostgreSQL database managed with [Prisma](https://www.prisma.io/) as the Object-Relational Mapper (ORM).
- **Real-time Communication:** Handled by the `EventsGateway` in the NestJS API using WebSockets.

## Development

### Prerequisites

- Node.js / Yarn
- An accessible PostgreSQL database.

### Initial Setup

1.  Install dependencies:
    ```sh
    yarn install
    ```
2.  Configure your database connection string in `apps/pac-shield-api/src/prisma/.env`.
3.  Apply the database schema:
    ```sh
    npx nx prisma-db-push pac-shield-api
    ```

### Running the Application

To run the full application, you need to run both the frontend and backend servers.

1.  **Start the Backend API:**
    ```sh
    npx nx serve pac-shield-api
    ```
2.  **Start the Frontend UI:**
    ```sh
    npx nx serve pac-shield
    ```
    The frontend will be available at `http://localhost:4200/`.

### Key Commands

Here are some of the most common commands for managing the workspace.

#### General
- **Run Frontend:** `npx nx serve pac-shield`
- **Run Backend:** `npx nx serve pac-shield-api`
- **Build Frontend:** `npx nx build pac-shield`
- **Build Backend:** `npx nx build pac-shield-api`
- **Run API Tests:** `npx nx test pac-shield-api`
- **Run Frontend E2E Tests:** `npx nx e2e pac-shield-e2e`
= **Run E2E-API Tests:** `npx nx e2e pac-shield-api-e2e`

#### Database (Prisma)
All database commands are targeted at the `pac-shield-api` project.

- **Generate Prisma Client:** (Run this after changing `schema.prisma`)
  ```sh
  npx nx prisma-generate pac-shield-api
  ```
- **Apply Schema Changes:** (Pushes non-destructive changes to the DB)
  ```sh
  npx nx prisma-db-push pac-shield-api
  ```
- **Reset the Database:** (Clears all data and re-applies migrations)
  ```sh
  npx nx prisma-db-reset pac-shield-api
  ```
- **Open Prisma Studio:** (A GUI for viewing and editing database records)
  ```sh
  npx nx prisma-studio pac-shield-api
  ```

### Explore the Workspace

Run `npx nx graph` to see a visual diagram of the projects and their dependencies.

qdrant

docker run -p 6333:6333 qdrant/qdrant

