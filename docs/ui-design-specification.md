# **UI Design Specification: Operation Pacific Shield**

## **Overview**
This document outlines the user interface design for Operation Pacific Shield, drawing inspiration from the Civilization series to create an intuitive, strategic command interface suitable for complex military wargaming.

---

## **Design Philosophy**

### **Civilization-Inspired Principles**
- **Strategic Overview**: Central map dominates the interface, providing situational awareness
- **Contextual Information**: Side panels adapt to selection and role
- **Progressive Disclosure**: Complex information revealed through layered interactions
- **Visual Hierarchy**: Clear distinction between primary actions and supporting information
- **Turn-Based Flow**: UI guides players through planning → execution → resolution phases

### **Military Command Interface Standards**
- **Role-Based Access**: UI adapts completely based on player role (MOB/CAOC/CSpOC/MEDCOM)
- **Real-Time Updates**: All information reflects current game state across all players
- **Decision Support**: Critical information readily accessible for command decisions
- **Operational Clarity**: Clear visual indicators for unit status, capabilities, and limitations

---

## **Layout Architecture**

### **Primary Layout (100% viewport)**

```
┌─────────────────────────────────────────────────────────────────────┐
│ TOP TOOLBAR (5% height)                                             │
│ [Team Badge] [Phase Buttons] [Settings] [Help] [Menu]               │
├─────────────────────────────────────────┬───────────────────────────┤
│                                         │                           │
│                                         │ RIGHT SIDEBAR             │
│                                         │ (25% width)               │
│ CENTRAL MAP AREA                        │                           │
│ (75% width, 70% height)                 │ ┌─ Selected Unit ─────┐   │
│                                         │ │ Asset Details       │   │
│ • Pacific Theater Map (MapLibre GL)     │ │ Status & Stats      │   │
│ • H3 Hex Grid Overlay                   │ │ Available Actions   │   │
│ • Asset Tokens (Draggable)              │ └─────────────────────┘   │
│ • Range/Coverage Overlays                │                           │
│ • Political Access Zones                │ ┌─ Team Resources ────┐   │
│                                         │ │ Personnel           │   │
│                                         │ │ Equipment           │   │
│                                         │ │ Commodities         │   │
│                                         │ └─────────────────────┘   │
├─────────────────────────────────────────┴───────────────────────────┤
│ BOTTOM PANEL (25% height)                                           │
│ ┌─ Status ──┐ ┌─ Action Queue/ATO ─────────────┐ ┌─ Notifications ─┐ │
│ │ Turn: 3   │ │ Flight Plans & Operations      │ │ Recent Events   │ │
│ │ Phase: Ex │ │                                │ │ & Alerts        │ │
│ │ MP: 45/60 │ │ [Interactive ATO Table]        │ │                 │ │
│ │ DP: 12    │ │                                │ │                 │ │
│ └───────────┘ └────────────────────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### **Responsive Behavior**
- **Desktop (1920x1080+)**: Full layout as described
- **Tablet (1024x768)**: Collapsible sidebars, simplified overlays
- **Mobile (768x1024)**: Single-pane interface with tabbed navigation

---

## **Role-Specific Dashboard Overlays**

### **MOB (Main Operating Base) Dashboard**

**Overlay Type**: Sliding panel from right (40% screen width)

```
┌─ MOB Dashboard: Kadena AB ─────────────────────────┐
│                                                    │
│ ┌─ Personnel Assets ─────────────────────────────┐ │
│ │ ○ Refueling Team      @ FOS-12                 │ │
│ │ ○ Force Protection    @ MOB (Available)        │ │
│ │ ○ Medical Team        @ Aircraft C-130-02      │ │
│ │ ○ Security Forces     @ FOS-23                 │ │
│ │ ○ Maintenance Crew    @ MOB (Available)        │ │
│ └─────────────────────────────────────────────────┘ │
│                                                    │
│ ┌─ Equipment & Commodities ──────────────────────┐ │
│ │ 🛢️ Fuel: 8/12      🔧 Maint Tools: 3/5       │ │
│ │ 💣 Ordnance: 12/15  🍱 Food: 6/10             │ │
│ │ 🚛 Vehicles: 4/6    💉 Medical: 8/12          │ │
│ │ ⚡ Generators: 2/3  🔫 Weapons: 15/20         │ │
│ └─────────────────────────────────────────────────┘ │
│                                                    │
│ ┌─ Controlled FOSs ──────────────────────────────┐ │
│ │ FOS-23 (Philippines) ●●●○○ (3/5 tasks)        │ │
│ │ ├─ Runway: Operational                         │ │
│ │ ├─ Personnel: 12 on-site                       │ │
│ │ └─ [View Details] [Assign Assets]              │ │
│ │                                                │ │
│ │ FOS-31 (Guam) ●●○○○ (2/5 tasks)               │ │
│ │ ├─ Runway: C-130 Only                          │ │
│ │ ├─ Personnel: 6 on-site                        │ │
│ │ └─ [View Details] [Assign Assets]              │ │
│ └─────────────────────────────────────────────────┘ │
│                                                    │
│ ┌─ Available Aircraft ───────────────────────────┐ │
│ │ F-16C Viper #001    [Ready] [Plan Mission]     │ │
│ │ F-16C Viper #002    [Maintenance] [ETA: T+2]   │ │
│ │ C-130J Hercules     [En Route to FOS-23]       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                    │
│ [Close Dashboard]                                   │
└────────────────────────────────────────────────────┘
```

### **CAOC (Combined Air Operations Center) Dashboard**

**Overlay Type**: Full-screen modal with tabbed sections

```
┌─ CFACC Command Dashboard ──────────────────────────────────────────────┐
│ [ATO Management] [Resource Allocation] [Intelligence] [Operations]     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ ┌─ Air Tasking Order (Current: Day 3, Execution Block 2) ─────────────┐ │
│ │ Flight  │Aircraft│ Route        │ Intent           │ Status    │PPR │ │
│ │ SCAR01  │F-16    │ KAD→FOS23    │ Combat Air Patrol│ Pending   │[A]│ │
│ │ LIFT02  │C-130   │ AND→FOS31    │ Personnel Trans  │ Approved  │✓  │ │
│ │ STRIKE3 │F-22    │ KAD→HEX407   │ Close Air Support│ Pending   │[A]│ │
│ │ RECON04 │U-2     │ KAD→Area15   │ ISR Collection   │ In Flight │✓  │ │
│ │ EVAC05  │C-17    │ FOS12→AND    │ Medical Evac     │ Emergency │✓  │ │
│ │         │        │              │                  │           │   │ │
│ │ [Add New Flight] [Bulk Approve] [Export ATO] [Refresh]         │   │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌─ PPR (Prior Permission Required) Queue ──────┐ ┌─ Asset Allocation ─┐ │
│ │ 🟡 3 Requests Pending Review                 │ │ Available Assets:   │ │
│ │ 🟢 12 Approved Today                         │ │ • C-130: 2 ready   │ │
│ │ 🔴 1 Denied (Political Restriction)          │ │ • C-17: 1 maint    │ │
│ │                                              │ │ • C-5: 3 en route  │ │
│ │ [Approve All Valid] [Review Individual]      │ │ • KC-135: 4 ready  │ │
│ └──────────────────────────────────────────────┘ └─────────────────────┘ │
│                                                                        │
│ ┌─ Theater Status Overview ─────────────────────────────────────────────┐ │
│ │ Active FOSs: 8/12    Operational Runways: 6/8    Total Sorties: 34   │ │
│ │ Political Access: 🟢 Phil 🟡 Japan 🔴 Taiwan    Threat Level: MEDIUM │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ [Close] [Export Report] [Emergency Override]                           │
└────────────────────────────────────────────────────────────────────────┘
```

### **CSpOC (Combined Space Operations Center) Dashboard**

**Overlay Type**: Orbital view with satellite track visualization

```
┌─ CSpOC Operations Console ─────────────────────────────────────────────┐
│                                                                        │
│ ┌─ Satellite Constellation Status ──────────────────────────────────────┐ │
│ │                                                                     │ │
│ │     GEO Ring           MEO Track            LEO Track              │ │
│ │   ┌─────────────┐    ┌─────────────┐     ┌─────────────┐           │ │
│ │   │🛰️ COMM-1     │    │ 🛰️ ISR-2     │     │🛰️ RECON-3    │           │ │
│ │   │GPS-SUPPORT  │    │ ↻ Position 4 │     │↻ Position 12 │           │ │
│ │   │[LOOK] [---] │    │[LOOK] [MOVE] │     │[LOOK] [FUEL] │           │ │
│ │   └─────────────┘    └─────────────┘     └─────────────┘           │ │
│ │                                                                     │ │
│ │   ┌─────────────┐    ┌─────────────┐     ┌─────────────┐           │ │
│ │   │🛰️ MILSTAR-4  │    │ 🛰️ ISR-4     │     │🛰️ WARN-5     │           │ │
│ │   │COMM-RELAY   │    │ ↻ Position 8 │     │↻ Position 3  │           │ │
│ │   │[LOOK] [---] │    │[LOOK] [MOVE] │     │[LOOK] [FUEL] │           │ │
│ │   └─────────────┘    └─────────────┘     └─────────────┘           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌─ Intelligence Collection Results ──────────────────────────────────────┐ │
│ │ Recent Observations:                                                │ │
│ │ • Hex 407: Ground Target (Confirmed) - ISR-2 pass at 14:23Z        │ │
│ │ • Hex 203: 4th Gen Fighter (Suspected) - RECON-3 single pass       │ │
│ │ • Hex 156: Mobile SAM (Confirmed) - WARN-5 two-pass ID             │ │
│ │ • Area 15: Naval Formation (3 ships) - ISR-4 wide area scan        │ │
│ │                                                                     │ │
│ │ Recommended Actions:                                                │ │
│ │ • Deploy additional ISR to Hex 203 for confirmation                │ │
│ │ • Task RECON-3 for follow-up on Hex 156 mobile SAM                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌─ Cyber Warfare Assets ──────────────┐ ┌─ Ground Based Radar ────────┐ │
│ │ Cyber Package Alpha: [AVAILABLE]    │ │ GBR-1: FOS-23 (Active)     │ │
│ │ Cyber Package Bravo: [USED]         │ │ GBR-2: FOS-31 (Deploying)  │ │
│ │ Cyber Package Charlie: [AVAILABLE]  │ │ GBR-3: Available           │ │
│ │                                      │ │                             │ │
│ │ [Deploy Cyber Attack]               │ │ [Deploy to FOS]             │ │
│ └──────────────────────────────────────┘ └─────────────────────────────┘ │
│                                                                        │
│ [Close] [Generate Intel Report] [Emergency Tasking]                    │
└────────────────────────────────────────────────────────────────────────┘
```

### **MEDCOM (Medical Command) Dashboard**

**Overlay Type**: Medical facility status board

```
┌─ MEDCOM Operations Dashboard ──────────────────────────────────────────┐
│                                                                        │
│ ┌─ Hospital Network Status ──────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │ Hospital Alpha (Kadena)     [🏥] ⚕️⚕️⚕️○ (18/24 beds)               │ │
│ │ ├─ Green Patients: 12  Yellow: 4  Red: 2                           │ │
│ │ ├─ Tasks: ●●●○ (Surgery, ICU, Pharmacy complete)                    │ │
│ │ ├─ Supply Status: 🩹 Normal 💉 Low 💊 Critical                     │ │
│ │ └─ [Manage] [Request Supplies] [Transfer Patients]                  │ │
│ │                                                                     │ │
│ │ Hospital Bravo (Guam)       [🏥] ⚕️⚕️○○ (14/24 beds)               │ │
│ │ ├─ Green Patients: 8   Yellow: 6  Red: 0                           │ │
│ │ ├─ Tasks: ●●○○ (Surgery, ICU complete)                              │ │
│ │ ├─ Supply Status: 🩹 Normal 💉 Normal 💊 Low                       │ │
│ │ └─ [Manage] [Request Supplies] [Transfer Patients]                  │ │
│ │                                                                     │ │
│ │ Hospital Charlie (Philippines) [🏥] ⚕️○○○ (6/24 beds)               │ │
│ │ ├─ Green Patients: 6   Yellow: 0  Red: 0                           │ │
│ │ ├─ Tasks: ●○○○ (Basic Care only)                                    │ │
│ │ ├─ Supply Status: 🩹 Critical 💉 Low 💊 Empty                       │ │
│ │ └─ [Manage] [Request Supplies] [Transfer Patients]                  │ │
│ │                                                                     │ │
│ │ Hospital Delta (Australia)  [🏥] ○○○○ (0/24 beds) [OFFLINE]        │ │
│ │ ├─ Status: Awaiting Infrastructure Setup                           │ │
│ │ ├─ Required: Power, Medical Equipment, Personnel                    │ │
│ │ └─ [Deploy Assets] [Coordinate with MOB]                           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌─ Active MEDEVAC Operations ────────────────────────────────────────────┐ │
│ │ Flight EVAC05: C-17 → FOS-12 to Kadena (ETA: 45 min)              │ │
│ │ ├─ Passengers: 2 Red, 4 Yellow casualties                          │ │
│ │ ├─ Medical Team: Flight Medic + Surgeon onboard                     │ │
│ │ └─ Destination Prep: OR-2 reserved, blood units ready               │ │
│ │                                                                     │ │
│ │ Flight EVAC06: Pending Approval                                     │ │
│ │ ├─ Route: FOS-23 to Guam Hospital                                   │ │
│ │ ├─ Passengers: 6 Green casualties (non-urgent)                      │ │
│ │ └─ [Approve] [Modify Route] [Cancel]                                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌─ Medical Supply Inventory ──────────────┐ ┌─ Treatment Protocols ────┐ │
│ │ 🩹 Bandages & Dressings: 156/200       │ │ Green: Stabilize (1 turn) │ │
│ │ 💉 IV Fluids & Blood: 89/150           │ │ Yellow: Surgery (2 turns) │ │
│ │ 💊 Medications: 67/100                  │ │ Red: Critical Care (3+)   │ │
│ │ 🩺 Medical Equipment: 12/15             │ │                           │ │
│ │                                          │ │ Auto-discharge when:     │ │
│ │ [Request Resupply] [Emergency Order]    │ │ • Treatment complete      │ │
│ └──────────────────────────────────────────┘ │ • Bed space needed       │ │
│                                              └───────────────────────────┘ │
│                                                                        │
│ [Close] [Generate Medical Report] [Emergency Protocol]                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## **Interactive Elements & Controls**

