import { useId, type ReactNode } from 'react'
import { cx } from '../../lib/cx'

/**
 * A small engraving for each month, drawn in `currentColor` with paper (`--bg`) fills so it works in
 * both editions: January's pine, February's snowdrops… October's oak, November's maple, December's holly.
 * Decorative only.
 */

// Shapes, each drawn upright from its base at 0,0; `half` is the side that gets hatched.
const OAK = {
  d: 'M0,0 C-4,-8 -14,-10 -12,-18 C-20,-20 -23,-30 -14,-33 C-23,-38 -21,-50 -11,-50 C-15,-60 -8,-70 0,-80 C8,-70 15,-60 11,-50 C21,-50 23,-38 14,-33 C23,-30 20,-20 12,-18 C14,-10 4,-8 0,0 Z',
  half: 'M0,-80 C8,-70 15,-60 11,-50 C21,-50 23,-38 14,-33 C23,-30 20,-20 12,-18 C14,-10 4,-8 0,0 Z',
  veins: 'M0,0 L0,-76 M0,-16 L-11,-24 M0,-16 L11,-24 M0,-31 L-13,-38 M0,-31 L13,-38 M0,-46 L-10,-52 M0,-46 L10,-52 M0,-60 L-6,-66 M0,-60 L6,-66',
}
const LEAF = {
  d: 'M0,0 C-11,-12 -12,-38 0,-54 C12,-38 11,-12 0,0 Z',
  half: 'M0,-54 C12,-38 11,-12 0,0 Z',
  veins: 'M0,0 L0,-50 M0,-14 L-7,-20 M0,-14 L7,-20 M0,-28 L-7,-34 M0,-28 L7,-34 M0,-40 L-4,-45 M0,-40 L4,-45',
}
const HOLLY = {
  d: 'M0,0 L-6,-8 L-12,-10 L-9,-18 L-14,-24 L-9,-30 L-12,-38 L-6,-42 L0,-54 L6,-42 L12,-38 L9,-30 L14,-24 L9,-18 L12,-10 L6,-8 Z',
  half: 'M0,-54 L6,-42 L12,-38 L9,-30 L14,-24 L9,-18 L12,-10 L6,-8 L0,0 Z',
  veins: 'M0,0 L0,-50 M0,-18 L6,-24 M0,-18 L-6,-24 M0,-32 L6,-37 M0,-32 L-6,-37',
}
const MAPLE = {
  d: 'M0,0 L-2,-12 L-16,-10 L-12,-18 L-24,-30 L-14,-30 L-16,-42 L-6,-36 L0,-54 L6,-36 L16,-42 L14,-30 L24,-30 L12,-18 L16,-10 L2,-12 Z',
  half: 'M0,-54 L6,-36 L16,-42 L14,-30 L24,-30 L12,-18 L16,-10 L2,-12 L0,0 Z',
  veins: 'M0,0 L0,-50 M0,-14 L-18,-27 M0,-14 L18,-27 M0,-14 L-11,-11 M0,-14 L11,-11 M0,-26 L-12,-38 M0,-26 L12,-38',
}
const TULIP = {
  d: 'M-10,0 C-12,-14 -9,-24 -7,-30 L-3,-21 L0,-32 L3,-21 L7,-30 C9,-24 12,-14 10,0 C6,6 -6,6 -10,0 Z',
  half: 'M0,-32 L3,-21 L7,-30 C9,-24 12,-14 10,0 C6,6 2,5 0,5 Z',
  veins: 'M-3,-21 C-3,-10 -4,-2 -5,3 M3,-21 C3,-10 4,-2 5,3',
}
const ROSE = {
  d: 'M-13,0 C-15,-12 -5,-19 0,-17 C6,-19 15,-12 13,0 C9,9 -9,9 -13,0 Z',
  half: 'M0,-17 C6,-19 15,-12 13,0 C9,9 3,8 0,8 Z',
  veins: 'M-5,-7 C-7,-13 4,-15 6,-9 C7,-3 -2,-1 -2,-7 C-2,-10 3,-10 3,-7 M-13,0 C-6,-4 6,-4 13,0',
}
const APPLE = {
  d: 'M0,-2 C-6,-8 -16,-6 -16,6 C-16,18 -6,24 0,20 C6,24 16,18 16,6 C16,-6 6,-8 0,-2 Z',
  half: 'M0,-2 C6,-8 16,-6 16,6 C16,18 6,24 0,20 Z',
  veins: 'M0,-2 C-1,2 -1,6 0,9',
}

