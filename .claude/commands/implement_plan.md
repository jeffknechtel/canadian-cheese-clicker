# Implement Plan

You are tasked with implementing an approved technical plan for the Simyl project from `thoughts/shared/plans/`. These plans contain phases with specific changes and success criteria tailored to Simyl's Next.js/AWS architecture.

## Getting Started

When given a plan path:

- Read the plan completely and check for any existing checkmarks (- [x])
- Read the original ticket and all files mentioned in the plan
- **Read files fully** - never use limit/offset parameters, you need complete context
- Think deeply about how the pieces fit together
- Create a todo list to track your progress
- Start implementing if you understand what needs to be done

If no plan path provided, ask for one.

## Implementation Philosophy

Plans are carefully designed, but reality can be messy. Your job is to:

- Follow the plan's intent while adapting to what you find
- Implement each phase fully before moving to the next
- Verify your work makes sense in the broader codebase context
- Update checkboxes in the plan as you complete sections

When things don't match the plan exactly, think about why and communicate clearly. The plan is your guide, but your judgment matters too.

If you encounter a mismatch:

- STOP and think deeply about why the plan can't be followed
- Present the issue clearly:

  ```
  Issue in Phase [N]:
  Expected: [what the plan says]
  Found: [actual situation]
  Why this matters: [explanation]

  How should I proceed?
  ```

## Verification Approach

After implementing a phase:

- Run the success criteria checks:
  - `pnpm lint` for linting
  - `pnpm type-check` or `pnpm --filter web type-check` for TypeScript
  - `pnpm test` if tests exist
  - Check AWS permissions with `pnpm diagnose:dev` or `pnpm diagnose:prod`
- Fix any issues before proceeding
- Update your progress in both the plan and your todos
- Check off completed items in the plan file itself using Edit

Don't let verification interrupt your flow - batch it at natural stopping points. Remember that SST deployment may require specific AWS profiles (simyl_labs for dev, simyl_live for prod).

## If You Get Stuck

When something isn't working as expected:

- First, make sure you've read and understood all the relevant code
- Consider if the codebase has evolved since the plan was written
- Present the mismatch clearly and ask for guidance

Use sub-tasks sparingly - mainly for targeted debugging or exploring unfamiliar territory.

## Resuming Work

If the plan has existing checkmarks:

- Trust that completed work is done
- Pick up from the first unchecked item
- Verify previous work only if something seems off

Remember: You're implementing a solution for Simyl, not just checking boxes. Keep the end goal in mind, follow Next.js/AWS patterns established in the codebase, and maintain forward momentum.

After implementing, if the user asks you to check in the code, please do not add claude co-author comments.
