import { ComplexTypeDefinition } from "./complex-type-definition";
import { SimpleTypeDefinition } from "./simple-type-definition";
import { TypeReference } from "./type-reference";

export type TypeDefinition = SimpleTypeDefinition | ComplexTypeDefinition | TypeReference;
