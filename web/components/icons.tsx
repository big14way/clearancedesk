import type {SVGProps} from 'react'

const base = (props: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
})

export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4.5 10.5l3.5 3.5 7.5-8" />
  </svg>
)

export const CrossIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
  </svg>
)

export const AlertIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M10 6.5v4.5M10 14h.01" />
    <path d="M8.6 2.9L1.9 15a1.6 1.6 0 001.4 2.4h13.4a1.6 1.6 0 001.4-2.4L11.4 2.9a1.6 1.6 0 00-2.8 0z" />
  </svg>
)

export const InfoIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="10" cy="10" r="8" />
    <path d="M10 9v5M10 6h.01" />
  </svg>
)

export const EyeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z" />
    <circle cx="10" cy="10" r="2.5" />
  </svg>
)

export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M10 4v12M4 10h12" />
  </svg>
)

export const StampIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="14" height="14" rx="3" />
    <path d="M6.5 10.2l2.4 2.4 4.6-5" />
  </svg>
)
