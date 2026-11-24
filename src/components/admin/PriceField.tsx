'use client'

import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { NumberFieldClientComponent } from 'payload'
import React, { useEffect, useRef, useState } from 'react'

import { centsToInput, parsePriceToCents } from '@/lib/money'

/**
 * Owners type "15.00"; the database stores 1500 (integer cents).
 * Replaces Payload's default number input on every money field.
 */
export const PriceField: NumberFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<number | null>({ path })
  const [text, setText] = useState(centsToInput(value))
  const [invalid, setInvalid] = useState(false)
  const editing = useRef(false)

  useEffect(() => {
    if (!editing.current) setText(centsToInput(value))
  }, [value])

  const locked = Boolean(readOnly || field.admin?.readOnly)

  return (
    <div className="field-type number" style={{ flex: '1 1 auto', width: field.admin?.width }}>
      <FieldLabel label={field.label} path={path} required={field.required} />
      <div className="field-type__wrap">
        <FieldError message={invalid ? 'Use a price like 15.00' : (errorMessage ?? '')} showError={invalid || showError} />
        <div style={{ position: 'relative' }}>
          <span aria-hidden style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>$</span>
          <input
            id={`field-${path.replace(/\./g, '__')}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="15.00"
            disabled={locked}
            value={text}
            style={{ paddingLeft: 26 }}
            onFocus={() => (editing.current = true)}
            onChange={(e) => {
              const next = e.target.value
              setText(next)
              if (next.trim() === '') {
                setInvalid(false)
                setValue(null)
                return
              }
              const cents = parsePriceToCents(next)
              setInvalid(cents === null)
              if (cents !== null) setValue(cents)
            }}
            onBlur={() => {
              editing.current = false
              if (!invalid) setText(centsToInput(value))
            }}
          />
        </div>
      </div>
      <FieldDescription description={field.admin?.description} path={path} />
    </div>
  )
}
