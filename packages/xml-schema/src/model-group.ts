import { Annotation } from "./annotation";
import { Particle } from "./particle";

export interface ModelGroup {
    type: 'modelGroup';
    annotations: Annotation[];
    compositor: 'all' | 'choice' | 'sequence';
    particles: Particle[];
}
