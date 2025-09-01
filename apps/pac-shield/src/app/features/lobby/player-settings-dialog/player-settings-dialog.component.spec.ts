import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { PlayerSettingsDialogComponent, PlayerSettings } from './player-settings-dialog.component';
import { PlayerRole } from '../../../generated';

describe('PlayerSettingsDialogComponent', () => {
  let component: PlayerSettingsDialogComponent;
  let fixture: ComponentFixture<PlayerSettingsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PlayerSettingsDialogComponent,
        FormsModule,
        BrowserAnimationsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        AutoCompleteModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerSettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form validation', () => {
    it('should be invalid when name is empty', () => {
      component.name = '';
      component.role = 'PLAYER';
      expect(component.isFormValid).toBeFalsy();
    });

    it('should be invalid when name is only whitespace', () => {
      component.name = '   ';
      component.role = 'PLAYER';
      expect(component.isFormValid).toBeFalsy();
    });

    it('should be invalid when role is null', () => {
      component.name = 'Test Player';
      component.role = null;
      expect(component.isFormValid).toBeFalsy();
    });

    it('should be valid when both name and role are provided', () => {
      component.name = 'Test Player';
      component.role = 'COMMANDER';
      expect(component.isFormValid).toBeTruthy();
    });
  });

  describe('saveSettings', () => {
    it('should emit correct payload when role is a string', () => {
      const saveOutput = jest.spyOn(component.save, 'emit');
      component.name = '  Test Player  ';
      component.role = 'COMMANDER';

      component.saveSettings();

      expect(saveOutput).toHaveBeenCalledWith({
        name: 'Test Player',
        role: 'COMMANDER',
      });
    });

    it('should emit correct payload when role is an object', () => {
      const saveOutput = jest.spyOn(component.save, 'emit');
      component.name = 'Test Player';
      component.role = { label: 'COMMANDER', value: 'COMMANDER' };

      component.saveSettings();

      expect(saveOutput).toHaveBeenCalledWith({
        name: 'Test Player',
        role: 'COMMANDER',
      });
    });

    it('should not emit when form is invalid', () => {
      const saveOutput = jest.spyOn(component.save, 'emit');
      component.name = '';
      component.role = 'PLAYER';

      component.saveSettings();

      expect(saveOutput).not.toHaveBeenCalled();
    });

    it('should trim whitespace from name', () => {
      const saveOutput = jest.spyOn(component.save, 'emit');
      component.name = '  Test Player  ';
      component.role = 'PLAYER';

      component.saveSettings();

      expect(saveOutput).toHaveBeenCalledWith({
        name: 'Test Player',
        role: 'PLAYER',
      });
    });
  });

  describe('Role initialization', () => {
    it('should set role from currentRole input when visible becomes true', () => {
      // Set up component inputs
      fixture.componentRef.setInput('visible', false);
      fixture.componentRef.setInput('currentName', 'Test Player');
      fixture.componentRef.setInput('currentRole', 'COMMANDER');
      fixture.detectChanges();

      // Initially role should not be set
      expect(component.role).toBeNull();

      // When visible becomes true, role should be set
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      expect(component.role).toEqual({ label: 'COMMANDER', value: 'COMMANDER' });
      expect(component.name).toBe('Test Player');
    });
  });

  describe('Role formatting', () => {
    it('should format all roles correctly', () => {
      const testCases = [
        { input: 'PLAYER', expected: 'PLAYER' },
        { input: 'COMMANDER', expected: 'COMMANDER' },
        { input: 'DEPUTY', expected: 'DEPUTY' },
        { input: 'STRATEGIST', expected: 'STRATEGIST' },
        { input: 'GM', expected: 'GM' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(component['formatRoleLabel'](input as PlayerRole)).toBe(expected);
      });
    });
  });

  describe('Role filtering', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should filter roles based on query', () => {
      const event = { query: 'comm' };
      component.filterRoles(event);

      expect(component.roleOptions).toEqual([
        { label: 'COMMANDER', value: 'COMMANDER' }
      ]);
    });

    it('should be case insensitive', () => {
      const event = { query: 'COMM' };
      component.filterRoles(event);

      expect(component.roleOptions).toEqual([
        { label: 'COMMANDER', value: 'COMMANDER' }
      ]);
    });

    it('should return all options for empty query', () => {
      const event = { query: '' };
      component.filterRoles(event);

      expect(component.roleOptions.length).toBe(5); // All roles
    });
  });

  describe('cancelSettings', () => {
    it('should reset form to original values', () => {
      fixture.componentRef.setInput('currentName', 'Original Name');
      fixture.componentRef.setInput('currentRole', 'GM');
      component.ngOnInit();

      // Change values
      component.name = 'Changed Name';
      component.role = 'COMMANDER';

      // Cancel should reset
      component.cancelSettings();

      expect(component.name).toBe('Original Name');
      expect(component.role).toEqual({ label: 'GM', value: 'GM' });
    });

  });
});
