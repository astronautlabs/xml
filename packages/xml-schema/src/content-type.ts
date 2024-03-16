import { OpenContent } from "./open-content";
import { Particle } from "./particle";
import { SimpleTypeDefinition } from "./simple-type-definition";

export type ContentType = EmptyContentType | MixedContentType | ElementOnlyContentType | SimpleContentType;

export interface EmptyContentType {
    variety: 'empty';
}

export interface MixedContentType {
    variety: 'mixed';
    particle: Particle;
    openContent: OpenContent | undefined;
}

export interface ElementOnlyContentType {
    variety: 'element-only';
    particle: Particle;
    openContent: OpenContent | undefined;
}

export interface SimpleContentType {
    variety: 'simple';
    simpleTypeDefinition: SimpleTypeDefinition;
}

export class ContentTypes {
    static isEmpty(value: ContentType): value is EmptyContentType { return value.variety === 'empty'; }
    static isMixed(value: ContentType): value is MixedContentType { return value.variety === 'mixed'; }
    static isElementOnly(value: ContentType): value is ElementOnlyContentType { return value.variety === 'element-only'; }
    static isSimple(value: ContentType): value is SimpleContentType { return value.variety === 'simple'; }
}