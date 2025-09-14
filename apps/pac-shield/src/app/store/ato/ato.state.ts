import { ATOLine } from '../../generated/aTOLine/aTOLine.entity';

/**
 * ATO state interface for NgRx store
 */
export interface AtoState {
  // Current turn ATO lines
  currentLines: ATOLine[];

  // Previous turn ATO lines for reference
  previousLines: ATOLine[];

  // PPR queue (pending approvals) for CAOC
  pprQueue: ATOLine[];

  // Selected aircraft for flight planning
  selectedAircraftForPlanning: string | null;

  // Loading states
  loading: {
    fetchingLines: boolean;
    creatingLine: boolean;
    updatingLine: boolean;
    deletingLine: boolean;
    approvingPpr: boolean;
  };

  // Error state
  error: string | null;

  // Last refresh timestamp
  lastRefresh: string | null;

  // Filters and UI state
  filters: {
    showOnlyPending: boolean;
    showOnlyMyFlights: boolean;
    selectedTeam: string | null;
  };
}

/**
 * Initial ATO state
 */
export const initialAtoState: AtoState = {
  currentLines: [],
  previousLines: [],
  pprQueue: [],
  selectedAircraftForPlanning: null,
  loading: {
    fetchingLines: false,
    creatingLine: false,
    updatingLine: false,
    deletingLine: false,
    approvingPpr: false,
  },
  error: null,
  lastRefresh: null,
  filters: {
    showOnlyPending: false,
    showOnlyMyFlights: false,
    selectedTeam: null,
  },
};