import { Editor, isNodeSelection, getAttributes } from "@tiptap/core"
import { BubbleMenu } from "@tiptap/react"
import { RichTextCodeExample, customExtensions } from "../content/RichText"
import { motion, AnimatePresence } from "framer-motion"
import IconButton from '@mui/joy/IconButton';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatStrikethrough from '@mui/icons-material/FormatStrikethrough';
import FormatAlignLeft from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCentre from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRight from '@mui/icons-material/FormatAlignRight';
import FormatAlignJustify from '@mui/icons-material/FormatAlignJustify';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import { Tag } from "../content/Tag"
import { black, blue, grey, highlightYellow, purple, red, offWhite, lightBlue, parchment, highlightGreen, teal, green } from "../Theme"
import FormatColorFill from "@mui/icons-material/FormatColorFill"
import { FlowSwitch, Option } from "./FlowSwitch"
import React, { CSSProperties, useCallback, useEffect, useState } from "react"
import { MathLens } from "../../core/Model";
import { copySelectedNodeToClipboard, getSelectedNode, getSelectedNodeType, logCurrentLens } from "../../utils/utils";
import { DocumentAttributes } from "./DocumentAttributesExtension";
import { SalesGuideTemplate } from "../content/SalesGuideTemplate";
import { backup, quantaBackup, QuantaBackupEntry } from "../../backend/backup";
import { useAutoBackup, AutoBackupStatus } from "../../backend/useAutoBackup";
import { yellow } from "@mui/material/colors";
import { useEditorContext } from "../../contexts/EditorContext";

export const flowMenuStyle = (allowScroll: boolean = true): React.CSSProperties => {
    return {
        boxSizing: "border-box",
        flexShrink: 0,
        width: "max-content",
        height: "fit-content",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        padding: "5px 15px 5px 15px",
        boxShadow:
            "0px 0.6021873017743928px 3.010936508871964px -0.9166666666666666px rgba(0, 0, 0, 0.14), 0px 2.288533303243457px 11.442666516217285px -1.8333333333333333px rgba(0, 0, 0, 0.13178), 0px 10px 50px -2.75px rgba(0, 0, 0, 0.1125)",
        backgroundColor: `rgba(217, 217, 217, 0.20)`,
        backdropFilter: `blur(12px)`,
        overflow: allowScroll ? "scroll" : "visible",
        zIndex: 1,
        alignContent: "center",
        flexWrap: "nowrap",
        gap: "10px",
        borderRadius: "10px",
        border: "1px solid var(--Light_Grey, rgba(221,221,221,0.75))"
    }
}

type Action = (editor: Editor) => boolean

const handleCopyNodeJSONContentToClipboardAction: Action = (editor: Editor) => {
    copySelectedNodeToClipboard(editor)

    return false;
}

const handleCopyQuantaIdAction: Action = (editor: Editor) => {
    const selectedNode = getSelectedNode(editor)

    if (selectedNode) {
        const quantaId: string = selectedNode.attrs.quantaId
        const quantaIdWithoutQuotes = JSON.stringify(quantaId).slice(1, -1)
        navigator.clipboard.writeText(quantaIdWithoutQuotes).then(() => {
            console.log('Copying to clipboard was successful!');
            return true
        }, (err) => {
            console.error('Could not copy text: ', err);
            return false
        });
    } else {
        console.error('Attempted to invoke copy quanta id action when a node was not selected. ');
        return false
    }
    return false
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

const handleAddImage = (editor: Editor) => {
    console.log('[FlowMenu] handleAddImage called')
    
    // Create a hidden file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    
    input.onchange = async (e) => {
        console.log('[FlowMenu] File input changed')
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) {
            console.log('[FlowMenu] No file selected')
            return
        }
        
        console.log('[FlowMenu] File selected:', file.name, file.size)
        
        // Validate file size
        if (file.size > MAX_IMAGE_SIZE) {
            alert(`File size exceeds maximum allowed (${MAX_IMAGE_SIZE / (1024 * 1024)}MB)`)
            return
        }
        
        try {
            console.log('[FlowMenu] Starting upload...')
            
            // Upload to Vercel Blob via API route
            const response = await fetch(
                `/api/upload?filename=${encodeURIComponent(file.name)}`,
                {
                    method: 'POST',
                    body: file,
                }
            )
            
            console.log('[FlowMenu] Upload response status:', response.status)
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Upload failed')
            }
            
            const blob = await response.json()
            
            console.log('[FlowMenu] Image uploaded successfully:', blob.url)
            console.log('[FlowMenu] Editor state:', editor ? 'exists' : 'null')
            console.log('[FlowMenu] Editor editable:', editor?.isEditable)
            
            // Use setImage command which is simpler
            const result = editor.chain().focus().setImage({ src: blob.url }).run()
            
            console.log('[FlowMenu] setImage result:', result)
        } catch (error) {
            console.error('[FlowMenu] Image upload failed:', error)
            alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
    
    // Trigger file picker
    input.click()
    return true
}

// For some reason if I hard code a string like "latex", it works, but if I use the variable mathLens it doesn't?
const setDisplayLensLatex = (editor: Editor) => {
    editor!.chain().focus().updateAttributes("math", { lensDisplay: "latex" }).run();
}

const setDisplayLensNatural = (editor: Editor) => {
    editor!.chain().focus().updateAttributes("math", { lensDisplay: "natural" }).run();
}

const setEvaluationLens = (editor: Editor, mathLens: MathLens) => {
    console.log("setting evaluation lens:", mathLens)
    editor!.chain().focus().updateAttributes("math", { lensEvaluation: mathLens }).run();
}

const setMathsLens = (editor: Editor, mathLens: MathLens) => {
    editor!.chain().focus().updateAttributes("math", { lensDisplay: mathLens }).run();

    // Get the current selection
    // Problem seems to be that when I interact with the flow switch, the selection changes to something other than the math node
    // @ts-ignore

 };

// Simple toast notification component
const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => {
    React.useEffect(() => {
        const timer = setTimeout(onClose, 3000); // Auto-dismiss after 3 seconds
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
                position: 'fixed',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#333',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 10000,
                pointerEvents: 'auto',
            }}
        >
            {message}
        </motion.div>
    );
};

/**
 * AutoSaveIndicator - Shows the current auto-save status
 * Mimics Google Docs' "All changes saved" indicator
 * 
 * States:
 * - idle: No recent activity, shows last saved time
 * - saving: Currently saving (shows spinner)
 * - saved: Just saved (shows checkmark, then fades to idle)
 * - error: Save failed (shows error message)
 */
