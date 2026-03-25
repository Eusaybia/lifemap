import { describe, expect, it } from "vitest";

import {
  mergeBrowserSurfaceState,
  type BrowserSurfaceState,
} from "./BrowserWindowExtension";

describe("mergeBrowserSurfaceState", () => {
  const currentState: BrowserSurfaceState = {
    url: "https://kairoslifemap.com",
    title: "Kairos Lifemap",
    loading: false,
    canGoBack: false,
    canGoForward: false,
  };

  it("updates the tracked URL when Electron reports a new navigation target", () => {
    expect(
      mergeBrowserSurfaceState(currentState, {
        type: "url",
        url: "https://example.com/docs",
      }),
    ).toEqual({
      url: "https://example.com/docs",
      title: "Kairos Lifemap",
      loading: false,
      canGoBack: false,
      canGoForward: false,
    });
  });

  it("preserves the current URL when unrelated surface events omit it", () => {
    expect(
      mergeBrowserSurfaceState(currentState, {
        type: "loadState",
        loading: true,
        canGoBack: true,
      }),
    ).toEqual({
      url: "https://kairoslifemap.com",
      title: "Kairos Lifemap",
      loading: true,
      canGoBack: true,
      canGoForward: false,
    });
  });

  it("applies a full surface state snapshot from getState polling", () => {
    expect(
      mergeBrowserSurfaceState(currentState, {
        url: "https://news.ycombinator.com",
        title: "Hacker News",
        loading: false,
        canGoBack: true,
        canGoForward: true,
      }),
    ).toEqual({
      url: "https://news.ycombinator.com",
      title: "Hacker News",
      loading: false,
      canGoBack: true,
      canGoForward: true,
    });
  });
});
