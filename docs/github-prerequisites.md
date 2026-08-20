# GitHub Prerequisites

## Repository settings

- Keep `main` as the default branch.
- Set GitHub Pages to use **GitHub Actions**.
- Permit workflows to read repository contents.
- Create protected `github-pages` and `npm` environments.
- Keep Actions and reusable workflows restricted to trusted sources according
  to the organization policy.

## Branch rules

Protect `main` with pull requests and required status checks. Require the CI
validation job, prevent force pushes and deletion, and require branches to be
up to date when the repository policy calls for it. Administrators should use
the same reviewed path for version metadata changes.

## Pages environment

The `github-pages` environment is used by GitHub's deployment action. Its URL
is the DER Builder Pages site. The workflow needs only `contents: read`,
`pages: write`, and `id-token: write`.

## npm environment

Create an `npm` environment for `.github/workflows/npm-publish.yml`. Configure
npm Trusted Publishing for repository `pkistudio/derbuilder`, workflow
`npm-publish.yml`, and environment `npm` after the package exists.

The first publication may use an environment secret named `NPM_TOKEN` with the
workflow's explicit `token-bootstrap` option. Remove the secret after Trusted
Publishing is configured. Routine publication must use OIDC and must not use a
long-lived token.

## Manual workflow access

Limit Release and npm workflow dispatch to trusted maintainers. Both workflows
require typed confirmation values and validate package identity, versions, and
release state; GitHub permissions remain the final authorization boundary.