type Shape = typeof LEAF

function Part({ shape, at, hatch }: { shape: Shape; at: string; hatch: string }) {
  return (
    <g transform={at}>
      <path d={shape.d} fill="var(--bg)" stroke="currentColor" strokeWidth={1.1} strokeLinejoin="round" />
      <path d={shape.half} fill={`url(#${hatch})`} />
      <path d={shape.veins} fill="none" stroke="currentColor" strokeWidth={0.8} strokeLinecap="round" />
    </g>
  )
}

const Stem = ({ d, w = 1.6 }: { d: string; w?: number }) => (
  <path d={d} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" />
)

function Acorn({ at, h, x }: { at: string; h: string; x: string }) {
  return (
    <g transform={at}>
      <path d="M-7,1 C-8,13 -3,20 0,22 C3,20 8,13 7,1 Z" fill="var(--bg)" stroke="currentColor" strokeWidth={1.1} />
      <path d="M0,1 L7,1 C8,13 3,20 0,22 Z" fill={`url(#${h})`} />
      <ellipse cx={0} cy={0} rx={9.5} ry={6} fill={`url(#${x})`} stroke="currentColor" strokeWidth={1.1} />
      <path d="M0,-6 L1,-10" stroke="currentColor" strokeWidth={1.4} />
    </g>
  )
}

function Berry({ cx: x, cy: y, h }: { cx: number; cy: number; h: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={4.6} fill={`url(#${h})`} stroke="currentColor" strokeWidth={1.1} />
      <circle cx={x - 1.4} cy={y - 1.5} r={1.2} fill="var(--bg)" />
    </g>
  )
}

function Blossom({ at, h }: { at: string; h: string }) {
  return (
    <g transform={at}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={0} cy={-7} rx={4.5} ry={6.5} transform={`rotate(${a})`} fill="var(--bg)" stroke="currentColor" strokeWidth={1} />
      ))}
      <circle r={3} fill={`url(#${h})`} stroke="currentColor" strokeWidth={0.9} />
    </g>
  )
}

function Grain({ at, h }: { at: string; h: string }) {
  return (
    <g transform={at}>
      <ellipse cx={0} cy={0} rx={3.4} ry={6.5} fill="var(--bg)" stroke="currentColor" strokeWidth={0.9} />
      <path d="M0,-6.5 C2,-3 2.6,2 0,6.5 C3.4,3 3.4,-3 0,-6.5 Z" fill={`url(#${h})`} />
      <path d="M0,-6 L2,-17" stroke="currentColor" strokeWidth={0.6} />
    </g>
  )
}

function Petal({ at }: { at: string }) {
  return <ellipse cx={0} cy={-15} rx={3.6} ry={8} transform={at} fill="var(--bg)" stroke="currentColor" strokeWidth={0.9} />
}

