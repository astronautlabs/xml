import { DomNavigator, XmlParser, XmlValue } from "@astronautlabs/xml";
import { Annotation } from "./annotation";
import { AttributeDeclaration } from "./attribute-declaration";
import { ComplexTypeDefinition } from "./complex-type-definition";
import { ContentType, ContentTypes, ElementOnlyContentType, EmptyContentType, MixedContentType } from "./content-type";
import { ElementDeclaration } from "./element-declaration";
import { Facet, WhiteSpaceFacet } from "./facets";
import { ModelGroup } from "./model-group";
import { Particle, Particles } from "./particle";
import { Schema } from "./schema";
import { SimpleAtomicTypeDefinition, SimpleListTypeDefinition, SimpleTypeDefinition, SimpleTypes, SimpleUnionTypeDefinition } from "./simple-type-definition";
import { TypeAlternative } from "./type-alternative";
import { TypeDefinition } from "./type-definition";
import { QName, TypeRegistry, Types, isQName } from "./type-registry";
import { Wildcard } from "./wildcard";
import { XMLNS } from "./xmlns";
import { ModelGroupDefinition } from "./model-group-definition";
import { Term } from "./term";
import { ValueConstraint } from "./value-constraint";
import { AttributeGroupDefinition } from "./attribute-group-definition";
import { NamespaceConstraint } from "./namespace-constraint";
import { AttributeUse } from "./attribute-use";
import { NotationDeclaration } from "./notation-declaration";
import { IdentityConstraintDefinition } from "./identity-constraint-definition";
import { Scope } from "./scope";
import { XPathExpression } from "./xpath-expression";
import { NamespaceBinding } from "./namespace-binding";

/**
 * A parser which can create a `Schema` object from an XML document which represents an XML Schema Definition (XSD)
 */
export class Parser {
    constructor(readonly schemaElement: Element) {

    }

    readonly types = new TypeRegistry();

    static async parseSchemaFromXml(schemaXML: string): Promise<Schema> {
        return new Parser(XmlParser.parse(schemaXML).documentElement).parse();
    }

    private schemaContext: Schema | undefined;

    parse(): Schema {
        const schema: Schema = {
            annotations: [],
            attributeDeclarations: [],
            attributeGroupDefinitions: [],
            elementDeclarations: [],
            identityConstraintDefinitions: [],
            modelGroupDefinitions: [],
            notationDeclarations: [],
            typeDefinitions: []
        };

        let previousContext = this.schemaContext;
        this.schemaContext = schema;

        try {

            for (let child of Array.from(this.schemaElement.children)) {
                let qualifiedName = `${child.namespaceURI}:${child.tagName}`;
                switch (qualifiedName) {
                    case `${XMLNS.XS}:annotation`:
                        schema.annotations.push(this.parseAnnotation(child));
                        break;
                    case `${XMLNS.XS}:complexType`:
                        schema.typeDefinitions.push(this.parseComplexType(child));
                        break;
                    case `${XMLNS.XS}:simpleType`:
                        schema.typeDefinitions.push(this.parseSimpleType(child, undefined));
                        break;
                    case `${XMLNS.XS}:group`:
                        schema.modelGroupDefinitions.push(this.parseModelGroupDefinition(child));
                        break;
                    case `${XMLNS.XS}:attributeGroup`:
                        schema.attributeGroupDefinitions.push(this.parseAttributeGroupDefinition(child));
                        break;
                    case `${XMLNS.XS}:element`:
                        schema.elementDeclarations.push(this.parseTopLevelElementDeclaration(child));
                        break;
                    case `${XMLNS.XS}:attribute`:
                        schema.attributeDeclarations.push(this.parseGlobalAttributeDeclaration(child));
                        break;
                    case `${XMLNS.XS}:notation`:
                        schema.notationDeclarations.push(this.parseNotationDeclaration(child));
                        break;
                    case `${XMLNS.XS}:key`:
                    case `${XMLNS.XS}:keyref`:
                    case `${XMLNS.XS}:unique`:
                        schema.identityConstraintDefinitions.push(this.parseIdentityConstraintDefinition(child));
                        break;
                }
            }
        } finally {
            this.schemaContext = previousContext;
        }

        return schema;
    }

    private parseIdentityConstraintDefinition(element: Element): IdentityConstraintDefinition {
        let n = new DomNavigator(element);

        if (element.hasAttribute('ref')) {
            let refName = n.attribute('refer').required();
            let ref = this.schemaContext?.identityConstraintDefinitions.find(x => x.name === refName);
            if (!ref)
                throw new Error(`Could not locate identity constraint named '${refName}'`);

            return ref;
        }

        return {
            name: n.attribute('name').required(),
            targetNamespace: this.schemaTargetNamespaceOf(element),
            identityConstraintCategory: element.tagName as any,
            selector: this.parseXPathExpression(n.child('selector').required().element, 'xpath'),
            fields: n.children('field').map(field => this.parseXPathExpression(field.element, 'xpath')),
            referencedKey: element.tagName === 'keyref' 
                ? this.schemaContext?.identityConstraintDefinitions.find(x => x.name === n.attribute('refer').required())
                : undefined,
            annotations: this.parseAnnotationsOf(n)
        }
    }

    private parseXPathExpression(element: Element, attribute: string): XPathExpression {
        let schemaElement = element.closest('schema');
        let n = new DomNavigator(element);
        let defaultNamespace = n.attribute('xpathDefaultNamespace').optional() 
            ?? (schemaElement?.getAttribute('xpathDefaultNamespace') || undefined);
        let namespaceBindings = this.getBindingsFromElement(element);

        if (defaultNamespace === '##defaultNamespace') {
            defaultNamespace = namespaceBindings.find(x => x.prefix === '')?.namespace;
        } else if (defaultNamespace === '##targetNamespace') {
            defaultNamespace = this.schemaTargetNamespaceOf(element);
        } else if (defaultNamespace === '##local') {
            defaultNamespace = undefined;
        }

        return {
            namespaceBindings,
            defaultNamespace,
            baseURI: element.baseURI,
            expression: n.attribute(attribute).required()
        }
    }

    private getBindingsFromElement(element: Element, bindings: Record<string, string> = {}) {
        Array.from(element.attributes)
            .filter(x => x.name.startsWith('xmlns:') || x.name === 'xmlns')
            .map(attr => [attr.name.replace(/^xmlns:?/, ''), attr.value])
            .forEach(([ prefix, uri ]) => {
                if (!(prefix in bindings)) {
                    bindings[prefix] = uri;
                }
            });

        if (element.parentElement !== null)
            this.getBindingsFromElement(element.parentElement, bindings);

        return Object.entries(bindings).map(([ prefix, namespace ]) => <NamespaceBinding>{ prefix, namespace });
    }

    private parseNotationDeclaration(element: Element): NotationDeclaration {
        let n = new DomNavigator(element);
        return {
            name: n.attribute('name').required(),
            targetNamespace: this.schemaTargetNamespaceOf(element),
            systemIdentifier: n.attribute('system').optional(),
            publicIdentifier: n.attribute('public').optional(),
            annotations: this.parseAnnotationsOf(n)
        }
    }

    private schemaTargetNamespaceOf(element: Element): string | undefined {
        return element.closest('schema')?.getAttribute('targetNamespace') || undefined;
    }

