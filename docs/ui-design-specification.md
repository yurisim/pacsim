# **UI Design Specification: Operation Pacific Shield (v2.0)**

## **Overview**
This document outlines the user interface design for Operation Pacific Shield, drawing inspiration from the Civilization series to create an intuitive, strategic command interface suitable for complex military wargaming. This version incorporates detailed component breakdowns, technical specifications, and advanced visual features based on the game's core rulebook and Excel prototype.

---

## **Design Decisions & Rejected Concepts**

*   **Rejected Concept: Dedicated "FOS" Player Role.** The user guide establishes a clear command hierarchy: `CFACC > MOB Commander > Controlled FOSs`. A MOB player is responsible for managing multiple Forward Operating Sites. Creating a separate "FOS" role would fundamentally alter this structure, requiring a player for each individual airfield, which is inconsistent with the game's design for strategic-level command. Therefore, FOS management remains a key responsibility within the MOB Dashboard.

---

## **Design Philosophy**

### **Civilization-Inspired Principles**
- **Strategic Overview**: The central map dominates the interface, providing at-a-glance situational awareness. The DF-26 threat ring will be a permanent, toggleable layer.
- **Contextual Information**: Side panels and overlays adapt to player selection and role.
- **Progressive Disclosure**: Complex information is revealed through layered interactions (hovers, clicks, context menus) to prevent overwhelming the player.
- **Turn-Based Flow**: The UI guides players through distinct phases, culminating in a clear "End Turn" confirmation dialog.

### **Military Command Interface Standards**
- **Role-Based Access**: The UI adapts completely based on player role: **MOB / CAOC / CSpOC / MEDCOM / GM**.
- **Real-Time Updates**: All information reflects the current game state across all players, ensuring a Common Operational Picture (COP).
- **Decision Support**: Critical information is highlighted via color-coding, alerts, and data visualizations.
- **Alerting Pattern**: Notification Center and Toasts provide a standard, accessible alerting model. Domain-specific sources include Allocation, ATO, CSpOC, MEDCOM, and GM, normalized for consistent presentation.

---

## **Main Interface Layout**

### **1. Top Bar**
A persistent header for global status and navigation.
- **Left**: Team Badge (e.g., Kadena AB insignia).
- **Center**: Current Phase Buttons (`Planning` > `Execution` > `Resolution`). The current phase is highlighted.
- **Right**: `Settings` (gear icon), `Help` (question mark icon), Main `Menu` (hamburger icon).

### **2. Center View (Main Game Board)**
The primary interactive area.
- **Technology**: Implemented using **MapLibre GL** for high-performance rendering.
- **Grid**: A **H3 Hex Grid Overlay** for precise positioning and analysis.
- **Tokens**: **Draggable asset tokens** representing all units. Movement paths are animated.
- **Overlays**: Interactive, toggleable layers for:
    -   **DF-26 Threat Ring**.
    -   **Range/Coverage**: Circles for weapon ranges, sensor coverage, and supply lines.
- **Interaction**:
    -   **Right-Click**: Opens a context menu with unit-specific actions.
    -   **Hover**: Displays tooltips with summary info for hexes and units.

### **3. Right Sidebar (Contextual Panel)**
A collapsible panel that adapts to the player's selection.
- **Default View: Team Resources**
    -   Displays categorized lists of **Personnel**, **Equipment**, and **Commodities** available to the player's team.
- **Selected Unit View**
    -   **Status & Stats**: Shows health, fuel, ammo, strength, special abilities.
    -   **Available Actions**: Context-sensitive buttons (e.g., `Plan Sortie`, `Load Cargo`, `Perform Maintenance`).

