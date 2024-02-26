import { ConfiguredModule, Module } from "@alterior/di";
import { SAML_CONFIG, SamlConfig } from "./config";

@Module()
export class SamlModule {
    static configure(config: SamlConfig): ConfiguredModule {
        return {
            $module: SamlModule,
            providers: [
                { provide: SAML_CONFIG, useValue: config }
            ]
        };
    }
}