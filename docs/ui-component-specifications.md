# **UI Component Specifications: Operation Pacific Shield**

## **Overview**
This document provides detailed technical specifications for implementing the Civilization-inspired UI components identified in the UI Design Specification. Each component includes structure, inputs/outputs, styling guidelines, and integration requirements.

---

## **Core Layout Components**

### **AppLayoutComponent**
Primary application shell implementing the Civilization-style interface.

**Structure:**
```typescript
@Component({
  selector: 'app-layout',
  template: `
    <div class="app-container">
      <app-toolbar></app-toolbar>
      <div class="main-content">
        <div class="map-container">
          <app-game-board></app-game-board>
        </div>
        <div class="sidebar-container" [class.collapsed]="sidebarCollapsed">
          <app-context-sidebar></app-context-sidebar>
        </div>
      </div>
      <div class="bottom-panel">
        <app-status-bar></app-status-bar>
      </div>
    </div>
  `
})
```

**Key Features:**
- Responsive CSS Grid layout (75% map, 25% sidebar, 25% bottom height)
- Collapsible sidebar for tablet/mobile viewports
- Theme-aware styling integration
- Role-based conditional rendering

**CSS Grid Implementation:**
```scss
.app-container {
  display: grid;
  grid-template-rows: 60px 1fr 200px; // toolbar, content, bottom panel
  grid-template-columns: 1fr 400px; // map area, sidebar
  height: 100vh;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr; // single column for mobile
  }
}

.main-content {
  display: contents; // allows children to participate in parent grid
}
```

---

## **Map and Board Components**

### **GameBoardComponent (Enhanced)**
Central map interface with Civilization-style interactions.

**New Features:**
```typescript
export interface MapLayerConfig {
  id: string;
  name: string;
  enabled: boolean;
  icon: string;
}

export interface HexInteractionState {
  selectedHex?: string;
  hoveredHex?: string;
  validMoveTargets: string[];
  rangeOverlay?: RangeOverlayData;
}

@Component({
  selector: 'app-game-board',
  templateUrl: './game-board.component.html'
})
export class GameBoardComponent implements OnInit, OnDestroy {
  @Input() gameState: GameState;
  @Output() hexClicked = new EventEmitter<HexClickEvent>();
  @Output() assetMoved = new EventEmitter<AssetMoveEvent>();
  
  mapLayers: MapLayerConfig[] = [
    { id: 'political', name: 'Political Boundaries', enabled: true, icon: 'flag' },
    { id: 'threats', name: 'Threat Zones', enabled: true, icon: 'warning' },
    { id: 'supply', name: 'Supply Lines', enabled: false, icon: 'local_shipping' },
    { id: 'satellites', name: 'Satellite Coverage', enabled: false, icon: 'satellite_alt' }
  ];
  
  interactionState: HexInteractionState = {};
  
  // Civilization-style layer toggle
  toggleMapLayer(layerId: string): void {
    const layer = this.mapLayers.find(l => l.id === layerId);
    if (layer) {
      layer.enabled = !layer.enabled;
      this.updateMapOverlays();
    }
  }
  
  // Enhanced hex interaction
  onHexHover(hexId: string): void {
    this.interactionState.hoveredHex = hexId;
    this.showHexTooltip(hexId);
  }
  
  onHexClick(hexId: string): void {
    this.interactionState.selectedHex = hexId;
    this.calculateValidMoves(hexId);
    this.hexClicked.emit({ hexId, hex: this.getHexData(hexId) });
  }
  
  private calculateValidMoves(hexId: string): void {
    // Calculate range overlays and valid move targets
    // Update interactionState.validMoveTargets and rangeOverlay
  }
}
```

**Template Enhancements:**
```html
<!-- Map Layer Toggle Panel -->
<div class="map-controls">
  <mat-expansion-panel class="layer-panel">
    <mat-expansion-panel-header>
      <mat-icon>layers</mat-icon>
      <span>Map Layers</span>
    </mat-expansion-panel-header>
    
    <div class="layer-toggles">
      <mat-slide-toggle 
        *ngFor="let layer of mapLayers"
        [(ngModel)]="layer.enabled"
        (change)="toggleMapLayer(layer.id)">
        <mat-icon>{{ layer.icon }}</mat-icon>
        {{ layer.name }}
      </mat-slide-toggle>
    </div>
  </mat-expansion-panel>
</div>

<!-- Range Overlay SVG -->
<svg class="range-overlay" *ngIf="interactionState.rangeOverlay">
  <circle 
    *ngFor="let circle of interactionState.rangeOverlay.circles"
    [attr.cx]="circle.x"
    [attr.cy]="circle.y" 
    [attr.r]="circle.radius"
    [attr.class]="circle.type">
  </circle>
</svg>
```

### **GameTokenComponent (Enhanced)**
Asset representation with NATO symbology and interaction states.

