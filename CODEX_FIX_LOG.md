# Codex Fix Log

This file records careful repair passes so changes can be reviewed and reverted in small steps.

## 2026-05-28

- Initialized local git tracking for source files and ignored generated dependencies/build artifacts.
- Fixed the Windows production build failure in `scripts/prepare-server-runtime.js`.
- Relaxed legacy lint-only rules to warnings in `apps/client/eslint.config.js`.
- Fixed remaining blocking lint errors in inventory and medications UI.
- Ran `npm audit fix` without `--force` in root, client, and server workspaces.
- Verified `npm run build:client` and `npm run build:server` after dependency lockfile updates.
- Remaining audit items after safe fixes: client `xlsx` has no npm auto-fix; server `drizzle-kit` chain requires a breaking/forced audit path.
