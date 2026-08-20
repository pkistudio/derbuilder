import { DerBuilderError } from './errors.js';
import type { Asn1Field, Asn1PrimitiveKind, Asn1SchemaModule, Asn1TagDefault, Asn1Type } from './schema-model.js';

interface Token {
  value: string;
  offset: number;
}

const primitiveTypes: Record<string, Asn1PrimitiveKind> = {
  BOOLEAN: 'boolean',
  NULL: 'null',
  UTF8STRING: 'utf8String',
  PRINTABLESTRING: 'printableString',
  IA5STRING: 'ia5String',
  UTCTIME: 'utcTime',
  GENERALIZEDTIME: 'generalizedTime'
};

export function parseAsn1Definition(source: string): Asn1SchemaModule {
  return new DefinitionParser(tokenize(source)).parseModule();
}

class DefinitionParser {
  private index = 0;
  private tagDefault: Asn1TagDefault = 'explicit';

  constructor(private readonly tokens: Token[]) {}

  parseModule(): Asn1SchemaModule {
    const moduleName = this.expectIdentifier('module name');
    this.expectKeyword('DEFINITIONS');
    this.tagDefault = this.parseTagDefault();
    this.expectSymbol('::=');
    this.expectKeyword('BEGIN');

    const types = [];
    while (!this.matchKeyword('END')) {
      const name = this.expectIdentifier('type name');
      this.expectSymbol('::=');
      types.push({ name, type: this.parseType() });
    }
    this.expectEnd();
    return { name: moduleName, tagDefault: this.tagDefault, types };
  }

  private parseTagDefault(): Asn1TagDefault {
    if (this.matchKeyword('EXPLICIT')) {
      this.expectKeyword('TAGS');
      return 'explicit';
    }
    if (this.matchKeyword('IMPLICIT')) {
      this.expectKeyword('TAGS');
      return 'implicit';
    }
    if (this.matchKeyword('AUTOMATIC')) {
      this.expectKeyword('TAGS');
      return 'automatic';
    }
    return 'explicit';
  }

  private parseType(): Asn1Type {
    if (this.matchSymbol('[')) {
      const tagNumber = this.expectTagNumber('context-specific tag number');
      this.expectSymbol(']');
      const mode = this.parseTagMode();
      return { kind: 'tagged', tag: { class: 'context', number: tagNumber, mode }, type: this.parseType() };
    }

    const name = this.expectIdentifier('type');
    const upperName = name.toUpperCase();

    if (upperName === 'BIT') {
      this.expectKeyword('STRING');
      return { kind: 'bitString' };
    }

    if (upperName === 'OCTET') {
      this.expectKeyword('STRING');
      return { kind: 'octetString' };
    }

    if (upperName === 'OBJECT') {
      this.expectKeyword('IDENTIFIER');
      return { kind: 'objectIdentifier' };
    }

    if (upperName === 'INTEGER') {
      return this.isNextSymbol('{') ? { kind: 'integer', values: this.parseNamedNumberList() } : { kind: 'integer' };
    }

    if (upperName === 'SEQUENCE') {
      if (this.matchKeyword('OF')) return { kind: 'sequenceOf', elementType: this.parseType() };
      return { kind: 'sequence', fields: this.parseFieldList() };
    }

    if (upperName === 'SET') {
      if (this.matchKeyword('OF')) return { kind: 'setOf', elementType: this.parseType() };
      return { kind: 'set', fields: this.parseFieldList() };
    }

    if (upperName === 'CHOICE') {
      return { kind: 'choice', alternatives: this.parseFieldList() };
    }

    if (upperName === 'ENUMERATED') {
      return { kind: 'enumerated', values: this.parseNamedNumberList() };
    }

    const primitive = primitiveTypes[upperName];
    if (primitive) return { kind: primitive };
    return { kind: 'defined', typeName: name };
  }

  private parseFieldList(): Asn1Field[] {
    this.expectSymbol('{');
    const fields: Asn1Field[] = [];
    if (this.matchSymbol('}')) return fields;
    while (true) {
      const name = this.expectIdentifier('field name');
      const type = this.parseType();
      const optional = this.matchKeyword('OPTIONAL');
      const hasDefault = !optional && this.matchKeyword('DEFAULT');
      const defaultValue = hasDefault ? this.parseDefaultValue(type) : undefined;
      fields.push({ name, type, ...(optional ? { optional } : {}), ...(hasDefault ? { defaultValue } : {}) });
      if (this.matchSymbol(',')) continue;
      this.expectSymbol('}');
      return this.applyAutomaticTags(fields);
    }
  }

  private parseTagMode(): 'explicit' | 'implicit' {
    if (this.matchKeyword('EXPLICIT')) return 'explicit';
    if (this.matchKeyword('IMPLICIT')) return 'implicit';
    return this.tagDefault === 'automatic' ? 'implicit' : this.tagDefault;
  }

