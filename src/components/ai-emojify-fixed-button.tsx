import * as React from "react"

export interface AiEmojifyFixedButtonProps {
  /**
   * The TipTap editor instance to use for AI emojify.
   */
  editor?: any
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
  /**
   * Enable streaming mode for AI response.
   * @default true
   */
  stream?: boolean
  /**
   * AI model to use for emojification.
   * @default 'gpt-4o-mini'
   */
  modelName?: string
}

/**
 * Fixed button component at the top of the page for adding emojis to selected text using AI.
 * 
 * Uses the aiEmojify command from @tiptap-pro/extension-ai.
 */
export const AiEmojifyFixedButton: React.FC<AiEmojifyFixedButtonProps> = ({
  editor,
  text = "🤖 AI Emojify",
  stream = true,
  modelName = 'gpt-4o-mini'
}) => {

  const isAvailable = React.useMemo(() => {
    if (!editor) return false
    return !!editor.commands?.aiEmojify
  }, [editor])

  const canEmojify = React.useMemo(() => {
    if (!editor) return false
    
    // For testing, let's make it always available when editor exists
    return true
    
    // Uncomment this for production use:
    // const { empty: selectionIsEmpty, from: selectionFrom, to: selectionTo } = editor.state.selection
    // const selectionContainsText = editor.state.doc.textBetween(selectionFrom, selectionTo, ' ')
    // return !selectionIsEmpty && !!selectionContainsText && isAvailable
  }, [editor, isAvailable])

  const handleClick = React.useCallback(() => {
    console.log('Fixed AI Emojify button clicked', { 
      editor: !!editor, 
      canEmojify, 
      isAvailable, 
      hasCommand: !!editor?.commands?.aiEmojify,
      availableCommands: editor ? Object.keys(editor.commands) : []
    })
    
    if (editor && editor.commands?.aiEmojify) {
      try {
        editor
          .chain()
          .focus()
          .aiEmojify({ stream, modelName })
          .run()
      } catch (error) {
        console.error('AI Emojify failed:', error)
      }
    }
  }, [editor, canEmojify, isAvailable, stream, modelName])

  if (!isAvailable) {
    return null
  }

  return (
    <button
      type="button"
      disabled={!canEmojify}
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 10002, // Higher than DocumentFlowMenu (10001)
        padding: '8px 16px',
        backgroundColor: canEmojify ? '#007bff' : '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: canEmojify ? 'pointer' : 'not-allowed',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        opacity: canEmojify ? 1 : 0.6,
      }}
      onMouseEnter={(e) => {
        if (canEmojify) {
          e.currentTarget.style.backgroundColor = '#0056b3'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
        }
      }}
      onMouseLeave={(e) => {
        if (canEmojify) {
          e.currentTarget.style.backgroundColor = '#007bff'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
        }
      }}
      title="Add emojis to selected text using AI"
    >
      {text}
    </button>
  )
}