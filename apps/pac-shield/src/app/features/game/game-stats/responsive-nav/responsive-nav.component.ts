import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { ResponsiveNavService, NavItem } from '../responsive-nav.service';

@Component({
  selector: 'app-responsive-nav',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatBadgeModule,
    MatTabsModule
  ],
  templateUrl: './responsive-nav.component.html',
  styleUrls: ['./responsive-nav.component.scss']
})
export class ResponsiveNavComponent {
  @Output() tabChange = new EventEmitter<string>();

  navService = inject(ResponsiveNavService);

  activeTab$ = this.navService.activeTab$;
  navItems = this.navService.navItems;

  onTabSelect(tabId: string): void {
    this.navService.setActiveTab(tabId);
    this.tabChange.emit(tabId);

    // Close side nav when selecting a tab on tablet
    this.navService.closeSideNav();
  }

}
