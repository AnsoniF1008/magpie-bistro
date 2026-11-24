import React from 'react'

/** "The Magpie" and display headline render immediately on SSR and settle cleanly via CSS. */
export function HeroTitle({ script, rest }: { script: string; rest: string }) {
  const words = rest.split(' ')
  return (
    <h1 aria-label={`${script} ${rest}`}>
      <span className="script hero-script" aria-hidden="true">
        {script}
      </span>
      <span aria-hidden="true" style={{ display: 'inline-block' }}>
        {words.map((w, i) => (
          <span key={i} className="hero-word-mask">
            <span className="hero-word" style={{ animationDelay: `${120 + i * 55}ms` }}>
              {w}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          </span>
        ))}
      </span>
    </h1>
  )
}

/** Hero photograph settles gently into its frame on load without scroll-linked parallax. */
export function HeroPhoto({ children }: { children: React.ReactNode }) {
  return (
    <div className="frame">
      <div className="hero-media-inner">{children}</div>
    </div>
  )
}
