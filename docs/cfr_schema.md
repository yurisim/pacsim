# CFACC Allocation System - Database Schema Extension

This document proposes the necessary additions to the `schema.prisma` file to support the new CFACC aircraft allocation workflow.

```prisma
// ========== ENUMERATIONS (Additions) ==========

enum AllocationCycleStatus {
  PENDING   // Cycle has not started
  REQUESTS_OPEN // MOBs can submit requests
  ANALYSIS    // CFACC is reviewing requests
  ALLOCATED   // CFACC has allocated aircraft
  CLOSED      // Cycle is complete for the turn
}

enum AllocationRequestStatus {
  PENDING   // Submitted by MOB, awaiting review
  APPROVED  // CFACC has approved the request (fully or partially)
  DENIED    // CFACC has denied the request
  MODIFIED  // CFACC has modified the request
}


// ========== MODEL ADDITIONS ==========

model AllocationCycle {
  id     Int    @id @default(autoincrement())
  gameId Int    @unique // Each game has one active allocation cycle
  game   Game   @relation(fields: [gameId], references: [id])
  turn   Int
  status AllocationCycleStatus @default(PENDING)

  requests   AircraftRequest[]
  allocations AircraftAllocation[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique(fields: [gameId, turn])
}

model AircraftRequest {
  id                Int      @id @default(autoincrement())
  allocationCycleId Int
  allocationCycle   AllocationCycle @relation(fields: [allocationCycleId], references: [id])

  teamId Int
  team   Team @relation(fields: [teamId], references: [id])

  aircraftType      AircraftType
  quantityRequested Int
  missionJustification String
  priority          Int // Priority level set by the MOB
  rationale         String
  status            AllocationRequestStatus @default(PENDING)
  quantityAllocated Int      @default(0)

  // CFACC notes
  cfaccNotes        String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  allocations       AircraftAllocation[]
}

model AircraftAllocation {
  id              Int      @id @default(autoincrement())
  allocationCycleId Int
  allocationCycle   AllocationCycle @relation(fields: [allocationCycleId], references: [id])

  aircraftRequestId Int
  aircraftRequest   AircraftRequest @relation(fields: [aircraftRequestId], references: [id])

  // The specific aircraft instance being allocated
  aircraftInstanceId Int      @unique // An aircraft can only be allocated once per cycle
  aircraftInstance   AircraftInstance @relation(fields: [aircraftInstanceId], references: [id])

  // The team receiving the aircraft
  allocatedToTeamId Int
  allocatedToTeam   Team @relation(fields: [allocatedToTeamId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}


// ========== MODEL MODIFICATIONS ==========

model Game {
  // ... existing fields ...
  allocationCycles AllocationCycle[]
}

model Team {
  // ... existing fields ...
  aircraftRequests AircraftRequest[]
  aircraftAllocations AircraftAllocation[] @relation("AllocatedToTeam")
}

model AircraftInstance {
  // ... existing fields ...
  /// Status for the allocation workflow
  allocationStatus AircraftAllocationStatus @default(AVAILABLE)
  allocation       AircraftAllocation?
}

// Add this new enum as well for the AircraftInstance
enum AircraftAllocationStatus {
  AVAILABLE   // In the unallocated pool
  REQUESTED   // Part of a pending request - maybe not needed
  ALLOCATED   // Assigned to a MOB for the turn
  IN_TRANSIT  // In transit as part of an ATO
  MAINTENANCE // Unavailable for allocation
}

```
