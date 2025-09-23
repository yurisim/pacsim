import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MembersListComponent } from './members-list.component';

describe('MembersListComponent', () => {
  let fixture: ComponentFixture<MembersListComponent>;
  let component: MembersListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersListComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(MembersListComponent);
    component = fixture.componentInstance;
  });

  it('renders rows for each member across role groups', () => {
    const roleGroups: any[] = [
      {
        role: 'COMMANDER',
        players: [
          { id: 1, name: 'a.smith' },
        ],
      },
      {
        role: 'PLAYER',
        players: [
          { id: 2, name: 'b.jones' },
          { id: 3, name: 'c.davis' },
        ],
      },
    ];

    component.roleGroups = roleGroups as any;
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.css('[data-testid="members-list-row"]'));
    expect(rows.length).toBe(3);
  });
});
