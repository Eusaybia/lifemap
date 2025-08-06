import * as React from "react"

export const CrystalIcon = React.memo(
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
          <linearGradient id="crystalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
            <stop offset="30%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="70%" stopColor="currentColor" stopOpacity="0.6" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
          </linearGradient>
          <filter id="crystalBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" />
          </filter>
        </defs>
        
        {/* Main crystal/diamond shape */}
        <path
          d="M12 2L20 8L16 16L12 22L8 16L4 8L12 2Z"
          fill="url(#crystalGradient)"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.4"
          filter="url(#crystalBlur)"
        />
        
        {/* Inner facets for crystal effect */}
        <path
          d="M12 2L16 8L12 12L8 8L12 2Z"
          fill="currentColor"
          fillOpacity="0.2"
        />
        <path
          d="M12 12L16 8L16 16L12 22L12 12Z"
          fill="currentColor"
          fillOpacity="0.1"
        />
        <path
          d="M12 12L8 8L8 16L12 22L12 12Z"
          fill="currentColor"
          fillOpacity="0.15"
        />
        
        {/* Highlight for glass effect */}
        <path
          d="M10 4L14 7L12 9L8 6L10 4Z"
          fill="currentColor"
          fillOpacity="0.6"
        />
      </svg>
    )
  }
)

CrystalIcon.displayName = "CrystalIcon"