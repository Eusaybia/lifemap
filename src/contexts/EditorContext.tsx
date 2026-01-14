'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Editor } from '@tiptap/core'

interface EditorContextValue {
  editor: Editor | null
  setEditor: (editor: Editor | null) => void
}

const EditorContext = createContext<EditorContextValue>({
  editor: null,
  setEditor: () => {},
})

export const useEditorContext = () => useContext(EditorContext)

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [editor, setEditorState] = useState<Editor | null>(null)

  const setEditor = useCallback((newEditor: Editor | null) => {
    setEditorState(newEditor)
  }, [])

  return (
    <EditorContext.Provider value={{ editor, setEditor }}>
      {children}
    </EditorContext.Provider>
  )
}

export default EditorContext



