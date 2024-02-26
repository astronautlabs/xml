import { Base64 } from '@alterior/common';
import { v4 as uuid } from 'uuid';
import { deflate } from './utils';

export interface AuthnRequestInit {
    id?: string;
    issueInstant?: Date;
    serviceProvider: string;
    identityProvider: string;
    relayState?: string;
}

export class AuthnRequest {
    constructor(readonly init: AuthnRequestInit) {
        this.id = init.id ?? uuid();
        this.issueInstant = init.issueInstant ?? new Date();
        this.serviceProvider = init.serviceProvider;
        this.identityProvider = init.identityProvider;
        this.relayState = init.relayState;
    }

    static async create(init: AuthnRequestInit): Promise<string> {
        return await new AuthnRequest(init).url();
    }

    id: string;
    issueInstant: Date;
    serviceProvider: string;
    identityProvider: string;
    relayState?: string;

    get xml() {
        return `
            <samlp:AuthnRequest
                xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="${this.id}"
                Version="2.0"
                IssueInstant="${this.issueInstant.toUTCString()}"
                AssertionConsumerServiceIndex="0"
                AttributeConsumingServiceIndex="0">
                <saml:Issuer>${this.serviceProvider}</saml:Issuer>
                <samlp:NameIDPolicy
                    AllowCreate="true"
                    Format="urn:oasis:names:tc:SAML:2.0:nameid-format:transient"
                    />
            </samlp:AuthnRequest>
        `;
    }

    async url() {
        let url = new URL(this.identityProvider);
        url.searchParams.set('SAMLRequest', await this.encoded());
        if (this.relayState)
            url.searchParams.set('RelayState', this.relayState);
        return url.toString();
    }

    private async encoded() {
        return Base64.encodeBytes(await deflate(this.xml));
    }

}