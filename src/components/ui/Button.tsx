import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-on-ink hover:bg-ink-2',
  secondary: 'border border-ink-2 text-ink hover:border-ink hover:bg-bg-2',
  ghost: 'text-ink-2 hover:bg-bg-2 hover:text-ink',
  danger: 'bg-verm text-on-ink hover:brightness-110',
}

const SIZES: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-[13px] gap-1.5',
  md: 'min-h-11 px-4 text-sm gap-2',
  lg: 'min-h-12 px-5 text-[15px] gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex select-none items-center justify-center rounded-[3px] font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color,filter] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  )
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

/** 44px square target with a required accessible label. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'grid size-11 shrink-0 place-items-center rounded-[3px] text-ink-2 transition-[transform,background-color,color] duration-150 hover:bg-bg-2 hover:text-ink active:scale-95 disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
