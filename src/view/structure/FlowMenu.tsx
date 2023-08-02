import { Editor } from "@tiptap/core"
import { BubbleMenu } from "@tiptap/react"
import { RichTextCodeExample } from "../content/RichText"
import { motion } from "framer-motion"
import IconButton from '@mui/joy/IconButton';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatStrikethrough from '@mui/icons-material/FormatStrikethrough';
import FormatAlignLeft from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCentre from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRight from '@mui/icons-material/FormatAlignRight';
import FormatAlignJustify from '@mui/icons-material/FormatAlignJustify';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import { Tag } from "../content/Tag"
import { black, highlightYellow, white } from "../Theme"
import FormatColorFill from "@mui/icons-material/FormatColorFill"
import { FlowSwitch, FlowSwitchExample, Option } from "./FlowSwitch"
import React from "react"
import { NodeSelection } from "prosemirror-state";
import { MathLens, displayLenses } from "../../core/Model";
import { Select } from "@mui/material";

const flowMenuStyle = (): React.CSSProperties => {
    return {
        boxSizing: "border-box",
        flexShrink: 0,
        width: "max-content",
        height: "fit-content",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        padding: "5px 15px 5px 15px",
        boxShadow:
            "0px 0.6021873017743928px 3.010936508871964px -0.9166666666666666px rgba(0, 0, 0, 0.14), 0px 2.288533303243457px 11.442666516217285px -1.8333333333333333px rgba(0, 0, 0, 0.13178), 0px 10px 50px -2.75px rgba(0, 0, 0, 0.1125)",
        backgroundColor: `rgba(217, 217, 217, 0.20)`,
        backdropFilter: `blur(12px)`,
        overflow: "scroll",
        zIndex: 1,
        alignContent: "center",
        flexWrap: "nowrap",
        gap: "10px",
        borderRadius: "10px",
        border: "1px solid var(--Light_Grey, rgba(221,221,221,0.75))"
    }
}

