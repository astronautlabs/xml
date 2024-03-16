import { XmlValue } from "@astronautlabs/xml";
import { ComplexTypeDefinition } from "./complex-type-definition";
import { ExplicitTimezoneFacet, Facet, Facets, WhiteSpaceFacet } from "./facets";
import { ModelGroup } from "./model-group";
import { SimpleAtomicTypeDefinition, SimpleListTypeDefinition, SimplePrimitiveTypeDefinition, SimpleTypeDefinition, SimpleUnionTypeDefinition } from "./simple-type-definition";
import { TypeDefinition } from "./type-definition";
import { TypeReference } from "./type-reference";
import { as } from "./utils";
import { Wildcard } from "./wildcard";
import { XMLNS } from "./xmlns";
import { Base64 } from '@alterior/common';

export interface QName {
    namespaceName: string;
    localPart: string;
}

export function isQName(value: any): value is QName {
    return typeof value === 'object' && 'namespaceName' in value && 'localPart' in value;
}

export class TypeRegistry {
    constructor() {
        this.defineBuiltInTypes();
        
        let { anyType, anySimpleType, anyAtomicType, } = this.defineSpecialTypes();
        this.anyType = anyType;
        this.anySimpleType = anySimpleType;
        this.anyAtomicType = anyAtomicType;
    }

    private types = new Map<string, TypeDefinition>();

    get(name: string, namespace: string) {
        return this.types.get(`${namespace}:${name}`);
    }

    private requireType<T>(value: T | undefined, name: string, namespace: string): T {
        if (value === undefined)
            throw new Error(`No such type ${name} found within namespace '${namespace}'`);
        return value;
    }

    require(name: string, namespace: string) { return this.requireType(this.get(name, namespace), name, namespace); }
    requirePrimitive(name: string, namespace: string) { return this.requireType(this.getPrimitive(name, namespace), name, namespace); }
    requireSimple(name: string, namespace: string) { return this.requireType(this.getSimple(name, namespace), name, namespace); }
    requireSimpleAtomic(name: string, namespace: string) { return this.requireType(this.getSimpleAtomic(name, namespace), name, namespace); }
    requireComplex(name: string, namespace: string) { return this.requireType(this.getComplex(name, namespace), name, namespace); }

    getSimple(name: string, namespace: string): SimpleTypeDefinition | undefined {
        let defn = this.get(name, namespace);
        if (!defn)
            return undefined;

        if (!Types.isSimple(defn))
            throw new Error(`Type '${namespace}:${name}' is not a simple type (type is ${defn.type})`);

        return defn;
    }

    getPrimitive(name: string, namespace: string): SimplePrimitiveTypeDefinition | undefined {
        let defn = this.get(name, namespace);
        if (!defn)
            return undefined;

        if (!Types.isSimple(defn))
            throw new Error(`Type '${namespace}:${name}' is not a simple type (type is ${defn.type})`);

        if (defn.variety !== 'atomic')
            throw new Error(`Type '${namespace}:${name}' is not an atomic variety (variety is ${defn.variety})`);
        
        if (defn.primitiveType !== defn)
            throw new Error(`Type '${namespace}:${name}' is not a primitive type`);

        return defn as SimplePrimitiveTypeDefinition;
    }

    getSimpleAtomic(name: string, namespace: string): SimpleAtomicTypeDefinition | undefined {
        let defn = this.get(name, namespace);
        if (!defn)
            return undefined;

        if (!Types.isSimple(defn))
            throw new Error(`Type '${namespace}:${name}' is not a simple type (type is ${defn.type})`);

        if (defn.variety !== 'atomic')
        throw new Error(`Type '${namespace}:${name}' is not an atomic variety (variety is ${defn.variety})`);
        return defn;
    }

    getComplex(name: string, namespace: string): ComplexTypeDefinition | undefined {
        let defn = this.get(name, namespace);
        if (!defn)
            return undefined;

        if (!Types.isComplex(defn))
            throw new Error(`Type '${namespace}:${name}' is not a complex type (type is ${defn.type})`);

        return defn;
    }

    private readonly dateTypes = [
        `${XMLNS.XS}:date`,
        `${XMLNS.XS}:gYearMonth`,
        `${XMLNS.XS}:gYear`,
        `${XMLNS.XS}:gMonthDay`,
        `${XMLNS.XS}:gDay`,
        `${XMLNS.XS}:gMonth`,
    ];

