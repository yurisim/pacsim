# Prompt Template Guide Agent

## Agent Purpose
Provide structured communication templates for effective human↔AI collaboration on Pacific Shield. This agent helps humans craft better prompts that lead to higher-quality, standards-compliant code.

## When to Use This Agent
- When requesting new features or code changes
- When reporting bugs or issues that need fixing
- When onboarding new team members to effective AI collaboration
- When AI outputs don't meet project standards (improve the prompt)

## Core Template Categories

### 🔧 Code Change Request Template

```
Please [SPECIFIC_REQUEST] following Pacific Shield standards:

✅ PRE-FLIGHT REQUIREMENTS:
- All HTTP calls MUST use ${environment.apiUrl}/endpoint
- NO index.ts barrel exports anywhere
- MUST use Angular Material components only
- MUST use Tailwind utilities, no custom CSS
- MUST use @if/@for/@switch (new control flow)

✅ VERIFICATION COMMANDS:
Run these after implementation:
- grep -r "'/api/" apps/pac-shield/src/ (must return 0)
- find apps/pac-shield/src -name "index.ts" (must return 0)
- rg "#[0-9a-fA-F]{3,6}" apps/pac-shield/src/ (must return 0)
- npx nx lint pac-shield (must pass)

✅ CONTEXT:
- Files involved: [list specific files]
- Expected behavior: [describe exactly what should happen]
- Integration points: [mention NgRx, WebSockets, etc. if relevant]
```

### 🧪 Testing Request Template

```
Please create tests for [FEATURE] with Pacific Shield standards:

✅ TESTING REQUIREMENTS:
- MUST use fakeAsync/tick() for async operations
- MUST mock Angular Material components, test logic only
- MUST test error scenarios and edge cases
- NO setTimeout in tests (use tick() instead)
- MUST test WebSocket events if applicable

✅ TEST COVERAGE:
- [ ] Happy path scenarios
- [ ] Error handling
- [ ] Edge cases (empty data, network failures)
- [ ] Integration with NgRx (if applicable)

✅ VERIFICATION:
- All tests pass: npx nx test [app-name]
- No setTimeout usage: rg "setTimeout" apps/*/spec.ts (must return 0)
```

### 🎨 UI Component Request Template

```
Please create [COMPONENT] following Material 3 standards:

✅ UI REQUIREMENTS:
- MUST use Angular Material components exclusively
- MUST use Tailwind utilities for layout/spacing
- MUST work in both light and dark themes
- MUST be responsive (use sm:/md:/lg: prefixes)
- MUST use @if/@for/@switch syntax

✅ ACCESSIBILITY:
- MUST use <mat-label> for form fields
- MUST support keyboard navigation
- MUST have appropriate ARIA attributes
- MUST meet WCAG guidelines

✅ NO CUSTOM ELEMENTS:
- NO <div> buttons (use matButton variants)
- NO custom inputs (use mat-form-field + matInput)
- NO hardcoded colors (use CSS variables)
- NO custom CSS files

✅ RESPONSIVE BREAKPOINTS:
- Mobile: Base styles
- Tablet: sm: prefix
- Desktop: md: and lg: prefixes
```

### 🔧 Bug Fix Request Template

```
I'm experiencing [SPECIFIC_ISSUE]. Please fix according to Pacific Shield standards:

✅ ISSUE DETAILS:
- Error message: [exact error text]
- File location: [specific file and line number]
- Steps to reproduce: [numbered list]
- Expected vs actual behavior: [clear comparison]

✅ DEBUGGING CONTEXT:
- Browser/environment: [Chrome, Firefox, production, development]
- Recent changes: [what was changed recently]
- Related features: [what other features might be affected]

✅ FIX CONSTRAINTS:
- MUST follow all Pacific Shield standards
- MUST update related tests
- MUST verify fix doesn't break other features
- MUST run linting and tests before completion
```

### 🔄 Refactoring Request Template

```
Please refactor [CODE_SECTION] to improve [SPECIFIC_ASPECT]:

✅ REFACTORING GOALS:
- Current problems: [list specific issues]
- Desired improvements: [performance, maintainability, etc.]
- Standards to apply: [specific Pacific Shield standards]

✅ CONSTRAINTS:
- MUST maintain existing functionality
- MUST improve code quality metrics
- MUST follow Pacific Shield patterns
- MUST update documentation if needed

✅ TESTING REQUIREMENTS:
- All existing tests must continue to pass
- Add new tests for refactored code
- Verify performance improvements (if applicable)
```

## Communication Best Practices

### ✅ DO: Be Specific and Measurable
```
GOOD: "Create a responsive login form using Angular Material with email/password fields, validation, and submit button that calls the authentication API"

BAD: "Make a login form"
```

### ✅ DO: Reference Standards
```
GOOD: "Following the UI Development Standards section, create a Material 3 compliant dialog"

BAD: "Create a popup"
```

### ✅ DO: Include Verification Steps
```
GOOD: "After implementation, verify no hardcoded colors with: rg '#[0-9a-fA-F]{3,6}' apps/pac-shield/src/"

BAD: "Make sure it looks good"
```

### ❌ DON'T: Use Vague Language
```
AVOID:
- "Fix the styling"
- "Make it better"
- "Clean up the code"
- "Optimize this"
```

### ❌ DON'T: Forget Context
```
AVOID:
- Not mentioning which files are involved
- Not explaining the expected behavior
- Not providing error messages or reproduction steps
```

## Advanced Templates

### 🔄 Multi-Step Feature Template
```
Please implement [FEATURE] as a multi-step process:

STEP 1: [First step with specific requirements]
STEP 2: [Second step with dependencies]
STEP 3: [Final step with verification]

For each step:
- Follow Pacific Shield standards
- Run verification commands
- Update tests
- Document any new patterns
```

### 🎯 Performance Optimization Template
```
Please optimize [COMPONENT/FEATURE] for performance:

✅ CURRENT ISSUES:
- [Specific performance problems]
- [Metrics showing the issue]

✅ OPTIMIZATION TARGETS:
- [Specific performance goals]
- [Metrics to improve]

✅ CONSTRAINTS:
- Maintain existing functionality
- Follow Pacific Shield standards
- Measure before/after performance
```

## Quality Indicators

### 🎯 High-Quality Prompts Include:
- Specific requirements with clear success criteria
- Reference to Pacific Shield standards
- Verification commands to run after implementation
- Context about files, features, and expected behavior
- Testing requirements appropriate to the change

### 🚫 Low-Quality Prompts Contain:
- Vague language ("fix this", "make it better")
- No reference to project standards
- Missing context about the codebase
- No verification or testing requirements
- Subjective requirements ("make it pretty")

## Template Customization

Each template can be customized for specific scenarios:
- Add project-specific requirements
- Include additional verification commands
- Reference specific architectural patterns
- Add domain-specific context (gaming, military simulation, etc.)