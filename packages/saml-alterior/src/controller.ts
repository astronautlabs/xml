import { Base64 } from "@alterior/common";
import { inject } from "@alterior/di";
import { Body, Controller, Get, Post, QueryParam, Response, WebEvent } from "@alterior/web-server";
import * as SAMLCore from "@astronautlabs/saml-core";
import { SAML_CONFIG } from "./config";

@Controller()
export class SamlController {
    private config = inject(SAML_CONFIG);
    handleSignInResponse?: (response: SAMLCore.Response, returnUrl?: string) => void;

    @Get()
    async signIn(@QueryParam('return') returnUrl: string) {
        Response.temporaryRedirect(
            await SAMLCore.AuthnRequest.create({
                serviceProvider: this.config.serviceProvider,
                identityProvider: this.config.identityProvider,
                relayState: Base64.encode(returnUrl)
            })
        );
    }

    @Post()
    async assertionConsumer(@Body() data: string) {
        if (WebEvent.request.headers['content-type'] !== 'application/x-www-form-urlencoded') {
            Response.badRequest().throw();
        }

        let url = new URL(`internal://localhost/?${data}`);
        let encodedRelayState = url.searchParams.get('RelayState');
        let returnUrl = encodedRelayState ? Base64.decode(encodedRelayState) : undefined;
        let encodedResponse = url.searchParams.get('SAMLResponse');
        if (!encodedResponse)
            Response.badRequest().throw();

        let response = await SAMLCore.Parser.parseResponse(encodedResponse!);
        this.handleSignInResponse?.(response, returnUrl);
    }
}