### **Map Interactions**

**Asset Selection & Movement**
- **Click**: Select unit, highlight available actions and valid destinations
- **Drag**: Move unit to new hex (with range/movement validation)
- **Right-click**: Context menu with unit-specific actions
- **Double-click**: Open detailed unit information dialog

**Hex Grid Features**
- **Hover**: Display hex coordinates and terrain information
- **Click empty hex**: Clear selection, show hex details
- **Range Overlays**: Visual indicators for movement, weapon range, supply lines

**Overlay Controls** (Civilization-style layer toggles)
```
┌─ Map Layers ────────────────┐
│ ☑ Political Boundaries     │
│ ☑ Supply Lines             │
│ ☑ Threat Zones             │
│ ☐ Satellite Coverage       │
│ ☐ Communication Links      │
│ ☑ Airspace Restrictions    │
│ ☐ Weather Overlays         │
└─────────────────────────────┘
```

### **Modal Dialogs**

**Flight Planner Dialog**
```
┌─ Mission Planner ──────────────────────────────────────────────────────┐
│                                                                        │
│ Aircraft Selection:                                                    │
│ ┌─────────────────┐ ┌──────────────────────────────────────────────────┐ │
│ │ [🛩️ F-16C Viper] │ │ Callsign: [SCAR01_________]                      │ │
│ │ Serial: 88-0123  │ │ Mission Type: [Combat Air Patrol ▼]             │ │
│ │ Status: Ready    │ │ Priority: [Routine ▼] [❗ Emergency]             │ │
│ └─────────────────┘ └──────────────────────────────────────────────────┘ │
│                                                                        │
│ Route Planning:                                                        │
│ Origin: [Kadena AB ▼] → Destination: [FOS-23 ▼]                      │
│ └─ Estimated Flight Time: 45 minutes                                  │
│ └─ Fuel Required: 2 tokens ⛽⛽                                        │
│ └─ Range Check: ●●●●○○ (4/6 hexes available)                         │
│                                                                        │
│ Mission Loadout:                                                       │
│ ┌─ Weapons ─────┐ ┌─ Fuel ────────┐ ┌─ Special Equipment ─────────┐     │
│ │ ☑ 💣 Bombs (4) │ │ ☑ 🛢️ Drop Tank │ │ ☐ 📡 Targeting Pod        │     │
│ │ ☑ 🚀 Missiles  │ │ ☑ ⛽ Internal  │ │ ☐ 📻 Jamming Equipment    │     │
│ │ ☐ 🎯 Precision │ │ ☐ 🔗 Buddy Tank│ │ ☑ 🔍 Reconnaissance Pod   │     │
│ └───────────────┘ └───────────────┘ └─────────────────────────────┘     │
│                                                                        │
│ Mission Parameters:                                                    │
│ • Time on Station: [2 hours ▼]                                        │
│ • Altitude: [Medium ▼]  Radio Freq: [tactical_1 ▼]                    │
│ • ROE: [Self Defense ▼]  Bingo Fuel: [25% ▼]                         │
│                                                                        │
│ ⚠ Warnings:                                                           │
│ • Political clearance required for overflight                          │
│ • Weather advisory active for destination area                         │
│                                                                        │
│              [Cancel] [Save Draft] [Submit to ATO]                     │
└────────────────────────────────────────────────────────────────────────┘
```

