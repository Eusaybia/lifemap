import { motion } from "framer-motion"
import { Latex } from "../../core/Model"
import { Math, MathProps } from "./Math"

export const Calculation = (props: { equation: Latex, inputMaths: MathProps, outputMath: MathProps }) => {
    // Equation is simply stored in the equation node attribute of the Calculation Node
    // Math1 Component lensEvaluation will always be set to identity by default
    // Math1 Component lensDisplay will always be set to natural by default
    // Math 1 Component lensDisplay will have other lenses, which are MathJSON, ASCII-Math, and Latex. 
    // Basically Natural is the default, then we have read only versions of MathJSON, ASCII-Math and LaTeX, and finally, editable 
    // versions of those 3 lenses.
    // updateContent is passed down from the TipTapCalculationExtension wrapper

    // Math2 Component will render the equation according to what lensEvaluation or lensDisplay is chosen.
    // The default will be numeric + "natural"


    return (<>
        <motion.div style={{
            height: "fit-content",
            borderRadius: "5px",
            padding: "2px",
            display: "flex", flexDirection: "column", boxShadow: "0px 0.6021873017743928px 2.52918666745245px -1.6666666666666665px rgba(0, 0, 0, 0.23), 0px 2.288533303243457px 9.61183987362252px -3.333333333333333px rgba(0, 0, 0, 0.19279), 0px 10px 42px -5px rgba(0, 0, 0, 0)",
            gap: "5px"
        }}>
            <motion.div style={{
                height: "fit-content",
                boxShadow: "0px 0.7961918735236395px 0.7961918735236395px -0.9375px rgba(0, 0, 0, 0.37), 0px 2.414506143104518px 2.414506143104518px -1.875px rgba(0, 0, 0, 0.34482), 0px 6.382653521484461px 6.382653521484461px -2.8125px rgba(0, 0, 0, 0.29522), 0px 20px 20px -3.75px rgba(0, 0, 0, 0.125)",
                borderRadius: "5px",
            }}>
                <Math
                    style={"flat"}
                    equationString={props.inputMaths.equationString}
                    lensEvaluation={"identity"}
                    lensDisplay={props.inputMaths.lensDisplay}
                    updateContent={props.inputMaths.updateContent}
                />

            </motion.div>
            <Math
                style={"flat"}
                equationString={props.inputMaths.equationString}
                lensEvaluation={props.inputMaths.lensEvaluation}
                lensDisplay={props.inputMaths.lensDisplay}
                updateContent={props.inputMaths.updateContent}
            />
        </motion.div>
    </>)
}

export const CalculationExample = (props: { equation: string }) => {

    const inputMaths: MathProps = {
        style: "cards",
        equationString: props.equation,
        lensDisplay: "natural",
        lensEvaluation: "identity"
    }
    const outputMaths: MathProps = {
        style: "cards",
        equationString: props.equation,
        lensDisplay: "natural",
        lensEvaluation: "identity"
    }

    return (
        <>
            <Calculation equation={props.equation} inputMaths={inputMaths} outputMath={outputMaths} />
        </>
    )
}