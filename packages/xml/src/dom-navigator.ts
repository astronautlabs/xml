import { Maybe, maybe } from "@astronautlabs/monads";


export class DomNavigator<ElementT extends Element> {
    constructor(readonly element: ElementT) {
    }

    get tagName() {
        return this.element.tagName;
    }
    
    static for<ElementT extends Element>(element: ElementT): DomNavigator<ElementT>;
    static for<ElementT extends Element, T>(element: ElementT, callback: (navigator: DomNavigator<Element>) => T): T;
    static for<ElementT extends Element, T>(element: ElementT, callback?: (navigator: DomNavigator<Element>) => T): DomNavigator<ElementT> | T {
        const navigator = new DomNavigator(element);
        if (callback)
            return callback(navigator);
        return navigator;
    }

    text() {
        return maybe(this.element.textContent);
    }

    requiredText() {
        return this.text().required();
    }

    xml() {
        return maybe(this.element.innerHTML);
    }

    requiredXml() {
        return this.xml().required();
    }

    textChild(name: string, ns?: string) {
        return this.child(name, ns).bind(e => e.text());
    }

    requiredTextChild(name: string, ns?: string) {
        return this.textChild(name, ns).required();
    }

    onlyChild<ElementT extends Element>(): Maybe<DomNavigator<ElementT>> {
        return maybe(this.element.children.item(0)).map(e => new DomNavigator(e as ElementT));
    }

    children<ElementT extends Element>(name: string, ns?: string): DomNavigator<ElementT>[] {
        return Array.from(this.element.children).filter(x => x.tagName === name && (!ns || x.namespaceURI === ns))
            .map(x => new DomNavigator(x as ElementT));
    }

    child<ElementT extends Element>(name: string, ns?: string): Maybe<DomNavigator<ElementT>> {
        return maybe(this.children<ElementT>(name, ns)[0]);
    }

    requiredChild<ElementT extends Element>(name: string, ns?: string): DomNavigator<ElementT> {
        return this.child<ElementT>(name, ns).required();
    }
    
    hasAttribute(name: string, ns?: string): boolean {
        if (ns)
            return this.element.hasAttributeNS(ns, name);
        else
            return this.element.hasAttribute(name);
    }

    attribute(name: string, ns?: string): Maybe<string> {
        if (ns)
            return maybe(this.element.getAttributeNS(ns, name));
        else
            return maybe(this.element.getAttribute(name));
    }

    requiredAttribute(name: string, ns?: string) {
        return this.attribute(name, ns).required();
    }
}