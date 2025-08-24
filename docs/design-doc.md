Of course. Based on the detailed "OPERATION PACIFIC SHIELD USER GUIDE," here is a comprehensive design document for a MongoDB system using Prisma as the Object Document Mapper (ODM).

This document breaks down the game's complex entities and rules into a structured, scalable data model.

Design Doc: Operation Pacific Shield - Game State System

1. Overview & System Goals

This document outlines the database schema and data modeling approach for a digital implementation of the "Operation Pacific Shield" (OPS) wargame. The primary goal is to create a persistent, scalable, and queryable system to manage the complete state of one or more game sessions.

Technology Stack:

Database: MongoDB (A document-based NoSQL database, ideal for storing complex, nested game state objects).

ODM: Prisma (Provides a strongly-typed schema definition and a type-safe client for interacting with MongoDB).

Key System Goals:

State Persistence: Reliably save and load the entire state of a game session.

Real-time Updates: The schema must support efficient updates to facilitate a real-time player experience (e.g., via WebSockets).

Rule Enforcement: The data structure should make it easier to implement and enforce the game's complex rules on the application layer.

Data Integrity: Use enums and relationships to ensure data consistency.

Scalability: The design should accommodate multiple concurrent game sessions.

2. Core Concepts & Data Modeling Philosophy

The core of our design is the Game model. Each document in the Game collection will represent a single, self-contained instance of an OPS session. This "game-in-a-document" approach (or more accurately, "game-as-a-collection-of-related-documents") is highly effective for turn-based strategy games. It allows the application to easily load all relevant information for a session.

We will model distinct game pieces like aircraft, personnel, and equipment as individual documents (AircraftInstance, AssetInstance). This provides flexibility for tracking the location and status of every single piece on the board, mirroring the physical game.

Static data, such as the capabilities of an F-16 or the pallet positions required for a Fire Truck, will be managed by the application logic or a separate static data service, not duplicated in every instance document. The database will only store the instance and its current state.

3. Prisma Schema Definition (schema.prisma)

This schema defines all the collections (models), data types, relationships, and enumerations needed to represent the game state.

code
Prisma
download
content_copy
expand_less

// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
provider = "prisma-client-js"
}

datasource db {
provider = "mongodb"
url = env("DATABASE_URL")
}

// =============================================
// CORE GAME MODEL
// =============================================

model Game {
id String @id @default(auto()) @map("\_id") @db.ObjectId
name String @unique // e.g., "OTS Class 24-05 MCE 1"
turn Int @default(1)
day Int @default(1)
executionBlock Int @default(1)
phase GamePhase @default(CRISIS)
victoryConditionMP Int
totalMissionPoints Int @default(0)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

teams Team[]
gameBoard GameBoard?
atoLines ATOLine[]
eventLog GameEvent[] // For logging key actions and dice rolls
}

model GameBoard {
id String @id @default(auto()) @map("\_id") @db.ObjectId
gameId String @unique @db.ObjectId
game Game @relation(fields: [gameId], references: [id])

politicalAccess PoliticalAccess[]
threatTokens ThreatToken[]
activeEventCard String? // Reference or name of the card
activeRiskCard String? // Reference or name of the card
enrouteUSTRANSCOM EnrouteAircraft[]
}

model PoliticalAccess {
id String @id @default(auto()) @map("\_id") @db.ObjectId
boardId String @db.ObjectId
board GameBoard @relation(fields: [boardId], references: [id])
country Country
access AccessStatus
overflight AccessStatus
}

// =============================================
// TEAMS AND PLAYERS
// =============================================

model Team {
id String @id @default(auto()) @map("\_id") @db.ObjectId
gameId String @db.ObjectId
game Game @relation(fields: [gameId], references: [id])

type TeamType
name String // e.g., "MOB Kadena AB", "CAOC", "MEDCOM"
demoralizationPoints Int @default(0)
riskTokensAvailable Int @default(2) /// 2 in Crisis, 4 in Conflict per block

players Player[]
controlledFOS ForwardOperatingSite[]
aircraftInstances AircraftInstance[]
assetInstances AssetInstance[]
commoditiesAtMOB CommodityCount[]
mfrs MFR[]
}

model Player {
id String @id @default(auto()) @map("\_id") @db.ObjectId
// Link to a generic User model for auth
// userId String @unique
name String // OT's name
role String // e.g., "Mission Commander", "Load Planner"
teamId String @db.ObjectId
team Team @relation(fields: [teamId], references: [id])
}

// =============================================
// LOCATIONS & AIRFIELDS
// =============================================

