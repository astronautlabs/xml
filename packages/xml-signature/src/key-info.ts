import { KeyValue } from "./key-value";
import { PGPData } from "./pgp-data";
import { SPKIData } from "./spki-data";
import { X509Data } from "./x509-data";


export interface KeyInfo {
    keyNames: string[];
    keyValues: KeyValue[];
    x509Data: X509Data[];
    pgpData: PGPData[];
    spkiData: SPKIData[];
    mgmtData: string[];
}