    private parseAttributeGroupDefinition(element: Element): AttributeGroupDefinition {
        let n = new DomNavigator(element);
        let attributeGroups = n.children('attributeGroup').map(x => this.parseAttributeGroupDefinition(x.element));
        let defn: AttributeGroupDefinition = <any>{};

        Object.assign(defn, {
            name: n.attribute('name').required(),
            targetNamespace: this.schemaTargetNamespaceOf(element),
            attributeUses: n.children('attribute').map(e => this.parseAttributeUse(e.element, defn)),
            attributeWildcard: this.parseAttributeWildcard(element, attributeGroups),
            annotations: this.parseAnnotationsOf(n)
        });

        return defn;
    }

    private parseAttributeUse(element: Element, parent: AttributeGroupDefinition | ComplexTypeDefinition): AttributeUse | undefined {
        let n = new DomNavigator(element);
        const use = n.attribute('use').optional() ?? 'optional';
        const inheritable = this.parseBoolean(n.attribute('inheritable').optional(), false, element);

        if (use === 'prohibited')
            return undefined;

        if (n.hasAttribute('ref')) {
            if (!this.schemaContext)
                throw new Error(`Not in a schema context`);

            let ref = this.parseQName(n.attribute('ref').required(), element);
            let attributeDeclaration = this.schemaContext.attributeDeclarations.find(x => x.targetNamespace === ref.namespaceName && x.name === ref.localPart);

            if (!attributeDeclaration)
                throw new Error(`Failed to locate attribute declaration ${ref.localPart} in namespace '${ref.namespaceName}'`);

            return {
                required: use === 'required',
                prohibited: use === 'prohibited',
                valueConstraint: this.parseValueConstraintOf(element, attributeDeclaration.typeDefinition),
                attributeDeclaration,
                inheritable,
                annotations: this.parseAnnotationsOf(n)
            };
        }

        let attributeDeclaration = this.parseLocalAttributeDeclaration(element, parent);

        return {
            required: n.attribute('use').optional() === 'required',
            prohibited: n.attribute('use').optional() === 'prohibited',
            attributeDeclaration,
            valueConstraint: this.parseValueConstraintOf(element, attributeDeclaration.typeDefinition),
            inheritable,
            annotations: this.parseAnnotationsOf(n)
        };
    }

    private parseAttributeWildcard(element: Element, attributeGroups: AttributeGroupDefinition[]): Wildcard | undefined {
        let wildcards = compact(attributeGroups.map(g => g.attributeWildcard));
        let localWildcard: Wildcard | undefined;
        let n = new DomNavigator(element);
        let anyAttribute = n.child('anyAttribute').optional();
        if (anyAttribute) {
            localWildcard = this.parseWildcard(anyAttribute.element);
        }

        if (wildcards.length === 0)
            return localWildcard;

        if (localWildcard) {
            return {
                type: 'wildcard',
                processContents: localWildcard.processContents,
                annotations: localWildcard.annotations,
                namespaceConstraint: this.attributeWildcardIntersectAll([
                    localWildcard.namespaceConstraint,
                    ...wildcards.map(x => x.namespaceConstraint)
                ])
            };
        } else {
            return {
                type: 'wildcard',
                processContents: wildcards[0].processContents,
                namespaceConstraint: this.attributeWildcardIntersectAll(wildcards.map(x => x.namespaceConstraint)),
                annotations: []
            };
        }
    }

    private sameSet(a: any[], b: any[]) {
        return a.every(e => b.includes(e)) && b.every(e => a.includes(e));
    }

    private intersection<T>(a: T[], b: T[]): T[] {
        return a.filter(e => b.includes(e));
    }

    private union<T>(a: T[], b: T[]): T[] {
        return [...a.filter(e => !b.includes(e)), ...b.filter(e => !a.includes(e))];
    }

    private difference<T>(a: T[], b: T[]): T[] {
        return a.filter(e => !b.includes(e));
    }

    private attributeWildcardIntersectAll(o: NamespaceConstraint[]): NamespaceConstraint {
        if (o.length === 0)
            throw new Error(`At least one namespace constraint is required`);

        if (o.length === 1)
            return o[0];

        let result = o.shift()!;
        for (let constraint of o)
            result = this.attributeWildcardIntersect(result, constraint);

        return result;
    }

    private attributeWildcardUnionAll(o: NamespaceConstraint[]): NamespaceConstraint {
        if (o.length === 0)
            throw new Error(`At least one namespace constraint is required`);

        if (o.length === 1)
            return o[0];

        let result = o.shift()!;
        for (let constraint of o)
            result = this.attributeWildcardUnion(result, constraint);

        return result;
    }

    private attributeWildcardUnion(o1: NamespaceConstraint, o2: NamespaceConstraint): NamespaceConstraint {
        let variety: 'any' | 'enumeration' | 'not' = 'any';
        let namespaces: (string | undefined)[] = [];
        let disallowedNames = new Set<(QName | "defined" | "sibling")>();

        if (o1.variety === o2.variety && this.sameSet(o1.namespaces, o2.namespaces)) {
            variety = o1.variety;
            namespaces = o1.namespaces;
        } else if (o1.variety === 'any') {
            variety = o2.variety;
            namespaces = o2.namespaces;
        } else if (o2.variety === 'any') {
            variety = o1.variety;
            namespaces = o1.namespaces;
        } else if (o1.variety === o2.variety && o1.variety === 'enumeration') {
            variety = o1.variety;
            namespaces = this.union(o1.namespaces, o2.namespaces);
        } else if (o1.variety === o2.variety && o1.variety === 'not') {
            namespaces = this.intersection(o1.namespaces, o2.namespaces);
            variety = namespaces.length === 0 ? 'any' : 'not';
        } else if (o1.variety === 'not' && o2.variety === 'enumeration') {
            namespaces = this.difference(o1.namespaces, o2.namespaces);
            variety = namespaces.length === 0 ? 'any' : 'not';
        } else if (o2.variety === 'not' && o1.variety === 'enumeration') {
            namespaces = this.difference(o2.namespaces, o1.namespaces);
            variety = namespaces.length === 0 ? 'any' : 'not';
        }

        if (o1.disallowedNames.includes('defined') && o2.disallowedNames.includes('defined'))
            disallowedNames.add('defined');

        let o1QNames = o1.disallowedNames.filter(x => isQName(x)) as QName[];
        let o2QNames = o2.disallowedNames.filter(x => isQName(x)) as QName[];

        o1QNames.filter(x => !this.wildcardAllowsExpandedName(o2, x)).forEach(v => disallowedNames.add(v));
        o2QNames.filter(x => !this.wildcardAllowsExpandedName(o1, x)).forEach(v => disallowedNames.add(v));

        return {
            variety,
            namespaces,
            disallowedNames: Array.from(disallowedNames.values())
        }
    }

