import { createReducer, on } from '@ngrx/store';
import { initialAllocationState } from './allocation.state';
import * as AllocationActions from './allocation.actions';

export const allocationReducer = createReducer(
  initialAllocationState,

  // =============================================
  //            ALLOCATION CYCLE REDUCERS
  // =============================================

  on(AllocationActions.loadLatestAllocationCycle, (state) => ({
    ...state,
    ui: {
      ...state.ui,
      cycleLoading: true,
      cycleError: null,
    },
  })),

  on(AllocationActions.loadLatestAllocationCycleSuccess, (state, { cycle }) => ({
    ...state,
    currentCycle: cycle,
    ui: {
      ...state.ui,
      cycleLoading: false,
      cycleError: null,
    },
  })),

  on(AllocationActions.loadLatestAllocationCycleFailure, (state, { error }) => ({
    ...state,
    ui: {
      ...state.ui,
      cycleLoading: false,
      cycleError: error,
    },
  })),

  on(AllocationActions.createAllocationCycle, (state) => ({
    ...state,
    ui: {
      ...state.ui,
      cycleLoading: true,
      cycleError: null,
    },
  })),

  on(AllocationActions.createAllocationCycleSuccess, (state, { cycle }) => ({
    ...state,
    currentCycle: cycle,
    ui: {
      ...state.ui,
      cycleLoading: false,
      cycleError: null,
    },
  })),

  on(AllocationActions.createAllocationCycleFailure, (state, { error }) => ({
    ...state,
    ui: {
      ...state.ui,
      cycleLoading: false,
      cycleError: error,
    },
  })),

  on(AllocationActions.updateAllocationCycleStatus, (state) => ({
    ...state,
    ui: {
      ...state.ui,
      cycleLoading: true,
      cycleError: null,
    },
  })),

  on(AllocationActions.updateAllocationCycleStatusSuccess, (state, { cycle }) => ({
    ...state,
    currentCycle: cycle,
    ui: {
      ...state.ui,
      cycleLoading: false,
      cycleError: null,
    },
  })),

  on(AllocationActions.updateAllocationCycleStatusFailure, (state, { error }) => ({
    ...state,
    ui: {
      ...state.ui,
      cycleLoading: false,
      cycleError: error,
    },
  })),

  // =============================================
  //            AIRCRAFT POOL REDUCERS
  // =============================================

  on(AllocationActions.loadUnallocatedAircraftPool, (state) => ({
    ...state,
    ui: {
      ...state.ui,
      poolLoading: true,
      poolError: null,
    },
  })),

  on(AllocationActions.loadUnallocatedAircraftPoolSuccess, (state, { aircraft }) => ({
    ...state,
    unallocatedPool: aircraft,
    ui: {
      ...state.ui,
      poolLoading: false,
      poolError: null,
    },
  })),

  on(AllocationActions.loadUnallocatedAircraftPoolFailure, (state, { error }) => ({
    ...state,
    ui: {
      ...state.ui,
      poolLoading: false,
      poolError: error,
    },
  })),

  // =============================================
  //            AIRCRAFT REQUEST REDUCERS
  // =============================================

  on(AllocationActions.loadRequestsForCycle, (state) => ({
    ...state,
    ui: {
      ...state.ui,
      requestsLoading: true,
      requestsError: null,
    },
  })),

  on(AllocationActions.loadRequestsForCycleSuccess, (state, { requests }) => ({
    ...state,
    requests,
    ui: {
      ...state.ui,
      requestsLoading: false,
      requestsError: null,
    },
  })),

  on(AllocationActions.loadRequestsForCycleFailure, (state, { error }) => ({
    ...state,
    ui: {
      ...state.ui,
      requestsLoading: false,
      requestsError: error,
    },
  })),

  on(AllocationActions.loadRequestsForTeam, (state) => ({
    ...state,
    ui: {
      ...state.ui,
      requestsLoading: true,
      requestsError: null,
    },
  })),

  on(AllocationActions.loadRequestsForTeamSuccess, (state, { requests }) => ({
    ...state,
    requests,
    ui: {
      ...state.ui,
      requestsLoading: false,
      requestsError: null,
    },
  })),

  on(AllocationActions.loadRequestsForTeamFailure, (state, { error }) => ({
    ...state,
    ui: {
      ...state.ui,
      requestsLoading: false,
      requestsError: error,
    },
  })),

  on(AllocationActions.createAircraftRequest, (state) => ({
    ...state,
    ui: {
      ...state.ui,
      submittingRequest: true,
      formError: null,
    },
  })),

  on(AllocationActions.createAircraftRequestSuccess, (state, { request }) => ({
    ...state,
    requests: [...state.requests, request],
    ui: {
      ...state.ui,
      submittingRequest: false,
      formError: null,
    },
  })),

  on(AllocationActions.createAircraftRequestFailure, (state, { error }) => ({
    ...state,
    ui: {
      ...state.ui,
      submittingRequest: false,
      formError: error,
    },
  })),

  on(AllocationActions.updateAircraftRequest, (state) => ({
    ...state,
    ui: {
      ...state.ui,
      updatingRequest: true,
      formError: null,
    },
  })),

  on(AllocationActions.updateAircraftRequestSuccess, (state, { request }) => ({
    ...state,
    requests: state.requests.map(r => r.id === request.id ? request : r),
    ui: {
      ...state.ui,
      updatingRequest: false,
      formError: null,
    },
  })),

  on(AllocationActions.updateAircraftRequestFailure, (state, { error }) => ({
    ...state,
    ui: {
      ...state.ui,
      updatingRequest: false,
      formError: error,
    },
  })),

  on(AllocationActions.deleteAircraftRequest, (state) => ({
    ...state,
    ui: {
      ...state.ui,
      deletingRequest: true,
      formError: null,
    },
  })),

  on(AllocationActions.deleteAircraftRequestSuccess, (state, { requestId }) => ({
    ...state,
    requests: state.requests.filter(r => r.id !== requestId),
    ui: {
      ...state.ui,
      deletingRequest: false,
      formError: null,
    },
  })),

  on(AllocationActions.deleteAircraftRequestFailure, (state, { error }) => ({
    ...state,
    ui: {
      ...state.ui,
      deletingRequest: false,
      formError: error,
    },
  })),

  // =============================================
  //            CFACC ALLOCATION REDUCERS
  // =============================================

  on(AllocationActions.reviewAircraftRequestSuccess, (state, { request }) => ({
    ...state,
    requests: state.requests.map(r => r.id === request.id ? request : r),
  })),

  on(AllocationActions.createAircraftAllocationSuccess, (state, { allocation }) => ({
    ...state,
    allocations: [...state.allocations, allocation],
    // Update the unallocated pool by removing the allocated aircraft
    unallocatedPool: state.unallocatedPool.filter(a => a.id !== allocation.aircraftInstanceId),
  })),

  on(AllocationActions.deleteAircraftAllocationSuccess, (state, { allocationId }) => ({
    ...state,
    allocations: state.allocations.filter(a => a.id !== allocationId),
    // Note: We don't add the aircraft back to the pool here, that will be handled by a refresh
  })),

  on(AllocationActions.loadAllocationsForCycle, (state) => ({
    ...state,
    ui: {
      ...state.ui,
      allocationsLoading: true,
      allocationsError: null,
    },
  })),

  on(AllocationActions.loadAllocationsForCycleSuccess, (state, { allocations }) => ({
    ...state,
    allocations,
    ui: {
      ...state.ui,
      allocationsLoading: false,
      allocationsError: null,
    },
  })),

  on(AllocationActions.loadAllocationsForCycleFailure, (state, { error }) => ({
    ...state,
    ui: {
      ...state.ui,
      allocationsLoading: false,
      allocationsError: error,
    },
  })),

  // =============================================
  //            FORM MANAGEMENT REDUCERS
  // =============================================

  on(AllocationActions.updateRequestForm, (state, formUpdates) => ({
    ...state,
    requestForm: {
      ...state.requestForm,
      ...formUpdates,
    },
  })),

  on(AllocationActions.resetRequestForm, (state) => ({
    ...state,
    requestForm: initialAllocationState.requestForm,
  })),

  on(AllocationActions.clearAllocationErrors, (state) => ({
    ...state,
    ui: {
      ...state.ui,
      cycleError: null,
      requestsError: null,
      allocationsError: null,
      poolError: null,
      formError: null,
    },
  })),

  // =============================================
  //            WEBSOCKET EVENT REDUCERS
  // =============================================

  on(AllocationActions.allocationCycleCreated, (state, { cycle }) => ({
    ...state,
    currentCycle: cycle,
  })),

  on(AllocationActions.allocationCycleStatusChanged, (state, { cycle }) => ({
    ...state,
    currentCycle: cycle,
  })),

  on(AllocationActions.aircraftRequestCreated, (state, { request }) => ({
    ...state,
    requests: [...state.requests, request],
  })),

  on(AllocationActions.aircraftRequestUpdated, (state, { request }) => ({
    ...state,
    requests: state.requests.map(r => r.id === request.id ? request : r),
  })),

  on(AllocationActions.aircraftRequestDeleted, (state, { requestId }) => ({
    ...state,
    requests: state.requests.filter(r => r.id !== requestId),
  })),

  on(AllocationActions.aircraftRequestReviewed, (state, { request }) => ({
    ...state,
    requests: state.requests.map(r => r.id === request.id ? request : r),
  })),

  on(AllocationActions.aircraftAllocated, (state, { allocation }) => ({
    ...state,
    allocations: [...state.allocations, allocation],
    unallocatedPool: state.unallocatedPool.filter(a => a.id !== allocation.aircraftInstanceId),
  })),

  on(AllocationActions.aircraftDeallocated, (state, { allocationId }) => ({
    ...state,
    allocations: state.allocations.filter(a => a.id !== allocationId),
    // Note: Aircraft will be added back to pool via refresh
  }))
);