### **4. Bottom Panel (Status & Action Bar)**
- **Status Block**: Displays `Turn #`, `Game Phase`, `Mission Points (MP)`, and `Demoralization Points (DP)`.
- **Event Log**: A running feed of important game events and notifications (e.g., "ATO flight AW14 has landed at FOS-10," "Combat in Hex 407: Success!"). Alerts from the ATO will appear here, linking to the full dashboard. The Event Log is an ephemeral, in-session feed for recent events and alerts. A persistent, cross-domain Game Log (with filters/export) is delivered in Phase 4, consuming normalized notifications and events. The Notification Center offers a filterable, detailed view of notifications distinct from the Event Log’s brief feed. Award entries (e.g., "+5 MP for FOS-23 Assessment", "+5 MP Crisis Sortie", "+10 MP Conflict Kill") will appear in the Event Log feed and, in Phase 4, the persistent Game Log with filter/export support.

---

## **Game Tokens & Counters**

- **Aircraft Tokens**: Unique sprites for F-16, F-22, C-130, C-17, C-5. Indicators display strength/range.
- **Personnel Counters**: Color-coded tokens for Mission Generation, C2, and BOS-I teams.
- **Equipment Counters**: Icons for Fire Truck, Generator, etc., with pallet position (PP) cost displayed.
- **Commodity Tokens**: Icons for Fuel, Bomb, Missile, etc., managed via inventory panels.
- **Threat Tokens**: Red force icons for PLA aircraft/ground units with tiered strength values.
- **Jammer Tokens**: Special tokens with a visible area-of-effect overlay on the map.
- **Satellite Tokens**: While managed in the CSpOC orbital view, identified enemy satellite jammers will appear as Jammer Tokens on the main map.

---

## **Role-Specific Dashboard Overlays**

### **MOB (Main Operating Base) Dashboard**
*   **Overlay Type**: Sliding panel from right (40% screen width).

```markdown
┌─ MOB Dashboard: Kadena AB ───────────────────────────────────────────────┐
│                                                                           │
│ ┌─ Personnel Assets ────────────────────────────────────────────────────┐ │
│ │ ○ Refueling Team      @ FOS-12 (Tasked)                               │ │
│ │ ○ Force Protection    @ MOB (Available)                               │ │
│ │ ○ Medical Team        @ Aircraft C-130-02 (En Route)                  │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ ┌─ Equipment & Commodities Inventory ───────────────────────────────────┐ │
│ │ 🛢️ Fuel: 8/12      🚛 HMMWV: 4/6         💉 Medical Kits: 8/12       │ │
│ │ 💣 Bombs: 12/20     ⚡ Generators: 2/3     🍱 Food/Water: 6/10         │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ ┌─ Controlled FOSs ─────────────────────────────────────────────────────┐ │
│ │ FOS-23 (Philippines) [Operational] ●●●○○ (3/16 tasks)                 │ │
│ │ ├─ Runway: Operational | Personnel: 12 on-site | MOG: 7 Fighters     │ │
│ │ └─ Actions: [View FOS Board] [Assign Assets]                         │ │
│ │ FOS-31 (Guam) [Damaged] ●●○○○ (2/16 tasks)                           │ │
│ │ ├─ Runway: C-130 Only | Personnel: 6 on-site | MOG: 2 Fighters        │ │
│ │ └─ Actions: [View FOS Board] [Assign Assets]                         │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ ┌─ Available Aircraft (at MOB) ─────────────────────────────────────────┐ │
│ │ F-16C #001    [Ready] [Plan Mission]                                  │ │
│ │ F-16C #002    [Maintenance] (ETA: 1 Turn)                             │ │
│ │ C-130J #104   [Ready] [Load Cargo]                                    │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│                                                                 [Close ✕]  │
└───────────────────────────────────────────────────────────────────────────┘
```

### **CAOC (Combined Air Operations Center) Dashboard**
*   **Overlay Type**: Full-screen modal with tabbed sections.

