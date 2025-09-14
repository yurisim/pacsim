# Aircraft Allocation Communication & Notification System

## Overview

This document describes the comprehensive real-time communication and notification system implemented for CFACC-MOB aircraft allocation coordination. The system enables immediate communication of allocation decisions between CFACC strategic command and MOB operational teams.

## System Architecture

### Backend Components

#### 1. AllocationNotificationService
- **Location**: [`apps/pac-shield-api/src/app/allocation/allocation-notification.service.ts`](apps/pac-shield-api/src/app/allocation/allocation-notification.service.ts)
- **Purpose**: Central notification management and delivery
- **Features**:
  - Multiple notification types (REQUEST_SUBMITTED, REQUEST_REVIEWED, AIRCRAFT_ALLOCATED, etc.)
  - Team-specific targeting and broadcasting
  - Priority-based notification handling
  - Audit trail logging for compliance
  - Integration with GameGateway for WebSocket delivery

#### 2. Enhanced GameGateway
- **Location**: [`apps/pac-shield-api/src/game/game.gateway.ts`](apps/pac-shield-api/src/game/game.gateway.ts)
- **Features Added**:
  - Allocation-specific WebSocket events
  - Team-specific room management
  - Notification acknowledgment handling
  - Real-time broadcast methods for all allocation events

#### 3. Integrated AllocationService
- **Location**: [`apps/pac-shield-api/src/app/allocation/allocation.service.ts`](apps/pac-shield-api/src/app/allocation/allocation.service.ts)
- **Integration Points**:
  - Triggers notifications on all allocation decisions
  - WebSocket broadcasts for immediate updates
  - Automatic notification on request review, allocation, and deallocation

### Frontend Components

#### 1. NgRx Store Extensions
- **State**: [`apps/pac-shield/src/app/store/allocation/allocation.state.ts`](apps/pac-shield/src/app/store/allocation/allocation.state.ts)
  - Added notification state management
  - Unread count tracking
  - Acknowledgment status
- **Actions**: [`apps/pac-shield/src/app/store/allocation/allocation.actions.ts`](apps/pac-shield/src/app/store/allocation/allocation.actions.ts)
  - Comprehensive notification actions
  - WebSocket event handlers
  - Acknowledgment and read status management
- **Selectors**: [`apps/pac-shield/src/app/store/allocation/allocation.selectors.ts`](apps/pac-shield/src/app/store/allocation/allocation.selectors.ts)
  - Rich notification queries
  - Priority filtering
  - Statistics and analytics
- **Effects**: [`apps/pac-shield/src/app/store/allocation/allocation.effects.ts`](apps/pac-shield/src/app/store/allocation/allocation.effects.ts)
  - WebSocket event handling
  - Notification acknowledgment processing

#### 2. Notification Components
- **Toast Component**: [`apps/pac-shield/src/app/features/game/notifications/allocation-notification-toast/`](apps/pac-shield/src/app/features/game/notifications/allocation-notification-toast/)
  - Real-time popup notifications
  - Priority-based styling
  - Auto-dismiss and manual controls
- **Badge Component**: [`apps/pac-shield/src/app/features/game/notifications/allocation-notification-badge/`](apps/pac-shield/src/app/features/game/notifications/allocation-notification-badge/)
  - Unread notification indicators
  - Priority-based visual alerts
  - Accessibility compliant
- **Notification Center**: [`apps/pac-shield/src/app/features/game/notifications/allocation-notification-center/`](apps/pac-shield/src/app/features/game/notifications/allocation-notification-center/)
  - Complete notification history
  - Filtering by read/unread/action required
  - Bulk actions (mark all read, clear all)

#### 3. WebSocket Service
- **Location**: [`apps/pac-shield/src/app/shared/services/allocation-websocket.service.ts`](apps/pac-shield/src/app/shared/services/allocation-websocket.service.ts)
- **Features**:
  - Real-time event handling
  - Automatic reconnection with exponential backoff
  - Team-specific room management
  - Connection status monitoring

