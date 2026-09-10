import React from 'react'
import './MentionList.scss'

/** Shared tag surface for editable notes and read-only calendar previews. */
export const MentionTag = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & { kind: 'location' | 'timepoint' }>(
  function MentionTag({ kind, className, ...props }, ref) {
    return <span {...props} ref={ref} className={className ?? `${kind}-mention`} />
  },
)
