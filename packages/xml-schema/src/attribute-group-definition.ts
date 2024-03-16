import { Annotation } from "./annotation";
import { Wildcard } from "./wildcard";
import { AttributeUse } from "./attribute-use";

export interface AttributeGroupDefinition {
    annotations: Annotation[];
    name: string;
    targetNamespace: string | undefined;
    attributeUses: AttributeUse[];
    attributeWildcard: Wildcard | undefined;
}
