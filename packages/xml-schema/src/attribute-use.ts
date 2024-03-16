import { Annotation } from "./annotation";
import { AttributeDeclaration } from "./attribute-declaration";
import { ValueConstraint } from "./value-constraint";

export interface AttributeUse {
    annotations: Annotation[];
    required: boolean;
    attributeDeclaration: AttributeDeclaration;
    valueConstraint: ValueConstraint | undefined;
    inheritable: boolean;

    /**
     * Note: Deviation from spec
     */
    prohibited: boolean | undefined;
}
