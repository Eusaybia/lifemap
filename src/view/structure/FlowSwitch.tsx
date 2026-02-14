import './styles.scss'
import { motion } from "framer-motion"
import React from "react"
import { useScrollEnd } from '../../utils/utils';

interface OptionButtonProps {
    onClick: () => void;
    children: React.ReactNode;
}

interface FlowSwitchProps {
    children: React.ReactElement[]
    value: string
    onChange?: (selectedIndex: number) => void
    isLens?: boolean
    disableAutoScroll?: boolean
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
    const [tickSound, setTickSound] = React.useState<HTMLAudioElement | null>(null);
    const isProgrammaticScroll = React.useRef(false);
    const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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
            }}
            viewport={{ root: flowSwitchContainerRef, margin: "-14px 0px -14px 0px" }}
            onViewportEnter={(entry) => {
                // TODO: Maybe it would be better to use Motion.js and its scroll functions
                // The activation box is a thin line in the middle of the flow switch
                // and activates when a child element enters this thin line.
                if (isUserScrolling && tickSound) {
                    // Clone the audio to allow rapid successive plays for a mechanical tick effect
                    const soundClone = tickSound.cloneNode() as HTMLAudioElement;
                    soundClone.volume = 0.15;
                    soundClone.play().catch(() => {});
                }   
                setSelectedIndex(index)
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

                container.scrollTo({
                    top: scrollTop,
                    left: 0,
                    behavior: 'smooth'
                });
            }
            
            // Reset programmatic scroll flag after animation completes
            setTimeout(() => {
                isProgrammaticScroll.current = false;
            }, 500);
        }

    }, [props.value, props.disableAutoScroll])

    useScrollEnd(() => {
        if (props.onChange) {
            // props.onChange(selectedIndex);
        }

        // switchElements[selectedIndex].props.onClick()

    }, 2000)

    // Initialize audio on client side only - use click.mp3 for mechanical device feel
    React.useEffect(() => {
        const audio = new Audio("/click.mp3");
        audio.volume = 0.15;
        setTickSound(audio);
        
        // Cleanup timeout on unmount
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    // Handle scroll events - used as onScroll prop for reliability
    const handleScroll = React.useCallback(() => {
        // If this is a programmatic scroll, don't treat it as user scrolling
        if (isProgrammaticScroll.current) return;
        
        setIsUserScrolling(true);
        
        // Reset user scrolling state after scroll ends
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            setIsUserScrolling(false);
        }, 150);
    }, []);

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

export const OptionButton: React.FC<OptionButtonProps> = ({ onClick, children }) => {
    const [clickSound, setClickSound] = React.useState<HTMLAudioElement | null>(null);

    React.useEffect(() => {
        const audio = new Audio('/click.mp3');
        setClickSound(audio);
    }, []);

    const handleClick = () => {
        if (clickSound) {
            clickSound.play().catch(() => {});
        }
        onClick();
    };

    return (
        <motion.div onClick={handleClick} whileTap={{ scale: 0.95 }}>
            {children}
        </motion.div>
    );
};

export const Option = (props: { value: string, onClick?: () => void, children: React.ReactElement }) => {
    return (
        <motion.div>
            <OptionButton onClick={props.onClick || (() => {})}>
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
