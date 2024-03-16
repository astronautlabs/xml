import { ElementDeclaration } from "./element-declaration";
import { ModelGroup } from "./model-group";
import { Wildcard } from "./wildcard";

export type Term = Wildcard | ElementDeclaration | ModelGroup;

export class Terms {
    static isWildcard(term: Term): term is Wildcard { return term.type === 'wildcard'; }
    static isElementDeclaration(term: Term): term is ElementDeclaration { return term.type === 'elementDeclaration'; }
    static isModelGroup(term: Term): term is ModelGroup { return term.type === 'modelGroup'; }
}