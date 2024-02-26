import { DomNavigator } from "@astronautlabs/xml";
import { KeyInfo } from "./key-info";
import { XMLNS } from "./xmlns";
import { X509Data, X509IssuerSerial } from "./x509-data";
import { KeyValue } from "./key-value";
import { DSAKeyValue } from "./dsa-key-value";
import { RSAKeyValue } from "./rsa-key-value";
import { PGPData } from "./pgp-data";
import { SPKIData } from "./spki-data";

export class Parser {
    parseKeyInfo(element: Element): KeyInfo {
        return DomNavigator.for(element, n => ({
            x509Data: n.children('X509Data', XMLNS.DS).map(n => this.parseX509Data(n.element)),
            keyNames: n.children('KeyName', XMLNS.DS).map(n => n.text().required()),
            keyValues: n.children('KeyValue', XMLNS.DS).map(n => this.parseKeyValue(n.element)),
            pgpData: n.children('PGPData', XMLNS.DS).map(n => this.parsePGPData(n.element)),
            mgmtData: n.children('MgmtData', XMLNS.DS).map(n => n.text().required()),
            spkiData: n.children('SPKIData', XMLNS.DS).map(n => this.parseSPKIData(n.element))
        }));
    }

    parseSPKIData(element: Element): SPKIData {
        return DomNavigator.for(element, n => ({
            sExprs: n.children('SPKISexp', XMLNS.DS).map(n => n.text().required())
        }));
    }

    parsePGPData(element: Element): PGPData {
        return DomNavigator.for(element, n => ({
            keyId: n.child('PGPKeyID', XMLNS.DS).required().text().required(),
            keyPacket: n.child('PGPKeyPacket', XMLNS.DS).required().text().required()
        }));
    }
    
    parseKeyValue(element: Element): KeyValue {
        let child = DomNavigator.for(element).onlyChild().required();

        if (child.element.tagName === 'DSAKeyValue') 
            return this.parseDSAKeyValue(child.element);
        else if (child.element.tagName === 'RSAKeyValue')
            return this.parseRSAKeyValue(child.element);
        else
            return element;
    }
    
    parseDSAKeyValue(element: Element): DSAKeyValue {
        return DomNavigator.for(element, n => ({
            p: n.child('P').optional()?.text().required(),
            q: n.child('Q').optional()?.text().required(),
            g: n.child('G').optional()?.text().required(),
            y: n.child('Y').required()?.text().required(),
            j: n.child('J').optional()?.text().required(),
            seed: n.child('Seed').optional()?.text().required(),
            pgenCounter: n.child('PgenCounter').optional()?.text().required()
        }));
    }
    
    parseRSAKeyValue(element: Element): RSAKeyValue {
        return DomNavigator.for(element, n => ({
            exponent: n.child('Exponent').required().text().required(),
            modulus: n.child('Modulus').required().text().required(),
        }));
    }

    parseX509Data(element: Element): X509Data {
        return DomNavigator.for(element, n => ({
            issuerSerials: n.children('X509IssuerSerial', XMLNS.DS).map(n => this.parseX509IssuerSerial(n.element)), 
            subjectNames: n.children('X509SubjectName', XMLNS.DS).map(n => n.text().required()),
            subjectKeyIdentifiers: n.children('X509SKI', XMLNS.DS).map(n => n.text().required()),
            certificates: n.children('X509Certificate', XMLNS.DS).map(n => n.text().required()),
            certificateRevocationLists: n.children('X509CRL', XMLNS.DS).map(n => n.text().required()),
            digests: n.children('X509Digest', XMLNS.DSIG11).map(n => n.text().required()),
        }));
    }

    parseX509IssuerSerial(element: Element): X509IssuerSerial {
        return DomNavigator.for(element, n => ({
            issuerName: n.child('X509IssuerName').required().text().required(),
            serialNumber: n.child('X509SerialNumber').required().text().required()
        }));
    }
}