```typescript
export interface AssetDisplayData {
  id: string;
  type: AssetType;
  strength?: number;
  status: AssetStatus;
  teamColor: string;
  position: HexCoordinate;
  selected: boolean;
  draggable: boolean;
}

@Component({
  selector: 'app-game-token',
  template: `
    <div class="game-token"
         [class]="getTokenClasses()"
         [cdkDragDisabled]="!asset.draggable"
         cdkDrag
         (cdkDragStarted)="onDragStart()"
         (cdkDragEnded)="onDragEnd($event)">
      
      <!-- NATO Symbol Base -->
      <div class="symbol-base" [style.background-color]="asset.teamColor">
        <mat-icon class="unit-icon">{{ getUnitIcon() }}</mat-icon>
      </div>
      
      <!-- Status Indicators -->
      <div class="status-indicators">
        <mat-icon *ngIf="asset.status === 'damaged'" class="damage-indicator">warning</mat-icon>
        <mat-icon *ngIf="asset.status === 'maintenance'" class="maintenance-indicator">build</mat-icon>
      </div>
      
      <!-- Strength Display -->
      <div class="strength-indicator" *ngIf="asset.strength">
        d{{ asset.strength }}
      </div>
      
      <!-- Selection Highlight -->
      <div class="selection-ring" *ngIf="asset.selected"></div>
    </div>
  `
})
export class GameTokenComponent {
  @Input() asset: AssetDisplayData;
  @Output() tokenSelected = new EventEmitter<string>();
  @Output() tokenMoved = new EventEmitter<AssetMoveEvent>();
  
  getTokenClasses(): string {
    return [
      'game-token',
      `team-${this.asset.teamColor.toLowerCase()}`,
      `status-${this.asset.status}`,
      this.asset.selected ? 'selected' : '',
      this.asset.draggable ? 'draggable' : ''
    ].filter(Boolean).join(' ');
  }
  
  getUnitIcon(): string {
    const iconMap = {
      'fighter': 'flight',
      'transport': 'local_shipping',
      'satellite': 'satellite_alt',
      'ground-unit': 'group'
    };
    return iconMap[this.asset.type] || 'help';
  }
  
  onDragEnd(event: CdkDragEnd): void {
    const dropTarget = this.getDropTarget(event.dropPoint);
    if (dropTarget) {
      this.tokenMoved.emit({
        assetId: this.asset.id,
        targetHex: dropTarget.hexId,
        validMove: this.validateMove(dropTarget.hexId)
      });
    }
  }
}
```

---

## **Role-Specific Dashboard Components**

### **MobDashboardComponent (Sliding Panel)**

