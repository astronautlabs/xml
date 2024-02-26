import { Binding } from "@astronautlabs/saml-bindings";
import { DomNavigator, XmlValue } from "@astronautlabs/xml";
import { ContactPerson, ContactType } from "./contact-person";
import { Organization } from "./organization";
import { Endpoint } from "./endpoint";
import { EntityDescriptor } from "./entity-descriptor";
import { IDPSSODescriptor } from "./idp-sso-descriptor";
import { IndexedEndpoint } from "./indexed-endpoint";
import { KeyDescriptor } from "./key-descriptor";
import { LocalizedName } from "./localized-name";
import { XMLNS } from "./xmlns";

import * as SAMLCore from '@astronautlabs/saml-core';
import * as XML from '@astronautlabs/xml';
import * as DSIG from '@astronautlabs/xml-signature';
import { LocalizedURI } from "./localized-uri";

export class Parser {
    private samlCore = new SAMLCore.Parser();
    private dsig = new DSIG.Parser();

    parseEntityDescriptor(element: Element): EntityDescriptor {
        return DomNavigator.for(element, n => ({
            entityID: n.attribute('entityID').required(),
            id: n.attribute('ID').optional(),
            validUntil: n.attribute('validUntil').optional(),
            signature: n.child('Signature', DSIG.XMLNS.DS).map(n => n.text().required()).optional(),
            cacheDuration: n.attribute('cacheDuration').optional(),
            idpSSODescriptors: n.children('IDPSSODescriptor', XMLNS.MD).map(x => this.parseIDPSSODescriptor(x.element))
        }));
    }

    parseIDPSSODescriptor(element: Element): IDPSSODescriptor {
        return DomNavigator.for(element, n => ({
            wantAuthnRequestsSigned: XmlValue.parseBoolean(n.attribute('WantAuthnRequestsSigned').optional(), false),
            keyDescriptors: n.children('KeyDescriptor', XMLNS.MD).map(x => this.parseKeyDescriptor(x.element)),
            nameIdFormats: n.children('NameIDFormat', XMLNS.MD).map(x => x.text().required()),
            artifactResolutionServices: n.children('ArtifactResolutionService', XMLNS.MD).map(x => this.parseIndexedEndpoint(x.element)),
            manageNameIDServices: n.children('ManageNameIDService', XMLNS.MD).map(x => this.parseEndpoint(x.element)),
            singleLogoutServices: n.children('SingleLogoutService', XMLNS.MD).map(x => this.parseEndpoint(x.element)),
            singleSignOnServices: n.children('SingleSignOnService', XMLNS.MD).map(x => this.parseEndpoint(x.element)),
            nameIdMappingServices: n.children('NameIDMappingService', XMLNS.MD).map(x => this.parseEndpoint(x.element)),
            attributeProfiles: n.children('AttributeProfile', XMLNS.MD).map(x => x.text().required()),
            assertionIdRequestServices: n.children('AssertionIDRequestService', XMLNS.MD).map(x => this.parseEndpoint(x.element)),
            attributes: n.children('Attribute', SAMLCore.XMLNS.SAML).map(x => this.samlCore.parseAttribute(x.element)),
            protocolSupportEnumeration: n.attribute('protocolSupportEnumeration').required(),
            contactPeople: n.children('ContactPerson').map(n => this.parseContactPerson(n.element)),
            cacheDuration: n.attribute('cacheDuration').optional(),
            id: n.attribute('ID').optional(),
            validUntil: n.attribute('validUntil').optional(),
            errorURL: n.attribute('errorURL').optional(),
            extensions: n.child('Extensions').map(n => n.element).optional(),
            organization: n.child('Organization').map(n => this.parseOrganization(n.element)).optional(),
            signature: n.child('Signature', DSIG.XMLNS.DS).map(n => n.text().required()).optional()
        }));
    }

    parseContactPerson(element: Element): ContactPerson {
        return DomNavigator.for(element, n => ({
            contactType: n.attribute('contactType').required() as ContactType,
            emailAddresses: n.children('EmailAddress', XMLNS.MD).map(n => n.text().required().replace(/^mailto:/, '')),
            telephoneNumbers: n.children('TelephoneNumber', XMLNS.MD).map(n => n.text().required()),
            company: n.child('Company', XMLNS.MD).map(n => n.text().required()).optional(),
            givenName: n.child('GivenName', XMLNS.MD).map(n => n.text().required()).optional(),
            surName: n.child('SurName', XMLNS.MD).map(n => n.text().required()).optional(),
            extensions: n.child('Extensions', XMLNS.MD).map(n => n.element).optional()
        }));
    }

    parseOrganization(element: Element): Organization {
        return DomNavigator.for(element, n => ({
            displayNames: n.children('OrganizationDisplayName', XMLNS.MD).map(n => this.parseLocalizedName(n.element)),
            names: n.children('OrganizationName', XMLNS.MD).map(n => this.parseLocalizedName(n.element)),
            urls: n.children('OrganizationURL', XMLNS.MD).map(n => this.parseLocalizedURI(n.element)),
            extensions: n.child('Extensions').map(n => n.element).optional(),
        }));
    }

    parseLocalizedName(element: Element): LocalizedName {
        return DomNavigator.for(element, n => ({
            lang: n.attribute('lang', XML.XMLNS.XML).required(),
            value: n.text().required()
        }));
    }

    parseLocalizedURI(element: Element): LocalizedURI {
        return DomNavigator.for(element, n => ({
            lang: n.attribute('lang', XML.XMLNS.XML).required(),
            value: n.text().required()
        }));
    }

    parseIndexedEndpoint(element: Element): IndexedEndpoint {
        return DomNavigator.for(element, n => ({
            binding: n.attribute('Binding').required() as Binding,
            location: n.attribute('Location').required(),
            responseLocation: n.attribute('ResponseLocation').optional(),
            index: Number(n.attribute('index').required()),
            isDefault: XmlValue.parseBoolean(n.attribute('isDefault').optional(), false)
        }));
    }

    parseEndpoint(element: Element): Endpoint {
        return DomNavigator.for(element, n => ({
            binding: n.attribute('Binding').required() as Binding,
            location: n.attribute('Location').required(),
            responseLocation: n.attribute('ResponseLocation').optional()
        }));
    }

    parseKeyDescriptor(element: Element): KeyDescriptor {
        return DomNavigator.for(element, n => ({
            use: n.attribute('use').optional() as 'encryption' | 'signing' | undefined,
            keyInfo: n.child('KeyInfo', SAMLCore.XMLNS.DS).map(n => this.dsig.parseKeyInfo(n.element)).required()
        }));
    }
}