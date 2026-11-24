import 'server-only'

import fs from 'fs/promises'
import path from 'path'
import { Resend } from 'resend'

import type { Order } from '@/payload-types'
import { SITE } from './content'
import type { Settings } from './data'
import { formatPrice } from './money'
import { formatPickup } from './time'

type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string }

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

const sanitizeComment = (s: string) => s.replace(/--!?>/g, '- - >')

let cachedResend: { key: string; client: Resend } | null = null
function getResend(apiKey: string): Resend {
  if (!cachedResend || cachedResend.key !== apiKey) {
    cachedResend = { key: apiKey, client: new Resend(apiKey) }
  }
  return cachedResend.client
}

/**
 * Sends through Resend when RESEND_API_KEY is set. Without it (local
 * development) the message is saved to ./data/outbox so you can open it.
 * Never throws: a failed email must not undo a paid order.
 */
export async function sendMail(mail: Mail): Promise<{ delivered: boolean; via: 'resend' | 'outbox' | 'none' }> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      const resend = getResend(apiKey)
      const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'The Magpie Bistro <onboarding@resend.dev>',
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        replyTo: mail.replyTo,
      })
      if (error) throw new Error(error.message)
      return { delivered: true, via: 'resend' }
    }
    const dir = path.resolve(process.cwd(), 'data', 'outbox')
    await fs.mkdir(dir, { recursive: true })
    const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${mail.to.replace(/[^a-z0-9]+/gi, '_')}.html`)
    await fs.writeFile(file, `<!-- To: ${sanitizeComment(mail.to)}\n     Subject: ${sanitizeComment(mail.subject)} -->\n${mail.html}`)
    console.log(`[email] RESEND_API_KEY not set — saved "${mail.subject}" for ${mail.to} to ${path.relative(process.cwd(), file)}`)
    return { delivered: false, via: 'outbox' }
  } catch (err) {
    console.error('[email] failed to send', mail.subject, err)
    return { delivered: false, via: 'none' }
  }
}

export const shell = (title: string, body: string) => `<!doctype html><html><body style="margin:0;background:#FAF4E8;font-family:Arial,Helvetica,sans-serif;color:#2A241C">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<div style="font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#8A5E0E">The Magpie Bistro + Cupcakery</div>
<div style="background:#FFFDF8;border:1px solid #E2D3B4;border-radius:14px;padding:24px;margin-top:16px">
<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px">${esc(title)}</h1>${body}</div>
<p style="font-size:12px;color:#5E5342;margin-top:16px">${esc(SITE.verse)} — ${esc(SITE.verseRef)}</p></div></body></html>`

function itemsTable(order: Order) {
  const rows = order.items
    .map((i) => `<tr><td style="padding:6px 0">${i.qty} × ${esc(i.nameSnap)}</td><td style="padding:6px 0;text-align:right">${formatPrice(i.unitCents * i.qty)}</td></tr>`)
    .join('')
  return `<table style="width:100%;border-collapse:collapse;font-size:15px">${rows}
<tr><td style="padding:8px 0 2px;border-top:1px solid #E2D3B4;color:#5E5342">Subtotal</td><td style="padding:8px 0 2px;border-top:1px solid #E2D3B4;text-align:right">${formatPrice(order.subtotalCents)}</td></tr>
<tr><td style="padding:2px 0;color:#5E5342">Tax</td><td style="padding:2px 0;text-align:right">${formatPrice(order.taxCents)}</td></tr>
<tr><td style="padding:6px 0;font-weight:bold;font-size:17px">Total paid</td><td style="padding:6px 0;text-align:right;font-weight:bold;font-size:17px">${formatPrice(order.totalCents)}</td></tr></table>`
}

const itemsText = (order: Order) =>
  order.items.map((i) => `  ${i.qty} x ${i.nameSnap} — ${formatPrice(i.unitCents * i.qty)}`).join('\n') +
  `\n  Subtotal ${formatPrice(order.subtotalCents)} · Tax ${formatPrice(order.taxCents)} · Total ${formatPrice(order.totalCents)}`

export async function sendOrderEmails(order: Order, settings: Settings) {
  const pickup = formatPickup(order.pickupAt)
  const address = `${settings.addressLine1}, ${settings.addressLine2}`
  const jobs: Promise<unknown>[] = []

  if (order.email) {
    jobs.push(
      sendMail({
        to: order.email,
        replyTo: settings.email,
        subject: `Your Magpie Bistro order ${order.code} — pickup ${pickup}`,
        html: shell(
          `Thank you, ${order.customerName}!`,
          `<p style="font-size:16px">Your order <strong>${esc(order.code)}</strong> is confirmed.</p>
<p style="font-size:16px"><strong>Pickup:</strong> ${esc(pickup)} (Eastern)<br><strong>Where:</strong> ${esc(address)}</p>
${itemsTable(order)}
<p style="font-size:14px;color:#5E5342">Need to change something? Call ${esc(settings.phone)}. Please give your name at the counter.</p>`,
        ),
        text: `Thank you, ${order.customerName}!\nYour order ${order.code} is confirmed.\nPickup: ${pickup} (Eastern) at ${address}\n\n${itemsText(order)}\n\nNeed to change something? Call ${settings.phone}.`,
      }),
    )
  }

  jobs.push(
    sendMail({
      to: settings.notificationEmail,
      replyTo: order.email || undefined,
      subject: `New order ${order.code} — ${order.customerName}, pickup ${pickup}`,
      html: shell(
        `New pickup order ${order.code}`,
        `<p style="font-size:16px"><strong>${esc(order.customerName)}</strong> · <a href="tel:${esc(order.phone)}">${esc(order.phone)}</a>${order.email ? ` · ${esc(order.email)}` : ''}</p>
<p style="font-size:18px"><strong>Pickup: ${esc(pickup)}</strong></p>
${itemsTable(order)}
${order.notes ? `<p style="font-size:15px;background:#F0E3C4;border-radius:8px;padding:10px 12px"><strong>Notes:</strong> ${esc(order.notes)}</p>` : ''}`,
      ),
      text: `New pickup order ${order.code}\n${order.customerName} · ${order.phone}${order.email ? ` · ${order.email}` : ''}\nPickup: ${pickup}\n\n${itemsText(order)}${order.notes ? `\n\nNotes: ${order.notes}` : ''}`,
    }),
  )
  await Promise.all(jobs)
}
