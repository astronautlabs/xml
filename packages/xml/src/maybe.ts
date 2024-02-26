
export abstract class Maybe<T> {
    abstract bind<U>(func: (value: T) => Maybe<U>): Maybe<U>;
    abstract optional(): T | undefined;

    map<U>(func: (t: T) => U | undefined): Maybe<U> {
        return this.bind(value => maybe(func(value)));
    }

    or<U>(func: () => U | undefined): Maybe<T | U> {
        let value = this.optional();
        if (value)
            return this;
        return maybe(func());
    }

    required(): T {
        let value = this.optional();
        if (value === undefined)
            throw new Error(`Value is required`);
        return value;
    }
};

export class Just<T> extends Maybe<T> {
    constructor(private value: T) {
        super();
    }

    override bind<U>(func: (value: T) => Maybe<U>): Maybe<U> {
        return func(this.value);
    }

    override optional(): T | undefined {
        return this.value;
    }
}

export class Nothing<T> extends Maybe<T> {
    override bind<U>(func: (value: T) => Maybe<U>): Maybe<U> {
        return NOTHING;
    }

    override optional(): T | undefined {
        return undefined;
    }
}

export const NOTHING = new Nothing<any>();

export function maybe<T>(value: T | null | undefined): Maybe<T> {
    return value === null || value === undefined ? NOTHING : new Just(value);
}