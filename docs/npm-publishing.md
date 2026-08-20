# npm Publishing

The package is published as `@pkistudio/derbuilder` with public access. Only an
existing, published, stable GitHub Release can be published.

## Normal trusted publication

1. Confirm that the release tag uses `X.Y.Z` and matches all repository version
   markers.
2. Run the **Publish to npm** workflow.
3. Choose `trusted`, optionally enter the existing version, and type
   `NPM_RELEASE`.

The workflow resolves the GitHub Release, checks out its tag, installs Node.js
24 and an OIDC-capable npm CLI, verifies package identity and version, rejects
an already published version, runs the full package checks, and calls
`npm publish --access public`. It polls registry metadata to confirm completion.

## First-publication bootstrap

Trusted Publishing configuration may require the scoped package to exist. For
the first release only:

1. Create a short-lived npm automation token with the minimum required scope.
2. Store it as `NPM_TOKEN` in the protected `npm` GitHub environment.
3. Run the workflow with `token-bootstrap`.
4. Configure npm Trusted Publishing for this repository, workflow, and
   environment.
5. Remove `NPM_TOKEN` and use `trusted` for every later release.

Do not place tokens in repository secrets, source files, package configuration,
logs, or local commits.

## Package contents

`npm pack --dry-run` must show only built output, English documentation, the
README, package metadata, and the license. Source files, production fixtures,
browser test artifacts, and credentials must not be included.
