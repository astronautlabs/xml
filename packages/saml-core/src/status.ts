import { ValueOf } from "./utils";

export interface SamlStatus {
    code: SamlStatusCode;
    message?: string;
}

export const SAML_STATUS_PREFIX = 'urn:oasis:names:tc:SAML:2.0:status' as const;
export const SamlStatusCodes = {
    Success: `${SAML_STATUS_PREFIX}:Success`,
    Requester: `${SAML_STATUS_PREFIX}:Requester`,
    Responder: `${SAML_STATUS_PREFIX}:Responder`,
    VersionMismatch: `${SAML_STATUS_PREFIX}:VersionMismatch`,
    AuthnFailed: `${SAML_STATUS_PREFIX}:AuthnFailed`,
    InvalidAttrNameOrValue: `${SAML_STATUS_PREFIX}:InvalidAttrNameOrValue`,
    InvalidNameIDPolicy: `${SAML_STATUS_PREFIX}:InvalidNameIDPolicy`,
    NoAuthnContext: `${SAML_STATUS_PREFIX}:NoAuthnContext`,
    NoAvailableIDP: `${SAML_STATUS_PREFIX}:NoAvailableIDP`,
    NoPassive: `${SAML_STATUS_PREFIX}:NoPassive`,
    NoSupportedIDP: `${SAML_STATUS_PREFIX}:NoSupportedIDP`,
    PartialLogout: `${SAML_STATUS_PREFIX}:PartialLogout`,
    ProxyCountExceeded: `${SAML_STATUS_PREFIX}:ProxyCountExceeded`,
    RequestDenied: `${SAML_STATUS_PREFIX}:RequestDenied`,
    RequestUnsupported: `${SAML_STATUS_PREFIX}:RequestUnsupported`,
    RequestVersionDeprecated: `${SAML_STATUS_PREFIX}:RequestVersionDeprecated`,
    RequestVersionTooHigh: `${SAML_STATUS_PREFIX}:RequestVersionTooHigh`,
    RequestVersionTooLow: `${SAML_STATUS_PREFIX}:RequestVersionTooLow`,
    ResourceNotRecognized: `${SAML_STATUS_PREFIX}:ResourceNotRecognized`,
    TooManyResponses: `${SAML_STATUS_PREFIX}:TooManyResponses`,
    UnknownAttrProfile: `${SAML_STATUS_PREFIX}:UnknownAttrProfile`,
    UnknownPrincipal: `${SAML_STATUS_PREFIX}:UnknownPrincipal`,
    UnsupportedBinding: `${SAML_STATUS_PREFIX}:UnsupportedBinding`
} as const;


export type SamlStatusCode = ValueOf<typeof SamlStatusCodes>;