    private attributeWildcardIntersect(o1: NamespaceConstraint, o2: NamespaceConstraint): NamespaceConstraint {
        let variety: 'any' | 'enumeration' | 'not' = 'any';
        let namespaces: (string | undefined)[] = [];
        let disallowedNames = new Set<(QName | "defined" | "sibling")>();

        if (o1.variety === o2.variety && this.sameSet(o1.namespaces, o2.namespaces)) {
            variety = o1.variety;
            namespaces = o1.namespaces;
        } else if (o1.variety === 'any') {
            variety = o2.variety;
            namespaces = o2.namespaces;
        } else if (o2.variety === 'any') {
            variety = o1.variety;
            namespaces = o1.namespaces;
        } else if (o1.variety === o2.variety && o1.variety === 'enumeration') {
            variety = o1.variety;
            namespaces = this.intersection(o1.namespaces, o2.namespaces);
        } else if (o1.variety === o2.variety && o1.variety === 'not') {
            variety = o1.variety;
            namespaces = this.union(o1.namespaces, o2.namespaces);
        } else if (o1.variety === 'not' && o2.variety === 'enumeration') {
            variety = 'enumeration';
            namespaces = this.difference(o2.namespaces, o1.namespaces);
        } else if (o2.variety === 'not' && o1.variety === 'enumeration') {
            variety = 'enumeration';
            namespaces = this.difference(o1.namespaces, o2.namespaces);
        }

        if (o1.disallowedNames.includes('defined') || o2.disallowedNames.includes('defined'))
            disallowedNames.add('defined');

        let o1QNames = o1.disallowedNames.filter(x => isQName(x)) as QName[];
        let o2QNames = o2.disallowedNames.filter(x => isQName(x)) as QName[];

        o1QNames.filter(x => this.wildcardAllowsNamespaceName(o2, x.namespaceName)).forEach(v => disallowedNames.add(v));
        o2QNames.filter(x => this.wildcardAllowsNamespaceName(o1, x.namespaceName)).forEach(v => disallowedNames.add(v));

        return {
            variety,
            namespaces,
            disallowedNames: Array.from(disallowedNames.values())
        }
    }

    private qNamesEqual(a: QName, b: QName) {
        if (!isQName(a) || !isQName(b))
            return false;

        return a.localPart === b.localPart && a.namespaceName === b.namespaceName;
    }

    private wildcardAllowsExpandedName(constraint: NamespaceConstraint, name: QName): boolean {
        return this.wildcardAllowsNamespaceName(constraint, name.namespaceName) 
            && !constraint.disallowedNames.some(x => this.qNamesEqual(name, x as QName));
    }

    private wildcardAllowsNamespaceName(constraint: NamespaceConstraint, namespaceName: string | undefined): boolean {
        if (constraint.variety === 'any')
            return true;
        if (constraint.variety === 'not')
            return !constraint.namespaces.includes(namespaceName);
        if (constraint.variety === 'enumeration')
            return constraint.namespaces.includes(namespaceName);

        throw new Error(`Invalid namespace constraint variety '${constraint.variety}'`);
    }

    private parseModelGroupDefinition(element: Element): ModelGroupDefinition {
        let n = new DomNavigator(element);

        let defn: ModelGroupDefinition = <any>{};

        Object.assign(defn, {
            name: n.attribute('name').required(),
            targetNamespace: this.schemaTargetNamespaceOf(element),
            modelGroup: this.parseModelGroup(element, defn)
        });

        return defn;
    }

    private parseParticle(element: Element, parent: ModelGroupDefinition | ComplexTypeDefinition): Particle {
        let term: Term;
        let n = new DomNavigator(element);

        if (['all', 'choice', 'sequence'].includes(element.tagName))
            term = this.parseModelGroup(element, parent);
        else if (element.tagName === 'element')
            term = this.parseElementDeclaration(element, { variety: 'local', parent });
        else if (element.tagName === 'group')
            term = this.parseModelGroupDefinition(element).modelGroup;
        else if (element.tagName === 'any')
            term = this.parseWildcard(element);
        else if (element.tagName === 'anyAttribute')
            term = this.parseWildcard(element);
        else
            throw new Error(`Unsupported particle tag <${element.tagName}>`);

        return {
            minOccurs: n.attribute('minOccurs').map(s => Number(s)).optional() ?? 1,
            maxOccurs: n.attribute('maxOccurs').map(s => s === 'unbounded' ? s : Number(s)).optional() ?? 1,
            term,
            annotations: term.annotations
        }
    }

    private parseWildcard(element: Element): Wildcard {
        let n = new DomNavigator(element);
        let namespace = n.attribute('namespace').optional();
        let notNamespace = n.attribute('notNamespace').optional();
        let namespaces: (string | undefined)[];
        let variety: string;
        const schemaTargetNamespace = this.schemaTargetNamespaceOf(element);

        if (namespace) {
            if (namespace === '##any') {
                variety = 'any';

            } else if (namespace === '##other') {
                variety = 'not';
            }
        } else if (notNamespace) {
            variety = 'not';
        } else {
            variety = 'any';
            namespaces = [];
        }

        if (!namespace && !notNamespace) {
            namespaces = [];
        } else if (namespace === '##any') {
            namespaces = [];
        } else if (namespace === '##other') {
            namespaces = [undefined];
            if (schemaTargetNamespace)
                namespaces.push(schemaTargetNamespace);
        } else {
            namespaces = this.parseValueForSimpleType((namespace ?? notNamespace)!, this.types.listOf(`${XMLNS.XS}:anyURI`), element);
            namespaces = namespaces.map(ns => {
                if (ns === '##targetNamespace') {
                    return schemaTargetNamespace;
                } else if (ns === '##local') {
                    return undefined;
                }
                return ns;
            });
        }

        let disallowedNames: (QName | 'defined' | 'sibling')[] = [];

        if (n.hasAttribute('notQName')) {
            let values = <(QName | '##defined' | '##definedSibling')[]>this.parseValueForSimpleType(n.attribute('notQName').required(), this.types.listOf(
                this.types.unionOf([
                    this.types.simpleEnumeration(['##defined', '##definedSibling']),
                    this.types.requireSimple('QName', XMLNS.XS)
                ])
            ), element);

            disallowedNames = values.map(v => {
                if (v === '##defined')
                    return 'defined';
                if (v === '##definedSibling')
                    return 'sibling';
                return v;
            });
        }

        return {
            type: 'wildcard',
            namespaceConstraint: {
                variety: namespace ? (namespace === '##any' ? 'any' : namespace === '##other' ? 'not' : 'enumeration')
                    : notNamespace ? 'not' : 'any',
                namespaces,
                disallowedNames
            },
            processContents: <"strict" | "skip" | "lax">n.attribute('processContents').optional() ?? 'strict',
            annotations: this.parseAnnotationsOf(n)
        };
    }

    private parseModelGroup(element: Element, parent: ModelGroupDefinition | ComplexTypeDefinition): ModelGroup {
        return {
            type: 'modelGroup',
            compositor: element.tagName as any,
            particles: Array.from(element.children)
                .filter(e => e.tagName !== 'annotation')
                .map(e => this.parseParticle(e, parent)),
            annotations: this.parseAnnotationsOf(new DomNavigator(element))
        };
    }

    private elementDeclarationContext?: ElementDeclaration;
    private withElementDeclarationContext<T>(decl: ElementDeclaration, callback: () => T) {
        let previous = this.elementDeclarationContext;
        this.elementDeclarationContext = decl;
        try {
            return callback();
        } finally {
            this.elementDeclarationContext = previous;
        }
    }

