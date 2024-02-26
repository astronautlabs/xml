import { AuthnContext } from "./authn-context";

export interface AuthnStatement {
    instant: string;
    sessionIndex?: string;
    sessionNotOnOrAfter?: string;
    context: AuthnContext;
}