export const FlowMenu = (props: { editor: Editor }) => {
    const elementRef = React.useRef<HTMLDivElement>(null);

    const [selectedFont, setSelectedFont] = React.useState<string>("Inter")
    const [selectedAlignment, setSelectedAlignment] = React.useState<string>("left")
    const [selectedDisplayLens, setSelectedDisplayLens] = React.useState<string>("linear")
    const [selectedEvaluationLens, setSelectedEvaluationLens] = React.useState<string>("evaluate")
    const [selectedNotationLens, setSelectedNotationLens] = React.useState<string>("decimal")
    const [selectedPrecisionLens, setSelectedPrecisionLens] = React.useState<string>("decimal")
    const [selectedFractionLens, setSelectedFractionLens] = React.useState<string>("decimal")
    const [selectedBaseLens, setSelectedBaseLens] = React.useState<string>("decimal")

    const [selectedValue, setSelectedValue] = React.useState<string>("Arial")
    console.log("fontSize", props.editor.getAttributes('textStyle').fontSize)

    const selection = props.editor!.view.state.selection

    // @ts-ignore
    if (selection.node) {
        // @ts-ignore
        const node = selection.node
        const lensDisplay = node.attrs.lensDisplay
        // TODO: This causes infinite loop
        if (lensDisplay !== selectedDisplayLens) {
            setSelectedDisplayLens(lensDisplay)
        }
        console.log('selected node', node);
        console.log('lensDisplay', lensDisplay);
    }

    // For some reason if I hard code a string like "latex", it works, but if I use the variable mathLens it doesn't?
    const setDisplayLensLatex = () => {
        props.editor!.chain().focus().updateAttributes("math", { lensDisplay: "latex" }).run();
    }

    const setDisplayLensNatural = () => {
        props.editor!.chain().focus().updateAttributes("math", { lensDisplay: "natural" }).run();
    }

    const setMathsLens = (mathLens: MathLens) => {
        props.editor!.chain().focus().updateAttributes("math", { lensDisplay: mathLens }).run();

        // Get the current selection
        // Problem seems to be that when I interact with the flow switch, the selection changes to something other than the math node
        // @ts-ignore

        // Check if the selection is a node selection
        console.log('selected node', props.editor!.view.state.selection);
    };

    // TODO: For some reason the FlowSwitch doesn't work properly when embedded into the BubbleMenu
    // TODO: For now, just use a normal MUI select

    return (
        <BubbleMenu
            editor={props.editor}
            tippyOptions={{
                placement: "top",
            }}>
            <motion.div
                // ref={elementRef}
                style={flowMenuStyle()}>
                {!props.editor!.isActive('math') ? <div
                    style={{ display: "flex", gap: 5, height: "fit-content", overflowX: "scroll", alignItems: "center", overflow: "visible" }}>
                    <Tag>
                        Rich Text
                    </Tag>
                    <FlowSwitch value={"Arial"} isLens>
                        <Option value={"EB Garamond"} onClick={() => props.editor!.chain().focus().setFontFamily('EB Garamond').run()}>
                            <motion.div onClick={() => { console.log("clicked EB") }}>
                                <span style={{ fontFamily: 'EB Garamond' }}>
                                    EB Garamond
                                </span>
                            </motion.div>
                        </Option>
                        <Option value={"Inter"} onClick={() => props.editor!.chain().focus().setFontFamily('Inter').run()}>
                            <motion.div onClick={() => { }}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Inter
                                </span>
                            </motion.div>
                        </Option>
                        <Option value={"Arial"} onClick={() => props.editor!.chain().focus().setFontFamily('Arial').run()}>
                            <motion.div onClick={() => { }}>
                                <span style={{ fontFamily: 'Arial' }}>
                                    Arial
                                </span>
                            </motion.div>
                        </Option>
                    </FlowSwitch>
                    <FlowSwitch value={props.editor.getAttributes('textStyle').fontSize} isLens>
                        <Option
                            value={"36px"}
                            onClick={() => props.editor!.chain().focus().setFontSize('36px').run()}
                        >
                            <motion.div
                            >
                                36
                            </motion.div>
                        </Option>
                        <Option
                            value={"30px"}
                            onClick={() => props.editor!.chain().focus().setFontSize('30px').run()}
                        >
                            <motion.div
                            >
                                30
                            </motion.div>
                        </Option>
                        <Option
                            value={"24px"}
                            onClick={() => props.editor!.chain().focus().setFontSize('30px').run()}
                        >
                        <motion.div
                            onClick={() => props.editor!.chain().focus().setFontSize('24px').run()}
                        >
                            24
                        </motion.div>
                        </Option>
                        <Option
                            value={"20px"}
                            onClick={() => props.editor!.chain().focus().setFontSize('30px').run()}
                        >
                        <motion.div onClick={() => props.editor!.chain().focus().setFontSize('24px').run()}>
                            20
                        </motion.div>
                        </Option>
                        <motion.div onClick={() => props.editor!.chain().focus().setFontSize('18px').run()}>
                            18
                        </motion.div>
                        <motion.div onClick={() => props.editor!.chain().focus().setFontSize('16px').run()}>
                            16
                        </motion.div>
                        <motion.div onClick={() => props.editor!.chain().focus().setFontSize('14px').run()}>
                            14
                        </motion.div>
                    </FlowSwitch>
                    <FlowSwitch value={selectedAlignment} isLens>
                        <Option value="left">
                            <IconButton
                                // @ts-ignore
                                onClick={() => props.editor!.chain().focus().setTextAlign('left').run()}
                                size="sm"
                                className={props.editor.isActive('bold') ? 'is-active' : ''}
                                variant={props.editor!.isActive({ textAlign: 'left' }) ? "solid" : "plain"}>
                                <FormatAlignLeft />
                            </IconButton>
                        </Option>
                        <Option value="center">
                            <IconButton
                                // @ts-ignore
                                onClick={() => props.editor!.chain().focus().setTextAlign('center').run()}
                                size="sm"
                                className={props.editor.isActive('bold') ? 'is-active' : ''}
                                variant="plain">
                                <FormatAlignCentre />
                            </IconButton>
                        </Option>
                        <Option value="right">
                            <IconButton
                                // @ts-ignore
                                onClick={() => props.editor!.chain().focus().setTextAlign('right').run()}
                                size="sm"
                                className={props.editor.isActive('bold') ? 'is-active' : ''}
                                variant="plain">
                                <FormatAlignRight />
                            </IconButton>
                        </Option>
                        <Option value="justify">
                            <IconButton
                                // @ts-ignore
                                onClick={() => props.editor!.chain().focus().setTextAlign('justify').run()}
                                size="sm"
                                className={props.editor.isActive('bold') ? 'is-active' : ''}
                                variant="plain">
                                <FormatAlignJustify />
                            </IconButton>
                        </Option>
                    </FlowSwitch>
                    <Tag isLens>
                        <IconButton
                            style={{ color: props.editor!.isActive('bold') ? white : black }}
                            size="sm"
                            onClick={() => props.editor!.chain().focus().toggleBold().run()}
                            variant={props.editor!.isActive('bold') ? "solid" : "plain"}>
                            <FormatBoldIcon />
                        </IconButton>
                        <IconButton
                            style={{ color: props.editor!.isActive('italic') ? white : black }}
                            size="sm"
                            onClick={() => props.editor!.chain().focus().toggleItalic().run()}
                            variant={props.editor!.isActive('italic') ? "solid" : "plain"}>
                            <FormatItalicIcon />
                        </IconButton>
                        <IconButton
                            style={{ color: props.editor!.isActive('underline') ? white : black }}
                            size="sm"
                            onClick={() => props.editor!.chain().focus().toggleUnderline().run()}
                            variant={props.editor!.isActive('underline') ? "solid" : "plain"}>
                            <FormatUnderlinedIcon />
                        </IconButton>
                        <IconButton
                            style={{ color: props.editor!.isActive('strike') ? white : black }}
                            size="sm"
                            onClick={() => props.editor!.chain().focus().toggleStrike().run()}
                            variant={props.editor!.isActive('strike') ? "solid" : "plain"}>
                            <FormatStrikethrough />
                        </IconButton>
                    </Tag>
                    <Tag isLens>
                        <IconButton
                            style={{ color: black }}
                            size="sm"
                            // @ts-ignore
                            onClick={() => props.editor.chain().focus().setColor('#958DF1').run()}
                            className={props.editor.isActive('textStyle', { color: '#958DF1' }) ? 'is-active' : ''}
                            variant="plain">
                            <FormatColorTextIcon />
                        </IconButton>
                        <IconButton
                            style={{ color: black }}
                            size="sm"
                            // TODO: Highlight color is controlled by mark style in styles.css and not the color parameter here
                            onClick={() => props.editor!.chain().focus().toggleHighlight({ color: highlightYellow }).run()}
                            className={props.editor!.isActive('highlight', { color: highlightYellow }) ? 'is-active' : ''}
                            variant="plain">
                            <FormatColorFill />
                        </IconButton>
                    </Tag>
                </div> : <div
                    style={{ display: "flex", gap: 5, height: "fit-content", alignItems: "center", overflow: "visible" }}>
                    <Tag>
                        Math
                    </Tag>
                    <FlowSwitch value={selectedDisplayLens} isLens>
                        <Option value="natural" onClick={() => {
                            // selection.focus().updateAttributes("math", { lensDisplay: "latex" }).run()
                            // setMathsLens("latex")
                            setDisplayLensNatural()
                        }}>
                            <motion.div>
                                <div style={{ fontFamily: 'Inter' }}>
                                    Natural
                                </div>
                            </motion.div>
                        </Option>
                        <Option value="latex" onClick={() => {
                            // selection.focus().updateAttributes("math", { lensDisplay: "latex" }).run()
                            // setMathsLens("latex")
                            setDisplayLensLatex()
                        }}>
                            <motion.div>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Latex
                                </span>
                            </motion.div>
                        </Option>
                        <Option value="linear" onClick={() => {
                            // selection.focus().updateAttributes("math", { lensDisplay: "latex" }).run()
                            // setMathsLens("latex")
                            setDisplayLensLatex()
                        }}>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Arial').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Linear
                                </span>
                            </motion.div>
                        </Option>
                        <Option value="mathjson" onClick={() => {
                            // selection.focus().updateAttributes("math", { lensDisplay: "latex" }).run()
                            // setMathsLens("latex")
                            setDisplayLensLatex()
                        }}>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Arial').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    MathJSON
                                </span>
                            </motion.div>
                        </Option>
                    </FlowSwitch>
                    <FlowSwitch value={selectedEvaluationLens} isLens>
                        <Option value="simplify">
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('EB Garamond').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Simplify
                                </span>
                            </motion.div>
                        </Option>
                        <Option value="evaluate">
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Inter').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Evaluate
                                </span>
                            </motion.div>
                        </Option>
                        <Option value="numeric">
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Arial').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Numeric
                                </span>
                            </motion.div>
                        </Option>
                    </FlowSwitch>
                </div>}
            </motion.div>
        </BubbleMenu>
    )
}

export const FlowMenuExample = () => {
    return (
        <RichTextCodeExample />
    )
}