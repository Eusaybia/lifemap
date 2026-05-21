import React from "react"
import { describe, expect, it, vi } from "vitest"

import { getFlowSwitchScrollHandler } from "./FlowSwitch.utils"

describe("getFlowSwitchScrollHandler", () => {
  it("uses the scroll-only handler when an option separates preview from click", () => {
    const onClick = vi.fn()
    const onScrollSelect = vi.fn()
    const option = React.createElement("div", {
      value: "version:82",
      onClick,
      onScrollSelect,
    } as any)

    getFlowSwitchScrollHandler(option)?.()

    expect(onScrollSelect).toHaveBeenCalledOnce()
    expect(onClick).not.toHaveBeenCalled()
  })

  it("falls back to click for existing scroll-to-select options", () => {
    const onClick = vi.fn()
    const option = React.createElement("div", {
      value: "editing",
      onClick,
    } as any)

    getFlowSwitchScrollHandler(option)?.()

    expect(onClick).toHaveBeenCalledOnce()
  })
})
