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

This schema defines all the collections (models), data types, relationships, and enumerations needed to represent the game state.

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

// =============================================
//               CORE GAME MODEL
// =============================================

model Game {
  id                 String      @id @default(auto()) @map("_id") @db.ObjectId
  name               String      @unique
  roomCode           String      @unique
  turn               Int         @default(1)
  day                Int         @default(1)
  executionBlock     Int         @default(1)
  phase              GamePhase   @default(CRISIS)
  victoryConditionMP Int
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  teams              Team[]
  gameBoard          GameBoard?
  atoLines           ATOLine[]
  satellites         SatelliteInstance[]
  hospitals          Hospital[]
  eventLog           GameEvent[]
}

model GameBoard {
  id                String            @id @default(auto()) @map("_id") @db.ObjectId
  gameId            String            @unique @db.ObjectId
  game              Game              @relation(fields: [gameId], references: [id])

  politicalAccess   PoliticalAccess[]
  threatTokens      ThreatToken[]
  activeEventCard   String?
  activeRiskCard    String?
  enrouteUSTRANSCOM Json[] // Storing complex object as Json
}

model PoliticalAccess {
  id         String       @id @default(auto()) @map("_id") @db.ObjectId
  boardId    String       @db.ObjectId
  board      GameBoard    @relation(fields: [boardId], references: [id])
  country    Country
  access     AccessStatus
  overflight AccessStatus
}

// =============================================
//             TEAMS AND PLAYERS
// =============================================

model Team {
  id                   String        @id @default(auto()) @map("_id") @db.ObjectId
  gameId               String        @db.ObjectId
  game                 Game          @relation(fields: [gameId], references: [id])

  type                 TeamType
  name                 String
  missionPoints        Int           @default(0)
  demoralizationPoints Int           @default(0)
  resourcePoints       Int           @default(0)
  riskTokensAvailable  Int           @default(2)

  players              Player[]
  controlledFOS        ForwardOperatingSite[]
  aircraftInstances    AircraftInstance[]
  assetInstances       AssetInstance[]
  commoditiesAtMOB     Json          // Storing as Json for simplicity
  mfrs                 MFR[]
}

model Player {
  id        String @id @default(auto()) @map("_id") @db.ObjectId
  sessionId String @unique
  name      String
  role      String
  teamId    String @db.ObjectId
  team      Team   @relation(fields: [teamId], references: [id])
}

// =============================================
//           LOCATIONS & AIRFIELDS
// =============================================

model ForwardOperatingSite {
  id                       String             @id @default(auto()) @map("_id") @db.ObjectId
  fosIdNumber              Int
  teamId                   String             @db.ObjectId
  team                     Team               @relation(fields: [teamId], references: [id])
  turnEstablished          Int

  answeredRFIs             Json
  isFullyAssessed          Boolean            @default(false)

  runwayStatus             RunwayStatus       @default(OPERATIONAL)
  parkingRampMOG           MOGLevel
  parkingRampCondition     Float              @default(100.0)
  consecutiveStrikes       Int                @default(0)
  hasMobileArrestingSystem Boolean            @default(false)
  hasRunwayLighting        Boolean            @default(false)
  hasExpandedRamp          Boolean            @default(false)
  isHardened               Boolean            @default(false)

  completedTasks           AirfieldTask[]
  stationedAircraft        AircraftInstance[] @relation("StationedAircraft")
  stationedAssets          AssetInstance[]    @relation("StationedAssets")
  commodities              Json
  isPlaJammingWithin2Hex   Boolean            @default(false)

  @@unique([teamId, fosIdNumber])
}

// =============================================
//            AIRCRAFT & ASSETS
// =============================================

model AircraftInstance {
  id                  String               @id @default(auto()) @map("_id") @db.ObjectId
  callSign            String               @unique
  type                AircraftType
  strength            Int
  rangeHexes          Int
  status              AircraftStatus       @default(FMC)

  locationType        LocationType
  locationFosId       String?              @db.ObjectId
  locationFos         ForwardOperatingSite? @relation("StationedAircraft", fields: [locationFosId], references: [id])
  locationHex         String?

  teamId              String               @db.ObjectId
  team                Team                 @relation(fields: [teamId], references: [id])
  payloadAssets       AssetInstance[]      @relation("AircraftPayload")
  payloadPersonnelCount Int                @default(0)
  currentATOId        String?              @db.ObjectId
}

model AssetInstance {
  id                    String                @id @default(auto()) @map("_id") @db.ObjectId
  type                  AssetType
  palletPositions       Int
  mraCategory           MRACategory?

  locationType          LocationType
  locationFosId         String?               @db.ObjectId
  locationFos           ForwardOperatingSite? @relation("StationedAssets", fields: [locationFosId], references: [id])
  inTransitOnAircraftId String?               @db.ObjectId
  inTransitOnAircraft   AircraftInstance?     @relation("AircraftPayload", fields: [inTransitOnAircraftId], references: [id])

  teamId                String                @db.ObjectId
  team                  Team                  @relation(fields: [teamId], references: [id])
}

// =============================================
//            ACTIONS & RECORDS
// =============================================

model ATOLine {
  id                   String                @id @default(auto()) @map("_id") @db.ObjectId
  gameId               String                @db.ObjectId
  game                 Game                  @relation(fields: [gameId], references: [id])
  turn                 Int
  aircraftCallSign     String
  startLocation        String
  enRouteDestination   String?
  finalDestination     String
  alternateDestination String?
  intention            FlightIntention
  riskTokenUsed        Boolean               @default(false)
  configuration        AircraftConfiguration
  pprStatus            PPRStatus             @default(PENDING)
  executionResult      String?
}

