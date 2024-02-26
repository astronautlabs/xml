import { Attribute } from "@astronautlabs/saml-core";
import { Endpoint } from "./endpoint";
import { SSODescriptor } from "./sso-descriptor";

export interface IDPSSODescriptor extends SSODescriptor {
    wantAuthnRequestsSigned?: boolean;
    singleSignOnServices: Endpoint[];
    nameIdMappingServices: Endpoint[];
    assertionIdRequestServices: Endpoint[];
    attributeProfiles: string[];
    attributes: Attribute[];
}
