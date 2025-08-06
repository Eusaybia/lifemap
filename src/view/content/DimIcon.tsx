import * as React from "react"

export const DimIcon = React.memo(
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
          <linearGradient id="dimGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.5" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
          </linearGradient>
          <filter id="dimBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
          </filter>
        </defs>
        
        {/* Outer dim circle */}
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="url(#dimGradient)"
          filter="url(#dimBlur)"
          opacity="0.4"
        />
        
        {/* Inner faded area */}
        <circle
          cx="12"
          cy="12"
          r="7"
          fill="currentColor"
          opacity="0.2"
        />
        
        {/* Central dim point */}
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="currentColor"
          opacity="0.1"
        />
        
        {/* Fade lines to indicate dimming */}
        <g opacity="0.3">
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
          <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
          <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
        </g>
      </svg>
    )
  }
)

DimIcon.displayName = "DimIcon"