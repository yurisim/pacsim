Of course. Here is a comprehensive design document that deconstructs "Operation Pacific Shield" into its core components, as requested. This document is structured to be used as a blueprint for software development.

---

## **Design Document: Operation Pacific Shield - Digital Edition**

### **Overview**
This document outlines the core entities, state variables, player actions, and governing rules for a digital implementation of the "Operation Pacific Shield" wargame. The objective is to translate the tabletop board game into an interactive, real-time, multiplayer web application.

---

## **1. Game Entities**
These are the fundamental "objects" or "nouns" within the game world.

### 1.1. Teams
The primary actors in the game.

| Entity | Description | Key Attributes |
| :--- | :--- | :--- |
| **MOB (Main Operating Base)** | A player team's home base and starting point. Each MOB team manages up to 4 FOSs. | `teamId`, `name` (e.g., Kadena AB), `commanderTitle` (AEW/CC), `inventory` (personnel, equipment, commodities), `ownedAircraft` |
| **CAOC (Combined Air Ops Center)** | The central command team responsible for overall strategy and resource allocation. | `teamId`, `name` ("CAOC"), `commanderTitle` (CFACC) |
| **CSpOC (Combined Space Ops Center)** | The team managing space assets. Plays a semi-independent intelligence-gathering mini-game. | `teamId`, `name` ("CSpOC"), `commanderTitle` (CFSCC), `satelliteInventory` |
| **MEDCOM (Medical Command)** | The team responsible for medical logistics and casualty care. | `teamId`, `name` ("MEDCOM"), `commanderTitle` (MEDCOM/CC), `medicalSupplies`, `hospitals` |

### 1.2. Assets (Blue Force)
The physical pieces players control.

#### **Aircraft**
| Entity | Sub-Type | Attributes |
| :--- | :--- | :--- |
| **Combat Aircraft** | F-16, F-22 | `assetId`, `type`, `strength` (d16 for F-16, d20 for F-22), `range` (4 hexes), `location` (airfieldId), `status` (Operational) |
| **Mobility Aircraft**| C-130, C-17, C-5 | `assetId`, `callSign`, `type`, `range` (hexes), `location` (airfieldId/hexId), `status` (FMC, NMC, En Route, Landed), `loadout` (personnel, equipment) |

#### **Ground Units**
| Entity | Description | Attributes |
| :--- | :--- | :--- |
| **Personnel Counter** | Represents a specialized team. | `assetId`, `type` ("Refueling", "Force Protection", etc.), `MRA_category` (Mission Gen, C2, BOS-I), `location` (MOB/FOS/Aircraft) |
| **Equipment Counter**| Represents a piece of deployable gear. | `assetId`, `type` ("Fire Truck", "Generator", etc.), `palletPositionCost` (PP), `location` (MOB/FOS/Aircraft) |
| **Commodity Token** | Consumable resources. | `type` ("Fuel", "Bomb", "Food", etc.), `palletPositionCost` (PP), `quantity`, `location` (MOB/FOS) |

### 1.3. Locations
The spaces on the game board where action occurs.

| Entity | Description | Attributes |
| :--- | :--- | :--- |
| **Hex** | A single hexagonal space on the main game board. | `hexId`, `coordinates`, `terrainType` |
| **FOS (Forward Operating Site)** | An airfield players can occupy and operate from. | `fosId` (1-45), `country`, `initialCapability` (Red/Yellow/Green), `MOG` (Max on Ground), `RFI_Answers` [10], `Completed_Tasks` [16], `owningTeam` |

### 1.4. Enemy Assets (PLA Force)
The opposing force, controlled by the Game Master.

| Entity | Description | Attributes |
| :--- | :--- | :--- |
| **Threat Token** | Represents an enemy combat unit. | `assetId`, `type` (Ground Target, 4th Gen Fighter, 5th Gen Fighter), `strength` (10, 12, 20), `location` (hexId) |
| **Jammer Token** | Represents an enemy electronic warfare asset. | `assetId`, `type` (Aircraft Jammer, Satellite Jammer), `location` (hexId) |

### 1.5. CSpOC Entities
Unique pieces for the space domain.

| Entity | Description | Attributes |
| :--- | :--- | :--- |
| **Satellite** | An orbital asset for intelligence and support. | `assetId`, `type` (ISR, COMM, GPS, etc.), `orbit` (LEO, MEO, GEO), `position`, `hasFuelChit` (boolean) |
| **Cyber Package**| A single-use offensive cyber capability. | `assetId`, `status` (Available, Used) |
| **GBR (Ground Based Radar)** | A deployable radar to enhance satellite capabilities. | `assetId`, `palletPositionCost` (8), `location` (FOS) |

### 1.6. Abstract Entities
Game mechanics represented as objects.

| Entity | Description |
| :--- | :--- |
| **Risk Token** | A consumable token allowing players to break rules at a cost. |
| **Event/Risk Card** | A card drawn each turn that introduces a random event or challenge. |

---

## **2. State Variables**
The data that defines the current state of the game at any moment.

### 2.1. Global State
Information relevant to the entire game.
*   `gameTurn`: Current turn number.
*   `gameDay`: Current day number.
*   `executionBlock`: Current MCE block number.
*   `gamePhase`: "Crisis" or "Conflict".
*   `victoryPointTarget`: The total MP score needed to win.
*   `politicalAccess`: An object mapping each country to its access status ("Full Access", "Overflight Only", "No Access").
*   `USTRANSCOM_C5s`: An array tracking the status and location of the C-5s en route from CONUS.
*   `eventCardDeck`: The shuffled deck of Event Cards.
*   `riskCardDecks`: Decks for each country.

