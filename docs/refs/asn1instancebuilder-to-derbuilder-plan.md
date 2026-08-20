# ASN.1 Instance Builder to DER Builder Rebuild Plan

## 1. Purpose

This document defines the requirements and delivery plan for rebuilding the
functionality of `pkistudio/asn1instancebuilder` as
`pkistudio/derbuilder`.

`pkistudio/x509gadgets` is the implementation and operations reference. DER
Builder will follow it for:

- repository shape, public entry points, and documentation structure;
- consumption of the published `@pkistudio/dereditor` npm package;
- TypeScript, Vite, testing, GitHub Pages, GitHub Release, and npm workflows;
- local-only processing, exact dependency versions, and CI policy checks; and
- English as the sole normative language for repository documentation.

This planning change does not implement application code, configuration, or
workflows. The only deliverable at this point is this document under
`docs/refs`.

## 2. Reference Baselines

The references were reviewed on 2026-08-20 UTC. The following commits are the
planning baselines.

| Purpose | Reference | Commit | Adopted concerns |
| --- | --- | --- | --- |
| Repository and operations source of truth | [`pkistudio/x509gadgets`](https://github.com/pkistudio/x509gadgets/tree/15329e1f98f856b8f9ff8b52624d9d9cce0b4fca) | `15329e1f98f856b8f9ff8b52624d9d9cce0b4fca` | Structure, DerEditor boundary, CI, E2E, Pages, Release, npm publishing, and dependency policy |
| Feature migration source | [`pkistudio/asn1instancebuilder`](https://github.com/pkistudio/asn1instancebuilder/tree/6ed3d620bf5ab7bffbb557dd9fe065daaf3788b3) | `6ed3d620bf5ab7bffbb557dd9fe065daaf3788b3` | ASN.1 parser, Schema Model, diagnostics, DER generation, Definition Bundles, UI Profiles, NamedObjects, and browser UI |
| Legacy feature documentation | [ASN.1 Instance Builder Wiki](https://github.com/pkistudio/asn1instancebuilder/wiki) | `7eddd65a87184070797b0b46ff681a8d648f6046` | User flows, input model, known limits, and embedding API |

If the references conflict, apply the following priority:

1. Use `x509gadgets` for repository structure, dependencies, validation, and
   publication procedures.
2. Use the legacy `asn1instancebuilder` implementation and tests for ASN.1
   input, diagnostics, DER generation, Definition Bundle, and UI Profile
   behavior.
3. If the Wiki and implementation differ, treat behavior demonstrated by tests
   as the current behavior.
4. State every intentional DER Builder behavior change in repository
   documentation.

## 3. Rebuild Principles

### 3.1 Product and Public Names

- The product name is **DER Builder**.
- The GitHub repository is `pkistudio/derbuilder`.
- The npm package is `@pkistudio/derbuilder`.
- The GitHub Pages URL is `https://pkistudio.github.io/derbuilder/`.
- Public code names use forms such as `DerBuilder`, `initDerBuilder`, and
  `DER_BUILDER_VERSION`.
- CSS classes, DOM ids, and local storage keys use `derbuilder` or the short
  prefix `derb`. New public surfaces must not retain `asn1ib`.
- Compatibility aliases for `@pkistudio/asn1instancebuilder` are outside the
  initial scope. If needed, they require a separate compatibility plan.

### 3.2 Reuse and Reimplementation Boundary

- The legacy behavior and test cases are migration inputs, but the old
  repository shape, workflows, and PkiStudioJS integration are not copied.
- `@pkistudio/pkistudiojs` must not be used.
- DerEditor source, static files, internal paths, and Git repositories must not
  be copied or referenced directly.
- No other PkiStudio repository may be consumed through a submodule, Git
  dependency, workspace link, or CI checkout.
- The only runtime dependency in the PkiStudio npm scope is an exactly pinned,
  published `@pkistudio/dereditor` package.
- DER Builder owns ASN.1 definition parsing, input diagnostics, and DER
  generation. DerEditor is responsible only for parsing confirmation,
  presentation, and the edit/save handoff for generated output.

### 3.3 Meaning of “the Same Repository Structure as x509gadgets”

The top-level shape, public facades, validation process, and release process
follow `x509gadgets`. The ASN.1 parser and generated form system are larger
than the X.509 Gadgets domain layer, so implementation details may be separated
into private modules. Public APIs and dependency boundaries remain controlled
by root-level facade modules.

The following legacy repository elements will not be retained:

- the Gollum Wiki environment under `.devcontainer`;
- repository-specific `.vscode` tasks;
- `viewer.html` and `src/viewer.ts`;
- the dual Vite configuration using `vite.app.config.ts`;
- `sync-managed-rules.yml`, WordPress publication, and workflows not present
  in `x509gadgets`; and
- the Wiki as the only source of normative specifications.

## 4. Documentation Language Policy

English is the sole normative language for documentation stored in this
repository.

- `README.md`, all files under `docs/`, ADRs, contributor guidance,
  deployment and release guides, package API documentation, and prose in
  checked-in examples must be written in English.
- New documentation and edits to existing documentation must use clear
  technical English.
- Repository documentation must not maintain a second, separately normative
  translation beside the English source because parallel copies can drift.
- If localized material is needed later, it must be generated or maintained
  outside the normative repository documentation and must link back to the
  English source.
- Product names, identifiers, ASN.1 keywords, filenames, code, and protocol
  terms retain their canonical spelling.
- Pull request review must treat non-English repository documentation as a
  documentation defect.
- This policy applies to documentation, not to user-provided ASN.1 data or
  external metadata processed by the application.

## 5. Target Repository Shape

The initial implementation should use the following structure.

```text
derbuilder/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── pages.yml
│       ├── release.yml
│       └── npm-publish.yml
├── docs/
│   ├── refs/
│   │   └── asn1instancebuilder-to-derbuilder-plan.md
│   ├── api-specification.md
│   ├── dependency-policy.md
│   ├── deployment.md
│   ├── feature-specification.md
│   ├── github-prerequisites.md
│   ├── npm-publishing.md
│   ├── release-process.md
│   └── user-guide.md
├── e2e/
│   └── app.spec.ts
├── scripts/
│   └── prepare-release.mjs
├── src/
│   ├── app.ts
│   ├── core.ts
│   ├── dereditor-adapter.ts
│   ├── dereditor.d.ts
│   ├── internal.ts
│   ├── main.ts
│   ├── model.ts
│   ├── styles.css
│   ├── validation.ts
│   ├── version.ts
│   └── internal/
│       ├── definition-parser.ts
│       ├── der.ts
│       ├── instance-builder.ts
│       ├── form-model.ts
│       ├── form-renderer.ts
│       ├── definition-bundle.ts
│       ├── ui-profile.ts
│       └── named-object-bundles.ts
├── test/
│   ├── fixtures/
│   ├── core.test.ts
│   ├── validation.test.ts
│   ├── app-model.test.ts
│   ├── policy.test.ts
│   └── release.test.ts
├── AGENTS.md
├── LICENSE
├── README.md
├── index.html
├── package.json
├── package-lock.json
├── playwright.config.ts
├── tsconfig.json
├── tsconfig.types.json
└── vite.config.ts
```

This tree defines responsibility boundaries. An implementation design review
may split internal files further while preserving these rules:

- `src/core.ts` is the UI-independent public Core API facade.
- `src/validation.ts` is the public diagnostics API facade.
- `src/app.ts` is the public browser application and app-specific types
  facade.
- `src/dereditor-adapter.ts` contains DerEditor interoperability.
- `src/model.ts` contains public data models.
- `src/internal/` is not exposed through npm `exports`.
- Test-only fixtures and NamedObjects shipped in the product are distinct.
  Product data belongs under `src`; golden test data belongs under
  `test/fixtures`.

## 6. Public Package Requirements

The package should expose the following entry points.

| Import | Responsibility |
| --- | --- |
| `@pkistudio/derbuilder` | Core API, including re-exported primary diagnostics for practical compatibility |
| `@pkistudio/derbuilder/core` | Explicit Core API alias |
| `@pkistudio/derbuilder/validation` | Schema, Instance, and Definition Bundle diagnostics APIs and types |
| `@pkistudio/derbuilder/app` | `initDerBuilder`, Definition Bundles, UI Profiles, and NamedObjects |
| `@pkistudio/derbuilder/styles.css` | Browser application styles |

Additional package requirements:

- Publish ESM only.
- Include only `dist`, `docs`, `README.md`, and `LICENSE` in the npm
  package.
- Emit declarations under `dist/types`.
- Use explicit `exports` so consumers cannot depend on private modules.
- Set `publishConfig.access` to `public` and the registry to
  `https://registry.npmjs.org/`.
- Pin direct dependencies exactly and commit `package-lock.json`.
- Start at version `0.1.0`. Tags and GitHub Release names use `X.Y.Z`
  without a `v` prefix.

## 7. Functional Requirements

### FR-01: Local-Only Processing

- Process definitions, Instance JSON, Definition Bundles, and generated DER
  entirely in the browser.
- Do not retrieve external ASN.1 definitions, OID tables, schemas, samples, or
  viewer code at runtime.
- Browser I/O is limited to files, clipboard access, downloads, and
  same-origin DerEditor transfer.

### FR-02: ASN.1 Definition Input

- Load ASN.1 definition text from local `.asn1` and `.txt` files.
- Load ASN.1 definition text from the clipboard.
- Load Schema Model JSON from a local file or host API.
- Distinguish ASN.1 text from Schema Model JSON.
- Closing the definition workspace clears the definition, selected type,
  input, diagnostics, and generated result consistently.

### FR-03: ASN.1 Definition Parser

Preserve the following legacy subset:

- `BOOLEAN`;
- positive, negative, and named `INTEGER` values;
- `BIT STRING`;
- `OCTET STRING`;
- `NULL`;
- `OBJECT IDENTIFIER`;
- `UTF8String`, `PrintableString`, and `IA5String`;
- `UTCTime` and `GeneralizedTime`;
- `ENUMERATED`;
- `SEQUENCE`, `SET`, and `CHOICE`;
- `SEQUENCE OF` and `SET OF`;
- references to defined types;
- low-form context-specific `EXPLICIT` and `IMPLICIT` tags from `[0]`
  through `[30]`;
- `EXPLICIT TAGS`, `IMPLICIT TAGS`, and `AUTOMATIC TAGS` module headers;
- automatic tagging of `SEQUENCE`, `SET`, and `CHOICE` components;
- `OPTIONAL`;
- `DEFAULT` for `BOOLEAN`, `INTEGER`, and `ENUMERATED`; and
- comments beginning with `--` and ending at the end of the line.

Syntax errors must return a stable error containing at least the relevant
token and offset.

### FR-04: Schema Model

- Use `Asn1SchemaModule` as the common contract for the parser, diagnostics,
  DER generation, form generation, and host APIs.
- Represent module name, tag default, OID names, and type definitions.
- Represent primitive, integer, enumerated, tagged, sequence, set, choice,
  sequenceOf, setOf, and defined type nodes.
- UI Profiles must not modify the Schema Model. The Schema Model and Instance
  JSON remain the only sources of truth for DER generation.

### FR-05: Schema Diagnostics

`validateSchemaModule()` returns structured diagnostics without throwing and
detects at least:

- duplicate type names;
- unknown type references;
- duplicate field names in one component list;
- duplicate context-specific tags in one component list;
- tag numbers that are not integers in the supported `0..30` range;
- duplicate named-number names; and
- duplicate named-number values as warnings.

Each diagnostic has `severity`, a stable `code`, `message`, and a
`path` that identifies the affected field.

### FR-06: Instance JSON

Instance JSON is the standard input for diagnostics and DER generation.

- `BOOLEAN` uses a boolean.
- `INTEGER` uses an integer, bigint, decimal string, or named value. JSON
  transport excludes bigint.
- `ENUMERATED` uses an integer or named value.
- String and time types use strings.
- `OBJECT IDENTIFIER` accepts dotted-decimal text, built-in names, or
  schema-specific names.
- `NULL` uses `null`.
- `SEQUENCE` and `SET` use objects keyed by field name.
- `SEQUENCE OF` and `SET OF` use arrays.
- `CHOICE` uses `{ "selected": string, "value": unknown }`.
- Byte input accepts `Uint8Array`, a `0..255` number array, compact HEX,
  `{ hex }`, `{ utf8 }`, or `{ base64 }`.
- `BIT STRING` accepts byte input directly or
  `{ "bytes": ByteInput, "unusedBits": 0..7 }`.

### FR-07: Instance Diagnostics

`validateInstance()` traverses as many fields as possible and returns
multiple structured diagnostics rather than only the first error.

It validates at least:

- unknown root types;
- required, optional, and defaulted fields;
- primitive value types;
- named `INTEGER` and `ENUMERATED` values;
- `CHOICE` selected/value shape and unknown alternatives;
- constructed object and OF array shapes;
- OID syntax and leading arcs;
- HEX, Base64, UTF-8, and number-array byte inputs;
- `BIT STRING` unused bits and empty-payload combinations; and
- DER `UTCTime` and `GeneralizedTime` shapes, ranges, and real dates.

Any error blocks DER generation. Warnings remain visible but do not block
generation.

### FR-08: DER Generation

- `createInstance(schema, typeName, input)` returns
  `{ moduleName, typeName, der }`.
- Expose `encodeValue()` and `resolveDefinedType()` in the Core API.
- Encode `BOOLEAN true` as `ff`, integers using minimal two's complement,
  and lengths using definite DER.
- Sort `SET` and `SET OF` elements lexicographically by DER bytes.
- Omit absent defaulted fields and fields equal to their default.
- Explicit tags wrap the inner TLV; implicit tags replace the universal tag
  with a context-specific tag.
- Attach Instance JSON field or array-index paths to generation errors.
- Produce byte-for-byte identical DER for every legacy baseline fixture.

### FR-09: Byte and OID Helpers

- Provide `bytesToHex()` and `hexToBytes()`.
- Resolve built-in PKI OID names and Schema Model `oidNames` from Instance
  input to dotted-decimal OIDs.
- Keep name-to-OID resolution for generation separate from OID-to-display-name
  resolution in DerEditor.
- Use the DerEditor OID resolver only for viewer presentation; it must not
  change the Core input contract implicitly.

### FR-10: Definition Bundles

A Definition Bundle is portable JSON containing:

- `id`, bundle-format `version`, `label`, and optional `description`;
- either raw ASN.1 or a parsed Schema Model;
- at least one entry; and
- per-entry `id`, `typeName`, label/description, `sampleInput`,
  `defaultInput`, and an optional UI Profile.

Requirements:

- Load `.definition-bundle.json` and `.bundle.json`.
- Return JSON parse and bundle-shape diagnostics without throwing.
- Select an entry by id first and type name second.
- Prefer `sampleInput` over `defaultInput`.
- Allow and preserve unknown fields so host metadata is not destroyed.
- Save the active workspace as a Definition Bundle.
- When saving from an existing bundle, preserve bundle metadata and
  non-selected entries where possible.
- Validate the bundle shape before download.
- Validate selected Instance data through normal `validateInstance()`
  processing against the selected schema and type.

### FR-11: UI Profiles

- A UI Profile is optional form presentation metadata for one type.
- It can specify label, description, widget, placeholder, default input hint,
  hidden, collapsed, order, and input mode.
- Field paths accept dot paths and path-segment arrays.
- Repeated array elements support templates such as
  `extensions.*.extnValue`.
- Exact paths take precedence over template paths.
- A fully usable form must be generated from the Schema Model when no profile
  exists.
- A profile must never change diagnostics or DER bytes.

### FR-12: NamedObjects

Preserve the following legacy catalog and sample inputs as Definition Bundles:

- Person;
- TaggedPerson;
- BinaryRecord;
- DefaultRecord;
- SignedRecord;
- VersionedSerial;
- TBSCertificatePrefix;
- Certificate;
- CertificationRequest;
- CertificateList;
- AlgorithmIdentifier; and
- PkiBundle.

The primary Certificate, CertificationRequest, CertificateList, and PkiBundle
entries retain equivalent UI Profiles. Child types remain selectable and load
sample data when available.

### FR-13: PKI Component Definitions

- Expose common PKI ASN.1 definition text through the Core API.
- Preserve the existing baseline for at least AlgorithmIdentifier, Name,
  SubjectPublicKeyInfo, Extension, TBSCertificate, Certificate,
  CertificationRequest, PrivateKeyInfo, and ContentInfo.
- Keep demo wrappers such as PkiBundle separate from the common baseline.

### FR-14: Browser Application

The browser application contains at least:

- Definition;
- Instance Input;
- Diagnostics;
- Generated DER / DerEditor;
- Operation/API Log; and
- About.

The primary flow is:

1. Load a definition from a file, the clipboard, a Definition Bundle, or
   NamedObjects.
2. Select a root type.
3. Edit the same Instance value through Form or JSON.
4. Run Schema and Instance diagnostics.
5. Generate DER when no errors exist.
6. Display generated DER in an embedded read-only DerEditor.
7. Use DerEditor's public Send to feature to open an editable standalone view
   in the same application.

Additional UI requirements:

- If JSON cannot be parsed when switching to Form, preserve the JSON and show
  the error in Form mode.
- Reflect Form edits immediately in canonical Instance JSON.
- Support form editing for primitives, named values, constructed types,
  CHOICE, OF types, optional/defaulted fields, byte modes, and BIT STRING
  unused bits.
- Present diagnostics near the relevant field path.
- Apply sample/default loading consistently when the selected type changes.
- Log build, parse, validation, DerEditor load, save, and failure operations.
- Do not treat file-dialog cancellation as an error.
- Provide pointer- and keyboard-operable separators and a safe stacked layout
  on narrow screens.
- If pane sizes are persisted, use same-origin local storage only.

### FR-15: Embeddable App API

`initDerBuilder()` accepts a selector or Element mount target.

Initial options accept a Schema Model, Instance input, and, if required, a
Definition Bundle. The returned instance provides at least:

- `build(options?)`;
- `loadBundle(bundle, entryIdOrTypeName?)`;
- `loadSchema(schema)`;
- `loadInput(input)`; and
- `close()`.

The build result must not remain available only inside UI state. Host callers
must receive a generated document or a structured failure. Phase 0 will define
the return type rather than carrying forward the legacy `Promise<void>`
contract without review.

### FR-16: Save and Output

- Save the ASN.1 definition as a local file.
- Save a Definition Bundle as a local JSON file.
- Make generated DER savable through DerEditor's published save behavior.
- Keep the design open for direct `.der` download and HEX clipboard actions
  if their need is confirmed, but do not require them for initial parity.

## 8. DerEditor Integration Requirements

### 8.1 Dependency Boundary

- Use exactly pinned `@pkistudio/dereditor` version `0.1.4` as the initial
  baseline.
- At implementation time, recheck the `x509gadgets` reference and published
  npm state. If an update is required, use a separate dependency-only pull
  request.
- Limit imports to package exports for `core`, `oid-resolver`, `viewer`,
  and published icon subpaths.
- Do not import internal paths such as `app`, `static`, `docs`, or
  `manuals`.
- Keep DerEditor API details in `src/dereditor-adapter.ts`. Type-only imports
  and published icon imports are exceptions only where policy tests explicitly
  allow them.

### 8.2 Adapter Responsibilities

The adapter provides at least:

- DER parsing through
  `parseInput(..., { format: 'der', validateRoundTrip: true })`;
- OID resolver injection;
- explicit read-only and editable viewer mounting;
- thin wrappers around `loadBytes()`, `close()`, and `setEditable()`;
- version access so DER Builder and DerEditor versions are displayed
  independently; and
- delegated byte-to-hex/base64 helpers where needed.

DerEditor DOM classes, internal actions, and storage keys are not DER Builder
API or implementation contracts.

### 8.3 Viewer Lifecycle

- The normal DER Builder page mounts a read-only viewer.
- A successful build loads bytes into the same viewer instance.
- The viewer uses the packaged OID resolver and performs no URL lookup.
- The same page detects DerEditor's public Send to transfer query
  (`subtree` or `expand`) and makes that viewer editable.
- Do not implement a custom `viewer.html`, local-storage payload, or popup
  protocol.
- Use the published `pkistudio.ico` in normal tabs and `dereditor.ico` in
  transfer tabs.
- Simplify or hide the DER Builder shell in transfer mode so DerEditor owns
  the transferred payload.

## 9. Non-Functional Requirements

### NFR-01: Security and Network Boundary

- Set a production CSP containing `connect-src 'none'`.
- Do not include `fetch`, XHR, WebSocket, EventSource, or sendBeacon in
  source or production bundles.
- Escape user input instead of inserting it as HTML.
- Never evaluate unknown Definition Bundle metadata as code.
- Release object URLs and temporary local-storage data at the end of their
  lifecycle.

### NFR-02: Types and Browser Compatibility

- Enable TypeScript strict mode, unused local/parameter checks, and fallthrough
  checks.
- Keep the Core API independent of the DOM, VS Code APIs, and Node-only
  runtime APIs.
- Contain browser-specific behavior in the application layer.
- Use a relative Vite production base compatible with a GitHub Pages project
  site.

### NFR-03: Determinism

- The same Schema Model and Instance input always produce the same DER bytes.
- Protect SET/SET OF order, default omission, and integer encoding with golden
  tests.
- Definition Bundle resaves must not lose metadata unintentionally.

### NFR-04: Accessibility and Layout

- Give menus, tabs, dialogs, separators, diagnostics, and status/log regions
  appropriate roles and accessible names.
- Make type selection, Form/JSON switching, build, menus, and separator
  resizing keyboard operable.
- Use 390px as a representative narrow width and keep every primary area
  reachable.

### NFR-05: Distributability

- `npm pack --dry-run` must exclude unnecessary source, fixtures, and
  secrets.
- Compare the Pages artifact byte-for-byte with files downloaded after
  publication.
- Builds, tests, and declaration generation must leave the working tree clean.

### NFR-06: Documentation Language

- Every normative repository document must be in English.
- CI or policy tests should scan Markdown documentation for known retired
  non-English product headings and naming prefixes where a reliable check is
  possible.
- Documentation review is part of the completion criteria for every public
  behavior and release change.
- API names and examples in documentation must match the shipped package.

## 10. Initial Non-Goals and Known Limits

The initial release explicitly retains the legacy parser limits:

- ASN.1 constraints;
- extension markers;
- parameterized types;
- value assignments;
- macros;
- complete module imports;
- high-form tag numbers;
- a general-purpose, fully conforming ASN.1 compiler;
- semantic or cryptographic validation of X.509 certificates, CSRs, or CRLs;
- OS trust stores, network retrieval, or remote schema registries; and
- VS Code-specific dialogs, Webview lifecycle, or host persistence.

Unsupported syntax must fail clearly rather than being accepted or encoded
incorrectly.

## 11. Test Plan

### 11.1 Unit and Golden Tests

Follow `x509gadgets` by using `tsx --test test/*.test.ts` with the Node
built-in test runner. Migrate legacy Vitest-specific APIs.

Minimum test categories:

- parser: module headers, tags, primitives, constructed and defined types,
  named numbers, defaults, and syntax offsets;
- schema diagnostics: duplicates, unknown references, and tag range;
- instance diagnostics: paths, multiple errors, OIDs, bytes, times, and
  CHOICE;
- DER: positive/negative integers, default omission, explicit/implicit/
  automatic tags, and SET sorting;
- fixtures: Person, binary values, Certificate, CSR, CRL, and PKI components;
- bundle/profile: parsing, validation, metadata preservation, entry selection,
  and wildcard paths;
- public API: package entries and declaration contracts;
- DerEditor adapter: parse and round-trip of every generated fixture;
- policy: PkiStudio dependencies, forbidden imports, forbidden network use,
  CSP, workflows, and English documentation; and
- release: version markers and workflow contracts.

Before migration, record DER bytes for every legacy fixture at the pinned
baseline. Compare the new output byte-for-byte; successful parsing alone is not
an acceptable parity test.

### 11.2 E2E

Automate at least the following in Playwright Chromium:

- app startup, About, and package icon;
- NamedObject loading, type selection, Form/JSON synchronization, and build;
- raw ASN.1, Schema JSON, and Definition Bundle file loading;
- clipboard loading;
- build blocking for invalid definitions, bundles, and instances;
- definition and bundle download;
- generated DER in an embedded read-only DerEditor;
- editable standalone view through DerEditor Send to;
- safe logging of popup blocking and cancellation;
- pointer and keyboard pane resizing;
- narrow viewport behavior;
- absence of console and page errors; and
- zero external requests during application use.

### 11.3 Standard Verification Commands

Run all of the following before implementation handoff:

```sh
npm test
npm run check
npm run build
npm run test:e2e
npm run pack:dry-run
```

Run `npm run test:e2e:install` once in a new environment. `npm run verify`
contains unit tests, type checking, build, and package dry-run.
`npm run verify:browser` builds before browser verification.

## 12. Development Workflow

### 12.1 Normal Changes

1. Create a purpose-specific feature branch from `main`.
2. Identify the relevant requirement ids and fixtures first.
3. Split pull requests by the phases below instead of mixing Core, App,
   Viewer, and workflow work in one large change.
4. Pass standard local verification.
5. Open a draft pull request.
6. Pass CI unit, typecheck, build, E2E, pack, and audit checks.
7. Complete review, including English documentation review, and merge.
8. Confirm the `main` Pages deployment and published-file comparison.

### 12.2 CI

`.github/workflows/ci.yml` runs for pull requests and pushes to `main` in
the same order as `x509gadgets`:

1. `actions/checkout`;
2. Node.js 24 setup with npm cache;
3. `npm ci`;
4. `npm audit --audit-level=high`;
5. `npm test`;
6. `npm run check`;
7. `npm run build`;
8. Chromium installation;
9. `npm run test:e2e`; and
10. `npm run pack:dry-run`.

Permissions are limited to `contents: read`. CI must not check out another
PkiStudio repository.

### 12.3 GitHub Pages

`.github/workflows/pages.yml` runs on pushes to `main` and manual dispatch.

- Repeat CI-equivalent validation before packaging `dist`.
- Verify CSP and the absence of remote transport in production output.
- Confirm that generation leaves no source changes.
- Deploy the Pages artifact.
- Compare every published file with a retained source artifact.
- Use concurrency group `derbuilder-github-pages` and cancel older in-progress
  deployments.
- Limit permissions to `contents: read`, `pages: write`, and
  `id-token: write`.

### 12.4 Release

`.github/workflows/release.yml` is manual-dispatch only.

- Require explicit `RELEASE` confirmation.
- Accept an exact version or patch/minor/major increment.
- Permit only `X.Y.Z` without a `v` prefix.
- Require a successful Pages deployment for the same `main` SHA.
- Synchronize `package.json`, the lockfile, `src/version.ts`, and README
  using the preparation script.
- Require version metadata to be merged through a pull request before release.
- Create an annotated tag and a version-only GitHub Release.

### 12.5 npm Publication

`.github/workflows/npm-publish.yml` publishes only an existing stable GitHub
Release.

- Require explicit `NPM_RELEASE` confirmation.
- Use npm Trusted Publishing/OIDC normally.
- Allow an environment-secret token only to bootstrap the first publication.
- Verify Release tag, package, and lockfile version equality.
- Reject a version that already exists on npm.
- Repeat test, check, build, and pack from a clean checkout.
- Verify that the registry returns the published version after
  `npm publish --access public`.

## 13. Phased Delivery Plan

### Phase 0: Finalize Contracts

Deliverables:

- initial English `feature-specification.md` and `api-specification.md`;
- public API names, build return type, and diagnostic code inventory;
- legacy fixture and expected-DER manifest; and
- Definition Bundle and UI Profile versioning policy.

Exit criteria:

- Every open item in this plan has a decision.
- Legacy behavior is classified as retained, intentionally changed, or out of
  scope.
- English is documented as the repository documentation standard.

### Phase 1: x509gadgets-Style Foundation

Deliverables:

- root configuration, package metadata, strict TypeScript, and one Vite config;
- Node test runner, Playwright, and version script;
- English documentation skeleton and `AGENTS.md`; and
- empty public facades and package exports.

Exit criteria:

- The empty app passes test, check, build, E2E, and pack.
- Generated output leaves no unintended working-tree changes.
- All checked-in documentation is in English.

### Phase 2: Schema Model, Parser, and DER Core

Deliverables:

- model, byte, OID, parser, DER encoder, and instance builder;
- DER Builder public definitions for legacy core exports; and
- PKI component baseline.

Exit criteria:

- Legacy core fixtures pass byte-for-byte parity.
- Core source is independent of the DOM and DerEditor Viewer.

### Phase 3: Diagnostics

Deliverables:

- structured Schema and Instance diagnostics;
- stable paths and codes; and
- broad invalid-input tests.

Exit criteria:

- Errors block build and warnings do not.
- Tests cover multiple errors and nested paths.

### Phase 4: Definition Bundles, UI Profiles, and NamedObjects

Deliverables:

- bundle parse, validation, and save;
- generic form model and UI Profile application; and
- NamedObjects catalog and production sample data.

Exit criteria:

- Profiles never change DER.
- Bundle round trips preserve unknown metadata and non-selected entries.
- Tests cover the four primary PKI profiles.

### Phase 5: Browser Application

Deliverables:

- Definition, Instance, Diagnostics, Log, and About areas;
- file, clipboard, download, Form/JSON, type selection, and build flow; and
- responsive layout and accessible separators.

Exit criteria:

- Playwright replaces the legacy manual smoke checks.
- Cancellation, invalid JSON, and empty workspace transitions are safe.

### Phase 6: DerEditor Integration

Deliverables:

- pinned package, adapter, local typings, and icons;
- embedded read-only generated-DER viewer;
- editable same-page transfer mode; and
- complete removal of PkiStudioJS and the custom viewer page.

Exit criteria:

- DerEditor Core round-trips every fixture.
- Save/edit is disabled in the normal viewer and enabled in the transfer
  viewer.
- DerEditor is the only PkiStudio package in the lockfile.

### Phase 7: Policy, E2E, and Pages

Deliverables:

- dependency, network, documentation-language, and workflow policy tests;
- Playwright acceptance suite; and
- CI and Pages workflows.

Exit criteria:

- No external request is made.
- Deployed artifact verification succeeds.
- No other repository is checked out.
- Normative repository documentation is English.

### Phase 8: Publication Preparation

Deliverables:

- English README, user/API/feature/dependency/deployment/release/npm guides;
- Release and npm-publish workflows; and
- `0.1.0` version metadata.

Exit criteria:

- `npm pack --dry-run` contents are reviewed.
- A Release can be created only after a successful same-SHA Pages deployment.
- npm can be published only from a stable GitHub Release.
- Published documentation matches implemented behavior and contains no
  normative non-English copy.

## 14. Legacy-to-Target Mapping

| Legacy `asn1instancebuilder` | DER Builder treatment |
| --- | --- |
| `src/core.ts`, `src/core/*` | Organize under the `src/core.ts` public facade, `src/model.ts`, and `src/internal/*` |
| `src/core/pkistudio-adapter.ts` | Remove and replace with `src/dereditor-adapter.ts` |
| `src/app.ts`, `src/app/*` | Reorganize under the `src/app.ts` public facade and private app modules |
| `src/viewer.ts`, `viewer.html` | Remove and replace with same-`index.html` DerEditor transfer mode |
| `src/types/pkistudiojs.d.ts` | Remove and replace with `src/dereditor.d.ts` |
| `src/styles/styles.css` | Use `src/styles.css` as the public entry and split private style modules only if needed |
| Root `fixtures/` | Separate production NamedObjects from test fixtures |
| `vite.config.ts` plus `vite.app.config.ts` | Consolidate into one `x509gadgets`-style `vite.config.ts` |
| Vitest | Replace with the Node test runner and `tsx` |
| Legacy CI/Pages/publish/WordPress | Replace with `x509gadgets`-style CI, Pages, Release, and npm workflows |
| Wiki-centered specifications | Make English repository `docs` normative; mirror elsewhere only if needed |
| `@pkistudio/pkistudiojs` | Remove completely; use only pinned `@pkistudio/dereditor` |

## 15. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| DER bytes change during reimplementation | Freeze golden DER for each fixture at the legacy commit and compare bytes |
| Legacy UI and new Viewer state conflict | Keep a single DerEditor adapter boundary and separate viewer state from builder state |
| Implementation depends on undocumented DerEditor DOM | Use only public package exports and instance methods, enforced by policy tests |
| OID name-map directions are confused | Use separate APIs and tests for build-input resolution and viewer-display resolution |
| Unknown bundle metadata is lost | Add parse/save round-trip fixtures |
| NamedObjects depend on test fixtures in production | Keep production samples under `src`; use test fixtures for output comparison |
| Popup or clipboard behavior is denied by the browser | Report structured status/log failures without losing the build result |
| Workflow permissions expand | Declare minimum permissions per job and protect them with policy tests |
| Legacy package consumers lack a migration path | Evaluate a migration guide and compatibility adapter separately after the initial release |
| Non-English documentation is introduced later | Make English review an acceptance criterion and add reliable policy checks where practical |

## 16. Decisions Required Before Implementation

Phase 0 must decide and document:

1. Whether `build()` returns `InstanceDocument` or a result union containing
   diagnostics.
2. Whether `DefinitionBundle` and `UiProfile` remain app exports or receive
   independent package entries.
3. Whether direct `.der` download and HEX clipboard actions are included in
   the initial release.
4. Whether the legacy `Asn1InstanceBuilderError` equivalent is exposed as
   `DerBuilderError`.
5. How long the root export re-exports validation and what future API
   stabilization policy applies.
6. The final pane layout and transfer-mode wireframe.

These decisions do not alter the fixed principles of DER byte parity,
DerEditor isolation, local-only processing, English repository documentation,
and the `x509gadgets`-style workflow.

## 17. Overall Completion Criteria

DER Builder `0.1.0` is complete only when all of the following are true:

- It reproduces the selected legacy `asn1instancebuilder` fixtures and Core
  behavior byte-for-byte.
- It includes the selected Definition Bundle, UI Profile, NamedObjects,
  Form/JSON, and diagnostics features.
- It has no PkiStudioJS, custom viewer page, or source coupling to another
  PkiStudio repository.
- It uses only an exactly pinned, published DerEditor package through package
  exports.
- E2E verifies the embedded read-only viewer and editable transfer viewer.
- Unit, typecheck, build, E2E, pack, audit, and policy tests pass.
- The production app makes no external connections and its CSP enforces
  `connect-src 'none'`.
- GitHub Pages content matches the validated `dist`.
- A Release can be created only from the same SHA successfully deployed to
  Pages.
- `@pkistudio/derbuilder` can be published only from a stable GitHub Release.
- README and repository documentation match shipped behavior.
- Every normative repository document is written in English.
