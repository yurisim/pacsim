# Design Doc: Operation Pacific Shield - Game State System

## 1. Overview & System Goals

This document outlines the database schema and data modeling approach for a digital implementation of the "Operation Pacific Shield" (OPS) wargame. The primary goal is to create a persistent, scalable, and queryable system to manage the complete state of one or more game sessions.

- **Technology Stack:**

  - **Database:** MongoDB (A document-based NoSQL database, ideal for storing complex, nested game state objects).
  - **ODM:** Prisma (Provides a strongly-typed schema definition and a type-safe client for interacting with MongoDB).

- **Key System Goals:**
  - **State Persistence:** Reliably save and load the entire state of a game session.
  - **Real-time Updates:** The schema must support efficient updates to facilitate a real-time player experience via WebSockets.
  - **Rule Enforcement:** The data structure should make it easier to implement and enforce the game's complex rules on the application layer.
  - **Data Integrity:** Use enums and relationships to ensure data consistency.
  - **Scalability:** The design must accommodate multiple concurrent game sessions.

## 2. Core Concepts & Data Modeling Philosophy

The core of our design is the **`Game`** model. Each document in the `Game` collection will represent a single, self-contained instance of an OPS session. We will model distinct game pieces like aircraft, personnel, and equipment as individual documents (`AircraftInstance`, `AssetInstance`) to provide flexibility for tracking the location and status of every single piece on the board.

Static data, such as the capabilities of an F-16 or the pallet positions required for a Fire Truck, will be managed by the application logic, not duplicated in every instance document. The database will only store the _instance_ and its current _state_.

## 3. Prisma Schema Definition (`schema.prisma`)

This schema defines all the collections (models), data types, relationships, and enumerations needed to represent the game state. Refer to `apps\pac-shield-api\src\prisma` for the schema.

## 4. Schema Walkthrough & Justification

- **`Game`**: The root model for a session, now including a `roomCode` for joining and direct relations to top-level entities like `SatelliteInstance` and `Hospital`.
- **`GameBoard`**: Represents the physical board state, tracking PLA tokens and political access.
- **`Team`**: Represents each player group and is the primary owner of assets.
- **`Player`**: A session-based identity for a participant, linked to a team and role, identified by a unique `sessionId`.
- **`ForwardOperatingSite (FOS)`**: A stateful entity tracking its own capabilities, tasks, and stationed assets.
- **`AircraftInstance` & `AssetInstance`**: Generic models for all movable pieces, with detailed location tracking.
- **`ATOLine`**: A record of a planned flight, to be adjudicated by the CAOC/GM.
- **CSpOC & MEDCOM Models**: `SatelliteInstance`, `Hospital`, and `Patient` models are now first-class entities to fully support their respective gameplay loops.
- **`Enums`**: Extensive use of enums enforces data integrity and aligns directly with the game's terminology.

## 5. Modeling Key Game Actions

- **Joining a Game:** A player sends a `roomCode` to the backend. The backend validates it, creates a new `Player` document with a unique `sessionId` and an assigned role, and returns a session-specific JWT.
- **Planning an Airlift Mission (MOB):** The player selects assets. A new `ATOLine` is created. The `inTransitOnAircraftId` field is updated for each loaded `AssetInstance`.
- **Adjudicating Combat (GM/System):** The system fetches the `AircraftInstance` and `ThreatToken`, reads their `strength`, applies modifiers, resolves the outcome, and updates the database.
- **Calculating Logistics Tax (End of Day):** A server-side job queries all occupied `ForwardOperatingSite`s, calculates personnel counts, and decrements commodities from the `commodities` JSON object.

## 6. Future Considerations

- **Real-time Layer:** The WebSocket Gateway in NestJS will be used to broadcast database state changes to clients in the appropriate game room, enabling a fully reactive UI.
- **Archiving:** A `status` field can be added to the `Game` model (e.g., `ACTIVE`, `ARCHIVED`) to filter out completed games from primary queries.
```