### 2.2. Team-Specific State
Information tracked for each player team.
*   `missionPoints`: The team's current MP score.
*   `demoralizationPoints`: The team's current DP total.
*   `resourcePoints`: The team's current RP total.
*   `riskTokensAvailable`: Number of Risk Tokens the team currently holds.
*   `activeMFRs`: Number of active Memorandums for Record.

### 2.3. Asset-Specific State
Information tracked for each individual asset.
*   `currentLocation`: `airfieldId`, `hexId`, or `onAircraftId`.
*   `status`: "Operational", "Damaged" (with a `turnsRemaining` timer), "Destroyed", "En Route".

### 2.4. FOS-Specific State
Detailed status for each Forward Operating Site.
*   `runwayStatus`: "Operational", "C-17/C-130 Capable", "C-130 Only", "Non-Operational", "Destroyed".
*   `rampStatus`: A percentage representing operational capacity (e.g., 100%, 85%, etc.).
*   `consecutiveStrikes`: A counter for how many turns in a row the FOS has been successfully attacked.
*   `commodities`: An object storing the quantity of each commodity type at the FOS.
*   `personnelOnSite`: A list of all personnel counters currently at the FOS.

---

## **3. Player Actions**
The "verbs" of the game; the commands players can issue.

### 3.1. Planning Phase Actions
*   **Select FOSs:** MOBs designate up to four FOSs to operate from.
*   **Request RFI:** A MOB player selects a FOS and up to 5 RFIs to be answered.
*   **Request Airlift:** MOBs submit requests to the CAOC for a number and type of mobility aircraft.
*   **Allocate Airlift:** The CFACC assigns available mobility aircraft to specific MOBs.
*   **Create Load Plan:** MOBs assign specific personnel and equipment to an allocated aircraft, respecting its capacity configuration.
*   **Submit ATO:** MOBs create/update flight plans (origin, destination(s), intent) for their aircraft.

### 3.2. Execution Phase Actions
*   **Approve PPR:** The CFACC approves or denies landing permission for each flight plan in the ATO.
*   **Move Aircraft:** An adjudicated action where aircraft move along their planned routes.
*   **Download/Assign Assets:** When an aircraft lands, the player moves its cargo to the FOS inventory and can immediately assign personnel to Airfield Tasks.
*   **Complete Airfield Task:** A player assigns the required personnel/equipment to a task. If requirements are met, the task is marked complete.
*   **Launch Fighter Sortie:** From an operational FOS, a player launches a fighter to a target hex.
*   **Redeploy Fighters:** Move fighters from a MOB to a FOS (takes one full turn).

### 3.3. Special Actions
*   **Use Risk Token:** Declare the use of a Risk Token on a specific action (e.g., landing a C-5 at a FOS) to trigger a dice roll for success/failure.
*   **Build Parking Ramp:** Assign a Base Recovery Team to this task at a FOS to increase its MOG on the following turn.
*   **Contract Task:** After establishing contracting capability (Task #4), players can pay to have certain tasks (Power, Logistics) completed by the host nation.

### 3.4. CSpOC Actions
*   **Place Satellite:** Deploy a new satellite into a LEO, MEO, or GEO orbit slot.
*   **Conduct Look:** Designate a satellite to perform its function on the hex(es) below it, revealing information.
*   **Use Fuel Chit:** Expend a satellite's one-time fuel chit to perform a maneuver (change orbit, advance/delay position).
*   **Attack PRC Satellite:** Use an Orbital Warfare satellite to target an identified enemy satellite.

---

## **4. Rules & Interactions**
The core logic that governs how actions and state changes are resolved.

### 4.1. Scoring & Victory
*   **MP Calculation:** Total MPs are calculated at the end of each turn based on actions performed.
*   **DP Penalty:** Total MP is reduced by `floor(Total_DP / 5)`.
*   **Victory:** Game ends when `Combined_MP >= victoryPointTarget`.

### 4.2. Movement & Logistics
*   **Fighter Range:** 4 hexes. Must land at a suitable airfield at the end of every turn.
*   **Mobility Range:** Varies by aircraft type. Can remain airborne for one turn; destroyed if airborne for two consecutive turns.
*   **FOS Operational Readiness:** To launch fighters, all tasks in the "Establish" and "Operate" categories must be complete at the FOS.
*   **Logistics Tax:** At the end of each game day, every occupied airfield consumes food and water based on the number of personnel present (`<25 pers` = 1 of each every other day; `>25 pers` = 1 of each every day).
*   **Sortie Cost:** In the *Conflict* phase, each fighter sortie consumes 1 Fuel, 1 Bomb, and 1 Missile token.

### 4.3. Combat System
*   **Adjudication:** `d(AttackerStrength)` vs `d(DefenderStrength)`. The highest roll wins; the loser's token is removed from the board.
*   **Force Packaging:** Two fighters attacking one target roll `d(Fighter1_Strength)` and `0.5 * d(Fighter2_Strength)`. If the attack fails, both fighters are lost.
*   **Base Defense:**
    *   **Missile Defense (Task #7):** Provides a defensive bonus roll against kinetic strikes.
    *   **Hardening (Task #8):** Provides a defensive bonus and prevents an airfield from being fully destroyed after 4 consecutive hits.
    *   **Repairs:** A **Base Recovery Team (Task #15)** must be on-site to repair runway/ramp damage. Repairs take one turn after the team is in place.

### 4.4. CSpOC System
*   **Orbital Effects:**
    *   **LEO:** High fidelity (full identification on first pass), narrow scope (one hex).
    *   **MEO:** Lower fidelity (unidentified on first pass, identified on second pass), wider scope (h3-js hex grid).
    *   **GEO:** Stationary orbit, provides persistent effects over a large area.
*   **Capabilities:** Each satellite type can only detect specific enemy asset types (e.g., Missile Warning sees ground-based missile threats; ISR sees airborne threats).
