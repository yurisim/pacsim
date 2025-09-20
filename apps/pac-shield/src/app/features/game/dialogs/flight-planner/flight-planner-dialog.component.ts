import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { Store } from '@ngrx/store';
import { Observable, Subject, catchError, of } from 'rxjs';
import { filter, map, startWith, take, takeUntil } from 'rxjs/operators';
import { ATOLine } from '../../../../generated/aTOLine/aTOLine.entity';
import { CreateATOLineDto } from '../../../../generated/aTOLine/create-aTOLine.dto';
import { UpdateATOLineDto } from '../../../../generated/aTOLine/update-aTOLine.dto';
import { AircraftConfiguration, FlightIntention, AircraftType, AircraftStatus, PlayerRole } from '../../../../generated/enums';
import { AircraftInstance } from '../../../../generated/aircraftInstance/aircraftInstance.entity';
import { Player } from '../../../../generated/player/player.entity';
import { FOS_LOCATIONS, MOB_LOCATIONS } from '../../../../shared/config/static-locations.config';
import { ApiService } from '../../../../shared/services/api.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { selectHexGrid } from '../../../../core/store/game/game.selectors';

interface LocationOption {
  /** Backend value (e.g., 'Kadena AB', 'FOS 7', '505A') */
  value: string;
  /** Frontend display alias (e.g., 'Kadena Air Base', 'FOS 7 - Philippines', 'Hex 505A') */
  displayName: string;
  /** Location type for filtering */
  type: 'MOB' | 'FOS' | 'Hex';
  /** Country for additional context */
  country: string;
}

export interface FlightPlannerDialogData {
  existingFlightPlan?: ATOLine;
  availableAircraft?: AircraftInstance[];
  currentTurn: number;
  gameId: number;
}

/**
 * Comprehensive flight planner dialog for creating and editing ATO lines.
 * Includes aircraft selection, route planning, mission configuration, and validation.
 */
@Component({
  selector: 'app-flight-planner-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatStepperModule,
    MatCheckboxModule,
    MatIconModule,
    MatAutocompleteModule,
  ],
  templateUrl: './flight-planner-dialog.component.html',
})
export class FlightPlannerDialogComponent implements OnInit, OnDestroy {
  flightPlanForm: FormGroup;
  isEditMode: boolean;

  // Aircraft selection data
  availableAircraft: AircraftInstance[] = [];
  isLoadingAircraft = false;
  aircraftError: string | null = null;
  currentPlayer: Player | null = null;

  // Location autocomplete data
  allLocationOptions: LocationOption[] = [];
  filteredStartLocations$: Observable<LocationOption[]> = new Observable<LocationOption[]>;
  filteredFinalDestinations$: Observable<LocationOption[]> = new Observable<LocationOption[]>;
  filteredEnRouteDestinations$: Observable<LocationOption[]> = new Observable<LocationOption[]>;
  filteredAlternateDestinations$: Observable<LocationOption[]> = new Observable<LocationOption[]>;

  private destroy$ = new Subject<void>();

  configurations = [
    { value: 'CARGO_ONLY', label: 'Cargo Only', icon: 'inventory' },
    { value: 'PERSONNEL_ONLY', label: 'Personnel Only', icon: 'group' },
    { value: 'MIXED', label: 'Mixed Load', icon: 'merge' },
    { value: 'MEDEVAC', label: 'Medical Evacuation', icon: 'medical_services' },
  ];

  intentions = [
    { value: 'LAND', label: 'Land at Destination', icon: 'flight_land' },
    { value: 'EN_ROUTE', label: 'En Route (Continue)', icon: 'connecting_airports' },
  ];

  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<FlightPlannerDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as FlightPlannerDialogData;
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private store = inject(Store);

  constructor() {
    this.isEditMode = !!this.data.existingFlightPlan;
    this.initializeLocationOptions();
    this.flightPlanForm = this.createForm();
    this.setupLocationAutocomplete();
    this.loadHexLocations();
  }