model ForwardOperatingSite {
id String @id @default(auto()) @map("\_id") @db.ObjectId
fosIdNumber Int @unique /// The number 1-45 from the game board
teamId String @db.ObjectId
team Team @relation(fields: [teamId], references: [id])
turnEstablished Int

// RFI Status
answeredRFIs Json /// {"CFR": 2, "MobilitySupport": 1, ...}
isFullyAssessed Boolean @default(false)

// Capability Status
runwayStatus RunwayStatus @default(OPERATIONAL)
parkingRampMOG MOGLevel
parkingRampCondition Float @default(100.0) /// Percentage, e.g., 100.0, 40.0
consecutiveStrikes Int @default(0)
hasMobileArrestingSystem Boolean @default(false)
hasRunwayLighting Boolean @default(false)
hasExpandedRamp Boolean @default(false)
isHardened Boolean @default(false) /// From Task #8

// Tasks and Assets
completedTasks AirfieldTask[]
stationedAircraft AircraftInstance[]
stationedAssets AssetInstance[]
commodities CommodityCount[]
isPlaJammingWithin2Hex Boolean @default(false)
}

// =============================================
// AIRCRAFT & ASSETS
// =============================================

model AircraftInstance {
id String @id @default(auto()) @map("\_id") @db.ObjectId
callSign String @unique // e.g., "AW01", "ME16"
type AircraftType
strength Int /// e.g., F-16 is 12, F-22 is 20 (special rule)
rangeHexes Int
status AircraftStatus @default(FMC)

// Location
locationType LocationType
locationFosId String? @db.ObjectId
locationFos ForwardOperatingSite? @relation(fields: [locationFosId], references: [id])
locationHex String? /// For aircraft in the air

// Ownership and Payload
teamId String @db.ObjectId
team Team @relation(fields: [teamId], references: [id])
payloadAssets AssetInstance[]
payloadPersonnelCount Int @default(0)
currentATOId String? @db.ObjectId /// Link to the ATOLine it's currently executing
}

model AssetInstance {
id String @id @default(auto()) @map("\_id") @db.ObjectId
type AssetType
palletPositions Int

// Location
locationType LocationType
locationFosId String? @db.ObjectId
locationFos ForwardOperatingSite? @relation(fields: [locationFosId], references: [id])
inTransitOnAircraftId String? @db.ObjectId
inTransitOnAircraft AircraftInstance? @relation(fields: [inTransitOnAircraftId], references: [id])

// Ownership
teamId String @db.ObjectId
team Team @relation(fields: [teamId], references: [id])
}

// =============================================
// ACTIONS & RECORDS
// =============================================

model ATOLine {
id String @id @default(auto()) @map("\_id") @db.ObjectId
gameId String @db.ObjectId
game Game @relation(fields: [gameId], references: [id])
turn Int

aircraftCallSign String
startLocation String // FOS ID or Hex ID
enRouteDestination String? // FOS ID
finalDestination String // FOS ID or Hex ID
alternateDestination String? // FOS ID
intention FlightIntention
riskTokenUsed Boolean @default(false)
configuration AircraftConfiguration

// Status updated by CAOC/GM
pprStatus PPRStatus @default(PENDING)
executionResult String? // e.g., "Landed", "Diverted", "Destroyed"
}

model ThreatToken {
id String @id @default(auto()) @map("\_id") @db.ObjectId
boardId String @db.ObjectId
board GameBoard @relation(fields: [boardId], references: [id])

type ThreatType
strength Int // 10, 12, or 20
locationHex String
}

model MFR {
id String @id @default(auto()) @map("\_id") @db.ObjectId
teamId String @db.ObjectId
team Team @relation(fields: [teamId], references: [id])
request String
status MFRStatus @default(PENDING)
turnSubmitted Int
}

model GameEvent {
id String @id @default(auto()) @map("\_id") @db.ObjectId
gameId String @db.ObjectId
game Game @relation(fields: [gameId], references: [id])
timestamp DateTime @default(now())
turn Int
description String // "Team 1 launched F-16 from FOS-6 to attack PLA in hex 507. Roll: 11 vs 8. Success."
}

// =============================================
// SUPPORTING COMPONENTS
// =============================================

type CommodityCount {
type CommodityType
quantity Int
}

type EnrouteAircraft {
type AircraftType
turnsFromAOR Int // 3 = East Coast, 2 = West Coast, 1 = Hawaii/Alaska, 0 = AOR Entry
payload Json
}

// =============================================
// ENUMERATIONS
// =============================================

enum GamePhase {
CRISIS
CONFLICT
}

enum TeamType {
CAOC
CSPOC
MOB
MEDCOM
}

enum AccessStatus {
FULL_ACCESS
OVERFLIGHT_ONLY
NO_ACCESS
}

enum RunwayStatus {
OPERATIONAL // Day/Night or Day Only capable
C17_C130_ONLY
C130_ONLY
NON_OPERATIONAL
DESTROYED
}

enum MOGLevel {
ONE_C130_TWO_FIGHTERS
TWO_C17_SEVEN_FIGHTERS
SIX_C17_FORTYTWO_FIGHTERS
}

enum AircraftType {
F16
F22
C17
C130
C5
// Add others as needed
}

enum AircraftStatus {
FMC // Fully Mission Capable
NMC // Non-Mission Capable
DESTROYED
}

enum LocationType {
MOB
FOS
IN_TRANSIT
}

enum FlightIntention {
LAND
EN_ROUTE // Will end the turn in the air
}

