import { Annotation } from "./annotation";
import { ElementDeclaration } from "./element-declaration";
import { ModelGroup } from "./model-group";
import { Term, Terms } from "./term";
import { Wildcard } from "./wildcard";

export interface Particle {
    minOccurs: number;
    maxOccurs: number | 'unbounded';
    term: Term;
    annotations: Annotation[];
}

export class Particles {
    static isModelGroup(particle: Particle): particle is Particle & { term: ModelGroup } { return Terms.isModelGroup(particle.term); }
    static isWildcard(particle: Particle): particle is Particle & { term: Wildcard } { return Terms.isWildcard(particle.term); }
    static isElementDeclaration(particle: Particle): particle is Particle & { term: ElementDeclaration } { return Terms.isElementDeclaration(particle.term); }
}
