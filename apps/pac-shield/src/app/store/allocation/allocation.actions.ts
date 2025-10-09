import { createAction, props } from '@ngrx/store';
import { AllocationCycle } from '../../generated/allocationCycle/allocationCycle.entity';
import { AircraftRequest } from '../../generated/aircraftRequest/aircraftRequest.entity';
import { AircraftAllocation } from '../../generated/aircraftAllocation/aircraftAllocation.entity';
import { AircraftInstance } from '../../generated/aircraftInstance/aircraftInstance.entity';
import {
  AllocationCycleStatus,
  AllocationRequestStatus,
  AircraftType
} from '../../generated/enums';

// =============================================
//            ALLOCATION CYCLE ACTIONS
// =============================================

export const loadLatestAllocationCycle = createAction(
  '[Allocation] Load Latest Allocation Cycle',
  props<{ gameId: number }>()
);

export const loadLatestAllocationCycleSuccess = createAction(
  '[Allocation] Load Latest Allocation Cycle Success',
  props<{ cycle: AllocationCycle | null }>()
);

export const loadLatestAllocationCycleFailure = createAction(
  '[Allocation] Load Latest Allocation Cycle Failure',
  props<{ error: string }>()
);

export const createAllocationCycle = createAction(
  '[Allocation] Create Allocation Cycle',
  props<{ gameId: number; turn: number }>()
);

export const createAllocationCycleSuccess = createAction(
  '[Allocation] Create Allocation Cycle Success',
  props<{ cycle: AllocationCycle }>()
);

export const createAllocationCycleFailure = createAction(
  '[Allocation] Create Allocation Cycle Failure',
  props<{ error: string }>()
);

export const updateAllocationCycleStatus = createAction(
  '[Allocation] Update Allocation Cycle Status',
  props<{ cycleId: number; status: AllocationCycleStatus }>()
);

export const updateAllocationCycleStatusSuccess = createAction(
  '[Allocation] Update Allocation Cycle Status Success',
  props<{ cycle: AllocationCycle }>()
);

export const updateAllocationCycleStatusFailure = createAction(
  '[Allocation] Update Allocation Cycle Status Failure',
  props<{ error: string }>()
);

// =============================================
//            AIRCRAFT POOL ACTIONS
// =============================================

export const loadUnallocatedAircraftPool = createAction(
  '[Allocation] Load Unallocated Aircraft Pool',
  props<{ gameId: number; turn?: number }>()
);

export const loadUnallocatedAircraftPoolSuccess = createAction(
  '[Allocation] Load Unallocated Aircraft Pool Success',
  props<{ aircraft: AircraftInstance[] }>()
);

export const loadUnallocatedAircraftPoolFailure = createAction(
  '[Allocation] Load Unallocated Aircraft Pool Failure',
  props<{ error: string }>()
);

// =============================================
//            AIRCRAFT REQUEST ACTIONS
// =============================================

export const loadRequestsForCycle = createAction(
  '[Allocation] Load Requests For Cycle',
  props<{ cycleId: number }>()
);

export const loadRequestsForCycleSuccess = createAction(
  '[Allocation] Load Requests For Cycle Success',
  props<{ requests: AircraftRequest[] }>()
);

export const loadRequestsForCycleFailure = createAction(
  '[Allocation] Load Requests For Cycle Failure',
  props<{ error: string }>()
);

export const loadRequestsForTeam = createAction(
  '[Allocation] Load Requests For Team',
  props<{ teamId: number }>()
);

export const loadRequestsForTeamSuccess = createAction(
  '[Allocation] Load Requests For Team Success',
  props<{ requests: AircraftRequest[] }>()
);

export const loadRequestsForTeamFailure = createAction(
  '[Allocation] Load Requests For Team Failure',
  props<{ error: string }>()
);

export const createAircraftRequest = createAction(
  '[Allocation] Create Aircraft Request',
  props<{
    allocationCycleId: number;
    teamId: number;
    aircraftType: AircraftType;
    quantityRequested: number;
    missionJustification: string;
    priority: number;
    rationale: string;
  }>()
);

export const createAircraftRequestSuccess = createAction(
  '[Allocation] Create Aircraft Request Success',
  props<{ request: AircraftRequest }>()
);

export const createAircraftRequestFailure = createAction(
  '[Allocation] Create Aircraft Request Failure',
  props<{ error: string }>()
);

export const updateAircraftRequest = createAction(
  '[Allocation] Update Aircraft Request',
  props<{
    requestId: number;
    updates: {
      quantityRequested?: number;
      missionJustification?: string;
      priority?: number;
      rationale?: string;
    };
  }>()
);

export const updateAircraftRequestSuccess = createAction(
  '[Allocation] Update Aircraft Request Success',
  props<{ request: AircraftRequest }>()
);

export const updateAircraftRequestFailure = createAction(
  '[Allocation] Update Aircraft Request Failure',
  props<{ error: string }>()
);

export const deleteAircraftRequest = createAction(
  '[Allocation] Delete Aircraft Request',
  props<{ requestId: number }>()
);