  ngOnInit(): void {
    // Note: We'll fetch the current player data from API instead of using cached data
    // since we need the full Player entity with role information
    this.loadAvailableAircraft();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load available aircraft based on user role
   */
  private loadAvailableAircraft(): void {
    if (this.data.availableAircraft) {
      // Use pre-loaded aircraft if provided
      this.availableAircraft = this.data.availableAircraft;
      return;
    }

    this.isLoadingAircraft = true;
    this.aircraftError = null;

    // First, get the current player to determine role and team
    const gameId = this.data.gameId;
    const playerId = this.authService.getPlayerId();

    if (!playerId || !gameId) {
      this.aircraftError = 'Unable to determine user authorization';
      this.isLoadingAircraft = false;
      return;
    }

    // Get current player information to determine role and team
    this.apiService.get<Player>(`player/${playerId}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching player data:', error);
          this.aircraftError = 'Failed to load user information';
          this.isLoadingAircraft = false;
          return of(null);
        })
      )
      .subscribe(player => {
        if (!player) {
          return;
        }

        this.currentPlayer = player;
        this.fetchAircraftForRole(player, gameId);
      });
  }

  /**
   * Fetch aircraft based on player role (GM vs MOB team member)
   */
  private fetchAircraftForRole(player: Player, gameId: number): void {
    let aircraftEndpoint: string;

    if (player.role === 'GM') {
      // GM can see all aircraft in the game
      aircraftEndpoint = `ato/games/${gameId}/aircraft`;
    } else if (player.teamId) {
      // Regular player can only see their team's aircraft
      aircraftEndpoint = `ato/teams/${player.teamId}/aircraft`;
    } else {
      this.aircraftError = 'Player not assigned to a team';
      this.isLoadingAircraft = false;
      return;
    }

    this.apiService.get<AircraftInstance[]>(aircraftEndpoint)
      .pipe(
        catchError(error => {
          console.error('Error fetching aircraft:', error);
          this.aircraftError = 'Failed to load available aircraft';
          this.isLoadingAircraft = false;
          return of([]);
        })
      )
      .subscribe(aircraft => {
        this.availableAircraft = aircraft;
        this.isLoadingAircraft = false;

        // Populate form from existing flight plan after aircraft are loaded
        if (this.isEditMode && this.data.existingFlightPlan) {
          this.populateFormFromExisting(this.data.existingFlightPlan);
        }
      });
  }

  /**
   * Handle aircraft selection from dropdown
   */
  onAircraftSelected(event: any): void {
    const selectedAircraft = event.value as AircraftInstance;
    if (selectedAircraft) {
      // Auto-populate the call sign when aircraft is selected
      this.flightPlanForm.patchValue({
        aircraftCallSign: selectedAircraft.callSign
      });
    }
  }

  /**
   * Get icon for aircraft type
   */
  getAircraftTypeIcon(type: AircraftType): string {
    const iconMap: Record<AircraftType, string> = {
      'F16': 'military_tech',
      'F22': 'military_tech',
      'C17': 'local_shipping',
      'C130': 'local_shipping',
      'C5': 'local_shipping'
    };
    return iconMap[type] || 'flight';
  }

  /**
   * Get display label for aircraft status
   */
  getAircraftStatusLabel(status: AircraftStatus): string {
    const statusMap: Record<AircraftStatus, string> = {
      'FMC': 'Fully Mission Capable',
      'NMC': 'Not Mission Capable',
      'DESTROYED': 'Destroyed'
    };
    return statusMap[status] || status;
  }

  private createForm(): FormGroup {
    return this.fb.group({
      selectedAircraft: ['', [Validators.required]],
      aircraftCallSign: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{4,12}$/)]],
      startLocation: ['', [Validators.required]],
      enRouteDestination: [''],
      finalDestination: ['', [Validators.required]],
      alternateDestination: [''],
      intention: ['LAND' as FlightIntention, [Validators.required]],
      configuration: ['CARGO_ONLY' as AircraftConfiguration, [Validators.required]],
      riskTokenUsed: [false],
      missionNotes: [''],
    });
  }

  private populateFormFromExisting(flightPlan: ATOLine): void {
    // Find the corresponding aircraft in the available list
    const matchingAircraft = this.availableAircraft.find(
      aircraft => aircraft.callSign === flightPlan.aircraftCallSign
    );

    this.flightPlanForm.patchValue({
      selectedAircraft: matchingAircraft || null,
      aircraftCallSign: flightPlan.aircraftCallSign,
      startLocation: flightPlan.startLocation,
      enRouteDestination: flightPlan.enRouteDestination,
      finalDestination: flightPlan.finalDestination,
      alternateDestination: flightPlan.alternateDestination,
      intention: flightPlan.intention,
      configuration: flightPlan.configuration,
      riskTokenUsed: flightPlan.riskTokenUsed,
      missionNotes: flightPlan.executionResult || '',
    });
  }

  get formTitle(): string {
    return this.isEditMode ? 'Edit Flight Plan' : 'Create Flight Plan';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'Update Flight Plan' : 'Submit to ATO';
  }


  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.flightPlanForm.valid) {
      const formValue = this.flightPlanForm.value;
      const selectedAircraft = formValue.selectedAircraft as AircraftInstance;

      if (this.isEditMode) {
        // Return update data for existing flight plan
        const updateData: UpdateATOLineDto & { riskTokenUsed?: boolean; selectedAircraftId?: number } = {
          aircraftCallSign: formValue.aircraftCallSign,
          startLocation: formValue.startLocation,
          enRouteDestination: formValue.enRouteDestination || null,
          finalDestination: formValue.finalDestination,
          alternateDestination: formValue.alternateDestination || null,
          intention: formValue.intention,
          configuration: formValue.configuration,
          riskTokenUsed: formValue.riskTokenUsed,
          executionResult: formValue.missionNotes || null,
          selectedAircraftId: selectedAircraft?.id,
        };
        this.dialogRef.close(updateData);
      } else {
        // Return create data for new flight plan
        const createData: CreateATOLineDto & { gameId: number; riskTokenUsed?: boolean; selectedAircraftId?: number } = {
          gameId: this.data.gameId,
          turn: this.data.currentTurn,
          aircraftCallSign: formValue.aircraftCallSign,
          startLocation: formValue.startLocation,
          enRouteDestination: formValue.enRouteDestination || null,
          finalDestination: formValue.finalDestination,
          alternateDestination: formValue.alternateDestination || null,
          intention: formValue.intention,
          configuration: formValue.configuration,
          riskTokenUsed: formValue.riskTokenUsed || false,
          executionResult: formValue.missionNotes || null,
          selectedAircraftId: selectedAircraft?.id,
        };
        this.dialogRef.close(createData);
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.flightPlanForm.controls).forEach(key => {
        this.flightPlanForm.get(key)?.markAsTouched();
      });
    }
  }

  // Validation helpers
  get callSignErrorMessage(): string {
    const control = this.flightPlanForm.get('aircraftCallSign');
    const selectedAircraftControl = this.flightPlanForm.get('selectedAircraft');

    if (control?.hasError('required')) {
      if (!selectedAircraftControl?.value) {
        return 'Please select an aircraft first';
      }
      return 'Call sign is required';
    }
    if (control?.hasError('pattern')) {
      return 'Call sign must be 4-12 alphanumeric characters (e.g., LIFT01, SCAR04)';
    }
    return '';
  }

  get routeValidationWarnings(): string[] {
    const warnings: string[] = [];

    // TODO: Add range validation, political clearance checks, MOG limits

    return warnings;
  }

  get hasRouteWarnings(): boolean {
    return this.routeValidationWarnings.length > 0;
  }

  // Helper methods for template
  getConfigurationIcon(config: string): string {
    return this.configurations.find(c => c.value === config)?.icon || 'flight';
  }

  getIntentionIcon(intention: string): string {
    return this.intentions.find(i => i.value === intention)?.icon || 'flight';
  }

  getConfigurationLabel(config: string): string {
    return this.configurations.find(c => c.value === config)?.label || '';
  }

  getIntentionLabel(intention: string): string {
    return this.intentions.find(i => i.value === intention)?.label || '';
  }

  private initializeLocationOptions(): void {
    this.allLocationOptions = [
      // MOB locations with backend-compatible names
      ...Object.entries(MOB_LOCATIONS).map(([id, location]) => ({
        value: this.getMOBBackendValue(id),
        displayName: `${location.name} Air Base - ${location.country}`,
        type: 'MOB' as const,
        country: location.country,
      })),
      // FOS locations
      ...Object.entries(FOS_LOCATIONS).map(([_id, location]) => ({
        value: location.name,
        displayName: `${location.name} - ${location.country}`,
        type: 'FOS' as const,
        country: location.country,
      })),
    ];
  }

  private loadHexLocations(): void {
    this.store.select(selectHexGrid).pipe(
      filter((hexGrid): hexGrid is Record<string, string> => hexGrid !== null),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(hexGrid => {
      const hexLocationOptions: LocationOption[] = Object.entries(hexGrid).map(([h3Index, visualCoord]) => ({
        value: visualCoord,
        displayName: `Hex ${visualCoord}`,
        type: 'Hex',
        country: '',
      }));

      this.allLocationOptions = [...this.allLocationOptions, ...hexLocationOptions];
    });
  }

  private getMOBBackendValue(mobId: string): string {
    // Map MOB IDs to backend values that match existing test patterns
    const mobBackendMap: Record<string, string> = {
      kadena: 'Kadena AB',
      andersen: 'Andersen AFB',
      yokota: 'Yokota AB',
      osan: 'Osan AB',
      jbphh: 'JBPHH',
    };
    return mobBackendMap[mobId] || MOB_LOCATIONS[mobId]?.name || mobId;
  }

  private setupLocationAutocomplete(): void {
    // Setup filtered options for each location field
    const startLocationControl = this.flightPlanForm.get('startLocation');
    const finalDestinationControl = this.flightPlanForm.get('finalDestination');
    const enRouteDestinationControl = this.flightPlanForm.get('enRouteDestination');
    const alternateDestinationControl = this.flightPlanForm.get('alternateDestination');

    if (startLocationControl) {
      this.filteredStartLocations$ = startLocationControl.valueChanges.pipe(
        startWith(''),
        map(value => this.filterLocations(value))
      );
    }

    if (finalDestinationControl) {
      this.filteredFinalDestinations$ = finalDestinationControl.valueChanges.pipe(
        startWith(''),
        map(value => this.filterLocations(value))
      );
    }

    if (enRouteDestinationControl) {
      this.filteredEnRouteDestinations$ = enRouteDestinationControl.valueChanges.pipe(
        startWith(''),
        map(value => this.filterLocations(value))
      );
    }

    if (alternateDestinationControl) {
      this.filteredAlternateDestinations$ = alternateDestinationControl.valueChanges.pipe(
        startWith(''),
        map(value => this.filterLocations(value))
      );
    }
  }

  private filterLocations(value: string | null): LocationOption[] {
    if (!value || typeof value !== 'string') {
      return this.allLocationOptions;
    }

    const filterValue = value.toLowerCase();
    return this.allLocationOptions.filter(option =>
      option.value.toLowerCase().includes(filterValue) ||
      option.displayName.toLowerCase().includes(filterValue) ||
      option.country.toLowerCase().includes(filterValue)
    );
  }

  // Template helper for autocomplete display
  displayLocationFn = (value: string): string => {
    if (!value) return '';
    const option = this.allLocationOptions.find(opt => opt.value === value);
    return option ? option.displayName : value;
  };

  // Get location option for template display
  getLocationOption(value: string): LocationOption | undefined {
    return this.allLocationOptions.find(opt => opt.value === value);
  }
}
