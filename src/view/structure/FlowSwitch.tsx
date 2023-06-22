import { motion, useScroll, useVelocity } from "framer-motion"
import { ExampleTypeTag, TypeTag } from "../content/Tag"
import React from "react"
import './styles.scss'
import { clickElement } from "../../utils/utils"

export const FlowSwitch = (props: { children: React.ReactElement[], onChange?: (selectedIndex: number) => void, isLens?: boolean }) => {
    const flowSwitchContainerRef = React.useRef<HTMLDivElement>(null)
    const [realTimeSelected, setRealTimeSelected] = React.useState<number>(0)
    const [releaseSelected, setReleaseSelected] = React.useState<number>(0)
    const [hasBeenChanged, setHasBeenChanged] = React.useState(false);

    const tickSound = new Audio("/tick.mp3");

    let timer: NodeJS.Timeout | null = null;

    const handleScrollEnded = (event: any) => { console.log("stopped") }

    // Eventually use this scrollend event instead of a scroll timeout when more browsers support it
    // React.useEffect(() => {
    //     const node = flowSwitchContainerRef.current;
    //     if (node) {
    //       node.addEventListener('scrollend', handleScrollEnded);
    //     }
    
    //     return () => {
    //       if (node) {
    //         node.removeEventListener('scrollend', handleScrollEnded);
    //       }
    //     };
    //   }, []);

    return (
        <motion.div className="flow-menu"
            ref={flowSwitchContainerRef}
            onScroll={
                // TODO: In future, see if this can be replaced by onScrollEnd
                () => {
                    if (timer !== null) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(function () {
                        setReleaseSelected(realTimeSelected)
                        if (props.onChange) {
                            props.onChange(releaseSelected);
                        }
                        // TODO: This is mean to click the currently selected element, think of a better way.
                        // Basically, find the currently selected element, and invoke its onClick
                        // clickElement(flowSwitchContainerRef)
                    }, 150);
                }
            }

            style={{
                scrollSnapType: `y mandatory`,
                boxSizing: "border-box",
                flexShrink: 0,
                width: "fit-content",
                height: 38,
                display: "flex",
                flexDirection: "column",
                // TODO: check the safe keyword works on other browsers
                justifyContent: "center safe",
                alignItems: "center",
                color: props.isLens ? "#333333": "#222222",
                padding: "5px 10px 5px 10px",
                msOverflowStyle: "none",
                scrollbarColor: "transparent transparent",
                boxShadow: "0px 0.6021873017743928px 3.010936508871964px -0.9166666666666666px rgba(0, 0, 0, 0.14), 0px 2.288533303243457px 11.442666516217285px -1.8333333333333333px rgba(0, 0, 0, 0.13178), 0px 10px 50px -2.75px rgba(0, 0, 0, 0.1125)",
                backgroundColor: props.isLens ? "rgba(217, 217, 217, 0.22)" : "rgba(250, 250, 250, 0.95)",
                backdropFilter: props.isLens ? `blur(3px)` : ``,
                position: "relative",
                alignContent: "start",
                flexWrap: "nowrap",
                gap: 0,
                borderRadius: 5,
                border: "1px solid #BBBBBB"
            }}>
            {
                props.children.map((child, index) => {
                    return (<motion.div
                        initial={{ opacity: 0.2, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        style={{
                            // TODO: Change this eventually
                            scrollSnapAlign: "none",
                        }}
                        viewport={{ root: flowSwitchContainerRef, margin: "-12px 0px -12px 0px" }}
                        onViewportEnter={(entry) => {
                            // The activation box is a thin line in the middle of the flow switch
                            // and activates when a child element enters this thin line.
                            if (hasBeenChanged) {
                                tickSound.play()
                            } else {
                                setHasBeenChanged(true)
                            }
                        }}
                        key={index}
                    >
                        {child}
                    </motion.div>)
                }
                )
            }
        </motion.div>
    )
}