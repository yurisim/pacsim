import { TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { FosRfiComponent } from './fos-rfi.component';
import { FosRfiService, FosRfiEntry } from './fos-rfi.service';
import { PlayerRoleService } from '../../../shared/services/player-role.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('FosRfiComponent', () => {
  let component: FosRfiComponent;
  let fixture: any;

  let mockRfi: jest.Mocked<Pick<FosRfiService, 'getByFosId' | 'getByDisplayNumber' | 'upsertAnswer' | 'rollDice'>>;
  let mockRole: jest.Mocked<Pick<PlayerRoleService, 'isCurrentPlayerGameMaster'>>;
  let mockSnack: jest.Mocked<Pick<MatSnackBar, 'open'>>;

  beforeEach(async () => {
    mockRfi = {
      getByFosId: jest.fn().mockReturnValue(of([])),
      getByDisplayNumber: jest.fn().mockReturnValue(of([])),
      upsertAnswer: jest.fn().mockReturnValue(of<FosRfiEntry[]>([])),
      rollDice: jest.fn().mockReturnValue(of<FosRfiEntry[]>([])),
    };

    mockRole = {
      isCurrentPlayerGameMaster: jest.fn().mockReturnValue(false),
    };

    mockSnack = {
      open: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [FosRfiComponent, NoopAnimationsModule],
      providers: [
        { provide: FosRfiService, useValue: mockRfi },
        { provide: PlayerRoleService, useValue: mockRole },
        { provide: MatSnackBar, useValue: mockSnack },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FosRfiComponent);
    component = fixture.componentInstance;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to prevent test failures from error logging
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    jest.restoreAllMocks();
  });

  function setInputs({
    fosId,
    fosDisplayNumber,
    gameId,
    canEdit,
  }: {
    fosId?: string | null;
    fosDisplayNumber?: number | null;
    gameId?: number | null;
    canEdit?: boolean;
  }) {
    if (fosId !== undefined) component.fosId = fosId;
    if (fosDisplayNumber !== undefined) component.fosDisplayNumber = fosDisplayNumber as any;
    if (gameId !== undefined) component.gameId = gameId as any;
    if (canEdit !== undefined) component.canEdit = canEdit;
  }

  function detect() {
    fixture.detectChanges();
  }

  it('Non-GM cannot answer (regardless of canEdit=true)', () => {
    mockRole.isCurrentPlayerGameMaster.mockReturnValue(false);

    setInputs({ fosId: 'uuid', fosDisplayNumber: 7, gameId: 1, canEdit: true });
    component.ngOnChanges({
      fosId: new SimpleChange(undefined, 'uuid', true),
      fosDisplayNumber: new SimpleChange(undefined, 7, true),
      gameId: new SimpleChange(undefined, 1, true),
    } as any);

    // API awareness
    expect(mockRfi.getByFosId).toHaveBeenCalledWith('uuid');

    // Behavior check via method
    expect(component.canAnswer()).toBe(false); // [TypeScript.canAnswer()](apps/pac-shield/src/app/features/game/fos/fos-rfi.component.ts:128)
  });

  it('GM can answer when FOS is active', () => {
    mockRole.isCurrentPlayerGameMaster.mockReturnValue(true);

    setInputs({ fosId: 'uuid', fosDisplayNumber: 7, gameId: 1, canEdit: true });

    // No template rendering required; verify permission logic only
    expect(component.canAnswer()).toBe(true); // [TypeScript.canAnswer()](apps/pac-shield/src/app/features/game/fos/fos-rfi.component.ts:128)
  });

  it('GM cannot answer when FOS is not active (no fosId)', () => {
    mockRole.isCurrentPlayerGameMaster.mockReturnValue(true);

    setInputs({ fosId: null, fosDisplayNumber: 7, gameId: 1, canEdit: true });
    component.ngOnChanges({
      fosId: new SimpleChange(undefined, undefined, true),
      fosDisplayNumber: new SimpleChange(undefined, 7, true),
      gameId: new SimpleChange(undefined, 1, true),
    } as any);

    expect(component.canAnswer()).toBe(false); // [TypeScript.canAnswer()](apps/pac-shield/src/app/features/game/fos/fos-rfi.component.ts:128)

    // In read-only mode, it should load via displayNumber path
    expect(mockRfi.getByDisplayNumber).toHaveBeenCalledWith(1, 7);
  });

  describe('Save (upsert) gating', () => {
    const fosId = 'uuid';
    const rfiKey = 'CFR';
    const rfiValue = 2;

    it('Case A (allowed): GM + active FOS triggers upsert', () => {
      mockRole.isCurrentPlayerGameMaster.mockReturnValue(true);
      mockRfi.upsertAnswer.mockReturnValue(of<FosRfiEntry[]>([{ rfiKey, rfiValue }]));

      setInputs({ fosId, fosDisplayNumber: 7, gameId: 1, canEdit: true });

      // Preconditions
      expect(component.canAnswer()).toBe(true); // [TypeScript.canAnswer()](apps/pac-shield/src/app/features/game/fos/fos-rfi.component.ts:128)

      // Simulate user action via public method
      component.setAnswer(rfiKey, rfiValue); // [TypeScript.setAnswer()](apps/pac-shield/src/app/features/game/fos/fos-rfi.component.ts:137)

      expect(mockRfi.upsertAnswer).toHaveBeenCalledTimes(1);
      expect(mockRfi.upsertAnswer).toHaveBeenCalledWith(fosId, rfiKey, rfiValue);
      // Optional: snack called
      expect(mockSnack.open).toHaveBeenCalled();
      // isLoading should be reset by completion
      expect(component.isLoading).toBe(false);
    });

    it('Case B (blocked): non-GM does NOT call upsert', () => {
      mockRole.isCurrentPlayerGameMaster.mockReturnValue(false);

      setInputs({ fosId, fosDisplayNumber: 7, gameId: 1, canEdit: true });

      expect(component.canAnswer()).toBe(false);

      component.setAnswer(rfiKey, rfiValue);
      expect(mockRfi.upsertAnswer).not.toHaveBeenCalled();
    });

    it('Case B (blocked): GM but no fosId does NOT call upsert', () => {
      mockRole.isCurrentPlayerGameMaster.mockReturnValue(true);

      setInputs({ fosId: null, fosDisplayNumber: 7, gameId: 1, canEdit: true });

      expect(component.canAnswer()).toBe(false);

      component.setAnswer(rfiKey, rfiValue);
      expect(mockRfi.upsertAnswer).not.toHaveBeenCalled();
    });
  });

  it('Payload normalization: number 2 as rfiValue does not throw and service called once', () => {
    mockRole.isCurrentPlayerGameMaster.mockReturnValue(true);
    const fosId = 'uuid';
    const rfiKey = 'CFR';
    const rfiValue = 2;

    mockRfi.upsertAnswer.mockReturnValue(of<FosRfiEntry[]>([{ rfiKey, rfiValue }]));

    setInputs({ fosId, fosDisplayNumber: 7, gameId: 1, canEdit: true });

    expect(() => component.setAnswer(rfiKey, rfiValue)).not.toThrow();
    expect(mockRfi.upsertAnswer).toHaveBeenCalledTimes(1);
    expect(mockRfi.upsertAnswer).toHaveBeenCalledWith(fosId, rfiKey, rfiValue);
  });

  it('rollDice is GM-only and requires active FOS', () => {
    const fosId = 'uuid';
    const rfiKey = 'Mobility';

    // Non-GM: should not call
    mockRole.isCurrentPlayerGameMaster.mockReturnValue(false);
    setInputs({ fosId, fosDisplayNumber: 7, gameId: 1, canEdit: true });
    component.rollDice(rfiKey); // [TypeScript.rollDice()](apps/pac-shield/src/app/features/game/fos/fos-rfi.component.ts:155)
    expect(mockRfi.rollDice).not.toHaveBeenCalled();
    mockRfi.rollDice.mockClear();

    // GM but no fosId: should not call
    mockRole.isCurrentPlayerGameMaster.mockReturnValue(true);
    setInputs({ fosId: null, fosDisplayNumber: 7, gameId: 1, canEdit: true });
    component.rollDice(rfiKey);
    expect(mockRfi.rollDice).not.toHaveBeenCalled();
    mockRfi.rollDice.mockClear();

    // GM + active FOS: should call
    mockRole.isCurrentPlayerGameMaster.mockReturnValue(true);
    mockRfi.rollDice.mockReturnValue(of<FosRfiEntry[]>([{ rfiKey, rfiValue: 3 }]));
    setInputs({ fosId, fosDisplayNumber: 7, gameId: 1, canEdit: true });
    component.rollDice(rfiKey);
    expect(mockRfi.rollDice).toHaveBeenCalledWith(fosId, rfiKey);
  });

  it('handles upsert error without throwing (shows error message)', () => {
    mockRole.isCurrentPlayerGameMaster.mockReturnValue(true);
    const fosId = 'uuid';
    const rfiKey = 'Medical';

    mockRfi.upsertAnswer.mockReturnValue(throwError(() => new Error('fail')));

    setInputs({ fosId, fosDisplayNumber: 7, gameId: 1, canEdit: true });

    component.setAnswer(rfiKey, 2);
    expect(component.errorMsg).toBeTruthy();
    expect(component.isLoading).toBe(false);
  });
});