#### 4. Dashboard Integration
- **MOB Dashboard**: [`apps/pac-shield/src/app/features/game/game-stats/mob-dashboard/`](apps/pac-shield/src/app/features/game/game-stats/mob-dashboard/)
  - Notification badge in header
  - Toast notifications for allocation updates
  - Urgent notification snackbar alerts
- **CAOC Dashboard**: [`apps/pac-shield/src/app/features/game/game-stats/caoc-dashboard/`](apps/pac-shield/src/app/features/game/game-stats/caoc-dashboard/)
  - Request submission notifications
  - Allocation confirmation feedback
  - Pool update notifications

## Communication Workflow

### 1. MOB Request Submission
```
MOB submits request → AllocationService.createAircraftRequest() 
→ AllocationNotificationService.notifyRequestSubmitted() 
→ WebSocket broadcast to CAOC team room
→ CFACC receives real-time notification
```

### 2. CFACC Decision Process
```
CFACC reviews request → AllocationService.reviewAircraftRequest()
→ AllocationNotificationService.notifyRequestReviewed()
→ WebSocket broadcast to requesting MOB team room
→ MOB receives decision notification with details
```

### 3. Aircraft Allocation
```
CFACC allocates aircraft → AllocationService.createAircraftAllocation()
→ AllocationNotificationService.notifyAircraftAllocated()
→ WebSocket broadcast to allocated team room
→ MOB receives aircraft allocation notification
```

### 4. Pool Updates
```
Turn advancement → AircraftPoolService.refreshAircraftPool()
→ AllocationNotificationService.notifyAircraftPoolUpdated()
→ WebSocket broadcast to all teams
→ All teams receive pool status updates
```

## Notification Types

### 1. REQUEST_SUBMITTED
- **Target**: CAOC teams
- **Trigger**: MOB submits new aircraft request
- **Priority**: Based on request priority (1=URGENT, 2=HIGH, 3=NORMAL, 4-5=LOW)
- **Data**: Request details, team name, aircraft type, quantity

### 2. REQUEST_REVIEWED
- **Target**: Requesting MOB team
- **Trigger**: CFACC reviews request (approve/deny/modify)
- **Priority**: HIGH for denials, NORMAL for approvals
- **Data**: Decision status, allocated quantity, CFACC notes
- **Requires Acknowledgment**: Yes

### 3. AIRCRAFT_ALLOCATED
- **Target**: Allocated MOB team
- **Trigger**: Specific aircraft assigned to team
- **Priority**: HIGH
- **Data**: Aircraft call sign, type, allocation details
- **Requires Acknowledgment**: Yes

### 4. AIRCRAFT_DEALLOCATED
- **Target**: Previously allocated MOB team
- **Trigger**: Aircraft returned to pool
- **Priority**: NORMAL
- **Data**: Aircraft call sign, reason for return

### 5. ALLOCATION_CYCLE_STATUS_CHANGED
- **Target**: All teams (MOB + CAOC)
- **Trigger**: Cycle status changes (PENDING → REQUESTS_OPEN → ANALYSIS → ALLOCATED → CLOSED)
- **Priority**: NORMAL
- **Data**: New status, turn information

### 6. AIRCRAFT_POOL_UPDATED
- **Target**: All teams
- **Trigger**: Pool refresh, USTRANSCOM deliveries, maintenance changes
- **Priority**: LOW
- **Data**: Updated pool statistics by aircraft type

## WebSocket Events

### Server → Client Events
- `allocationNotification` - Primary notification delivery
- `allocationCycleCreated` - New allocation cycle
- `allocationCycleStatusChanged` - Cycle status updates
- `aircraftRequestCreated` - New request submitted
- `aircraftRequestUpdated` - Request modifications
- `aircraftRequestDeleted` - Request withdrawal
- `aircraftRequestReviewed` - CFACC decision
- `aircraftAllocated` - Aircraft allocation
- `aircraftDeallocated` - Aircraft returned to pool
- `aircraftPoolUpdated` - Pool status changes