```typescript
@Component({
  selector: 'app-mob-dashboard',
  template: `
    <mat-drawer-container class="mob-dashboard">
      <mat-drawer 
        #drawer 
        mode="over" 
        position="end"
        [opened]="isOpen"
        class="mob-panel">
        
        <div class="panel-header">
          <h2>{{ mobData.name }} Command</h2>
          <button mat-icon-button (click)="close()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        
        <!-- Personnel Assets Section -->
        <mat-expansion-panel class="personnel-section">
          <mat-expansion-panel-header>
            <mat-icon>group</mat-icon>
            <span>Personnel Assets ({{ personnelCount }})</span>
          </mat-expansion-panel-header>
          
          <div class="personnel-list">
            <div class="personnel-item" 
                 *ngFor="let personnel of mobData.personnel">
              <div class="personnel-icon">
                <mat-icon>{{ getPersonnelIcon(personnel.type) }}</mat-icon>
              </div>
              <div class="personnel-details">
                <span class="personnel-type">{{ personnel.type }}</span>
                <span class="personnel-location">@ {{ getLocationName(personnel.location) }}</span>
              </div>
              <div class="personnel-actions">
                <button mat-icon-button (click)="reassignPersonnel(personnel)">
                  <mat-icon>swap_horiz</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </mat-expansion-panel>
        
        <!-- Equipment & Commodities -->
        <mat-expansion-panel class="inventory-section">
          <mat-expansion-panel-header>
            <mat-icon>inventory</mat-icon>
            <span>Equipment & Supplies</span>
          </mat-expansion-panel-header>
          
          <div class="inventory-grid">
            <div class="inventory-item" 
                 *ngFor="let item of mobData.inventory">
              <div class="item-icon">{{ item.icon }}</div>
              <div class="item-details">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-quantity">{{ item.current }}/{{ item.max }}</span>
              </div>
              <div class="item-status-bar">
                <mat-progress-bar 
                  mode="determinate" 
                  [value]="(item.current / item.max) * 100"
                  [color]="getStatusColor(item.current, item.max)">
                </mat-progress-bar>
              </div>
            </div>
          </div>
        </mat-expansion-panel>
        
        <!-- Controlled FOSs -->
        <mat-expansion-panel class="fos-section">
          <mat-expansion-panel-header>
            <mat-icon>place</mat-icon>
            <span>Forward Operating Sites ({{ fosCount }})</span>
          </mat-expansion-panel-header>
          
          <div class="fos-list">
            <mat-card class="fos-card" 
                      *ngFor="let fos of mobData.controlledFOSs">
              <mat-card-header>
                <mat-card-title>{{ fos.name }} ({{ fos.country }})</mat-card-title>
                <mat-card-subtitle>
                  <app-task-progress [completedTasks]="fos.completedTasks" [totalTasks]="16">
                  </app-task-progress>
                </mat-card-subtitle>
              </mat-card-header>
              
              <mat-card-content>
                <div class="fos-status">
                  <div class="runway-status">
                    <mat-icon [color]="getRunwayStatusColor(fos.runwayStatus)">
                      flight_takeoff
                    </mat-icon>
                    <span>{{ fos.runwayStatus }}</span>
                  </div>
                  <div class="personnel-count">
                    <mat-icon>group</mat-icon>
                    <span>{{ fos.personnelCount }} on-site</span>
                  </div>
                </div>
              </mat-card-content>
              
              <mat-card-actions>
                <button mat-button (click)="viewFOSDetails(fos.id)">View Details</button>
                <button mat-button (click)="assignAssets(fos.id)">Assign Assets</button>
              </mat-card-actions>
            </mat-card>
          </div>
        </mat-expansion-panel>
        
        <!-- Available Aircraft -->
        <mat-expansion-panel class="aircraft-section">
          <mat-expansion-panel-header>
            <mat-icon>flight</mat-icon>
            <span>Available Aircraft ({{ aircraftCount }})</span>
          </mat-expansion-panel-header>
          
          <div class="aircraft-list">
            <div class="aircraft-item"
                 *ngFor="let aircraft of mobData.aircraft">
              <div class="aircraft-icon">
                <mat-icon>{{ getAircraftIcon(aircraft.type) }}</mat-icon>
              </div>
              <div class="aircraft-details">
                <span class="aircraft-callsign">{{ aircraft.callsign }}</span>
                <span class="aircraft-type">{{ aircraft.type }}</span>
                <div class="aircraft-status" 
                     [class]="'status-' + aircraft.status.toLowerCase()">
                  {{ aircraft.status }}
                  <span *ngIf="aircraft.eta"> - ETA: {{ aircraft.eta }}</span>
                </div>
              </div>
              <div class="aircraft-actions">
                <button mat-button 
                        [disabled]="aircraft.status !== 'Ready'"
                        (click)="planMission(aircraft)">
                  Plan Mission
                </button>
              </div>
            </div>
          </div>
        </mat-expansion-panel>
        
      </mat-drawer>
    </mat-drawer-container>
  `
})
export class MobDashboardComponent {
  @Input() mobData: MobData;
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() personnelReassigned = new EventEmitter<PersonnelReassignmentEvent>();
  @Output() missionPlanned = new EventEmitter<AircraftMissionRequest>();
  
  get personnelCount(): number {
    return this.mobData?.personnel?.length || 0;
  }
  
  get fosCount(): number {
    return this.mobData?.controlledFOSs?.length || 0;
  }
  
  get aircraftCount(): number {
    return this.mobData?.aircraft?.filter(a => a.status === 'Ready').length || 0;
  }
}
```

### **CaocDashboardComponent (Full-Screen Modal)**

