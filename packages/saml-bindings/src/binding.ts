import { ValueOf } from "./utils";

export const BINDING_PREFIX = 'urn:oasis:names:tc:SAML:2.0:bindings';

export const Bindings = {
    HTTPRedirect: `${BINDING_PREFIX}:HTTP-Redirect`,
    HTTPPost: `${BINDING_PREFIX}:HTTP-Post`,
} as const;

export type Binding = ValueOf<typeof Bindings>;
