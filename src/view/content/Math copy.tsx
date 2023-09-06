import React, { DetailedHTMLProps, HTMLAttributes, useCallback, useEffect, useState, useMemo} from 'react'
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
import { simplifyExpression, Step, ChangeTypes, solveEquation} from 'mathsteps';
import axios from 'axios';
import { error } from 'console';

type CustomElement<T> = Partial<T & DOMAttributes<T>>;

declare global {
    namespace JSX {
        interface IntrinsicElements {
            ["math-field"]: CustomElement<MathfieldElementAttributes>;
        }
    }
}

export const Math = (props: { equationString: string, nodeAttributes: Attrs, lensDisplay: DisplayLens, lensEvaluation: EvaluationLens, children?: any, updateContent?: (event: any) => void }) => {
    const ce = new ComputeEngine();
    const mathFieldRef = React.useRef<HTMLInputElement>()

    // let [outputEquationString, setOutputEquationString] = React.useState<string>(props.equationString)
    let [stepsArray, setStepsArray] = React.useState<string[]>([""])
    const [isDropdownVisible, setDropdownVisibility] = useState(false);
    let expression: BoxedExpression = ce.parse(props.equationString);
    const [showingSteps, setShowingSteps] = React.useState<boolean>(false)

    const hasSimplified = React.useRef(false);
    const hasEvaluated = React.useRef(false);

    const useWolfram = React.useRef(false)
    let teststring = ""

    const [inputValue, setInputValue] = useState<string>('');

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'Enter') {
            axios.post('http://127.0.0.1:8000/createWolframQuery', {userQuery:inputValue, tex: expression.latex })
                .then(response => {
                    console.log(response.data.query)
                    let query = response.data.query
                    axios.post('http://127.0.0.1:8000/solve', { query: query})
                    .then(response => {
                        console.log(response.data.explanation)
                        setStepsArray(response.data.explanation.split('\n'));
                        
                        setShowingSteps(true)

                    }).catch(error => {
                        console.log('Getting solution failed', error);
                    });
                })
                .catch(error => {
                    console.log('Creating phrase failed', error);
                });
        }
    };

    const outputEquationString = useMemo(() => {
        switch (props.lensEvaluation) {
            case "identity":
                break;
            case "evaluate":
                if (!hasEvaluated.current) {
                    console.log("Checking which format to use")
                    axios.post('http://127.0.0.1:8000/check_expr', { tex: expression.latex})
                        .then(response => {
                            useWolfram.current = response.data.use_wolfram // or however you'd like to handle the response
                        })
                        .catch(error => {
                            console.log('Wolfram test failed', error);
                        });
                    console.log(useWolfram)

                    if(!useWolfram.current){
                        const out = convertLatexToAsciiMath(expression.latex);
                        const stepsList: string[] = [];
                        const steps = solveEquation(out);
                        steps.forEach(step => {
                            let stepString = `Before change: ${step.oldEquation.ascii() }\n` +
                                `Change: ${step.changeType}\n` +
                                `After change: ${step.newEquation.ascii() }\n` +
                                `# of substeps: ${step.substeps.length}\n`;
                            stepsList.push(stepString); // Append the step string to the list
                        });
                        setStepsArray(stepsList);
                        hasEvaluated.current = true;

                    }else{
                        console.log('mathsteps did not work, trying FastAPI');
                        console.log('Sending:', { tex: expression.latex, method: "solve" });

                        axios.post('http://127.0.0.1:8000/solve', { tex: expression.latex, method: "solve for x" })
                            .then(response => {
                                setStepsArray(response.data.explanation.split('\n')); // or however you'd like to handle the response
                            })
                            .catch(error => {
                                console.log('FastAPI also failed', error);
                            });

                    }
                }
                expression = expression.evaluate();
                break;
            case "simplify":
                if (!hasSimplified.current) {
                    console.log("Checking which format to use")
                    axios.post('http://127.0.0.1:8000/check_expr', { tex: expression.latex })
                        .then(response => {
                            useWolfram.current = response.data.use_wolfram // or however you'd like to handle the response
                        })
                        .catch(error => {
                            console.log('Wolfram test failed', error);
                        });
                    console.log(useWolfram)
                    if (!useWolfram.current) {
                        const out = convertLatexToAsciiMath(expression.latex);
                        const steps = simplifyExpression(out);
                        const stepsList: string[] = [];
                        steps.forEach((step) => {
                            let stepString = `Before change: ${step.oldNode.toString()}\n` +
                                `Change: ${step.changeType}\n` +
                                `After change: ${step.newNode.toString()}\n` +
                                `# of substeps: ${step.substeps.length}\n`;
                            stepsList.push(stepString); // Append the step string to the list
                        });
                        hasSimplified.current = true;
                        axios.post('http://127.0.0.1:8000/solveMathSteps', { stepsString:stepsList.join('\n'), tex:expression.latex, method:'simplify'})
                            .then(response => {
                                setStepsArray(response.data.explanation.split('\n')); // or however you'd like to handle the response
                            })
                            .catch(error => {
                                console.log('FastAPI also failed', error);
                            });
                    } else {
                        console.log('mathsteps did not work, trying FastAPI');
                        console.log('Sending:', { tex: expression.latex, method: "simplify" });

                        axios.post('http://127.0.0.1:8000/solve', { tex: expression.latex, method: "simplify" })
                            .then(response => {
                                setStepsArray(response.data.explanation.split('\n')); // or however you'd like to handle the response
                            })
                            .catch(error => {
                                console.log('FastAPI also failed', error);
                            });
                    }
                }
                expression = expression.simplify();
                break;
            case "numeric":
                expression = expression.N();
                break;
        }


        let nonStateOutputEquationString = ""

        switch (props.lensDisplay) {
            case "latex":
                nonStateOutputEquationString = expression.latex;
                break;
            case "linear":
                nonStateOutputEquationString = convertLatexToAsciiMath(expression.latex);
                break;
            case "mathjson":
                nonStateOutputEquationString = expression.toString();
                break;
            case "natural":
                nonStateOutputEquationString = expression.latex.toString();
                break;
            default:
                break;
        }

        // setOutputEquationString(nonStateOutputEquationString);
        return nonStateOutputEquationString

    }, [props.equationString, props.lensEvaluation, props.lensDisplay]);


    // useEffect(() => {
    //     console.log(outputEquationString);
    // }, [outputEquationString]);

    // console.log('f' + outputEquationString)
    return (
        <motion.div style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between", // This will put space between your components
            // ...other styles
        }}>
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
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}>
                    ⠿
                </motion.div>
                {
                    {
                        'natural':
                            <math-field style={{ border: 'none' }} ref={mathFieldRef} onInput={(event: any) => {
                                if (props.updateContent) {
                                    props.updateContent(mathFieldRef.current?.value)
                                }
                            }}>
                                {/* TODO: Make this read only */}
                                {outputEquationString}
                            </math-field>,
                        'latex':
                            <math-field style={{ border: 'none' }} ref={mathFieldRef} onInput={(event: any) => {
                                if (props.updateContent) {
                                    props.updateContent(mathFieldRef.current?.value)
                                }
                            }}>
                                {/* TODO: Make this read only */}
                                {outputEquationString}
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
                    }[props.lensDisplay]
                }
                {
                    (props.lensEvaluation === "simplify" || props.lensEvaluation === "evaluate" || showingSteps) &&
                    <motion.div>
                        <button onClick={() => setDropdownVisibility(!isDropdownVisible)}>Show Steps ▼</button>
                        {isDropdownVisible && (
                            <motion.div style={{
                                position: 'absolute',
                                backgroundColor: '#f9f9f9',
                                border: '1px solid #ccc',
                                borderRadius: 5,
                                boxShadow: `0px 0.6032302072222955px 0.6032302072222955px -1.25px rgba(0, 0, 0, 0.18), 0px 2.290210571630906px 2.290210571630906px -2.5px rgba(0, 0, 0, 0.15887), 0px 10px 10px -3.75px rgba(0, 0, 0, 0.0625)`
                            }}>
                                {stepsArray.map((step, index) => {
                                    if (step.includes("$")) {
                                        const latexContent = step.replace(/\$/g, ''); // Remove dollar signs
                                        return (
                                            <div key={index}>
                                                <math-field style={{ border: 'none' }} readOnly>
                                                    {latexContent}
                                                </math-field>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div key={index}>
                                                {step}
                                            </div>
                                        );
                                    }
                                })}
                            </motion.div>
                        )}
                    </motion.div>
                }
            </motion.div>

            <div style={{
                alignSelf: "flex-end",
                marginBottom: "10px"
            }}>
                <input
                    type="text"
                    placeholder="Enter text here"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}// Handle "Enter" key press
                />
            </div>
        </motion.div>
    )
}

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