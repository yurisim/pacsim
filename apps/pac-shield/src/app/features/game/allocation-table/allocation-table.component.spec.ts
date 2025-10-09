import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AllocationTableComponent } from './allocation-table.component';
import { AllocationStateService } from '../../../shared/services/allocation-state.service';

describe('AllocationTableComponent', () => {
  let component: AllocationTableComponent;
  let fixture: ComponentFixture<AllocationTableComponent>;
  let allocationStateService: AllocationStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AllocationTableComponent,
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AllocationStateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AllocationTableComponent);
    component = fixture.componentInstance;
    allocationStateService = TestBed.inject(AllocationStateService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.gameId).toBeNull();
    expect(component.canEdit).toBe(false);
    expect(component.availableTeams).toEqual([]);
  });

  it('should load allocation table on init if gameId is provided', () => {
    const gameId = 123;
    component.gameId = gameId;
    jest.spyOn(component, 'loadAllocationTable');

    component.ngOnInit();

    expect(component.loadAllocationTable).toHaveBeenCalled();
  });

  it('should not load allocation table on init if gameId is null', () => {
    component.gameId = null;
    jest.spyOn(component, 'loadAllocationTable');

    component.ngOnInit();

    expect(component.loadAllocationTable).not.toHaveBeenCalled();
  });

  it('should return correct status color class for FMC', () => {
    const colorClass = component.getStatusColorClass('FMC');
    expect(colorClass).toBe('md-sys-color-primary');
  });

  it('should return correct status color class for DESTROYED', () => {
    const colorClass = component.getStatusColorClass('DESTROYED');
    expect(colorClass).toBe('md-sys-color-error');
  });

  it('should return default color class for unknown status', () => {
    const colorClass = component.getStatusColorClass('UNKNOWN');
    expect(colorClass).toBe('md-sys-color-on-surface-variant');
  });

  it('should track aircraft by id', () => {
    const mockAircraft = {
      id: 456,
      callSign: 'TEST01',
      aircraftType: 'C130',
      isAllocated: false,
      allocatedToTeamName: null,
      status: 'FMC' as 'FMC' | 'DESTROYED'
    };

    const result = component.trackByAircraftId(0, mockAircraft);

    expect(result).toBe(456);
  });
});
