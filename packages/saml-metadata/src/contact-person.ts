export type ContactType = 'technical' | 'support' | 'administrative' | 'billing' | 'other';

export interface ContactPerson {
    contactType: ContactType;
    extensions?: Element;
    company?: string;
    givenName?: string;
    surName?: string;
    emailAddresses: string[];
    telephoneNumbers: string[];
}