    /**
     * Returns an array of all facets found on the given type including all base types, in order from most specific to
     * least specific.
     * @param simpleType 
     */
    private getAllFacetsOfType(simpleType: SimpleTypeDefinition): Facet[] {
        return [...simpleType.facets, ...simpleType.baseType !== simpleType && Types.isSimple(simpleType.baseType) ? this.getAllFacetsOfType(simpleType.baseType) : []];
    }

    private normalizeValueForSimpleType(value: string, simpleType: SimpleTypeDefinition) {
        let facets = this.getAllFacetsOfType(simpleType);
        let whiteSpace = facets.find(x => x.type === 'whiteSpace') as WhiteSpaceFacet;
        if (whiteSpace?.value !== 'preserve') {
            value = value.replace(/[\t\r\n]/g, ' ');
        }

        if (whiteSpace?.value === 'collapse') {
            value = value.replace(/ +/g, ' ');
        }

        return value;
    }

    private parseValueForAnySimpleType(value: string, contextElement: Element | undefined) {
        return this.parseValueForSimpleType(value, this.types.anySimpleType, contextElement);
    }

    /**
     * 
     * @param value 
     * @param simpleType 
     * @param contextElement The context element, if any. This is important when resolving namespace-qualified names (QNames)
     * @returns 
     */
    private parseValueForSimpleType(value: string, simpleType: SimpleTypeDefinition, contextElement: Element | undefined): any {
        let normalizedValue = this.normalizeValueForSimpleType(value, simpleType);

        if (simpleType === this.types.anySimpleType) {
            for (let option of this.types.getAllNonSpecialSimpleTypes()) {
                let value = this.parseValueForSimpleType(normalizedValue, option, contextElement);
                if (this.validateValueForSimpleType(value, option, contextElement) === true)
                    return value;
            }
        }

        if (SimpleTypes.isAtomic(simpleType)) {
            return simpleType.primitiveType.parseValue(normalizedValue, contextElement);
        } else if (SimpleTypes.isList(simpleType)) {
            return normalizedValue.split(' ').map(item => this.parseValueForSimpleType(item, simpleType.itemType, contextElement));
        } else if (SimpleTypes.isUnion(simpleType)) {
            for (let option of simpleType.memberTypes) {
                let value = this.parseValueForSimpleType(normalizedValue, option, contextElement);
                if (this.validateValueForSimpleType(value, option, contextElement) === true)
                    return value;
            }

            throw new Error(`Value '${normalizedValue}' does not adhere to any member type of union '${simpleType.name ?? '<anonymous union>'}'`);
        }
    }

    private validateValueForSimpleType(value: string, simpleType: SimpleTypeDefinition, contextElement: Element | undefined): string | true {
        let actualValue = this.parseValueForSimpleType(value, simpleType, contextElement);
        let facets = this.getAllFacetsOfType(simpleType).reverse();

        for (let facet of facets) {
            switch (facet.type) {
                case 'assertions':
                    // TODO
                    break;
                case 'enumeration': if (!facet.value.includes(actualValue)) return `Value must be one of the following: ${facet.value.join(', ')}`; break;
                case 'explicitTimezone':
                    if (facet.value === 'prohibited') {
                        // TODO
                    } else if (facet.value === 'required') {
                        // TODO
                    }
                    break;
                case 'fractionDigits': if (String(actualValue).replace(/^.*\./, '').length > facet.value) return `Value contains more than the allowed number of fractional digits of ${facet.value}`; break;
                case 'length': if (actualValue.length !== facet.value) return `Value's length must be exactly ${facet.value}`; break;
                case 'maxExclusive': if (actualValue >= facet.value) return `Value must be less than ${facet.value}`; break;
                case 'maxInclusive': if (actualValue > facet.value) return `Value must be less than or equal to ${facet.value}`; break;
                case 'maxLength': if (actualValue.length > facet.value) return `Value's length must be no more than ${facet.value}`; break;
                case 'minExclusive': if (actualValue <= facet.value) return `Value must be greater than ${facet.value}`; break;
                case 'minInclusive': if (actualValue < facet.value) return `Value must be greater than or equal to ${facet.value}`; break;
                case 'minLength': if (actualValue.length < facet.value) return `Value's length must be at least ${facet.value}`; break;
                case 'pattern':
                    for (let pattern of facet.value) {
                        if (!new RegExp(pattern).test(actualValue)) {
                            return `Value must match pattern '${pattern}'`;
                        }
                    }
                    break;
                case 'totalDigits': if (String(actualValue).replace(/\./, '').length > facet.value) return `Value '${actualValue}' contains more than the total allowed number of digits of ${facet.value}`;
                case 'whiteSpace':      /* Non-constraining facet. No validation to perform. */ break;
                default:
                    facet satisfies never;
            }
        }

        return true;
    }

    private parseGlobalAttributeDeclaration(element: Element): AttributeDeclaration {
        let n = new DomNavigator(element);
        let decl: AttributeDeclaration = <any>{};
        let typeDefinition = n.child('simpleType').map(e => this.parseSimpleType(e.element, decl)).optional()
            ?? n.attribute('type').map(t => this.resolveSimpleTypeByName(t, element)).optional()
            ?? this.types.anySimpleType
            ;

        Object.assign(decl, <AttributeDeclaration>{
            name: n.attribute('name').required(),
            targetNamespace: this.schemaTargetNamespaceOf(element),
            typeDefinition,
            scope: {
                variety: 'global',
                parent: undefined
            },
            valueConstraint: this.parseValueConstraintOf(element, typeDefinition),
            inheritable: this.parseBoolean(n.attribute('inheritable').optional(), false, element),
            annotations: this.parseAnnotationsOf(n)
        });

        return decl;
    }

    private parseLocalAttributeDeclaration(element: Element, parent: AttributeGroupDefinition | ComplexTypeDefinition): AttributeDeclaration {
        let n = new DomNavigator(element);
        let schemaElement = element.closest('schema');
        let decl: AttributeDeclaration = <any>{};
        let typeDefinition = n.child('simpleType').map(e => this.parseSimpleType(e.element, decl)).optional()
            ?? n.attribute('type').map(t => this.resolveSimpleTypeByName(t, element)).optional()
            ?? this.types.anySimpleType
            ;

        let form = n.attribute('form').optional();
        let attributeFormDefault = schemaElement?.getAttribute('attributeFormDefault');

        Object.assign(decl, <AttributeDeclaration>{
            name: n.attribute('name').required(),
            targetNamespace: n.attribute('targetNamespace').optional()
                ?? (form ?? attributeFormDefault) === 'qualified'
                ? this.schemaTargetNamespaceOf(element)
                : undefined,
            typeDefinition,
            scope: {
                variety: 'local',
                parent
            },
            valueConstraint: undefined,
            inheritable: this.parseBoolean(n.attribute('inheritable').optional(), false, element),
            annotations: this.parseAnnotationsOf(n)
        });

        return decl;
    }

    private parseValueConstraintOf(element: Element, type: SimpleTypeDefinition): ValueConstraint | undefined {
        let n = new DomNavigator(element);
        let defaultAttr = n.attribute('default').optional();
        let fixedAttr = n.attribute('fixed').optional();
        let constraintAttr = defaultAttr ?? fixedAttr;
        return constraintAttr ? {
            variety: defaultAttr ? 'default' : 'fixed',
            lexicalForm: this.normalizeValueForSimpleType(constraintAttr, type),
            value: this.parseValueForSimpleType(constraintAttr, type, element)
        } : undefined;

    }

