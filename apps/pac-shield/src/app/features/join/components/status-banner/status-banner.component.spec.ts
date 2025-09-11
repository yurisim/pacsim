import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBannerComponent } from './status-banner.component';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('StatusBannerComponent', () => {
  let fixture: ComponentFixture<StatusBannerComponent>;
  let component: StatusBannerComponent;

  const getIconByText = (iconText: string) => {
    const icons = fixture.debugElement.queryAll(By.css('mat-icon'));
    return icons.find(de => 
      de.nativeElement.textContent.trim() === iconText
    );
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBannerComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders spinner when state is checking', () => {
    // Use setInput to trigger OnPush change detection
    fixture.componentRef.setInput('state', 'checking');
    fixture.detectChanges();

    const spinner = fixture.debugElement.query(By.css('mat-progress-spinner'));
    expect(spinner).toBeTruthy();
  });

  it('renders check icon when state is valid', () => {
    fixture.componentRef.setInput('state', 'valid');
    fixture.detectChanges();

    const check = getIconByText('check_circle');
    expect(check).toBeTruthy();
  });

  it('renders cancel icon and message when state is invalid (string)', () => {
    fixture.componentRef.setInput('state', 'invalid');
    fixture.componentRef.setInput('message', 'Invalid room code');
    fixture.detectChanges();

    const cancel = getIconByText('cancel');
    expect(cancel).toBeTruthy();

    const msg = fixture.debugElement.query(By.css('span.md-sys-color-error'));
    expect(msg.nativeElement.textContent).toContain('Invalid room code');
  });

  it('accepts array messages and joins them', () => {
    fixture.componentRef.setInput('state', 'invalid');
    fixture.componentRef.setInput('message', ['Invalid room code', 'Please try again']);
    fixture.detectChanges();

    const msg = fixture.debugElement.query(By.css('span.md-sys-color-error'));
    const text = (msg.nativeElement.textContent || '').replace(/\s+/g, ' ').trim();
    expect(text).toContain('Invalid room code');
    expect(text).toContain('Please try again');
  });
});
