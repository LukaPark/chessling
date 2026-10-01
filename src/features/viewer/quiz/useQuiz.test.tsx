// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { Chess } from 'chess.js'
import { describe, expect, it, vi } from 'vitest'
import type { Ply } from '../../../chess/types'
import type { Evaluate } from '../../../quiz/grade'
import type { QuizScene } from '../../../quiz/types'
import { EvaluationCancelled, useQuiz } from './useQuiz'

function game(sans: string[]): Ply[] {
  const c = new Chess()
  const out: Ply[] = [{ san: null, uci: null, fen: c.fen() }]
  for (const s of sans) {
    const m = c.move(s)
    out.push({ san: m.san, uci: m.from + m.to, fen: c.fen() })
  }
  return out
}
const plies = game(['e4', 'e5', 'Nf3', 'Nc6'])
const twoSteps: QuizScene = {
  id: 's',
  startPly: 0,
  side: 'w',
  prompt: '?',
  source: 'authored',
  steps: [{ answerUci: 'e2e4', replyUci: 'e7e5' }, { answerUci: 'g1f3' }],
}
/** 정답보다 크게 나쁜 수로 본다: 사용자 수 뒤 -300, 정답 뒤 0 */
const badEval = (): Evaluate => {
  let n = 0
  return async () => (n++ % 2 === 0 ? { score: { cp: -300 }, best: null } : { score: { cp: 0 }, best: null })
}

function setup(scene: QuizScene, evaluate: Evaluate = badEval()) {
  const onFinish = vi.fn()
  const hook = renderHook(() => useQuiz({ scene, plies, evaluate, reducedMotion: true, onFinish }))
  return { ...hook, onFinish }
}

describe('useQuiz', () => {
  it('두 단계를 모두 맞히면 응수를 두고 끝난다', async () => {
    const { result, onFinish } = setup(twoSteps)
    await act(() => result.current.play('e2e4'))
    expect(result.current.stepIndex).toBe(1)
    expect(result.current.fen).toBe(plies[2].fen)
    expect(result.current.lastUci).toBe('e7e5')
    await act(() => result.current.play('g1f3'))
    expect(result.current.status).toBe('done')
    expect(onFinish).toHaveBeenCalledWith({ solvedSteps: 2, totalSteps: 2, attempts: 2 })
  })

  it('오답 뒤 다시 맞히면 그 단계는 맞힌 수로 세지 않는다', async () => {
    const { result, onFinish } = setup(twoSteps)
    await act(() => result.current.play('a2a3'))
    expect(result.current.status).toBe('feedback')
    expect(result.current.feedback?.kind).toBe('wrong')
    expect(result.current.fen).toBe(plies[0].fen) // 오답은 보드에 남기지 않는다
    await act(() => result.current.play('e2e4'))
    await act(() => result.current.play('g1f3'))
    expect(onFinish).toHaveBeenCalledWith({ solvedSteps: 1, totalSteps: 2, attempts: 3 })
  })

  it('힌트는 기물 칸을 알려 주고, 그 단계는 맞힌 수로 세지 않는다', async () => {
    const { result, onFinish } = setup(twoSteps)
    act(() => result.current.hint())
    expect(result.current.hintSquare).toBe('e2')
    await act(() => result.current.play('e2e4'))
    expect(result.current.hintSquare).toBeNull() // 다음 단계로 가면 지운다
    await act(() => result.current.play('g1f3'))
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ solvedSteps: 1 }))
  })

  it('정답 보기는 정답과 응수를 두고 다음 단계로 간다', async () => {
    const { result } = setup(twoSteps)
    act(() => result.current.reveal())
    expect(result.current.stepIndex).toBe(1)
    expect(result.current.fen).toBe(plies[2].fen)
  })

  it('비슷하게 좋은 대안이면 장면을 거기서 끝낸다', async () => {
    const { result, onFinish } = setup(twoSteps, async () => ({ score: { cp: 0 }, best: null }))
    await act(() => result.current.play('d2d4'))
    expect(result.current.status).toBe('done')
    expect(result.current.feedback?.kind).toBe('alternative')
    expect(onFinish).toHaveBeenCalledWith({ solvedSteps: 1, totalSteps: 2, attempts: 1 })
  })

  it('채점이 취소되면 시도로 세지 않고 다시 기다린다', async () => {
    const { result, onFinish } = setup(twoSteps, async () => {
      throw new EvaluationCancelled()
    })
    await act(() => result.current.play('a2a3'))
    expect(result.current.status).toBe('waiting')
    expect(result.current.feedback).toBeNull()
    act(() => result.current.reveal())
    await act(() => result.current.play('g1f3'))
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ attempts: 1 }))
  })

  it('응수를 기다리는 동안에는 수를 받지 않는다', async () => {
    vi.useFakeTimers()
    try {
      const onFinish = vi.fn()
      const { result } = renderHook(() => useQuiz({ scene: twoSteps, plies, evaluate: badEval(), reducedMotion: false, onFinish }))
      await act(() => result.current.play('e2e4'))
      expect(result.current.status).toBe('replying')
      await act(() => result.current.play('g1f3'))
      expect(result.current.stepIndex).toBe(0)
      act(() => vi.advanceTimersByTime(600))
      expect(result.current.status).toBe('waiting')
      expect(result.current.stepIndex).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
