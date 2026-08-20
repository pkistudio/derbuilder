# Dependency Policy

## Runtime boundary

The only permitted runtime dependency in the PkiStudio scope is the published
`@pkistudio/dereditor` package, pinned to an exact version. DER Builder may use
its exported Core API, OID resolver, viewer, and published icon paths.

The project must not:

- import DerEditor internal `app`, `static`, `docs`, or `manuals` paths;
- copy DerEditor source or assets into this repository;
- use Git dependencies, submodules, workspace links, or CI checkouts of another
  PkiStudio repository;
- depend on PkiStudioJS or the legacy builder package; or
- fetch OID tables, schemas, samples, or viewer code at runtime.

All DerEditor behavior is contained by `src/dereditor-adapter.ts`. OID aliases
used to generate DER are owned by DER Builder and remain separate from
DerEditor's display-only OID resolver.

DerEditor `0.1.4` includes a guarded OID-file transport fallback for its own
standalone use. The adapter always injects the package's OID resolver, so that
branch returns before transport. The fallback text can remain in the bundled
third-party viewer even though it is unreachable in DER Builder. Enforcement
therefore combines a transport-free DER Builder source check, required resolver
injection, `connect-src 'none'`, and browser acceptance tests that observe zero
external requests. It does not treat the unreachable third-party token as a DER
Builder transport implementation.

## Versioning and lockfile

Direct dependencies and development tools use exact versions. Every dependency
change includes `package-lock.json`, runs the complete verification suite, and
should be isolated from feature changes when practical. CI uses `npm ci` and
fails on high-severity audit findings.

## Automated enforcement

Policy tests inspect package metadata, the lockfile, imports, network APIs,
Content Security Policy, controlled exports, documentation language, and
workflow coupling. GitHub Pages additionally scans built entry files before
deployment.
