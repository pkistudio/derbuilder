import { describe, it } from 'node:test';
import { expect } from './expect.js';
import { namedObjectDefinitionBundles } from '../src/internal/app/named-object-bundles';
import { findDefinitionBundleEntry, isRawAsn1BundleSchemaSource } from '../src/internal/app/definition-bundle';

describe('NamedObjects Definition Bundle catalog', () => {
  it('exposes the built-in parent object bundles', () => {
    expect(namedObjectDefinitionBundles.map((bundle) => bundle.id)).toEqual([
      'person',
      'tagged-person',
      'binary-record',
      'default-record',
      'signed-record',
      'versioned-serial',
      'tbs-certificate-prefix',
      'certificate',
      'certification-request',
      'certificate-list',
      'algorithm-identifier',
      'pki-bundle'
    ]);
  });

  it('keeps each primary entry selectable by bundle id', () => {
    for (const bundle of namedObjectDefinitionBundles) {
      const entry = findDefinitionBundleEntry(bundle, bundle.id);

      expect(entry?.label).toBe(bundle.label);
      expect(entry?.sampleInput).toBeDefined();
    }
  });

  it('uses raw ASN.1 schema sources with display source names', () => {
    for (const bundle of namedObjectDefinitionBundles) {
      expect(isRawAsn1BundleSchemaSource(bundle.schema)).toBe(true);
      expect(bundle.schema.sourceName).toMatch(/\.asn1$/);
      expect(bundle.schema.source).toContain('DEFINITIONS');
    }
  });

  it('attaches a UI Profile to the Certificate primary entry', () => {
    const certificateBundle = namedObjectDefinitionBundles.find((bundle) => bundle.id === 'certificate');
    const certificateEntry = certificateBundle ? findDefinitionBundleEntry(certificateBundle, 'certificate') : undefined;

    expect(certificateEntry?.uiProfile?.id).toBe('pkistudio.named-object.certificate.ui-profile');
    expect(certificateEntry?.uiProfile?.typeName).toBe('Certificate');
    expect(certificateEntry?.uiProfile?.fields?.tbsCertificate).toMatchObject({
      label: 'TBSCertificate',
      description: 'Signed certificate body.',
      order: 0
    });
    expect(certificateEntry?.uiProfile?.fields?.['tbsCertificate.issuer']).toMatchObject({
      label: 'Issuer',
      collapsed: true,
      order: 3
    });
    expect(certificateEntry?.uiProfile?.fields?.['tbsCertificate.subjectPublicKeyInfo']).toMatchObject({
      label: 'Subject public key info',
      collapsed: true,
      order: 6
    });
    expect(certificateEntry?.uiProfile?.fields?.['signatureValue.bytes']).toMatchObject({
      label: 'Signature bytes',
      inputMode: 'hex'
    });
  });

  it('does not attach the Certificate UI Profile to child sample entries', () => {
    const certificateBundle = namedObjectDefinitionBundles.find((bundle) => bundle.id === 'certificate');
    const tbsCertificateEntry = certificateBundle ? findDefinitionBundleEntry(certificateBundle, 'TBSCertificate') : undefined;

    expect(tbsCertificateEntry?.sampleInput).toBeDefined();
    expect(tbsCertificateEntry?.uiProfile).toBeUndefined();
  });

  it('attaches a UI Profile to the CertificationRequest primary entry', () => {
    const csrBundle = namedObjectDefinitionBundles.find((bundle) => bundle.id === 'certification-request');
    const csrEntry = csrBundle ? findDefinitionBundleEntry(csrBundle, 'certification-request') : undefined;

    expect(csrEntry?.uiProfile?.id).toBe('pkistudio.named-object.certification-request.ui-profile');
    expect(csrEntry?.uiProfile?.typeName).toBe('CertificationRequest');
    expect(csrEntry?.uiProfile?.fields?.certificationRequestInfo).toMatchObject({
      label: 'Certification request info',
      description: 'The request body that is signed by the requester.',
      order: 0
    });
    expect(csrEntry?.uiProfile?.fields?.['certificationRequestInfo.subject']).toMatchObject({
      label: 'Subject',
      collapsed: true,
      order: 1
    });
    expect(csrEntry?.uiProfile?.fields?.['certificationRequestInfo.subjectPublicKeyInfo']).toMatchObject({
      label: 'Subject public key info',
      collapsed: true,
      order: 2
    });
    expect(csrEntry?.uiProfile?.fields?.['signature.bytes']).toMatchObject({
      label: 'Signature bytes',
      inputMode: 'hex'
    });
  });

  it('does not attach the CertificationRequest UI Profile to child sample entries', () => {
    const csrBundle = namedObjectDefinitionBundles.find((bundle) => bundle.id === 'certification-request');
    const csrInfoEntry = csrBundle ? findDefinitionBundleEntry(csrBundle, 'CertificationRequestInfo') : undefined;

    expect(csrInfoEntry?.sampleInput).toBeDefined();
    expect(csrInfoEntry?.uiProfile).toBeUndefined();
  });

  it('attaches a UI Profile to the CertificateList primary entry', () => {
    const crlBundle = namedObjectDefinitionBundles.find((bundle) => bundle.id === 'certificate-list');
    const crlEntry = crlBundle ? findDefinitionBundleEntry(crlBundle, 'certificate-list') : undefined;

    expect(crlEntry?.uiProfile?.id).toBe('pkistudio.named-object.certificate-list.ui-profile');
    expect(crlEntry?.uiProfile?.typeName).toBe('CertificateList');
    expect(crlEntry?.uiProfile?.fields?.tbsCertList).toMatchObject({
      label: 'TBSCertList',
      description: 'Signed certificate revocation list body.',
      order: 0
    });
    expect(crlEntry?.uiProfile?.fields?.['tbsCertList.issuer']).toMatchObject({
      label: 'Issuer',
      collapsed: true,
      order: 2
    });
    expect(crlEntry?.uiProfile?.fields?.['tbsCertList.revokedCertificates']).toMatchObject({
      label: 'Revoked certificates',
      collapsed: true,
      order: 5
    });
    expect(crlEntry?.uiProfile?.fields?.['signatureValue.bytes']).toMatchObject({
      label: 'Signature bytes',
      inputMode: 'hex'
    });
  });

  it('does not attach the CertificateList UI Profile to child sample entries', () => {
    const crlBundle = namedObjectDefinitionBundles.find((bundle) => bundle.id === 'certificate-list');
    const tbsCertListEntry = crlBundle ? findDefinitionBundleEntry(crlBundle, 'TBSCertList') : undefined;

    expect(tbsCertListEntry?.sampleInput).toBeDefined();
    expect(tbsCertListEntry?.uiProfile).toBeUndefined();
  });

  it('attaches a UI Profile to the PkiBundle primary entry', () => {
    const pkiBundle = namedObjectDefinitionBundles.find((bundle) => bundle.id === 'pki-bundle');
    const pkiBundleEntry = pkiBundle ? findDefinitionBundleEntry(pkiBundle, 'pki-bundle') : undefined;

    expect(pkiBundleEntry?.uiProfile?.id).toBe('pkistudio.named-object.pki-bundle.ui-profile');
    expect(pkiBundleEntry?.uiProfile?.typeName).toBe('PkiBundle');
    expect(pkiBundleEntry?.uiProfile?.fields?.signature).toMatchObject({
      label: 'Signature algorithm',
      description: 'Algorithm identifier used by the demo PKI object.',
      order: 0
    });
    expect(pkiBundleEntry?.uiProfile?.fields?.issuer).toMatchObject({
      label: 'Issuer',
      collapsed: true,
      order: 1
    });
    expect(pkiBundleEntry?.uiProfile?.fields?.subjectPublicKeyInfo).toMatchObject({
      label: 'Subject public key info',
      collapsed: true,
      order: 3
    });
    expect(pkiBundleEntry?.uiProfile?.fields?.['extension.extnValue']).toMatchObject({
      label: 'Extension value',
      inputMode: 'hex'
    });
  });

  it('does not attach the PkiBundle UI Profile to child sample entries', () => {
    const pkiBundle = namedObjectDefinitionBundles.find((bundle) => bundle.id === 'pki-bundle');
    const algorithmIdentifierEntry = pkiBundle ? findDefinitionBundleEntry(pkiBundle, 'AlgorithmIdentifier') : undefined;

    expect(algorithmIdentifierEntry?.sampleInput).toBeDefined();
    expect(algorithmIdentifierEntry?.uiProfile).toBeUndefined();
  });
});
