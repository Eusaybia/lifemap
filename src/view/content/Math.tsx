import React, { DetailedHTMLProps, HTMLAttributes, useCallback, useEffect, useState } from 'react'
import { BoxedExpression, ComputeEngine } from '@cortex-js/compute-engine';
import { DisplayLens, EvaluationLens, MathLens, MathsLoupe, MathsLoupeC, QiC, QiT } from '../../core/Model';
import { RichText } from './RichText';
import { convertLatexToAsciiMath } from 'mathlive';
import { JSONContent } from '@tiptap/react';
import { Qi } from '../../core/Qi';
import { DOMAttributes } from "react";
import { MathfieldElementAttributes } from 'mathlive'
import { Group } from '../structure/Group';
import { observer } from 'mobx-react-lite';
import { motion } from 'framer-motion';
import { Attrs } from 'prosemirror-model';
import { getMathsLoupeFromAttributes } from '../../utils/utils';

type CustomElement<T> = Partial<T & DOMAttributes<T>>;

declare global {
    namespace JSX {
        interface IntrinsicElements {
            ["math-field"]: CustomElement<MathfieldElementAttributes>;
        }
    }
}

export const Math = observer((props: { equationString: string, lensDisplay: DisplayLens, lensEvaluation: EvaluationLens, children?: any, updateContent?: (event: any) => void }) => {
    const ce = new ComputeEngine();
    const mathFieldRef = React.useRef<HTMLInputElement>()

    let nonStateOutputEquationString = props.equationString
    const [outputEquation, setOutputEquation] = React.useState(props.equationString)

    React.useEffect(() => {

        let expression: BoxedExpression = ce.parse(props.equationString);

        // Configure evaluation mode
        switch (props.lensEvaluation) {
            case "identity":
                break;
            case "evaluate":
                expression = expression.evaluate();
                break;
            case "simplify":
                expression = expression.simplify();
                break;
            case "numeric":
                expression = expression.N();
                break;
        }

        // Check display lens to determine the format of the display output 
        switch (props.lensDisplay) {
            case "latex":
                nonStateOutputEquationString = expression.latex
                setOutputEquation(expression.latex)
                break;
            case "linear":
                nonStateOutputEquationString = convertLatexToAsciiMath(expression.latex)
                console.log("linear", nonStateOutputEquationString)
                setOutputEquation(convertLatexToAsciiMath(expression.latex))
                break;
            case "mathjson":
                nonStateOutputEquationString = expression.toString()
                console.log("mathjson", nonStateOutputEquationString)
                setOutputEquation(expression.toString())
                break;
            case "natural":
                nonStateOutputEquationString = expression.latex.toString()
                setOutputEquation(expression.latex)
                break;
            default:
                break;
        }

        console.log("maths output", nonStateOutputEquationString)

    }, [props.equationString, props.lensDisplay, props.lensEvaluation, outputEquation])

    const renderMathsDisplay = (lensDisplay: DisplayLens) => {
        switch (lensDisplay) {
            case 'natural':
                return (<math-field style={{ border: 'none' }} ref={mathFieldRef} onInput={(event: any) => {
                    if (props.updateContent) {
                        props.updateContent(mathFieldRef.current!.value)
                    }
                }}>
                    {/* TODO: Make this read only */}
                    {outputEquation}
                </math-field>)
            case 'latex':
                return <math-field style={{ border: 'none' }} ref={mathFieldRef} onInput={(event: any) => {
                    if (props.updateContent) {
                        props.updateContent(mathFieldRef.current!.value)
                    }
                }}>
                    {/* TODO: Make this read only */}
                    {outputEquation}
                </math-field>
            case 'linear':
                return (<>
                    {outputEquation}
                </>)
            case 'mathjson':
                return (<>
                    {outputEquation}
                </>)
                break;

            default:
                break;
        }

    }

    return (
        <motion.div style={{
            position: "relative",
            width: "fit-content",
            padding: 5,
            backgroundColor: "#EFEFEF",
            borderRadius: 5,
            boxShadow: `0px 0.6032302072222955px 0.6032302072222955px -1.25px rgba(0, 0, 0, 0.18), 0px 2.290210571630906px 2.290210571630906px -2.5px rgba(0, 0, 0, 0.15887), 0px 10px 10px -3.75px rgba(0, 0, 0, 0.0625)`,
        }}
        >
            <motion.div data-drag-handle
                contentEditable={false}
                onMouseLeave={(event) => {
                    event.currentTarget.style.cursor = "grab";
                }}
                onMouseDown={(event) => {
                    event.currentTarget.style.cursor = "grabbing";
                }}
                onMouseUp={(event) => {
                    event.currentTarget.style.cursor = "grab";
                }}
                style={{ position: "absolute", right: -5, top: 3, display: "flex", flexDirection: "column", cursor: "grab", fontSize: "24px", color: "grey" }}
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}>
                ⠿
            </motion.div>
            {
                renderMathsDisplay(props.lensDisplay)
            }
        </motion.div>
    )
})

export const MathsWithoutQi = (props: { equation: string }) => {
    const [equation, setEquation] = React.useState(props.equation)

    return (
        <div>
            <math-field>
                {equation}
            </math-field>
        </div>
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