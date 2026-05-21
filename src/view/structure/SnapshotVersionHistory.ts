import type { Editor } from "@tiptap/core"

export type SnapshotVersionHistoryEntry = {
    version: number
    date: number
    name?: string
}

export type SnapshotVersionHistoryOption = {
    id: string
    label: string
    version: number | null
    isCurrentLive: boolean
    isPlaceholder: boolean
    isLatest: boolean
    isAutoBackup: boolean
}

export const CURRENT_LIVE_VERSION_OPTION_ID = "current-live-version"
export const NO_VERSION_HISTORY_OPTION_ID = "no-backups"

export const getSnapshotProviderFromEditor = (editor?: Editor | null) => (
    editor?.extensionManager.extensions.find(extension => extension.name === 'snapshot')?.options?.provider ?? null
)

export const readSnapshotVersionsFromEditor = (editor?: Editor | null): SnapshotVersionHistoryEntry[] => (
    (((editor?.storage as any)?.snapshot?.versions ?? []) as Array<{
        version?: number
        date?: number
        name?: string
    }>)
        .filter(version => typeof version?.version === 'number' && typeof version?.date === 'number')
        .map(version => ({
            version: version.version as number,
            date: version.date as number,
            name: version.name,
        }))
        .sort((a, b) => b.version - a.version)
)

export const readSnapshotCurrentVersionFromEditor = (editor?: Editor | null): number => {
    const value = (editor?.storage as any)?.snapshot?.currentVersion
    return typeof value === 'number' ? value : 0
}

export const readSnapshotVersionsFromProvider = (snapshotProvider: any): SnapshotVersionHistoryEntry[] => {
    const getVersions = snapshotProvider?.getVersions
    if (typeof getVersions !== 'function') return []

    try {
        const raw = (getVersions.call(snapshotProvider) ?? []) as Array<{
            version?: number
            date?: number
            name?: string
        }>
        return raw
            .filter(version => typeof version?.version === 'number' && typeof version?.date === 'number')
            .map(version => ({
                version: version.version as number,
                date: version.date as number,
                name: version.name,
            }))
    } catch {
        return []
    }
}

export const mergeSnapshotVersionEntries = (
    ...versionLists: SnapshotVersionHistoryEntry[][]
): SnapshotVersionHistoryEntry[] => {
    const mergedByVersion = new Map<number, SnapshotVersionHistoryEntry>()
    for (const versionList of versionLists) {
        for (const version of versionList) {
            mergedByVersion.set(version.version, version)
        }
    }
    return Array.from(mergedByVersion.values()).sort((a, b) => b.version - a.version)
}

export const formatSnapshotVersionHistoryOptionLabel = (
    version: SnapshotVersionHistoryEntry,
    index: number,
): string => {
    const date = new Date(version.date)
    const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).replace(' ', '')
    const dateStr = date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
    const isLatest = index === 0
    const isAutoBackup = version.name?.startsWith('Auto ') ?? false
    const icon = isAutoBackup ? '⟳' : '📌'
    const label = version.name || `Version ${version.version}`

    return `${icon} ${timeStr} - ${dateStr}${isLatest ? ' (Latest)' : ''}${!isAutoBackup ? ` - ${label}` : ''}`
}

export const createSnapshotVersionHistoryOptions = (
    versions: SnapshotVersionHistoryEntry[],
): SnapshotVersionHistoryOption[] => [
    {
        id: CURRENT_LIVE_VERSION_OPTION_ID,
        label: 'Current live version',
        version: null,
        isCurrentLive: true,
        isPlaceholder: false,
        isLatest: false,
        isAutoBackup: false,
    },
    ...(versions.length > 0
        ? versions.map((version, index) => ({
            id: `version:${version.version}`,
            label: formatSnapshotVersionHistoryOptionLabel(version, index),
            version: version.version,
            isCurrentLive: false,
            isPlaceholder: false,
            isLatest: index === 0,
            isAutoBackup: version.name?.startsWith('Auto ') ?? false,
        }))
        : [{
            id: NO_VERSION_HISTORY_OPTION_ID,
            label: 'No version history yet',
            version: null,
            isCurrentLive: false,
            isPlaceholder: true,
            isLatest: false,
            isAutoBackup: false,
        }]),
]