model ThreatToken {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  boardId   String    @db.ObjectId
  board     GameBoard @relation(fields: [boardId], references: [id])
  type      ThreatType
  strength  Int
  locationHex String
}

model MFR {
  id            String    @id @default(auto()) @map("_id") @db.ObjectId
  teamId        String    @db.ObjectId
  team          Team      @relation(fields: [teamId], references: [id])
  request       String
  status        MFRStatus @default(PENDING)
  turnSubmitted Int
}

model GameEvent {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  gameId      String   @db.ObjectId
  game        Game     @relation(fields: [gameId], references: [id])
  timestamp   DateTime @default(now())
  turn        Int
  description String
}

// =============================================
//             CSPOC & MEDCOM MODELS
// =============================================

model SatelliteInstance {
  id          String      @id @default(auto()) @map("_id") @db.ObjectId
  gameId      String      @db.ObjectId
  game        Game        @relation(fields: [gameId], references: [id])
  type        SatelliteType
  orbit       OrbitType
  position    String
  hasFuelChit Boolean     @default(true)
}

model Hospital {
  id             String       @id @default(auto()) @map("_id") @db.ObjectId
  gameId         String       @db.ObjectId
  game           Game         @relation(fields: [gameId], references: [id])
  locationName   String
  completedTasks HospitalTask[]
  bedspace       Json
  patients       Patient[]
}

model Patient {
  id           String       @id @default(auto()) @map("_id") @db.ObjectId
  hospitalId   String       @db.ObjectId
  hospital     Hospital     @relation(fields: [hospitalId], references: [id])
  casualtyType CasualtyType
  turnArrived  Int
}

// =============================================
//                 ENUMERATIONS
// =============================================

enum GamePhase { CRISIS, CONFLICT }

enum TeamType { CAOC, CSPOC, MOB, MEDCOM, GM }

enum AccessStatus { FULL_ACCESS, OVERFLIGHT_ONLY, NO_ACCESS }

enum RunwayStatus { OPERATIONAL, C17_C130_ONLY, C130_ONLY, NON_OPERATIONAL, DESTROYED }

enum MOGLevel { ONE_C130_TWO_FIGHTERS, TWO_C17_SEVEN_FIGHTERS, SIX_C17_FORTYTWO_FIGHTERS }

enum AircraftType { F16, F22, C17, C130, C5 }

enum AircraftStatus { FMC, NMC, DESTROYED }

enum LocationType { MOB, FOS, IN_TRANSIT }

enum FlightIntention { LAND, EN_ROUTE }

enum AircraftConfiguration { CARGO_ONLY, PERSONNEL_ONLY, MIXED, MEDEVAC }

enum MRACategory { MISSION_GENERATION, COMMAND_CONTROL, BOS_INTEGRATOR }

enum AssetType {
  // Personnel
  REFUELING, AIRFIELD_OPS, AIR_TRAFFIC_CONTROL, WEATHER, ASSESSMENT_TEAM, OPS_INTEL, COMMUNICATION, MAINTENANCE, PORT, SUPPLY_LOGISTICS, FORCE_PROTECTION, ENGINEERING_AIRFIELD_REPAIR, CONTRACTING, MEDICAL, CRASH_FIRE_RESCUE, COMMAND_POST,
  // Equipment
  FORKLIFT, FUEL_TRUCK, GENERATOR, FIRE_TRUCK, HMMWV, MAINTENANCE_EQUIP, MISSILE_DEFENSE_TRUCK, MOBILE_ARRESTING_SYSTEM, RUNWAY_TAXI_LIGHTING, RAPID_REPAIR_EQUIPMENT, RADIO, SATELLITE_DISH, TENT, TRUCK
}

enum CommodityType { FUEL, WATER, FOOD, AMMO, MISSILES, BOMBS, BANDAGES, PHARMACEUTICALS, IV_FLUID, OXYGEN }

enum AirfieldTask { BED_DOWN_SANITATION, POWER, COMMAND_CONTROL, CONTRACTS, RAMP_SECURITY, PERIMETER_SECURITY, MISSILE_DEFENSE, BASE_HARDENING, AIRFIELD_OPERATIONS, MOBILITY_SUPPORT, INTEGRATED_COMBAT_TURNS, SPECIALIZED_FUELING, HOST_NATION_RELATIONSHIPS, HEALTH_WELFARE, BASE_RECOVERY, LOGISTICS_SUPPORT }

enum ThreatType { GROUND_TARGET_10, FOURTH_GEN_FIGHTER_12, FIFTH_GEN_FIGHTER_20, AA_JAMMING, SATELLITE_JAMMING }

enum Country { JAPAN, PHILIPPINES, INDONESIA, BRUNEI, SINGAPORE, MALAYSIA, THAILAND, CAMBODIA, VIETNAM, LAOS, INDIA }

enum MFRStatus { PENDING, APPROVED, DENIED }

enum PPRStatus { PENDING, APPROVED, DENIED }

enum SatelliteType { MISSILE_WARNING, SDA, COMM, ISR, WEATHER, ORBITAL_WARFARE, GPS }

enum OrbitType { LEO, MEO, GEO }

enum CasualtyType { MINIMAL, IMMEDIATE, DELAYED, EXPECTANT }

enum HospitalTask { BLOOD_SUPPORT, BATTLEFIELD_SURGERY, TRIAGE_TEAM, FLIGHT_SURGEON, FLIGHT_NURSE, MEDICAL_SERVICE_CORP, AEROMEDICAL_SUPPLY, DELAYED_BEDSPACE, MEDIC_RESPONSE, MINIMAL_CARE, MINIMAL_BEDSPACE, MORTUARY_AFFAIRS, MORTUARY_SERVICES, MEDICAL_LOGISTICS, WAR_RESERVE_MATERIAL }
```

```

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
