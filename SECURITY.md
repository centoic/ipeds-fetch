# Security Policy

## Supported Versions

This project is tested and deployed on Node.js 22.x.
Older versions are not supported.

## Dependency Update Cadence

This project uses automated dependency update PRs via Dependabot,
scheduled for Mondays at 09:00 America/Los_Angeles.

-   **Critical/High severity vulnerabilities in direct dependencies**
    (especially authentication, cryptography, or user input parsing):
    Patched immediately after manual review of the lockfile diff.
-   **Routine patches and minor updates**:
    Merged no sooner than the next scheduled weekly review
    (approximately 7 days after the PR is opened) to allow time for
    community detection of compromised versions. If a specific advisory
    emerges during the waiting period, the update is treated as urgent.
-   **Major updates**: Ignored by automation; evaluated manually as needed.

## Supply Chain Controls

-   All new dependencies are pinned to exact versions via `.npmrc`.
-   Install scripts are disabled by default via pnpm `onlyBuiltDependencies`;
    only explicitly allowlisted packages may run build scripts.
-   The lockfile (`pnpm-lock.yaml`) is committed and CI uses `--frozen-lockfile`.
-   Updates are not auto-merged; every dependency change passes through
    human review of the lockfile diff before merging.
