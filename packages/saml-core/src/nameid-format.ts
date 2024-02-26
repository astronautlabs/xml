import { ValueOf } from "./utils";

export const NAMEID_PREFIX = 'urn:oasis:names:tc:SAML:1.1:nameid-format';
export const NameIDFormats = {
    Unspecified: `${NAMEID_PREFIX}:unspecified`,
    EmailAddress: `${NAMEID_PREFIX}:emailAddress`,
    X509SubjectName: `${NAMEID_PREFIX}:x509SubjectName`,
    WindowsDomainQualifiedName: `${NAMEID_PREFIX}:WindowsDomainQualifiedName`,
    Kerberos: `${NAMEID_PREFIX}:kerberos`,
    Entity: `${NAMEID_PREFIX}:entity`,
    Persistent: `${NAMEID_PREFIX}:persistent`,
    Transient: `${NAMEID_PREFIX}:transient`
} as const;

export type NameIDFormat = ValueOf<typeof NameIDFormats>;
