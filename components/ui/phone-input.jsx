'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const PREFIX = '+45 '

/** Mobilnummer-felt med fast +45 prefix (kan ikke slettes). value/onChange er fuldt nummer inkl. +45. */
const PhoneInput = React.forwardRef(({ className, value = '', onChange, ...props }, ref) => {
  const normalized = String(value ?? '').replace(/\s/g, '')
  const withoutPrefix = normalized.startsWith('+45')
    ? normalized.slice(3).replace(/^0+/, '')
    : normalized.replace(/^0+/, '') || ''

  const handleChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 8)
    const full = v ? `+45${v}` : ''
    const synthetic = { ...e, target: { ...e.target, value: full } }
    onChange?.(synthetic)
  }

  const inputValue = withoutPrefix

  return (
    <div className={cn('flex items-center rounded-md border border-input bg-transparent overflow-hidden', className)}>
      <span className="pl-3 py-2 text-sm text-muted-foreground select-none bg-muted/50 border-r border-input shrink-0">
        {PREFIX}
      </span>
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={inputValue}
        onChange={handleChange}
        maxLength={8}
        placeholder="12345678"
        className="flex h-9 flex-1 min-w-0 border-0 bg-transparent px-3 py-1 text-base shadow-none outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        {...props}
      />
    </div>
  )
})
PhoneInput.displayName = 'PhoneInput'

export { PhoneInput }