/** The twelve compositions, in a 140 × 130 box. `h` is the hatch, `x` the cross-hatch pattern id. */
function art(month: number, h: string, x: string): ReactNode {
  switch (month) {
    case 1: // January: pine sprig and cone
      return (
        <>
          <Stem d="M10,120 C44,98 78,84 132,64" />
          {Array.from({ length: 11 }, (_, i) => {
            const t = 18 + i * 10
            const y = 116 - i * 4.8
            return <path key={i} d={`M${t},${y} l-6,-17 M${t},${y} l6,-16 M${t},${y} l11,-10 M${t},${y} l-12,-9`} stroke="currentColor" strokeWidth={0.8} fill="none" />
          })}
          <g transform="translate(64,104) rotate(-20)">
            <ellipse cx={0} cy={0} rx={9.5} ry={16} fill={`url(#${x})`} stroke="currentColor" strokeWidth={1.1} />
            <path d="M-9,-6 C-3,-2 3,-2 9,-6 M-9.5,2 C-3,6 3,6 9.5,2 M-7,10 C-3,13 3,13 7,10 M-6,-12 C-2,-9 2,-9 6,-12" stroke="currentColor" strokeWidth={0.8} fill="none" />
          </g>
        </>
      )
    case 2: // February: snowdrops
      return (
        <>
          <Stem d="M48,124 C46,90 58,60 76,46" w={1.3} />
          <Stem d="M84,124 C84,96 96,72 112,64" w={1.3} />
          <Part shape={LEAF} at="translate(44,124) rotate(-14) scale(.46,1.15)" hatch={h} />
          <Part shape={LEAF} at="translate(90,124) rotate(16) scale(.42,1)" hatch={h} />
          {[
            [76, 46, 30],
            [112, 64, 34],
          ].map(([cx, cy, rot]) => (
            <g key={cx} transform={`translate(${cx},${cy}) rotate(${rot})`}>
              <Petal at="rotate(160)" />
              <Petal at="rotate(200)" />
              <Petal at="rotate(180)" />
              <path d="M-3,12 C-2,17 2,17 3,12 Z" fill={`url(#${h})`} stroke="currentColor" strokeWidth={0.8} />
            </g>
          ))}
        </>
      )
    case 3: // March: a budding twig
      return (
        <>
          <Stem d="M8,118 C40,100 76,86 132,66" />
          <Stem d="M70,92 C76,78 86,70 98,62" w={1.2} />
          <Part shape={LEAF} at="translate(40,105) rotate(-28) scale(.55)" hatch={h} />
          <Part shape={LEAF} at="translate(62,96) rotate(32) scale(.5)" hatch={h} />
          <Part shape={LEAF} at="translate(110,73) rotate(-10) scale(.45)" hatch={h} />
          {[
            [98, 62],
            [132, 66],
            [86, 84],
          ].map(([cx, cy]) => (
            <ellipse key={cx} cx={cx} cy={cy} rx={4} ry={7} transform={`rotate(40 ${cx} ${cy})`} fill={`url(#${h})`} stroke="currentColor" strokeWidth={1} />
          ))}
        </>
      )
    case 4: // April: a tulip
      return (
        <>
          <Stem d="M70,126 C70,100 72,74 74,52" w={1.5} />
          <Part shape={LEAF} at="translate(68,126) rotate(-24) scale(.6,1.35)" hatch={h} />
          <Part shape={LEAF} at="translate(72,126) rotate(22) scale(.55,1.1)" hatch={h} />
          <Part shape={TULIP} at="translate(74,52) scale(1.45)" hatch={h} />
        </>
      )
    case 5: // May: a blossom branch
      return (
        <>
          <Stem d="M8,118 C40,100 76,84 132,66" />
          <Stem d="M60,96 C66,82 72,74 84,66" w={1.2} />
          <Part shape={LEAF} at="translate(30,108) rotate(-60) scale(.45)" hatch={h} />
          <Part shape={LEAF} at="translate(104,78) rotate(50) scale(.42)" hatch={h} />
          <Blossom at="translate(84,62)" h={h} />
          <Blossom at="translate(50,96) scale(.85)" h={h} />
          <Blossom at="translate(124,64) scale(.9)" h={h} />
          <ellipse cx={100} cy={70} rx={3.4} ry={5} fill={`url(#${h})`} stroke="currentColor" strokeWidth={1} />
        </>
      )
    case 6: // June: a rose
      return (
        <>
          <Stem d="M46,126 C56,104 66,82 76,60" w={1.5} />
          <Part shape={LEAF} at="translate(56,102) rotate(-62) scale(.48)" hatch={h} />
          <Part shape={LEAF} at="translate(64,88) rotate(54) scale(.44)" hatch={h} />
          <path d="M52,112 l-5,-3 M58,96 l5,-2" stroke="currentColor" strokeWidth={1} />
          <Part shape={ROSE} at="translate(78,52) scale(1.6)" hatch={h} />
        </>
      )
    case 7: // July: a sunflower
      return (
        <>
          <Stem d="M64,128 C66,108 68,92 70,76" w={1.6} />
          <Part shape={LEAF} at="translate(66,112) rotate(-58) scale(.6)" hatch={h} />
          <g transform="translate(70,52)">
            {Array.from({ length: 16 }, (_, i) => (
              <Petal key={i} at={`rotate(${i * 22.5}) scale(1.05)`} />
            ))}
            <circle r={11} fill={`url(#${x})`} stroke="currentColor" strokeWidth={1.1} />
          </g>
        </>
      )
    case 8: // August: wheat
      return (
        <>
          {[
            [56, 126, 70, 40, -8],
            [76, 126, 92, 46, 12],
          ].map(([sx, sy, ex, ey, lean]) => (
            <g key={sx}>
              <Stem d={`M${sx},${sy} C${sx + 2},100 ${ex - 4},70 ${ex},${ey}`} w={1.2} />
              {Array.from({ length: 6 }, (_, i) => (
                <g key={i}>
                  <Grain at={`translate(${ex - 3 - i * 0.6},${ey + 4 + i * 8}) rotate(${-24 + lean})`} h={h} />
                  <Grain at={`translate(${ex + 4 - i * 0.6},${ey + 6 + i * 8}) rotate(${24 + lean})`} h={h} />
                </g>
              ))}
            </g>
          ))}
        </>
      )
    case 9: // September: an apple on the bough
      return (
        <>
          <Stem d="M8,112 C40,96 80,86 134,70" />
          <Stem d="M78,88 C78,94 77,98 76,102" w={1.3} />
          <Part shape={LEAF} at="translate(46,100) rotate(-70) scale(.55)" hatch={h} />
          <Part shape={LEAF} at="translate(100,80) rotate(-40) scale(.6)" hatch={h} />
          <Part shape={APPLE} at="translate(76,104) scale(1.15)" hatch={h} />
        </>
      )
    case 10: // October: oak and acorns
      return (
        <>
          <Stem d="M8,118 C40,96 70,84 132,70" />
          <Part shape={OAK} at="translate(56,90) rotate(-24) scale(.82)" hatch={h} />
          <Part shape={OAK} at="translate(96,78) rotate(58) scale(.72)" hatch={h} />
          <Part shape={OAK} at="translate(118,73) rotate(14) scale(.6)" hatch={h} />
          <Acorn at="translate(38,104) rotate(18)" h={h} x={x} />
          <Acorn at="translate(76,96) rotate(-12) scale(.86)" h={h} x={x} />
        </>
      )
    case 11: // November: falling maple leaves
      return (
        <>
          <Stem d="M30,124 C34,110 38,100 44,92" w={1.2} />
          <Part shape={MAPLE} at="translate(44,92) rotate(-14) scale(1.1)" hatch={h} />
          <Stem d="M92,96 C94,88 96,84 98,80" w={1.1} />
          <Part shape={MAPLE} at="translate(98,80) rotate(28) scale(.8)" hatch={h} />
          <Part shape={MAPLE} at="translate(122,40) rotate(-150) scale(.55)" hatch={h} />
        </>
      )
    default: // December: holly and berries
      return (
        <>
          <Stem d="M14,116 C46,98 82,86 130,72" />
          <Part shape={HOLLY} at="translate(54,96) rotate(-40)" hatch={h} />
          <Part shape={HOLLY} at="translate(70,90) rotate(46) scale(.9)" hatch={h} />
          <Part shape={HOLLY} at="translate(112,76) rotate(-12) scale(.75)" hatch={h} />
          <Berry cx={62} cy={92} h={x} />
          <Berry cx={70} cy={98} h={x} />
          <Berry cx={58} cy={101} h={x} />
        </>
      )
  }
}

