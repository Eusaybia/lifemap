import React, { DetailedHTMLProps, HTMLAttributes, useCallback, useEffect, useState } from 'react'
import { BoxedExpression, ComputeEngine } from '@cortex-js/compute-engine';
import { DisplayLens, EvaluationLens, MathLens, MathsLoupe, MathsLoupeC, QuantaClass, QuantaType } from '../../core/Model';
import { RichText } from './RichText';
import { convertLatexToAsciiMath } from 'mathlive';
import { JSONContent } from '@tiptap/react';
import { Quanta } from '../../core/Quanta';
import { DOMAttributes } from "react";
import { MathfieldElementAttributes } from 'mathlive'
import { Group } from '../structure/Group';
import { observer } from 'mobx-react-lite';
import { motion } from 'framer-motion';
import { Attrs } from 'prosemirror-model';
import { getMathsLoupeFromAttributes } from '../../utils/Utils';

type CustomElement<T> = Partial<T & DOMAttributes<T>>;

declare global {
    namespace JSX {
        interface IntrinsicElements {
            ["math-field"]: CustomElement<MathfieldElementAttributes>;
        }
    }
}

type MathStyle = "cards" | "flat"

export type MathProps = { 
    style: MathStyle, 
    equationString: string, 
    lensDisplay: DisplayLens, 
    lensEvaluation: EvaluationLens, 
    children?: any, 
    updateContent?: (event: any) => void 
}

export const Math = (props: MathProps) => {
    const ce = new ComputeEngine();
    const mathFieldRef = React.useRef<HTMLInputElement>()
    console.log("lensDisplay", props.lensDisplay)
    console.log("lensEvaluation", props.lensEvaluation)

    const [outputEquation, setOutputEquation] = React.useState(props.equationString)


    React.useEffect(() => {

        let expression: BoxedExpression = ce.parse(props.equationString);

        // Configure evaluation mode
        switch (props.lensEvaluation) {
            case "identity":
                break;
            case "evaluate":
                expression = expression.evaluate();
                console.log("lensEvaluating", expression)
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
                setOutputEquation(expression.latex)
                break;
            case "linear":
                setOutputEquation(convertLatexToAsciiMath(expression.latex))
                break;
            case "mathjson":
                setOutputEquation(expression.toString())
                break;
            case "natural":
                setOutputEquation(expression.latex)
                break;
            default:
                break;
        }

        console.log("maths output:", outputEquation)

    }, [props.equationString, props.lensDisplay, props.lensEvaluation, outputEquation])
    console.log("maths output s", outputEquation)

    return (
        <>
        <motion.div style={{
            position: "relative",
            width: "100%",
            height: "40px",
            display: "grid",
            alignItems: "center",
            padding: 5,
            backgroundColor: "#FFFFFF",
            borderRadius: 5,
            boxShadow: props.style === "cards" ? `0px 0.6032302072222955px 0.6032302072222955px -1.25px rgba(0, 0, 0, 0.18), 0px 2.290210571630906px 2.290210571630906px -2.5px rgba(0, 0, 0, 0.15887), 0px 10px 10px -3.75px rgba(0, 0, 0, 0.0625)` : undefined,
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
                {props.lensEvaluation === "identity" ?
                    <math-field style={{ border: 'none', width: "95%" }} ref={mathFieldRef} onInput={(event: any) => {
                        if (props.updateContent) {
                            props.updateContent(mathFieldRef.current!.value)
                        }
                    }}>
                        {/* TODO: Make this read only */}
                        {props.equationString}
                    </math-field> :
                    <>
                        {outputEquation}
                    </>

                }
            </motion.div>
        </>
    )
}

export const MathsWithoutQuanta = (props: { equation: string }) => {
    const [equation, setEquation] = React.useState(props.equation)

    return (
        <div>
            <math-field>
                {equation}
            </math-field>
        </div>
    )
}

export const MathWithQuantaExample = () => {
    const computation = `10 * 12`
    const quadraticFormula = String.raw`x=\frac{-b\pm \sqrt{b^2-4ac}}{2a}`
    let quanta: QuantaType = new QuantaClass()
    quanta.informationTypeName = "latex"
    let mathsLoupe = new MathsLoupeC()
    let equationString = computation;
    return (
        <Quanta quantaId={'000000'} userId={'000000'} loupe={mathsLoupe} />
    )
}