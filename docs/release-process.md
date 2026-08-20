# Release Process

DER Builder uses stable `X.Y.Z` versions without a `v` prefix. A GitHub Release
contains the already reviewed and deployed `main` commit; the release workflow
does not commit version changes.

## Prepare version metadata

1. Select the next semantic version.
2. Create a release branch from current `main`.
3. Run:

   ```sh
   node scripts/prepare-release.mjs apply X.Y.Z
   npm run verify
   npm run verify:browser
   ```

4. Review changes to `package.json`, `package-lock.json`, `src/version.ts`, and
   the README version marker.
5. Commit, open a pull request, pass CI, and merge.
6. Wait for Pages to deploy and verify the merged commit.

`prepare-release.mjs resolve` can calculate patch, minor, or major increments
from the latest release. It rejects prefixes, prerelease forms, and versions
that are not newer.

## Create the GitHub Release

Run the **Release** workflow from GitHub Actions. Supply the exact pre-merged
version or choose an increment and enter `RELEASE` as confirmation. The workflow
checks out the default branch, requires a successful Pages deployment for that
commit, verifies that the tag and release do not exist, runs package checks,
and confirms that applying the selected version creates no diff.

It then creates and pushes an annotated `X.Y.Z` tag and a version-only GitHub
Release. If version application produces changes, stop and merge the version
metadata first.

## Publish to npm

After the GitHub Release is visible, follow
[npm publishing](npm-publishing.md). GitHub Release creation and npm publication
are separate, manually authorized operations.

## Recovery

Never move or reuse a published tag. If a release contains an error, fix it on
`main` and publish a new patch version. npm versions are immutable.
