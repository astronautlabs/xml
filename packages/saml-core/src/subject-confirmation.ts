import { SubjectConfirmationData } from "./subject-confirmation-data";


export interface SubjectConfirmation {
    method: string;
    nameId?: string;
    data?: SubjectConfirmationData;
}
