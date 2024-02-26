import * as fflate from 'fflate';

export type ValueOf<T> = T extends Record<any, infer U> ? U : never;

export async function deflate(text: string) {
    return new Promise<Uint8Array>((resolve, reject) => {
        let textEncoder = new TextEncoder();
        fflate.deflate(textEncoder.encode(text), (err, data) => {
            if (err)
                reject(err);

            else
                resolve(data);
        });
    });
}

export async function inflate(encoded: Uint8Array) {
    return new Promise<string>((resolve, reject) => {
        let textDecoder = new TextDecoder();
        fflate.inflate(encoded, (err, data) => {
            if (err)
                reject(err);

            else
                resolve(textDecoder.decode(data));
        });
    });
}

export function xmlChildren(element: Element, ns: string, name: string): Element[] {
    return Array.from(element.children).filter(x => x.namespaceURI === ns && x.tagName === name);
}

export function xmlChild(element: Element, ns: string, name: string): Element {
    return xmlChildren(element, ns, name)[0];
}

export function xmlRequiredAttr(element: Element, name: string): string {
    if (!element.hasAttribute(name))
        throw new Error(`Attribute '${name}' is required`);
    return element.getAttribute(name)!;
}

export function xmlOptionalAttr(element: Element, name: string): string | undefined {
    let value = element.getAttribute(name);
    return value === null ? undefined : value;
}

export function xmlRequiredAttrNS(element: Element, ns: string, name: string): string {
    if (!element.hasAttributeNS(ns, name))
        throw new Error(`Attribute '${name}' is required`);
    return element.getAttributeNS(ns, name)!;
}

export function xmlOptionalAttrNS(element: Element, ns: string, name: string): string | undefined {
    let value = element.getAttributeNS(ns, name);
    return value === null ? undefined : value;
}

export function optional<T>(value: T | null): T | undefined {
    return value === null ? undefined : value;
}

export function required<T>(value: T | null | undefined): T {
    if (value === null || value === undefined)
        throw new Error(`Value is required`);

    return value;
}

export function xmlBoolean(value: string): boolean;
export function xmlBoolean(value: string, defaultValue: boolean): boolean;
export function xmlBoolean(value: string | undefined): boolean | undefined;
export function xmlBoolean(value: string | undefined, defaultValue: boolean): boolean;
export function xmlBoolean(value: string | undefined, defaultValue?: boolean): boolean | undefined {
    if (value === undefined)
        return defaultValue;
    return ['true', '1'].includes(value);
}