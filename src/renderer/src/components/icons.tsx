import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)

export const CopyIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" />
  </Icon>
)

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
)

export const RefreshIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v5h-5" />
  </Icon>
)

export const SlidersIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h9M19 7h1M4 17h1M11 17h9" />
    <circle cx="16" cy="7" r="2.5" />
    <circle cx="8" cy="17" r="2.5" />
  </Icon>
)

export const AlertIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 4.5L21 19.5H3z" />
    <path d="M12 10.5v4M12 17v.2" />
  </Icon>
)

export const KeyIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="8" cy="15.5" r="4" />
    <path d="M11 12.5L19.5 4M16 7.5l2.5 2.5" />
  </Icon>
)

export const EyeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </Icon>
)

export const EyeOffIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <path d="M4.5 4.5l15 15" />
  </Icon>
)

export const ClipboardIcon =(props: IconProps) => (
  <Icon {...props}>
    <rect x="5.5" y="5" width="13" height="16" rx="2.5" />
    <path d="M9 5V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V5" />
    <path d="M9 11h6M9 15h4" />
  </Icon>
)