export const deleteAircraftRequestSuccess = createAction(
  '[Allocation] Delete Aircraft Request Success',
  props<{ requestId: number }>()
);

export const deleteAircraftRequestFailure = createAction(
  '[Allocation] Delete Aircraft Request Failure',
  props<{ error: string }>()
);

// =============================================
//            CFACC ALLOCATION ACTIONS
// =============================================

export const reviewAircraftRequest = createAction(
  '[Allocation] Review Aircraft Request',
  props<{
    requestId: number;
    status: AllocationRequestStatus;
    quantityAllocated?: number;
    cfaccNotes?: string;
  }>()
);

export const reviewAircraftRequestSuccess = createAction(
  '[Allocation] Review Aircraft Request Success',
  props<{ request: AircraftRequest }>()
);

export const reviewAircraftRequestFailure = createAction(
  '[Allocation] Review Aircraft Request Failure',
  props<{ error: string }>()
);

export const createAircraftAllocation = createAction(
  '[Allocation] Create Aircraft Allocation',
  props<{
    allocationCycleId: number;
    aircraftRequestId: number;
    aircraftInstanceId: number;
    allocatedToTeamId: number;
  }>()
);

export const createAircraftAllocationSuccess = createAction(
  '[Allocation] Create Aircraft Allocation Success',
  props<{ allocation: AircraftAllocation }>()
);

export const createAircraftAllocationFailure = createAction(
  '[Allocation] Create Aircraft Allocation Failure',
  props<{ error: string }>()
);

export const deleteAircraftAllocation = createAction(
  '[Allocation] Delete Aircraft Allocation',
  props<{ allocationId: number }>()
);

export const deleteAircraftAllocationSuccess = createAction(
  '[Allocation] Delete Aircraft Allocation Success',
  props<{ allocationId: number }>()
);

export const deleteAircraftAllocationFailure = createAction(
  '[Allocation] Delete Aircraft Allocation Failure',
  props<{ error: string }>()
);

export const loadAllocationsForCycle = createAction(
  '[Allocation] Load Allocations For Cycle',
  props<{ cycleId: number }>()
);

export const loadAllocationsForCycleSuccess = createAction(
  '[Allocation] Load Allocations For Cycle Success',
  props<{ allocations: AircraftAllocation[] }>()
);

export const loadAllocationsForCycleFailure = createAction(
  '[Allocation] Load Allocations For Cycle Failure',
  props<{ error: string }>()
);

// =============================================
//            FORM MANAGEMENT ACTIONS
// =============================================

export const updateRequestForm = createAction(
  '[Allocation] Update Request Form',
  props<{
    allocationCycleId?: number;
    teamId?: number;
    aircraftType?: AircraftType;
    quantityRequested?: number;
    missionJustification?: string;
    priority?: number;
    rationale?: string;
  }>()
);

export const resetRequestForm = createAction(
  '[Allocation] Reset Request Form'
);

export const clearAllocationErrors = createAction(
  '[Allocation] Clear Allocation Errors'
);

// =============================================
//            WEBSOCKET EVENTS
// =============================================

export const allocationCycleCreated = createAction(
  '[Allocation WebSocket] Allocation Cycle Created',
  props<{ cycle: AllocationCycle }>()
);

export const allocationCycleStatusChanged = createAction(
  '[Allocation WebSocket] Allocation Cycle Status Changed',
  props<{ cycle: AllocationCycle }>()
);

export const aircraftRequestCreated = createAction(
  '[Allocation WebSocket] Aircraft Request Created',
  props<{ request: AircraftRequest }>()
);

export const aircraftRequestUpdated = createAction(
  '[Allocation WebSocket] Aircraft Request Updated',
  props<{ request: AircraftRequest }>()
);

export const aircraftRequestDeleted = createAction(
  '[Allocation WebSocket] Aircraft Request Deleted',
  props<{ requestId: number }>()
);

export const aircraftRequestReviewed = createAction(
  '[Allocation WebSocket] Aircraft Request Reviewed',
  props<{ request: AircraftRequest }>()
);

export const aircraftAllocated = createAction(
  '[Allocation WebSocket] Aircraft Allocated',
  props<{ allocation: AircraftAllocation }>()
);

export const aircraftDeallocated = createAction(
  '[Allocation WebSocket] Aircraft Deallocated',
  props<{ allocationId: number; aircraftCallSign: string }>()
);

// =============================================
//            BULK OPERATIONS
// =============================================

export const refreshAllocationData = createAction(
  '[Allocation] Refresh Allocation Data',
  props<{ gameId: number }>()
);

// =============================================
//            WEBSOCKET CONNECTION MANAGEMENT
// =============================================

export const initializeAllocationWebSocket = createAction(
  '[Allocation] Initialize WebSocket Connection',
  props<{ gameId: number; teamId?: number }>()
);

export const allocationWebSocketConnected = createAction(
  '[Allocation WebSocket] Connected'
);

export const allocationWebSocketDisconnected = createAction(
  '[Allocation WebSocket] Disconnected'
);

export const allocationWebSocketError = createAction(
  '[Allocation WebSocket] Error',
  props<{ error: string }>()
);
