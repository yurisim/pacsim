import { createReducer, on } from '@ngrx/store';
import { AtoState, initialAtoState } from './ato.state';
import * as AtoActions from './ato.actions';

/**
 * ATO reducer for managing Air Tasking Order state
 */
export const atoReducer = createReducer(
  initialAtoState,

  // =============================================================================
  // Load Current ATO Lines
  // =============================================================================
  on(AtoActions.loadCurrentAtoLines, (state) => ({
    ...state,
    loading: { ...state.loading, fetchingLines: true },
    error: null,
  })),

  on(AtoActions.loadCurrentAtoLinesSuccess, (state, { lines }) => ({
    ...state,
    currentLines: lines,
    loading: { ...state.loading, fetchingLines: false },
    lastRefresh: new Date().toISOString(),
    error: null,
  })),

  on(AtoActions.loadCurrentAtoLinesFailure, (state, { error }) => ({
    ...state,
    loading: { ...state.loading, fetchingLines: false },
    error,
  })),

  // =============================================================================
  // Load PPR Queue
  // =============================================================================
  on(AtoActions.loadPprQueue, (state) => ({
    ...state,
    loading: { ...state.loading, fetchingLines: true },
    error: null,
  })),

  on(AtoActions.loadPprQueueSuccess, (state, { queue }) => ({
    ...state,
    pprQueue: queue,
    loading: { ...state.loading, fetchingLines: false },
    error: null,
  })),

  on(AtoActions.loadPprQueueFailure, (state, { error }) => ({
    ...state,
    loading: { ...state.loading, fetchingLines: false },
    error,
  })),

  // =============================================================================
  // Create ATO Line
  // =============================================================================
  on(AtoActions.createAtoLine, (state) => ({
    ...state,
    loading: { ...state.loading, creatingLine: true },
    error: null,
  })),

  on(AtoActions.createAtoLineSuccess, (state, { line }) => ({
    ...state,
    currentLines: [...state.currentLines, line],
    loading: { ...state.loading, creatingLine: false },
    error: null,
  })),

  on(AtoActions.createAtoLineFailure, (state, { error }) => ({
    ...state,
    loading: { ...state.loading, creatingLine: false },
    error,
  })),

  // =============================================================================
  // Update ATO Line
  // =============================================================================
  on(AtoActions.updateAtoLine, (state) => ({
    ...state,
    loading: { ...state.loading, updatingLine: true },
    error: null,
  })),

  on(AtoActions.updateAtoLineSuccess, (state, { line }) => ({
    ...state,
    currentLines: state.currentLines.map(existing =>
      existing.id === line.id ? line : existing
    ),
    loading: { ...state.loading, updatingLine: false },
    error: null,
  })),

  on(AtoActions.updateAtoLineFailure, (state, { error }) => ({
    ...state,
    loading: { ...state.loading, updatingLine: false },
    error,
  })),

  // =============================================================================
  // Delete ATO Line
  // =============================================================================
  on(AtoActions.deleteAtoLine, (state) => ({
    ...state,
    loading: { ...state.loading, deletingLine: true },
    error: null,
  })),

  on(AtoActions.deleteAtoLineSuccess, (state, { id }) => ({
    ...state,
    currentLines: state.currentLines.filter(line => line.id !== id),
    pprQueue: state.pprQueue.filter(line => line.id !== id),
    loading: { ...state.loading, deletingLine: false },
    error: null,
  })),

  on(AtoActions.deleteAtoLineFailure, (state, { error }) => ({
    ...state,
    loading: { ...state.loading, deletingLine: false },
    error,
  })),

  // =============================================================================
  // PPR Approval Actions
  // =============================================================================
  on(AtoActions.approvePpr, AtoActions.denyPpr, AtoActions.bulkApprovePpr, (state) => ({
    ...state,
    loading: { ...state.loading, approvingPpr: true },
    error: null,
  })),

  on(AtoActions.approvePprSuccess, AtoActions.denyPprSuccess, (state, { line }) => ({
    ...state,
    currentLines: state.currentLines.map(existing =>
      existing.id === line.id ? line : existing
    ),
    pprQueue: state.pprQueue.filter(existing => existing.id !== line.id),
    loading: { ...state.loading, approvingPpr: false },
    error: null,
  })),

  on(AtoActions.bulkApprovePprSuccess, (state, { lines }) => {
    const approvedIds = lines.map(line => line.id);
    return {
      ...state,
      currentLines: state.currentLines.map(existing => {
        const updated = lines.find(line => line.id === existing.id);
        return updated || existing;
      }),
      pprQueue: state.pprQueue.filter(existing => !approvedIds.includes(existing.id)),
      loading: { ...state.loading, approvingPpr: false },
      error: null,
    };
  }),

  on(AtoActions.approvePprFailure, AtoActions.denyPprFailure, AtoActions.bulkApprovePprFailure, (state, { error }) => ({
    ...state,
    loading: { ...state.loading, approvingPpr: false },
    error,
  })),

  // =============================================================================
  // WebSocket Event Handlers
  // =============================================================================
  on(AtoActions.atoLineCreatedFromSocket, (state, { line }) => {
    // Check if line already exists to avoid duplicates
    const exists = state.currentLines.some(existing => existing.id === line.id);
    if (exists) return state;

    return {
      ...state,
      currentLines: [...state.currentLines, line],
      pprQueue: line.pprStatus === 'PENDING' ? [...state.pprQueue, line] : state.pprQueue,
    };
  }),

  on(AtoActions.atoLineUpdatedFromSocket, (state, { line }) => ({
    ...state,
    currentLines: state.currentLines.map(existing =>
      existing.id === line.id ? line : existing
    ),
    pprQueue: state.pprQueue.map(existing =>
      existing.id === line.id ? line : existing
    ),
  })),

  on(AtoActions.atoLineDeletedFromSocket, (state, { id }) => ({
    ...state,
    currentLines: state.currentLines.filter(line => line.id !== id),
    pprQueue: state.pprQueue.filter(line => line.id !== id),
  })),

  on(AtoActions.pprStatusChangedFromSocket, (state, { line }) => ({
    ...state,
    currentLines: state.currentLines.map(existing =>
      existing.id === line.id ? line : existing
    ),
    pprQueue: line.pprStatus === 'PENDING'
      ? state.pprQueue.some(existing => existing.id === line.id)
        ? state.pprQueue.map(existing => existing.id === line.id ? line : existing)
        : [...state.pprQueue, line]
      : state.pprQueue.filter(existing => existing.id !== line.id),
  })),

  on(AtoActions.bulkPprApprovedFromSocket, (state, { lines }) => {
    const approvedIds = lines.map(line => line.id);
    return {
      ...state,
      currentLines: state.currentLines.map(existing => {
        const updated = lines.find(line => line.id === existing.id);
        return updated || existing;
      }),
      pprQueue: state.pprQueue.filter(existing => !approvedIds.includes(existing.id)),
    };
  }),

  on(AtoActions.executionResultUpdatedFromSocket, (state, { line }) => ({
    ...state,
    currentLines: state.currentLines.map(existing =>
      existing.id === line.id ? line : existing
    ),
  })),

  on(AtoActions.atoTurnAdvancedFromSocket, (state, { turn: _turn }) => ({
    ...state,
    previousLines: [...state.currentLines],
    currentLines: [],
    pprQueue: [],
    lastRefresh: new Date().toISOString(),
  })),

  // =============================================================================
  // UI State Actions
  // =============================================================================
  on(AtoActions.setSelectedAircraftForPlanning, (state, { aircraftCallSign }) => ({
    ...state,
    selectedAircraftForPlanning: aircraftCallSign,
  })),

  on(AtoActions.setAtoFilters, (state, { filters }) => ({
    ...state,
    filters: { ...state.filters, ...filters },
  })),

  on(AtoActions.clearAtoError, (state) => ({
    ...state,
    error: null,
  })),

  on(AtoActions.refreshAtoData, (state) => ({
    ...state,
    loading: { ...state.loading, fetchingLines: true },
    error: null,
  }))
);