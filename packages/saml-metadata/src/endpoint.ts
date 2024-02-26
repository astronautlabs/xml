import { Binding } from "@astronautlabs/saml-bindings";

export interface Endpoint {
    binding: Binding;
    location: string;
    responseLocation?: string;
}