const AutoSaveIndicator = ({ 
    status, 
    lastSavedAt 
}: { 
    status: AutoBackupStatus; 
    lastSavedAt: number | null;
}) => {
    const [displayStatus, setDisplayStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>(status);
    
    // Transition from 'saved' back to 'idle' after a brief display
    React.useEffect(() => {
        if (status === 'saved') {
            setDisplayStatus('saved');
            const timer = setTimeout(() => {
                setDisplayStatus('idle');
            }, 2000); // Show "Saved" for 2 seconds
            return () => clearTimeout(timer);
        } else {
            setDisplayStatus(status);
        }
    }, [status]);
    
    const formatLastSaved = (timestamp: number | null): string => {
        if (!timestamp) return '';
        
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    const getStatusContent = () => {
        switch (displayStatus) {
            case 'saving':
                return (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            style={{ display: 'inline-block' }}
                        >
                            ⟳
                        </motion.span>
                        Saving...
                    </motion.span>
                );
            case 'saved':
                return (
                    <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4CAF50' }}
                    >
                        ✓ Saved
                    </motion.span>
                );
            case 'error':
                return (
                    <motion.span style={{ color: '#f44336' }}>
                        ⚠ Save failed
                    </motion.span>
                );
            case 'idle':
            default:
                return lastSavedAt ? (
                    <span style={{ color: '#999' }}>
                        Saved {formatLastSaved(lastSavedAt)}
                    </span>
                ) : (
                    <span style={{ color: '#999' }}>
                        Auto-save enabled
                    </span>
                );
        }
    };
    
    return (
        <motion.div
            style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 6,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                minWidth: 100,
                justifyContent: 'center',
            }}
        >
            {getStatusContent()}
        </motion.div>
    );
};

