import { Annotation } from "./annotation";

export interface NotationDeclaration {
    annotations: Annotation[];
    name: string;
    targetNamespace: string | undefined;
    systemIdentifier: string | undefined;
    publicIdentifier: string | undefined;
}
