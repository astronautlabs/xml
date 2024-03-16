import { Annotation } from "./annotation";
import { Assertion } from "./assertion";

export type Facet = LengthFacet
                    | MinLengthFacet
                    | MaxLengthFacet
                    | PatternFacet
                    | EnumerationFacet
                    | WhiteSpaceFacet
                    | MaxInclusiveFacet
                    | MaxExclusiveFacet
                    | MinExclusiveFacet
                    | MinInclusiveFacet
                    | TotalDigitsFacet
                    | FractionDigitsFacet
                    | AssertionsFacet
                    | ExplicitTimezoneFacet;

export interface LengthFacet {
    type: 'length';
    annotations: Annotation[];
    value: number;
    fixed: boolean;
}

export interface MinLengthFacet {
    type: 'minLength';
    annotations: Annotation[];
    value: number;
    fixed: boolean;
}

export interface MaxLengthFacet {
    type: 'maxLength';
    annotations: Annotation[];
    value: number;
    fixed: boolean;
}

export interface PatternFacet {
    type: 'pattern';
    annotations: Annotation[];
    value: string[];
}

export interface EnumerationFacet {
    type: 'enumeration';
    annotations: Annotation[];
    value: any[];
}

export interface WhiteSpaceFacet {
    type: 'whiteSpace';
    annotations: Annotation[];
    value: 'preserve' | 'replace' | 'collapse';
    fixed: boolean;
}

export interface MaxInclusiveFacet {
    type: 'maxInclusive';
    annotations: Annotation[];
    value: number | BigInt;
    fixed: boolean;
}

export interface MaxExclusiveFacet {
    type: 'maxExclusive';
    annotations: Annotation[];
    value: number | BigInt;
    fixed: boolean;
}

export interface MinExclusiveFacet {
    type: 'minExclusive';
    annotations: Annotation[];
    value: number | BigInt;
    fixed: boolean;
}

export interface MinInclusiveFacet {
    type: 'minInclusive';
    annotations: Annotation[];
    value: number | BigInt;
    fixed: boolean;
}

export interface TotalDigitsFacet {
    type: 'totalDigits';
    annotations: Annotation[];
    value: number;
    fixed: boolean;
}

export interface FractionDigitsFacet {
    type: 'fractionDigits';
    annotations: Annotation[];
    value: number;
    fixed: boolean;
}

export interface AssertionsFacet {
    type: 'assertions';
    annotations: Annotation[];
    value: Assertion[];
}

export interface ExplicitTimezoneFacet {
    type: 'explicitTimezone';
    annotations: Annotation[];
    value: 'required' | 'prohibited' | 'optional';
    fixed: boolean;
}


export const Facets = {
    isAssertions(facet: Facet): facet is AssertionsFacet { return facet.type === 'assertions'; },
    isEnumeration(facet: Facet): facet is EnumerationFacet { return facet.type === 'enumeration'; },
    isExplicitTimezone(facet: Facet): facet is ExplicitTimezoneFacet { return facet.type === 'explicitTimezone'; },
    isFractionDigits(facet: Facet): facet is FractionDigitsFacet { return facet.type === 'fractionDigits'; },
    isLength(facet: Facet): facet is LengthFacet { return facet.type === 'length'; },
    isMaxExclusive(facet: Facet): facet is MaxExclusiveFacet { return facet.type === 'maxExclusive'; },
    isMaxInclusive(facet: Facet): facet is MaxInclusiveFacet { return facet.type === 'maxInclusive'; },
    isMaxLength(facet: Facet): facet is MaxLengthFacet { return facet.type === 'maxLength'; },
    isMinExclusive(facet: Facet): facet is MinExclusiveFacet { return facet.type === 'minExclusive'; },
    isMinInclusive(facet: Facet): facet is MinInclusiveFacet { return facet.type === 'minInclusive'; },
    isMinLength(facet: Facet): facet is MinLengthFacet { return facet.type === 'minLength'; },
    isPattern(facet: Facet): facet is PatternFacet { return facet.type === 'pattern'; },
    isTotalDigits(facet: Facet): facet is TotalDigitsFacet { return facet.type === 'totalDigits'; },
    isWhiteSpace(facet: Facet): facet is WhiteSpaceFacet { return facet.type === 'whiteSpace'; },

    create<T, V>(type: T, value: V, fixed = false) {
        return {
            type,
            annotations: [],
            value,
            fixed
        };
    },

    assertions       (value: AssertionsFacet       ['value'], fixed = false): AssertionsFacet       { return this.create('assertions', value, fixed); },
    enumeration      (value: EnumerationFacet      ['value'], fixed = false): EnumerationFacet      { return this.create('enumeration', value, fixed); },
    explicitTimezone (value: ExplicitTimezoneFacet ['value'], fixed = false): ExplicitTimezoneFacet { return this.create('explicitTimezone', value, fixed); },
    fractionDigits   (value: FractionDigitsFacet   ['value'], fixed = false): FractionDigitsFacet   { return this.create('fractionDigits', value, fixed); },
    length           (value: LengthFacet           ['value'], fixed = false): LengthFacet           { return this.create('length', value, fixed); },
    maxExclusive     (value: MaxExclusiveFacet     ['value'], fixed = false): MaxExclusiveFacet     { return this.create('maxExclusive', value, fixed); },
    maxInclusive     (value: MaxInclusiveFacet     ['value'], fixed = false): MaxInclusiveFacet     { return this.create('maxInclusive', value, fixed); },
    maxLength        (value: MaxLengthFacet        ['value'], fixed = false): MaxLengthFacet        { return this.create('maxLength', value, fixed); },
    minExclusive     (value: MinExclusiveFacet     ['value'], fixed = false): MinExclusiveFacet     { return this.create('minExclusive', value, fixed); },
    minInclusive     (value: MinInclusiveFacet     ['value'], fixed = false): MinInclusiveFacet     { return this.create('minInclusive', value, fixed); },
    minLength        (value: MinLengthFacet        ['value'], fixed = false): MinLengthFacet        { return this.create('minLength', value, fixed); },
    pattern          (value: PatternFacet          ['value'], fixed = false): PatternFacet          { return this.create('pattern', value, fixed); },
    totalDigits      (value: TotalDigitsFacet      ['value'], fixed = false): TotalDigitsFacet      { return this.create('totalDigits', value, fixed); },
    whiteSpace       (value: WhiteSpaceFacet       ['value'], fixed = false): WhiteSpaceFacet       { return this.create('whiteSpace', value, fixed); },
}