**Combat Resolution Dialog**
```
┌─ Combat Engagement: Hex 407 ──────────────────────────────────────────┐
│                                                                        │
│           Attacker                        Defender                     │
│    ┌──────────────────────┐        ┌──────────────────────┐            │
│    │    🛩️ F-22 Raptor     │   VS   │    ✈️ J-20 Fighter    │            │
│    │   SCAR01 (Blue)      │        │   Unknown (Red)      │            │
│    │                      │        │                      │            │
│    │ Strength: d20        │        │ Strength: d20        │            │
│    │ Status: Healthy      │        │ Status: Unknown      │            │
│    │ Pilot Skill: Veteran │        │ Pilot Skill: ???     │            │
│    └──────────────────────┘        └──────────────────────┘            │
│                                                                        │
│ Combat Modifiers:                                                      │
│ • Attacker Advantage: +2 (Superior Technology)                        │
│ • Defender Modifier: +0 (Unknown Capabilities)                        │
│ • Terrain Effect: +0 (Open Airspace)                                  │
│ • Weather: -1 (Poor Visibility)                                       │
│                                                                        │
│ ┌─ Dice Results ─────────────────────────────────────────────────────┐  │
│ │ Attacker Roll: [    ] + 1 (net modifier)                           │  │
│ │ Defender Roll: [    ] + 0 (no modifiers)                           │  │
│ │                                                                     │  │
│ │ Result: [Pending...]                                                │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│ Force Package Options:                                                 │
│ ☐ Add wingman F-22 (#002) for coordinated attack (+50% effectiveness) │
│                                                                        │
│                    [Cancel] [Roll Dice] [Auto-Resolve]                 │
└────────────────────────────────────────────────────────────────────────┘
```

