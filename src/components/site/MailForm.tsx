'use client'

import React, { useState } from 'react'

export type MailField =
  | { name: string; label: string; type: 'text' | 'tel' | 'date' | 'number'; required?: boolean; autoComplete?: string; min?: number; max?: number; defaultValue?: string }
  | { name: string; label: string; type: 'select'; options: string[] }
  | { name: string; label: string; type: 'textarea'; placeholder?: string }

type Props = { id: string; title: string; note: React.ReactNode; subject: string; to: string; fields: MailField[]; submitLabel: string }

/**
 * Composes an email to the bistro in the visitor's own mail app — the same
 * behaviour as the original site. Nothing is sent from the server.
 */
export function MailForm({ id, title, note, subject, to, fields, submitLabel }: Props) {
  const [status, setStatus] = useState('')
  return (
    <form
      className="order"
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        const lines = fields.map((f) => (f.type === 'textarea' ? `\n${f.label}:\n${data.get(f.name) || ''}` : `${f.label}: ${data.get(f.name) || '—'}`))
        window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
        setStatus(`Your email app should open with the message addressed to ${to} — just press send. Nothing was sent yet.`)
      }}
    >
      <h3>{title}</h3>
      <p className="form-note">{note}</p>
      <div className="fields">
        {fields.map((f) => {
          const fid = `${id}-${f.name}`
          return (
            <div className={`field${f.type === 'textarea' ? ' full' : ''}`} key={f.name}>
              <label htmlFor={fid}>{f.label}</label>
              {f.type === 'select' ? (
                <select id={fid} name={f.name}>
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea id={fid} name={f.name} placeholder={f.placeholder} />
              ) : (
                <input id={fid} name={f.name} type={f.type} required={f.required} autoComplete={f.autoComplete} min={f.min} max={f.max} defaultValue={f.defaultValue} />
              )}
            </div>
          )
        })}
      </div>
      <p style={{ marginTop: 16 }}>
        <button className="btn btn-gold" type="submit">{submitLabel}</button>
      </p>
      <p className="form-status" role="status">{status}</p>
    </form>
  )
}
