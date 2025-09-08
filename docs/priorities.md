# Operation Pacific Shield - Development Priorities

## Executive Summary

Based on evaluation of the milestones, design document, user guide, and game methods, the project has completed foundational setup (Phase 0) and begun Phase 1 visualization. However, core gameplay mechanics remain largely unimplemented. The critical path to a functional game focuses on completing the game board visualization and implementing basic asset movement and interaction systems.

## Current Status Assessment

### Completed (Phase 0 - Foundation)
- ✅ Monorepo setup with Git branching strategy
- ✅ Backend (NestJS/Prisma/PostgreSQL) with complete schema
- ✅ Frontend (Angular/NgRx) with basic structure
- ✅ WebSocket integration and authentication flow
- ✅ Basic UI scaffolding and routing

### Partially Complete (Phase 1 - Visualization)

- ✅ Basic game board component structure
- ❌ h3-js map integration
- ❌ Hex grid overlay
- ❌ GameTokenComponent for assets
- ❌ Backend data integration for game state

### Pending (Phases 2-4)

- ❌ Asset movement mechanics
- ❌ ATO (Air Tasking Order) system
- ❌ Combat adjudication
- ❌ Role-based UI restrictions
- ❌ End-of-turn automation
- ❌ Scoring and victory conditions

## Priority Matrix

### P0 - Critical (Must Complete for Functional Game)

1. **Complete Game Board Visualization**

   - Integrate MapLibre GL for Pacific region map display
   - Implement h3-js hex grid overlay with programmatic hex identification
   - Create GameTokenComponent with asset rendering logic
   - Integrate backend game state data via NgRx effects
   - Display aircraft, ground units, and threat tokens on board

2. **Basic Asset Movement System**

   - Implement drag-and-drop for asset tokens
   - Create movement validation logic (range, political access)
   - Backend WebSocket handling for move requests
   - Real-time state updates across all clients
   - Basic range and movement restrictions

3. **Core ATO Implementation**
   - Interactive AtoTableComponent for flight planning
   - FlightPlannerDialogComponent for creating sorties
   - Backend validation and storage of ATO lines
   - PPR (Prior Permission Required) approval system
   - Basic aircraft allocation from CAOC

### P1 - High Priority (Essential Gameplay Features)

4. **FOS Management System**
   - RFI (Request for Information) request and response system
   - Task completion mechanics with personnel assignment
   - Commodity management and logistics tax calculation
   - MOG (Maximum on Ground) enforcement

5. **Basic Combat System**
   - Combat dialog for asset engagement
   - Dice roll mechanics and outcome resolution
   - Asset destruction and state updates
   - Force packaging for multi-aircraft attacks

6. **Role-Based Access Control**
   - Conditional UI rendering based on player roles
   - Backend validation for role-specific actions
   - Team ownership restrictions

### P2 - Medium Priority (Enhanced Gameplay)

7. **CSpOC Satellite System**
   - Satellite placement and movement mechanics
   - "Look" actions and information gathering
   - Orbital warfare capabilities
   - Cyber package deployment

8. **MEDCOM Medical System**
   - Hospital management and patient tracking
   - MEDEVAC flight planning
   - Casualty generation and treatment
   - Medical supply logistics

9. **End-of-Turn Automation**
   - Logistics tax calculation
   - Demoralization and mission point scoring
   - Game turn advancement
   - Automated satellite movement

### P3 - Low Priority (Polish and Advanced Features)

10. **Advanced UI/UX**
    - Game log component for event tracking
    - Notification system for real-time feedback
    - Tooltips and help systems
    - Dark/light theme refinements

11. **Game Master Interface**
    - Manual state editing capabilities
    - Event/Risk card triggering
    - Game session management tools

12. **Containerization and Deployment**
    - Docker setup for development
    - CI/CD pipeline configuration
    - Production deployment preparation

## Critical Path Dependencies

### Minimum Viable Game (MVG) Requirements
To achieve a functional game where players can:
- Join a game session
- View the game board with assets
- Move basic units
- Execute simple combat
- Track basic scoring

**Must Complete Before MVG:**
1. Game board visualization (P0 #1)
2. Basic asset movement (P0 #2)
3. Core ATO system (P0 #3)
4. Basic combat (P1 #5)
5. Role-based access (P1 #6)

### Technical Dependencies
- **Frontend-Backend Integration:** All P0 items require robust WebSocket communication
- **State Management:** NgRx store must handle complex game state updates
- **Real-time Synchronization:** WebSocket events must propagate to all connected clients
- **Validation Logic:** Server-side validation critical for game integrity

## Risk Assessment

### High Risk Items
- **Complex State Synchronization:** Real-time multiplayer state management
- **Performance:** Large game board with many assets and real-time updates
- **Rule Complexity:** Implementing all game rules accurately

### Mitigation Strategies
- Implement incremental validation and testing
- Use automated testing for critical game logic
- Start with simplified rules, add complexity iteratively
- Regular playtesting with actual game rules

## Success Metrics

### Functional Game Milestones
1. **Board Display:** Players can see complete game state on map
2. **Basic Movement:** Assets can be moved with proper validation
3. **Simple Combat:** Basic engagement resolution working
4. **Multiplayer Sync:** Real-time updates across all players
5. **Scoring:** Basic MP/DP tracking functional

### Quality Gates
- All P0 items completed and tested
- Core game loop (plan → execute → resolve) functional
- Basic win condition achievable
- No critical bugs in core mechanics

## Next Steps

1. **Immediate Action:** Complete game board visualization (P0 #1)
2. **Short Term:** Implement basic movement system (P0 #2)
3. **Medium Term:** Add ATO system and combat (P0 #3, P1 #5)
4. **Testing:** Regular playtesting after each major feature
5. **Iteration:** Use feedback to refine priorities

This prioritization focuses on delivering a functional game core first, then building outward to full feature completeness.
