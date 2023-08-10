import { motion } from "framer-motion"
import React from "react"
import { black } from "../Theme"

export const Tag = (props: { children: any, isLens?: boolean }) => {

    return (
        <motion.div
            // TODO: Remove this style and make it the same as the mention css style
            style={
                {
                    boxSizing: "border-box",
                    width: "max-content",
                    height: "max-content",
                    display: "flex",
                    flexDirection: "row",
                    color: black,
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "3px 10px 3px 10px",
                    backgroundColor: props.isLens ? "rgba(217, 217, 217, 0.22)" : "rgba(250, 250, 250, 0.95)",
                    backdropFilter: props.isLens ? `blur(3px)` : ``,
                    boxShadow:
                        "0px 0.6021873017743928px 3.010936508871964px -0.9166666666666666px rgba(0, 0, 0, 0.14), 0px 2.288533303243457px 11.442666516217285px -1.8333333333333333px rgba(0, 0, 0, 0.13178), 0px 10px 50px -2.75px rgba(0, 0, 0, 0.1125)",
                    overflow: "hidden",
                    alignContent: "center",
                    flexWrap: "nowrap",
                    gap: "5px",
                    borderRadius: "5px",
                    border: "1px solid #BBBBBB"
                }
            }
            data-drag-handle
        >
            {props.children}
        </motion.div>

    )
}

export const TypeTag = (props: { icon?: string, label: string, onClick?: () => void }) => {
    return (
        <motion.div onClick={() => {
            if (props.onClick) {
                props.onClick();
                console.log("tag clicked")
            }
        }}>
            <Tag>
                {props.icon && <span>
                    {props.icon}
                </span>}
                <span>
                    {props.label}
                </span>
            </Tag>
        </motion.div>
    )
}

export const ExampleTypeTag = () => {
    return (
        <TypeTag icon="🏘️" label="Type" />
    )
}