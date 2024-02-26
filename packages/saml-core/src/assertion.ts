import { Subject } from "./subject";
import { Conditions } from "./conditions";
import { AuthnStatement } from "./authn-statement";
import { AttributeStatement } from "./attribute-statement";

export interface Assertion {
    version: string;
    id: string;
    issueInstant: string;
    issuer: string;
    signature?: string;
    subject?: Subject;
    conditions?: Conditions;
    authnStatements: AuthnStatement[];
    attributeStatements: AttributeStatement[];
}
