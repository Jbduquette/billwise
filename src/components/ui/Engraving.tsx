import { useId } from 'react'
import { cx } from '../../lib/cx'

export type EngravingKind = 'letters' | 'book' | 'inkwell'

interface EngravingProps {
  kind: EngravingKind
  className?: string
  title?: string
}

/**
 * Engraving-style line art drawn in `currentColor`, with paper fills in the
 * page background, so every piece works in both the Paper and Ink editions.
 * Hatching patterns are scoped per instance.
 */
export function Engraving({ kind, className, title }: EngravingProps) {
  const id = useId().replace(/:/g, '')
  const h1 = `h1-${id}`
  const h2 = `h2-${id}`
  const paper = 'var(--bg)'
  const seal = 'var(--verm)'

  const defs = (
    <defs>
      <pattern id={h1} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="0.9" />
      </pattern>
      <pattern id={h2} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="0.7" />
      </pattern>
    </defs>
  )

  const common = {
    role: title ? 'img' : undefined,
    'aria-hidden': title ? undefined : true,
    'aria-label': title,
    className: cx('text-ink', className),
  } as const

  if (kind === 'letters') {
    return (
      <svg viewBox="0 0 320 230" {...common}>
        {defs}
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
          <g transform="rotate(-7 150 120)">
            <rect x="34" y="52" width="210" height="132" fill={paper} />
            <path d="M34 184 L118 118 M244 184 L160 118" />
            <path d="M34 52 L139 128 L244 52" fill={`url(#${h2})`} />
          </g>
          <g transform="rotate(5 170 130)">
            <rect x="66" y="72" width="216" height="136" fill={paper} />
            <path d="M66 208 L154 142 L282 208" fill={`url(#${h1})`} opacity=".55" />
            <path d="M66 72 L174 150 L282 72" fill={paper} />
            <rect x="236" y="84" width="34" height="40" strokeDasharray="2 2" />
            <rect x="241" y="89" width="24" height="30" fill={`url(#${h1})`} />
            <circle cx="222" cy="112" r="17" strokeWidth="1" />
            <circle cx="222" cy="112" r="12" strokeWidth=".8" />
            <path d="M190 104 q8 -5 16 0 t16 0 M186 114 q8 -5 16 0 t16 0 M190 124 q8 -5 16 0 t16 0" strokeWidth=".9" />
            <circle cx="174" cy="150" r="15" fill={seal} stroke="currentColor" />
            <path d="M169 143 v14 M169 143 h5 a3.5 3.5 0 0 1 0 7 h-5 M169 150 h6 a3.5 3.5 0 0 1 0 7 h-6" stroke={paper} strokeWidth="1.8" />
          </g>
          <g transform="rotate(-32 90 190)">
            <path d="M-4 186 L150 186 L160 192 L150 198 L-4 198 Z" fill={`url(#${h1})`} />
            <path d="M-4 186 L-4 198" />
            <path d="M160 185 Q182 188 200 192 Q182 196 160 199 Z" fill={paper} />
            <path d="M172 192 L198 192" strokeWidth=".8" />
            <circle cx="178" cy="192" r="1.6" fill="currentColor" />
            <path d="M120 186 L120 198 M126 186 L126 198" strokeWidth="1" />
          </g>
        </g>
      </svg>
    )
  }

  if (kind === 'book') {
    return (
      <svg viewBox="0 0 320 210" {...common}>
        {defs}
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
          <path d="M20 176 Q160 196 300 176 L300 186 Q160 206 20 186 Z" fill={`url(#${h1})`} opacity=".5" />
          <path d="M26 44 Q92 30 160 50 L160 180 Q92 162 26 174 Z" fill={paper} />
          <path d="M294 44 Q228 30 160 50 L160 180 Q228 162 294 174 Z" fill={paper} />
          <path d="M160 50 L160 180" strokeWidth="1.8" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <path key={`l${i}`} d={`M40 ${66 + i * 13} Q96 ${56 + i * 13} 150 ${70 + i * 13}`} strokeWidth=".7" opacity=".7" />
          ))}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <path key={`r${i}`} d={`M170 ${70 + i * 13} Q224 ${56 + i * 13} 280 ${66 + i * 13}`} strokeWidth=".7" opacity=".7" />
          ))}
          <path d="M60 52 Q61 110 62 168" stroke={seal} strokeWidth="1" />
          <path d="M194 56 Q195 110 196 170" stroke={seal} strokeWidth="1" />
          <path d="M72 76 h40 M72 89 h30 M72 102 h46 M72 115 h24" strokeWidth="1.1" />
          <path d="M206 77 h34 M206 90 h48 M206 103 h28" strokeWidth="1.1" />
          <path d="M254 76 l4 4 l8 -9 M258 89 l4 4 l8 -9" strokeWidth="1.3" />
          <path d="M150 30 L150 58 L156 52 L162 58 L162 30" fill={seal} stroke="currentColor" />
          <g transform="rotate(-24 250 150)">
            <path d="M190 146 L300 146 L308 150 L300 154 L190 154 Z" fill={`url(#${h1})`} />
            <path d="M308 146 Q320 148 330 150 Q320 152 308 154 Z" fill={paper} />
          </g>
        </g>
      </svg>
    )
  }

  // inkwell & quill
  return (
    <svg viewBox="0 0 240 220" {...common}>
      {defs}
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="110" cy="196" rx="96" ry="12" fill={`url(#${h1})`} opacity=".45" />
        <path d="M60 196 L72 128 Q110 116 148 128 L160 196 Q110 206 60 196 Z" fill={paper} />
        <path d="M66 190 L76 134 Q110 124 144 134 L154 190" fill={`url(#${h2})`} opacity=".7" />
        <path d="M86 128 L88 108 Q110 102 132 108 L134 128" fill={paper} />
        <ellipse cx="110" cy="108" rx="22" ry="5" fill="currentColor" />
        <path d="M110 110 C130 70 168 32 216 10" strokeWidth="1.6" />
        <path d="M150 58 C170 30 196 16 218 8 C214 30 196 52 162 66 Z" fill={paper} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={i} d={`M${158 + i * 8} ${62 - i * 7} L${170 + i * 7} ${50 - i * 6}`} strokeWidth=".8" />
        ))}
        <path d="M176 40 C188 30 200 24 214 12" strokeWidth=".9" />
        <circle cx="46" cy="178" r="12" fill={seal} stroke="currentColor" />
        <path d="M41 172 v12 M41 172 h4 a3 3 0 0 1 0 6 h-4 M41 178 h5 a3 3 0 0 1 0 6 h-5" stroke={paper} strokeWidth="1.6" />
      </g>
    </svg>
  )
}
