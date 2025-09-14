import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AtoState } from './ato.state';

// Feature selector
export const selectAtoState = createFeatureSelector<AtoState>('ato');

// =============================================================================
// Basic Selectors
// =============================================================================

export const selectCurrentAtoLines = createSelector(
  selectAtoState,
  (state: AtoState) => state.currentLines
);

export const selectPreviousAtoLines = createSelector(
  selectAtoState,
  (state: AtoState) => state.previousLines
);

export const selectPprQueue = createSelector(
  selectAtoState,
  (state: AtoState) => state.pprQueue
);

export const selectAtoLoading = createSelector(
  selectAtoState,
  (state: AtoState) => state.loading
);

export const selectAtoError = createSelector(
  selectAtoState,
  (state: AtoState) => state.error
);

export const selectAtoFilters = createSelector(
  selectAtoState,
  (state: AtoState) => state.filters
);

export const selectSelectedAircraftForPlanning = createSelector(
  selectAtoState,
  (state: AtoState) => state.selectedAircraftForPlanning
);

export const selectLastRefresh = createSelector(
  selectAtoState,
  (state: AtoState) => state.lastRefresh
);

// =============================================================================
// Computed Selectors
// =============================================================================

export const selectAtoLineById = (id: number) => createSelector(
  selectCurrentAtoLines,
  (lines) => lines.find(line => line.id === id)
);

export const selectPendingAtoLines = createSelector(
  selectCurrentAtoLines,
  (lines) => lines.filter(line => line.pprStatus === 'PENDING')
);

export const selectApprovedAtoLines = createSelector(
  selectCurrentAtoLines,
  (lines) => lines.filter(line => line.pprStatus === 'APPROVED')
);

export const selectDeniedAtoLines = createSelector(
  selectCurrentAtoLines,
  (lines) => lines.filter(line => line.pprStatus === 'DENIED')
);

export const selectAtoLinesByTeam = (teamType: string) => createSelector(
  selectCurrentAtoLines,
  (lines) => {
    // This would need to be enhanced based on how team ownership is determined
    // For now, return all lines as we don't have team ownership in the ATOLine model
    return lines;
  }
);

export const selectAtoLinesByCallSign = (callSign: string) => createSelector(
  selectCurrentAtoLines,
  (lines) => lines.filter(line =>
    line.aircraftCallSign.toLowerCase().includes(callSign.toLowerCase())
  )
);

export const selectFilteredAtoLines = createSelector(
  selectCurrentAtoLines,
  selectAtoFilters,
  (lines, filters) => {
    let filtered = [...lines];

    if (filters.showOnlyPending) {
      filtered = filtered.filter(line => line.pprStatus === 'PENDING');
    }

    if (filters.showOnlyMyFlights && filters.selectedTeam) {
      // This would filter by team ownership if that data was available
      // For now, return all lines
    }

    return filtered;
  }
);

export const selectAtoStatistics = createSelector(
  selectCurrentAtoLines,
  (lines) => {
    const total = lines.length;
    const pending = lines.filter(line => line.pprStatus === 'PENDING').length;
    const approved = lines.filter(line => line.pprStatus === 'APPROVED').length;
    const denied = lines.filter(line => line.pprStatus === 'DENIED').length;
    const usingRiskToken = lines.filter(line => line.riskTokenUsed).length;

    const configurationStats = lines.reduce((acc, line) => {
      acc[line.configuration] = (acc[line.configuration] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const intentionStats = lines.reduce((acc, line) => {
      acc[line.intention] = (acc[line.intention] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      pending,
      approved,
      denied,
      usingRiskToken,
      configurationStats,
      intentionStats,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      pendingRate: total > 0 ? Math.round((pending / total) * 100) : 0,
    };
  }
);

export const selectPprQueueStatistics = createSelector(
  selectPprQueue,
  (queue) => {
    const total = queue.length;
    const byTurn = queue.reduce((acc, line) => {
      acc[line.turn] = (acc[line.turn] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const oldestTurn = queue.length > 0 ? Math.min(...queue.map(line => line.turn)) : null;
    const newestTurn = queue.length > 0 ? Math.max(...queue.map(line => line.turn)) : null;

    return {
      total,
      byTurn,
      oldestTurn,
      newestTurn,
      hasOldPendingFlights: oldestTurn !== null && newestTurn !== null && oldestTurn < newestTurn,
    };
  }
);

export const selectIsAnyAtoActionInProgress = createSelector(
  selectAtoLoading,
  (loading) => {
    return Object.values(loading).some(isLoading => isLoading);
  }
);

export const selectCanCreateFlightPlan = createSelector(
  selectAtoLoading,
  (loading) => !loading.creatingLine && !loading.fetchingLines
);

export const selectCanApprovePpr = createSelector(
  selectAtoLoading,
  selectPendingAtoLines,
  (loading, pendingLines) => !loading.approvingPpr && pendingLines.length > 0
);