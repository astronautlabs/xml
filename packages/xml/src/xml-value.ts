
export class XmlValue {
    constructor(readonly type: string | undefined, readonly value: string) {
    }
    
    static parse(type: string, value: string): any {
        switch (type) {
            case 'xs:string':
            case 'xs:duration':
                return value;
            case 'xs:integer':
            case 'xs:int':
            case 'xs:decimal':
            case 'xs:float':
            case 'xs:double':
                return Number(value);
            case 'xs:boolean':
                return this.parseBoolean(value);
            default:
                return new XmlValue(type, value);
        }
    }

    static parseBoolean(value: string): boolean;
    static parseBoolean(value: string, defaultValue: boolean): boolean;
    static parseBoolean(value: string | undefined): boolean | undefined;
    static parseBoolean(value: string | undefined, defaultValue: boolean): boolean;
    static parseBoolean(value: string | undefined, defaultValue?: boolean): boolean | undefined {
        if (value === undefined)
            return defaultValue;
        return ['true', '1'].includes(value);
    }
}
