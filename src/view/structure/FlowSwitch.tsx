import './styles.scss'
import { motion } from "framer-motion"
import React from "react"
import { playUiSound, useScrollEnd } from '../../utils/utils';

interface OptionButtonProps {
    onClick: (event?: React.MouseEvent<HTMLDivElement>) => void;
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
    children: React.ReactNode;
}

interface FlowSwitchProps {
    children: React.ReactElement[]
    value: string
    onChange?: (selectedIndex: number) => void
    isLens?: boolean
    disableAutoScroll?: boolean
    /** When true, scrolling to an option will automatically trigger its onClick */
    scrollToSelect?: boolean
    /** Optional diagnostics tag for debug logging */
    diagnosticsTag?: string
    /** Enable verbose diagnostics for scroll/selection behavior */
    diagnosticsEnabled?: boolean
}

export const FlowSwitch = React.forwardRef<HTMLDivElement, FlowSwitchProps>((props, ref) => {
    const internalContainerRef = React.useRef<HTMLDivElement>(null)
    const flowSwitchContainerRef = internalContainerRef
    
    // Merge refs - assign to both internal ref and forwarded ref
    const setRefs = React.useCallback((node: HTMLDivElement | null) => {
        // Set internal ref
        (internalContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        // Forward to external ref
        if (typeof ref === 'function') {
            ref(node)
        } else if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }
    }, [ref])

    // TODO: The switch should only update once it's released, at least on touch and scrollpad based platforms
    // But this doesn't seem possible to detect currently
    const [releaseSelected, setReleaseSelected] = React.useState<number>(0)
    const [isUserScrolling, setIsUserScrolling] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState<number>(0);
    const isProgrammaticScroll = React.useRef(false);
    const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const lastValueRef = React.useRef<string>(props.value);

    const logDiagnostics = React.useCallback((event: string, details?: Record<string, unknown>) => {
        if (!props.diagnosticsEnabled) return
        const tag = props.diagnosticsTag || 'FlowSwitch'
        const timestamp = new Date().toISOString()
        console.log(`[${tag}] ${event}`, { timestamp, ...(details ?? {}) })
    }, [props.diagnosticsEnabled, props.diagnosticsTag])

    let timer: NodeJS.Timeout | null = null;

    // Filter out undefined/null children first
    const validChildren = props.children.filter(child => child != null);
    const switchElementsRefs = validChildren.map(() => React.createRef<HTMLDivElement>());

    const switchElements = validChildren.map((child, index) => 
        (<motion.div
            ref={switchElementsRefs[index]}
            initial={{ opacity: 0.2, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            // Removed duplicate onClick - the Option component already handles clicks
            style={{
                scrollSnapAlign: "center",
                width: "fit-content",
                minHeight: 27,
            }}
            viewport={{ root: flowSwitchContainerRef, margin: "-14px 0px -14px 0px" }}
            onViewportEnter={(entry) => {
                // TODO: Maybe it would be better to use Motion.js and its scroll functions
                // The activation box is a thin line in the middle of the flow switch
                // and activates when a child element enters this thin line.
                if (isUserScrolling) {
                    playUiSound('/click.mp3', 0.15)
                }
                setSelectedIndex(index)
                logDiagnostics('onViewportEnter', {
                    index,
                    optionValue: child?.props?.value,
                    isUserScrolling,
                    isProgrammaticScroll: isProgrammaticScroll.current,
                    scrollTop: flowSwitchContainerRef.current?.scrollTop ?? null,
                })
                
                // If scrollToSelect is enabled and user is scrolling, trigger the option's onClick
                if (props.scrollToSelect && isUserScrolling && child?.props?.onClick) {
                    logDiagnostics('scrollToSelect:onClick', {
                        index,
                        optionValue: child?.props?.value,
                    })
                    child.props.onClick();
                }
            }}
            key={index}
        >
            {child}
        </motion.div>)
    )

    // Scroll to the element with the key === props.value
    React.useEffect(() => {
        // Skip auto-scroll if disabled (for keyboard-controlled navigation)
        if (props.disableAutoScroll) return;

        if (lastValueRef.current !== props.value) {
            logDiagnostics('valueChanged', {
                previousValue: lastValueRef.current,
                nextValue: props.value,
            })
            lastValueRef.current = props.value
        }

        // Find the element in valid children
        const index = validChildren.findIndex(child => {
            return child && child.props && child.props.value === props.value
        })

        if (index !== -1 && switchElementsRefs[index].current) {
            // Mark this as programmatic scroll so we don't play tick sounds
            isProgrammaticScroll.current = true;

            // Scroll to the element using only scrollTo (not both scrollIntoView and scrollTo)
            const container = flowSwitchContainerRef.current;
            const element = switchElementsRefs[index].current;

            if (container && element) {
                const containerRect = container.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();

                const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - (containerRect.height / 2) + (elementRect.height / 2);
                logDiagnostics('autoScroll:start', {
                    selectedValue: props.value,
                    index,
                    fromScrollTop: container.scrollTop,
                    toScrollTop: scrollTop,
                    containerHeight: containerRect.height,
                    elementTop: elementRect.top,
                })

                container.scrollTo({
                    top: scrollTop,
                    left: 0,
                    behavior: 'smooth'
                });
            }
            
            // Reset programmatic scroll flag after animation completes
            setTimeout(() => {
                isProgrammaticScroll.current = false;
                logDiagnostics('autoScroll:end', {
                    selectedValue: props.value,
                    index,
                    currentScrollTop: flowSwitchContainerRef.current?.scrollTop ?? null,
                })
            }, 500);

        }

    }, [props.value, props.disableAutoScroll, logDiagnostics])

    useScrollEnd(() => {
        if (props.onChange) {
            // props.onChange(selectedIndex);
        }

        // switchElements[selectedIndex].props.onClick()

    }, 2000)

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    // Handle scroll events - used as onScroll prop for reliability
    const handleScroll = React.useCallback(() => {
        // If this is a programmatic scroll, don't treat it as user scrolling
        if (isProgrammaticScroll.current) {
            logDiagnostics('handleScroll:programmatic', {
                scrollTop: flowSwitchContainerRef.current?.scrollTop ?? null,
            })
            return;
        }
        
        setIsUserScrolling(true);
        logDiagnostics('handleScroll:user', {
            scrollTop: flowSwitchContainerRef.current?.scrollTop ?? null,
        })
        
        // Reset user scrolling state after scroll ends
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            setIsUserScrolling(false);
            logDiagnostics('handleScroll:user:end', {
                selectedIndex,
                selectedValue: validChildren[selectedIndex]?.props?.value ?? null,
                scrollTop: flowSwitchContainerRef.current?.scrollTop ?? null,
            })
        }, 150);
    }, [logDiagnostics, selectedIndex, validChildren]);

    return (
        <motion.div className="flow-menu"
            key={props.value}
            ref={setRefs}
            onScroll={handleScroll}
            style={{
                scrollSnapType: "y mandatory",
                scrollBehavior: "smooth",
                cursor: "pointer",
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
                gap: 3.5,
                borderRadius: 5,
                border: "1px solid #BBBBBB",
                userSelect: 'none',
                WebkitUserSelect: 'none',  // For Safari
            }}>
            {switchElements}
        </motion.div>
    )
})

FlowSwitch.displayName = 'FlowSwitch'

export const OptionButton: React.FC<OptionButtonProps> = ({ onClick, onPointerDown, children }) => {
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        playUiSound('/click.mp3', 0.15)
        onClick(event);
    };

    return (
        <motion.div onPointerDown={onPointerDown} onClick={handleClick} whileTap={{ scale: 0.95 }}>
            {children}
        </motion.div>
    );
};

export const Option = (props: {
    value: string,
    onClick?: (event?: React.MouseEvent<HTMLDivElement>) => void,
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void,
    children: React.ReactElement
}) => {
    return (
        <motion.div>
            <OptionButton onClick={props.onClick || (() => {})} onPointerDown={props.onPointerDown}>
                {props.children}
            </OptionButton>
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
