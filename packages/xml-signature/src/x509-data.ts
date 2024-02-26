
export interface X509IssuerSerial {
    issuerName: string;
    serialNumber: string;
}

export interface X509Data {
    issuerSerials: X509IssuerSerial[];
    subjectNames: string[];
    subjectKeyIdentifiers: string[];
    certificates: string[];
    certificateRevocationLists: string[];
    digests: string[];
}
