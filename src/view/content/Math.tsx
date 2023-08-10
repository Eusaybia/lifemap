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

export const Math = observer((props: { equationString: string, nodeAttributes: Attrs, children?: any, updateContent?: (event: any) => void }) => {
    console.log("equationString", props.equationString)
    const ce = new ComputeEngine();
    // const [outputEquationString, setOutputEquationString] = useState("");
    const mathFieldRef = React.useRef<HTMLInputElement>()

    let expression: BoxedExpression = ce.parse(props.equationString);
    let loupe: MathsLoupe = new MathsLoupeC();

    // React.useEffect(() => {
    loupe = getMathsLoupeFromAttributes(props.nodeAttributes)
    // }, [props.nodeAttributes])

    // Configure evaluation mode
    switch (loupe.evaluationLenses[loupe.selectedEvaluationLens]) {
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
    switch (loupe.displayLenses[loupe.selectedDisplayLens]) {
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

    // setOutputEquationString(newOutputEquationString);

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
                contentEditable="false"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}>
                ⠿
            </motion.div>
            {
                {
                    'natural':
                        <math-field style={{border: 'none'}} ref={mathFieldRef} onInput={(event: any) => {
                            if (props.updateContent) {
                                props.updateContent(mathFieldRef.current?.value) 
                            }
                        }}>
                            {/* TODO: Make this read only */}
                            {newOutputEquationString}
                        </math-field>,
                    'latex':
                        <math-field style={{border: 'none'}} ref={mathFieldRef} onInput={(event: any) => {
                            if (props.updateContent) {
                                props.updateContent(mathFieldRef.current?.value) 
                            }
                        }}>
                            {/* TODO: Make this read only */}
                            {newOutputEquationString}
                        </math-field>,
                    'linear': 
                        <RichText
                            text={newOutputEquationString}
                            lenses={["code"]}
                        />,
                    'mathjson':
                        <RichText
                            text={newOutputEquationString}
                            lenses={["code"]}
                        />,
                }[loupe.displayLenses[loupe.selectedDisplayLens]]
            }
        </motion.div>
    )
})

export const MathsWithoutQi = () => {
    return (
        <div>
            <math-field>
                \frac{1}{2}
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