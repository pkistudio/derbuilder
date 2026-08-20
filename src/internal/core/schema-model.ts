export type Asn1PrimitiveKind =
  | 'boolean'
  | 'bitString'
  | 'octetString'
  | 'null'
  | 'objectIdentifier'
  | 'utf8String'
  | 'printableString'
  | 'ia5String'
  | 'utcTime'
  | 'generalizedTime';

export type Asn1Type =
  | { kind: Asn1PrimitiveKind }
  | Asn1IntegerType
  | { kind: 'enumerated'; values: Asn1NamedNumber[] }
  | { kind: 'tagged'; tag: Asn1Tag; type: Asn1Type }
  | { kind: 'sequence'; fields: Asn1Field[] }
  | { kind: 'set'; fields: Asn1Field[] }
  | { kind: 'choice'; alternatives: Asn1Field[] }
  | { kind: 'sequenceOf'; elementType: Asn1Type }
  | { kind: 'setOf'; elementType: Asn1Type }
  | { kind: 'defined'; typeName: string };

export interface Asn1Tag {
  class: 'context';
  number: number;
  mode: 'explicit' | 'implicit';
}

export interface Asn1IntegerType {
  kind: 'integer';
  values?: Asn1NamedNumber[];
}

export interface Asn1NamedNumber {
  name: string;
  value: number;
}

export interface Asn1Field {
  name: string;
  type: Asn1Type;
  optional?: boolean;
  defaultValue?: unknown;
}

export interface Asn1TypeDefinition {
  name: string;
  type: Asn1Type;
}

export interface Asn1SchemaModule {
  name: string;
  tagDefault: Asn1TagDefault;
  oidNames?: Record<string, string>;
  types: Asn1TypeDefinition[];
}

export type Asn1TagDefault = 'explicit' | 'implicit' | 'automatic';

export interface ChoiceInput {
  selected: string;
  value: unknown;
}

export interface BitStringInput {
  bytes: ByteInput;
  unusedBits?: number;
}

export type ByteInput = Uint8Array | number[] | string | { hex: string } | { utf8: string } | { base64: string };

export interface InstanceDocument {
  moduleName: string;
  typeName: string;
  der: Uint8Array;
}
