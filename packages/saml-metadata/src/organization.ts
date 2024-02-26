import { LocalizedName } from "./localized-name";
import { LocalizedURI } from "./localized-uri";


export interface Organization {
    names: LocalizedName[];
    displayNames: LocalizedName[];
    urls: LocalizedURI[];
    extensions?: Element;
}
