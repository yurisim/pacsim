import { createAction, props } from '@ngrx/store';
import { ATOLine } from '../../generated/aTOLine/aTOLine.entity';
import { CreateATOLineDto } from '../../generated/aTOLine/create-aTOLine.dto';
import { UpdateATOLineDto } from '../../generated/aTOLine/update-aTOLine.dto';

// =============================================================================
// Load ATO Lines Actions
// =============================================================================

export const loadCurrentAtoLines = createAction(
  '[ATO] Load Current ATO Lines',
  props<{ gameId: number }>()
);

export const loadCurrentAtoLinesSuccess = createAction(
  '[ATO] Load Current ATO Lines Success',
  props<{ lines: ATOLine[] }>()
);

export const loadCurrentAtoLinesFailure = createAction(
  '[ATO] Load Current ATO Lines Failure',
  props<{ error: string }>()
);

export const loadPprQueue = createAction(
  '[ATO] Load PPR Queue',
  props<{ gameId: number }>()
);

export const loadPprQueueSuccess = createAction(
  '[ATO] Load PPR Queue Success',
  props<{ queue: ATOLine[] }>()
);

export const loadPprQueueFailure = createAction(
  '[ATO] Load PPR Queue Failure',
  props<{ error: string }>()
);

// =============================================================================
// Create ATO Line Actions
// =============================================================================

export const createAtoLine = createAction(
  '[ATO] Create ATO Line',
  props<{ flightPlan: CreateATOLineDto }>()
);

export const createAtoLineSuccess = createAction(
  '[ATO] Create ATO Line Success',
  props<{ line: ATOLine }>()
);

export const createAtoLineFailure = createAction(
  '[ATO] Create ATO Line Failure',
  props<{ error: string }>()
);

// =============================================================================
// Update ATO Line Actions
// =============================================================================

export const updateAtoLine = createAction(
  '[ATO] Update ATO Line',
  props<{ id: number; updates: UpdateATOLineDto }>()
);

export const updateAtoLineSuccess = createAction(
  '[ATO] Update ATO Line Success',
  props<{ line: ATOLine }>()
);

export const updateAtoLineFailure = createAction(
  '[ATO] Update ATO Line Failure',
  props<{ error: string }>()
);

// =============================================================================
// Delete ATO Line Actions
// =============================================================================

export const deleteAtoLine = createAction(
  '[ATO] Delete ATO Line',
  props<{ id: number }>()
);

export const deleteAtoLineSuccess = createAction(
  '[ATO] Delete ATO Line Success',
  props<{ id: number }>()
);

export const deleteAtoLineFailure = createAction(
  '[ATO] Delete ATO Line Failure',
  props<{ error: string }>()
);

// =============================================================================
// PPR Approval Actions
// =============================================================================

export const approvePpr = createAction(
  '[ATO] Approve PPR',
  props<{ id: number }>()
);

export const approvePprSuccess = createAction(
  '[ATO] Approve PPR Success',
  props<{ line: ATOLine }>()
);

export const approvePprFailure = createAction(
  '[ATO] Approve PPR Failure',
  props<{ error: string }>()
);

export const denyPpr = createAction(
  '[ATO] Deny PPR',
  props<{ id: number }>()
);

export const denyPprSuccess = createAction(
  '[ATO] Deny PPR Success',
  props<{ line: ATOLine }>()
);

export const denyPprFailure = createAction(
  '[ATO] Deny PPR Failure',
  props<{ error: string }>()
);

export const bulkApprovePpr = createAction(
  '[ATO] Bulk Approve PPR',
  props<{ gameId: number; atoLineIds?: number[] }>()
);

export const bulkApprovePprSuccess = createAction(
  '[ATO] Bulk Approve PPR Success',
  props<{ lines: ATOLine[] }>()
);

export const bulkApprovePprFailure = createAction(
  '[ATO] Bulk Approve PPR Failure',
  props<{ error: string }>()
);

// =============================================================================
// WebSocket Event Actions
// =============================================================================

export const atoLineCreatedFromSocket = createAction(
  '[ATO] ATO Line Created From Socket',
  props<{ line: ATOLine }>()
);

export const atoLineUpdatedFromSocket = createAction(
  '[ATO] ATO Line Updated From Socket',
  props<{ line: ATOLine }>()
);

export const atoLineDeletedFromSocket = createAction(
  '[ATO] ATO Line Deleted From Socket',
  props<{ id: number; aircraftCallSign: string }>()
);

export const pprStatusChangedFromSocket = createAction(
  '[ATO] PPR Status Changed From Socket',
  props<{ line: ATOLine }>()
);

export const bulkPprApprovedFromSocket = createAction(
  '[ATO] Bulk PPR Approved From Socket',
  props<{ lines: ATOLine[] }>()
);

export const executionResultUpdatedFromSocket = createAction(
  '[ATO] Execution Result Updated From Socket',
  props<{ line: ATOLine }>()
);

export const atoTurnAdvancedFromSocket = createAction(
  '[ATO] ATO Turn Advanced From Socket',
  props<{ turn: number }>()
);

// =============================================================================
// UI State Actions
// =============================================================================

export const setSelectedAircraftForPlanning = createAction(
  '[ATO] Set Selected Aircraft For Planning',
  props<{ aircraftCallSign: string | null }>()
);

export const setAtoFilters = createAction(
  '[ATO] Set ATO Filters',
  props<{ filters: Partial<{ showOnlyPending: boolean; showOnlyMyFlights: boolean; selectedTeam: string | null }> }>()
);

export const clearAtoError = createAction('[ATO] Clear ATO Error');

export const refreshAtoData = createAction(
  '[ATO] Refresh ATO Data',
  props<{ gameId: number }>()
);