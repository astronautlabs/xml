import { Annotation } from "./annotation";
import { XPathExpression } from "./xpath-expression";
import { TypeDefinition } from "./type-definition";

export interface TypeAlternative {
    annotations: Annotation[];
    test: XPathExpression | undefined;
    typeDefinition: TypeDefinition;
}
