import { FormControl, ValidationErrors } from '@angular/forms';
import { nameAvailabilityValidator } from './async-name-availability.validator';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { from } from 'rxjs';
import { environment } from '../../../../environments/environment';

describe('nameAvailabilityValidator()', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('returns null when available', fakeAsync(() => {
    const control = new FormControl<string>('n.guy');
    const validator = TestBed.runInInjectionContext(() => nameAvailabilityValidator(() => 'ABC123'));

    let result: ValidationErrors | null | undefined;
    from(validator(control) as any).subscribe((r: any) => (result = r as any));

    // Debounce period
    tick(300);

    const req = httpMock.expectOne(`${environment.apiUrl}/player/check-name-availability`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ roomCode: 'ABC123', playerName: 'n.guy' });

    req.flush({ isAvailable: true });
    tick();

    expect(result!).toBeNull();
  }));

  it('returns {nameTaken:true} when not available', fakeAsync(() => {
    const control = new FormControl<string>('e.existing');
    const validator = TestBed.runInInjectionContext(() => nameAvailabilityValidator(() => 'ABC123'));

    let result: ValidationErrors | null | undefined;
    from(validator(control) as any).subscribe((r: any) => (result = r as any));

    tick(300);

    const req = httpMock.expectOne(`${environment.apiUrl}/player/check-name-availability`);
    req.flush({ isAvailable: false });
    tick();

    expect(result!).toEqual({ nameTaken: true });
  }));

  it('returns {availabilityError:true} on network error', fakeAsync(() => {
    const control = new FormControl<string>('a.name');
    const validator = TestBed.runInInjectionContext(() => nameAvailabilityValidator(() => 'ABC123'));

    let result: ValidationErrors | null | undefined;
    from(validator(control) as any).subscribe((r: any) => (result = r as any));

    tick(300);

    const req = httpMock.expectOne(`${environment.apiUrl}/player/check-name-availability`);
    req.flush({ message: 'fail' }, { status: 500, statusText: 'Server Error' });
    tick();

    expect(result!).toEqual({ availabilityError: true });
  }));
});
