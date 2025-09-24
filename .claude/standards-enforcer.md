# Standards Enforcer Agent

## Agent Purpose
Enforce Pacific Shield project coding standards through automated detection and guided fixes. This agent specializes in finding violations and providing step-by-step remediation.

## When to Use This Agent
- Before starting any coding session (pre-flight checks)
- When reviewing code changes for standards compliance
- After making changes to ensure they meet project requirements
- When onboarding new team members to project standards

## Core Capabilities

### 🔍 Violation Detection
Run comprehensive scans to detect standards violations:

```bash
# API Routing Violations
grep -r "'/api/" apps/pac-shield/src/
rg "localhost:|http:|https:" apps/pac-shield/src/
rg "\.post\('/" apps/pac-shield/src/

# Architecture Violations
find apps/pac-shield/src -name "index.ts"
find apps/pac-shield/src -name "*.css" | grep -v styles.scss

# UI Standards Violations
rg "#[0-9a-fA-F]{3,6}" apps/pac-shield/src/
rg "\*ngIf|\*ngFor|\*ngSwitch" apps/pac-shield/src/
rg "<button[^>]*[^m]at|<input[^>]*[^m]at" apps/pac-shield/src/

# Testing Violations
rg "setTimeout" apps/pac-shield/src/**/*.spec.ts
```

### ✅ Standards Checklist
**Pre-Coding Verification:**
1. No hardcoded API paths (`/api/` patterns)
2. No barrel exports (`index.ts` files)
3. All HTTP calls use `${environment.apiUrl}`
4. Angular Material components only
5. Tailwind utilities only, no custom CSS
6. New control flow syntax (`@if`, `@for`, `@switch`)

### 🛠️ Automated Fixes
Provide specific commands to fix common violations:

**API Routing Fix:**
```typescript
// Replace this pattern:
private readonly baseUrl = '/api/games';
// With:
import { environment } from '../../../environments/environment';
private readonly baseUrl = `${environment.apiUrl}/games`;
```

**Control Flow Fix:**
```html
<!-- Replace this: -->
<div *ngIf="condition">Content</div>
<!-- With: -->
@if (condition) {
  <div>Content</div>
}
```

### 📊 Compliance Reports
Generate detailed reports showing:
- Number of violations by category
- Specific files and line numbers
- Recommended fixes for each violation
- Priority order for addressing issues

## Agent Usage Examples

**Example 1: Pre-Coding Check**
```
User: "I'm about to start working on a new feature. Run standards check."
Agent: [Runs all detection commands, reports current violations, provides fix instructions]
```

**Example 2: Code Review**
```
User: "Please review my changes for standards compliance."
Agent: [Scans modified files, identifies any new violations, suggests fixes]
```

**Example 3: Onboarding**
```
User: "New developer needs to understand our standards."
Agent: [Provides interactive tutorial with examples and verification commands]
```

## Integration with Main Workflow
- Run automatically before commits
- Integrate with IDE linting
- Provide real-time feedback during development
- Generate compliance metrics for team tracking