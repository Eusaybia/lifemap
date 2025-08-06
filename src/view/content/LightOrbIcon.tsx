import * as React from "react"

export const LightOrbIcon = React.memo(
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
          <radialGradient id="lightOrb" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="70%" stopColor="currentColor" stopOpacity="0.8" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
          </radialGradient>
          <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" />
          </filter>
        </defs>
        
        {/* Outer glow */}
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="url(#lightOrb)"
          filter="url(#blur)"
          opacity="0.6"
        />
        
        {/* Inner bright core */}
        <circle
          cx="12"
          cy="12"
          r="6"
          fill="currentColor"
          opacity="0.9"
        />
        
        {/* Central highlight */}
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="currentColor"
          opacity="1"
        />
      </svg>
    )
  }
)

LightOrbIcon.displayName = "LightOrbIcon"