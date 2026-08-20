import type { DefinitionBundle } from './definition-bundle.js';
import type { UiProfile } from './ui-profile.js';
import {
  binaryInputsDefinition,
  binaryInputsInput,
  defaultsAndEnumeratedDefinition,
  defaultsAndEnumeratedInput,
  minimalCertificateInput,
  minimalCrlDefinition,
  minimalCrlInput,
  minimalCsrDefinition,
  minimalCsrInput,
  minimalTbsCertificateDefinition,
  minimalTbsCertificateInput,
  moduleTagsDefinition,
  negativeIntegerDefinition,
  negativeIntegerInput,
  oidNamesDefinition,
  oidNamesInput,
  personDefinition,
  personInput,
  pkiComponentsDefinition,
  pkiComponentsInput,
  taggedPersonDefinition,
  taggedPersonInput,
  x509VersionDefinition,
  x509VersionInput
} from './example-assets.js';

type JsonObject = Record<string, unknown>;
type SampleInputMap = Record<string, unknown>;

interface NamedObjectBundleInput {
  id: string;
  label: string;
  typeName: string;
  sourceName: string;
  definition: string;
  sampleInputs: SampleInputMap;
  uiProfile?: UiProfile;
}

export type NamedObjectDefinitionBundle = DefinitionBundle & {
  schema: Extract<DefinitionBundle['schema'], { format: 'asn1' }> & { sourceName: string };
};

function parseFixtureJson<T = unknown>(source: string): T {
  return JSON.parse(source) as T;
}

const personSample = parseFixtureJson(personInput);
const taggedPersonSample = parseFixtureJson(taggedPersonInput);
const binaryRecordSample = parseFixtureJson(binaryInputsInput);
const defaultRecordSample = parseFixtureJson(defaultsAndEnumeratedInput);
const signedRecordSample = parseFixtureJson(negativeIntegerInput);
const x509VersionSample = parseFixtureJson(x509VersionInput);
const algorithmIdentifierSample = parseFixtureJson(oidNamesInput);
const certificateSample = parseFixtureJson(minimalCertificateInput);
const tbsCertificateSample = parseFixtureJson(minimalTbsCertificateInput);
const certificationRequestSample = parseFixtureJson<JsonObject>(minimalCsrInput);
const certificateListSample = parseFixtureJson<JsonObject>(minimalCrlInput);
const pkiBundleSample = parseFixtureJson<JsonObject>(pkiComponentsInput);

const attributeTypeAndValueSample = {
  type: 'commonName',
  value: { selected: 'utf8String', value: 'Example' }
};
const directoryStringSample = { selected: 'utf8String', value: 'Example' };
const relativeDistinguishedNameSample = [attributeTypeAndValueSample];
const rdnSequenceSample = [relativeDistinguishedNameSample];
const nameSample = pkiBundleSample.issuer;
const timeSample = { selected: 'utcTime', value: '260520000000Z' };
const validitySample = pkiBundleSample.validity;
const sharedSubjectPublicKeyInfoSample = pkiBundleSample.subjectPublicKeyInfo as JsonObject;
const subjectPublicKeyInfoSample = {
  ...sharedSubjectPublicKeyInfoSample,
  algorithm: { algorithm: 'rsaEncryption', parameters: null }
};
const extensionSample = pkiBundleSample.extension;
const extensionsSample = [extensionSample];
const attributeValueSample = { utf8: 'changeit' };
const attributeValuesSample = [attributeValueSample];
const attributeSample = {
  type: '1.2.840.113549.1.9.7',
  values: attributeValuesSample
};
const attributesSample = [attributeSample];
const revokedCertificateSample = {
  userCertificate: 42,
  revocationDate: timeSample
};
const revokedCertificatesSample = [revokedCertificateSample];

const pkiComponentSamples: SampleInputMap = {
  AlgorithmIdentifier: algorithmIdentifierSample,
  AttributeTypeAndValue: attributeTypeAndValueSample,
  DirectoryString: directoryStringSample,
  RelativeDistinguishedName: relativeDistinguishedNameSample,
  RDNSequence: rdnSequenceSample,
  Name: nameSample,
  Time: timeSample,
  Validity: validitySample,
  SubjectPublicKeyInfo: subjectPublicKeyInfoSample,
  Extension: extensionSample,
  Extensions: extensionsSample
};

