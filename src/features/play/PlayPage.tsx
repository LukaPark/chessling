import { cx } from '../../ui/cx'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Key } from '@lichess-org/chessground/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, Download, Flag, Gauge, LoaderCircle, Undo2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useEngines } from '../../app/EngineContext'
import { useMoveEvalPref } from '../../app/moveEvalPref'
import { useStore } from '../../app/StoreContext'
import { downloadText } from '../../app/download'
import {
  applyMove,
  forkPlies,
  forkStatus,
  forkToPgn,
  legalDests,
  movetimeFor,
  resign,
  takeback,
  toUci,
  type EndReason,
  type ForkRecord,
} from '../../chess/fork'
import { refToPath } from '../../chess/gameRef'
import type { Ply } from '../../chess/types'
import { Banner } from '../../components/Banner'
import { Board } from '../../components/Board'
import { bestMoveArrow } from '../../components/boardShapes'
import { MoveList } from '../../components/MoveList'
import { epdOf } from '../../openings/line'
import * as g from '../../styles/features/gameLayout.css'
import * as s from '../../styles/features/play.css'
import { spin } from '../../ui/button.css'
import { BarButton, ControlBar } from '../../ui/ControlBar'
import { Dialog } from '../../ui/Dialog'
import { Disclosure } from '../../ui/Disclosure'
import { Icon } from '../../ui/Icon'
import { useDebounced } from '../../ui/useDebounced'
import { NotFound } from '../NotFound'
import { useGame } from '../viewer/useGame'
import { EloSlider } from './EloSlider'
import { MoveEvalCard } from './MoveEvalCard'
import { useMoveEvaluation } from './useMoveEvaluation'

const REASON_TEXT: Record<EndReason, string> = {
  checkmate: '체크메이트',
  stalemate: '스테일메이트',
  threefold: '3회 반복',
  fifty: '50수 규칙',
  insufficient: '기물 부족',
  resign: '기권',
}

export function PlayPage() {
  const { forkId = '' } = useParams()
  const store = useStore()
  const q = useQuery({ queryKey: ['fork', forkId], queryFn: async () => (await store.forks.get(forkId)) ?? null, staleTime: Infinity })
  if (q.isPending) return <p className={g.note}>불러오는 중…</p>
  if (!q.data) return <NotFound />
  return <ForkGame key={forkId} initial={q.data} />
}

