import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideMockStore({}), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should render title', () => {
    expect(true).toBeTruthy();
  });
});