    private parseTopLevelElementDeclaration(element: Element): ElementDeclaration {
        let decl = this.parseElementDeclaration(element, { variety: 'global' });
        decl.targetNamespace = this.schemaTargetNamespaceOf(element);

        return decl;
    }

    private parseElementDeclaration(element: Element, scope: Scope<ComplexTypeDefinition | ModelGroupDefinition>): ElementDeclaration {
        const n = DomNavigator.for(element);

        let decl: ElementDeclaration = {
            type: 'elementDeclaration',
            name: n.attribute('name').required(),
            targetNamespace: undefined, // see below
            scope,
            typeDefinition: <any>undefined, // see below
            typeTable: undefined, // see below
            nillable: XmlValue.parseBoolean(n.attribute('nillable').or(() => 'false').required()),
            valueConstraint: undefined, // see below
            identityConstraintDefinitions: [], // see below
            substitutionGroupAffiliations: [], // see below
            disallowedSubstitutions: {}, // see below
            substitutionGroupExclusions: {}, // see below
            abstract: n.attribute('abstract')
                .map(v => this.parseValueForSimpleType(v, this.types.getSimpleAtomic(`boolean`, XMLNS.XS)!, element))
                .optional() ?? false,
            annotations: this.parseAnnotationsOf(n),
        };

        const alternatives = n.children('alternative', XMLNS.XS).map(n => this.parseTypeAlternative(n.element, decl));
        const lastAlternative = alternatives[alternatives.length - 1];
        const schemaElement = element.closest('schema');
        const complexTypeElement = element.closest('complexType');
        const groupElement = element.closest('group');
        const minOccurs = n.attribute('minOccurs').map(v => Number(v)).optional() ?? 1;
        const maxOccurs = n.attribute('maxOccurs').map(v => Number(v)).optional() ?? 1;

        // Target namespace and scope

        if (!n.hasAttribute('ref') && (complexTypeElement || groupElement) && (minOccurs !== 0 || maxOccurs !== 0)) {
            if (n.hasAttribute('targetNamespace')) {
                decl.targetNamespace = n.attribute('targetNamespace').required();
            } else if (n.attribute('form').optional() === 'qualified' || schemaElement?.getAttribute('elementFormDefault') === 'qualified') {
                decl.targetNamespace = this.schemaTargetNamespaceOf(element);
            }

            decl.scope = {
                variety: 'local',
                parent: undefined // TODO: need the complex type definition or model group definition to be linked here
            }
        }

        // Substitution group affiliations

        // TODO

        // Disallowed substitutions
        // Substitution group exclusions

        decl.disallowedSubstitutions = this.parseEnum(this.attrOrSchemaDefault(element, 'block') ?? '', ['extension', 'restriction', 'substitution'], element);
        decl.substitutionGroupExclusions = this.parseEnum(this.attrOrSchemaDefault(element, 'final') ?? '', ['extension', 'restriction'], element);

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // See: XML Mapping Summary for Element Declaration Schema Component {type definition} 

        // Handle cases (1) and (2)

        let typeDef = this.withElementDeclarationContext(decl, () => this.parseOptionalTypeDefinitionOf(n, false, decl));

        // Handle case (3)

        if (!typeDef && n.hasAttribute('substitutionGroup')) {
            let [qName] = <QName[]>this.parseValueForSimpleType(
                n.attribute('substitutionGroup').required(),
                this.types.listOf(this.types.getSimpleAtomic('QName', XMLNS.XS)!),
                element
            );

            if (qName)
                typeDef = this.types.get(qName.localPart, qName.namespaceName);
        }

        // Handle case (4)

        if (!typeDef)
            typeDef = this.types.anyType;

        // End parsing for {type definition}
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Value constraint

        if (n.hasAttribute('default') || n.hasAttribute('fixed')) {
            let lexicalForm = (n.attribute('default').optional() ?? n.attribute('fixed').optional())!;
            let effectiveSimpleTypeDef: SimpleTypeDefinition;

            if (Types.isSimple(typeDef)) {
                effectiveSimpleTypeDef = typeDef;
            } else if (Types.isComplex(typeDef) && ContentTypes.isSimple(typeDef.contentType)) {
                effectiveSimpleTypeDef = typeDef.contentType.simpleTypeDefinition;
            } else {
                effectiveSimpleTypeDef = this.types.getSimpleAtomic('string', XMLNS.XS)!;
            }

            decl.valueConstraint = {
                variety: n.hasAttribute('default') ? 'default' : 'fixed',
                value: this.parseValueForSimpleType(lexicalForm, effectiveSimpleTypeDef, element),
                lexicalForm
            };
        }

        if (alternatives.length > 0) {
            decl.typeTable = {
                alternatives,
                defaultTypeDefinition: !lastAlternative?.test ? lastAlternative : {
                    annotations: [],
                    test: undefined,
                    typeDefinition: decl.typeDefinition
                }
            };
        }

        return decl;
    }

    private parseTypeAlternative(
        element: Element,
        context: AttributeDeclaration | ElementDeclaration | SimpleTypeDefinition | undefined
    ): TypeAlternative {
        return DomNavigator.for(element, n => ({
            test: n.hasAttribute('test') ? {
                namespaceBindings: [],
                expression: n.attribute('test').required(),
                baseURI: undefined,
                defaultNamespace: undefined
            } : undefined,
            typeDefinition: this.parseTypeDefinitionOf(n, true, context),
            annotations: this.parseAnnotationsOf(n)
        }));
    }

    private parseOptionalTypeDefinitionOf(
        n: DomNavigator<Element>,
        preferReference: boolean,
        context: AttributeDeclaration | ElementDeclaration | SimpleTypeDefinition | undefined
    ): TypeDefinition | undefined {
        let typeRef = n.attribute('type', XMLNS.XS).optional();
        if (preferReference && typeRef)
            return { type: 'reference', reference: true, name: typeRef };

        const simpleType = n.child('simpleType', XMLNS.XS).optional();
        const complexType = n.child('complexType', XMLNS.XS).optional();

        if (simpleType)
            return this.parseSimpleType(simpleType.element, context);
        else if (complexType)
            return this.parseComplexType(complexType.element);
        else if (typeRef)
            return { type: 'reference', reference: true, name: typeRef };
    }

    private parseTypeDefinitionOf(
        n: DomNavigator<Element>,
        preferReference: boolean,
        context: AttributeDeclaration | ElementDeclaration | SimpleTypeDefinition | undefined
    ): TypeDefinition {
        let typeDef = this.parseOptionalTypeDefinitionOf(n, preferReference, context);
        if (!typeDef)
            throw new Error(`Missing type definition in element`);

        return typeDef;
    }

    private parseQName(value: string, contextElement: Element) {
        return <QName>this.parseValueForSimpleType(
            value,
            this.types.getSimpleAtomic('QName', XMLNS.XS)!,
            contextElement
        );
    }

    private parseQNames(value: string, contextElement: Element) {
        return <QName[]>this.parseValueForSimpleType(
            value,
            this.types.listOf(this.types.getSimpleAtomic('QName', XMLNS.XS)!),
            contextElement
        );
    }

