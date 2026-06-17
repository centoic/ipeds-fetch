# Security Policy

## Supported Versions

This project is tested and deployed on Node.js 22.x.
Older versions are not supported.

## Dependency Update Cadence

This project uses automated dependency update PRs via Dependabot,
scheduled for Mondays at 09:00 America/Los_Angeles.

Each dependency update opens its own PR, allowing independent
review on its own timeline.

-   **Critical/High severity vulnerabilities in direct dependencies**
    (especially authentication, cryptography, or user input parsing):
    Patched immediately after manual review of the lockfile diff.

-   **Routine patches and minor updates**:
    Reviewed and merged at the next weekly dependency review
    (approximately 7 days after the PR was opened). This cooldown
    allows the community to detect and report compromised versions
    before they enter this project.

-   **Major updates**: Ignored by automation; evaluated manually
    on an as-needed basis.

## Supply Chain Controls

-   All dependencies are pinned to exact versions via `.npmrc`.
-   Install scripts are disabled by default via pnpm
    `onlyBuiltDependencies`. Only explicitly allowlisted packages
    may run build scripts during install.
-   The lockfile (`pnpm-lock.yaml`) is committed to version control.
    CI uses `pnpm install --frozen-lockfile` to prevent drift.
-   Updates are never auto-merged. Every dependency change passes
    through human review of the lockfile diff before merging.

## Weekly Review Ritual

Every Monday:

1. Review all open Dependabot PRs.
2. For each PR, check the lockfile diff for unexpected changes
   (new install scripts, unusual transitive additions, large
   diffs inconsistent with the claimed semver change).
3. Merge PRs that are ≥7 days old with a clean CI run and no
   concerning signals.
4. Leave PRs younger than 7 days open for the following week.
5. Run `pnpm audit` locally and triage any new findings.
