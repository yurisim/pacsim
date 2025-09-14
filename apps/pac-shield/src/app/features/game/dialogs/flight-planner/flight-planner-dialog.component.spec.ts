import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FlightPlannerDialogComponent, FlightPlannerDialogData } from './flight-planner-dialog.component';
import { AuthService } from '../../../../shared/services/auth.service';
import { ApiService } from '../../../../shared/services/api.service';
import { AircraftInstance } from '../../../../generated/aircraftInstance/aircraftInstance.entity';
import { of } from 'rxjs';

describe('FlightPlannerDialogComponent - Location Autocomplete', () => {
  let component: FlightPlannerDialogComponent;
  let fixture: ComponentFixture<FlightPlannerDialogComponent>;
  let mockDialogRef: jest.Mocked<MatDialogRef<FlightPlannerDialogComponent>>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockApiService: jest.Mocked<ApiService>;

  const mockAircraft: AircraftInstance[] = [
    {
      id: 1,
      callSign: 'TEST-01',
      type: 'F16' as any,
      status: 'FMC' as any,
      currentLocation: 'Kadena AB',
      gameId: 123,
      teamId: 'team-1'
    } as AircraftInstance,
    {
      id: 2,
      callSign: 'TEST-02',
      type: 'C17' as any,
      status: 'FMC' as any,
      currentLocation: 'Andersen AFB',
      gameId: 123,
      teamId: 'team-1'
    } as AircraftInstance
  ];

  const mockDialogData: FlightPlannerDialogData = {
    currentTurn: 1,
    gameId: 123,
    availableAircraft: mockAircraft
  };

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn()
    } as jest.Mocked<MatDialogRef<FlightPlannerDialogComponent>>;

    mockAuthService = {
      getPlayerId: jest.fn().mockReturnValue('player-123')
    } as jest.Mocked<AuthService>;

    mockApiService = {
      get: jest.fn().mockReturnValue(of([]))
    } as jest.Mocked<ApiService>;

    await TestBed.configureTestingModule({
      imports: [
        FlightPlannerDialogComponent,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatIconModule,
        MatAutocompleteModule,
        NoopAnimationsModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ApiService, useValue: mockApiService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FlightPlannerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Location Options Initialization', () => {
    it('should initialize all location options with correct structure', () => {
      expect(component.allLocationOptions).toBeDefined();
      expect(component.allLocationOptions.length).toBeGreaterThan(0);

      // Check that each option has required properties
      component.allLocationOptions.forEach(option => {
        expect(option.value).toBeDefined();
        expect(option.displayName).toBeDefined();
        expect(option.type).toMatch(/^(MOB|FOS)$/);
        expect(option.country).toBeDefined();
      });
    });

    it('should include all expected MOB locations with backend-compatible values', () => {
      const mobOptions = component.allLocationOptions.filter(opt => opt.type === 'MOB');

      // Verify expected MOB locations exist
      const expectedMOBs = ['Kadena AB', 'Andersen AFB', 'Yokota AB', 'Osan AB', 'JBPHH'];
      expectedMOBs.forEach(expectedMOB => {
        const found = mobOptions.find(opt => opt.value === expectedMOB);
        expect(found).toBeDefined();
        expect(found?.displayName).toContain('Air Base');
      });
    });

    it('should include all expected FOS locations', () => {
      const fosOptions = component.allLocationOptions.filter(opt => opt.type === 'FOS');

      // Should have many FOS locations (at least 40 based on the config)
      expect(fosOptions.length).toBeGreaterThanOrEqual(40);

      // Check a few specific FOS locations
      const expectedFOSs = ['FOS 1', 'FOS 7', 'FOS 15', 'FOS 25'];
      expectedFOSs.forEach(expectedFOS => {
        const found = fosOptions.find(opt => opt.value === expectedFOS);
        expect(found).toBeDefined();
      });
    });

    it('should have proper display names with country information', () => {
      // Check MOB display format
      const kadenaOption = component.allLocationOptions.find(opt => opt.value === 'Kadena AB');
      expect(kadenaOption?.displayName).toBe('Kadena Air Base - Japan');

      // Check FOS display format
      const fos7Option = component.allLocationOptions.find(opt => opt.value === 'FOS 7');
      expect(fos7Option?.displayName).toBe('FOS 7 - Philippines');
    });
  });

  describe('Autocomplete Filtering', () => {
    it('should filter locations by value', () => {
      const startLocationControl = component.flightPlanForm.get('startLocation');

      // Set a filter value
      startLocationControl?.setValue('Kadena');

      let filteredOptions: any[] = [];
      component.filteredStartLocations$.subscribe(options => {
        filteredOptions = options;
      });

      const kadenaOptions = filteredOptions.filter(opt =>
        opt.value.toLowerCase().includes('kadena')
      );
      expect(kadenaOptions.length).toBeGreaterThan(0);
    });

    it('should filter locations by display name', () => {
      const finalDestinationControl = component.flightPlanForm.get('finalDestination');

      // Filter by country in display name
      finalDestinationControl?.setValue('Japan');

      let filteredOptions: any[] = [];
      component.filteredFinalDestinations$.subscribe(options => {
        filteredOptions = options;
      });

      // Should find locations with Japan in display name
      const japanOptions = filteredOptions.filter(opt =>
        opt.displayName.toLowerCase().includes('japan')
      );
      expect(japanOptions.length).toBeGreaterThan(0);
    });

    it('should filter locations by country', () => {
      const enRouteControl = component.flightPlanForm.get('enRouteDestination');

      // Filter by country
      enRouteControl?.setValue('Philippines');

      let filteredOptions: any[] = [];
      component.filteredEnRouteDestinations$.subscribe(options => {
        filteredOptions = options;
      });

      const philippinesOptions = filteredOptions.filter(opt =>
        opt.country.toLowerCase().includes('philippines')
      );
      expect(philippinesOptions.length).toBeGreaterThan(0);
    });

    it('should return all options for empty or null filter', () => {
      const alternateControl = component.flightPlanForm.get('alternateDestination');

      // Test empty string
      alternateControl?.setValue('');

      let filteredOptions: any[] = [];
      component.filteredAlternateDestinations$.subscribe(options => {
        filteredOptions = options;
      });

      expect(filteredOptions.length).toBe(component.allLocationOptions.length);

      // Test null
      alternateControl?.setValue(null);

      component.filteredAlternateDestinations$.subscribe(options => {
        filteredOptions = options;
      });

      expect(filteredOptions.length).toBe(component.allLocationOptions.length);
    });

    it('should be case insensitive in filtering', () => {
      const startLocationControl = component.flightPlanForm.get('startLocation');

      // Test uppercase
      startLocationControl?.setValue('FOS');

      let filteredOptions: any[] = [];
      component.filteredStartLocations$.subscribe(options => {
        filteredOptions = options;
      });

      const fosOptionsUpper = filteredOptions.filter(opt =>
        opt.value.toLowerCase().includes('fos')
      );

      // Test lowercase
      startLocationControl?.setValue('fos');

      component.filteredStartLocations$.subscribe(options => {
        filteredOptions = options;
      });

      const fosOptionsLower = filteredOptions.filter(opt =>
        opt.value.toLowerCase().includes('fos')
      );

      expect(fosOptionsUpper.length).toBe(fosOptionsLower.length);
      expect(fosOptionsUpper.length).toBeGreaterThan(0);
    });
  });

  describe('Display Function', () => {
    it('should return display name for valid location value', () => {
      const kadenaDisplay = component.displayLocationFn('Kadena AB');
      expect(kadenaDisplay).toBe('Kadena Air Base - Japan');

      const fos7Display = component.displayLocationFn('FOS 7');
      expect(fos7Display).toBe('FOS 7 - Philippines');
    });

    it('should return the original value if location not found', () => {
      const unknownDisplay = component.displayLocationFn('Unknown Location');
      expect(unknownDisplay).toBe('Unknown Location');
    });

    it('should return empty string for empty/null input', () => {
      expect(component.displayLocationFn('')).toBe('');
      expect(component.displayLocationFn(null as any)).toBe('');
    });
  });

  describe('Location Option Retrieval', () => {
    it('should return correct location option for valid value', () => {
      const kadenaOption = component.getLocationOption('Kadena AB');
      expect(kadenaOption).toBeDefined();
      expect(kadenaOption?.value).toBe('Kadena AB');
      expect(kadenaOption?.type).toBe('MOB');
      expect(kadenaOption?.country).toBe('Japan');
    });

    it('should return undefined for invalid value', () => {
      const unknownOption = component.getLocationOption('Invalid Location');
      expect(unknownOption).toBeUndefined();
    });
  });

  describe('MOB Backend Value Mapping', () => {
    it('should correctly map MOB IDs to backend values', () => {
      // Access private method for testing (using bracket notation)
      const getMOBBackendValue = (component as any).getMOBBackendValue;

      expect(getMOBBackendValue('kadena')).toBe('Kadena AB');
      expect(getMOBBackendValue('andersen')).toBe('Andersen AFB');
      expect(getMOBBackendValue('yokota')).toBe('Yokota AB');
      expect(getMOBBackendValue('osan')).toBe('Osan AB');
      expect(getMOBBackendValue('jbphh')).toBe('JBPHH');
    });
  });

  describe('Form Integration', () => {
    it('should have autocomplete observables for all location fields', () => {
      expect(component.filteredStartLocations$).toBeDefined();
      expect(component.filteredFinalDestinations$).toBeDefined();
      expect(component.filteredEnRouteDestinations$).toBeDefined();
      expect(component.filteredAlternateDestinations$).toBeDefined();
    });

    it('should validate backend values in form submission', () => {
      // Set valid form values using backend-compatible location names
      component.flightPlanForm.patchValue({
        selectedAircraft: mockAircraft[0], // Use the first mock aircraft
        aircraftCallSign: 'TEST01',
        startLocation: 'Kadena AB',
        finalDestination: 'FOS 7',
        alternateDestination: 'Andersen AFB',
        intention: 'LAND',
        configuration: 'CARGO_ONLY',
      });

      expect(component.flightPlanForm.valid).toBe(true);

      component.onSubmit();

      expect(mockDialogRef.close).toHaveBeenCalledWith(
        expect.objectContaining({
          startLocation: 'Kadena AB',
          finalDestination: 'FOS 7',
          alternateDestination: 'Andersen AFB',
        })
      );
    });
  });

  describe('Location Coverage', () => {
    it('should include locations from all expected countries', () => {
      const countries = [...new Set(component.allLocationOptions.map(opt => opt.country))];

      const expectedCountries = [
        'Japan', 'Guam', 'USA', 'Philippines', 'Indonesia',
        'Brunei', 'Malaysia', 'Singapore', 'Thailand',
        'Cambodia', 'Vietnam', 'Laos', 'India'
      ];

      expectedCountries.forEach(country => {
        expect(countries).toContain(country);
      });
    });

    it('should have proper distribution of MOB vs FOS locations', () => {
      const mobCount = component.allLocationOptions.filter(opt => opt.type === 'MOB').length;
      const fosCount = component.allLocationOptions.filter(opt => opt.type === 'FOS').length;

      // Should have exactly 5 MOB locations
      expect(mobCount).toBe(5);

      // Should have many more FOS locations
      expect(fosCount).toBeGreaterThan(mobCount);
      expect(fosCount).toBeGreaterThanOrEqual(40);
    });

    it('should include specific strategic locations mentioned in tests', () => {
      // Locations that appear in existing E2E tests should be available
      const strategicLocations = ['Kadena AB', 'Andersen AFB', 'FOS 7', 'FOS 8'];

      strategicLocations.forEach(location => {
        const found = component.allLocationOptions.find(opt => opt.value === location);
        expect(found).toBeDefined();
      });
    });
  });

  describe('Autocomplete UI Integration', () => {
    it('should provide filtered options that update reactively', () => {
      const startLocationControl = component.flightPlanForm.get('startLocation');
      let callCount = 0;

      component.filteredStartLocations$.subscribe(() => {
        callCount++;
      });

      // Initial subscription should fire
      expect(callCount).toBeGreaterThan(0);

      // Changing value should trigger new emission
      startLocationControl?.setValue('Kadena');
      expect(callCount).toBeGreaterThan(1);
    });

    it('should handle partial matches for user-friendly search', () => {
      const finalDestinationControl = component.flightPlanForm.get('finalDestination');

      // Test partial match
      finalDestinationControl?.setValue('FOS 1');

      let filteredOptions: any[] = [];
      component.filteredFinalDestinations$.subscribe(options => {
        filteredOptions = options;
      });

      // Should match FOS 1, FOS 10, FOS 11, etc.
      const fos1Matches = filteredOptions.filter(opt =>
        opt.value.includes('FOS 1')
      );
      expect(fos1Matches.length).toBeGreaterThanOrEqual(10); // FOS 1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19
    });
  });
});