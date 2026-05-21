import React from "react"

export type FlowSwitchValue = string | number

export type FlowSwitchOptionElement = React.ReactElement<{
    value?: FlowSwitchValue
    onClick?: (...args: any[]) => void
    onScrollSelect?: (...args: any[]) => void
}>

export const getFlowSwitchOptionElements = (
    children: React.ReactNode,
): FlowSwitchOptionElement[] =>
    React.Children.toArray(children).filter((child): child is FlowSwitchOptionElement =>
        React.isValidElement(child),
    )

export const resolveFlowSwitchValue = (
    value: FlowSwitchValue,
    options: FlowSwitchOptionElement[],
): FlowSwitchValue | undefined => {
    if (options.length === 0) {
        return undefined
    }

    const normalizedValue = String(value)
    const matchingOption = options.find((option) => String(option.props.value ?? "") === normalizedValue)

    return matchingOption?.props.value ?? options[0]?.props.value
}

export const getFlowSwitchScrollHandler = (
    option: FlowSwitchOptionElement | null | undefined,
): ((...args: any[]) => void) | undefined =>
    option?.props.onScrollSelect ?? option?.props.onClick
