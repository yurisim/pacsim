import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AllocationState } from './allocation.state';
import { AircraftType } from '../../generated/enums';

export const selectAllocationState = createFeatureSelector<AllocationState>('allocation');

// =============================================
//            ALLOCATION CYCLE SELECTORS
// =============================================

export const selectCurrentAllocationCycle = createSelector(
  selectAllocationState,
  (state) => state.currentCycle
);

export const selectAllocationCycleLoading = createSelector(
  selectAllocationState,
  (state) => state.ui.cycleLoading
);

export const selectAllocationCycleError = createSelector(
  selectAllocationState,
  (state) => state.ui.cycleError
);

export const selectAllocationCycleStatus = createSelector(
  selectCurrentAllocationCycle,
  (cycle) => cycle?.status
);

export const selectIsRequestsOpen = createSelector(
  selectAllocationCycleStatus,
  (status) => status === 'REQUESTS_OPEN'
);

export const selectIsCycleActive = createSelector(
  selectAllocationCycleStatus,
  (status) => status && status !== 'CLOSED'
);

// =============================================
//            AIRCRAFT POOL SELECTORS
// =============================================

export const selectUnallocatedAircraftPool = createSelector(
  selectAllocationState,
  (state) => state.unallocatedPool
);

export const selectPoolLoading = createSelector(
  selectAllocationState,
  (state) => state.ui.poolLoading
);

export const selectPoolError = createSelector(
  selectAllocationState,
  (state) => state.ui.poolError
);

export const selectUnallocatedAircraftByType = createSelector(
  selectUnallocatedAircraftPool,
  (pool) => {
    const byType: Record<AircraftType, number> = {
      'C17': 0,
      'C130': 0,
      'C5': 0,
      'F16': 0,
      'F22': 0,
    };

    pool.forEach(aircraft => {
      byType[aircraft.type as AircraftType]++;
    });

    return byType;
  }
);

export const selectMobilityAircraftCount = createSelector(
  selectUnallocatedAircraftByType,
  (byType) => byType.C17 + byType.C130 + byType.C5
);

// =============================================
//            AIRCRAFT REQUEST SELECTORS
// =============================================

export const selectAllRequests = createSelector(
  selectAllocationState,
  (state) => state.requests
);

export const selectRequestsLoading = createSelector(
  selectAllocationState,
  (state) => state.ui.requestsLoading
);

export const selectRequestsError = createSelector(
  selectAllocationState,
  (state) => state.ui.requestsError
);

export const selectPendingRequests = createSelector(
  selectAllRequests,
  (requests) => requests.filter(r => r.status === 'PENDING')
);

export const selectApprovedRequests = createSelector(
  selectAllRequests,
  (requests) => requests.filter(r => r.status === 'APPROVED')
);

export const selectDeniedRequests = createSelector(
  selectAllRequests,
  (requests) => requests.filter(r => r.status === 'DENIED')
);

export const selectModifiedRequests = createSelector(
  selectAllRequests,
  (requests) => requests.filter(r => r.status === 'MODIFIED')
);

export const selectRequestsByTeam = (teamId: number) => createSelector(
  selectAllRequests,
  (requests) => requests.filter(r => r.teamId === teamId)
);

export const selectTeamRequestsSummary = (teamId: number) => createSelector(
  selectRequestsByTeam(teamId),
  (requests) => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    denied: requests.filter(r => r.status === 'DENIED').length,
    modified: requests.filter(r => r.status === 'MODIFIED').length,
  })
);

export const selectRequestsByAircraftType = createSelector(
  selectAllRequests,
  (requests) => {
    const byType: Record<AircraftType, any[]> = {
      'C17': [],
      'C130': [],
      'C5': [],
      'F16': [],
      'F22': [],
    };

    requests.forEach(request => {
      byType[request.aircraftType as AircraftType].push(request);
    });

    return byType;
  }
);

export const selectTotalRequestedByType = createSelector(
  selectRequestsByAircraftType,
  (byType) => {
    const totals: Record<AircraftType, number> = {
      'C17': 0,
      'C130': 0,
      'C5': 0,
      'F16': 0,
      'F22': 0,
    };

    Object.entries(byType).forEach(([type, requests]) => {
      totals[type as AircraftType] = requests.reduce((sum, req) => sum + req.quantityRequested, 0);
    });

    return totals;
  }
);

// =============================================
//            ALLOCATION SELECTORS
// =============================================

export const selectAllAllocations = createSelector(
  selectAllocationState,
  (state) => state.allocations
);

export const selectAllocationsLoading = createSelector(
  selectAllocationState,
  (state) => state.ui.allocationsLoading
);