  private applyAutomaticTags(fields: Asn1Field[]): Asn1Field[] {
    if (this.tagDefault !== 'automatic') return fields;
    const usedTags = new Set(fields.flatMap((field) => (field.type.kind === 'tagged' ? [field.type.tag.number] : [])));
    let nextTagNumber = 0;
    return fields.map((field) => {
      if (field.type.kind === 'tagged') return field;
      while (usedTags.has(nextTagNumber)) nextTagNumber += 1;
      if (nextTagNumber > 30) throw this.error('AUTOMATIC TAGS only supports low-form tag numbers from 0 to 30.', undefined);
      const taggedField: Asn1Field = {
        ...field,
        type: { kind: 'tagged', tag: { class: 'context', number: nextTagNumber, mode: 'implicit' }, type: field.type }
      };
      usedTags.add(nextTagNumber);
      nextTagNumber += 1;
      return taggedField;
    });
  }

  private parseNamedNumberList(): { name: string; value: number }[] {
    this.expectSymbol('{');
    const values: { name: string; value: number }[] = [];
    if (this.matchSymbol('}')) return values;
    while (true) {
      const name = this.expectIdentifier('enumerated value name');
      this.expectSymbol('(');
      const value = this.expectNumber('enumerated value number');
      this.expectSymbol(')');
      values.push({ name, value });
      if (this.matchSymbol(',')) continue;
      this.expectSymbol('}');
      return values;
    }
  }

  private parseDefaultValue(type: Asn1Type): unknown {
    const defaultType = unwrapTaggedType(type);
    if (defaultType.kind === 'boolean') {
      if (this.matchKeyword('TRUE')) return true;
      if (this.matchKeyword('FALSE')) return false;
      throw this.error('Expected TRUE or FALSE as BOOLEAN DEFAULT value.', this.peek());
    }
    if (defaultType.kind === 'integer') return defaultType.values ? this.expectIdentifier('INTEGER DEFAULT value') : this.expectNumber('INTEGER DEFAULT value');
    if (defaultType.kind === 'enumerated' || defaultType.kind === 'defined') return this.expectIdentifier('ENUMERATED DEFAULT value');
    throw this.error('DEFAULT values are currently supported for BOOLEAN, INTEGER, and ENUMERATED fields only.', this.peek());
  }

  private expectIdentifier(label: string): string {
    const token = this.take();
    if (!token || !/^[A-Za-z][A-Za-z0-9-]*$/.test(token.value)) {
      throw this.error(`Expected ${label}.`, token);
    }
    return token.value;
  }

  private expectNumber(label: string): number {
    const token = this.take();
    if (!token || !/^-?\d+$/.test(token.value)) {
      throw this.error(`Expected ${label}.`, token);
    }
    const value = Number.parseInt(token.value, 10);
    return value;
  }

  private expectTagNumber(label: string): number {
    const token = this.take();
    if (!token || !/^\d+$/.test(token.value)) {
      throw this.error(`Expected ${label}.`, token);
    }
    const value = Number.parseInt(token.value, 10);
    if (value > 30) throw this.error('Only low-form tag numbers from 0 to 30 are supported.', token);
    return value;
  }

  private expectKeyword(keyword: string): void {
    const token = this.take();
    if (!token || token.value.toUpperCase() !== keyword) {
      throw this.error(`Expected ${keyword}.`, token);
    }
  }

  private expectSymbol(symbol: string): void {
    const token = this.take();
    if (!token || token.value !== symbol) {
      throw this.error(`Expected ${symbol}.`, token);
    }
  }

  private expectEnd(): void {
    const token = this.peek();
    if (token) throw this.error('Unexpected token after END.', token);
  }

  private matchKeyword(keyword: string): boolean {
    const token = this.peek();
    if (token?.value.toUpperCase() !== keyword) return false;
    this.index += 1;
    return true;
  }

  private matchSymbol(symbol: string): boolean {
    const token = this.peek();
    if (token?.value !== symbol) return false;
    this.index += 1;
    return true;
  }

  private isNextSymbol(symbol: string): boolean {
    return this.peek()?.value === symbol;
  }

  private take(): Token | undefined {
    const token = this.peek();
    if (token) this.index += 1;
    return token;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private error(message: string, token: Token | undefined): DerBuilderError {
    const detail = token ? `${message} Found "${token.value}" near offset ${token.offset}.` : `${message} Reached end of input.`;
    return new DerBuilderError(detail);
  }
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (source.startsWith('--', index)) {
      const end = source.indexOf('\n', index + 2);
      index = end === -1 ? source.length : end + 1;
      continue;
    }
    if (source.startsWith('::=', index)) {
      tokens.push({ value: '::=', offset: index });
      index += 3;
      continue;
    }
    if (char === '{' || char === '}' || char === ',' || char === '[' || char === ']' || char === '(' || char === ')') {
      tokens.push({ value: char, offset: index });
      index += 1;
      continue;
    }
    const number = /^-?\d+/.exec(source.slice(index));
    if (number) {
      tokens.push({ value: number[0], offset: index });
      index += number[0].length;
      continue;
    }
    const identifier = /^[A-Za-z][A-Za-z0-9-]*/.exec(source.slice(index));
    if (identifier) {
      tokens.push({ value: identifier[0], offset: index });
      index += identifier[0].length;
      continue;
    }
    throw new DerBuilderError(`Unexpected character "${char}" near offset ${index}.`);
  }
  return tokens;
}

function unwrapTaggedType(type: Asn1Type): Asn1Type {
  return type.kind === 'tagged' ? unwrapTaggedType(type.type) : type;
}