    private resolveTypesByName(value: string, contextElement: Element): TypeDefinition[] {
        return this.parseQNames(value, contextElement)
            .map(name => this.types.require(name.localPart, name.namespaceName));
    }

    private resolveSimpleTypesByName(value: string, contextElement: Element): SimpleTypeDefinition[] {
        let types: TypeDefinition[] = this.resolveTypesByName(value, contextElement);
        if (types.some(x => !Types.isSimple(x)))
            throw new Error(`Expected a simple type`);

        return <SimpleTypeDefinition[]>types;
    }

    private resolveTypeByName(value: string, contextElement: Element): TypeDefinition {
        let qName = this.parseQName(value, contextElement);
        return this.types.require(qName.localPart, qName.namespaceName);
    }

    private resolveSimpleTypeByName(value: string, contextElement: Element): SimpleTypeDefinition {
        let type = this.resolveTypeByName(value, contextElement);
        if (!Types.isSimple(type))
            throw new Error(`Expected a simple type, not '${type.type}'`);

        return type;
    }

    /**
     * Parse a <simpleType>
     * 
     * @returns The SimpleTypeDefinition that was parsed, if parsing it was possible. If undefined is returned, the caller
     *          should ignore this element and move on.
     * @param element 
     * @param context 
     */
    private parseSimpleType(element: Element, context: AttributeDeclaration | ElementDeclaration | SimpleTypeDefinition | ComplexTypeDefinition | undefined): SimpleTypeDefinition {
        let n = new DomNavigator(element);
        const list = n.child('list').optional();
        const union = n.child('union').optional();
        const restriction = n.child('restriction').optional();

        let defn: SimpleTypeDefinition = <any>{};

        if (list) {
            let itemType: SimpleTypeDefinition;

            if (list!.hasAttribute('itemType'))
                itemType = this.resolveSimpleTypeByName(list!.attribute('itemType').required(), element);
            else if (list!.child('simpleType').optional())
                itemType = this.parseSimpleType(list!.child('simpleType').required().element, defn);
            else
                throw new Error(`List type must specify itemType attribute or contain a <simpleType> child.`);

            if (itemType.variety === 'list')
                throw new Error(`The item type of a list data type cannot be another list.`);

            Object.assign(defn, this.types.listOf(itemType));
        } else if (union) {
            Object.assign(defn, this.types.unionOf([
                ...this.resolveSimpleTypesByName(union!.attribute('memberTypes').optional() ?? '', element),
                ...union!.children('simpleType').map(e => this.parseSimpleType(e.element, defn))
            ]));
        } else if (restriction) {
            let baseType = restriction.hasAttribute('base')
                ? this.resolveSimpleTypeByName(restriction.attribute('base').required(), element)
                : this.parseSimpleType(restriction.child('simpleType').required().element, defn);

            Object.assign(defn, this.types.restrictionOf(baseType, this.parseFacetsOf(element, baseType)));
        } else {
            throw new Error(`<simpleType> must contain one of: <list>, <union>, <restriction>`);
        }

        defn.context = context;
        defn.final = this.parseEnum(this.attrOrSchemaDefault(element, 'final') ?? '', ['restriction', 'extension', 'list', 'union'], element);

        if (defn.name)
            this.types.register(defn);

        return defn;
    }

    private attrOrSchemaDefault(element: Element, attribute: string): string | undefined {
        let schemaElement = element.closest('schema');
        if (element.hasAttribute(attribute))
            return element.getAttribute(attribute)!;
        if (schemaElement?.hasAttribute(`${attribute}Default`))
            return schemaElement.getAttribute(`${attribute}Default`)!;
    }

    private parseEnum<T>(value: string, options: (keyof T)[], contextElement: Element | undefined): Enumeration<T> {
        let finalActualValue: string[] =
            this.parseValueForSimpleType(
                value,
                this.types.listOf(
                    this.types.simpleEnumeration(options)
                ),
                contextElement
            );

        return <Enumeration<T>>Object.fromEntries(
            options.map(k => [k, finalActualValue.includes('all') || finalActualValue.includes(k as string) || undefined])
        );
    }

    private parseBoolean(value: string | undefined, defaultValue: boolean, contextElement: Element) {
        return this.parseValueForSimpleType(value ?? String(defaultValue), this.types.getSimpleAtomic('boolean', XMLNS.XS)!, contextElement);
    }

    private parseFacetsOf(element: Element, type: SimpleTypeDefinition): Facet[] {
        let n = new DomNavigator(element);
        let facets: Facet[] = [];

        for (let facetType of this.facetTypes) {
            let facetElement = n.child(facetType, XMLNS.XS).optional();
            if (!facetElement)
                continue;

            let fixed = this.parseBoolean(n.attribute('fixed').optional(), false, element);
            let value = this.parseValueForSimpleType(n.attribute('value').required(), type, element);
            facets.push({ type: <any>facetType, value, annotations: this.parseAnnotationsOf(facetElement), fixed });
        }

        return facets;
    }

    private readonly facetTypes = [
        `annotation`,
        `simpleType`,
        `minExclusive`,
        `minInclusive`,
        `maxExclusive`,
        `maxInclusive`,
        `totalDigits`,
        `fractionDigits`,
        `length`,
        `minLength`,
        `maxLength`,
        `enumeration`,
        `whiteSpace`,
        `pattern`,
        `assertion`,
        `explicitTimezone`
    ];