### Client → Server Events
- `allocationNotificationAck` - Acknowledge notification
- `requestAllocationRefresh` - Request data refresh

## Room Management

### Game-Level Room
- **Pattern**: `{gameId}`
- **Purpose**: General allocation events
- **Members**: All players in the game

### Team-Specific Rooms
- **Pattern**: `{gameId}-team-{teamId}`
- **Purpose**: Targeted notifications
- **Members**: Players from specific team

## User Interface Integration

### Notification Badge
- Displays unread notification count
- Priority-based visual indicators (urgent = red pulse)
- Click to open notification center
- Accessibility compliant with ARIA labels

### Toast Notifications
- Immediate popup for new notifications
- Priority-based styling and behavior
- Auto-dismiss for low priority (8 seconds)
- Manual controls for urgent notifications
- Acknowledgment buttons for action-required notifications

### Notification Center
- Complete notification history
- Filtering tabs: All, Unread, Action Required
- Bulk operations (mark all read, clear all)
- Detailed notification views with metadata

## Security & Permissions

### Team-Based Access Control
- MOB teams receive notifications for their requests and allocations
- CAOC receives all request submissions and general updates
- Team rooms prevent cross-team notification leakage

### Acknowledgment Requirements
- High-priority notifications require acknowledgment
- Acknowledgment status tracked for audit compliance
- Automatic acknowledgment broadcasting for team coordination

## Error Handling & Reliability

### Connection Management
- Automatic reconnection with exponential backoff
- Maximum retry attempts (5) with graceful degradation
- Connection status monitoring and user feedback

### Notification Queuing
- WebSocket service handles connection interruptions
- Notifications delivered when connection restored
- No message loss during brief disconnections

### Fallback Mechanisms
- Snackbar alerts for critical notifications
- Visual indicators persist until acknowledged
- Notification center provides complete history

## Testing Strategy

### Unit Tests
- Component behavior testing
- NgRx store action/reducer testing
- Service method testing

### Integration Tests
- WebSocket event flow testing
- End-to-end notification delivery
- Cross-team communication verification

### E2E Test Scenarios
1. **MOB Request Flow**:
   - MOB submits request → CAOC receives notification
   - CFACC approves → MOB receives approval notification
   - Acknowledgment tracked correctly

2. **CFACC Allocation Flow**:
   - CFACC allocates aircraft → MOB receives allocation notification
   - MOB acknowledges → Acknowledgment registered
   - Aircraft shows in MOB inventory

3. **Pool Update Flow**:
   - Turn advances → Pool refreshed
   - All teams receive pool update notifications
   - Statistics updated correctly

## Performance Considerations

### Optimization Features
- Component OnPush change detection
- Observable memoization via selectors
- Efficient WebSocket event handling
- Notification list virtualization for large histories

### Scalability
- Room-based broadcasting reduces network overhead
- Targeted notifications minimize irrelevant updates
- Notification pruning prevents unlimited growth

## Audit Trail & Compliance

### Notification Logging
- All notifications logged with timestamp and delivery status
- Target team tracking for accountability
- Acknowledgment timestamps recorded
- Communication history maintained

### Data Retention
- Notification persistence for audit requirements
- Team-based access to historical communications
- Integration with existing allocation audit trail

## Configuration

### Environment Variables
- WebSocket connection URLs
- Reconnection timing parameters
- Notification retention policies
- Priority escalation thresholds

### Customization Options
- Notification display duration
- Priority color schemes
- Sound alerts (configurable)
- Auto-acknowledge settings for non-critical notifications

This system provides comprehensive real-time communication capabilities that mirror actual military coordination protocols while maintaining technical robustness and user experience excellence.
