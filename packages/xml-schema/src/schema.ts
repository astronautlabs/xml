import { Annotation } from "./annotation";
import { TypeDefinition } from "./type-definition";
import { AttributeDeclaration } from "./attribute-declaration";
import { AttributeGroupDefinition } from "./attribute-group-definition";
import { ElementDeclaration } from "./element-declaration";
import { IdentityConstraintDefinition } from "./identity-constraint-definition";
import { NotationDeclaration } from "./notation-declaration";
import { ModelGroupDefinition } from "./model-group-definition";

export interface Schema {
    annotations: Annotation[];
    typeDefinitions: TypeDefinition[];
    attributeDeclarations: AttributeDeclaration[];
    elementDeclarations: ElementDeclaration[];
    attributeGroupDefinitions: AttributeGroupDefinition[];
    modelGroupDefinitions: ModelGroupDefinition[];
    notationDeclarations: NotationDeclaration[];
    identityConstraintDefinitions: IdentityConstraintDefinition[];
}
