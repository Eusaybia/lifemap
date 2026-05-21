import { describe, expect, it } from "vitest"

import {
  CURRENT_LIVE_VERSION_OPTION_ID,
  createSnapshotVersionHistoryOptions,
  mergeSnapshotVersionEntries,
} from "./SnapshotVersionHistory"

describe("SnapshotVersionHistory", () => {
  it("keeps the current live option above cloud snapshot versions", () => {
    const options = createSnapshotVersionHistoryOptions([
      { version: 36, date: Date.UTC(2026, 4, 21, 8, 21), name: "Version 36" },
    ])

    expect(options[0]).toMatchObject({
      id: CURRENT_LIVE_VERSION_OPTION_ID,
      label: "Current live version",
      version: null,
      isCurrentLive: true,
    })
    expect(options[1]).toMatchObject({
      id: "version:36",
      version: 36,
      isPlaceholder: false,
    })
  })

  it("merges storage and provider versions by version number", () => {
    const versions = mergeSnapshotVersionEntries(
      [{ version: 35, date: 1, name: "Version 35" }],
      [
        { version: 36, date: 2, name: "Version 36" },
        { version: 35, date: 3, name: "Provider Version 35" },
      ],
    )

    expect(versions.map(version => version.version)).toEqual([36, 35])
    expect(versions[1].name).toBe("Provider Version 35")
  })
})