### **Turn Management Interface**

**Phase Transition (Civilization-style "Next Turn")**
```
┌─ End Turn Confirmation ────────────────────────────────────────────────┐
│                                                                        │
│ Current Phase: Execution → Next Phase: Resolution                      │
│                                                                        │
│ Outstanding Actions:                                                   │
│ ⚠ 2 flight plans awaiting PPR approval                                │
│ ⚠ FOS-23 task assignment incomplete                                   │
│ ✓ All satellite tasking complete                                      │
│ ✓ Medical transfers processed                                          │
│                                                                        │
│ Automated End-of-Phase Processing:                                     │
│ • Calculate logistics consumption                                      │
│ • Process combat resolutions                                          │
│ • Update satellite positions                                          │
│ • Generate casualty reports                                           │
│ • Award mission/demoralization points                                 │
│                                                                        │
│ [ ] Force advance (ignore outstanding actions)                         │
│                                                                        │
│                  [Cancel] [Wait for Others] [End Phase]                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## **Visual Design Standards**

### **Color Schemes**

**Team Colors (NATO Standard)**
- **Blue Force**: #4A90E2 (Primary), #7BB3F0 (Secondary)
- **Red Force**: #E74C3C (Primary), #F1948A (Secondary)
- **Neutral/Civilian**: #95A5A6 (Primary), #BDC3C7 (Secondary)

**Status Indicators**
- **Operational**: #27AE60 (Green)
- **Limited**: #F39C12 (Amber/Yellow)
- **Non-Operational**: #E74C3C (Red)
- **Unknown**: #95A5A6 (Gray)

**UI Theme Integration**
- **Light Theme**: Clean whites (#FFFFFF), subtle grays (#F8F9FA), accent blues
- **Dark Theme**: Deep charcoals (#2C3E50), midnight blues (#34495E), bright accents

### **Typography Hierarchy**
- **Headers**: Bold, 18-24px, high contrast
- **Body Text**: Regular, 14-16px, readable contrast
- **Labels**: Medium, 12-14px, secondary color
- **Data Values**: Monospace where appropriate (coordinates, times, quantities)

### **Iconography Standards**
- **Military Symbols**: NATO APP-6D standard where applicable
- **UI Icons**: Material Design icons for consistency
- **Asset Representations**: Distinctive silhouettes for easy recognition
- **Status Icons**: Universal symbols (✓, ⚠, ✕, ⏸, ➤)

---

## **Accessibility & Usability**

### **Accessibility Features**
- **Color Blind Support**: Patterns and shapes supplement color coding
- **High Contrast Mode**: Enhanced contrast ratios for all text and UI elements
- **Keyboard Navigation**: Full functionality without mouse/touch input
- **Screen Reader**: Semantic HTML and ARIA labels for assistive technology

### **Military Usability Standards**
- **Low Light Operation**: Dark theme suitable for command center environments
- **Quick Recognition**: Critical information visible at a glance
- **Error Prevention**: Confirmation dialogs for irreversible actions
- **Situational Awareness**: Consistent status indicators across all interfaces

---

## **Technical Implementation Notes**

### **Frontend Technology Stack**
- **Framework**: Angular 18+ with Material Design components
- **State Management**: NgRx for complex state synchronization
- **Mapping**: MapLibre GL JS with H3 hex grid overlay
- **Real-time**: Socket.IO for WebSocket communication
- **Responsive**: Angular Flex Layout for adaptive design

### **Performance Considerations**
- **Virtual Scrolling**: For large data tables (ATO, asset lists)
- **Lazy Loading**: Route-based code splitting for role-specific modules
- **Change Detection**: OnPush strategy for performance optimization
- **Asset Optimization**: Compressed images, tree-shaken bundles

### **Browser Compatibility**
- **Primary**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Fallbacks**: Graceful degradation for older browsers

---

This UI specification provides a comprehensive foundation for implementing a Civilization-inspired interface suitable for the complex military simulation requirements of Operation Pacific Shield.