enum AircraftConfiguration {
CARGO_ONLY
PERSONNEL_ONLY
MIXED
MEDEVAC
}

enum AssetType {
// Personnel
REFUELING
AIRFIELD_OPS
AIR_TRAFFIC_CONTROL
WEATHER
ASSESSMENT_TEAM
OPS_INTEL
COMMUNICATION
// ... add all personnel counters

// Equipment
FORKLIFT
FUEL_TRUCK
GENERATOR
FIRE_TRUCK
// ... add all equipment counters
}

enum CommodityType {
FUEL
WATER
FOOD
AMMO
MISSILES
BOMBS
// MEDCOM specific
BANDAGES
PHARMACEUTICALS
IV_FLUID
OXYGEN
}

enum AirfieldTask {
BED_DOWN_SANITATION // 1
POWER // 2
COMMAND_CONTROL // 3
CONTRACTS // 4
RAMP_SECURITY // 5
PERIMETER_SECURITY // 6
MISSILE_DEFENSE // 7
BASE_HARDENING // 8
// ... and so on for all 16 tasks
}

enum ThreatType {
GROUND_TARGET_10
FOURTH_GEN_FIGHTER_12
FIFTH_GEN_FIGHTER_20
AA_JAMMING
SATELLITE_JAMMING
}

enum Country {
JAPAN
PHILIPPINES
INDONESIA
BRUNEI
SINGAPORE
// ... and so on
}

enum MFRStatus {
PENDING
APPROVED
DENIED
}

enum PPRStatus {
PENDING
APPROVED
DENIED
} 4. Schema Walkthrough & Justification

Game: The root model for a session. It holds global state like turn and phase. Critically, it contains relations to all the Teams and ATOLines associated with it, making it the central hub for queries.

GameBoard: A singleton model linked to a Game. It represents the board itself, tracking things not owned by a specific team, like PLA ThreatTokens and the current PoliticalAccess status for each country.

Team: Represents each player group (CAOC, MOBs, etc.). It's the primary owner of assets (AircraftInstance, AssetInstance) and tracks team-specific points and resources like riskTokensAvailable.

ForwardOperatingSite (FOS): This is a crucial and complex model. Instead of just being a location, it's a stateful entity. It tracks its own runway condition, MOG, completed tasks, and stationed assets. This allows for detailed queries like "Find all FOSs that are Day/Night capable and have a Refueling team."

AircraftInstance: Represents a single aircraft token. Its locationType, locationFosId, and locationHex fields allow us to precisely track if it's at a MOB, a FOS, or in the air between hexes.

AssetInstance: A generic model for personnel and equipment tokens. Like aircraft, it can be precisely located at a MOB, FOS, or even as cargo (inTransitOnAircraftId). This prevents data duplication and provides a single way to manage all movable ground assets.

ATOLine: This model digitizes the Air Tasking Order. It's a record of an intended action. Game Masters (or an automated adjudicator) would update the executionResult field after the execution phase, creating a permanent record of the flight.

ThreatToken: Represents enemy PLA units. Keeping them separate on the GameBoard makes them easy to manage globally by the GM.

Enums: The extensive use of enums (GamePhase, RunwayStatus, AircraftType, etc.) is a cornerstone of this design. It enforces data consistency, prevents typos, and makes the application code cleaner and less error-prone.

5. Modeling Key Game Actions

Planning an Airlift Mission (MOB):

The application front-end shows the player the AircraftInstances and AssetInstances owned by their Team located at their MOB.

The player selects assets to load onto a C-17. The application validates this against pallet space.

A new ATOLine document is created with startLocation: "Kadena MOB", finalDestination: "FOS-7", etc.

The inTransitOnAircraftId field is updated for each loaded AssetInstance.

Adjudicating Combat (GM/System):

A fighter sortie is planned via an ATOLine.

The adjudicator identifies the friendly AircraftInstance and the target ThreatToken.

It fetches both documents, reads their strength values.

It checks for modifiers (e.g., query for friendly GPS satellites or nearby jamming ThreatTokens).

After the dice roll logic, the losing document is deleted (or marked as DESTROYED).

The result is logged in a new GameEvent document.

Calculating Logistics Tax (End of Day):

The system queries for all ForwardOperatingSites.

For each FOS, it counts the number of stationed AssetInstances (where type is personnel).

Based on the count (<25 or >25), it decrements the quantity of FUEL, WATER, and FOOD in the commodities array for that FOS.

If a commodity count drops below zero, DemoralizationPoints are added to the controlling Team.

6. Future Considerations

CSpOC & MEDCOM: The schema can be extended with SatelliteInstance and Hospital models to fully incorporate the CSpOC and MEDCOM gameplay loops. The current Team model is flexible enough to handle them as new TeamTypes.

Real-time Layer: MongoDB's Change Streams can be used to push database updates to a WebSocket server, allowing all players to see changes in real-time without needing to refresh.

Archiving: Once a Game is complete, its associated documents can be moved to a separate "archive" database or marked as archived: true to keep the primary database performant.
