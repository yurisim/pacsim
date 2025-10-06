import { AllocationCycle } from '../../generated/allocationCycle/allocationCycle.entity';
import { AircraftRequest } from '../../generated/aircraftRequest/aircraftRequest.entity';
import { AircraftAllocation } from '../../generated/aircraftAllocation/aircraftAllocation.entity';
import { AircraftInstance } from '../../generated/aircraftInstance/aircraftInstance.entity';
import {
  AircraftType
} from '../../generated/enums';

export interface AllocationNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  timestamp: string;
  gameId: number;
  targetTeamId?: number;
  targetTeamName?: string;
  requiresAcknowledgment: boolean;
  acknowledged: boolean;
  acknowledgedAt?: string;
  read: boolean;
  readAt?: string;
}

export interface AllocationState {
  // Current allocation cycle
  currentCycle: AllocationCycle | null;

  // All requests for the current cycle
  requests: AircraftRequest[];

  // All allocations for the current cycle
  allocations: AircraftAllocation[];

  // Unallocated aircraft pool
  unallocatedPool: AircraftInstance[];

  // Notifications
  notifications: AllocationNotification[];
  unreadNotificationCount: number;
  lastNotificationTimestamp: string | null;

  // UI state
  ui: {
    cycleLoading: boolean;
    requestsLoading: boolean;
    allocationsLoading: boolean;
    poolLoading: boolean;

    // Form state
    submittingRequest: boolean;
    updatingRequest: boolean;
    deletingRequest: boolean;

    // Error states
    cycleError: string | null;
    requestsError: string | null;
    allocationsError: string | null;
    poolError: string | null;
    formError: string | null;

    // Notification UI state
    notificationsPanelOpen: boolean;
    processingNotification: boolean;
    notificationError: string | null;
  };

  // Request submission form data
  requestForm: {
    allocationCycleId: number | null;
    teamId: number | null;
    aircraftType: AircraftType | null;
    quantityRequested: number;
    missionJustification: string;
    priority: number;
    rationale: string;
  };
}

export const initialAllocationState: AllocationState = {
  currentCycle: null,
  requests: [],
  allocations: [],
  unallocatedPool: [],

  notifications: [],
  unreadNotificationCount: 0,
  lastNotificationTimestamp: null,

  ui: {
    cycleLoading: false,
    requestsLoading: false,
    allocationsLoading: false,
    poolLoading: false,

    submittingRequest: false,
    updatingRequest: false,
    deletingRequest: false,

    cycleError: null,
    requestsError: null,
    allocationsError: null,
    poolError: null,
    formError: null,

    notificationsPanelOpen: false,
    processingNotification: false,
    notificationError: null,
  },

  requestForm: {
    allocationCycleId: null,
    teamId: null,
    aircraftType: null,
    quantityRequested: 1,
    missionJustification: '',
    priority: 3,
    rationale: '',
  },
};
