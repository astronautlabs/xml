/**
 * Represents a type reference that is not yet resolved. This shouldn't be left over after parsing is complete.
 */
export interface TypeReference {
    type: 'reference';
    reference: true;
    name: string;
}