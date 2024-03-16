import { Wildcard } from "./wildcard";

export interface OpenContent {
    mode: 'interleave' | 'suffix';
    wildcard: Wildcard;
}
