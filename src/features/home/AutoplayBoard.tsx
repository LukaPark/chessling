import { ArrowRight, Pause, Play, RotateCcw } from 'lucide-react'
import { useInView, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import { refToPath } from '../../chess/gameRef'
import { isCheck, pgnToPlies } from '../../chess/pgn'
import { Board } from '../../components/Board'
import type { Classic } from '../../sources/classics'
import * as h from '../../styles/features/home.css'
import { Button, LinkButton } from '../../ui/Button'
import { MoveTape } from './MoveTape'
import { useAutoplay } from './useAutoplay'

export function AutoplayBoard({ classic }: { classic: Classic }) {
  const plies = useMemo(() => pgnToPlies(classic.pgn), [classic.pgn])
  const reduce = useReducedMotion() ?? false
  const auto = useAutoplay(plies.length - 1, { reduced: reduce })
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const { start, pause } = auto
  useEffect(() => {
    if (inView) start()
    else pause()
  }, [inView, start, pause])
  const cur = plies[auto.ply]

  return (
    <figure ref={ref} className={h.showcase} aria-label="오늘의 명경기 자동 재생">
      <div className={h.showcaseBoard} onPointerDown={pause}>
        <Board fen={cur.fen} orientation="white" lastMoveUci={cur.uci} check={isCheck(cur.fen)} />
      </div>
      <MoveTape plies={plies} current={auto.ply} onPointerDown={pause} />
      <figcaption className={h.caption}>
        {classic.title} · {classic.white} vs {classic.black} · {classic.year}
      </figcaption>
      <div className={h.controls}>
        {!reduce && !auto.finished && (
          <Button tone="ghost" size="sm" icon={auto.playing ? Pause : Play} onClick={auto.playing ? auto.pause : auto.play}>
            {auto.playing ? '멈춤' : '재생'}
          </Button>
        )}
        {!reduce && (
          <Button tone="ghost" size="sm" icon={RotateCcw} onClick={auto.restart}>
            처음부터
          </Button>
        )}
        <LinkButton tone="ghost" size="sm" icon={ArrowRight} to={refToPath({ kind: 'classic', slug: classic.slug })}>
          이 대국 분석하기
        </LinkButton>
      </div>
    </figure>
  )
}
