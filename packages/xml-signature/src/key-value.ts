import { DSAKeyValue } from "./dsa-key-value";
import { RSAKeyValue } from "./rsa-key-value";


export type KeyValue = DSAKeyValue | RSAKeyValue | Element;
