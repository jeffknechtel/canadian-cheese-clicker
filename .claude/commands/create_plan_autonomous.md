# Autonomous Implementation Plan Creation

You are tasked with creating a detailed implementation plan AUTONOMOUSLY. This means you must complete the entire process without waiting for user input. You should be thorough but decisive - make reasonable assumptions when needed and document them in the plan.

## CRITICAL: This is an autonomous workflow

- DO NOT ask questions or wait for user input
- DO NOT present options and ask which to choose
- DO make reasonable decisions based on codebase patterns
- DO document any assumptions you make in the plan
- DO write the plan file before completing

## Process

### Step 1: Read Context (Required)

1. **Read the provided file path FULLY** - this contains the research or ticket information
2. **Read any related files mentioned** in the document

### Step 2: Quick Research

1. Use **codebase-locator** or **codebase-analyzer** agents to understand relevant code
2. Find existing patterns to follow
3. Identify key files that will need changes

### Step 3: Write the Plan

**IMPORTANT**: You MUST write the plan file using the Write tool.

Write to: `thoughts/shared/plans/{descriptive_name}.md`

### CRITICAL: Phase Format Requirements

ALL implementation phases MUST use this exact format:
```
## Phase N: [Descriptive Name]
```

Examples:
- `## Phase 1: Setup` ✓
- `## Phase 1.1: Configure DB` ✓
- `## Setup` ✗ (missing "Phase N:")
- `## phase 1: Setup` ✗ (lowercase)

Documentation sections (NOT phases):
- `## Overview`
- `## Current State Analysis`
- `## Testing Strategy`
- `## References`

Use this template:

```markdown
# [Feature/Task Name] Implementation Plan

## Overview

[Brief description of what we're implementing and why]

## Current State Analysis

**IMPORTANT**: This is a DOCUMENTATION section, not an implementation phase.
Do NOT use "Phase N:" format here.

[What exists now, what's missing, key constraints discovered]

## Desired End State

[Specification of the desired end state and how to verify it]

### Key Discoveries:

- [Important finding with file:line reference]
- [Pattern to follow]
- [Constraint to work within]

## Assumptions Made

[List any assumptions you made during autonomous planning]

## What We're NOT Doing

[Explicitly list out-of-scope items]

## Implementation Approach

[High-level strategy and reasoning]

---

## Phase 1: [Descriptive Name]

**IMPORTANT**: Note the format above - "## Phase 1:" is REQUIRED.
Generic headers like "## Setup" will NOT work.

### Overview

[What this phase accomplishes]

### Changes Required:

#### 1. [Component/File Group]

**File**: `path/to/file.ext`
**Changes**: [Summary of changes]

### Success Criteria:

#### Automated Verification:

- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`
- [ ] Tests pass: `pnpm test`

#### Manual Verification:

- [ ] Feature works as expected
- [ ] No regressions

---

## Phase 2: [Descriptive Name]

[Similar structure...]

For sub-phases within Phase 2, use decimal notation:

---

## Phase 2.1: [Sub-task Name]

[Details of sub-task...]

---

## Testing Strategy

**IMPORTANT**: This is a DOCUMENTATION section, not an implementation phase.
Do NOT use "Phase N:" format here.

[What to test and how]

## References

- Source document: [path to research/ticket]
```

### Step 4: Confirm Completion

After writing the plan, output a confirmation message that includes the exact file path:

```
I've created the implementation plan at:
`thoughts/shared/plans/[filename].md`
```

## Important Rules

1. **ALWAYS write the plan file** - this is the primary deliverable
2. **Be decisive** - don't hedge or ask for clarification
3. **Use reasonable defaults** based on codebase patterns
4. **Document assumptions** rather than asking about them
5. **Keep phases actionable** and testable
6. **Include file paths** with line numbers where relevant

## File Naming Convention

Name the plan file descriptively based on the feature:
- `phase1-immediate-security-fixes.md`
- `user-authentication-improvements.md`
- `api-rate-limiting-implementation.md`

The filename should make it clear what the plan covers.
