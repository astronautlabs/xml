import { Annotation } from "./annotation";
import { AttributeDeclaration } from "./attribute-declaration";
import { ComplexTypeDefinition } from "./complex-type-definition";
import { ElementDeclaration } from "./element-declaration";
import { Facet } from "./facets";
import { TypeDefinition } from "./type-definition";

export type SimpleTypeDefinition = SimpleAtomicTypeDefinition | SimplePrimitiveTypeDefinition | SimpleListTypeDefinition | SimpleUnionTypeDefinition;

interface SimpleTypeDefinitionBase {
    type: 'simple';
    targetNamespace: string | undefined;
    name: string | undefined;
    context: AttributeDeclaration | ElementDeclaration | ComplexTypeDefinition | SimpleTypeDefinition | undefined;
    ordered: false | 'partial' | 'total';
    bounded: boolean;
    cardinality: 'finite' | 'infinite';
    numeric: boolean;
    annotation: Annotation | undefined;
    final?: { restriction?: true; extension?: true; list?: true; union?: true; };
    baseType: TypeDefinition;

    facets: Facet[];
}

export interface SimpleAtomicTypeDefinition extends SimpleTypeDefinitionBase {
    variety: 'atomic';
    primitiveType: SimplePrimitiveTypeDefinition;
}

export interface SimplePrimitiveTypeDefinition extends SimpleAtomicTypeDefinition {
    parseValue: (lexicalForm: string, contextElement: Element | undefined) => any;
    valueToString: (actualValue: any) => string;
}
 
export interface SimpleListTypeDefinition extends SimpleTypeDefinitionBase {
    variety: 'list';
    itemType: SimpleAtomicTypeDefinition | SimpleUnionTypeDefinition;

}
 
export interface SimpleUnionTypeDefinition extends SimpleTypeDefinitionBase {
    variety: 'union';
    memberTypes: SimpleTypeDefinition[];
}
 
export class SimpleTypes {
    static isAtomic(type: SimpleTypeDefinition): type is SimpleAtomicTypeDefinition { return type.variety === 'atomic'; }
    static isList(type: SimpleTypeDefinition): type is SimpleListTypeDefinition { return type.variety === 'list'; }
    static isUnion(type: SimpleTypeDefinition): type is SimpleUnionTypeDefinition { return type.variety === 'union'; }
}