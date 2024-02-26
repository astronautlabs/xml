import { SamlStatus } from "./status";

export interface StatusResponse {
    id: string;
    inResponseTo?: string;
    version: string;
    issueInstant: string;
    destination?: string;
    consent?: string;
    issuer?: string;
    signature?: string;
    status: SamlStatus;
}
