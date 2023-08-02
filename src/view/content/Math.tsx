import React, { DetailedHTMLProps, HTMLAttributes, useCallback, useEffect, useState } from 'react'
import { BoxedExpression, ComputeEngine } from '@cortex-js/compute-engine';
import { MathsLoupe, MathsLoupeC, QiC, QiT } from '../../core/Model';
import { RichText } from './RichText';
import { convertLatexToAsciiMath } from 'mathlive';
import { JSONContent } from '@tiptap/react';
import { Qi } from '../../core/Qi';
import { DOMAttributes } from "react";
import { MathfieldElementAttributes } from 'mathlive'
import { Group } from '../structure/Group';

type CustomElement<T> = Partial<T & DOMAttributes<T>>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ["math-field"]: CustomElement<MathfieldElementAttributes>;
    }
  }
}

export const Math = (props: { equationString: string, loupe: MathsLoupe, children?: any, updateContent?: (event:any ) => void }) => {
    console.log("equationString", props.equationString)
    const ce = new ComputeEngine();
    const [outputEquationString, setOutputEquationString] = useState("");
    const mathFieldRef = React.useRef<HTMLInputElement>()

    useEffect(() => {
        let expression: BoxedExpression = ce.parse(props.equationString);

        // Configure evaluation mode
        switch (props.loupe.evaluationLenses[props.loupe.selectedEvaluationLens]) {
            case "identity":
                // Do nothing
                break;
            case "evaluate":
                // @ts-ignore
                expression = expression.evaluate();
                break;
            case "simplify":
                // @ts-ignore
                expression = expression.simplify();
                break;
            case "numeric":
                // @ts-ignore
                expression = expression.N();
                break;
        }

        // Check display lens to determine which format to display output
        let newOutputEquationString = "";
        switch (props.loupe.displayLenses[props.loupe.selectedDisplayLens]) {
            case "latex":
                // @ts-ignore
                newOutputEquationString = expression.latex;
                break;
            case "linear":
                // @ts-ignore
                newOutputEquationString = convertLatexToAsciiMath(expression.latex);
                break;
            case "mathjson":
                newOutputEquationString = expression.toString();
                break;
            case "natural":
                // N/A
                // @ts-ignore
                newOutputEquationString = expression.latex;
                break;
            default:
                break;
        }

        setOutputEquationString(newOutputEquationString);
        console.log("output", outputEquationString)
    }, [props.equationString, props.loupe, outputEquationString]);


    return (
        <>
            {
                {
                    'natural':
                        <math-field style={{border: 'none'}} ref={mathFieldRef} onInput={(event: any) => {
                            if (props.updateContent) {
                                props.updateContent(mathFieldRef.current?.value) 
                            }
                        }}>
                            {/* TODO: Make this read only */}
                            {props.equationString}
                        </math-field>,
                    'latex':
                        <math-field style={{border: 'none'}} ref={mathFieldRef} onInput={(event: any) => {
                            if (props.updateContent) {
                                props.updateContent(mathFieldRef.current?.value) 
                            }
                        }}>
                            {/* TODO: Make this read only */}
                            {props.equationString}
                            latex
                        </math-field>,
                    'linear': 
                        <RichText
                            text={outputEquationString}
                            lenses={["code"]}
                        />,
                    'mathjson':
                        <RichText
                            text={outputEquationString}
                            lenses={["code"]}
                        />,
                }[props.loupe.displayLenses[props.loupe.selectedDisplayLens]]
            }
        </>
    )
}

export const MathsWithoutQi = () => {
    return (
        <div>
            <math-field>
                \frac{1}{2}
            </math-field>
        </div>
    )
}

export const MathNaturalExample = () => {
    const computation = `10 * 12`
    const quadraticFormula = String.raw`x=\frac{-b\pm \sqrt{b^2-4ac}}{2a}`
    let qi: QiT = new QiC()
    // qi.informationTypeName = 'maths' 
    let mathsLoupe = new MathsLoupeC()
    let equationString = computation;
    const content = `
    $$
        \frac{1}{2}
    $$
    `
    const parsedContent = `
    <math-live>
        \frac{1}{2}
    </math-live>
    `
    return (
        <Math equationString={equationString} loupe={mathsLoupe} updateContent={() => { return }} />
    )
}

export const MathWithQiExample = () => {
    const computation = `10 * 12`
    const quadraticFormula = String.raw`x=\frac{-b\pm \sqrt{b^2-4ac}}{2a}`
    let qi: QiT = new QiC()
    qi.informationTypeName = "latex"
    let mathsLoupe = new MathsLoupeC()
    let equationString = computation;
    return (
        <Qi qiId={'000000'} userId={'000000'} loupe={mathsLoupe} />
    )
}