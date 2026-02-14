'use client'

import React, { Component, type CSSProperties, type ReactNode } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  type ReactFlowProps,
} from 'reactflow'
import 'reactflow/dist/style.css'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ReactFlowErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private originalConsoleError: typeof console.error | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: false }
  }

  componentDidMount() {
    this.originalConsoleError = console.error
    console.error = (...args: any[]) => {
      const errorString = args.join(' ')
      if (
        errorString.includes('ReactFlow') ||
        errorString.includes('react-flow') ||
        errorString.includes('NodeResizer') ||
        errorString.includes('ResizeObserver')
      ) {
        return
      }
      if (this.originalConsoleError) {
        this.originalConsoleError(...args)
      }
    }
  }

  componentWillUnmount() {
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError
    }
  }

  componentDidCatch() {
    // Intentionally swallow ReactFlow view-layer errors in node views.
  }

  render() {
    return this.props.children
  }
}

export const REFERENCE_FLOW_STYLE: CSSProperties = { background: '#f8fafc' }
export const REFERENCE_FLOW_FIT_VIEW_OPTIONS = { padding: 0.2 }
export const REFERENCE_FLOW_BACKGROUND = {
  variant: BackgroundVariant.Dots,
  gap: 20,
  size: 1,
  color: '#cbd5e1',
} as const

type ReferenceReactFlowCanvasProps = ReactFlowProps & {
  showControls?: boolean
  showBackground?: boolean
  suppressFlowErrors?: boolean
  backgroundColor?: string
}

export const ReferenceReactFlowCanvas = ({
  children,
  showControls = false,
  showBackground = true,
  suppressFlowErrors = true,
  backgroundColor = REFERENCE_FLOW_STYLE.background as string,
  fitView = true,
  fitViewOptions = REFERENCE_FLOW_FIT_VIEW_OPTIONS,
  minZoom = 0.1,
  maxZoom = 4,
  style,
  ...props
}: ReferenceReactFlowCanvasProps) => {
  const flow = (
    <ReactFlow
      {...props}
      fitView={fitView}
      fitViewOptions={fitViewOptions}
      minZoom={minZoom}
      maxZoom={maxZoom}
      style={{ background: backgroundColor, ...style }}
    >
      {showBackground && <Background {...REFERENCE_FLOW_BACKGROUND} />}
      {showControls && <Controls showInteractive={false} position="bottom-right" />}
      {children}
    </ReactFlow>
  )

  if (!suppressFlowErrors) {
    return flow
  }

  return <ReactFlowErrorBoundary>{flow}</ReactFlowErrorBoundary>
}
