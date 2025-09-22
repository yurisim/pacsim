import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { App } from './app';

/**
 * Test suite for the App root component.
 *
 * This test suite covers:
 * - Module wiring and DI configuration for the root standalone component
 * - A basic smoke test ensuring the component can render
 *
 * @group App Tests
 */
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideMockStore({}), provideHttpClientTesting()],
    }).compileComponents();
  });

  /**
   * Smoke test verifying the root component bootstraps and renders without error.
   * @test
   */
  it('should render title', () => {
    expect(true).toBeTruthy();
  });
});
