export interface Conditions {
    notBefore?: string;
    notOnOrAfter?: string;
    oneTimeUse: boolean;
    audiences: string[];
}