const sharedPkiComponentSamples: SampleInputMap = {
  ...pkiComponentSamples,
  AlgorithmIdentifier: pkiBundleSample.signature,
  SubjectPublicKeyInfo: sharedSubjectPublicKeyInfoSample
};

const certificateUiProfile: UiProfile = {
  id: 'pkistudio.named-object.certificate.ui-profile',
  typeName: 'Certificate',
  fields: {
    tbsCertificate: {
      label: 'TBSCertificate',
      description: 'Signed certificate body.',
      order: 0
    },
    signatureAlgorithm: {
      label: 'Signature algorithm',
      description: 'Algorithm identifier for the certificate signature.',
      order: 1
    },
    signatureValue: {
      label: 'Signature value',
      description: 'BIT STRING containing the certificate signature.',
      order: 2,
      widget: 'bitString'
    },
    'signatureValue.bytes': {
      label: 'Signature bytes',
      inputMode: 'hex',
      placeholder: 'deadbeef'
    },
    'signatureValue.unusedBits': {
      label: 'Unused bits'
    },
    'tbsCertificate.version': {
      label: 'Version',
      description: 'X.509 certificate version.',
      order: 0
    },
    'tbsCertificate.serialNumber': {
      label: 'Serial number',
      order: 1
    },
    'tbsCertificate.signature': {
      label: 'TBS signature algorithm',
      description: 'Algorithm used when signing the TBS certificate.',
      order: 2
    },
    'tbsCertificate.signature.algorithm': {
      label: 'Algorithm',
      inputMode: 'oid',
      placeholder: 'sha256WithRSAEncryption'
    },
    'tbsCertificate.issuer': {
      label: 'Issuer',
      description: 'Distinguished name of the issuing CA.',
      order: 3,
      collapsed: true
    },
    'tbsCertificate.validity': {
      label: 'Validity',
      description: 'Certificate validity period.',
      order: 4
    },
    'tbsCertificate.validity.notBefore': {
      label: 'Not before',
      order: 0
    },
    'tbsCertificate.validity.notBefore.value': {
      label: 'UTCTime value',
      placeholder: 'YYMMDDHHMMSSZ'
    },
    'tbsCertificate.validity.notAfter': {
      label: 'Not after',
      order: 1
    },
    'tbsCertificate.validity.notAfter.value': {
      label: 'UTCTime value',
      placeholder: 'YYMMDDHHMMSSZ'
    },
    'tbsCertificate.subject': {
      label: 'Subject',
      description: 'Distinguished name of the certificate subject.',
      order: 5,
      collapsed: true
    },
    'tbsCertificate.subjectPublicKeyInfo': {
      label: 'Subject public key info',
      description: 'Subject key algorithm and public key bits.',
      order: 6,
      collapsed: true
    },
    'tbsCertificate.subjectPublicKeyInfo.algorithm': {
      label: 'Public key algorithm'
    },
    'tbsCertificate.subjectPublicKeyInfo.algorithm.algorithm': {
      label: 'Algorithm',
      inputMode: 'oid',
      placeholder: 'rsaEncryption'
    },
    'tbsCertificate.subjectPublicKeyInfo.subjectPublicKey': {
      label: 'Subject public key',
      widget: 'bitString'
    },
    'tbsCertificate.subjectPublicKeyInfo.subjectPublicKey.bytes': {
      label: 'Public key bytes',
      inputMode: 'hex',
      placeholder: '00'
    },
    'tbsCertificate.subjectPublicKeyInfo.subjectPublicKey.unusedBits': {
      label: 'Unused bits'
    },
    'tbsCertificate.extensions': {
      label: 'Extensions',
      description: 'Optional certificate extensions.',
      order: 7,
      collapsed: true
    },
    'tbsCertificate.extensions.0.extnID': {
      label: 'Extension OID',
      inputMode: 'oid',
      placeholder: 'basicConstraints'
    },
    'tbsCertificate.extensions.0.critical': {
      label: 'Critical'
    },
    'tbsCertificate.extensions.0.extnValue': {
      label: 'Extension value',
      inputMode: 'hex',
      placeholder: '30030101ff'
    }
  }
};

