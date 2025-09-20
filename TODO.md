# TODO: Implement Location-Specific Jamming System

## Intent
Implement a realistic military communication jamming simulation that targets specific geographic locations rather than entire service types. This enables training scenarios where individual bases or Forward Operating Sites (FOSs) can be independently jammed while others remain operational.

## Current State vs. Required State

### Current System (Service-Based Jamming)
- **Problem**: Jams entire service types globally (e.g., all FOS API calls)
- **Implementation**: `isServiceJammed('fos-api')` affects ALL FOSs
- **Limitation**: Unrealistic - real jamming targets specific locations

### Required System (Location-Specific Jamming)
- **Goal**: Jam individual locations independently
- **Example**: `isLocationJammed('fos-40')` jams only FOS 40, while FOS 39 and 41 remain operational
- **Realism**: Simulates targeted electronic warfare attacks on specific installations

## Architecture Requirements

### New Jamming Flow Pattern
```
Call Backend → Backend Returns IsJammed Error Code →
Frontend Falls Back to LocalStorage → Updates Angular Signals →
UI Renders from Cached Data

If NOT Jammed:
Call Backend → Backend Queries Database → Returns Fresh Data →
Frontend Stores to LocalStorage → Updates Angular Signals →
UI Renders from Fresh Data
```

### Key Components to Implement

#### 1. Enhanced JammingStateService
```typescript
// New methods needed:
jamLocations(locationIds: string[], duration?: number): void
isLocationJammed(locationId: string): boolean
addJammedLocations(locationIds: string[]): void
removeJammedLocations(locationIds: string[]): void
jamLocationsByRegion(region: string, duration?: number): void
deactivateAllJamming(): void
```

#### 2. Updated Service Layer Pattern
Each service (FOS, Player, Game, etc.) should:
- Check location jamming before API calls
- Return "IsJammed" error code when location is jammed
- Fall back to LocalStorage for cached data
- Update Angular signals consistently

#### 3. Location ID Standards
- **FOSs**: `fos-01`, `fos-02`, ..., `fos-45`
- **MOBs**: `kadena-mob`, `yokota-mob`, etc.
- **Regions**: `northern-sector`, `southern-sector`, etc.

## Implementation Tasks

### Phase 1: Core Jamming Service
- [ ] Extend `JammingStateService` with location-based methods
- [ ] Add location jamming state management with signals
- [ ] Implement region-based jamming logic
- [ ] Update jamming debug panel for location controls

### Phase 2: Service Layer Updates
- [ ] Update `FosStateService` to check location jamming
- [ ] Update API services to return "IsJammed" error codes
- [ ] Implement LocalStorage fallback pattern
- [ ] Ensure Angular signals update consistently

### Phase 3: Backend Integration
- [ ] Add location jamming checks to backend controllers
- [ ] Implement "IsJammed" error code responses
- [ ] Add middleware for jamming simulation
- [ ] Update JWT guards to respect location jamming

### Phase 4: UI/UX
- [ ] Update jamming debug panel with location controls
- [ ] Add visual indicators for jammed locations on map
- [ ] Implement jamming status displays in location panels
- [ ] Add jamming scenario presets for training

## Example Usage Scenarios

### Scenario 1: Individual FOS Jamming
```typescript
// Jam only FOS 40 for 15 minutes
jammingStateService.jamLocations(['fos-40'], 15);

// Check if specific FOS is jammed
const isFos40Jammed = jammingStateService.isLocationJammed('fos-40');
const isFos39Jammed = jammingStateService.isLocationJammed('fos-39'); // false
```

### Scenario 2: MOB Jamming
```typescript
// Jam Kadena MOB but leave Yokota operational
jammingStateService.jamLocations(['kadena-mob'], 30);

// All Kadena-based operations use cached data
// Yokota operations continue normally
```

### Scenario 3: Regional Jamming
```typescript
// Jam entire northern sector
jammingStateService.jamLocationsByRegion('northern-sector', 20);

// All FOSs and MOBs in northern region are jammed
// Southern sector remains operational
```

## Testing Requirements

### E2E Testing
- [ ] Test FOS activation under jamming conditions
- [ ] Verify UI updates with cached vs. fresh data
- [ ] Test WebSocket updates with location jamming
- [ ] Validate jamming/restoration scenarios

### Unit Testing
- [ ] Test location jamming logic
- [ ] Test LocalStorage fallback mechanisms
- [ ] Test Angular signal updates
- [ ] Test error code handling

## Configuration Requirements

### Default State
- **No locations jammed by default**
- All services operate normally until jamming is explicitly activated
- Jamming only triggered through debug panel or programmatic calls

### Jamming Parameters
- Location-specific targeting (individual FOSs, MOBs)
- Time-based jamming with automatic restoration
- Regional jamming with configurable boundaries
- Additive/subtractive jamming controls

## Benefits

1. **Realistic Training**: Simulates actual electronic warfare scenarios
2. **Granular Control**: Instructors can jam specific locations for training
3. **Graceful Degradation**: Applications continue functioning with cached data
4. **State Consistency**: Angular signals provide unified reactive interface
5. **Offline Resilience**: LocalStorage pattern supports actual network issues

## Notes

- Current service-based jamming should be migrated to location-based
- Maintain backward compatibility during transition
- Ensure jamming debug panel supports both paradigms during migration
- Document location ID conventions for consistent usage