    private parseComplexType(element: Element): ComplexTypeDefinition {
        let n = new DomNavigator(element);

        let complexType = <ComplexTypeDefinition>{
            type: 'complex',
            name: n.attribute('name').optional(),
            targetNamespace: this.schemaTargetNamespaceOf(element),
            abstract: n.attribute('abstract')
                .map(v => this.parseValueForSimpleType(v, this.types.getSimpleAtomic(`boolean`, XMLNS.XS)!, element))
                .optional() ?? false,
            prohibitedSubstitutions: {}, // see below
            final: this.parseEnumSetAttr(n, 'final'),
            context: n.hasAttribute('name') ? undefined : this.elementDeclarationContext,
            assertions: [], // TODO, depends on baseTypeDefinition
            annotations: this.parseAnnotationsOf(n),
            baseTypeDefinition: <any>undefined, // see below
            derivationMethod: <any>undefined, // see below
            attributeUses: <any>undefined, // see below
            attributeWildcard: undefined, // see below
            contentType: <any>undefined, // see below
        };

        const simpleContent = n.child('simpleContent', XMLNS.XS).optional();
        const complexContent = n.child('complexContent', XMLNS.XS).optional();
        
        if (simpleContent) {
            let extension = simpleContent.child('extension').optional();
            let restriction = simpleContent.child('restriction').optional();
            if (!extension && !restriction)
                throw new Error(`<simpleContent> must contain one of <restriction> or <extension>`);

            let baseType = this.resolveTypeByName((restriction ?? extension)!.attribute('base').required(), element);
            let simpleType: SimpleTypeDefinition;

            if (baseType.type === 'complex' && baseType.contentType.variety === 'simple' && !!restriction) {
                let base: SimpleTypeDefinition;
                if (restriction.child('simpleType').optional()) {
                    base = this.parseSimpleType(restriction.child('simpleType').required().element, complexType)!;
                } else {
                    base = baseType.contentType.simpleTypeDefinition;
                }

                simpleType = {
                    type: 'simple',
                    name: undefined,
                    targetNamespace: this.schemaTargetNamespaceOf(element),
                    final: {},
                    context: complexType,
                    baseType: base,
                    facets: this.parseFacetsOf(restriction.element, base),
                    variety: base.variety as any,
                    primitiveType: (base as SimpleAtomicTypeDefinition).primitiveType,
                    itemType: (base as SimpleListTypeDefinition).itemType,
                    memberTypes: (base as SimpleUnionTypeDefinition).memberTypes,
                    annotation: undefined,

                    ordered: false,
                    numeric: false,
                    bounded: false,
                    cardinality: 'finite'
                };

                this.types.inheritFundamentalFacets(simpleType);
            } else if (baseType.type === 'complex' && baseType.contentType.variety === 'mixed' && this.isParticleEmptiable(baseType.contentType.particle) && !!restriction) {
                let sb: SimpleTypeDefinition;

                if (restriction.child('simpleType').optional()) {
                    sb = this.parseSimpleType(restriction.child('simpleType').required().element, complexType)!;
                } else {
                    sb = this.types.anySimpleType;
                }

                simpleType = this.types.restrictionOf(sb, this.parseFacetsOf(restriction.element, sb));
            } else if (baseType.type === 'complex' && baseType.contentType.variety === 'simple' && !!extension) {
                simpleType = baseType.contentType.simpleTypeDefinition;
            } else if (baseType.type === 'simple' && !!extension) {
                simpleType = baseType;
            } else {
                simpleType = this.types.anySimpleType;
            }

            complexType.baseTypeDefinition = baseType;
            complexType.derivationMethod = extension ? 'extension' : 'restriction';
            complexType.contentType = {
                variety: 'simple',
                simpleTypeDefinition: simpleType
            }
        } else {
            let mixed = this.parseBoolean(n.attribute('mixed').optional(), false, element);
            let contentElement = n;

            if (complexContent) {
                // explicit complex content

                let extension = complexContent.child('extension').optional();
                let restriction = complexContent.child('restriction').optional();

                if (!extension && !restriction)
                    throw new Error(`<complexContent> must contain one of: <extension>, <restriction>`);
                
                contentElement = (restriction ?? extension)!;
                let baseType = this.resolveTypeByName((restriction ?? extension)!.attribute('base').required(), element);

                complexType.baseTypeDefinition = baseType;
                complexType.derivationMethod = extension ? 'extension' : 'restriction';

                if (complexContent.hasAttribute('mixed')) {
                    mixed = this.parseBoolean(complexContent.attribute('mixed').optional(), false, element);
                }
            } else {
                // implicit complex content
                complexType.baseTypeDefinition = this.types.anyType;
                complexType.derivationMethod = 'restriction';
            }

            let particleElement = contentElement.child('group').optional() 
                ?? contentElement.child('all').optional() 
                ?? contentElement.child('choice').optional() 
                ?? contentElement.child('sequence').optional() 
            ;

            let particle = particleElement ? this.parseParticle(particleElement?.element, complexType) : undefined;
            let explicitContent: Particle | undefined = undefined;
            let particleEmpty = particle && Particles.isModelGroup(particle) && particle.term.particles.length === 0;
            
            if (!particle) {
                explicitContent = undefined;
            } else if (Particles.isModelGroup(particle) && ['all', 'sequence'].includes(particle.term.compositor) && particleEmpty) {
                explicitContent = undefined;
            } else if (Particles.isModelGroup(particle) && particle.term.compositor === 'choice' && particle.minOccurs === 0 && particleEmpty) {
                explicitContent = undefined;
            } else if (particle.maxOccurs === 0) {
                explicitContent = undefined;
            } else {
                explicitContent = particle;
            }

            let effectiveContent: Particle | undefined = undefined;

            if (explicitContent) {
                effectiveContent = explicitContent;
            } else if (mixed) {
                effectiveContent = {
                    minOccurs: 1,
                    maxOccurs: 1,
                    term: {
                        type: 'modelGroup',
                        compositor: 'sequence',
                        particles: [],
                        annotations: []
                    },
                    annotations: []
                };
            }

            let explicitContentType!: EmptyContentType | MixedContentType | ElementOnlyContentType;

            if (complexType.derivationMethod === 'restriction') {
                if (effectiveContent) {
                    explicitContentType = {
                        variety: mixed ? 'mixed' : 'element-only',
                        particle: effectiveContent,
                        openContent: undefined
                    }
                } else {
                    explicitContentType = { variety: 'empty' };
                }
            } else if (complexType.derivationMethod === 'extension') {
                let baseType = complexType.baseTypeDefinition;
                if (Types.isSimple(baseType)) {
                    if (effectiveContent) {
                        explicitContentType = {
                            variety: mixed ? 'mixed' : 'element-only',
                            particle: effectiveContent,
                            openContent: undefined
                        }
                    } else {
                        explicitContentType = { variety: 'empty' };
                    }
                } else if (Types.isComplex(baseType)) {
                    let baseContentType = baseType.contentType;
                    if (ContentTypes.isEmpty(baseContentType) || ContentTypes.isSimple(baseContentType)) {
                        if (effectiveContent) {
                            explicitContentType = {
                                variety: mixed ? 'mixed' : 'element-only',
                                particle: effectiveContent,
                                openContent: undefined
                            }
                        } else {
                            explicitContentType = { variety: 'empty' };
                        }
                    } else if (ContentTypes.isElementOnly(baseContentType) || ContentTypes.isMixed(baseContentType)) {
                        if (!effectiveContent) {
                            explicitContentType = baseContentType;
                        } else {
                            let baseParticle = baseContentType.particle;
                            let particle: Particle = {
                                minOccurs: 1,
                                maxOccurs: 1,
                                term: {
                                    type: 'modelGroup',
                                    compositor: 'sequence',
                                    particles: [ baseParticle, effectiveContent ],
                                    annotations: []
                                },
                                annotations: []
                            }

                            if (Particles.isModelGroup(baseParticle)) {
                                if (baseParticle.term.compositor === 'all') {
                                    if (!explicitContent) {
                                        particle = baseParticle;
                                    } else if (Particles.isModelGroup(effectiveContent) && effectiveContent.term.compositor === 'all') {
                                        particle = {
                                            minOccurs: effectiveContent!.minOccurs,
                                            maxOccurs: 1,
                                            term: {
                                                type: 'modelGroup',
                                                compositor: 'all',
                                                particles: [
                                                    ...(baseParticle.term as ModelGroup).particles,
                                                    ...(effectiveContent!.term as ModelGroup).particles
                                                ],
                                                annotations: []
                                            },
                                            annotations: []
                                        };
                                    }
                                }
                            }

                            explicitContentType = {
                                variety: mixed ? 'mixed' : 'element-only',
                                particle,
                                openContent: baseContentType.openContent
                            }
                        }
                    }
                }
            }

            let wildcardElement: Element | undefined;
            let schemaElement = new DomNavigator(element.closest('schema')!);
            let defaultOpenContent = schemaElement.child('defaultOpenContent').optional();
            let appliesToEmpty = defaultOpenContent 
                ? this.parseBoolean(defaultOpenContent?.attribute('appliesToEmpty').optional(), false, defaultOpenContent?.element)
                : false;

            if (contentElement.child('openContent').optional()) {
                wildcardElement = contentElement.child('openContent').required().element;
            } else if (defaultOpenContent && (explicitContentType.variety !== 'empty' || appliesToEmpty)) {
                wildcardElement = defaultOpenContent.element;
            }

            complexType.contentType = explicitContentType;

            if (wildcardElement && wildcardElement.getAttribute('mode') !== 'none') {
                let wildcard = this.parseWildcard(new DomNavigator(wildcardElement).child('any').required().element);

                complexType.contentType = {
                    variety: explicitContentType.variety !== 'empty' ? explicitContentType.variety : 'element-only',
                    particle: !ContentTypes.isEmpty(explicitContentType) ? explicitContentType.particle : {
                        minOccurs: 1,
                        maxOccurs: 1,
                        term: {
                            type: 'modelGroup',
                            compositor: 'sequence',
                            particles: [],
                            annotations: []
                        },
                        annotations: []
                    },
                    openContent: {
                        mode: ((wildcardElement.getAttribute('mode') || undefined) ?? 'interleave') as any,
                        wildcard: (explicitContentType as MixedContentType | ElementOnlyContentType).openContent ? {
                            type: 'wildcard',
                            processContents: wildcard.processContents,
                            annotations: wildcard.annotations,
                            namespaceConstraint: this.attributeWildcardUnion(
                                wildcard.namespaceConstraint,
                                (explicitContentType as MixedContentType | ElementOnlyContentType).openContent!
                                    .wildcard.namespaceConstraint
                            )
                        } : wildcard
                    }
                }
            }
        }

        // Attribute uses

        complexType.attributeUses = [
            ...compact(n.children('attribute').map(x => this.parseAttributeUse(x.element, complexType))),
            ...n.children('attributeGroup').map(x => this.parseAttributeGroupDefinition(x.element))
                .map(x => x.attributeUses)
                .flat()
        ];

        const defaultAttributesApply = this.parseBoolean(n.attribute('defaultAttributesApply').optional(), true, element);
        const defaultAttributes = this.schemaElement.getAttribute('defaultAttributes');

        if (defaultAttributes && defaultAttributesApply) {
            let attributeGroup = this.schemaContext?.attributeGroupDefinitions
                .find(x => x.name === defaultAttributes);

            if (!attributeGroup)
                throw new Error(`Failed to locate attribute group named '${defaultAttributes}'`);

            complexType.attributeUses.push(...attributeGroup?.attributeUses);
        }

        if (Types.isComplex(complexType.baseTypeDefinition)) {
            if (complexType.derivationMethod === 'extension') {
                complexType.attributeUses.push(...complexType.baseTypeDefinition.attributeUses);
            } else if (complexType.derivationMethod === 'restriction') {
                complexType.attributeUses.push(
                    ...complexType.baseTypeDefinition.attributeUses
                        .filter(x => 
                            // Note: XML Mapping Summary for Complex Type Definition (Attribute Uses) Schema Component
                            // (3.2.2)
                            // Because we include `prohibited` as a property of attribute uses instead of eliding them,
                            // we can simply iterate the whole list here looking for matches instead of explicitly 
                            // handling this case.

                            !complexType.attributeUses
                                .some(y => 
                                    y.attributeDeclaration.targetNamespace === x.attributeDeclaration.targetNamespace 
                                    && y.attributeDeclaration.name === y.attributeDeclaration.name
                                )
                        )
                )
            }
        }

        // Prohibited substitutions, final

        complexType.prohibitedSubstitutions = this.parseEnum(this.attrOrSchemaDefault(element, 'block') ?? '', ['extension', 'restriction'], element);
        complexType.final = this.parseEnum(this.attrOrSchemaDefault(element, 'final') ?? '', ['extension', 'restriction'], element);

        // Register the complex type

        if (complexType.name)
            this.types.register(complexType);

        return complexType;
    }

