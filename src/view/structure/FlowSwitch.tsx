import './styles.scss'
import { motion } from "framer-motion"
import React from "react"

export const FlowSwitch = (props: { children: React.ReactElement[], value: string, onChange?: (selectedIndex: number) => void, isLens?: boolean }) => {
    const flowSwitchContainerRef = React.useRef<HTMLDivElement>(null)
    const [releaseSelected, setReleaseSelected] = React.useState<number>(0)
    const [hasBeenChanged, setHasBeenChanged] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState<number>(0);
    const tickSound = new Audio("/tick.mp3");
    let timer: NodeJS.Timeout | null = null;
    const refs = props.children.map(() => React.createRef<HTMLDivElement>());

    const switchElements = props.children.map((child, index) => 
        (<motion.div
            ref={refs[index]}
            initial={{ opacity: 0.2, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            onClick={() => {
                if (typeof child.props.onClick === 'function') {
                    child.props.onClick()
                }
            }
            }
            style={{
                // TODO: Change this eventually
                scrollSnapAlign: "none",
                width: "fit-content",
            }}
            viewport={{ root: flowSwitchContainerRef, margin: "-13px 0px -13px 0px" }}
            onViewportEnter={(entry) => {
                // The activation box is a thin line in the middle of the flow switch
                // and activates when a child element enters this thin line.
                if (hasBeenChanged) {
                    // TODO: Find a way to play sound even when the page hasn't been interacted with
                    tickSound.play().catch(function (error) {
                        console.log("Chrome cannot play sound without user interaction first")
                    });
                } else {
                    setHasBeenChanged(true)
                }
                console.log("setting selected index to ", index)
                setSelectedIndex(index)
            }}
            key={index}
        >
            {child}
        </motion.div>)
    )

    React.useEffect(() => {
        // Scroll to the element with the key === props.value
        // Find the element
        const index = props.children.findIndex(child => {
            return child.props.value === props.value
        })

        if (index !== -1 && refs[index].current) {
            // Found
            // TODO: Re-enable this
            // refs[index].current!.scrollIntoView({ behavior: 'smooth' });

            // Scroll to the element
            const container = flowSwitchContainerRef.current;
            const element = refs[index].current;

            if (container && element) {
                const containerRect = container.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();

                const scrollTop = elementRect.top - containerRect.top - (containerRect.height / 2) + (elementRect.height / 2);

                container.scrollTo({
                    top: scrollTop,
                    left: 0,
                    behavior: 'smooth'
                });
            }

        } else {
            console.warn(`Element with props value: ${props.value} not found`)
        }

    }, [refs])

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
            key={props.value}
            ref={flowSwitchContainerRef}
            onScroll={
                // TODO: In future, see if this can be replaced by onScrollEnd
                () => {
                    if (timer !== null) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(function () {
                        setReleaseSelected(selectedIndex)
                        if (props.onChange) {
                            props.onChange(releaseSelected);
                        }
                        // TODO: This is mean to click the currently selected element, think of a better way.
                        // Basically, find the currently selected element, and invoke its onClick
                        switchElements[selectedIndex].props.onClick()
                    }, 550);
                }
            }

            style={{
                scrollSnapType: `y mandatory`,
                boxSizing: "border-box",
                flexShrink: 0,
                width: "fit-content",
                maxWidth: 500,
                height: 40,
                display: "flex",
                flexDirection: "column",
                // TODO: check the safe keyword works on other browsers
                justifyContent: "center safe",
                alignItems: "center",
                color: props.isLens ? "#333333": "#222222",
                padding: "5px 10px 5px 10px",
                overflow: "scroll",
                boxShadow: "0px 0.6021873017743928px 3.010936508871964px -0.9166666666666666px rgba(0, 0, 0, 0.14), 0px 2.288533303243457px 11.442666516217285px -1.8333333333333333px rgba(0, 0, 0, 0.13178), 0px 10px 50px -2.75px rgba(0, 0, 0, 0.1125)",
                backgroundColor: props.isLens ? "rgba(217, 217, 217, 0.22)" : "rgba(250, 250, 250, 0.95)",
                backdropFilter: props.isLens ? `blur(3px)` : ``,
                WebkitBackdropFilter: `blur(3px)`,
                transform: `translate3d(0, 0, 0)`, // this fixes blur not displaying properly on Safari
                position: "relative",
                alignContent: "start",
                flexWrap: "nowrap",
                gap: 3,
                borderRadius: 5,
                border: "1px solid #BBBBBB"
            }}>
            {switchElements}
        </motion.div>
    )
}

export const Option = (props: { value: string, onClick?: () => void, children: React.ReactElement }) => {
    return (
        <motion.div>
            {props.children}
        </motion.div>
    )
}

export const FlowSwitchExample = () => {
    const [selectedValue, setSelectedValue] = React.useState<string>("Arial")

    return (
        <FlowSwitch value={selectedValue} isLens>
            <Option value={"EB Garamond"} onClick={() => {}}>
                <motion.div>
                    <span style={{ fontFamily: 'EB Garamond' }}>
                        EB Garamond
                    </span>
                </motion.div>
            </Option>
            <Option value={"Inter"} onClick={() => {}}>
                <motion.div>
                    <span style={{ fontFamily: 'Inter' }}>
                        Inter
                    </span>
                </motion.div>
            </Option>
            <Option value={"Arial"} onClick={() => {}}>
                <motion.div >
                    <span style={{ fontFamily: 'Arial' }}>
                        Arial
                    </span>
                </motion.div>
            </Option>
        </FlowSwitch>
    )
}