import { Injectable, inject } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { BehaviorSubject, Observable, map } from 'rxjs';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  shortLabel?: string; // For mobile
  badge?: number;
}

export type NavigationMode = 'bottom' | 'side' | 'tabs';

@Injectable({
  providedIn: 'root'
})
export class ResponsiveNavService {
  private breakpointObserver = inject(BreakpointObserver);
  
  private activeTabSubject = new BehaviorSubject<string>('scoreboard');
  activeTab$ = this.activeTabSubject.asObservable();
  
  private sideNavOpenSubject = new BehaviorSubject<boolean>(false);
  sideNavOpen$ = this.sideNavOpenSubject.asObservable();

  // Navigation items
  readonly navItems: NavItem[] = [
    { id: 'scoreboard', label: 'Scoreboard', shortLabel: 'Score', icon: 'leaderboard' },
    { id: 'caoc', label: 'CAOC Dashboard', shortLabel: 'CAOC', icon: 'radar' },
    { id: 'mob', label: 'MOB Dashboard', shortLabel: 'MOB', icon: 'local_shipping' },
    { id: 'fos', label: 'FOS Dashboard', shortLabel: 'FOS', icon: 'oil_barrel' },
    { id: 'cspoc', label: 'CSpOC Board', shortLabel: 'CSpOC', icon: 'satellite' },
    { id: 'medcom', label: 'MEDCOM', shortLabel: 'MEDCOM', icon: 'medical_services' },
    { id: 'log', label: 'Game Log', shortLabel: 'Log', icon: 'history' }
  ];

  // Responsive breakpoints
  readonly isMobile$ = this.breakpointObserver.observe([
    '(max-width: 639px)' // Tailwind's sm breakpoint
  ]).pipe(map(result => result.matches));

  readonly isTablet$ = this.breakpointObserver.observe([
    '(min-width: 640px) and (max-width: 1023px)' // sm to lg
  ]).pipe(map(result => result.matches));

  readonly isDesktop$ = this.breakpointObserver.observe([
    '(min-width: 1024px)' // lg and up
  ]).pipe(map(result => result.matches));

  // Navigation mode based on breakpoint
  readonly navigationMode$: Observable<NavigationMode> = this.breakpointObserver.observe([
    '(max-width: 639px)',
    '(min-width: 640px) and (max-width: 1023px)',
    '(min-width: 1024px)'
  ]).pipe(
    map(result => {
      if (result.breakpoints['(max-width: 639px)']) {
        return 'bottom';
      } else if (result.breakpoints['(min-width: 640px) and (max-width: 1023px)']) {
        return 'side';
      } else {
        return 'tabs';
      }
    })
  );

  setActiveTab(tabId: string): void {
    this.activeTabSubject.next(tabId);
  }

  getActiveTab(): string {
    return this.activeTabSubject.value;
  }

  toggleSideNav(): void {
    this.sideNavOpenSubject.next(!this.sideNavOpenSubject.value);
  }

  openSideNav(): void {
    this.sideNavOpenSubject.next(true);
  }

  closeSideNav(): void {
    this.sideNavOpenSubject.next(false);
  }

  getNavItem(id: string): NavItem | undefined {
    return this.navItems.find(item => item.id === id);
  }

  getNavItemIndex(id: string): number {
    return this.navItems.findIndex(item => item.id === id);
  }
}