const certificationRequestUiProfile: UiProfile = {
  id: 'pkistudio.named-object.certification-request.ui-profile',
  typeName: 'CertificationRequest',
  fields: {
    certificationRequestInfo: {
      label: 'Certification request info',
      description: 'The request body that is signed by the requester.',
      order: 0
    },
    signatureAlgorithm: {
      label: 'Signature algorithm',
      description: 'Algorithm identifier for the CSR signature.',
      order: 1
    },
    signature: {
      label: 'Signature value',
      description: 'BIT STRING containing the CSR signature.',
      order: 2,
      widget: 'bitString'
    },
    'signature.bytes': {
      label: 'Signature bytes',
      inputMode: 'hex',
      placeholder: '010203040506'
    },
    'signature.unusedBits': {
      label: 'Unused bits'
    },
    'certificationRequestInfo.version': {
      label: 'Version',
      description: 'PKCS #10 certification request version.',
      order: 0
    },
    'certificationRequestInfo.subject': {
      label: 'Subject',
      description: 'Distinguished name of the requester.',
      order: 1,
      collapsed: true
    },
    'certificationRequestInfo.subjectPublicKeyInfo': {
      label: 'Subject public key info',
      description: 'Requester key algorithm and public key bits.',
      order: 2,
      collapsed: true
    },
    'certificationRequestInfo.subjectPublicKeyInfo.algorithm': {
      label: 'Public key algorithm'
    },
    'certificationRequestInfo.subjectPublicKeyInfo.algorithm.algorithm': {
      label: 'Algorithm',
      inputMode: 'oid',
      placeholder: 'rsaEncryption'
    },
    'certificationRequestInfo.subjectPublicKeyInfo.subjectPublicKey': {
      label: 'Subject public key',
      widget: 'bitString'
    },
    'certificationRequestInfo.subjectPublicKeyInfo.subjectPublicKey.bytes': {
      label: 'Public key bytes',
      inputMode: 'hex',
      placeholder: '00'
    },
    'certificationRequestInfo.subjectPublicKeyInfo.subjectPublicKey.unusedBits': {
      label: 'Unused bits'
    },
    'certificationRequestInfo.attributes': {
      label: 'Attributes',
      description: 'Optional request attributes such as challenge password.',
      order: 3,
      collapsed: true
    },
    'certificationRequestInfo.attributes.0.type': {
      label: 'Attribute type',
      inputMode: 'oid',
      placeholder: '1.2.840.113549.1.9.7'
    },
    'certificationRequestInfo.attributes.0.values': {
      label: 'Attribute values'
    }
  }
};

const certificateListUiProfile: UiProfile = {
  id: 'pkistudio.named-object.certificate-list.ui-profile',
  typeName: 'CertificateList',
  fields: {
    tbsCertList: {
      label: 'TBSCertList',
      description: 'Signed certificate revocation list body.',
      order: 0
    },
    signatureAlgorithm: {
      label: 'Signature algorithm',
      description: 'Algorithm identifier for the CRL signature.',
      order: 1
    },
    signatureValue: {
      label: 'Signature value',
      description: 'BIT STRING containing the CRL signature.',
      order: 2,
      widget: 'bitString'
    },
    'signatureValue.bytes': {
      label: 'Signature bytes',
      inputMode: 'hex',
      placeholder: '0102030405060708'
    },
    'signatureValue.unusedBits': {
      label: 'Unused bits'
    },
    'tbsCertList.version': {
      label: 'Version',
      description: 'X.509 CRL version.',
      order: 0
    },
    'tbsCertList.signature': {
      label: 'TBS signature algorithm',
      description: 'Algorithm used when signing the TBS CRL.',
      order: 1
    },
    'tbsCertList.signature.algorithm': {
      label: 'Algorithm',
      inputMode: 'oid',
      placeholder: 'sha256WithRSAEncryption'
    },
    'tbsCertList.issuer': {
      label: 'Issuer',
      description: 'Distinguished name of the CRL issuer.',
      order: 2,
      collapsed: true
    },
    'tbsCertList.thisUpdate': {
      label: 'This update',
      order: 3
    },
    'tbsCertList.thisUpdate.value': {
      label: 'UTCTime value',
      placeholder: 'YYMMDDHHMMSSZ'
    },
    'tbsCertList.nextUpdate': {
      label: 'Next update',
      order: 4
    },
    'tbsCertList.nextUpdate.value': {
      label: 'UTCTime value',
      placeholder: 'YYMMDDHHMMSSZ'
    },
    'tbsCertList.revokedCertificates': {
      label: 'Revoked certificates',
      description: 'Optional list of revoked certificate entries.',
      order: 5,
      collapsed: true
    },
    'tbsCertList.revokedCertificates.0.userCertificate': {
      label: 'User certificate serial number'
    },
    'tbsCertList.revokedCertificates.0.revocationDate': {
      label: 'Revocation date'
    },
    'tbsCertList.revokedCertificates.0.revocationDate.value': {
      label: 'UTCTime value',
      placeholder: 'YYMMDDHHMMSSZ'
    },
    'tbsCertList.revokedCertificates.0.crlEntryExtensions': {
      label: 'CRL entry extensions',
      collapsed: true
    },
    'tbsCertList.crlExtensions': {
      label: 'CRL extensions',
      description: 'Optional extensions that apply to the CRL as a whole.',
      order: 6,
      collapsed: true
    },
    'tbsCertList.crlExtensions.0.extnID': {
      label: 'Extension OID',
      inputMode: 'oid',
      placeholder: 'authorityKeyIdentifier'
    },
    'tbsCertList.crlExtensions.0.critical': {
      label: 'Critical'
    },
    'tbsCertList.crlExtensions.0.extnValue': {
      label: 'Extension value',
      inputMode: 'hex',
      placeholder: '3006800401020304'
    }
  }
};

