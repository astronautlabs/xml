import { Base64 } from '@alterior/common';
import {
    inflate, optional, required, xmlBoolean, xmlChild, xmlChildren, xmlOptionalAttr,
    xmlOptionalAttrNS, xmlRequiredAttr
} from "./utils";
import { Assertion } from "./assertion";
import { Attribute } from "./attribute";
import { AttributeStatement } from "./attribute-statement";
import { AuthnContext } from "./authn-context";
import { AuthnStatement } from "./authn-statement";
import { Conditions } from "./conditions";
import { Response } from "./response";
import { SamlStatus, SamlStatusCode } from "./status";
import { Subject } from "./subject";
import { SubjectConfirmation } from "./subject-confirmation";
import { SubjectConfirmationData } from "./subject-confirmation-data";
import { XmlValue, XmlParser } from "@astronautlabs/xml";
import { XMLNS } from "./xmlns";

import * as XML from '@astronautlabs/xml';
import * as DSIG from '@astronautlabs/xml-signature';

export class Parser {
    static async parseResponse(encodedSamlResponse: string): Promise<Response> {
        let decodedResponse = await inflate(Base64.decodeBytes(encodedSamlResponse));
        return this.parseResponse(decodedResponse);
    }

    static parseResponseFromXml(samlResponseXML: string): Response {
        return new Parser().parseResponse(XmlParser.parse(samlResponseXML).documentElement);
    }

    parseResponse(element: Element): Response {
        if (element.namespaceURI !== XMLNS.SAMLP) {
            throw new Error(`Invalid SAML response`);
        }

        let statusEl = xmlChild(element, XMLNS.SAMLP, 'Status');
        if (!statusEl)
            throw new Error(`Invalid SAML response: Missing <samlp:Status>`);
        let status: SamlStatus = {
            code: <SamlStatusCode>xmlChild(statusEl, XMLNS.SAMLP, 'StatusCode')?.getAttribute('Value'),
            message: optional(xmlChild(statusEl, XMLNS.SAMLP, 'StatusMessage')?.textContent)
        };

        let issuerEl = xmlChild(element, XMLNS.SAML, 'Issuer');
        let signatureEl = xmlChild(element, XMLNS.DS, 'Signature');
        let assertionsEl = Array.from(xmlChildren(element, XMLNS.SAMLP, 'Assertion'));

        return {
            id: xmlRequiredAttr(element, 'ID'),
            inResponseTo: xmlOptionalAttr(element, 'InResponseTo'),
            version: xmlRequiredAttr(element, 'Version'),
            issueInstant: xmlRequiredAttr(element, 'IssueInstant'),
            destination: xmlOptionalAttr(element, 'Destination'),
            consent: xmlOptionalAttr(element, 'Consent'),
            signature: optional(signatureEl.textContent),
            issuer: optional(issuerEl?.textContent),
            status,
            assertions: assertionsEl.map(x => this.parseAssertion(x))
        };
    }

    parseAssertion(element: Element): Assertion {
        return {
            id: xmlRequiredAttr(element, 'ID'),
            version: xmlRequiredAttr(element, 'Version'),
            issueInstant: xmlRequiredAttr(element, 'IssueInstant'),
            issuer: required(xmlChild(element, XMLNS.SAML, 'Issuer')?.textContent),
            signature: optional(xmlChild(element, DSIG.XMLNS.DS, 'Signature')?.textContent),
            subject: this.parseSubject(xmlChild(element, XMLNS.SAML, 'Subject')),
            conditions: this.parseConditions(xmlChild(element, XMLNS.SAML, 'Conditions')),
            authnStatements: xmlChildren(element, XMLNS.SAML, 'AuthnStatement').map(x => this.parseAuthnStatement(x)),
            attributeStatements: xmlChildren(element, XMLNS.SAML, 'AttributeStatement').map(x => this.parseAttributeStatement(x))
        };
    }

    parseAttributeStatement(element: Element): AttributeStatement {
        return {
            attributes: xmlChildren(element, XMLNS.SAML, 'Attribute').map(x => this.parseAttribute(element))
        };
    }

    parseAttribute(element: Element): Attribute {
        return {
            name: xmlRequiredAttr(element, 'Name'),
            encoding: xmlOptionalAttrNS(element, XMLNS.X500, 'Encoding'),
            nameFormat: xmlOptionalAttr(element, 'NameFormat'),
            friendlyName: xmlOptionalAttr(element, 'FriendlyName'),
            values: xmlChildren(element, XMLNS.SAML, 'AttributeValue').map(x => this.parseAttributeValue(x))
        };
    }

    parseAttributeValue(element: Element): any {
        if (!element)
            return undefined;

        let n = XML.DomNavigator.for(element);

        let type = n.attribute('type', XML.XMLNS.XSI).optional();
        if (!type)
            return n.text().optional();

        return XmlValue.parse(type, n.text().required());
    }

    parseAuthnStatement(element: Element): AuthnStatement {
        return {
            instant: xmlRequiredAttr(element, 'AuthnInstant'),
            sessionIndex: xmlOptionalAttr(element, 'SessionIndex'),
            sessionNotOnOrAfter: xmlOptionalAttr(element, 'SessionNotOnOrAfter'),
            context: this.parseAuthnContext(xmlChild(element, XMLNS.SAML, 'AuthnContext'))
        };
    }

    parseAuthnContext(element: Element): AuthnContext {
        return {
            classRef: optional(xmlChild(element, XMLNS.SAML, 'AuthnContextClassRef')?.textContent)
        };
    }

    parseConditions(element: Element): Conditions | undefined {
        if (!element)
            return undefined;

        return {
            notBefore: xmlOptionalAttr(element, 'NotBefore'),
            notOnOrAfter: xmlOptionalAttr(element, 'NotOnOrAfter'),
            oneTimeUse: !!xmlChild(element, XMLNS.SAML, 'OneTimeUse'),
            audiences: this.parseAudienceRestriction(xmlChild(element, XMLNS.SAML, 'AudienceRestriction'))
        };
    }

    parseAudienceRestriction(element: Element): string[] {
        if (!element)
            return [];

        return xmlChildren(element, XMLNS.SAML, 'Audience').map(x => x.textContent!).filter(x => x);
    }

    parseSubject(element: Element): Subject | undefined {
        if (!element)
            return undefined;

        return {
            nameId: optional(xmlChild(element, XMLNS.SAML, 'NameID')?.textContent),
            confirmations: xmlChildren(element, XMLNS.SAML, 'SubjectConfirmation').map(x => this.parseSubjectConfirmation(x))
        };
    }

    parseSubjectConfirmation(element: Element): SubjectConfirmation {
        return {
            method: xmlRequiredAttr(element, 'Method'),
            nameId: optional(xmlChild(element, XMLNS.SAML, 'NameID')?.textContent),
            data: this.parseSubjectConfirmationData(xmlChild(element, XMLNS.SAML, 'SubjectConfirmationData'))
        };
    }

    parseSubjectConfirmationData(element: Element): SubjectConfirmationData | undefined {
        return {
            inResponseTo: xmlOptionalAttr(element, 'InResponseTo'),
            recipient: xmlOptionalAttr(element, 'Recipient'),
            notBefore: xmlOptionalAttr(element, 'NotBefore'),
            notOnOrAfter: xmlOptionalAttr(element, 'NotOnOrAfter'),
            address: xmlOptionalAttr(element, 'Address')
        };
    }

}