import { Annotation } from "./annotation";
import { Scope } from "./scope";
import { ValueConstraint } from "./value-constraint";
import { SimpleTypeDefinition } from "./simple-type-definition";
import { ComplexTypeDefinition } from "./complex-type-definition";
import { AttributeGroupDefinition } from "./attribute-group-definition";

export interface AttributeDeclaration {
    annotations: Annotation[];
    name: string;
    targetNamespace: string | undefined;
    typeDefinition: SimpleTypeDefinition;
    scope: Scope<ComplexTypeDefinition | AttributeGroupDefinition>;
    valueConstraint: ValueConstraint | undefined;
    inheritable: boolean;
}
