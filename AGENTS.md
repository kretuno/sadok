# SADOK Engineering Rules

## Product language

- Keep user-facing text in Ukrainian.
- Use the established terminology from neighbouring screens and Wiki articles.

## Built-in Wiki is part of every feature

A new or changed user-facing feature is not complete until its documentation is added or updated in the built-in Wiki.

For every feature:

1. Update the relevant Markdown article in `apps/client/src/help/articles/`.
2. Add a new article and catalog entry in `apps/client/src/help/helpCatalog.ts` when no existing chapter fits.
3. Add or update the route mapping in `apps/client/src/help/contextHelp.ts` when the feature introduces a new page.
4. Cover changes to Wiki search or contextual routing with client tests.
5. Verify the Wiki text matches the actual interface and includes prerequisites, steps, expected result, and important warnings.

## Completion checks

Before calling a user-facing change complete:

- run the relevant tests;
- run `npm run build`;
- run `git diff --check`;
- visually smoke-test the changed workflow and its Wiki entry.