```markdown
┌─ CFACC Command Dashboard ──────────────────────────────────────────────────┐
│ [ATO Management] [Resource Allocation] [Theater Status]                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌─ Air Tasking Order (ATO) - Current Turn: 13 ────────────────────────────┐ │
│ │ ... (Full ATO table as previously specified) ...                         │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─ PPR Queue ───────────────────┐ ┌─ Asset Allocation ────────────────────┐ │
│ │ 🟡 Pending Review: 3         │ │ C-130 (ARROW): 4 available          │ │
│ │ 🟢 Approved (Turn): 12       │ │ C-17 (MOOSE): 2 available           │ │
│ │ 🔴 Denied (Turn): 1          │ │ C-5 (BOSCO): 1 en route             │ │
│ │          [Review Queue]      │ │ KC-135 (Tanker): 3 available        │ │
│ └───────────────────────────────┘ │                          [Allocate Now] │ │
│                                   └───────────────────────────────────────┘ │
│                                                                            │
│ ┌─ Theater Status Overview ──────────────────────────────────────────────┐ │
│ │ Active FOSs: 8/12 | Op Runways: 6/8 | Total Sorties (Turn): 34         │ │
│ │ Political Access: 🟢 PH 🟡 JP 🔴 ID | Global Threat Level: [ MEDIUM ]    │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ [Emergency Override] [Export Report]                             [Close ✕]  │
└────────────────────────────────────────────────────────────────────────────┘
```

### **CSpOC (Combined Space Operations Center) Dashboard**
*   **Overlay Type**: Orbital view with satellite track visualization.

```markdown
┌─ CSpOC Operations Console ─────────────────────────────────────────────────┐
│                                                                            │
│ ┌─ Satellite Constellation Status ───────────────────────────────────────┐ │
│ │ ... (Orbital track visualization as previously specified) ...            │ │
│ │   LEO Track: ... [🛰️OW-1] [LOOK] [ATTACK] [FUEL: 1/1] ...              │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─ Intelligence Collection Results ──────────────────────────────────────┐ │
│ │ Recent Observations:                                                   │ │
│ │ • Hex 407: Ground Target (Confirmed) - ISR-2 pass at 14:23Z           │ │
│ │ • Hex 203: 4th Gen Fighter (Suspected) - RECON-3 single pass          │ │
│ │ Recommended Actions:                                                   │ │
│ │ • Task additional ISR to Hex 203 for confirmation.                     │ │
│ │ • Alert CAOC of potential air threat.                                  │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ... (Cyber Warfare & GBR panels as previously specified) ...               │ │
│                                                                 [Close ✕]  │
└────────────────────────────────────────────────────────────────────────────┘
```

### **MEDCOM (Medical Command) Dashboard**
*   **Overlay Type**: Medical facility status board.

