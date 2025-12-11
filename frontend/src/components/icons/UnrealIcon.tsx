import type { SVGProps } from 'react'

interface UnrealIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string
}

/**
 * UnrealIRCd Logo as a React SVG component
 * Colored circle with italic transparent U cutout
 * Can be styled with CSS using currentColor
 */
export function UnrealIcon({ size = 24, className = '', ...props }: UnrealIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      {...props}
    >
      <defs>
        <mask id="u-mask">
          {/* White circle (visible area) */}
          <circle cx="50" cy="50" r="50" fill="white" />
          {/* Black italic U (transparent cutout) */}
          <g transform="skewX(-12) translate(12, 0)">
            <path
              d="M30 28 L30 58 C30 74 39 80 50 80 C61 80 70 74 70 58 L70 28 L58 28 L58 58 C58 65 55 68 50 68 C45 68 42 65 42 58 L42 28 Z"
              fill="black"
            />
          </g>
        </mask>
      </defs>
      {/* Colored circle with U cutout */}
      <circle cx="50" cy="50" r="50" fill="currentColor" mask="url(#u-mask)" />
    </svg>
  )
}

/**
 * Simplified UnrealIRCd icon for smaller sizes (like in navigation)
 */
export function UnrealIconSimple({ size = 24, className = '', ...props }: UnrealIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      {...props}
    >
      <defs>
        <mask id="u-mask-simple">
          <circle cx="50" cy="50" r="50" fill="white" />
          <g transform="skewX(-12) translate(12, 0)">
            <path
              d="M30 28 L30 58 C30 74 39 80 50 80 C61 80 70 74 70 58 L70 28 L58 28 L58 58 C58 65 55 68 50 68 C45 68 42 65 42 58 L42 28 Z"
              fill="black"
            />
          </g>
        </mask>
      </defs>
      <circle cx="50" cy="50" r="50" fill="currentColor" mask="url(#u-mask-simple)" />
    </svg>
  )
}

export default UnrealIcon