export const selectAllocationsError = createSelector(
  selectAllocationState,
  (state) => state.ui.allocationsError
);

export const selectAllocationsByTeam = (teamId: number) => createSelector(
  selectAllAllocations,
  (allocations) => allocations.filter(a => a.allocatedToTeamId === teamId)
);

export const selectAllocatedAircraftByTeam = (teamId: number) => createSelector(
  selectAllocationsByTeam(teamId),
  (allocations) => allocations.map(a => a.aircraftInstance).filter(Boolean)
);

export const selectTotalAllocatedByType = createSelector(
  selectAllAllocations,
  (allocations) => {
    const totals: Record<AircraftType, number> = {
      'C17': 0,
      'C130': 0,
      'C5': 0,
      'F16': 0,
      'F22': 0,
    };

    allocations.forEach(allocation => {
      if (allocation.aircraftInstance) {
        totals[allocation.aircraftInstance.type as AircraftType]++;
      }
    });

    return totals;
  }
);

// =============================================
//            FORM STATE SELECTORS
// =============================================

export const selectRequestForm = createSelector(
  selectAllocationState,
  (state) => state.requestForm
);

export const selectFormLoading = createSelector(
  selectAllocationState,
  (state) => state.ui.submittingRequest || state.ui.updatingRequest || state.ui.deletingRequest
);

export const selectFormError = createSelector(
  selectAllocationState,
  (state) => state.ui.formError
);

export const selectIsFormValid = createSelector(
  selectRequestForm,
  (form) =>
    form.allocationCycleId !== null &&
    form.teamId !== null &&
    form.aircraftType !== null &&
    form.quantityRequested > 0 &&
    form.missionJustification.trim().length > 0 &&
    form.rationale.trim().length > 0 &&
    form.priority >= 1 &&
    form.priority <= 5
);

// =============================================
//            ANALYTICS SELECTORS
// =============================================

export const selectAllocationAnalytics = createSelector(
  selectUnallocatedAircraftByType,
  selectTotalRequestedByType,
  selectTotalAllocatedByType,
  (available, requested, allocated) => ({
    available,
    requested,
    allocated,
    remaining: {
      'C17': available.C17 - allocated.C17,
      'C130': available.C130 - allocated.C130,
      'C5': available.C5 - allocated.C5,
      'F16': available.F16 - allocated.F16,
      'F22': available.F22 - allocated.F22,
    } as Record<AircraftType, number>,
    utilization: {
      'C17': available.C17 > 0 ? (allocated.C17 / available.C17) * 100 : 0,
      'C130': available.C130 > 0 ? (allocated.C130 / available.C130) * 100 : 0,
      'C5': available.C5 > 0 ? (allocated.C5 / available.C5) * 100 : 0,
      'F16': available.F16 > 0 ? (allocated.F16 / available.F16) * 100 : 0,
      'F22': available.F22 > 0 ? (allocated.F22 / available.F22) * 100 : 0,
    } as Record<AircraftType, number>,
  })
);

export const selectRequestFulfillmentRate = createSelector(
  selectTotalRequestedByType,
  selectTotalAllocatedByType,
  (requested, allocated) => {
    const fulfillment: Record<AircraftType, number> = {
      'C17': 0,
      'C130': 0,
      'C5': 0,
      'F16': 0,
      'F22': 0,
    };

    Object.keys(requested).forEach(type => {
      const aircraftType = type as AircraftType;
      if (requested[aircraftType] > 0) {
        fulfillment[aircraftType] = (allocated[aircraftType] / requested[aircraftType]) * 100;
      }
    });

    return fulfillment;
  }
);

// =============================================
//            UI STATE SELECTORS
// =============================================

export const selectAllErrors = createSelector(
  selectAllocationState,
  (state) => ({
    cycle: state.ui.cycleError,
    requests: state.ui.requestsError,
    allocations: state.ui.allocationsError,
    pool: state.ui.poolError,
    form: state.ui.formError,
  })
);

export const selectHasAnyError = createSelector(
  selectAllErrors,
  (errors) => Object.values(errors).some(error => error !== null)
);

export const selectAllLoadingStates = createSelector(
  selectAllocationState,
  (state) => ({
    cycle: state.ui.cycleLoading,
    requests: state.ui.requestsLoading,
    allocations: state.ui.allocationsLoading,
    pool: state.ui.poolLoading,
    submittingRequest: state.ui.submittingRequest,
    updatingRequest: state.ui.updatingRequest,
    deletingRequest: state.ui.deletingRequest,
  })
);

export const selectIsAnyLoading = createSelector(
  selectAllLoadingStates,
  (loading) => Object.values(loading).some(state => state === true)
);
