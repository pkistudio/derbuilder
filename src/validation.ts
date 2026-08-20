export { validateInstance } from './internal/core/instance-diagnostics.js';
export { validateSchemaModule } from './internal/core/schema-diagnostics.js';
export {
  parseDefinitionBundleJsonWithDiagnostics,
  validateDefinitionBundle
} from './internal/app/definition-bundle.js';
export type {
  InstanceDiagnostic,
  InstanceDiagnosticSeverity
} from './internal/core/instance-diagnostics.js';
export type {
  SchemaDiagnostic,
  SchemaDiagnosticSeverity
} from './internal/core/schema-diagnostics.js';
export type {
  DefinitionBundleDiagnostic,
  DefinitionBundleDiagnosticSeverity,
  DefinitionBundleParseResult
} from './internal/app/definition-bundle.js';
