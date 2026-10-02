import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useGuidePref } from '../../app/guidePref'
import { useEngines } from '../../app/EngineContext'
import { useStore } from '../../app/StoreContext'
import { createFork } from '../../chess/fork'
import { moveNumberOf } from '../../chess/moveNumber'
import { pathToRef, refKey, type GameRef } from '../../chess/gameRef'
import { isCheck, turnOf } from '../../chess/pgn'
import type { Color, GameRecord, Ply } from '../../chess/types'
import { Banner } from '../../components/Banner'
import { Board } from '../../components/Board'
import { bestMoveArrow, guideShape } from '../../components/boardShapes'
import { EngineLines } from '../../components/EngineLines'
import { ErrorView } from '../../components/ErrorView'
import { EvalBar } from '../../components/EvalBar'
import { EvalGraph } from '../../components/EvalGraph'
import { MoveList } from '../../components/MoveList'
import { commentsForGame } from '../../engine/comment'
import { guideFor } from '../../engine/comment/guide'
import { isMultiThreaded } from '../../engine/engines'
import { terminalScore, type ReviewedPosition } from '../../engine/review'
import type { Evaluate } from '../../quiz/grade'
import { selectScenes } from '../../quiz/selectScenes'
import type { QuizScene } from '../../quiz/types'
import { queryKeys } from '../../sources'
import type { QuizResult } from '../../storage/db'
import * as g from '../../styles/features/gameLayout.css'
import { Dialog } from '../../ui/Dialog'
import { Disclosure } from '../../ui/Disclosure'
import { NotFound } from '../NotFound'
import { ForkDialog } from '../play/ForkDialog'
import { JudgmentCard } from './JudgmentCard'
import { hiddenAnswers, pickGuide } from './pickGuide'
import { ActiveQuiz } from './quiz/ActiveQuiz'
import { EvaluationCancelled, type QuizFinish } from './quiz/useQuiz'
import { useAnnotations } from './useAnnotations'
import { ReviewSummary } from './ReviewSummary'
import { useGame } from './useGame'
import { useLiveAnalysis } from './useLiveAnalysis'
import { useReview } from './useReview'
import { useSwipe } from './useSwipe'
import { ViewerControls } from './ViewerControls'
import { ViewerHeader } from './ViewerHeader'

const NO_POSITIONS: ReviewedPosition[] = []

export function ViewerPage() {
  const { pathname } = useLocation()
  const ref = useMemo(() => pathToRef(pathname), [pathname])
  if (!ref) return <NotFound />
  return <GameViewer key={refKey(ref)} gameRef={ref} />
}

function GameViewer({ gameRef }: { gameRef: GameRef }) {
  const qc = useQueryClient()
  const game = useGame(gameRef)
  if (game.isPending) return <p className={g.note}>불러오는 중…</p>
  if (game.isError) return <ErrorView key={game.errorUpdatedAt} error={game.error} onRetry={() => void game.refetch()} />
  if (game.data.record.variant !== 'standard') return <p className={g.note}>지원하지 않는 변형 체스예요.</p>
  const refresh = async () => {
    if (gameRef.kind === 'broadcast') await qc.invalidateQueries({ queryKey: queryKeys.broadcastRound(gameRef.roundId) })
    await qc.invalidateQueries({ queryKey: queryKeys.game(gameRef) })
  }
  return <LoadedViewer gameRef={gameRef} record={game.data.record} plies={game.data.plies} onRefresh={() => void refresh()} />
}

interface LoadedViewerProps {
  gameRef: GameRef
  record: GameRecord
  plies: Ply[]
  onRefresh: () => void
}

