'use client'

import { Doc } from 'yjs'
import { JSONContent } from "@tiptap/react";
import { TiptapTransformer } from '@hocuspocus/transformer'
import { computed, makeAutoObservable, makeObservable, observable } from "mobx";
import * as Y from 'yjs'

// SunT represents the store that holds all other Quanta
// It's similar to the root and subdocuments model referenced in Y.js 
export type SunT = QuantaType

export type QuantaId = string;
export type QuantaType = {
    information: Doc, 
    informationText: string,
    informationTypeName: TypeName, 
    loupe: Loupe,
    lens: Lens,
    id: QuantaId, 
    // userId: string, // Ignore user authentication for now
    relations: Set<QuantaId>, // Just parse the doc for relations
    // maybe caching for calculations
}
export class QuantaClass implements QuantaType {
    information: Doc = new Y.Doc();
    informationTypeName: TypeName = "jsonContent";
    lens: Lens = "normalText";
    loupe: Loupe = [];

    constructor() {
        makeObservable(this, {
            information: observable,
            informationText: computed,
            informationTypeName: observable,
            id: computed,
            relations: computed
        })
    }

    get id() {
        return this.information.guid 
    }

    get relations() {
        return this.information.getSubdocGuids()
    }

    get informationText() {
        // const editor = CustomisedEditor(this.information);
        const prosemirrorJSON: JSONContent = TiptapTransformer.fromYdoc(this.information)
        // console.log(prosemirrorJSON)
        if (prosemirrorJSON.text) {
            return prosemirrorJSON.text
        } else {
            return ""
        }
    }
}

export type TypeName = Content 

// | Structure | Reference

export type Content = RichText | MathEquation
// If we switch from one node to another, the marks and other styling information should be preserved. 
// So the paradigm of viewing information in many different ways isn't really possible
// TODO: This type, shouldn't refer to Node, Node is a way of viewing a type, it should refer to the data inside the schema
// Call this text, not rich text, since the lenses make it rich
export type RichText = "yDoc" | "jsonContent" | "string"
export type RichTextT = Y.Doc | JSONContent | string
export type MathEquation = "latex" | "ascii-math" | "math-live-boxed-json-expression"
export type Latex = string

export type Structure = Group | Calculation
export type Group = Content[]
// Portal<MathEquation>
export type Calculation = (MathEquation & Portal)

export type Reference = Portal
export type Portal = string

export type Loupe = MathsLoupe | IdentityLoupe

export type IdentityLoupe = Lens[]

export type MathsLoupe = {
    readonly displayLenses: DisplayLens[],
    selectedDisplayLens: number, // index
    readonly evaluationLenses: EvaluationLens[],
    selectedEvaluationLens: number, // index
    readonly notationLenses: NotationLens[],
    selectedNotationLens: number, // index
    readonly precisionLenses: PrecisionLens[],
    selectedPrecisionLens: number, // index
    readonly fractionLenses: FractionLens[],
    selectedFractionLens: number, // index
    readonly baseNLenses: BaseNLens[]
    selectedBaseNLens: number, // index
}
export class MathsLoupeC implements MathsLoupe {
    readonly displayLenses: DisplayLens[] = [...displayLenses];
    selectedDisplayLens: number = 1;
    readonly evaluationLenses: EvaluationLens[] = [...evaluationLenses];
    selectedEvaluationLens: number = 0;
    readonly notationLenses: NotationLens[] = [...notationLenses];
    selectedNotationLens: number = 0;
    readonly precisionLenses: PrecisionLens[] = [...precisionLenses];
    selectedPrecisionLens: number = 0;
    readonly fractionLenses: FractionLens[] = [...fractionLenses];
    selectedFractionLens: number = 0;
    readonly baseNLenses: BaseNLens[] = [...baseNLenses];
    selectedBaseNLens: number = 0;

    constructor() {
        makeAutoObservable(this)
    }
}

export type Lens = MathLens | RichTextLens | "Other"

export type MathLens = DisplayLens | EvaluationLens | NotationLens | PrecisionLens | FractionLens | BaseNLens
export const displayLenses = ["latex", "natural", "linear", "mathjson"] as const
export type DisplayLens = typeof displayLenses[number]
export const evaluationLenses = ["identity", "evaluate", "simplify", "numeric"] as const
export type EvaluationLens = typeof evaluationLenses[number]
export const notationLenses = ["normal", "scientific", "engineering"] as const
export type NotationLens = typeof notationLenses[number]
export const precisionLenses = ["15", "100", "number"] as const
export type PrecisionLens = typeof precisionLenses[number]
export const fractionLenses = ["decimal", "simplified", "mixed"] as const
export type FractionLens = typeof fractionLenses[number]
export const baseNLenses = ["decimal", "octal", "hexadecimal", "binary"] as const
export type BaseNLens = typeof baseNLenses[number]

export const mathsLenses = [...displayLenses, ...evaluationLenses, ...notationLenses, ...precisionLenses, ...fractionLenses, ...baseNLenses] as const

// TODO: Use the const literal assertion in the same way here
export type RichTextLens = TextMarkLens | TextSectionLens
export type TextMarkLens = "normalText" 
export type TextSectionLens = "code" | "text"