// Memoize ActionSwitch to prevent re-renders if props haven't changed
const ActionSwitch = React.memo((props: { 
    selectedAction: string, 
    editor: Editor | null, 
    nodeType?: string,
    // Auto-backup props
    autoBackupStatus?: AutoBackupStatus,
    autoBackupLastSavedAt?: number | null,
    onTriggerBackup?: () => void
}) => {
    // Return null if editor is not available yet
    if (!props.editor) {
        return null;
    }
    
    // State for quanta backups
    const [quantaBackups, setQuantaBackups] = React.useState<QuantaBackupEntry[]>([]);
    const [currentQuantaId, setCurrentQuantaId] = React.useState<string | null>(null);
    
    // Toast notification state
    const [toastMessage, setToastMessage] = React.useState<string | null>(null);
    
    // Load backups on mount and when quantaId changes
    React.useEffect(() => {
        const quantaId = quantaBackup.getCurrentQuantaId();
        setCurrentQuantaId(quantaId);
        if (quantaId) {
            setQuantaBackups(quantaBackup.getBackupsForDisplay(quantaId));
        }
    }, []);
    
    // Refresh backups when auto-backup creates a new one
    React.useEffect(() => {
        if (props.autoBackupStatus === 'saved' && currentQuantaId) {
            setQuantaBackups(quantaBackup.getBackupsForDisplay(currentQuantaId));
        }
    }, [props.autoBackupStatus, currentQuantaId]);
    
    // @ts-ignore - getDocumentAttributes exists via the extension
    const documentAttributes: DocumentAttributes = props.editor.commands.getDocumentAttributes();
    const isDevMode = documentAttributes.selectedFocusLens === 'dev-mode';

    return (
        <>
        <FlowSwitch value={props.selectedAction} isLens>
            {isDevMode && (
                <Option
                    value={"Copy node to clipboard"}
                    onClick={() => {
                        copySelectedNodeToClipboard(props.editor)
                    }}
                >
                    <motion.div>
                        <span>
                            📋 Copy node to clipboard
                        </span>
                    </motion.div>
                </Option>
            )}
            {isDevMode && (
                <Option
                    value={"Replace page with 'Sales Guide' template"}
                    onClick={() => {
                        props.editor.commands.setContent(SalesGuideTemplate);
                    }}
                >
                    <motion.div>
                        <span>
                            💰 Insert Sales Guide Template
                        </span>
                    </motion.div>
                </Option>
            )}
            {isDevMode && (
                <Option
                    value={"Copy quanta id"}
                    onClick={() => handleCopyQuantaIdAction(props.editor)}
                >
                    <motion.div>
                        <span>
                            🆔 Copy quanta id
                        </span>
                    </motion.div>
                </Option>
            )}
            <Option
                value={"Insert 2 columns"}
                onClick={() => {
                    props.editor.chain()
                        .focus()
                        // First insert the table
                        .insertTable({ rows: 1, cols: 2, withHeaderRow: false })
                        // Then ensure each cell has a paragraph
                        .insertContent({ type: 'paragraph' })
                        .run()
                }}
            >
                <motion.div>
                    <span style={{}}>
                        🏛️ Insert 2 columns
                    </span>
                </motion.div>
            </Option>
            <Option
                value={"Insert 3 columns"}
                onClick={() => {
                    props.editor.chain()
                        .focus()
                        // First insert the table
                        .insertTable({ rows: 1, cols: 3, withHeaderRow: false })
                        // Then ensure each cell has a paragraph
                        .insertContent({ type: 'paragraph' })
                        .run()
                }}
            >
                <motion.div>
                    <span style={{}}>
                        🏛️ Insert 3 columns
                    </span>
                </motion.div>
            </Option>
            {isDevMode && (
                <Option
                    value={"Copy content"}
                    onClick={() => handleCopyNodeJSONContentToClipboardAction(props.editor)}
                >
                    <motion.div>
                        <span style={{}}>
                            📑 Copy content
                        </span>
                    </motion.div>
                </Option>
            )}
            <Option
                value={"Add Details"}
                onClick={() => props.editor.commands.setDetails()}
            >
                <motion.div>
                    <span>
                        ▶ Add Details
                    </span>
                </motion.div>
            </Option>
            <Option
                value={"Add image"}
                onClick={() => { handleAddImage(props.editor) }}
            >
                <motion.div>
                    <span>
                        🌁 Add image
                    </span>
                </motion.div>
            </Option>
            <Option
                value={"Add Warning group"}
                // Change this to a proper add warning command inside the extension
                onClick={() => props.editor.commands.insertContent({ type: "warning" })}
            >
                <motion.div>
                    <span>
                        ⚠ Add Warning group
                    </span>
                </motion.div>
            </Option>
            <Option
                value={"Add Lifemap Cards"}
                onClick={() => {
                    if (!props.editor) return;
                    // @ts-ignore - insertLifemapCard is added by the extension
                    props.editor.commands.insertLifemapCard({ title: 'New Card' })
                }}
            >
                <motion.div>
                    <span>
                        🗂️ Add Lifemap Cards
                    </span>
                </motion.div>
            </Option>
            <Option
                value={"Add 2D Temporal Graph"}
                onClick={() => {
                    if (!props.editor) return;
                    // @ts-ignore - insertQuantaFlow is added by the extension
                    props.editor.commands.insertQuantaFlow({ height: 400 })
                }}
            >
                <motion.div>
                    <span>
                        📊 Add 2D Temporal Graph
                    </span>
                </motion.div>
            </Option>
            <Option
                value={"Add Monthly Cycles Calendar"}
                onClick={() => {
                    if (!props.editor) return;
                    // @ts-ignore - insertCalendar is added by the CalendarExtension
                    props.editor.commands.insertCalendar()
                }}
            >
                <motion.div>
                    <span>
                        📅 Add Monthly Cycles Calendar
                    </span>
                </motion.div>
            </Option>
            <Option
                value={"Add Mapbox Map"}
                onClick={() => {
                    if (!props.editor) return;
                    // @ts-ignore - insertMapboxMap is added by the extension
                    props.editor.commands.insertMapboxMap()
                }}
            >
                <motion.div>
                    <span>
                        🗺️ Add Mapbox Map
                    </span>
                </motion.div>
            </Option>
            <Option
                value={"Insert Daily Schedule"}
                onClick={() => {
                    if (!props.editor) return;
                    // @ts-ignore - insertDaily is added by the DailyExtension
                    props.editor.commands.insertDaily()
                }}
            >
                <motion.div>
                    <span>
                        📅 Insert Daily Schedule
                    </span>
                </motion.div>
            </Option>
            <Option
                value={"Insert Day Header"}
                onClick={() => {
                    if (!props.editor) return;
                    // @ts-ignore - insertDayHeader is added by the DayHeaderExtension
                    props.editor.commands.insertDayHeader()
                }}
            >
                <motion.div>
                    <span>
                        🌄 Insert Day Header
                    </span>
                </motion.div>
            </Option>
            <Option
                value={"Insert Temporal Space"}
                onClick={() => {
                    if (!props.editor) return;
                    // @ts-ignore - insertTemporalSpace is added by the TemporalSpaceExtension
                    props.editor.commands.insertTemporalSpace()
                }}
            >
                <motion.div>
                    <span>
                        ⏱️ Insert Temporal Space
                    </span>
                </motion.div>
            </Option>
            {isDevMode && (
                <Option
                    value={"Revert to last valid content"}
                    onClick={() => {
                        const lastValidContent = backup.getLastValidContent();
                        if (lastValidContent) {
                            props.editor.commands.setContent(lastValidContent);
                        } else {
                            console.warn('No valid backup content found');
                        }
                    }}
                >
                    <motion.div>
                        <span>
                            ↩️ Revert to last valid content
                        </span>
                    </motion.div>
                </Option>
            )}
            <Option
                value={"Copy document JSON to clipboard"}
                onClick={() => {
                    const json = props.editor.getJSON();
                    const jsonString = JSON.stringify(json, null, 2);
                    navigator.clipboard.writeText(jsonString).then(() => {
                        console.log('Document JSON copied to clipboard!');
                        alert('Document JSON copied to clipboard!');
                    }, (err) => {
                        console.error('Could not copy JSON: ', err);
                        // Fallback: download as file
                        const blob = new Blob([jsonString], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `document-${Date.now()}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                    });
                }}
            >
                <motion.div>
                    <span>
                        📋 Copy document JSON to clipboard
                    </span>
                </motion.div>
            </Option>
            <Option
                value={"Download document JSON"}
                onClick={() => {
                    const json = props.editor.getJSON();
                    const jsonString = JSON.stringify(json, null, 2);
                    const blob = new Blob([jsonString], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const urlId = window.location.pathname.split('/').pop() || 'document';
                    a.download = `${urlId}-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                }}
            >
                <motion.div>
                    <span>
                        💾 Download document JSON
                    </span>
                </motion.div>
            </Option>
            {/* 
              Auto-Save Status Indicator (Google Docs-like)
              Shows current save status: saving, saved, or last saved time
              Replaces the manual "Create backup" button with automatic saving
            */}
            {currentQuantaId && props.autoBackupStatus && (
                <Option
                    value={"auto-save-status"}
                    onClick={() => {
                        // Clicking triggers a manual backup (like Google Docs' manual save)
                        if (props.onTriggerBackup) {
                            props.onTriggerBackup();
                            setToastMessage('Manual backup created');
                        }
                    }}
                >
                    <AutoSaveIndicator 
                        status={props.autoBackupStatus} 
                        lastSavedAt={props.autoBackupLastSavedAt ?? null}
                    />
                </Option>
            )}
            {/* Manual backup option - create a named version (like Google Docs' "Name current version") */}
            {currentQuantaId && (
                <Option
                    value={"Create named version"}
                    onClick={() => {
                        if (!currentQuantaId) {
                            console.warn('[FlowMenu] Cannot create backup: no quanta ID found');
                            return;
                        }
                        try {
                            const content = props.editor.getJSON();
                            const newBackup = quantaBackup.createBackup(currentQuantaId, content);
                            // Refresh the backups list
                            setQuantaBackups(quantaBackup.getBackupsForDisplay(currentQuantaId));
                            setToastMessage(`Version saved: ${newBackup.label}`);
                        } catch (e) {
                            console.error('[FlowMenu] Failed to create backup:', e);
                            setToastMessage('Failed to create version');
                        }
                    }}
                >
                    <motion.div>
                        <span>
                            📌 Name current version
                        </span>
                    </motion.div>
                </Option>
            )}
        </FlowSwitch>
        
        {/* Version History FlowSwitch - shows backups for current quanta (newest to oldest) */}
        {/* Hidden for group nodes */}
        {/* Shows both auto-backups (⟳) and manual named versions (📌) */}
        {currentQuantaId && props.nodeType !== 'group' && (
            <FlowSwitch value={"restore"} isLens>
                {quantaBackups.length > 0 ? (
                    quantaBackups.map((backup, index) => {
                        const date = new Date(backup.timestamp);
                        const timeStr = date.toLocaleTimeString('en-GB', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false
                        });
                        const dateStr = date.toLocaleDateString('en-GB', { 
                            day: 'numeric',
                            month: 'short'
                        });
                        const isLatest = index === 0; // First in display order = most recent
                        const isAutoBackup = backup.isAutoBackup;
                        const icon = isAutoBackup ? '⟳' : '📌'; // Auto vs manual indicator
                        
                        return (
                            <Option
                                key={backup.timestamp}
                                value={backup.label}
                                onClick={() => {
                                    if (window.confirm(`Restore to ${isAutoBackup ? 'auto-save' : 'version'} from ${timeStr} ${dateStr}?`)) {
                                        props.editor.commands.setContent(backup.content);
                                        console.log(`[FlowMenu] Restored to backup ${backup.label}`);
                                        setToastMessage(`Restored to ${backup.label}`);
                                    }
                                }}
                            >
                                <motion.div>
                                    <span style={{ 
                                        fontFamily: 'Inter', 
                                        fontSize: '13px',
                                        color: isAutoBackup ? '#666' : '#333'
                                    }}>
                                        {icon} {timeStr} {dateStr}
                                        {isLatest ? ' (Latest)' : ''}
                                        {!isAutoBackup && ` - ${backup.label}`}
                                    </span>
                                </motion.div>
                            </Option>
                        );
                    })
                ) : (
                    [<Option key="no-backups" value={"no-backups"} onClick={() => {}}>
                        <motion.div>
                            <span style={{ fontFamily: 'Inter', fontSize: '13px', color: '#999' }}>
                                No version history yet
                            </span>
                        </motion.div>
                    </Option>]
                )}
            </FlowSwitch>
        )}
        {/* Toast notification for backup feedback */}
        <AnimatePresence>
            {toastMessage && (
                <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
            )}
        </AnimatePresence>
        </>
    )
})

const VersionHistorySwitch = (props: { selectedVersionHistory: string, editor: Editor }) => {
    const versions = props.editor.storage.collabHistory.versions

    return (<FlowSwitch value={props.editor.storage.collabHistory.currentVersion}>
        {versions ? versions.map((version: number) => (
            <>
                <Option
                    value={version.toString()}
                    onClick={() => props.editor.commands.revertToVersion(version)}
                >
                    <>
                        {version.toString()}
                    </>
                </Option>
            </>)) :
            <>
                <Option
                    value={"000000"}
                    onClick={() => { }}
                >
                    <>
                        {"No version history available"}
                    </>
                </Option>
                <Option
                    value={"000000"}
                    onClick={() => { }}
                >
                    <>
                        {"No version history available"}
                    </>
                </Option>
            </>
        }
    </FlowSwitch>)
}

export const DocumentFlowMenu = (props: { editor?: Editor }) => {
    // Use editor from context (shared by RichText) if available, fallback to prop
    const { editor: contextEditor } = useEditorContext()
    const editor = contextEditor || props.editor
    
    const [selectedAction, setSelectedAction] = React.useState<string>("Copy quanta id")
    
    // Get current quanta ID from URL
    const [currentQuantaId, setCurrentQuantaId] = React.useState<string | null>(null)
    React.useEffect(() => {
        setCurrentQuantaId(quantaBackup.getCurrentQuantaId())
    }, [])
    
    // Auto-backup hook - implements Google Docs-like auto-save strategy
    // Saves 2s after typing stops, creates snapshots every 5 minutes,
    // and saves on page events (blur, visibility change, beforeunload)
    const { 
        status: autoBackupStatus, 
        lastSavedAt: autoBackupLastSavedAt,
        triggerBackup 
    } = useAutoBackup(editor, currentQuantaId, {
        enabled: true,
        onBackupCreated: (timestamp) => {
            console.log('[DocumentFlowMenu] Auto-backup created at', new Date(timestamp).toLocaleTimeString())
        },
        onError: (error) => {
            console.error('[DocumentFlowMenu] Auto-backup error:', error)
        }
    })
    
    // Get current editor mode from document attributes
    // @ts-ignore - getDocumentAttributes exists via the extension
    const documentAttributes: DocumentAttributes = editor?.commands.getDocumentAttributes() || { editorMode: 'editing' };
    const editorMode = documentAttributes.editorMode || 'editing';

    let documentMenuStyle: CSSProperties = flowMenuStyle(false)
    documentMenuStyle.width = "fit-content"
    documentMenuStyle.position = 'fixed';
    documentMenuStyle.top = 0;
    documentMenuStyle.right = '80px'; // Account for minimap width (60px) + some padding
    documentMenuStyle.left = 'auto';
    documentMenuStyle.zIndex = 10001; // Higher than minimap's z-index of 10000

    // Don't render if no editor is available
    if (!editor) {
        return null
    }

    return (
        <motion.div style={documentMenuStyle}>
            {/* Editor Mode Toggle - Editing vs Connection mode */}
            <FlowSwitch value={editorMode} isLens>
                <Option 
                    value="editing" 
                    onClick={() => {
                        console.log('[DocumentFlowMenu] Switching to Editing mode');
                        editor.commands.setDocumentAttribute({ editorMode: 'editing' });
                    }}
                >
                    <motion.div>
                        <span>✏️ Editing</span>
                    </motion.div>
                </Option>
                <Option 
                    value="connection" 
                    onClick={() => {
                        console.log('[DocumentFlowMenu] Switching to Connection mode');
                        editor.commands.setDocumentAttribute({ editorMode: 'connection' });
                    }}
                >
                    <motion.div>
                        <span>🔗 Connection</span>
                    </motion.div>
                </Option>
            </FlowSwitch>
            <ActionSwitch 
                editor={editor} 
                selectedAction={selectedAction}
                autoBackupStatus={autoBackupStatus}
                autoBackupLastSavedAt={autoBackupLastSavedAt}
                onTriggerBackup={triggerBackup}
            />
        </motion.div>
    )
}

// Memoize GroupLoupe
const GroupLoupe = React.memo((props: { editor: Editor }) => {
    const selectedNode = getSelectedNode(props.editor)
    let backgroundColor = selectedNode.attrs.backgroundColor
    let lens = selectedNode.attrs.lens

    return (
        <div
            style={{ display: "flex", gap: 5, height: "fit-content", alignItems: "center", overflow: "visible" }}>
            {/* Lenses - leftmost */}
            <FlowSwitch value={lens} isLens scrollToSelect>
                <Option value={"identity"} onClick={() => {
                    props.editor.commands.setGroupLens({ lens: "identity" })
                }}>
                    <motion.div>
                        Identity
                    </motion.div>
                </Option>
                <Option value={"chip"} onClick={() => {
                    props.editor.commands.setGroupLens({ lens: "chip" })
                }}>
                    <motion.div>
                        🏷️ Chip
                    </motion.div>
                </Option>
                <Option value={"preview"} onClick={() => {
                    props.editor.commands.setGroupLens({ lens: "preview" })
                }}>
                    <motion.div>
                        👁️ Preview
                    </motion.div>
                </Option>
                <Option value={"collapsed"} onClick={() => {
                    props.editor.commands.setGroupLens({ lens: "collapsed" })
                }}>
                    <motion.div>
                        📦 Collapsed
                    </motion.div>
                </Option>
                <Option value={"private"} onClick={() => {
                    props.editor.commands.setGroupLens({ lens: "private" })
                }}>
                    <motion.div>
                        🔒 Private
                    </motion.div>
                </Option>
            </FlowSwitch>
            <Tag>
                Group
            </Tag>
            {/* Background color options */}
            <FlowSwitch value={backgroundColor} isLens>
                <Option
                    value={"lightBlue"}
                    onClick={() => {
                        props.editor.commands.setBackgroundColor({ backgroundColor: lightBlue })
                    }}
                >
                    <motion.div>
                        <span style={{ backgroundColor: lightBlue, borderRadius: 3 }}>
                            🎨️ Change background color to light blue
                        </span>
                    </motion.div>
                </Option>
                <Option
                    value={"purple"}
                    onClick={() => {
                        props.editor.commands.setBackgroundColor({ backgroundColor: purple })
                    }}
                >
                    <motion.div>
                        <span style={{ backgroundColor: purple, borderRadius: 3 }}>
                            🎨️ Change background color to purple
                        </span>
                    </motion.div>
                </Option>
                <Option
                    value={"parchment"}
                    onClick={() => {
                        props.editor.commands.setBackgroundColor({ backgroundColor: parchment })
                    }}
                >
                    <motion.div>
                        <span style={{ backgroundColor: purple, borderRadius: 3 }}>
                            🎨️ Change background color to parchment
                        </span>
                    </motion.div>
                </Option>
                <Option
                    value={"blue"}
                    onClick={() => {
                        props.editor.commands.setBackgroundColor({ backgroundColor: blue })
                    }}
                >
                    <motion.div>
                        <span style={{ backgroundColor: blue, borderRadius: 3 }}>
                            🎨️ Change background color to blue
                        </span>
                    </motion.div>
                </Option>
                <Option
                    value={"Change background color to white"}
                    onClick={() => {
                        props.editor.commands.setBackgroundColor({ backgroundColor: offWhite });
                    }}
                >
                    <motion.div>
                        <span style={{ backgroundColor: offWhite, borderRadius: 3 }}>
                            🎨️ Change background color to white
                        </span>
                    </motion.div>
                </Option>
            </FlowSwitch>
        </div>
    )
})

// Memoize TemporalSpaceLoupe - similar to GroupLoupe but with "Temporal Space" tag
const TemporalSpaceLoupe = React.memo((props: { editor: Editor }) => {
    const selectedNode = getSelectedNode(props.editor)
    let lens = selectedNode.attrs.lens

    return (
        <div
            style={{ display: "flex", gap: 5, height: "fit-content", alignItems: "center", overflow: "visible" }}>
            {/* Lenses - leftmost */}
            <FlowSwitch value={lens} isLens scrollToSelect>
                <Option value={"identity"} onClick={() => {
                    props.editor.commands.setTemporalSpaceLens({ lens: "identity" })
                }}>
                    <motion.div>
                        Identity
                    </motion.div>
                </Option>
                <Option value={"collapsed"} onClick={() => {
                    props.editor.commands.setTemporalSpaceLens({ lens: "collapsed" })
                }}>
                    <motion.div>
                        📦 Collapsed
                    </motion.div>
                </Option>
            </FlowSwitch>
            <Tag>
                Temporal Space
            </Tag>
        </div>
    )
})

// Memoize MathLoupe and manage its state locally
const MathLoupe = React.memo((props: { editor: Editor }) => {
    const { editor } = props;
    const [selectedDisplayLens, setSelectedDisplayLens] = useState<string>("natural");
    const [selectedEvaluationLens, setSelectedEvaluationLens] = useState<string>("identity"); // Default or initial value

    useEffect(() => {
        const updateLenses = () => {
            const selection = editor.state.selection;
            if (isNodeSelection(selection)) {
                const node = selection.node;
                if (node.type.name === 'math') {
                    const { lensDisplay, lensEvaluation } = node.attrs;
                    if (lensDisplay) {
                        setSelectedDisplayLens(lensDisplay);
                    }
                    if (lensEvaluation) {
                        setSelectedEvaluationLens(lensEvaluation);
                    }
                }
            }
        };

        // Update immediately on mount/editor change
        updateLenses();

        // Subscribe to selection updates
        editor.on('selectionUpdate', updateLenses);

        // Cleanup subscription
        return () => {
            editor.off('selectionUpdate', updateLenses);
        };
    }, [editor]); // Re-run effect if editor instance changes

    // Wrap callbacks with useCallback to ensure stable references if passed to memoized children
    const handleSetDisplayLens = useCallback((lens: MathLens) => {
        editor.chain().focus().updateAttributes("math", { lensDisplay: lens }).run();
    }, [editor]);

    const handleSetEvaluationLens = useCallback((lens: MathLens) => {
        editor.chain().focus().updateAttributes("math", { lensEvaluation: lens }).run();
    }, [editor]);

    return (
        <div
            style={{ display: "flex", gap: 5, height: "fit-content", alignItems: "center", overflow: "visible" }}>
            <Tag>
                Math
            </Tag>
            <FlowSwitch value={selectedDisplayLens} isLens>
                <Option value="natural" onClick={() => handleSetDisplayLens("natural")}>
                    <motion.div>
                        <div style={{ fontFamily: 'Inter' }}>
                            Natural
                        </div>
                    </motion.div>
                </Option>
                <Option value="latex" onClick={() => handleSetDisplayLens("latex")}>
                    <motion.div>
                        <span style={{ fontFamily: 'Inter' }}>
                            Latex
                        </span>
                    </motion.div>
                </Option>
                <Option value="linear" onClick={() => handleSetDisplayLens("linear")}>
                    <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Arial').run()}>
                        <span style={{ fontFamily: 'Inter' }}>
                            Linear
                        </span>
                    </motion.div>
                </Option>
                <Option value="mathjson" onClick={() => handleSetDisplayLens("mathjson")}>
                    <motion.div onClick={() => props.editor!.chain().focus().setFontFamily('Arial').run()}>
                        <span style={{ fontFamily: 'Inter' }}>
                            MathJSON
                        </span>
                    </motion.div>
                </Option>
            </FlowSwitch>
            <FlowSwitch value={selectedEvaluationLens} isLens >
                <Option value="identity" onClick={() => handleSetEvaluationLens("identity")} >
                    <motion.div>
                        <span style={{ fontFamily: 'Inter' }}>
                            Identity
                        </span>
                    </motion.div>
                </Option>
                <Option value="simplify" onClick={() => handleSetEvaluationLens("simplify")} >
                    <motion.div>
                        <span style={{ fontFamily: 'Inter' }}>
                            Simplify
                        </span>
                    </motion.div>
                </Option>
                <Option value="evaluate" onClick={() => handleSetEvaluationLens("evaluate")} >
                    <motion.div>
                        <span style={{ fontFamily: 'Inter' }}>
                            Evaluate
                        </span>
                    </motion.div>
                </Option>
                <Option value="numeric" onClick={() => handleSetEvaluationLens("numeric")} >
                    <motion.div>
                        <span style={{ fontFamily: 'Inter' }}>
                            Numeric
                        </span>
                    </motion.div>
                </Option>
            </FlowSwitch>
        </div>
    )
})

// Need to add additional state variables that currently have a placeholder using justification
// Memoize RichTextLoupe
const RichTextLoupe = React.memo((props: { editor: Editor, font: string, fontSize: string, justification: string }) => {
    return (
        <div
            style={{ display: "flex", gap: 5, height: "fit-content", overflowX: "scroll", alignItems: "center", overflow: "visible" }}>
            <Tag>
                Rich Text
            </Tag>
            <FlowSwitch value={props.font} isLens>
                <Option value={"EB Garamond"} onClick={() => props.editor!.chain().focus().setFontFamily('EB Garamond').run()}>
                    <motion.div>
                        <span style={{ fontFamily: 'EB Garamond' }}>
                            EB Garamond
                        </span>
                    </motion.div>
                </Option>
                <Option value={"Inter"} onClick={() => props.editor!.chain().focus().setFontFamily('Inter').run()}>
                    <motion.div>
                        <span style={{ fontFamily: 'Inter' }}>
                            Inter
                        </span>
                    </motion.div>
                </Option>
                <Option value={"Arial"} onClick={() => props.editor!.chain().focus().setFontFamily('Arial').run()}>
                    <motion.div>
                        <span style={{ fontFamily: 'Arial' }}>
                            Arial
                        </span>
                    </motion.div>
                </Option>
            </FlowSwitch>
            <FlowSwitch value={`${props.fontSize}px`} isLens>
                <Option
                    value={"36px"}
                    onClick={() => { props.editor!.chain().focus().setFontSize('36px').run() }}
                >
                    <motion.div>
                        <span style={{ fontFamily: 'Inter' }}>
                            36 px
                        </span>
                    </motion.div>
                </Option>
                <Option
                    value={"30px"}
                    onClick={() => { props.editor!.chain().focus().setFontSize('30px').run() }}
                >
                    <motion.div>
                        <span style={{ fontFamily: 'Inter' }}>
                            30 px
                        </span>
                    </motion.div>
                </Option>
                <Option
                    value={"24px"}
                    onClick={() => props.editor!.chain().focus().setFontSize('24px').run()}
                >
                    <motion.div>
                        <span style={{ fontFamily: 'Inter' }}>
                            24 px
                        </span>
                    </motion.div>
                </Option>
                <Option
                    value={"20px"}
                    onClick={() => props.editor!.chain().focus().setFontSize('20px').run()}
                >
                    <motion.div>
                        <span style={{ fontFamily: 'Inter' }}>
                            20 px
                        </span>
                    </motion.div>
                </Option>
                <Option value={"18px"}
                    onClick={() => props.editor!.chain().focus().setFontSize('18px').run()}
                >
                    <motion.div>
                        <span style={{ fontFamily: 'Inter' }}>
                            18 px
                        </span>
                    </motion.div>
                </Option>
                <Option value={"16px"}
                    onClick={() => props.editor!.chain().focus().setFontSize('16px').run()}
                >
                    <motion.div>
                        <span style={{ fontFamily: 'Inter' }}>
                            16 px
                        </span>
                    </motion.div>
                </Option>
                <Option value={"14px"}
                    onClick={() => props.editor!.chain().focus().setFontSize('14px').run()}
                >
                    <motion.div>
                        <span style={{ fontFamily: 'Inter' }}>
                            14 px
                        </span>
                    </motion.div>
                </Option>
            </FlowSwitch>
            <FlowSwitch value={props.justification} isLens>
                <Option value="left"
                    onClick={() => props.editor!.chain().focus().setTextAlign('left').run()}
                >
                    <IconButton
                        size="sm"
                        className={props.editor.isActive('bold') ? 'is-active' : ''}
                        variant={props.editor!.isActive({ textAlign: 'left' }) ? "solid" : "plain"}>
                        <FormatAlignLeft />
                    </IconButton>
                </Option>
                <Option value="center"
                    onClick={() => props.editor!.chain().focus().setTextAlign('center').run()}
                >
                    <IconButton
                        size="sm"
                        className={props.editor.isActive('bold') ? 'is-active' : ''}
                        variant="plain">
                        <FormatAlignCentre />
                    </IconButton>
                </Option>
                <Option value="right"
                    onClick={() => props.editor!.chain().focus().setTextAlign('right').run()}
                >
                    <IconButton
                        size="sm"
                        className={props.editor.isActive('bold') ? 'is-active' : ''}
                        variant="plain">
                        <FormatAlignRight />
                    </IconButton>
                </Option>
                <Option value="justify"
                    onClick={() => props.editor!.chain().focus().setTextAlign('justify').run()}
                >
                    <IconButton
                        size="sm"
                        className={props.editor.isActive('bold') ? 'is-active' : ''}
                        variant="plain">
                        <FormatAlignJustify />
                    </IconButton>
                </Option>
            </FlowSwitch>
            <Tag isLens>
                <IconButton
                    style={{ color: props.editor!.isActive('bold') ? offWhite : black }}
                    size="sm"
                    // @ts-ignore - toggleBold should exist via StarterKit
                    onClick={() => props.editor!.chain().focus().toggleBold().run()}
                    variant={props.editor!.isActive('bold') ? "solid" : "plain"}>
                    <FormatBoldIcon />
                </IconButton>
                <IconButton
                    style={{ color: props.editor!.isActive('italic') ? offWhite : black }}
                    size="sm"
                    // @ts-ignore - toggleItalic should exist via StarterKit
                    onClick={() => props.editor!.chain().focus().toggleItalic().run()}
                    variant={props.editor!.isActive('italic') ? "solid" : "plain"}>
                    <FormatItalicIcon />
                </IconButton>
                <IconButton
                    style={{ color: props.editor!.isActive('underline') ? offWhite : black }}
                    size="sm"
                    onClick={() => props.editor!.chain().focus().toggleUnderline().run()}
                    variant={props.editor!.isActive('underline') ? "solid" : "plain"}>
                    <FormatUnderlinedIcon />
                </IconButton>
                <IconButton
                    style={{ color: props.editor!.isActive('strike') ? offWhite : black }}
                    size="sm"
                    // @ts-ignore - toggleStrike should exist via StarterKit
                    onClick={() => props.editor!.chain().focus().toggleStrike().run()}
                    variant={props.editor!.isActive('strike') ? "solid" : "plain"}>
                    <FormatStrikethrough />
                </IconButton>
            </Tag>
            <FlowSwitch value={props.justification} isLens>
                <Option value={"blue"} onClick={() => {
                    props.editor.commands.setBackgroundColor({ backgroundColor: blue })
                }}>
                    <motion.div style={{ backgroundColor: blue }}>
                        Blue background
                    </motion.div>
                </Option>
                <Option value={"lightBlue"} onClick={() => {
                    props.editor.commands.setBackgroundColor({ backgroundColor: lightBlue })
                }}>
                    <motion.div style={{ backgroundColor: lightBlue }}>
                        Light blue background
                    </motion.div>
                </Option>
                <Option value={"yellow"} onClick={() => {
                    props.editor.commands.setBackgroundColor({ backgroundColor: highlightYellow })
                }}>
                    <motion.div style={{ backgroundColor: highlightYellow }}>
                        Yellow background
                    </motion.div>
                </Option>
                <Option value={"teal"} onClick={() => {
                    props.editor.commands.setBackgroundColor({ backgroundColor: teal })
                }}>
                    <motion.div style={{ backgroundColor: teal }}>
                        Teal background
                    </motion.div>
                </Option>
                <Option value={"green"} onClick={() => {
                    props.editor.commands.setBackgroundColor({ backgroundColor: green })
                }}>
                    <motion.div style={{ backgroundColor: green }}>
                        Green background
                    </motion.div>
                </Option>
                <Option value={"purple"} onClick={() => {
                    props.editor.commands.setBackgroundColor({ backgroundColor: purple })
                }}>
                    <motion.div style={{ backgroundColor: purple }}>
                        Purple background
                    </motion.div>
                </Option>
                <Option value={"offWhite"} onClick={() => {
                    props.editor.commands.setBackgroundColor({ backgroundColor: offWhite })
                }}>
                    <motion.div style={{ backgroundColor: offWhite }}>
                        White background
                    </motion.div>
                </Option>
                <Option value={"grey"} onClick={() => {
                    props.editor.commands.setBackgroundColor({ backgroundColor: grey })
                }}>
                    <motion.div style={{ backgroundColor: grey }}>
                        Grey background
                    </motion.div>
                </Option>
            </FlowSwitch>
            <FlowSwitch value={props.justification} isLens>
                <Option
                    value={"#121212"}
                    onClick={() => props.editor.chain().focus().setColor('#121212').run()}
                >
                    <IconButton
                        style={{ color: black }}
                        size="sm"
                        className={props.editor.isActive('textStyle', { color: '#121212' }) ? 'is-active' : ''}
                        variant="plain"
                    >
                        <FormatColorTextIcon />
                    </IconButton>
                </Option>
                <Option value={"#958df1"} onClick={() => props.editor.chain().focus().setColor('#958DF1').run()}>
                    <IconButton
                        style={{ color: "#958DF1" }}
                        size="sm"
                        className={props.editor.isActive('textStyle', { color: '#958DF1' }) ? 'is-active' : ''}
                        variant="plain"
                    >
                        <FormatColorTextIcon />
                    </IconButton>
                </Option>
                <Option value={red} onClick={() => props.editor.chain().focus().setColor(red).run()}>
                    <IconButton
                        style={{ color: red }}
                        size="sm"
                        className={props.editor.isActive('textStyle', { color: red }) ? 'is-active' : ''}
                        variant="plain"
                    >
                        <FormatColorTextIcon />
                    </IconButton>
                </Option>
                <Option value={grey} onClick={() => props.editor.chain().focus().setColor(grey).run()}>
                    <IconButton
                        style={{ color: grey }}
                        size="sm"
                        className={props.editor.isActive('textStyle', { color: grey }) ? 'is-active' : ''}
                        variant="plain"
                    >
                        <FormatColorTextIcon />
                    </IconButton>
                </Option>
            </FlowSwitch>
            
            <FlowSwitch value={props.justification} isLens>
                <Option
                    value={highlightYellow}
                    onClick={() => props.editor!.chain().focus().toggleHighlight({ color: highlightYellow }).run()}
                >
                    <IconButton
                        style={{ color: highlightYellow }}
                        size="sm"
                        className={props.editor!.isActive('highlight', { color: highlightYellow }) ? 'is-active' : ''}
                        variant="plain">
                        <FormatColorFill />
                    </IconButton>
                </Option>
                <Option
                    value={blue}
                    onClick={() => props.editor!.chain().focus().toggleHighlight({ color: blue }).run()}
                >
                    <IconButton
                        style={{ color: blue }}
                        size="sm"
                        className={props.editor!.isActive('highlight', { color: blue }) ? 'is-active' : ''}
                        variant="plain">
                        <FormatColorFill />
                    </IconButton>
                </Option>
                <Option
                    value={purple}
                    onClick={() => props.editor!.chain().focus().toggleHighlight({ color: purple }).run()}
                >
                    <IconButton
                        style={{ color: purple }}
                        size="sm"
                        className={props.editor!.isActive('highlight', { color: blue }) ? 'is-active' : ''}
                        variant="plain">
                        <FormatColorFill />
                    </IconButton>
                </Option>
                <Option
                    value={red}
                    onClick={() => props.editor!.chain().focus().toggleHighlight({ color: red }).run()}
                >
                    <IconButton
                        style={{ color: red }}
                        size="sm"
                        className={props.editor!.isActive('highlight', { color: red }) ? 'is-active' : ''}
                        variant="plain">
                        <FormatColorFill />
                    </IconButton>
                </Option>
            </FlowSwitch>
            {/* Span Group - wrap selected text with a unique ID for future connections */}
            <FlowSwitch value={"Span Group"} isLens>
                <Option
                    value={"Create Span Group"}
                    onClick={() => {
                        props.editor.commands.setSpanGroup()
                    }}
                >
                    <motion.div>
                        <span>
                            🔗 Create Span Group
                        </span>
                    </motion.div>
                </Option>
                <Option
                    value={"Remove Span Group"}
                    onClick={() => {
                        props.editor.commands.unsetSpanGroup()
                    }}
                >
                    <motion.div>
                        <span>
                            ✕ Remove Span Group
                        </span>
                    </motion.div>
                </Option>
            </FlowSwitch>
        </div>
    )
})

// Add new PortalLoupe component
// Memoize PortalLoupe
const PortalLoupe = React.memo((props: { editor: Editor }) => {
    const selectedNode = getSelectedNode(props.editor)
    let lens = selectedNode.attrs.lens

    return (
        <div
            style={{ display: "flex", gap: 5, height: "fit-content", alignItems: "center", overflow: "visible" }}>
            {/* Lenses - leftmost */}
            <FlowSwitch value={lens} isLens scrollToSelect>
                <Option value={"identity"} onClick={() => {
                    props.editor.commands.setLens({ lens: "identity" })
                }}>
                    <motion.div>
                        Identity
                    </motion.div>
                </Option>
                <Option value={"private"} onClick={() => {
                    props.editor.commands.setLens({ lens: "private" })
                }}>
                    <motion.div>
                        🔒 Private
                    </motion.div>
                </Option>
            </FlowSwitch>
            <Tag>
                Portal
            </Tag>
        </div>
    )
})

// ExternalPortalLoupe - for iframe-embedded external quanta
const ExternalPortalLoupe = React.memo((props: { editor: Editor }) => {
    const selectedNode = getSelectedNode(props.editor)
    let lens = selectedNode.attrs.lens

    return (
        <div
            style={{ display: "flex", gap: 5, height: "fit-content", alignItems: "center", overflow: "visible" }}>
            {/* Lenses - leftmost */}
            <FlowSwitch value={lens} isLens scrollToSelect>
                <Option value={"identity"} onClick={() => {
                    props.editor.commands.setExternalPortalLens({ lens: "identity" })
                }}>
                    <motion.div>
                        Identity
                    </motion.div>
                </Option>
                <Option value={"preview"} onClick={() => {
                    props.editor.commands.setExternalPortalLens({ lens: "preview" })
                }}>
                    <motion.div>
                        👁️ Preview
                    </motion.div>
                </Option>
                <Option value={"private"} onClick={() => {
                    props.editor.commands.setExternalPortalLens({ lens: "private" })
                }}>
                    <motion.div>
                        🔒 Private
                    </motion.div>
                </Option>
            </FlowSwitch>
            <Tag>
                External Portal
            </Tag>
        </div>
    )
})

export const FlowMenu = (props: { editor: Editor }) => {
    const elementRef = React.useRef<HTMLDivElement>(null);

    const [selectedAction, setSelectedAction] = React.useState<string>("Copy quanta id")
    const [selectedVersionHistory, setSelectedVersionHistory] = React.useState<string>("No Version Initialised")
    const [selectedDisplayLens, setSelectedDisplayLens] = React.useState<string>("linear")
    const [selectedEvaluationLens, setSelectedEvaluationLens] = React.useState<string>("evaluate")

    const [selectedValue, setSelectedValue] = React.useState<string>("Arial")
    
    // Track selection type changes to force re-render when switching between text and node selections
    const [currentNodeType, setCurrentNodeType] = React.useState<string>(() => getSelectedNodeType(props.editor))
    
    // Get current quanta ID for auto-backup
    const [currentQuantaId, setCurrentQuantaId] = React.useState<string | null>(null)
    React.useEffect(() => {
        setCurrentQuantaId(quantaBackup.getCurrentQuantaId())
    }, [])
    
    // Auto-backup hook for BubbleMenu context
    const { 
        status: autoBackupStatus, 
        lastSavedAt: autoBackupLastSavedAt,
        triggerBackup 
    } = useAutoBackup(props.editor, currentQuantaId, { enabled: true })

    const selection = props.editor!.view.state.selection

    // Listen for selection updates and re-render when node type changes
    React.useEffect(() => {
        const handleSelectionUpdate = () => {
            const newNodeType = getSelectedNodeType(props.editor);
            if (newNodeType !== currentNodeType) {
                setCurrentNodeType(newNodeType);
            }
        };
        
        props.editor.on('selectionUpdate', handleSelectionUpdate);
        return () => {
            props.editor.off('selectionUpdate', handleSelectionUpdate);
        };
    }, [props.editor, currentNodeType]);

    React.useEffect(() => {
        // Check if it's a NodeSelection before accessing .node
        if (isNodeSelection(selection)) {
            const node = selection.node
            // Ensure attributes exist before accessing them
            if (node.attrs.lensDisplay) {
                setSelectedDisplayLens(node.attrs.lensDisplay)
            }
            if (node.attrs.lensEvaluation) {
                setSelectedEvaluationLens(node.attrs.lensEvaluation)
            }
        }
    }, [selection])

    const font = props.editor.getAttributes('textStyle').fontFamily;
    const fontSize = props.editor.getAttributes('textStyle').fontSize
    const justification = props.editor.isActive('paragraph')
        ? props.editor.getAttributes('paragraph').textAlign
        : props.editor.getAttributes('heading').textAlign
        || 'left';

    return (
        <BubbleMenu
            editor={props.editor}
            tippyOptions={{
                placement: "top",
                // Keep the bubble menu open when interacting with FlowSwitch
                // hideOnClick: false, // May need adjustment based on FlowSwitch behavior
                // appendTo: () => document.body, // Helps with positioning issues sometimes
            }}
            // Show for both text selections AND node selections (portal, externalPortal, group, etc.)
            shouldShow={({ editor, state }) => {
                const { selection } = state;
                // Show for text selections (default behavior)
                if (!selection.empty) return true;
                // Also show for node selections
                if (isNodeSelection(selection)) return true;
                return false;
            }}>
            <motion.div
                // ref={elementRef} // ref might not be needed if positioning is handled by Tippy
                style={flowMenuStyle()}
                className="flow-menu"
            >
                {/* Loupe component first (leftmost) - contains Lens, Tag, and node-specific options */}
                {
                    {
                        'text': <RichTextLoupe editor={props.editor} font={font} fontSize={fontSize} justification={justification} />,
                        'paragraph': <RichTextLoupe editor={props.editor} font={font} fontSize={fontSize} justification={justification} />,
                        'group': <GroupLoupe editor={props.editor} />,
                        'temporalSpace': <TemporalSpaceLoupe editor={props.editor} />,
                        'scrollview': <></>,
                        'portal': <PortalLoupe editor={props.editor} />,
                        'externalPortal': <ExternalPortalLoupe editor={props.editor} />,
                        'math': <MathLoupe editor={props.editor} />,
                        'invalid': <>Uh oh, seems like the current node type is invalid, which means it's unsupported. Developer needs to support this node type.</>
                    }[currentNodeType] ?? <RichTextLoupe editor={props.editor} font={font} fontSize={fontSize} justification={justification} /> // Default fallback
                }
                {/* ActionSwitch (Copy, timestamp) comes after the Loupe */}
                <ActionSwitch 
                    editor={props.editor} 
                    selectedAction={selectedAction} 
                    nodeType={currentNodeType}
                    autoBackupStatus={autoBackupStatus}
                    autoBackupLastSavedAt={autoBackupLastSavedAt}
                    onTriggerBackup={triggerBackup}
                />
            </motion.div>
        </BubbleMenu>
    )
}

export const FlowMenuExample = () => {
    return (
        <RichTextCodeExample />
    )
}