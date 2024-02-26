import { RoleDescriptor } from "./role-descriptor";
import { Endpoint } from "./endpoint";
import { IndexedEndpoint } from "./indexed-endpoint";

export interface SSODescriptor extends RoleDescriptor {
    nameIdFormats: string[];
    artifactResolutionServices: IndexedEndpoint[];
    singleLogoutServices: Endpoint[];
    manageNameIDServices: Endpoint[];
}