function ForkGame({ initial }: { initial: ForkRecord }) {
  const store = useStore()
  const { play } = useEngines()
  const qc = useQueryClient()
  const [fork, setFork] = useState(initial)
  const [engineError, setEngineError] = useState<unknown>(null)
  const [eloOpen, setEloOpen] = useState(false)
  const forkRef = useRef(fork)
  forkRef.current = fork
  const status = useMemo(() => forkStatus(fork), [fork])
  const engineTurn = !status.over && status.turn !== fork.playerColor

  const save = useCallback(
    (next: ForkRecord) => {
      forkRef.current = next
      setFork(next)
      qc.setQueryData(['fork', next.id], next)
      void store.forks.put(next).then(() => qc.invalidateQueries({ queryKey: ['forks'] }))
    },
    [store, qc],
  )

  useEffect(() => {
    if (!engineTurn) return
    const ac = new AbortController()
    play
      .bestMove(status.fen, { movetime: movetimeFor(fork.engineElo), elo: fork.engineElo, signal: ac.signal })
      .then((uci) => {
        if (!ac.signal.aborted && uci) save(applyMove(forkRef.current, uci))
      })
      .catch((e) => {
        if (!ac.signal.aborted) setEngineError(e)
      })
    return () => ac.abort()
  }, [engineTurn, status.fen, fork.engineElo, play, save])

  const onMove = (from: Key, to: Key) => {
    try {
      save(applyMove(forkRef.current, toUci(status.fen, from, to)))
    } catch {
      setFork({ ...forkRef.current }) // 보드를 원래 포지션으로 되돌린다
    }
  }
  const dests = useMemo(
    () => (status.over || engineTurn ? new Map() : legalDests(status.fen)) as Map<Key, Key[]>,
    [status.fen, status.over, engineTurn],
  )
  const plies = useMemo(() => forkPlies(fork), [fork])
  const canTakeback = takeback(fork) !== fork
  const original = useGame(fork.origin)
  const [evalOn, setEvalOn] = useMoveEvalPref()
  const evaluation = useMoveEvaluation({ plies, playerColor: fork.playerColor, enabled: evalOn, seed: fork.id })
  const latest = evaluation.latest
  // 더 나은 수 화살표는 내가 다음 수를 둘 때까지 둔다
  const betterUci = latest?.status === 'done' ? latest.betterUci : null
  const shapes = useMemo(() => (betterUci ? [bestMoveArrow(betterUci)] : []), [betterUci])

  return (
    <div className={g.page}>
      <header className={g.header}>
        <div className={g.headRow}>
          <h1 className={g.title}>{fork.title}</h1>
        </div>
        <p className={g.meta}>
          <Link to={refToPath(fork.origin)}>원래 대국으로</Link>
        </p>
        {engineError !== null && <Banner tone="warn">엔진을 실행할 수 없어요. 새로고침해 주세요.</Banner>}
      </header>

      <div className={cx(g.stage, s.stage)}>
        <p className={s.status}>
          {status.over ? (
            `${status.result} · ${REASON_TEXT[status.reason!]}`
          ) : engineTurn ? (
            <>
              <Icon icon={LoaderCircle} size={18} className={spin} />
              엔진이 생각 중…
            </>
          ) : (
            <>
              <span className={s.turnDot} aria-hidden="true" />내 차례
            </>
          )}
        </p>
        {latest && <MoveEvalCard plies={plies} latest={latest} />}
        <div className={g.boardWrap}>
          <Board
            fen={status.fen}
            orientation={fork.playerColor}
            lastMoveUci={status.lastMove}
            check={status.check}
            shapes={shapes}
            movable={{ color: fork.playerColor, dests, onMove }}
          />
        </div>
      </div>

      <div className={g.panel}>
        <Disclosure title="기보" testId="play-moves">
          <MoveList plies={plies} current={plies.length - 1} labels={evaluation.labels} />
        </Disclosure>
        {original.data &&
          (startsFromOriginal(original.data.plies, fork) ? (
            <Disclosure title="원래 대국의 수순">
              <OriginalLine plies={original.data.plies} fromPly={fork.originPly} />
            </Disclosure>
          ) : (
            <p className={g.note}>연습용 분기라 원래 대국 수순을 보여 주지 않아요.</p>
          ))}
      </div>

      <ControlBar label="대국 조작" className={g.controls}>
        <BarButton
          icon={Undo2}
          label="무르기"
          caption
          disabled={!canTakeback}
          onClick={() => {
            play.stop()
            save(takeback(forkRef.current))
          }}
        />
        <BarButton
          icon={Flag}
          label="기권"
          caption
          disabled={status.over}
          onClick={() => {
            if (window.confirm('기권할까요?')) save(resign(forkRef.current))
          }}
        />
        <BarButton icon={Gauge} label={`엔진 세기 (Elo ${fork.engineElo})`} caption={`Elo ${fork.engineElo}`} onClick={() => setEloOpen(true)} />
        <BarButton icon={BadgeCheck} label="수 평가" caption pressed={evalOn} onClick={() => setEvalOn(!evalOn)} />
        <BarButton
          icon={Download}
          label="PGN 내보내기"
          caption="PGN"
          onClick={() => downloadText(`chessling-${fork.id.slice(0, 8)}.pgn`, forkToPgn(fork))}
        />
      </ControlBar>

      {eloOpen && (
        <Dialog variant="sheet" title="엔진 세기" onClose={() => setEloOpen(false)}>
          <EloSheet
            value={fork.engineElo}
            onCommit={(elo) => {
              if (elo !== forkRef.current.engineElo) save({ ...forkRef.current, engineElo: elo, updatedAt: Date.now() })
            }}
          />
        </Dialog>
      )}
    </div>
  )
}

const ELO_SAVE_DEBOUNCE_MS = 300

/**
 * 슬라이더를 움직이는 동안에는 화면 값만 바꾸고, 멈춘 뒤 300ms에 한 번 저장한다.
 * 시트가 닫히면(언마운트) 남은 값을 바로 저장한다. 한 칸마다 IndexedDB에 쓰거나 엔진을 다시 시작하지 않는다.
 */
function EloSheet({ value, onCommit }: { value: number; onCommit: (elo: number) => void }) {
  const [draft, setDraft] = useState(value)
  const settled = useDebounced(draft, ELO_SAVE_DEBOUNCE_MS)
  const latest = useRef({ draft, onCommit })
  latest.current = { draft, onCommit }
  useEffect(() => latest.current.onCommit(settled), [settled])
  useEffect(() => () => latest.current.onCommit(latest.current.draft), [])
  return <EloSlider value={draft} onChange={setDraft} />
}

/** 오프닝 연습처럼 기보 밖 포지션에서 시작한 분기는 원래 대국의 이후 수순과 이어지지 않는다 */
function startsFromOriginal(plies: Ply[], fork: ForkRecord): boolean {
  const at = plies[fork.originPly]
  return at !== undefined && epdOf(at.fen) === epdOf(fork.startFen)
}

function OriginalLine({ plies, fromPly }: { plies: Ply[]; fromPly: number }) {
  const next = plies.slice(fromPly + 1, fromPly + 13)
  if (next.length === 0) return <p className={s.original}>원래 대국은 여기서 끝났어요.</p>
  return <p className={s.original}>{next.map((p) => p.san).join(' ')}</p>
}
