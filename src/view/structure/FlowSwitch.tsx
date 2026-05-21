import './styles.scss'
import { motion } from "framer-motion"
import React from "react"
import { playUiSound } from '../../utils/utils';
import { FlowSwitchValue, getFlowSwitchOptionElements, getFlowSwitchScrollHandler, resolveFlowSwitchValue } from './FlowSwitch.utils';

interface OptionButtonProps {
    onClick: (event?: React.MouseEvent<HTMLDivElement>) => void;
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
    children: React.ReactNode;
}

interface FlowSwitchProps {
    children: React.ReactNode
    value: FlowSwitchValue
    onChange?: (selectedIndex: number) => void
    isLens?: boolean
    testId?: string
    disableAutoScroll?: boolean
    /** When true, scrolling to an option will automatically trigger onScrollSelect, or onClick when no scroll-only handler is provided */
    scrollToSelect?: boolean
    /** When true, scrollToSelect fires as soon as an option enters the active band */
    instantScrollToSelect?: boolean
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
    const [isUserScrolling, setIsUserScrolling] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState<number>(0);
    const isProgrammaticScroll = React.useRef(false);
    const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const lastValueRef = React.useRef<FlowSwitchValue | undefined>(props.value);
    const pendingScrollSelectIndexRef = React.useRef<number | null>(null);
    const skipNextAutoScrollRef = React.useRef(false);
    const lastScrollSelectedValueRef = React.useRef<string | null>(null);

    const logDiagnostics = React.useCallback((event: string, details?: Record<string, unknown>) => {
        if (!props.diagnosticsEnabled) return
        const tag = props.diagnosticsTag || 'FlowSwitch'
        const timestamp = new Date().toISOString()
        console.log(`[${tag}] ${event}`, { timestamp, ...(details ?? {}) })
    }, [props.diagnosticsEnabled, props.diagnosticsTag])

    let timer: NodeJS.Timeout | null = null;

    // Filter out undefined/null children first
    const validChildren = React.useMemo(
        () => getFlowSwitchOptionElements(props.children),
        [props.children],
    );
    const optionValuesSignature = React.useMemo(
        () => validChildren.map((child) => String(child.props.value ?? "")).join("\u001f"),
        [validChildren],
    );
    const resolvedValue = React.useMemo(
        () => resolveFlowSwitchValue(props.value, validChildren),
        [props.value, optionValuesSignature],
    );
    const switchElementsRefs = React.useMemo(
        () => validChildren.map(() => React.createRef<HTMLDivElement>()),
        [optionValuesSignature],
    );

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
                
                if (props.scrollToSelect && props.instantScrollToSelect && isUserScrolling && !isProgrammaticScroll.current) {
                    const optionValue = String(child.props.value ?? "")
                    if (lastScrollSelectedValueRef.current !== optionValue) {
                        lastScrollSelectedValueRef.current = optionValue
                        pendingScrollSelectIndexRef.current = null
                        skipNextAutoScrollRef.current = true
                        logDiagnostics('scrollToSelect:instantCommit', {
                            index,
                            optionValue: child?.props?.value,
                        })
                        getFlowSwitchScrollHandler(child)?.()
                    } else {
                        logDiagnostics('scrollToSelect:alreadyCommitted', {
                            index,
                            optionValue: child?.props?.value,
                        })
                    }
                } else if (props.scrollToSelect && isUserScrolling) {
                    pendingScrollSelectIndexRef.current = index
                    logDiagnostics('scrollToSelect:pending', {
                        index,
                        optionValue: child?.props?.value,
                    })
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
        if (skipNextAutoScrollRef.current) {
            skipNextAutoScrollRef.current = false;
            logDiagnostics('autoScroll:skipped', {
                selectedValue: resolvedValue,
                requestedValue: props.value,
            })
            return;
        }

        if (lastValueRef.current !== resolvedValue) {
            logDiagnostics('valueChanged', {
                previousValue: lastValueRef.current,
                nextValue: resolvedValue,
                requestedValue: props.value,
            })
            lastValueRef.current = resolvedValue
        }

        if (resolvedValue === undefined) {
            return;
        }

        const normalizedResolvedValue = String(resolvedValue)
        const index = validChildren.findIndex(child => {
            return String(child.props?.value ?? "") === normalizedResolvedValue
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
                    selectedValue: resolvedValue,
                    requestedValue: props.value,
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
                    selectedValue: resolvedValue,
                    requestedValue: props.value,
                    index,
                    currentScrollTop: flowSwitchContainerRef.current?.scrollTop ?? null,
                })
            }, 500);

        }

    }, [props.value, props.disableAutoScroll, logDiagnostics, optionValuesSignature, resolvedValue])

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
            const pendingIndex = pendingScrollSelectIndexRef.current
            const pendingChild = pendingIndex !== null ? validChildren[pendingIndex] : null

            const pendingScrollHandler = getFlowSwitchScrollHandler(pendingChild)

            if (props.scrollToSelect && pendingScrollHandler) {
                logDiagnostics('scrollToSelect:commit', {
                    index: pendingIndex,
                    optionValue: pendingChild?.props?.value,
                    scrollTop: flowSwitchContainerRef.current?.scrollTop ?? null,
                })
                skipNextAutoScrollRef.current = true
                pendingScrollHandler()
            }

            pendingScrollSelectIndexRef.current = null
            logDiagnostics('handleScroll:user:end', {
                selectedIndex,
                selectedValue: validChildren[selectedIndex]?.props?.value ?? null,
                scrollTop: flowSwitchContainerRef.current?.scrollTop ?? null,
            })
        }, 300);
    }, [logDiagnostics, props.scrollToSelect, selectedIndex, validChildren]);

    return (
        <motion.div className="flow-menu"
            key={props.disableAutoScroll || props.instantScrollToSelect ? "flow-switch-stable" : String(props.value)}
            ref={setRefs}
            onScroll={handleScroll}
            onWheel={(event) => {
                event.stopPropagation()
            }}
            data-testid={props.testId}
            data-flow-switch={props.testId || 'flow-switch'}
            data-flow-switch-value={resolvedValue !== undefined ? String(resolvedValue) : String(props.value)}
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
                overscrollBehavior: "contain",
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
    value: FlowSwitchValue,
    onClick?: (event?: React.MouseEvent<HTMLDivElement>) => void,
    onScrollSelect?: () => void,
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void,
    children: React.ReactElement
}) => {
    return (
        <motion.div
            data-flow-switch-option={String(props.value)}
            data-testid={`flow-switch-option-${String(props.value)}`}
        >
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
