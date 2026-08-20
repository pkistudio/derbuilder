# Feature Specification

## Scope

DER Builder creates DER documents from a defined ASN.1 subset and Instance JSON.
It provides a reusable Core API, structured diagnostics, portable Definition
Bundles, a generated browser form, and local output inspection through the
published DerEditor package.

The application is a focused builder, not a general ASN.1 compiler or a
certificate validation system.

## Processing boundary

All definition parsing, validation, encoding, and inspection is local. Runtime
network transports are forbidden and the production Content Security Policy
contains `connect-src 'none'`. Files, clipboard input, local downloads, and the
same-origin DerEditor Send to workflow are the permitted browser I/O paths.

DER Builder source contains no remote transport API. DerEditor `0.1.4` contains
a guarded standalone OID-file fallback, but DER Builder always supplies the
published package resolver, so the fallback returns without making a request.
The CSP provides a second boundary, and browser tests verify zero external
requests during application use.

## Supported ASN.1 subset

The definition parser supports:

- `BOOLEAN`, `INTEGER`, `ENUMERATED`, `BIT STRING`, `OCTET STRING`, and `NULL`;
- `OBJECT IDENTIFIER`, `UTF8String`, `PrintableString`, `IA5String`, `UTCTime`,
  and `GeneralizedTime`;
- `SEQUENCE`, `SET`, `CHOICE`, `SEQUENCE OF`, and `SET OF`;
- defined type references and named `INTEGER` or `ENUMERATED` values;
- `OPTIONAL` and `DEFAULT` for boolean, integer, and enumerated fields;
- low-form context tags `[0]` through `[30]`, with explicit or implicit mode;
- `EXPLICIT TAGS`, `IMPLICIT TAGS`, and `AUTOMATIC TAGS` module defaults; and
- line comments introduced by `--`.

Unsupported constraints, extension markers, parameterized types, value
assignments, macros, complete import resolution, and high-form tag numbers fail
clearly instead of being interpreted loosely.

## Schema Model and diagnostics

`Asn1SchemaModule` is the common contract between the parser, diagnostics,
encoder, form renderer, and host APIs. It contains the module name, tag default,
optional OID aliases, and named type definitions.

Schema diagnostics report duplicate types and fields, unknown type references,
duplicate or unsupported context tags, and duplicate named-number names or
values. Instance diagnostics traverse as much input as possible and report
required fields, value shapes, named values, choices, arrays, OIDs, byte inputs,
bit-string rules, and DER time syntax. Diagnostics have `severity`, stable
`code`, `message`, and `path` properties. Errors block generation; warnings do
not.

## Instance JSON

- Boolean values use JSON booleans, and `NULL` uses `null`.
- Integers accept integer numbers, decimal strings, or declared names. Core API
  callers may also pass `bigint`; JSON transport cannot.
- Enumerated values accept integer numbers or declared names.
- Strings, OIDs, and time values use strings.
- Sequences and sets use objects; OF types use arrays.
- Choices use `{ "selected": string, "value": unknown }`.
- Byte inputs accept compact HEX, a `Uint8Array`, a byte-number array,
  `{ "hex": string }`, `{ "utf8": string }`, or `{ "base64": string }`.
- Bit strings accept a byte input or
  `{ "bytes": ByteInput, "unusedBits": 0..7 }`.

## DER rules

Encoding uses definite lengths and minimal two's-complement integers. Boolean
true is `ff`. `SET` and `SET OF` children are sorted lexicographically by their
complete DER encoding. Absent default fields and values equal to their defaults
are omitted. Explicit tags wrap the inner TLV; implicit tags replace its tag.
Generation failures retain the relevant field or array-index path.

## Definition Bundles and UI Profiles

A Definition Bundle contains an id, format version, label, raw ASN.1 or a Schema
Model, and one or more selectable entries. Entries may contain sample/default
Instance input and an optional UI Profile. Unknown metadata survives parsing
and workspace resaves where possible.

UI Profiles affect labels, descriptions, order, widgets, placeholders,
visibility, collapsed sections, and input modes. Exact field paths take
precedence over `*` array templates. Profiles never alter the Schema Model,
diagnostics, or DER bytes.

The built-in NamedObjects catalog contains Person, TaggedPerson, BinaryRecord,
DefaultRecord, SignedRecord, VersionedSerial, TBSCertificatePrefix,
Certificate, CertificationRequest, CertificateList, AlgorithmIdentifier, and
PkiBundle.

## Browser workflow

The browser application exposes Definition, Instance Input, Diagnostics,
Generated DER, API Log, and About areas. A user loads ASN.1, Schema Model JSON,
a Definition Bundle, or a NamedObject; selects a root type; edits Form or JSON;
builds; and inspects successful output in an embedded read-only DerEditor.
DerEditor's public Send to action opens the transferred content in the same
application URL with an editable viewer and the DerEditor icon.

## Intentional changes from ASN.1 Instance Builder

- Public names, CSS prefixes, and package entry points use DER Builder naming.
- The obsolete PkiStudioJS popup and local-storage viewer protocol is removed.
- DerEditor is consumed only through the published, exactly pinned npm package.
- The app `build()` method returns a structured success or failure result.
- Repository specifications and operational documentation are maintained in
  English Markdown instead of using the legacy Wiki as the normative source.

## Compatibility baseline

`test/fixtures/legacy-der-manifest.json` records 17 complete DER outputs made by
the pinned legacy commit `6ed3d620bf5ab7bffbb557dd9fe065daaf3788b3`.
Tests rebuild every case byte-for-byte and round-trip the result through
DerEditor Core. This includes Person, tagging/default cases, certificate
variants, CSR variants, CRL variants, and the composed PKI bundle.

Definition Bundle format `1.0.0` is the initial producer value. The `version`
field remains a required non-empty string for legacy compatibility; this
release does not reject a bundle solely because it carries a different version.
UI Profiles are unversioned optional presentation metadata. Unknown bundle and
profile metadata is not evaluated and does not affect generation.
