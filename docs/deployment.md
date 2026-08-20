# Deployment

DER Builder is deployed as static files to the project site at
`https://pkistudio.github.io/derbuilder/`. Vite uses a relative production base
so hashed assets remain valid below the repository path.

## One-time setup

1. In GitHub, open **Settings → Pages**.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Confirm that workflow permissions permit GitHub Actions to create Pages
   deployments.
4. Apply the repository rules described in
   [GitHub prerequisites](github-prerequisites.md).

No server, secret, or runtime configuration is required for the application.

## Automatic deployment

`.github/workflows/pages.yml` runs on pushes to `main` and manual dispatch. It:

1. installs the exact lockfile with Node.js 24;
2. audits dependencies;
3. runs unit, type, build, browser, and package checks;
4. verifies the local-only CSP and transport boundary;
5. rejects generated source changes;
6. uploads `dist` as the Pages artifact;
7. deploys to the `github-pages` environment; and
8. downloads every published file and compares it byte-for-byte with the
   retained build artifact.

Only the default branch can reach the deployment job. Concurrency group
`derbuilder-github-pages` cancels an older in-progress deployment when a newer
commit is ready.

## Local production check

```sh
npm ci
npm run verify:browser
npm run pack:dry-run
npm run preview
```

Open the preview URL, build a NamedObject, and confirm that Generated DER is
rendered. Browser developer tools should show no external requests.

## Failure handling

Do not create a release if Pages did not successfully deploy the exact `main`
commit. Fix the failing validation or deployment in a pull request and allow a
new deployment to finish. The release workflow independently checks for a
successful `github-pages` deployment attached to the release commit.
