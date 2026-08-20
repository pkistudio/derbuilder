export { bytesToHex, hexToBytes } from './internal/core/bytes.js';
export { createInstance, encodeValue, resolveDefinedType } from './internal/core/instance-builder.js';
export { validateInstance } from './internal/core/instance-diagnostics.js';
export { builtInOidNames, resolveObjectIdentifierName } from './internal/core/oid-names.js';
export { parseAsn1Definition } from './internal/core/definition-parser.js';
export { pkiComponentDefinition } from './internal/core/pki-components.js';
export { validateSchemaModule } from './internal/core/schema-diagnostics.js';
export { exampleDefinition, exampleInput, exampleSchema } from './internal/core/example-schema.js';
export { DerBuilderError } from './internal/core/errors.js';
export { DER_BUILDER_VERSION } from './version.js';
export type { InstanceDiagnostic, InstanceDiagnosticSeverity } from './internal/core/instance-diagnostics.js';
export type { SchemaDiagnostic, SchemaDiagnosticSeverity } from './internal/core/schema-diagnostics.js';
export type {
  Asn1Field,
  Asn1IntegerType,
  Asn1NamedNumber,
  Asn1PrimitiveKind,
  Asn1SchemaModule,
  Asn1Tag,
  Asn1TagDefault,
  Asn1Type,
  Asn1TypeDefinition,
  BitStringInput,
  ByteInput,
  ChoiceInput,
  InstanceDocument
} from './internal/core/schema-model.js';
