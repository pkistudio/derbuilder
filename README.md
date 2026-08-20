# DER Builder

DER Builder is a local-only browser application and reusable TypeScript API
for creating deterministic DER documents from a supported ASN.1 definition and
Instance JSON.

Current version: 0.1.0

Definitions, input values, diagnostics, and generated DER stay in the browser.
The application does not retrieve schemas, OID data, or other resources. The
production page enforces `connect-src 'none'`.

## Features

- Parse the supported ASN.1 module subset into a shared Schema Model.
- Validate definitions and Instance JSON with stable codes and value paths.
- Encode primitives, constructed values, choices, tags, defaults, and OF types
  as deterministic DER.
- Load portable Definition Bundles and a catalog of PKI-oriented NamedObjects.
- Edit one Instance value through synchronized Form and JSON views.
- Inspect successful output in an embedded read-only DerEditor and use its
  public Send to action for an editable standalone view.
- Use Core, Validation, and App APIs independently through controlled package
  exports.

## Install

```sh
npm install @pkistudio/derbuilder
```

The only runtime dependency on another PkiStudio package is the published,
exactly pinned `@pkistudio/dereditor` npm package. DER Builder does not consume
source, assets, workflows, branches, or unpublished APIs from any other
PkiStudio repository.

## Core API

```ts
import {
  bytesToHex,
  createInstance,
  parseAsn1Definition,
  validateInstance,
  validateSchemaModule
} from '@pkistudio/derbuilder';

const schema = parseAsn1Definition(`Example DEFINITIONS ::= BEGIN
Person ::= SEQUENCE { name UTF8String, age INTEGER OPTIONAL }
END`);

const input = { name: 'Alice', age: 42 };
const diagnostics = [
  ...validateSchemaModule(schema),
  ...validateInstance(schema, 'Person', input)
];

if (!diagnostics.some((item) => item.severity === 'error')) {
  const document = createInstance(schema, 'Person', input);
  console.log(bytesToHex(document.der));
}
```

## Browser app

```ts
import { initDerBuilder } from '@pkistudio/derbuilder/app';
import '@pkistudio/derbuilder/styles.css';

const app = initDerBuilder({ mount: '#app', schema, input });
const result = await app.build({ typeName: 'Person' });

if (result.ok) console.log(result.document.der);
else console.error(result.error, result.instanceDiagnostics);
```

The application is deployed to GitHub Pages only after validation on `main`.
The first deployment requires Pages to use **GitHub Actions** as its source;
see [Deployment](docs/deployment.md).

## Development

```sh
npm install
npm test
npm run check
npm run build
npm run test:e2e:install
npm run test:e2e
npm run pack:dry-run
```

Use `npm run dev` during development or `npm run preview` for the production
build. `npm run verify` runs the non-browser release checks, and
`npm run verify:browser` rebuilds before the browser suite.

The [feature specification](docs/feature-specification.md),
[API specification](docs/api-specification.md), and
[dependency policy](docs/dependency-policy.md) define stable boundaries. See
the [user guide](docs/user-guide.md), [deployment guide](docs/deployment.md),
[release process](docs/release-process.md),
[npm publishing guide](docs/npm-publishing.md), and
[GitHub prerequisites](docs/github-prerequisites.md) for operation and release
procedures.

## License

MIT
