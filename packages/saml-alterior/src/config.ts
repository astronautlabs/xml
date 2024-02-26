import { InjectionToken } from "@alterior/di";

export const SAML_CONFIG = new InjectionToken<SamlConfig>("SAML_CONFIG");
export interface SamlConfig {
    identityProvider: string;
    serviceProvider: string;
}
