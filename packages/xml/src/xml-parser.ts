import { JSDOM } from 'jsdom';

export class XmlParser {
    constructor() {

    }

    static parse(xml: string): Document {
        return new XmlParser().parse(xml);
    }

    parse(xml: string): Document {
        return new JSDOM(xml, { contentType: 'application/xml' }).window.document;
    }
}