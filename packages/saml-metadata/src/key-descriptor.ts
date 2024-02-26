import { KeyInfo } from "@astronautlabs/xml-signature";

export interface KeyDescriptor {
    use?: 'signing' | 'encryption';
    keyInfo: KeyInfo;
}