```markdown
┌─ MEDCOM Operations Dashboard ──────────────────────────────────────────────┐
│ ... (Hospital Network Status as previously specified) ...                  │ │
│ │ Hospital Alpha (Kadena)                                                  │ │
│ │ ├─ Supply Status: 🩹 Normal | 💉 Low | 💊 Critical                       │ │
│ │ └─ [Manage] [Request Supplies]                                          │ │
│ │ Hospital Delta (Australia)  [OFFLINE]                                    │ │
│ │ ├─ Status: Awaiting Infrastructure. Requires: Power, Med Equip, Personnel│ │
│ │ └─ [Deploy Assets] [Coordinate with MOB]                                │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─ Active MEDEVAC Operations ────────────────────────────────────────────┐ │
│ │ Flight EVAC05 (C-17): FOS-12 → Kadena (ETA: 45 min)                    │ │
│ │ ├─ Passengers: 2 Red, 4 Yellow casualties                              │ │
│ │ └─ Onboard: Flight Medic + Surgeon                                      │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─ Medical Supply Inventory ──────┐ ┌─ Treatment Protocols ──────────────┐ │
│ │ 🩹 Bandages: 156/200           │ │ Green Patients: Stabilize (1 turn)  │ │
│ │ 💉 IV Fluids: 89/150             │ │ Yellow Patients: Surgery (2 turns)  │ │
│ │ [Request Resupply]             │ │ Auto-discharge on cure.             │ │
│ └──────────────────────────────────┘ └─────────────────────────────────────┘ │
│                                                                 [Close ✕]  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## **Shared UI Components**

### **Scoreboard Component**
- A persistent element, possibly in the Bottom Panel, showing `MP` (Mission Points), `DP` (Demoralization Points), and `RP` (Resource Points).
- Values (MP/DP/RP/Victory Target) are sourced from NgRx (backend status + WS). Scoring rules (RFIs completion, Crisis sorties, Conflict target destruction) are enforced server-side per [docs/milestones.md](docs/milestones.md) Phase 3 and surfaced to the UI as award events in the Game Log.

### **Notifications (Notification Center & Toasts)**
- Standard alerting surfaces across roles and domains.
- Sources: Allocation, ATO, CSpOC, MEDCOM, GM (normalized via a shared schema).
- Accessibility: Priority-based visuals with ARIA labels, keyboard navigation, and focus management.
- Performance: Uses OnPush change detection and NgRx selectors.

### **Event/Risk Card Display**
- When a card is drawn, it appears as a large modal dialog, showing the card's art and text. A reveal animation will be used for dramatic effect.

### **Political Assessment Display**
- A dedicated modal accessed from the Top Bar, showing detailed relationship status with all host nations, beyond the simple access level.

### **End Phase Confirmation Modal**
- Appears when a player clicks "End My Turn".
```markdown
┌─ End Phase Confirmation ────────────────────────────────────────────────┐
│                                                                        │
│ Are you sure you wish to end your phase?                               │
│                                                                        │
│ Outstanding Actions:                                                   │
│ ⚠ 2 flight plans awaiting PPR approval                                │
│ ⚠ FOS-23 task assignment incomplete                                   │
│                                                                        │
│ Automated End-of-Phase Processing will occur when the GM advances the turn:│
│ • Calculate logistics consumption, award MP/DP, update satellite positions │
│                                                                        │
│ [ ] Force advance (GM Only option)                                     │
│                                                                        │
│                  [Cancel]                   [Confirm End Phase]        │
└────────────────────────────────────────────────────────────────────────┘
```
The modal may also surface scoring-relevant preconditions (e.g., missing fuel/munitions at a FOS preventing eligible Crisis sorties) as warnings where applicable.
**Turn Management Rules**:
- MOB commanders can mark their team as "Ready".
- Only the Game Master (GM) can advance the game to the next turn/phase.

---

## **Game Master (GM) Interface**
A separate, role-protected dashboard with god-mode capabilities.
- **State Editor**: Manually edit any game state variable (points, assets, locations) with validation checks.
- **Event Trigger**: Interface to draw and apply Event/Risk cards, with options to preview or select specific cards for scenario control.
- **Player Management**: Assign players to roles, override settings, and view an audit log of player actions.

---

## **Technical Implementation Notes**

### **Frontend Technology Stack**
- **Framework**: Angular 18+ with Angular Material & CDK
- **State Management**: **NgRx** for predictable, centralized state management.
- **Mapping**: **MapLibre GL JS** with an **H3 Hex Grid Overlay**.
- **Real-time**: **Socket.IO** for WebSocket communication.
- **Component Architecture**: AppLayoutComponent, GameBoardComponent, GameTokenComponent, role-specific Dashboard Components, Modal Dialog Components.

### **Advanced Visual Features & Performance**
- **Drag and Drop**: Robust system for token movement and assignment with real-time validation feedback.
- **Animation System**: Smooth transitions for UI elements and animated trails for token movements.
- **Performance**:
    -   **Change Detection**: `OnPush` strategy implemented across all components.
    -   **Asset Optimization**: Compressed images (WebP), tree-shaken bundles, and SVG icons.
- **Responsive Design**: The application will adapt gracefully to tablet and mobile viewports.

### **Accessibility & Usability**
- **Features**: High contrast mode, full keyboard navigation, and ARIA labels for screen reader support are mandatory.
- **Standards**: Designed for low-light command center environments with at-a-glance information clarity.

### **Security & Integration**
- **Authentication**: A dedicated lobby UI for player registration, joining games, and session persistence.
- **Validation**: All user inputs will be validated on both the client and server. Component-level permissions will restrict actions based on role.
- **Integration**: Clear API contracts for WebSocket events and RESTful state synchronization.
- **Error Handling**: Graceful error boundaries and user-friendly error messages. An audit log will track all significant state changes.
