import { Endpoint } from "./endpoint";

export interface IndexedEndpoint extends Endpoint {
    index: number;
    isDefault: boolean;
}