```typescript
@Component({
  selector: 'app-caoc-dashboard',
  template: `
    <div class="caoc-dashboard-overlay" *ngIf="isOpen">
      <mat-card class="caoc-command-center">
        
        <!-- Header with Tabs -->
        <mat-card-header>
          <mat-card-title>CFACC Command Dashboard</mat-card-title>
          <mat-card-subtitle>Theater Operations Control</mat-card-subtitle>
          <button mat-icon-button class="close-button" (click)="close()">
            <mat-icon>close</mat-icon>
          </button>
        </mat-card-header>
        
        <mat-tab-group [(selectedIndex)]="selectedTabIndex" class="command-tabs">
          
          <!-- ATO Management Tab -->
          <mat-tab label="ATO Management">
            <div class="ato-management-panel">
              
              <!-- Current ATO Header -->
              <div class="ato-header">
                <h3>Air Tasking Order - Day {{ currentDay }}, Block {{ currentBlock }}</h3>
                <div class="ato-actions">
                  <button mat-raised-button color="primary" (click)="addNewFlight()">
                    <mat-icon>add</mat-icon>
                    Add New Flight
                  </button>
                  <button mat-stroked-button (click)="bulkApprove()" 
                          [disabled]="!hasPendingApprovals">
                    <mat-icon>done_all</mat-icon>
                    Bulk Approve
                  </button>
                  <button mat-button (click)="exportATO()">
                    <mat-icon>download</mat-icon>
                    Export ATO
                  </button>
                </div>
              </div>
              
              <!-- ATO Table -->
              <div class="ato-table-container">
                <table mat-table [dataSource]="atoDataSource" class="ato-table">
                  
                  <!-- Flight Column -->
                  <ng-container matColumnDef="flight">
                    <th mat-header-cell *matHeaderCellDef>Flight</th>
                    <td mat-cell *matCellDef="let ato">{{ ato.callsign }}</td>
                  </ng-container>
                  
                  <!-- Aircraft Column -->
                  <ng-container matColumnDef="aircraft">
                    <th mat-header-cell *matHeaderCellDef>Aircraft</th>
                    <td mat-cell *matCellDef="let ato">
                      <div class="aircraft-cell">
                        <mat-icon>{{ getAircraftIcon(ato.aircraft.type) }}</mat-icon>
                        <span>{{ ato.aircraft.type }}</span>
                      </div>
                    </td>
                  </ng-container>
                  
                  <!-- Route Column -->
                  <ng-container matColumnDef="route">
                    <th mat-header-cell *matHeaderCellDef>Route</th>
                    <td mat-cell *matCellDef="let ato">
                      <div class="route-display">
                        <span class="origin">{{ ato.origin }}</span>
                        <mat-icon class="route-arrow">arrow_forward</mat-icon>
                        <span class="destination">{{ ato.destination }}</span>
                      </div>
                    </td>
                  </ng-container>
                  
                  <!-- Intent Column -->
                  <ng-container matColumnDef="intent">
                    <th mat-header-cell *matHeaderCellDef>Intent</th>
                    <td mat-cell *matCellDef="let ato">{{ ato.intent }}</td>
                  </ng-container>
                  
                  <!-- Status Column -->
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let ato">
                      <mat-chip [color]="getStatusColor(ato.status)">
                        {{ ato.status }}
                      </mat-chip>
                    </td>
                  </ng-container>
                  
                  <!-- PPR Actions Column -->
                  <ng-container matColumnDef="ppr">
                    <th mat-header-cell *matHeaderCellDef>PPR</th>
                    <td mat-cell *matCellDef="let ato">
                      <div class="ppr-actions" *ngIf="ato.status === 'Pending'">
                        <button mat-mini-fab color="primary" 
                                (click)="approvePPR(ato.id)"
                                matTooltip="Approve PPR">
                          <mat-icon>check</mat-icon>
                        </button>
                        <button mat-mini-fab color="warn" 
                                (click)="denyPPR(ato.id)"
                                matTooltip="Deny PPR">
                          <mat-icon>close</mat-icon>
                        </button>
                      </div>
                      <mat-icon *ngIf="ato.status === 'Approved'" color="primary">
                        check_circle
                      </mat-icon>
                    </td>
                  </ng-container>
                  
                  <tr mat-header-row *matHeaderRowDef="atoDisplayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: atoDisplayedColumns;"></tr>
                  
                </table>
              </div>
              
            </div>
          </mat-tab>
          
          <!-- Resource Allocation Tab -->
          <mat-tab label="Resource Allocation">
            <div class="resource-allocation-panel">
              
              <!-- PPR Queue -->
              <div class="ppr-queue-section">
                <h3>PPR Queue Status</h3>
                <div class="ppr-summary">
                  <div class="ppr-stat pending">
                    <mat-icon>schedule</mat-icon>
                    <span class="count">{{ pprQueue.pending }}</span>
                    <span class="label">Pending Review</span>
                  </div>
                  <div class="ppr-stat approved">
                    <mat-icon>check_circle</mat-icon>
                    <span class="count">{{ pprQueue.approved }}</span>
                    <span class="label">Approved Today</span>
                  </div>
                  <div class="ppr-stat denied">
                    <mat-icon>cancel</mat-icon>
                    <span class="count">{{ pprQueue.denied }}</span>
                    <span class="label">Denied</span>
                  </div>
                </div>
                <div class="ppr-actions">
                  <button mat-raised-button color="primary" 
                          [disabled]="pprQueue.pending === 0"
                          (click)="approveAllValid()">
                    Approve All Valid
                  </button>
                  <button mat-stroked-button (click)="reviewIndividual()">
                    Review Individual
                  </button>
                </div>
              </div>
              
              <!-- Available Assets -->
              <div class="asset-allocation-section">
                <h3>Available Assets</h3>
                <div class="asset-grid">
                  <mat-card class="asset-card" *ngFor="let assetType of availableAssets">
                    <mat-card-header>
                      <div mat-card-avatar>
                        <mat-icon>{{ assetType.icon }}</mat-icon>
                      </div>
                      <mat-card-title>{{ assetType.name }}</mat-card-title>
                      <mat-card-subtitle>{{ assetType.available }} available</mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="asset-status-breakdown">
                        <div class="status-item ready">
                          <span>Ready: {{ assetType.ready }}</span>
                        </div>
                        <div class="status-item maintenance">
                          <span>Maintenance: {{ assetType.maintenance }}</span>
                        </div>
                        <div class="status-item deployed">
                          <span>Deployed: {{ assetType.deployed }}</span>
                        </div>
                      </div>
                    </mat-card-content>
                    <mat-card-actions>
                      <button mat-button (click)="allocateAssets(assetType.id)">
                        Allocate
                      </button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              </div>
              
            </div>
          </mat-tab>
          
          <!-- Intelligence Tab -->
          <mat-tab label="Intelligence">
            <!-- Intelligence content would go here -->
          </mat-tab>
          
          <!-- Operations Tab -->
          <mat-tab label="Operations">
            <div class="theater-status-panel">
              <h3>Theater Status Overview</h3>
              
              <div class="status-metrics">
                <div class="metric-card">
                  <mat-icon>place</mat-icon>
                  <div class="metric-content">
                    <span class="metric-value">{{ theaterStatus.activeFOSs }}</span>
                    <span class="metric-label">Active FOSs</span>
                  </div>
                </div>
                
                <div class="metric-card">
                  <mat-icon>flight_takeoff</mat-icon>
                  <div class="metric-content">
                    <span class="metric-value">{{ theaterStatus.operationalRunways }}</span>
                    <span class="metric-label">Operational Runways</span>
                  </div>
                </div>
                
                <div class="metric-card">
                  <mat-icon>trending_up</mat-icon>
                  <div class="metric-content">
                    <span class="metric-value">{{ theaterStatus.totalSorties }}</span>
                    <span class="metric-label">Total Sorties</span>
                  </div>
                </div>
              </div>
              
              <!-- Political Access Status -->
              <div class="political-access-section">
                <h4>Political Access Status</h4>
                <div class="access-status-grid">
                  <div class="country-status" 
                       *ngFor="let country of politicalAccess"
                       [class]="'access-' + country.status.toLowerCase()">
                    <mat-icon>{{ getAccessIcon(country.status) }}</mat-icon>
                    <span class="country-name">{{ country.name }}</span>
                    <span class="access-level">{{ country.status }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Threat Assessment -->
              <div class="threat-assessment-section">
                <h4>Current Threat Level</h4>
                <div class="threat-indicator" [class]="'threat-' + currentThreatLevel.toLowerCase()">
                  <mat-icon>{{ getThreatIcon(currentThreatLevel) }}</mat-icon>
                  <span class="threat-level">{{ currentThreatLevel }}</span>
                </div>
              </div>
              
            </div>
          </mat-tab>
          
        </mat-tab-group>
        
        <!-- Footer Actions -->
        <mat-card-actions class="dashboard-footer">
          <button mat-button (click)="close()">Close</button>
          <button mat-stroked-button (click)="exportReport()">Export Report</button>
          <button mat-raised-button color="warn" (click)="emergencyOverride()">
            <mat-icon>warning</mat-icon>
            Emergency Override
          </button>
        </mat-card-actions>
        
      </mat-card>
    </div>
  `
})
export class CaocDashboardComponent {
  @Input() isOpen = false;
  @Input() atoData: ATOLineData[];
  @Input() theaterStatus: TheaterStatusData;
  @Input() politicalAccess: PoliticalAccessData[];
  
  @Output() closed = new EventEmitter<void>();
  @Output() pprApproved = new EventEmitter<PPRApprovalEvent>();
  @Output() assetsAllocated = new EventEmitter<AssetAllocationEvent>();
  
  selectedTabIndex = 0;
  atoDisplayedColumns = ['flight', 'aircraft', 'route', 'intent', 'status', 'ppr'];
  
  get hasPendingApprovals(): boolean {
    return this.atoData?.some(ato => ato.status === 'Pending') || false;
  }
  
  approvePPR(atoId: string): void {
    this.pprApproved.emit({ atoId, approved: true });
  }
  
  denyPPR(atoId: string): void {
    this.pprApproved.emit({ atoId, approved: false });
  }
}
```

---

## **Interactive Dialog Components**

### **FlightPlannerDialogComponent (Enhanced)**

```typescript
export interface MissionPlannerData {
  availableAircraft: AircraftData[];
  availableDestinations: LocationData[];
  missionTypes: MissionType[];
  weaponLoadouts: WeaponLoadout[];
  currentPoliticalAccess: PoliticalAccessData;
  weatherAdvisories: WeatherAdvisory[];
}

@Component({
  selector: 'app-flight-planner-dialog',
  templateUrl: './flight-planner-dialog.component.html'
})
export class FlightPlannerDialogComponent implements OnInit {
  @Inject(MAT_DIALOG_DATA) public data: MissionPlannerData,
  
  missionForm: FormGroup;
  selectedAircraft: AircraftData | null = null;
  routeValidation: RouteValidationResult | null = null;
  warnings: PlannerWarning[] = [];
  
  ngOnInit(): void {
    this.initializeForm();
    this.setupFormValidation();
  }
  
  private initializeForm(): void {
    this.missionForm = this.fb.group({
      aircraft: ['', Validators.required],
      callsign: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{4,8}$/)]],
      missionType: ['', Validators.required],
      priority: ['Routine'],
      origin: ['', Validators.required],
      destination: ['', Validators.required],
      timeOnStation: [2],
      altitude: ['Medium'],
      radioFreq: ['tactical_1'],
      roe: ['Self Defense'],
      bingoFuel: [25],
      weapons: this.fb.array([]),
      fuel: this.fb.group({
        dropTank: [false],
        internal: [true],
        buddyTank: [false]
      }),
      specialEquipment: this.fb.array([])
    });
  }
  
  onAircraftSelected(aircraft: AircraftData): void {
    this.selectedAircraft = aircraft;
    this.validateRoute();
    this.updateWarnings();
  }
  
  onDestinationChanged(): void {
    this.validateRoute();
    this.updatePoliticalWarnings();
    this.updateWeatherWarnings();
  }
  
  private validateRoute(): void {
    if (this.selectedAircraft && this.missionForm.get('destination')?.value) {
      // Calculate fuel requirements, range validation, etc.
      this.routeValidation = {
        isValid: true,
        flightTime: 45, // minutes
        fuelRequired: 2,
        rangeStatus: { used: 4, available: 6 }
      };
    }
  }
  
  private updateWarnings(): void {
    this.warnings = [];
    
    // Political clearance warnings
    if (this.requiresPoliticalClearance()) {
      this.warnings.push({
        type: 'political',
        message: 'Political clearance required for overflight',
        severity: 'warning'
      });
    }
    
    // Weather warnings
    if (this.hasWeatherAdvisory()) {
      this.warnings.push({
        type: 'weather',
        message: 'Weather advisory active for destination area',
        severity: 'caution'
      });
    }
    
    // Fuel warnings
    if (this.isFuelCritical()) {
      this.warnings.push({
        type: 'fuel',
        message: 'Mission exceeds recommended fuel margins',
        severity: 'critical'
      });
    }
  }
  
  onSubmit(): void {
    if (this.missionForm.valid) {
      const flightPlan: FlightPlanData = {
        ...this.missionForm.value,
        aircraft: this.selectedAircraft,
        validation: this.routeValidation,
        warnings: this.warnings
      };
      
      this.dialogRef.close({ action: 'submit', data: flightPlan });
    }
  }
}
```

### **CombatDialogComponent (Enhanced)**

```typescript
export interface CombatEngagementData {
  attacker: CombatUnit;
  defender: CombatUnit;
  hexId: string;
  availableWingmen: CombatUnit[];
  combatModifiers: CombatModifier[];
  forcePackageOptions: ForcePackageOption[];
}

@Component({
  selector: 'app-combat-dialog',
  template: `
    <div class="combat-engagement-dialog">
      
      <h2 mat-dialog-title>Combat Engagement: Hex {{ data.hexId }}</h2>
      
      <mat-dialog-content class="combat-content">
        
        <!-- Unit Comparison -->
        <div class="unit-comparison">
          
          <!-- Attacker -->
          <div class="combat-unit attacker">
            <div class="unit-header">
              <h3>Attacker</h3>
              <div class="unit-badge blue">{{ data.attacker.callsign }}</div>
            </div>
            
            <div class="unit-display">
              <div class="unit-icon">
                <mat-icon class="aircraft-icon">{{ getUnitIcon(data.attacker.type) }}</mat-icon>
              </div>
              <div class="unit-details">
                <div class="unit-name">{{ data.attacker.displayName }}</div>
                <div class="unit-strength">Strength: d{{ data.attacker.strength }}</div>
                <div class="unit-status">Status: {{ data.attacker.status }}</div>
                <div class="pilot-skill">Pilot: {{ data.attacker.pilotSkill }}</div>
              </div>
            </div>
          </div>
          
          <!-- VS Indicator -->
          <div class="vs-indicator">
            <mat-icon class="vs-icon">compare_arrows</mat-icon>
            <span>VS</span>
          </div>
          
          <!-- Defender -->
          <div class="combat-unit defender">
            <div class="unit-header">
              <h3>Defender</h3>
              <div class="unit-badge red">{{ data.defender.callsign || 'Unknown' }}</div>
            </div>
            
            <div class="unit-display">
              <div class="unit-icon">
                <mat-icon class="aircraft-icon">{{ getUnitIcon(data.defender.type) }}</mat-icon>
              </div>
              <div class="unit-details">
                <div class="unit-name">{{ data.defender.displayName }}</div>
                <div class="unit-strength">Strength: d{{ data.defender.strength }}</div>
                <div class="unit-status">Status: {{ data.defender.status || 'Unknown' }}</div>
                <div class="pilot-skill">Pilot: {{ data.defender.pilotSkill || '???' }}</div>
              </div>
            </div>
          </div>
          
        </div>
        
        <!-- Combat Modifiers -->
        <div class="combat-modifiers-section">
          <h3>Combat Modifiers</h3>
          <div class="modifiers-list">
            <div class="modifier-item" 
                 *ngFor="let modifier of data.combatModifiers"
                 [class]="getModifierClass(modifier)">
              <span class="modifier-name">{{ modifier.name }}:</span>
              <span class="modifier-value">{{ formatModifier(modifier.value) }}</span>
              <span class="modifier-description">({{ modifier.description }})</span>
            </div>
          </div>
        </div>
        
        <!-- Force Package Options -->
        <div class="force-package-section" *ngIf="data.availableWingmen.length > 0">
          <h3>Force Package Options</h3>
          <div class="wingman-options">
            <mat-checkbox 
              *ngFor="let option of data.forcePackageOptions"
              [(ngModel)]="option.selected"
              (change)="updateCombatCalculations()">
              {{ option.description }}
              <span class="effectiveness-bonus">({{ option.effectivenessBonus }})</span>
            </mat-checkbox>
          </div>
        </div>
        
        <!-- Dice Results -->
        <div class="dice-results-section">
          <h3>Combat Resolution</h3>
          
          <div class="dice-display" *ngIf="!combatResolved">
            <div class="dice-roll attacker-roll">
              <label>Attacker Roll:</label>
              <div class="dice-input">
                <input type="number" 
                       [(ngModel)]="attackerRoll" 
                       [max]="data.attacker.strength"
                       [disabled]="rollsLocked"
                       class="roll-input">
                <span class="roll-modifier"> + {{ getTotalModifier('attacker') }}</span>
                <span class="roll-description">({{ getNetModifierDescription('attacker') }})</span>
              </div>
            </div>
            
            <div class="dice-roll defender-roll">
              <label>Defender Roll:</label>
              <div class="dice-input">
                <input type="number" 
                       [(ngModel)]="defenderRoll" 
                       [max]="data.defender.strength"
                       [disabled]="rollsLocked"
                       class="roll-input">
                <span class="roll-modifier"> + {{ getTotalModifier('defender') }}</span>
                <span class="roll-description">({{ getNetModifierDescription('defender') }})</span>
              </div>
            </div>
          </div>
          
          <!-- Combat Result -->
          <div class="combat-result" *ngIf="combatResolved">
            <div class="result-summary" [class]="getResultClass()">
              <mat-icon class="result-icon">{{ getResultIcon() }}</mat-icon>
              <h4>{{ getResultDescription() }}</h4>
            </div>
            
            <div class="result-details">
              <p><strong>Final Rolls:</strong></p>
              <p>Attacker: {{ attackerRoll }} + {{ getTotalModifier('attacker') }} = {{ attackerTotal }}</p>
              <p>Defender: {{ defenderRoll }} + {{ getTotalModifier('defender') }} = {{ defenderTotal }}</p>
              
              <div class="casualties" *ngIf="casualties.length > 0">
                <p><strong>Casualties:</strong></p>
                <ul>
                  <li *ngFor="let casualty of casualties">{{ casualty }}</li>
                </ul>
              </div>
            </div>
          </div>
          
        </div>
        
      </mat-dialog-content>
      
      <mat-dialog-actions class="combat-actions">
        <button mat-button (click)="cancel()">Cancel</button>
        <button mat-button 
                (click)="autoResolve()" 
                *ngIf="!combatResolved">
          Auto-Resolve
        </button>
        <button mat-raised-button 
                color="primary"
                (click)="rollDice()" 
                [disabled]="!canRollDice()"
                *ngIf="!combatResolved">
          <mat-icon>casino</mat-icon>
          Roll Dice
        </button>
        <button mat-raised-button 
                color="primary"
                (click)="confirmResult()" 
                *ngIf="combatResolved">
          Confirm Result
        </button>
      </mat-dialog-actions>
      
    </div>
  `
})
export class CombatDialogComponent {
  @Inject(MAT_DIALOG_DATA) public data: CombatEngagementData,
  
  attackerRoll: number | null = null;
  defenderRoll: number | null = null;
  combatResolved = false;
  rollsLocked = false;
  casualties: string[] = [];
  
  get attackerTotal(): number {
    return (this.attackerRoll || 0) + this.getTotalModifier('attacker');
  }
  
  get defenderTotal(): number {
    return (this.defenderRoll || 0) + this.getTotalModifier('defender');
  }
  
  rollDice(): void {
    // Animate dice rolling
    this.startDiceAnimation();
    
    setTimeout(() => {
      this.attackerRoll = Math.floor(Math.random() * this.data.attacker.strength) + 1;
      this.defenderRoll = Math.floor(Math.random() * this.data.defender.strength) + 1;
      this.resolveCombat();
    }, 2000); // 2 second animation
  }
  
  private resolveCombat(): void {
    this.combatResolved = true;
    
    // Determine winner and casualties
    if (this.attackerTotal > this.defenderTotal) {
      this.casualties.push(`${this.data.defender.displayName} destroyed`);
    } else {
      this.casualties.push(`${this.data.attacker.displayName} destroyed`);
      
      // Check for wingman casualties in force package
      const selectedPackages = this.data.forcePackageOptions.filter(o => o.selected);
      if (selectedPackages.length > 0) {
        this.casualties.push('All participating wingmen also lost');
      }
    }
  }
  
  confirmResult(): void {
    const result: CombatResult = {
      attackerRoll: this.attackerRoll!,
      defenderRoll: this.defenderRoll!,
      attackerTotal: this.attackerTotal,
      defenderTotal: this.defenderTotal,
      winner: this.attackerTotal > this.defenderTotal ? 'attacker' : 'defender',
      casualties: this.casualties,
      forcePackageUsed: this.data.forcePackageOptions.some(o => o.selected)
    };
    
    this.dialogRef.close({ action: 'resolve', result });
  }
}
```

---

## **Turn Management Components**

### **TurnProgressionComponent**

```typescript
@Component({
  selector: 'app-turn-progression',
  template: `
    <div class="turn-progression-panel">
      
      <!-- Current Status -->
      <div class="current-status">
        <div class="turn-info">
          <span class="turn-label">Turn {{ currentTurn }}</span>
          <span class="phase-label">Phase: {{ currentPhase }}</span>
        </div>
        <div class="progress-indicator">
          <mat-progress-bar 
            mode="determinate" 
            [value]="phaseProgress"
            color="primary">
          </mat-progress-bar>
        </div>
      </div>
      
      <!-- Outstanding Actions -->
      <div class="outstanding-actions" *ngIf="outstandingActions.length > 0">
        <h4>Outstanding Actions:</h4>
        <div class="action-list">
          <div class="action-item" 
               *ngFor="let action of outstandingActions"
               [class]="action.severity">
            <mat-icon class="action-icon">{{ getActionIcon(action.type) }}</mat-icon>
            <span class="action-description">{{ action.description }}</span>
            <span class="action-count" *ngIf="action.count > 1">({{ action.count }})</span>
          </div>
        </div>
      </div>
      
      <!-- Completed Actions -->
      <div class="completed-actions" *ngIf="completedActions.length > 0">
        <h4>Completed:</h4>
        <div class="action-list">
          <div class="action-item completed" 
               *ngFor="let action of completedActions">
            <mat-icon class="action-icon completed">check_circle</mat-icon>
            <span class="action-description">{{ action.description }}</span>
          </div>
        </div>
      </div>
      
      <!-- Next Phase Button (Civilization-style) -->
      <div class="phase-control">
        <button mat-raised-button 
                color="primary" 
                class="next-phase-button"
                [disabled]="!canAdvancePhase"
                (click)="openPhaseConfirmation()">
          <mat-icon>skip_next</mat-icon>
          {{ getNextPhaseButtonText() }}
        </button>
        
        <mat-checkbox 
          [(ngModel)]="forceAdvance"
          *ngIf="outstandingActions.length > 0"
          class="force-advance-checkbox">
          Force advance (ignore outstanding actions)
        </mat-checkbox>
      </div>
      
      <!-- Player Ready Status -->
      <div class="player-status" *ngIf="multiplayerGame">
        <h4>Player Status:</h4>
        <div class="player-list">
          <div class="player-item" 
               *ngFor="let player of playerStatus"
               [class]="player.ready ? 'ready' : 'waiting'">
            <div class="player-avatar" [style.background-color]="player.teamColor">
              {{ player.initials }}
            </div>
            <span class="player-name">{{ player.name }}</span>
            <mat-icon class="ready-indicator">
              {{ player.ready ? 'check_circle' : 'schedule' }}
            </mat-icon>
          </div>
        </div>
      </div>
      
    </div>
  `
})
export class TurnProgressionComponent {
  @Input() currentTurn: number;
  @Input() currentPhase: GamePhase;
  @Input() outstandingActions: OutstandingAction[];
  @Input() completedActions: CompletedAction[];
  @Input() playerStatus: PlayerStatus[];
  @Input() multiplayerGame = false;
  
  @Output() phaseAdvanceRequested = new EventEmitter<PhaseAdvanceRequest>();
  
  forceAdvance = false;
  
  get canAdvancePhase(): boolean {
    return this.outstandingActions.length === 0 || this.forceAdvance;
  }
  
  get phaseProgress(): number {
    if (this.outstandingActions.length === 0) return 100;
    
    const total = this.outstandingActions.length + this.completedActions.length;
    return total > 0 ? (this.completedActions.length / total) * 100 : 0;
  }
  
  getNextPhaseButtonText(): string {
    const phaseMap = {
      'Planning': 'Begin Execution',
      'Execution': 'Begin Resolution', 
      'Resolution': 'Next Turn'
    };
    return phaseMap[this.currentPhase] || 'Advance Phase';
  }
  
  openPhaseConfirmation(): void {
    const dialogData: PhaseConfirmationData = {
      currentPhase: this.currentPhase,
      nextPhase: this.getNextPhase(),
      outstandingActions: this.outstandingActions,
      forceAdvance: this.forceAdvance,
      automatedProcessing: this.getAutomatedProcessingList()
    };
    
    const dialogRef = this.dialog.open(PhaseConfirmationDialogComponent, {
      data: dialogData,
      width: '600px',
      disableClose: true
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result?.confirmed) {
        this.phaseAdvanceRequested.emit({
          targetPhase: this.getNextPhase(),
          forceAdvance: this.forceAdvance,
          automatedProcessing: true
        });
      }
    });
  }
}
```

This comprehensive specification provides the technical foundation for implementing all the Civilization-style UI components identified in the design document, with detailed Angular component structures, TypeScript interfaces, and integration patterns.
