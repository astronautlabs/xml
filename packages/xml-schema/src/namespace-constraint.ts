import { QName } from "./type-registry";

export interface NamespaceConstraint {
    variety: 'any' | 'enumeration' | 'not';
    namespaces: (string | undefined)[];
    disallowedNames: (QName | 'defined' | 'sibling')[];
}
