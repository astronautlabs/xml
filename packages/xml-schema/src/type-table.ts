import { TypeAlternative } from "./type-alternative";

export interface TypeTable {
    alternatives: TypeAlternative[];
    defaultTypeDefinition: TypeAlternative;
}
