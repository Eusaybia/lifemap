import { Editor } from "@tiptap/core"
import { BubbleMenu } from "@tiptap/react"
import { RichTextCodeExample } from "../content/RichText"
import { motion, useScroll, useVelocity } from "framer-motion"
import Select from '@mui/joy/Select';
import IconButton from '@mui/joy/IconButton';
import Chip from '@mui/joy/Chip';
import InfoIcon from '@mui/icons-material/Info';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatStrikethrough from '@mui/icons-material/FormatStrikethrough';
import FormatAlignLeft from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCentre from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRight from '@mui/icons-material/FormatAlignRight';
import FormatAlignJustify from '@mui/icons-material/FormatAlignJustify';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import { Tag, TypeTag } from "../content/Tag"
import { black, highlightYellow, white } from "../Theme"
import FormatColorFill from "@mui/icons-material/FormatColorFill"
import { FlowSwitch, Option } from "./FlowSwitch"
import React from "react"
import { NodeSelection } from "prosemirror-state";

const flowMenuStyle = (isFixed: boolean, left: number): React.CSSProperties => {
    return {
        position: isFixed ? "fixed" : "relative",
        scale: 1,
        top: isFixed ? 0 : undefined,
        left: isFixed ? left : undefined,
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

export const FlowMenu = (props: { editor: Editor | null }) => {
    const [isFixed, setIsFixed] = React.useState(false);
    const [top, setTop] = React.useState(0);
    const [right, setRight] = React.useState(0);
    const [bottom, setBottom] = React.useState(0);
    const [left, setLeft] = React.useState(0);
    const elementRef = React.useRef<HTMLDivElement>(null);
    const [value, setValue] = React.useState<string>('');


    const [selectedFont, setSelectedFont] = React.useState<string>("Inter")
    const [selectedAlignment, setSelectedAlignment] = React.useState<string>("left")
    const [selectedDisplayLens, setSelectedDisplayLens] = React.useState<string>("natural")
    const [selectedEvaluationLens, setSelectedEvaluationLens] = React.useState<string>("evaluate")
    const [selectedNotationLens, setSelectedNotationLens] = React.useState<string>("decimal")
    const [selectedPrecisionLens, setSelectedPrecisionLens] = React.useState<string>("decimal")
    const [selectedFractionLens, setSelectedFractionLens] = React.useState<string>("decimal")
    const [selectedBaseLens, setSelectedBaseLens] = React.useState<string>("decimal")

    // Make sure the menu stays within the viewport
    // TODO: Use more official implementation
    // https://github.com/ueberdosis/tiptap/issues/2305
    // https://floating-ui.com/
    React.useEffect(() => {
        const handleScroll = () => {
            if (elementRef.current) {
                const rect = elementRef.current.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                if (rect.top < 0) {
                    // The element is about to be hidden at the top of the viewport
                    // Update its position to keep it visible
                    setIsFixed(true);
                    setTop(0);
                    setLeft(rect.left);
                } else if (rect.bottom > viewportHeight) {
                    // The element is about to be hidden at the bottom of the viewport
                    // Update its position to keep it visible
                    setIsFixed(true);
                    setTop(viewportHeight - rect.height);
                    setLeft(rect.left);
                } else if (rect.left < 0) {
                    // The element is about to be hidden on the left side of the viewport
                    // Update its position to keep it visible
                    setIsFixed(true);
                    setTop(rect.top);
                    setLeft(0);
                } else if (rect.right > viewportWidth) {
                    // The element is about to be hidden on the right side of the viewport
                    // Update its position to keep it visible
                    setIsFixed(true);
                    setTop(rect.top);
                    setLeft(viewportWidth - rect.width);
                } else {
                    // The element is still visible
                    // Reset its position
                    setIsFixed(false);
                }
            }
        };

        // window.addEventListener("scroll", handleScroll);
        // return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    React.useEffect(() => {
        if (elementRef.current) {
            const rect = elementRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (rect.top < 0) {
                // The element is initially rendered off-screen at the top of the viewport
                // Update its position to keep it visible
                setIsFixed(true);
                setTop(0);
                setLeft(rect.left);
            } else if (rect.bottom > viewportHeight) {
                // The element is initially rendered off-screen at the bottom of the viewport
                // Update its position to keep it visible
                setIsFixed(true);
                setTop(viewportHeight - rect.height);
                setLeft(rect.left);
            } else if (rect.left < 0) {
                // The element is initially rendered off-screen on the left side of the viewport
                // Update its position to keep it visible
                setIsFixed(true);
                setTop(rect.top);
                setLeft(0);
            } else if (rect.right > viewportWidth) {
                // The element is initially rendered off-screen on the right side of the viewport
                // Update its position to keep it visible
                setIsFixed(true);
                setTop(rect.top);
                // TODO: This is kind of hacky, there shouldn't need to be a multiplier
                setLeft(viewportWidth - 1.9 * rect.width);
            } else {
                // The element is initially rendered on-screen
                // Do nothing
            }
        }
    }, []);


    if (props.editor === null) return null;
    console.log("actual size:", props.editor?.getAttributes('textStyle').fontSize)

    return (
        <BubbleMenu editor={props.editor} tippyOptions={{ duration: 100 }}>
            <motion.div
                ref={elementRef}
                style={flowMenuStyle(isFixed, left)}>
                <FlowSwitch value={"Delete"}>
                    <motion.div>
                        Copy
                    </motion.div>
                    <motion.div>
                        Copy Link
                    </motion.div>
                    <motion.div>
                        Export
                    </motion.div>
                    <motion.div>
                        Mark Done
                    </motion.div>
                    <motion.div>
                        Delete
                    </motion.div>
                </FlowSwitch>
                <FlowSwitch value={"Add details"}>
                    <motion.div
                        onClick={() => {
                            const { selection } = props.editor!.state;
                            if (selection instanceof NodeSelection) {
                                const qiId = selection.node.attrs.qiId;
                                console.log(qiId);
                            }
                        }}
                    >
                        <span style={{ fontFamily: 'Inter' }}>Copy Node ID</span>
                    </motion.div>
                    <motion.div onClick={() => props.editor!.chain().focus().setDetails().run()} >
                        <span style={{ fontFamily: 'Inter' }}>
                            Add details
                        </span>
                    </motion.div>
                    <motion.div onClick={() => props.editor!.chain().focus().setDetails().run()} >
                        {/* // TODO: Update this to add speech */}
                        <span style={{ fontFamily: 'Inter' }}>
                            Add speech direction
                        </span>
                    </motion.div>
                </FlowSwitch>
                    {!props.editor!.isActive('math') ? <div
                        style={{ display: "flex", gap: 5, height: "fit-content", overflowX: "scroll", alignItems: "center", overflow: "visible" }}>
                        <Tag>
                            Rich Text
                        </Tag>
                        <FlowSwitch value={"Inter"} isLens>
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
                        <FlowSwitch value={"30px"} isLens>
                            <motion.div
                                onClick={() => props.editor!.chain().focus().setFontSize('36px').run()}
                            >
                                36
                            </motion.div>
                            <motion.div
                                onClick={() => props.editor!.chain().focus().setFontSize('30px').run()}
                            >
                                30
                            </motion.div>
                            <motion.div
                                onClick={() => props.editor!.chain().focus().setFontSize('24px').run()}
                            >
                                24
                            </motion.div>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontSize('24px').run()}>
                                20
                            </motion.div>
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
                        style={{ display: "flex", gap: 5, height: "fit-content", overflowX: "scroll", alignItems: "center", overflow: "visible" }}>
                        <Tag>
                            Math
                        </Tag>
                        <FlowSwitch value={selectedDisplayLens} isLens>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('EB Garamond').run()}>
                                <div style={{ fontFamily: 'Inter' }}>
                                    Natural
                                </div>
                            </motion.div>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Inter').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Latex
                                </span>
                            </motion.div>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Arial').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Linear
                                </span>
                            </motion.div>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Arial').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    MathJSON
                                </span>
                            </motion.div>
                        </FlowSwitch>
                        <FlowSwitch value={selectedEvaluationLens} isLens>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('EB Garamond').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Simplify
                                </span>
                            </motion.div>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Inter').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Evaluate
                                </span>
                            </motion.div>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Arial').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Numeric
                                </span>
                            </motion.div>
                        </FlowSwitch>
                        <FlowSwitch value={selectedNotationLens} isLens>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('EB Garamond').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Scientific
                                </span>
                            </motion.div>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Inter').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Engineering
                                </span>
                            </motion.div>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Arial').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Decimal (Standard)
                                </span>
                            </motion.div>
                        </FlowSwitch>
                        <FlowSwitch value={selectedPrecisionLens} isLens>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('EB Garamond').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    15 (Machine)
                                </span>
                            </motion.div>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Inter').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    100 (Big Int)
                                </span>
                            </motion.div>
                        </FlowSwitch>
                        <FlowSwitch value={selectedFractionLens} isLens>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('EB Garamond').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Simplified Fraction
                                </span>
                            </motion.div>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Inter').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Mixed Fraction
                                </span>
                            </motion.div>
                        </FlowSwitch>
                        <FlowSwitch value={selectedBaseLens} isLens>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('EB Garamond').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Decimal
                                </span>
                            </motion.div>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Inter').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Hexadecimal
                                </span>
                            </motion.div>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Inter').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Binary
                                </span>
                            </motion.div>
                            <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Inter').run()}>
                                <span style={{ fontFamily: 'Inter' }}>
                                    Octal
                                </span>
                            </motion.div>
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