import { SubjectConfirmation } from "./subject-confirmation";


export interface Subject {
    nameId?: string;
    confirmations: SubjectConfirmation[];
}
