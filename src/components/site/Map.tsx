'use client'

import 'leaflet/dist/leaflet.css'

import React, { useEffect, useRef, useState } from 'react'

type Props = { lat: number; lng: number; label: string; address: string }

/** Interactive OpenStreetMap (Leaflet). Falls back to a static map image if tiles can't load. */
export function BistroMap({ lat, lng, label, address }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let map: import('leaflet').Map | undefined
    let cancelled = false
    let loadedTile = false
    const fallbackTimer = setTimeout(() => {
      if (!cancelled && !loadedTile) setFailed(true)
    }, 4_000)

    ;(async () => {
      try {
        const L = (await import('leaflet')).default
        if (cancelled || !ref.current) return
        map = L.map(ref.current, { scrollWheelZoom: false, keyboard: true }).setView([lat, lng], 16)
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)
        let errors = 0
        tiles.on('tileload', () => {
          loadedTile = true
          clearTimeout(fallbackTimer)
        })
        tiles.on('tileerror', () => {
          if (++errors >= 4) setFailed(true)
        })

        // Build popup safely via DOM nodes rather than HTML string interpolation.
        const popupEl = document.createElement('div')
        const strong = document.createElement('strong')
        strong.textContent = label
        popupEl.appendChild(strong)
        popupEl.appendChild(document.createElement('br'))
        popupEl.appendChild(document.createTextNode(address))

        const icon = L.divIcon({
          className: '',
          html: '<div class="pin"><span>M</span></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -30],
        })
        L.marker([lat, lng], { icon, title: label, alt: label }).addTo(map).bindPopup(popupEl)
      } catch {
        setFailed(true)
      }
    })()
    return () => {
      cancelled = true
      clearTimeout(fallbackTimer)
      map?.remove()
    }
  }, [lat, lng, label, address])

  if (failed) {
    return (
      <div key="fallback" className="map-fallback">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/map-fallback.png" alt={`Map of ${label} at ${address}`} width={800} height={520} loading="lazy" />
        <p className="map-credit">
          <span>{address}</span>
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>
        </p>
      </div>
    )
  }

  return (
    <div>
      <div
        key="map"
        ref={ref}
        className="map-canvas"
        role="region"
        aria-label={`Interactive map showing ${label} at ${address}. Use arrow keys to pan and plus or minus keys to zoom.`}
      />
      <p className="map-credit">
        <span>{address} · Use + / − or arrow keys on the map to zoom and pan.</span>
      </p>
    </div>
  )
}