    public listOf(itemType: string | SimpleAtomicTypeDefinition | SimpleUnionTypeDefinition): SimpleListTypeDefinition {
        if (typeof itemType === 'string') {
            let type = this.requireSimple(...this.splitCName(itemType));
            if (type.variety === 'list')
                throw new Error(`Item type of a list cannot be a list itself`);
            itemType = type;
        }

        let defn: SimpleListTypeDefinition = {
            type: 'simple',
            variety: 'list',
            name: undefined,
            targetNamespace: undefined,
            annotation: undefined,
            baseType: this.anySimpleType,
            ordered: false,
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            context: undefined,
            itemType,
            facets: [
                Facets.whiteSpace('collapse')
            ]
        };

        this.inheritFundamentalFacets(defn);

        return defn;
    }

    public unionOf(types: (SimpleTypeDefinition | string)[]): SimpleUnionTypeDefinition {
        let defn: SimpleUnionTypeDefinition = {
            type: 'simple',
            variety: 'union',
            name: undefined,
            targetNamespace: undefined,
            annotation: undefined,
            baseType: this.anySimpleType,
            ordered: false,
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            context: undefined,
            memberTypes: types.map(type => typeof type === 'string' ? this.requireSimple(...this.splitCName(type)) : type),
            facets: []
        };

        this.inheritFundamentalFacets(defn);
        
        return defn;
    }

    private splitCName(name: string): [ string, string ] {
        let localPart = name.replace(/^.*:/, '');
        let nsPrefix = name.replace(/:[^:]*$/, '');
        return [localPart, nsPrefix];
    }

    public restrictionOf(baseType: SimpleTypeDefinition | string, facets: Facet[]): SimpleTypeDefinition {
        if (typeof baseType === 'string')
            baseType = this.requireSimple(...this.splitCName(baseType));

        let defn: SimpleTypeDefinition = {
            type: 'simple',
            name: undefined,
            targetNamespace: undefined,
            baseType: baseType,
            final: {},
            context: undefined,
            variety: baseType.variety as any,
            annotation: undefined,
            
            // NOTE: Fundamental facets may be modified by list/union/restriction specific processing below
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            ordered: false,
            facets: this.overlayFacets(baseType.facets, facets),

            primitiveType: baseType.variety === 'atomic' ? (baseType as SimpleAtomicTypeDefinition).primitiveType : undefined,
            itemType: baseType.variety === 'list' ? (baseType as SimpleListTypeDefinition).itemType : undefined,
            memberTypes: baseType.variety === 'union' ? (baseType as SimpleUnionTypeDefinition).memberTypes : <any>undefined
        };

        this.inheritFundamentalFacets(defn);
        
        return defn;
    }

    public inheritFundamentalFacets(defn: SimpleTypeDefinition) {
        if (defn.variety === 'atomic') {
            let hasMin = defn.facets.some(x => ['minInclusive', 'minExclusive'].includes(x.type));
            let hasMax = defn.facets.some(x => ['maxInclusive', 'maxExclusive'].includes(x.type));
            let hasLength = defn.facets.some(x => ['length', 'maxLength', 'totalDigits'].includes(x.type));
            let hasFractionDigits = defn.facets.some(x => ['fractionDigits'].includes(x.type));
            let baseTypeIsFinite = Types.isSimple(defn.baseType) && defn.baseType.cardinality === 'finite';
            let hasDateType = this.dateTypes.includes(`${defn.targetNamespace}:${defn.primitiveType.name}`);

            defn.ordered = (defn.baseType as SimpleTypeDefinition).ordered;
            defn.bounded = defn.facets.some(x => ['minInclusive', 'minExclusive'].includes(x.type)) && defn.facets.some(x => ['maxInclusive', 'maxExclusive'].includes(x.type));
            defn.numeric = (defn.baseType as SimpleTypeDefinition).numeric;
            defn.cardinality = baseTypeIsFinite || hasLength || (hasMin && hasMax && (hasFractionDigits || hasDateType)) 
                ? 'finite' : 'infinite';
        } else if (defn.variety === 'list') {
            const hasLength = defn.facets.some(x => x.type === 'length');
            const hasMaxLength = defn.facets.some(x => x.type === 'maxLength');
            const hasMinLength = defn.facets.some(x => x.type === 'minLength');

            defn.ordered = false;
            defn.bounded = false;
            defn.numeric = false;
            defn.cardinality = hasLength || (hasMinLength && hasMaxLength) && defn.itemType.cardinality === 'finite' 
                ? 'finite' : 'infinite';
        } else if (defn.variety === 'union') {
            const basicMembers = defn.memberTypes.filter(x => Types.isSimple(x) && x.variety !== 'union') as SimpleTypeDefinition[];
            const atomicMembers = basicMembers.filter(x => x.variety === 'atomic') as SimpleAtomicTypeDefinition[];
            const primitiveTypes = new Set<SimplePrimitiveTypeDefinition>();
            
            atomicMembers.forEach(m => primitiveTypes.add(m.primitiveType));

            const commonPrimitiveType = primitiveTypes.size === 1 ? Array.from(primitiveTypes.values())[0] : undefined;

            if (atomicMembers.length === basicMembers.length && commonPrimitiveType)
                defn.ordered = commonPrimitiveType.ordered;
            else if (defn.memberTypes.every(x => x.ordered === false))
                defn.ordered = false;
            else
                defn.ordered = 'partial';

            defn.bounded = defn.memberTypes.every(x => x.bounded === true) && !!commonPrimitiveType;
            defn.cardinality = defn.memberTypes.every(x => x.cardinality === 'finite') ? 'finite' : 'infinite';
            defn.numeric = defn.memberTypes.every(x => x.numeric);
        }
    }

