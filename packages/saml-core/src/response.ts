import { StatusResponse } from "./status-response";
import { Assertion } from "./assertion";


export interface Response extends StatusResponse {
    assertions: Assertion[];
}
