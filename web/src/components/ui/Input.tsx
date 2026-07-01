import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const BASE =
  'w-full rounded-sm border border-line bg-ink-800 px-3 text-[14px] text-text-hi placeholder:text-text-low transition-colors duration-120 hover:border-line-strong focus:border-amber-500/60 focus:outline-none disabled:pointer-events-none disabled:opacity-40'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ invalid, className, ...rest }: InputProps) {
  return (
    <input
      className={cn(BASE, 'h-10', invalid && 'border-err/60 focus:border-err', className)}
      {...rest}
    />
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ invalid, className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={cn(
        BASE,
        'min-h-24 resize-y py-2.5 leading-relaxed',
        invalid && 'border-err/60 focus:border-err',
        className,
      )}
      {...rest}
    />
  )
}