function LoadedViewer({ gameRef, record, plies, onRefresh }: LoadedViewerProps) {
  const [ply, setPly] = useState(0)
  const [orientation, setOrientation] = useState<Color>('white')
  const [linesOpen, setLinesOpen] = useState(false)
  const [movesOpen, setMovesOpen] = useState(false)
  const [hint, setHint] = useState(false)
  const [guideOn, setGuideOn] = useGuidePref()
  const [forking, setForking] = useState(false)
  const [forkError, setForkError] = useState(false)
  const [forkPending, setForkPending] = useState(false)
  const forkBusy = useRef(false)
  const qc = useQueryClient()
  const store = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { analysis } = useEngines()
  const last = plies.length - 1
  const gameKey = refKey(gameRef)
  const followReview = useRef(false)
  const go = useCallback((p: number) => {
    followReview.current = false
    setPly(Math.max(0, Math.min(last, p)))
  }, [last])
  const manualSetPly: Dispatch<SetStateAction<number>> = useCallback((value) => {
    followReview.current = false
    setPly(value)
  }, [])
  const fen = plies[ply].fen
  const annotations = useAnnotations(gameRef)
  const authored = annotations?.plies.find((a) => a.ply === ply) ?? null
  useEffect(() => setHint(false), [ply])

  const startFork = async ({ playerColor, engineElo }: { playerColor: Color; engineElo: number }) => {
    if (forkBusy.current) return
    const fork = createFork({
      origin: gameRef,
      originPly: ply,
      startFen: fen,
      playerColor,
      engineElo,
      title: `${record.white.name} vs ${record.black.name} · ${moveNumberOf(plies[0].fen, ply).number}수째에서 분기`,
    })
    forkBusy.current = true
    setForkPending(true)
    setForkError(false)
    try {
      await store.forks.put(fork)
    } catch {
      forkBusy.current = false
      setForkPending(false)
      setForkError(true)
      return
    }
    await qc.invalidateQueries({ queryKey: ['forks'] })
    navigate(`/play/${fork.id}`)
  }

  const { state: review, start: startReview } = useReview(gameRef, plies, record.result !== '*')
  const reviewing = review.status === 'running'
  const reviewProgress = review.status === 'running' ? review.done : review.status === 'done' ? review.review.positions.length : 0
  useEffect(() => {
    if (followReview.current && reviewProgress > 0) setPly(Math.min(last, reviewProgress - 1))
  }, [reviewProgress, last])
  const runReview = () => {
    followReview.current = true
    setPly(0)
    void startReview()
  }
  const reviewScore = review.status === 'done' ? review.review.positions[ply]?.score : undefined
  // 리뷰 점수가 있는 수는 엔진 라인을 펼치거나 힌트를 켰을 때만 실시간 분석을 돌린다.
  const [activeScene, setActiveScene] = useState<QuizScene | null>(null)
  const quizzing = activeScene !== null
  const live = useLiveAnalysis(fen, !reviewing && !quizzing && (reviewScore === undefined || linesOpen || hint))
  useKeyboardNav(last, manualSetPly, !forking && !movesOpen && !quizzing)
  const swipe = useSwipe({
    onPrev: () => manualSetPly((p) => Math.max(0, p - 1)),
    onNext: () => manualSetPly((p) => Math.min(last, p + 1)),
  })

  const positions = review.status === 'done' ? review.review.positions : review.status === 'running' ? review.partial : NO_POSITIONS
  const labels = review.status === 'done' ? review.review.labels : undefined
  const generated = useMemo(
    () =>
      review.status === 'done' && !annotations
        ? commentsForGame({ plies, positions: review.review.positions, labels: review.review.labels, seed: refKey(gameRef) })
        : null,
    [review, annotations, plies, gameRef],
  )
  const comment = authored
    ? { text: authored.text, key: authored.key }
    : generated?.[ply]
      ? { text: generated[ply]!.text }
      : null
  // 퀴즈 장면: 명경기는 작성한 장면, 일반 대국은 리뷰로 고른 장면(내 대국이면 내 쪽만)
  const me = (location.state as { me?: string } | null)?.me ?? (gameRef.kind === 'chesscom' ? gameRef.user : undefined)
  const mySide = me
    ? record.white.name.toLowerCase() === me.toLowerCase()
      ? 'w'
      : record.black.name.toLowerCase() === me.toLowerCase()
        ? 'b'
        : null
    : null
  const scenes = useMemo(
    () => annotations?.scenes ?? (review.status === 'done' ? selectScenes(plies, review.review, mySide) : []),
    [annotations, review, plies, mySide],
  )
  const sceneHere = scenes.find((sc) => sc.startPly === ply) ?? null
  const quizPlies = useMemo(() => new Set(scenes.map((sc) => sc.startPly + 1)), [scenes])
  const [results, setResults] = useState<Map<string, QuizResult>>(() => new Map())
  useEffect(() => {
    let active = true
    store.quiz
      .list(gameKey)
      .then((rs) => {
        if (active) setResults(new Map(rs.map((r) => [r.sceneId, r])))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [store, gameKey])
  const solvedScenes = scenes.filter((sc) => results.has(sc.id)).length
  // 분석 엔진은 latest-wins라 퀴즈 채점 중 다른 탐색이 오면 취소된다. 그때는 채점하지 않는다.
  const evaluate: Evaluate = useCallback(
    async (f) => {
      const r = await analysis.analyze(f, { movetime: 300 })
      if (r.cancelled) throw new EvaluationCancelled()
      return { score: r.lines[0]?.score ?? terminalScore(f) ?? { cp: 0 }, best: r.bestMove }
    },
    [analysis],
  )
  const finishQuiz = useCallback(
    (scene: QuizScene, r: QuizFinish) => {
      const result: QuizResult = { key: `${gameKey}|${scene.id}`, gameKey, sceneId: scene.id, ...r, completedAt: Date.now() }
      setResults((m) => new Map(m).set(scene.id, result))
      store.quiz.put(result).catch((e) => console.warn('[quiz] 결과를 저장하지 못했어요', e))
    },
    [store, gameKey],
  )
  const leaveQuiz = (scene: QuizScene, toFocus: boolean) => {
    setActiveScene(null)
    if (toFocus) go(scene.focusPly ?? scene.startPly + scene.steps.length * 2 - 1)
  }

  const graphScores = useMemo(() => plies.map((_, i) => positions[i]?.score ?? null), [plies, positions])
  const terminal = useMemo(() => terminalScore(fen), [fen])
  const score = positions[ply]?.score ?? terminal ?? live.lines[0]?.score ?? null
  const hintUci = positions[ply]?.best ?? live.lines[0]?.pv[0] ?? null
  const lineUci = linesOpen && !reviewing ? live.lines[0]?.pv[0] : undefined
  const guide = useMemo(() => {
    if (!guideOn || ply === 0 || quizzing) return []
    return pickGuide({
      authored: authored?.guide,
      auto: () => guideFor({ plies, positions, labels: labels ?? [], index: ply, seed: gameKey }),
      sceneStart: sceneHere !== null,
      hidden: hiddenAnswers(scenes, ply),
    })
  }, [guideOn, ply, authored, plies, positions, labels, gameKey, sceneHere, scenes, quizzing])
  const shapes = useMemo(() => {
    const ucis = new Set<string>()
    if (hint && hintUci) ucis.add(hintUci.slice(0, 4))
    if (lineUci) ucis.add(lineUci.slice(0, 4))
    // 힌트·라인과 같은 화살표는 힌트 쪽 하나만 그린다
    const extra = guide.filter((g) => !(g.from && ucis.has(g.from + g.to))).map(guideShape)
    return [...[...ucis].map(bestMoveArrow), ...extra]
  }, [hint, hintUci, lineUci, guide])

  return (
    <div className={g.page}>
      <ViewerHeader record={record} onRefresh={onRefresh} onFlip={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>
        {!isMultiThreaded() && <Banner>이 브라우저에서는 엔진이 싱글스레드로 동작해서 분석이 느릴 수 있어요.</Banner>}
        {live.error !== null && <Banner tone="warn">엔진을 실행할 수 없어요. 새로고침해 주세요.</Banner>}
      </ViewerHeader>

      {activeScene ? (
        <ActiveQuiz
          key={activeScene.id}
          scene={activeScene}
          plies={plies}
          orientation={orientation}
          evaluate={evaluate}
          onFinish={(r) => finishQuiz(activeScene, r)}
          onContinue={() => leaveQuiz(activeScene, true)}
          onQuit={() => leaveQuiz(activeScene, false)}
        />
      ) : (
        <>
          <div className={g.stage}>
            <EvalBar score={score} orientation={orientation} />
            <div className={g.boardWrap} data-testid="board-swipe" {...swipe}>
              <Board fen={fen} orientation={orientation} lastMoveUci={plies[ply].uci} check={isCheck(fen)} shapes={shapes} />
            </div>
          </div>

          <div className={g.panel}>
            <JudgmentCard
              plies={plies}
              ply={ply}
              review={review}
              onStartReview={runReview}
              hint={hint}
              hintUci={hintUci}
              comment={comment}
              // 리뷰 중에는 엔진을 리뷰가 쓰므로 퀴즈를 열지 않는다
              quiz={sceneHere && !reviewing ? { done: results.has(sceneHere.id), onStart: () => setActiveScene(sceneHere) } : null}
              guide={ply > 0 ? { on: guideOn, onToggle: () => setGuideOn(!guideOn) } : null}
            />
            {review.status === 'done' && (
              <ReviewSummary
                review={review.review}
                startTurn={turnOf(plies[0].fen)}
                onRerun={runReview}
                quiz={scenes.length > 0 ? { solved: solvedScenes, total: scenes.length } : undefined}
              />
            )}
            {positions.length > 0 && (
              <EvalGraph key={review.status} scores={graphScores} current={ply} onSelect={go} reveal={review.status === 'done'} />
            )}
            <Disclosure title="엔진 라인" open={linesOpen} onOpenChange={setLinesOpen}>
              {reviewing ? <p className={g.note}>리뷰 중에는 실시간 분석을 잠시 멈춰요.</p> : <EngineLines fen={fen} lines={live.lines} />}
            </Disclosure>
            <Disclosure title="기보 전체">
              <MoveList plies={plies} current={ply} onSelect={go} labels={labels} quizPlies={quizPlies} />
            </Disclosure>
          </div>
        </>
      )}

      <ViewerControls
        className={g.controls}
        ply={ply}
        last={last}
        onGo={go}
        onOpenMoves={() => setMovesOpen(true)}
        onFork={() => setForking(true)}
        forkDisabled={terminal !== null}
        hint={hint}
        onHint={() => setHint((h) => !h)}
        disabled={quizzing}
      />

      {movesOpen && (
        <Dialog variant="sheet" title="기보" onClose={() => setMovesOpen(false)}>
          <MoveList
            plies={plies}
            current={ply}
            labels={labels}
            quizPlies={quizPlies}
            onSelect={(i) => {
              go(i)
              setMovesOpen(false)
            }}
          />
        </Dialog>
      )}
      {forking && (
        <ForkDialog
          defaultColor={turnOf(fen) === 'w' ? 'white' : 'black'}
          pending={forkPending}
          error={forkError}
          onCancel={() => setForking(false)}
          onConfirm={(o) => void startFork(o)}
        />
      )}
    </div>
  )
}

function useKeyboardNav(last: number, setPly: Dispatch<SetStateAction<number>>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (isTextEntry(e.target)) return
      if (e.key === 'ArrowLeft') setPly((p) => Math.max(0, p - 1))
      else if (e.key === 'ArrowRight') setPly((p) => Math.min(last, p + 1))
      else if (e.key === 'Home') setPly(0)
      else if (e.key === 'End') setPly(last)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, setPly, enabled])
}

const TEXT_INPUT_TYPES = new Set(['text', 'range', 'radio', 'search', 'email', 'url', 'password', 'number', 'tel'])

function isTextEntry(target: EventTarget | null): boolean {
  if (target instanceof Element && target.closest('dialog, [role="dialog"]')) return true
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type)
  return target instanceof HTMLElement && target.isContentEditable
}
