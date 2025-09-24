# Anti-Patterns Detective Agent

## Agent Purpose
Identify, explain, and fix common anti-patterns specific to the Pacific Shield codebase. This agent specializes in recognizing problematic code patterns and providing concrete solutions with working examples.

## When to Use This Agent
- When code reviews reveal recurring issues
- When debugging unexpected behavior that might be due to anti-patterns
- When refactoring legacy code or improving code quality
- When training team members on what NOT to do

## Core Anti-Pattern Categories

### 🚨 API Integration Anti-Patterns

**Detection Pattern:** Hardcoded API endpoints
```bash
grep -r "'/api/" apps/pac-shield/src/
rg "localhost:3000|http://|https://" apps/pac-shield/src/
```

**Common Violation:**
```typescript
// ❌ WRONG - Production failure
private baseUrl = '/api/games';
http.post('/api/player/check', data);
```

**Correct Implementation:**
```typescript
// ✅ CORRECT - Environment-aware
import { environment } from '../../../environments/environment';
private baseUrl = `${environment.apiUrl}/games`;
http.post(`${environment.apiUrl}/player/check`, data);
```

### 🏗️ Architecture Anti-Patterns

**Detection Pattern:** Barrel exports breaking tree-shaking
```bash
find apps/pac-shield/src -name "index.ts"
```

**Common Violation:**
```typescript
// ❌ WRONG - index.ts file
export * from './component.component';
export * from './service.service';
```

**Correct Implementation:**
```typescript
// ✅ CORRECT - Direct imports
import { MyComponent } from './path/to/component.component';
import { MyService } from './path/to/service.service';
```

### 🎨 UI/Styling Anti-Patterns

**Detection Pattern:** Custom elements and hardcoded styling
```bash
rg "#[0-9a-fA-F]{3,6}" apps/pac-shield/src/
rg "<button[^>]*[^m]at" apps/pac-shield/src/
find apps/pac-shield/src -name "*.css" | grep -v styles.scss
```

**Common Violation:**
```html
<!-- ❌ WRONG - Custom elements -->
<div class="custom-button" (click)="onClick()">Submit</div>
<input type="text" placeholder="Name" class="custom-input">
```

**Correct Implementation:**
```html
<!-- ✅ CORRECT - Material components -->
<button matButton="filled" (click)="onClick()">Submit</button>
<mat-form-field>
  <mat-label>Name</mat-label>
  <input matInput type="text">
</mat-form-field>
```

### 🧪 Testing Anti-Patterns

**Detection Pattern:** Unreliable test patterns
```bash
rg "setTimeout" apps/pac-shield/src/**/*.spec.ts
rg "\.toBeTruthy\(\)" apps/pac-shield/src/**/*.spec.ts
```

**Common Violation:**
```typescript
// ❌ WRONG - Timing issues
setTimeout(() => {
  expect(result).toBe(expected);
  done();
}, 300);
```

**Correct Implementation:**
```typescript
// ✅ CORRECT - Controlled timing
fakeAsync(() => {
  // trigger async operation
  tick(300);
  expect(result).toBe(expected);
});
```

## Diagnostic Workflows

### 🔍 Full Codebase Scan
```bash
# Run comprehensive anti-pattern detection
echo "=== API Routing Issues ==="
grep -r "'/api/" apps/pac-shield/src/ | wc -l

echo "=== Architecture Issues ==="
find apps/pac-shield/src -name "index.ts" | wc -l

echo "=== Styling Issues ==="
rg "#[0-9a-fA-F]{3,6}" apps/pac-shield/src/ | wc -l

echo "=== Control Flow Issues ==="
rg "\*ngIf|\*ngFor|\*ngSwitch" apps/pac-shield/src/ | wc -l
```

### 🎯 Targeted Issue Analysis
```bash
# Focus on specific file or directory
rg "PATTERN" apps/pac-shield/src/specific/path/ -n -C 2
```

## Fix Automation

### 📝 Quick Fix Templates
**API Route Fix Script:**
```bash
# Find and replace API paths
find apps/pac-shield/src -name "*.ts" -exec sed -i "s|'/api/|'\${environment.apiUrl}/|g" {} +
```

**Control Flow Migration:**
```bash
# Identify files needing control flow updates
rg "\*ngIf|\*ngFor" apps/pac-shield/src/ -l
```

### 🔄 Refactoring Guidance
1. **Identify the anti-pattern** using detection commands
2. **Understand the impact** (performance, maintainability, etc.)
3. **Apply the correct pattern** with working examples
4. **Verify the fix** with validation commands
5. **Test thoroughly** to ensure no regressions

## Common Scenarios

### Scenario 1: Production API Failures
**Symptoms:** 404 errors in production, API calls working in dev
**Detection:** `grep -r "'/api/" apps/pac-shield/src/`
**Fix:** Replace with `${environment.apiUrl}/endpoint`

### Scenario 2: Large Bundle Sizes
**Symptoms:** Slow initial page loads, large JavaScript bundles
**Detection:** `find apps/pac-shield/src -name "index.ts"`
**Fix:** Remove barrel exports, use direct imports

### Scenario 3: Theme Inconsistencies
**Symptoms:** Components don't match design system, broken dark mode
**Detection:** `rg "#[0-9a-fA-F]{3,6}" apps/pac-shield/src/`
**Fix:** Use Material 3 CSS variables and Tailwind utilities

## Integration Points
- Automatically run during CI/CD pipeline
- Integrate with code review process
- Provide fix suggestions in IDE
- Track anti-pattern reduction metrics over time