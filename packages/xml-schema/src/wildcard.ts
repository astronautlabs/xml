import { Annotation } from "./annotation";
import { NamespaceConstraint } from "./namespace-constraint";

export interface Wildcard {
    type: 'wildcard';
    annotations: Annotation[];
    namespaceConstraint: NamespaceConstraint;
    processContents: 'skip' | 'strict' | 'lax';
}
