// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { QuizScene } from '../../../quiz/types'
import { QuizCard } from './QuizCard'
import type { QuizState } from './useQuiz'

afterEach(cleanup)

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const scene: QuizScene = {
  id: 's',
  startPly: 0,
  side: 'w',
  prompt: '백의 첫 수를 찾아보세요.',
  source: 'authored',
  steps: [{ answerUci: 'e2e4', replyUci: 'e7e5' }, { answerUci: 'g1f3', replyUci: 'b8c6' }, { answerUci: 'f1c4' }],
}
function fakeQuiz(over: Partial<QuizState> = {}): QuizState {
  return {
    fen: START,
    lastUci: null,
    stepIndex: 0,
    status: 'waiting',
    feedback: null,
    hintSquare: null,
    step: scene.steps[0],
    solved: 0,
    busy: false,
    play: vi.fn(async () => {}),
    hint: vi.fn(),
    reveal: vi.fn(),
    ...over,
  }
}
const renderCard = (quiz: QuizState, handlers = { onContinue: vi.fn(), onQuit: vi.fn() }) => {
  render(<QuizCard scene={scene} quiz={quiz} {...handlers} />)
  return handlers
}

describe('QuizCard', () => {
  it('질문, 진행, 세 버튼이 보인다', () => {
    const quiz = fakeQuiz()
    const { onQuit } = renderCard(quiz)
    expect(screen.getByRole('region', { name: '퀴즈' })).toBeInTheDocument()
    expect(screen.getByText('백의 첫 수를 찾아보세요.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3수 중 1번째' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '힌트' }))
    fireEvent.click(screen.getByRole('button', { name: '정답 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '그만두기' }))
    expect(quiz.hint).toHaveBeenCalled()
    expect(quiz.reveal).toHaveBeenCalled()
    expect(onQuit).toHaveBeenCalled()
  })

  it('수 입력: 둘 수 없는 수면 알리고, 둘 수 있으면 UCI로 둔다', () => {
    const quiz = fakeQuiz()
    renderCard(quiz)
    const input = screen.getByLabelText('수 입력 (예: Nf3)')
    fireEvent.change(input, { target: { value: 'Qh9' } })
    fireEvent.click(screen.getByRole('button', { name: '두기' }))
    expect(screen.getByRole('alert')).toHaveTextContent('둘 수 없는 수예요')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(quiz.play).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: 'Nf3' } })
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '두기' }))
    expect(quiz.play).toHaveBeenCalledWith('g1f3')
  })

  it('채점 중에는 버튼을 막는다', () => {
    renderCard(fakeQuiz({ status: 'thinking', busy: true }))
    expect(screen.getByText('확인하는 중…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '힌트' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '정답 보기' })).toBeDisabled()
  })

  it('오답이면 반박 문장, 힌트가 있으면 칸 안내', () => {
    renderCard(fakeQuiz({ status: 'feedback', feedback: { kind: 'wrong', refutation: 'Bxg4가 나오면 퀸을 잃어요.' }, hintSquare: 'e2' }))
    expect(screen.getByText('Bxg4가 나오면 퀸을 잃어요.')).toBeInTheDocument()
    expect(screen.getByText('e2의 기물을 움직여 보세요.')).toBeInTheDocument()
  })

  it('끝나면 점수와 [이어서 보기]', () => {
    const { onContinue } = renderCard(fakeQuiz({ status: 'done', busy: true, solved: 2, feedback: { kind: 'correct' } }))
    expect(screen.getByText('정답이에요! 3수 중 2수를 한 번에 맞혔어요.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '힌트' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '이어서 보기' }))
    expect(onContinue).toHaveBeenCalled()
  })
})
