import { IDPSSODescriptor } from "./idp-sso-descriptor";

export interface EntityDescriptor {
    entityID: string;
    id?: string;
    validUntil?: string;
    cacheDuration?: string;
    signature?: string;
    idpSSODescriptors: IDPSSODescriptor[];
}