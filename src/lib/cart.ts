'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = { dishId: string; name: string; unitCents: number; qty: number }

export { MAX_QTY } from './limits'
import { MAX_QTY } from './limits'

type CartState = {
  items: CartItem[]
  add: (item: Omit<CartItem, 'qty'>, qty?: number) => void
  setQty: (dishId: string, qty: number) => void
  remove: (dishId: string) => void
  clear: () => void
}

/**
 * Cart contents survive reloads (localStorage). Prices here are only for
 * display — the server always recalculates from the CMS at checkout.
 */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.dishId === item.dishId)
          if (existing) {
            return { items: s.items.map((i) => (i.dishId === item.dishId ? { ...i, ...item, qty: Math.min(MAX_QTY, i.qty + qty) } : i)) }
          }
          return { items: [...s.items, { ...item, qty: Math.min(MAX_QTY, qty) }] }
        }),
      setQty: (dishId, qty) =>
        set((s) => ({
          items: qty <= 0 ? s.items.filter((i) => i.dishId !== dishId) : s.items.map((i) => (i.dishId === dishId ? { ...i, qty: Math.min(MAX_QTY, qty) } : i)),
        })),
      remove: (dishId) => set((s) => ({ items: s.items.filter((i) => i.dishId !== dishId) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'magpie-cart-v1', skipHydration: true },
  ),
)

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0)
export const cartSubtotal = (items: CartItem[]) => items.reduce((n, i) => n + i.unitCents * i.qty, 0)

/** Drawer open/closed — not persisted. */
export const useCartUi = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