    private defineSimpleAtomicType(baseTypeRef: string, defn: Omit<SimpleAtomicTypeDefinition, 'type' | 'variety' | 'baseType' | 'primitiveType'> & { targetNamespace: string }) {
        if (!baseTypeRef.includes(':'))
            baseTypeRef = `${XMLNS.XS}:${baseTypeRef}`;

        let baseType = this.types.get(baseTypeRef);

        if (!baseType)
            throw new Error(`Failed to locate type named '${baseTypeRef}'`);

        if (!Types.isSimple(baseType) || baseType.variety !== 'atomic')
            throw new Error(`The base type of an atomic type must itself be atomic`);

        this.register(as<SimpleAtomicTypeDefinition>({
            ...defn,
            type: 'simple',
            variety: 'atomic',
            baseType,
            primitiveType: baseType.primitiveType,
            facets: this.overlayFacets(baseType.facets, defn.facets)
        }));
    }

    public define(name: string, namespace: string, type: SimpleTypeDefinition | ComplexTypeDefinition) {
        type.name = name;
        type.targetNamespace = namespace;
        this.register(type);
        return type;
    }

    public register(type: SimpleTypeDefinition | ComplexTypeDefinition) {
        this.types.set(`${type.targetNamespace}:${type.name}`, type);
    }

    private primitiveTypeOf(defn: Omit<SimplePrimitiveTypeDefinition, 'name' | 'context' | 'annotation' | 'targetNamespace' | 'type' | 'variety' | 'baseType' | 'primitiveType'>): SimplePrimitiveTypeDefinition {
        const type = as<SimplePrimitiveTypeDefinition>({
            ...defn,
            name: undefined,
            targetNamespace: undefined,
            annotation: undefined,
            baseType: this.anyAtomicType,
            type: 'simple',
            variety: 'atomic',
            context: undefined,
            primitiveType: <any>undefined // see below
        });
        type.primitiveType = type;

        return type;
    }

    private definePrimitiveType(defn: Omit<SimplePrimitiveTypeDefinition, 'type' | 'variety' | 'baseType' | 'primitiveType'>) {
        const type = as<SimplePrimitiveTypeDefinition>({
            ...defn,
            baseType: this.anyAtomicType,
            type: 'simple',
            variety: 'atomic',
            primitiveType: <any>undefined // see below
        });
        type.primitiveType = type;

        this.types.set(`${defn.targetNamespace}:${defn.name}`, type);
    }

    private defineSimpleListType(defn: Omit<SimpleListTypeDefinition, 'type' | 'variety'>) {
        this.types.set(`${defn.targetNamespace}:${defn.name}`, as<SimpleListTypeDefinition>({
            ...defn,
            type: 'simple',
            variety: 'list'
        }));
    }

    public overlayFacets(base: Facet[], restrictions: Facet[]) {
        let result: Facet[] = restrictions;
        for (let facet of base) {
            if (!result.some(x => x.type === facet.type))
                result.push(facet);
        }

        return result;
    }

