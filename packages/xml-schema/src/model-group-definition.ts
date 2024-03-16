import { Annotation } from "./annotation";
import { ModelGroup } from "./model-group";

export interface ModelGroupDefinition {
    annotations: Annotation[];
    name: string;
    targetNamespace: string | undefined;
    modelGroup: ModelGroup;
}