const pkiBundleUiProfile: UiProfile = {
  id: 'pkistudio.named-object.pki-bundle.ui-profile',
  typeName: 'PkiBundle',
  fields: {
    signature: {
      label: 'Signature algorithm',
      description: 'Algorithm identifier used by the demo PKI object.',
      order: 0
    },
    'signature.algorithm': {
      label: 'Algorithm',
      inputMode: 'oid',
      placeholder: 'sha256WithRSAEncryption'
    },
    issuer: {
      label: 'Issuer',
      description: 'Distinguished name of the issuing CA.',
      order: 1,
      collapsed: true
    },
    validity: {
      label: 'Validity',
      description: 'Validity period for the demo PKI object.',
      order: 2
    },
    'validity.notBefore': {
      label: 'Not before',
      order: 0
    },
    'validity.notBefore.value': {
      label: 'UTCTime value',
      placeholder: 'YYMMDDHHMMSSZ'
    },
    'validity.notAfter': {
      label: 'Not after',
      order: 1
    },
    'validity.notAfter.value': {
      label: 'UTCTime value',
      placeholder: 'YYMMDDHHMMSSZ'
    },
    subjectPublicKeyInfo: {
      label: 'Subject public key info',
      description: 'Subject key algorithm and public key bits.',
      order: 3,
      collapsed: true
    },
    'subjectPublicKeyInfo.algorithm': {
      label: 'Public key algorithm'
    },
    'subjectPublicKeyInfo.algorithm.algorithm': {
      label: 'Algorithm',
      inputMode: 'oid',
      placeholder: 'rsaEncryption'
    },
    'subjectPublicKeyInfo.subjectPublicKey': {
      label: 'Subject public key',
      widget: 'bitString'
    },
    'subjectPublicKeyInfo.subjectPublicKey.bytes': {
      label: 'Public key bytes',
      inputMode: 'hex',
      placeholder: '00'
    },
    'subjectPublicKeyInfo.subjectPublicKey.unusedBits': {
      label: 'Unused bits'
    },
    extension: {
      label: 'Extension',
      description: 'Optional extension carried by the demo PKI object.',
      order: 4,
      collapsed: true
    },
    'extension.extnID': {
      label: 'Extension OID',
      inputMode: 'oid',
      placeholder: 'basicConstraints'
    },
    'extension.critical': {
      label: 'Critical'
    },
    'extension.extnValue': {
      label: 'Extension value',
      inputMode: 'hex',
      placeholder: '30030101ff'
    }
  }
};

function createNamedObjectDefinitionBundle(input: NamedObjectBundleInput): NamedObjectDefinitionBundle {
  return {
    id: input.id,
    version: '1.0.0',
    label: input.label,
    schema: {
      format: 'asn1',
      sourceName: input.sourceName,
      source: input.definition
    },
    entries: Object.entries(input.sampleInputs).map(([typeName, sampleInput]) => ({
      id: typeName === input.typeName ? input.id : undefined,
      typeName,
      label: typeName === input.typeName ? input.label : typeName,
      sampleInput,
      uiProfile: typeName === input.typeName ? input.uiProfile : undefined
    }))
  };
}

