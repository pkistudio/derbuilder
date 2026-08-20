# Project Guidelines

## Project overview

DER Builder is a local-only browser application and reusable TypeScript API
for building DER instances from a supported ASN.1 subset.

## Architecture

- Keep definition parsing, validation, DER generation, and document inspection
  client-side.
- Do not implement remote schema, OID, certificate, or generic HTTP retrieval.
- The only allowed dependency on another PkiStudio package is the published,
  exactly pinned `@pkistudio/dereditor` npm package.
- Consume only DerEditor package exports. Do not copy its source, import its
  internal paths, use a Git dependency, or check out its repository in CI.
- Keep DerEditor interoperability in `src/dereditor-adapter.ts`.
- Keep reusable generation in `src/core.ts`, diagnostics in
  `src/validation.ts`, and DOM behavior in `src/app.ts`.
- Treat the Schema Model and Instance JSON as the sources of truth. UI Profiles
  may change presentation only.

## Development commands

Run before handing off code changes:

```sh
npm test
npm run check
npm run build
npm run test:e2e
npm run pack:dry-run
```

Run `npm run test:e2e:install` once on a new development machine before the
browser suite. Build the production output before running E2E tests.

## Conventions

- Write all repository documentation in English.
- Render user-supplied values as untrusted text.
- Preserve strict TypeScript checks and deterministic DER encoding.
- Add focused fixtures for parser, diagnostics, or encoder behavior changes.
- Update specifications when public behavior or dependency boundaries change.
