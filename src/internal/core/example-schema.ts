import type { Asn1SchemaModule } from './schema-model.js';

export const exampleSchema: Asn1SchemaModule = {
  name: 'Example',
  tagDefault: 'explicit',
  types: [
    {
      name: 'Person',
      type: {
        kind: 'sequence',
        fields: [
          { name: 'name', type: { kind: 'utf8String' } },
          { name: 'age', type: { kind: 'integer' }, optional: true },
          { name: 'email', type: { kind: 'ia5String' }, optional: true }
        ]
      }
    }
  ]
};

export const exampleInput = {
  name: 'Alice',
  age: 42,
  email: 'alice@example.test'
};

export const exampleDefinition = `Example DEFINITIONS ::= BEGIN
Person ::= SEQUENCE {
  name UTF8String,
  age INTEGER OPTIONAL,
  email IA5String OPTIONAL
}
END`;
