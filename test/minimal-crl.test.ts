import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { bytesToHex, createInstance, parseAsn1Definition, validateInstance, validateSchemaModule } from '../src/core';

const definition = `MinimalCrlExample DEFINITIONS EXPLICIT TAGS ::= BEGIN
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
Time ::= CHOICE {
  utcTime UTCTime,
  generalTime GeneralizedTime
}
Extension ::= SEQUENCE {
  extnID OBJECT IDENTIFIER,
  critical BOOLEAN DEFAULT FALSE,
  extnValue OCTET STRING
}
Extensions ::= SEQUENCE OF Extension
Version ::= INTEGER {
  v1(0),
  v2(1)
}
RevokedCertificate ::= SEQUENCE {
  userCertificate INTEGER,
  revocationDate Time,
  crlEntryExtensions Extensions OPTIONAL
}
RevokedCertificates ::= SEQUENCE OF RevokedCertificate
TBSCertList ::= SEQUENCE {
  version Version OPTIONAL,
  signature AlgorithmIdentifier,
  issuer Name,
  thisUpdate Time,
  nextUpdate Time OPTIONAL,
  revokedCertificates RevokedCertificates OPTIONAL,
  crlExtensions [0] EXPLICIT Extensions OPTIONAL
}
CertificateList ::= SEQUENCE {
  tbsCertList TBSCertList,
  signatureAlgorithm AlgorithmIdentifier,
  signatureValue BIT STRING
}
END`;

const issuer = { selected: 'rdnSequence', value: [[{ type: 'commonName', value: { selected: 'utf8String', value: 'Example CA' } }]] };
const signatureAlgorithm = { algorithm: 'sha256WithRSAEncryption', parameters: null };

describe('minimal CRL fixture', () => {
  const schema = parseAsn1Definition(definition);

  it('validates the CRL schema', () => {
    expect(validateSchemaModule(schema)).toEqual([]);
  });

  it('builds a v2 CertificateList with revoked certificates and CRL extensions', () => {
    const input = {
      tbsCertList: {
        version: 'v2',
        signature: signatureAlgorithm,
        issuer,
        thisUpdate: { selected: 'utcTime', value: '260520000000Z' },
        nextUpdate: { selected: 'utcTime', value: '260620000000Z' },
        revokedCertificates: [{ userCertificate: 42, revocationDate: { selected: 'utcTime', value: '260521000000Z' } }],
        crlExtensions: [{ extnID: '2.5.29.35', extnValue: { hex: '3006800401020304' } }]
      },
      signatureAlgorithm,
      signatureValue: { bytes: { hex: '0102030405060708' }, unusedBits: 0 }
    };
    const hex = bytesToHex(createInstance(schema, 'CertificateList', input).der);

    expect(validateInstance(schema, 'CertificateList', input)).toEqual([]);
    expect(hex.startsWith('30')).toBe(true);
    expect(hex.includes('020101300d06092a864886f70d01010b0500')).toBe(true);
    expect(hex.includes('3014301202012a170d3236303532313030303030305a')).toBe(true);
    expect(hex.includes('a0133011300f0603551d2304083006800401020304')).toBe(true);
    expect(hex.endsWith('0309000102030405060708')).toBe(true);
  });

  it('builds a CertificateList with optional version, revoked certificates, and extensions omitted', () => {
    const input = {
      tbsCertList: {
        signature: signatureAlgorithm,
        issuer,
        thisUpdate: { selected: 'utcTime', value: '260520000000Z' }
      },
      signatureAlgorithm,
      signatureValue: { bytes: { hex: '11121314' }, unusedBits: 0 }
    };
    const hex = bytesToHex(createInstance(schema, 'CertificateList', input).der);

    expect(validateInstance(schema, 'CertificateList', input)).toEqual([]);
    expect(hex.startsWith('30')).toBe(true);
    expect(hex.includes('020101')).toBe(false);
    expect(hex.includes('301302012a170d3236303532313030303030305a')).toBe(false);
    expect(hex.includes('a011300f300d0603551d23')).toBe(false);
    expect(hex.endsWith('03050011121314')).toBe(true);
  });
});
