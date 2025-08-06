import * as React from "react"

export const WallIcon = React.memo(
  ({ className, ...props }: React.SVGProps<SVGSVGElement>) => {
    return (
      <svg
        width="24"
        height="24"
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <defs>
          <linearGradient id="wallGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.7" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        
        {/* Brick wall pattern */}
        {/* First row */}
        <rect x="2" y="4" width="5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        <rect x="8" y="4" width="5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        <rect x="14" y="4" width="5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        <rect x="20" y="4" width="2" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        
        {/* Second row (offset) */}
        <rect x="2" y="8" width="2.5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        <rect x="5.5" y="8" width="5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        <rect x="11.5" y="8" width="5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        <rect x="17.5" y="8" width="4.5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        
        {/* Third row */}
        <rect x="2" y="12" width="5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        <rect x="8" y="12" width="5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        <rect x="14" y="12" width="5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        <rect x="20" y="12" width="2" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        
        {/* Fourth row (offset) */}
        <rect x="2" y="16" width="2.5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        <rect x="5.5" y="16" width="5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        <rect x="11.5" y="16" width="5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        <rect x="17.5" y="16" width="4.5" height="3" fill="url(#wallGradient)" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
      </svg>
    )
  }
)

WallIcon.displayName = "WallIcon"