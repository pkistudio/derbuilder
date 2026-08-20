import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { bytesToHex, createInstance, parseAsn1Definition, validateInstance, validateSchemaModule } from '../src/core';

const definition = `MinimalCsrExample DEFINITIONS EXPLICIT TAGS ::= BEGIN
AlgorithmIdentifier ::= SEQUENCE {
  algorithm OBJECT IDENTIFIER,
  parameters NULL OPTIONAL
}
AttributeTypeAndValue ::= SEQUENCE {
  type OBJECT IDENTIFIER,
  value DirectoryString
}
DirectoryString ::= CHOICE {
  utf8String UTF8String,
  printableString PrintableString
}
RelativeDistinguishedName ::= SET OF AttributeTypeAndValue
RDNSequence ::= SEQUENCE OF RelativeDistinguishedName
Name ::= CHOICE {
  rdnSequence RDNSequence
}
SubjectPublicKeyInfo ::= SEQUENCE {
  algorithm AlgorithmIdentifier,
  subjectPublicKey BIT STRING
}
AttributeValue ::= OCTET STRING
AttributeValues ::= SET OF AttributeValue
Attribute ::= SEQUENCE {
  type OBJECT IDENTIFIER,
  values AttributeValues
}
Attributes ::= SET OF Attribute
CertificationRequestInfo ::= SEQUENCE {
  version INTEGER,
  subject Name,
  subjectPublicKeyInfo SubjectPublicKeyInfo,
  attributes [0] IMPLICIT Attributes
}
CertificationRequest ::= SEQUENCE {
  certificationRequestInfo CertificationRequestInfo,
  signatureAlgorithm AlgorithmIdentifier,
  signature BIT STRING
}
END`;

const subject = { selected: 'rdnSequence', value: [[{ type: 'commonName', value: { selected: 'utf8String', value: 'Example EE' } }]] };
const subjectPublicKeyInfo = { algorithm: { algorithm: 'rsaEncryption', parameters: null }, subjectPublicKey: { bytes: { hex: '00' }, unusedBits: 0 } };
const signatureAlgorithm = { algorithm: 'sha256WithRSAEncryption', parameters: null };

describe('minimal CSR fixture', () => {
  const schema = parseAsn1Definition(definition);

  it('validates the CSR schema', () => {
    expect(validateSchemaModule(schema)).toEqual([]);
  });

  it('builds a CertificationRequest with an implicitly tagged attribute set', () => {
    const input = {
      certificationRequestInfo: {
        version: 0,
        subject,
        subjectPublicKeyInfo,
        attributes: [{ type: '1.2.840.113549.1.9.7', values: [{ utf8: 'changeit' }] }]
      },
      signatureAlgorithm,
      signature: { bytes: { hex: '010203040506' }, unusedBits: 0 }
    };
    const hex = bytesToHex(createInstance(schema, 'CertificationRequest', input).der);

    expect(validateInstance(schema, 'CertificationRequest', input)).toEqual([]);
    expect(hex.startsWith('30')).toBe(true);
    expect(hex.includes('02010030153113301106035504030c0a4578616d706c65204545')).toBe(true);
    expect(hex.includes('a019301706092a864886f70d010907310a04086368616e67656974')).toBe(true);
    expect(hex.endsWith('030700010203040506')).toBe(true);
  });

  it('builds a CertificationRequest with an empty attribute set', () => {
    const input = {
      certificationRequestInfo: {
        version: 0,
        subject,
        subjectPublicKeyInfo,
        attributes: []
      },
      signatureAlgorithm,
      signature: { bytes: { hex: '0a0b0c0d' }, unusedBits: 0 }
    };
    const hex = bytesToHex(createInstance(schema, 'CertificationRequest', input).der);

    expect(validateInstance(schema, 'CertificationRequest', input)).toEqual([]);
    expect(hex.startsWith('30')).toBe(true);
    expect(hex.includes('a000')).toBe(true);
    expect(hex.includes('2a864886f70d010907')).toBe(false);
    expect(hex.endsWith('0305000a0b0c0d')).toBe(true);
  });
});