    private isParticleEmptiable(particle: Particle) {
        return particle.minOccurs === 0 || (Particles.isModelGroup(particle) && this.effectiveTotalRange(particle).minimum === 0)
    }

    private parseEnumSetAttr(n: DomNavigator<Element>, name: string) {
        return n.attribute(name).or(() => '').required().split(/\s+/);
    }

    private unboundedToInfinity(value: number | 'unbounded') {
        if (value === 'unbounded')
            return Infinity;
        return value;
    }

    private infinityToUnbounded(value: number): number | 'unbounded' {
        if (!isFinite(value))
            return 'unbounded';

        return value;
    }

    private effectiveTotalRange(particle: Particle & { term: ModelGroup }): { minimum: number, maximum: number | 'unbounded' } {
        if (particle.term.particles.length === 0)
            return { minimum: 0, maximum: 0 }

        const wildcardsAndElements = <(Particle & { term: Wildcard | ElementDeclaration })[]>particle.term.particles
            .filter(x => ['wildcard', 'elementDeclaration'].includes(x.term.type));
        const groups = <(Particle & { term: ModelGroup })[]>particle.term.particles
            .filter(x => ['modelGroup'].includes(x.term.type));
        const groupTotalRanges = groups.map(group => this.effectiveTotalRange(group));

        if (particle.term.compositor === 'all' || particle.term.compositor === 'sequence') {
            return {
                minimum: particle.minOccurs * sum(
                    ...wildcardsAndElements.map(x => x.minOccurs),
                    ...groupTotalRanges.map(r => r.minimum)
                ),
                maximum: this.infinityToUnbounded(
                    this.unboundedToInfinity(particle.maxOccurs) * sum(
                        ...wildcardsAndElements.map(x => this.unboundedToInfinity(x.maxOccurs)),
                        ...groupTotalRanges.map(r => this.unboundedToInfinity(r.maximum))
                    )
                )
            }
        } else {
            return {
                minimum: particle.minOccurs * Math.min(
                    ...wildcardsAndElements.map(x => x.minOccurs),
                    ...groupTotalRanges.map(x => x.minimum)
                ),
                maximum: this.infinityToUnbounded(
                    this.unboundedToInfinity(particle.maxOccurs) * Math.max(
                        ...wildcardsAndElements.map(x => this.unboundedToInfinity(x.maxOccurs)),
                        ...groupTotalRanges.map(r => this.unboundedToInfinity(r.maximum))
                    )
                )
            }
        }
    }

    private parseAnnotationsOf(element: DomNavigator<Element>): Annotation[] {
        return element.children('annotation', XMLNS.XS).map(n => this.parseAnnotation(n.element));
    }

    parseAnnotation(element: Element): Annotation {
        return DomNavigator.for(element, n => ({
            appInfo: n.children('appinfo', XMLNS.XS).map(e => ({ element: e.element })),
            documentation: n.children('documentation', XMLNS.XS).map(e => ({ element: e.element }))
        }));
    }
}

function sum(...items: number[]): number {
    return items.reduce((s, v) => s + v, 0);
}

function compact<T>(items: (T | undefined)[]): T[] {
    return items.filter(x => x !== undefined) as T[];
}

type Enumeration<T> = {
    [P in keyof T]?: true | undefined;
};