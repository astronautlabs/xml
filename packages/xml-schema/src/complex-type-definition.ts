import { Annotation } from "./annotation";
import { Assertion } from "./assertion";
import { AttributeUse } from "./attribute-use";
import { ContentType } from "./content-type";
import { ElementDeclaration } from "./element-declaration";
import { Wildcard } from "./wildcard";
import { TypeDefinition } from "./type-definition";

export interface ComplexTypeDefinition {
    type: 'complex';
    targetNamespace: string;
    name: string | undefined;
    annotations: Annotation[];
    baseTypeDefinition: TypeDefinition;
    final: { extension?: true; restriction?: true; };
    context: ElementDeclaration | ComplexTypeDefinition | undefined;
    derivationMethod: 'extension' | 'restriction';
    abstract: boolean;
    attributeUses: AttributeUse[];
    attributeWildcard: Wildcard | undefined;
    contentType: ContentType;
    prohibitedSubstitutions: { extension?: true; restriction?: true; };
    assertions: Assertion[];
}