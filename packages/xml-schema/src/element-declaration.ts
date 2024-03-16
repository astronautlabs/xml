import { Annotation } from "./annotation";
import { IdentityConstraintDefinition } from "./identity-constraint-definition";
import { TypeTable } from "./type-table";
import { TypeDefinition } from "./type-definition";
import { Scope } from "./scope";
import { ValueConstraint } from "./value-constraint";
import { ComplexTypeDefinition } from "./complex-type-definition";
import { ModelGroupDefinition } from "./model-group-definition";

export interface ElementDeclaration {
    type: 'elementDeclaration';
    annotations: Annotation[];
    name: string;
    targetNamespace: string | undefined;
    typeDefinition: TypeDefinition;
    typeTable: TypeTable | undefined;
    scope: Scope<ComplexTypeDefinition | ModelGroupDefinition>;
    valueConstraint: ValueConstraint | undefined;
    nillable: boolean;
    identityConstraintDefinitions: IdentityConstraintDefinition[];
    substitutionGroupAffiliations: ElementDeclaration[];
    substitutionGroupExclusions: { extension?: true; restriction?: true; };
    disallowedSubstitutions: { substitution?: true; extension?: true; restriction?: true; };
    abstract: boolean;
}