    public simpleEnumeration(values: any[]): SimpleAtomicTypeDefinition {
        let stringType = this.getPrimitive('string', XMLNS.XS)!;
        return {
            type: 'simple',
            variety: 'atomic',
            name: undefined,
            targetNamespace: undefined,
            annotation: undefined,
            baseType: stringType,
            ordered: false,
            context: undefined,
            bounded: true,
            cardinality: 'finite',
            numeric: false,
            primitiveType: stringType,
            facets: [
                { type: 'enumeration', annotations: [], value: values }
            ]
        }
    }

    readonly anyType: ComplexTypeDefinition;
    readonly anySimpleType: SimpleAtomicTypeDefinition;
    readonly anyAtomicType: SimpleAtomicTypeDefinition;

    private defineBuiltInTypes() {
        this.definePrimitiveTypes();
        this.defineOtherBuiltInTypes();
    }

    private definePrimitiveTypes() {
        this.define('string', XMLNS.XS, this.primitiveTypeOf({
            ordered: false,
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('preserve')
            ],
            parseValue: str => str,
            valueToString: str => str
        }));
        this.define('boolean', XMLNS.XS, this.primitiveTypeOf({
            ordered: false,
            bounded: false,
            cardinality: 'finite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true)
            ],
            parseValue: str => XmlValue.parseBoolean(str),
            valueToString: val => String(val)
        }));
        this.define('decimal', XMLNS.XS, this.primitiveTypeOf({
            ordered: 'total',
            bounded: false,
            cardinality: 'infinite',
            numeric: true,
            facets: [
                Facets.whiteSpace('collapse', true)
            ],
            parseValue: str => {
                let bigint = BigInt(str);
                let number = Number(str);

                if (bigint !== BigInt(number))
                    return bigint;
                else
                    return number;
            },
            valueToString: val => String(val)
        }));
        this.define('float', XMLNS.XS, this.primitiveTypeOf({ 
            ordered: 'partial',
            bounded: false,
            cardinality: 'finite',
            numeric: true,
            facets: [
                Facets.whiteSpace('collapse', true),
            ],
            parseValue: str => Number(str),
            valueToString: val => String(val)
        }));
        this.define('double', XMLNS.XS, this.primitiveTypeOf({ 
            ordered: 'partial',
            bounded: false,
            cardinality: 'finite',
            numeric: true,
            facets: [
                Facets.whiteSpace('collapse', true),
            ],
            parseValue: str => Number(str),
            valueToString: val => String(val)
        }));
        this.define('duration', XMLNS.XS, this.primitiveTypeOf({
            ordered: 'partial',
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true)
            ],
        }));
        this.definePrimitiveType({ 
            name: 'dateTime',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            ordered: 'partial',
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true),
                Facets.explicitTimezone('optional')
            ],
        });
        this.definePrimitiveType({ 
            name: 'time',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            ordered: 'partial',
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true),
                Facets.explicitTimezone('optional')
            ],
        });
        this.definePrimitiveType({ 
            name: 'date',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            ordered: 'partial',
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true),
                Facets.explicitTimezone('optional')
            ],
        });
        this.definePrimitiveType({ 
            name: 'gYearMonth',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            ordered: 'partial',
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true),
                Facets.explicitTimezone('optional')
            ],
        });
        this.definePrimitiveType({ 
            name: 'gYear',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            ordered: 'partial',
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true),
                Facets.explicitTimezone('optional')
            ],
        });
        this.definePrimitiveType({ 
            name: 'gMonthDay',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            ordered: 'partial',
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true),
                Facets.explicitTimezone('optional')
            ],
        });
        this.definePrimitiveType({ 
            name: 'gDay',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            ordered: 'partial',
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true),
                Facets.explicitTimezone('optional')
            ],
        });
        this.definePrimitiveType({ 
            name: 'gMonth',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            ordered: 'partial',
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true),
                Facets.explicitTimezone('optional')
            ],
        });
        this.definePrimitiveType({ 
            name: 'hexBinary',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            ordered: false,
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true)
            ],
        });
        this.definePrimitiveType({ 
            name: 'base64Binary',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            ordered: false,
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true)
            ],
            parseValue: str => Base64.decodeBytes(str),
            valueToString: val => typeof val === 'string' ? Base64.encode(val) : Base64.encodeBytes(val)
        });
        this.definePrimitiveType({ 
            name: 'anyURI',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            ordered: false,
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true)
            ],
            parseValue: str => new URL(str),
            valueToString: (val: URL) => val.toString()
        });
        this.definePrimitiveType({ 
            name: 'QName',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            ordered: false,
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true)
            ],
            parseValue: (str, element) => {
                if (str.includes(':')) {
                    let nsPrefix = str.replace(/:.*$/, '');
                    let localPart = str.replace(/^.*?:/, '');
                    let namespaceName = element?.lookupNamespaceURI(nsPrefix);
                    return <QName>{ namespaceName, localPart };
                } else {
                    let namespaceName = element?.lookupNamespaceURI('');
                    return <QName>{ namespaceName, localPart: str };
                }
            },
            valueToString: val => String(val)
        });
        this.definePrimitiveType({ 
            name: 'NOTATION',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            ordered: false,
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            facets: [
                Facets.whiteSpace('collapse', true)
            ],
            parseValue: str => str,
            valueToString: val => String(val)
        });
    }

    private defineOtherBuiltInTypes() {
        this.define('normalizedString', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:string`, [ Facets.whiteSpace('replace') ]));
        this.define('token', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:normalizedString`, [ Facets.whiteSpace('collapse') ]));
        this.define('language', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:token`, [
            Facets.pattern(['[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*'])
        ]));
        this.define('NMTOKEN', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:token`, [
            Facets.pattern(['\c+'])
        ]));
        this.define('NMTOKENS', XMLNS.XS, this.restrictionOf(this.listOf(`${XMLNS.XS}:NMTOKEN`), [
            Facets.minLength(1)
        ]));
        this.define('Name', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:token`, [
            Facets.pattern(['\i\c*'])
        ]));
        this.define('NCName', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:Name`, [
            Facets.pattern(['[\i-[:]][\c-[:]]*'])
        ]));
        this.define('ID', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:NCName`, []));
        this.define('IDREF', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:NCName`, []));
        this.define('IDREFS', XMLNS.XS, this.restrictionOf(this.listOf(`${XMLNS.XS}:IDREF`), [
            Facets.minLength(1)
        ]));
        this.define('ENTITY', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:NCName`, []));
        this.define('ENTITIES', XMLNS.XS, this.restrictionOf(this.listOf(`${XMLNS.XS}:ENTITY`), [
            Facets.minLength(1)
        ]));
        this.define('integer', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:decimal`, [
            Facets.fractionDigits(0, true),
            Facets.pattern(['[\-+]?[0-9]+'])
        ]));
        this.define('nonPositiveInteger', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:integer`, [
            Facets.maxInclusive(0)
        ]));
        this.define('negativeInteger', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:nonPositiveInteger`, [
            Facets.maxInclusive(-1)
        ]));
        this.define('long', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:integer`, [
            Facets.maxInclusive(BigInt('9223372036854775807')),
            Facets.minInclusive(BigInt('-9223372036854775808'))
        ]));
        this.define('int', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:long`, [
            Facets.maxInclusive(2147483647),
            Facets.minInclusive(-2147483648)
        ]));
        this.define('short', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:int`, [
            Facets.maxInclusive(32767),
            Facets.minInclusive(-32768)
        ]));
        this.define('byte', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:short`, [
            Facets.maxInclusive(127),
            Facets.minInclusive(-128)
        ]));
        this.define('nonNegativeInteger', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:integer`, [
            Facets.minInclusive(0)
        ]));
        this.define('unsignedLong', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:nonNegativeInteger`, [
            Facets.maxInclusive(BigInt('18446744073709551615'))
        ]));
        this.define('unsignedInt', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:unsignedLong`, [
            Facets.maxInclusive(4294967295)
        ]));
        this.define('unsignedShort', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:unsignedInt`, [
            Facets.maxInclusive(65535)
        ]));
        this.define('unsignedByte', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:unsignedShort`, [
            Facets.maxInclusive(255)
        ]));
        this.define('positiveInteger', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:nonNegativeInteger`, [
            Facets.minInclusive(1)
        ]));
        this.define('yearMonthDuration', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:duration`, [
            Facets.pattern(['[^DT]*'])
        ]));
        this.define('dayTimeDuration', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:duration`, [
            Facets.pattern(['[^YM]*(T.*)?'])
        ]));
        this.define('dateTimeStamp', XMLNS.XS, this.restrictionOf(`${XMLNS.XS}:dateTime`, [
            Facets.explicitTimezone('required', true)
        ]));
    }

    private defineSpecialTypes() {
        const anyType: ComplexTypeDefinition = { // defined formally: https://www.w3.org/TR/2012/REC-xmlschema11-1-20120405/structures.html#builtin-ctd
            type: 'complex',
            name: 'anyType',
            annotations: [],
            targetNamespace: XMLNS.XS,
            baseTypeDefinition: <any>undefined, // see below
            derivationMethod: 'restriction',
            contentType: {
                variety: 'mixed',
                openContent: undefined,
                particle: {
                    minOccurs: 1,
                    maxOccurs: 1,
                    term: as<ModelGroup>({
                        type: 'modelGroup',
                        compositor: 'sequence',
                        particles: [
                            {
                                minOccurs: 0,
                                maxOccurs: 'unbounded',
                                term: as<Wildcard>({
                                    type: 'wildcard',
                                    namespaceConstraint: {
                                        variety: 'any',
                                        namespaces: [],
                                        disallowedNames: []
                                    },
                                    processContents: 'lax',
                                    annotations: []
                                }),
                                annotations: []
                            }
                        ],
                        annotations: []
                    }),
                    annotations: []
                }
            },
            attributeUses: [],
            attributeWildcard: {
                type: 'wildcard',
                namespaceConstraint: {
                    variety: 'any',
                    namespaces: [],
                    disallowedNames: []
                },
                processContents: 'lax',
                annotations: []
            },
            final: {},
            context: undefined,
            prohibitedSubstitutions: {},
            assertions: [],
            abstract: false
        }
        
        anyType.baseTypeDefinition = this.anyType;
        this.types.set(`${XMLNS.XS}:anyType`, anyType);

        const anySimpleType: SimpleAtomicTypeDefinition = {
            type: 'simple',
            variety: 'atomic',
            name: 'anyAtomicType',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            final: {},
            baseType: anyType,
            ordered: false,
            bounded: false,
            cardinality: 'infinite',
            numeric: false,
            context: undefined,
            primitiveType: <any>undefined,
            facets: [],
        }
    
        const anyAtomicType: SimpleAtomicTypeDefinition = {
            type: 'simple',
            variety: 'atomic',
            name: 'anyAtomicType',
            targetNamespace: XMLNS.XS,
            annotation: undefined,
            baseType: anySimpleType,
            ordered: false,
            bounded: false,
            cardinality: 'infinite',
            primitiveType: <any>undefined,
            context: undefined,
            numeric: false,
            facets: [],
        }

        return { anyType, anySimpleType, anyAtomicType };
    }

    getAllPrimitiveTypes(): SimplePrimitiveTypeDefinition[] {
        let primitiveTypes: SimplePrimitiveTypeDefinition[] = [];

        for (let type of this.types.values()) {
            if (!Types.isPrimitive(type))
                continue;

            primitiveTypes.push(type);
        }

        return primitiveTypes;
    }

    isSpecialType(type: TypeDefinition) {
        return type === this.anyAtomicType || type === this.anySimpleType || type === this.anyType;
    }

    getAllOrdinaryTypes(): TypeDefinition[] {
        let ordinaryTypes: TypeDefinition[] = [];

        for (let type of this.types.values()) {
            if (Types.isPrimitive(type) || this.isSpecialType(type))
                continue;

            ordinaryTypes.push(type);
        }

        return ordinaryTypes;
    }

    getAllNonSpecialSimpleTypes(): SimpleTypeDefinition[] {
        let types: SimpleTypeDefinition[] = [];
        for (let type of this.types.values()) {
            if (!Types.isSimple(type) || this.isSpecialType(type))
                continue;

            types.push(type);
        }

        return types;
    }

    getAllNonSpecialTypes(): TypeDefinition[] {
        return [...this.getAllPrimitiveTypes(), ...this.getAllOrdinaryTypes()];
    }
}

export class Types {
    static isPrimitive(type: TypeDefinition): type is SimplePrimitiveTypeDefinition {
        return Types.isSimple(type) && type.variety === 'atomic' && type.primitiveType === type;
    }

    static isSimple(type: TypeDefinition): type is SimpleTypeDefinition {
        return type.type === 'simple';
    }

    static isComplex(type: TypeDefinition): type is ComplexTypeDefinition {
        return type.type === 'complex';
    }

    static isReference(type: TypeDefinition): type is TypeReference {
        return type.type === 'reference';
    }
}
