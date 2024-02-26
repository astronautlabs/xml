import { ContactPerson } from "./contact-person";
import { Organization } from "./organization";
import { KeyDescriptor } from "./key-descriptor";


export interface RoleDescriptor {
    id?: string;
    validUntil?: string;
    cacheDuration?: string;
    protocolSupportEnumeration: string;
    errorURL?: string;
    signature?: string;
    extensions?: Element;
    keyDescriptors: KeyDescriptor[];
    organization?: Organization;
    contactPeople: ContactPerson[];
}
