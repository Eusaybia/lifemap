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
        <div style={{ padding: "5px" }}>
            <Math
                style={"flat"}
                equationString={props.inputMaths.equationString}
                lensEvaluation={"identity"}
                lensDisplay={props.inputMaths.lensDisplay}
                updateContent={props.inputMaths.updateContent}
            />
            <Math
                style={"flat"}
                equationString={props.inputMaths.equationString}
                lensEvaluation={props.inputMaths.lensEvaluation}
                lensDisplay={props.inputMaths.lensDisplay}
                updateContent={props.inputMaths.updateContent}
            />
        </div>
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