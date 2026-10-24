/**
 * SVG filters shared by the whole page, referenced from CSS:
 * - `#bw-deckle` roughens the paper's edges (`.sheet`).
 * - `#bw-ink` speckles and slightly blurs the edges of the rubber stamp (`.stamp`), like real ink.
 */
export function PaperDefs() {
  return (
    <svg width="0" height="0" aria-hidden focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <filter id="bw-deckle" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="bw-ink" x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.32" result="mask" />
          <feComposite in="SourceGraphic" in2="mask" operator="in" result="speckled" />
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="9" result="wobble" />
          <feDisplacementMap in="speckled" in2="wobble" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  )
}
