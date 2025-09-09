# Stubbed GUI Items for Operation Pacific Shield Game Board

This document lists all the stubbed GUI and visual elements required to implement the game board interface for Operation Pacific Shield, based on the design documents, user guide, game methods, and milestones.

## Core Game Board Components

### 1. Main Game Board
- **Location Markers**: Visual indicators for MOBs, FOSs (1-45), and other key locations
- **Threat Ring Display**: Visual representation of DF-26 ballistic missile threat range
- **Political Access Indicators**: Color-coded overlays showing country access status (Full Access, Overflight Only, No Access)
- **Aircraft Movement Paths**: Visual trails showing planned and executed flight routes

### 2. Game Tokens and Counters
- **Aircraft Tokens**: Visual representations for F-16, F-22, C-130, C-17, C-5 with strength/range indicators
- **Personnel Counters**: Color-coded tokens for Mission Generation, Command and Control, Base Operating Support-Integrator teams
- **Equipment Counters**: Visual tokens for Fire Truck, Generator, etc. with pallet position indicators
- **Commodity Tokens**: Icons for Fuel, Bomb, Missile, Food, Water, etc.
- **Threat Tokens**: PLA aircraft and ground-based threat representations (10, 12, 20 strength)
- **Jammer Tokens**: Aircraft and satellite jammer indicators
- **Satellite Tokens**: Orbital assets for CSpOC gameplay

## Dashboard Components

### 3. Team-Specific Dashboards
- **MOB Dashboard**: 
  - On-station personnel, equipment, and commodities display
  - Aircraft inventory and status
  - FOS selection and management interface
  - Load planning interface

- **FOS Dashboard**:
  - RFI (Request for Information) status display (10 categories)
  - Maximum on Ground (MOG) indicator
  - 16 Airfield Tasks completion status (Establish, Defend, Operate, Maintain categories)
  - Personnel and equipment assignment interface
  - Commodities inventory display

- **CAOC Dashboard**:
  - Air Tasking Order (ATO) table with flight plans
  - Prior Permission Required (PPR) approval interface
  - Aircraft apportionment display
  - Mission Dashboard with consolidated team information

- **CSpOC Dashboard**:
  - Orbital tracks display (LEO, MEO, GEO)
  - Satellite positioning and status
  - "Look" action interface for intelligence gathering
  - Cyber package management

- **MEDCOM Dashboard**:
  - Hospital status displays (Kadena, Yokota, Andersen, JBPHH)
  - Patient tracking and triage interface
  - MEDEVAC flight planning
  - Medical supplies inventory

### 4. Shared UI Components

#### Score and Status Displays
- **Scoreboard Component**: Real-time display of Mission Points (MP), Demoralization Points (DP), Resource Points (RP)
- **Victory Condition Progress**: Visual progress bar toward MP target
- **Game Phase Indicator**: Crisis vs Conflict phase display
- **Turn Counter**: Current game day and turn display

#### Planning and Action Components
- **ATO Table Component**: Interactive table for flight planning and approval
- **Flight Planner Dialog**: Form-based interface for creating flight plans
- **Load Planner Interface**: Aircraft configuration and cargo assignment
- **Combat Resolution Dialog**: Dice roll and outcome display for engagements
- **Risk Token Usage Interface**: Declaration and adjudication of risk actions

#### Information Displays
- **Game Log Component**: Running chronological log of all game events
- **Event/Risk Card Display**: Visual cards for current turn's random events
- **Notification System**: Toast messages for action feedback and system updates
- **Political Assessment Display**: Country access status overview

### 5. Game Master (GM) Interface
- **State Editor**: Interface for manually adjusting game state variables
- **Event Trigger**: Controls for drawing and applying Event/Risk cards
- **Turn Advancement**: Manual turn progression controls
- **Player Management**: Override controls for player assignments and settings

### 6. Supporting UI Elements

#### Authentication and Lobby
- **Join Game Interface**: Room code entry with OTP input
- **Player Registration**: Name entry with conflict resolution
- **Lobby Management**: Team assignment and player settings
- **Session Persistence**: Continue game functionality

#### Utility Components
- **Theme Toggle**: Dark/light mode switcher
- **Help Tooltips**: Contextual help for complex UI elements
- **Error Handling**: Alert components for validation and system errors
- **Loading States**: Progress indicators for async operations

### 7. Advanced Visual Features
- **Drag and Drop System**: For moving tokens between locations and assigning to tasks
- **Zoom and Pan Controls**: For navigating the game board
- **Real-time Updates**: WebSocket-driven live state synchronization
- **Responsive Design**: Mobile-friendly layouts for different screen sizes

### 8. Data Visualization
- **Mission Dashboard**: Consolidated view of all teams' status
- **Airfield Capacity Charts**: Visual representation of MOG and operational status
- **Logistics Tracking**: Supply chain and commodity flow displays
- **Combat History**: Record of past engagements and outcomes

This list represents all the stubbed GUI elements needed to create a complete visual implementation of the Operation Pacific Shield game board. Each component should start as a basic placeholder that can be progressively enhanced with full functionality.
