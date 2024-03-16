import { Annotation } from "./annotation";
import { XPathExpression } from "./xpath-expression";

export interface IdentityConstraintDefinition {
    annotations: Annotation[];
    name: string;
    targetNamespace: string | undefined;
    identityConstraintCategory: 'key' | 'keyref' | 'unique';
    selector: XPathExpression;
    fields: XPathExpression[];
    referencedKey: IdentityConstraintDefinition | undefined;
}
