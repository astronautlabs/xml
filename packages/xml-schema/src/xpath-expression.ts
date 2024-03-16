import { NamespaceBinding } from "./namespace-binding";

export interface XPathExpression {
    namespaceBindings: NamespaceBinding[];
    defaultNamespace: string | undefined;
    baseURI: string | undefined;
    expression: string;
}