/** Built-in NamedObjects exposed as reusable app-level Definition Bundles. */
export const namedObjectDefinitionBundles: readonly NamedObjectDefinitionBundle[] = [
  createNamedObjectDefinitionBundle({ id: 'person', label: 'Person', typeName: 'Person', sourceName: 'person.asn1', definition: personDefinition, sampleInputs: { Person: personSample } }),
  createNamedObjectDefinitionBundle({ id: 'tagged-person', label: 'TaggedPerson', typeName: 'TaggedPerson', sourceName: 'tagged-person.asn1', definition: taggedPersonDefinition, sampleInputs: { TaggedPerson: taggedPersonSample } }),
  createNamedObjectDefinitionBundle({ id: 'binary-record', label: 'BinaryRecord', typeName: 'BinaryRecord', sourceName: 'binary-inputs.asn1', definition: binaryInputsDefinition, sampleInputs: { BinaryRecord: binaryRecordSample } }),
  createNamedObjectDefinitionBundle({ id: 'default-record', label: 'DefaultRecord', typeName: 'DefaultRecord', sourceName: 'defaults-and-enumerated.asn1', definition: defaultsAndEnumeratedDefinition, sampleInputs: { Status: 'warning', DefaultRecord: defaultRecordSample } }),
  createNamedObjectDefinitionBundle({ id: 'signed-record', label: 'SignedRecord', typeName: 'SignedRecord', sourceName: 'negative-integer.asn1', definition: negativeIntegerDefinition, sampleInputs: { Delta: 'minusOne', SignedRecord: signedRecordSample } }),
  createNamedObjectDefinitionBundle({ id: 'versioned-serial', label: 'VersionedSerial', typeName: 'VersionedSerial', sourceName: 'module-tags.asn1', definition: moduleTagsDefinition, sampleInputs: { Version: 'v3', VersionedSerial: x509VersionSample } }),
  createNamedObjectDefinitionBundle({ id: 'tbs-certificate-prefix', label: 'TBSCertificatePrefix', typeName: 'TBSCertificatePrefix', sourceName: 'x509-version.asn1', definition: x509VersionDefinition, sampleInputs: { Version: 'v3', TBSCertificatePrefix: x509VersionSample } }),
  createNamedObjectDefinitionBundle({ id: 'certificate', label: 'Certificate', typeName: 'Certificate', sourceName: 'minimal-tbs-certificate.asn1', definition: minimalTbsCertificateDefinition, sampleInputs: { ...pkiComponentSamples, Version: 'v3', TBSCertificate: tbsCertificateSample, Certificate: certificateSample }, uiProfile: certificateUiProfile }),
  createNamedObjectDefinitionBundle({ id: 'certification-request', label: 'CertificationRequest', typeName: 'CertificationRequest', sourceName: 'minimal-csr.asn1', definition: minimalCsrDefinition, sampleInputs: { ...pkiComponentSamples, AttributeValue: attributeValueSample, AttributeValues: attributeValuesSample, Attribute: attributeSample, Attributes: attributesSample, CertificationRequestInfo: certificationRequestSample.certificationRequestInfo, CertificationRequest: certificationRequestSample }, uiProfile: certificationRequestUiProfile }),
  createNamedObjectDefinitionBundle({ id: 'certificate-list', label: 'CertificateList', typeName: 'CertificateList', sourceName: 'minimal-crl.asn1', definition: minimalCrlDefinition, sampleInputs: { ...pkiComponentSamples, Version: 'v2', RevokedCertificate: revokedCertificateSample, RevokedCertificates: revokedCertificatesSample, TBSCertList: certificateListSample.tbsCertList, CertificateList: certificateListSample }, uiProfile: certificateListUiProfile }),
  createNamedObjectDefinitionBundle({ id: 'algorithm-identifier', label: 'AlgorithmIdentifier', typeName: 'AlgorithmIdentifier', sourceName: 'oid-names.asn1', definition: oidNamesDefinition, sampleInputs: { AlgorithmIdentifier: algorithmIdentifierSample } }),
  createNamedObjectDefinitionBundle({ id: 'pki-bundle', label: 'PkiBundle', typeName: 'PkiBundle', sourceName: 'pki-components.asn1', definition: pkiComponentsDefinition, sampleInputs: { ...sharedPkiComponentSamples, PkiBundle: pkiBundleSample }, uiProfile: pkiBundleUiProfile })
];
