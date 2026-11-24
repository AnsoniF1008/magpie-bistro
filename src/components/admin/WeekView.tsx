'use client'

import './admin.css'

import { DndContext, DragOverlay, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { IconArrowLeft, IconArrowRight, IconClose, IconPlus } from '@/components/ui/Icons'
import { formatPriceShort } from '@/lib/money'
import { getWeekOf, shiftWeek, WEEKDAY_NAMES } from '@/lib/time'

type Dish = { id: string; name: string; category: string; priceCents: number | null; isSoldOut: boolean; isVisible: boolean }
type Days = Record<string, string[]>
type Payload = { weekOf: string | null; openWeekdays: number[]; rotation: Days; override: Days; dishes: Dish[] }

const CATEGORY_LABEL: Record<string, string> = { ENTREE: 'Entrées', BOWL: 'Bowls', SANDWICH: 'Sandwiches', SOUP: 'Soups', SALAD: 'Salads', DESSERT: 'Desserts', DRINK: 'Drinks' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function weekLabel(weekOf: string) {
  const [, m, d] = weekOf.split('-').map(Number)
  return `Week of ${MONTHS[m - 1]} ${d}`
}

function SideDish({ dish, onTap, overlay = false }: { dish: Dish; onTap?: () => void; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `dish:${dish.id}`, disabled: overlay })
  return (
    <button ref={overlay ? undefined : setNodeRef} type="button" className={`mg-dish${dish.isVisible ? '' : ' hidden-dish'}`} style={{ opacity: isDragging ? 0.4 : undefined }} onClick={onTap} {...(overlay ? {} : listeners)} {...(overlay ? {} : attributes)}>
      <span>
        {dish.name}
        {dish.isSoldOut && ' · sold out'}
        {!dish.isVisible && ' · hidden'}
      </span>
      <small>{dish.priceCents !== null ? formatPriceShort(dish.priceCents) : '—'}</small>
    </button>
  )
}

function DayColumn({ weekday, active, onSelect, children, usingRotation }: { weekday: number; active: boolean; onSelect: () => void; children: React.ReactNode; usingRotation: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${weekday}` })
  return (
    <section ref={setNodeRef} className={`mg-day${active ? ' active' : ''}${isOver ? ' over' : ''}`} aria-label={WEEKDAY_NAMES[weekday]}>
      <button type="button" className="mg-day-head" aria-pressed={active} onClick={onSelect}>
        <h3>
          {WEEKDAY_NAMES[weekday]}
          {usingRotation && <small>ROTATION</small>}
        </h3>
        <p className="hint">{active ? 'Selected — tap a dish on the list to add it here' : 'Select day, or drop a dish here'}</p>
      </button>
      {children}
    </section>
  )
}

/**
 * Week editor. Two modes:
 *  • Regular rotation — the default board shown every week.
 *  • A specific week — changes for that week only; days left untouched keep the rotation.
 */
export function WeekView() {
  const thisWeek = useMemo(() => getWeekOf(), [])
  const [mode, setMode] = useState<'week' | 'rotation'>('week')
  const [weekOf, setWeekOf] = useState(thisWeek)
  const [data, setData] = useState<Payload | null>(null)
  const [days, setDays] = useState<Days>({})
  const [activeDay, setActiveDay] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [dragging, setDragging] = useState<Dish | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }))

  const load = useCallback(async () => {
    setMessage(null)
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 10_000)
    try {
      const res = await fetch(`/api/board/week${mode === 'week' ? `?weekOf=${weekOf}` : ''}`, {
        credentials: 'include',
        cache: 'no-store',
        signal: ctrl.signal,
      })
      if (!res.ok) {
        setMessage({ kind: 'error', text: 'Could not load the menu. Refresh the page.' })
        return
      }
      const json = (await res.json()) as Payload
      setData(json)
      const start: Days = {}
      for (const wd of json.openWeekdays) {
        const key = String(wd)
        start[key] = mode === 'week' && json.override[key]?.length ? json.override[key] : (json.rotation[key] ?? [])
      }
      setDays(start)
      setDirty(false)
      setActiveDay((d) => (d && json.openWeekdays.includes(d) ? d : (json.openWeekdays[0] ?? null)))
    } catch {
      setMessage({ kind: 'error', text: 'Could not load the menu. Refresh the page.' })
    } finally {
      clearTimeout(timeout)
    }
  }, [mode, weekOf])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const dishById = useMemo(() => new Map(data?.dishes.map((d) => [d.id, d]) ?? []), [data])

  function addTo(weekday: number, dishId: string) {
    setDays((prev) => {
      const key = String(weekday)
      if (prev[key]?.includes(dishId)) return prev
      return { ...prev, [key]: [...(prev[key] ?? []), dishId] }
    })
    setDirty(true)
    setMessage(null)
  }

  function removeFrom(weekday: number, dishId: string) {
    setDays((prev) => ({ ...prev, [String(weekday)]: (prev[String(weekday)] ?? []).filter((id) => id !== dishId) }))
    setDirty(true)
    setMessage(null)
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null)
    const dishId = String(e.active.id).replace('dish:', '')
    const target = e.over ? String(e.over.id) : ''
    if (target.startsWith('day:')) addTo(Number(target.replace('day:', '')), dishId)
  }

  async function save(body: { weekOf: string | null; days: Days }, done: string) {
    setSaving(true)
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 12_000)
    try {
      const res = await fetch('/api/board/week', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setMessage({ kind: 'error', text: json?.error ?? 'Not saved. Check your connection and try again.' })
        return
      }
      await load()
      setMessage({ kind: 'ok', text: done })
    } catch {
      setMessage({ kind: 'error', text: 'Not saved. Check your connection and try again.' })
    } finally {
      clearTimeout(timeout)
      setSaving(false)
    }
  }

  const sameAsRotation = (key: string) => JSON.stringify(days[key] ?? []) === JSON.stringify(data?.rotation[key] ?? [])

  function saveCurrent() {
    if (mode === 'rotation') return save({ weekOf: null, days }, 'Regular rotation saved. It shows on the website now.')
    // Only days that differ from the rotation are stored for this week.
    const changed: Days = {}
    for (const key of Object.keys(days)) if (!sameAsRotation(key) && days[key].length) changed[key] = days[key]
    return save({ weekOf, days: changed }, `${weekLabel(weekOf)} saved. It shows on the website now.`)
  }

  const filtered = (data?.dishes ?? []).filter((d) => (!category || d.category === category) && (!search || d.name.toLowerCase().includes(search.toLowerCase())))
  const hasOverride = mode === 'week' && Object.keys(data?.override ?? {}).length > 0

  return (
    <div className="mg">
      <h1>Weekly menu</h1>
      <p className="mg-sub">Choose what is served each day. Nothing changes on the website until you press Save.</p>

      <div className="mg-bar">
        <div className="mg-tabs" role="group" aria-label="What to edit">
          <button type="button" aria-pressed={mode === 'week'} onClick={() => setMode('week')}>One week</button>
          <button type="button" aria-pressed={mode === 'rotation'} onClick={() => setMode('rotation')}>Regular rotation</button>
        </div>
        {mode === 'week' && (
          <>
            <button type="button" className="mg-btn" onClick={() => setWeekOf(shiftWeek(weekOf, -1))} aria-label="Previous week">
              <IconArrowLeft size={17} />
            </button>
            <strong style={{ minWidth: 150, textAlign: 'center' }}>
              {weekLabel(weekOf)}
              {weekOf === thisWeek && ' (this week)'}
            </strong>
            <button type="button" className="mg-btn" onClick={() => setWeekOf(shiftWeek(weekOf, 1))} aria-label="Next week">
              <IconArrowRight size={17} />
            </button>
          </>
        )}
        <span style={{ flex: 1 }} />
        {hasOverride && (
          <button type="button" className="mg-btn danger" disabled={saving} onClick={() => void save({ weekOf, days: {} }, 'This week is back on the regular rotation.')}>
            Reset to rotation
          </button>
        )}
        <button type="button" className="mg-btn primary" disabled={!dirty || saving} onClick={() => void saveCurrent()}>
          {saving ? 'Saving…' : dirty ? 'Save menu' : 'Saved'}
        </button>
      </div>

      {message && <div className={message.kind === 'error' ? 'mg-error' : 'mg-note mg-ok'} role="status" style={{ marginBottom: 12 }}>{message.text}</div>}
      <p className="mg-note" style={{ marginBottom: 14 }}>
        {mode === 'rotation'
          ? 'The regular rotation is the menu shown every week unless you change a specific week.'
          : 'Days marked ROTATION follow the regular rotation. Change a day here and it applies to this week only.'}
      </p>

      {!data ? (
        <p className="mg-empty">Loading…</p>
      ) : (
        <DndContext sensors={sensors} onDragStart={(e) => setDragging(dishById.get(String(e.active.id).replace('dish:', '')) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <div className="mg-week">
            <aside className="mg-side" aria-label="All dishes">
              <input type="search" placeholder="Search dishes…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search dishes" />
              <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
                <option value="">All categories</option>
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {filtered.map((d) => (
                <SideDish key={d.id} dish={d} onTap={() => activeDay && addTo(activeDay, d.id)} />
              ))}
              {filtered.length === 0 && <p className="mg-empty">No dishes match.</p>}
              <a className="mg-btn sm" href="/admin/collections/dishes/create" style={{ marginTop: 6 }}>
                <IconPlus size={15} />
                <span>New dish</span>
              </a>
            </aside>

            <div className="mg-days">
              {data.openWeekdays.map((wd) => {
                const key = String(wd)
                const list = days[key] ?? []
                return (
                  <DayColumn key={wd} weekday={wd} active={activeDay === wd} onSelect={() => setActiveDay(wd)} usingRotation={mode === 'week' && sameAsRotation(key)}>
                    {list.length === 0 && <p className="mg-empty">No dishes yet</p>}
                    {list.map((id) => {
                      const dish = dishById.get(id)
                      return (
                        <div className="mg-slot" key={id}>
                          <span>
                            {dish?.name ?? 'Deleted dish'}
                            {dish && <small style={{ display: 'block', opacity: 0.65 }}>{CATEGORY_LABEL[dish.category] ?? dish.category}{dish.isSoldOut ? ' · sold out' : ''}</small>}
                          </span>
                          <button type="button" aria-label={`Remove ${dish?.name ?? 'dish'} from ${WEEKDAY_NAMES[wd]}`} onClick={() => removeFrom(wd, id)}>
                            <IconClose size={16} />
                          </button>
                        </div>
                      )
                    })}
                  </DayColumn>
                )
              })}
            </div>
          </div>
          <DragOverlay>{dragging && <SideDish dish={dragging} overlay />}</DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
