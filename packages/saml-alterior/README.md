# @/saml-alterior

Adds support for SAML 2.0 to Alterior applications.

# Installation

```shell
npm install @astronautlabs/saml-alterior
```

# Usage

Add the SamlController to your application:

```typescript
import { WebService, Response } from '@alterior/web-server';
import { SamlModule, SamlController } from '@astronautlabs/saml-alterior';
@WebService({
    imports: [
        SamlModule.configure({
            identityProvider: '...',
            serviceProvider: '...'
        })
    ]
})
class MyService {
    @Mount('/saml') saml: SamlController;

    altAfterInit() {
        this.saml.handleSignInResponse = (response, returnURL) => {
            // Validate the SAML response and set up a security context in some way.
            // Afterwards, redirect the user back to their destination.
            Response.temporaryRedirect(returnURL).throw();
        };
    }
}
```

Now you can send your user to, eg. `example.com/saml?return=RETURNURL`.