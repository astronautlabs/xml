import { Annotation } from "./annotation";
import { XPathExpression } from "./xpath-expression";

export interface Assertion {
    annotations: Annotation[];
    test: XPathExpression;
}