export function MonthVignette({ month, className }: { month: string; className?: string }) {
  const id = useId().replace(/:/g, '')
  const h = `vh-${id}`
  const x = `vx-${id}`
  const m = Number(month.slice(5, 7)) || 1
  return (
    <svg viewBox="0 0 140 130" aria-hidden focusable="false" className={cx('text-ink', className)}>
      <defs>
        <pattern id={h} width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <line x1="0" y1="0" x2="0" y2="3.2" stroke="currentColor" strokeWidth=".8" />
        </pattern>
        <pattern id={x} width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0V3.4M0 0H3.4" stroke="currentColor" strokeWidth=".7" fill="none" />
        </pattern>
      </defs>
      {art(m, h, x)}
    </svg>
  )
}

/** A printer's fleuron between sections: hairlines either side of a small scrolled ornament. */
export function Fleuron({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cx('flex items-center gap-4 text-[var(--foil-ink)]', className)}>
      <span className="h-px flex-1 bg-rule-strong" />
      <svg viewBox="0 0 64 18" className="h-[18px] w-16">
        <path
          d="M32,9 C26,1 16,1 12,6 C9,10 13,15 18,12 C21,10 19,6 16,7 M32,9 C38,1 48,1 52,6 C55,10 51,15 46,12 C43,10 45,6 48,7 M32,9 C29,13 27,15 22,16 M32,9 C35,13 37,15 42,16 M1,9 H10 M54,9 H63"
          stroke="currentColor"
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M32,4 L35,9 L32,14 L29,9 Z" fill="currentColor" />
      </svg>
      <span className="h-px flex-1 bg-rule-strong" />
    </div>
  )
}
