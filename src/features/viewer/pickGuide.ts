import type { GuideShape } from '../../engine/comment/guide'
import { parseGuide } from '../../sources/guideNotation'

/**
 * 직접 지정한 가이드가 있으면 그것만 쓰고, 없으면 자동 계산한다.
 * 퀴즈 장면 시작 포지션에서는 놓친 수·반박 수가 곧 정답일 수 있어 자동 가이드는 노림 화살표만 남긴다.
 * 어느 쪽이든 hidden(가까운 퀴즈 장면의 첫 정답, 4글자 UCI)과 같은 화살표는 뺀다. 칸 표시(from 없음)는 그대로 둔다.
 * (직접 지정한 가이드의 스포일러는 해설 검증기도 막는다)
 */
export function pickGuide({ authored, auto, sceneStart, hidden }: { authored: string[] | undefined; auto: () => GuideShape[]; sceneStart: boolean; hidden: string[] }): GuideShape[] {
  let list: GuideShape[]
  if (authored) list = parseGuide(authored)
  else {
    const a = auto()
    list = sceneStart ? a.filter((g) => g.kind === 'attack') : a
  }
  return list.filter((g) => !(g.from && hidden.includes(g.from + g.to)))
}

/** ply, ply+1, ply+2에서 시작하는 퀴즈 장면의 첫 정답(4글자 UCI) */
export function hiddenAnswers(scenes: { startPly: number; steps: { answerUci: string }[] }[], ply: number): string[] {
  return scenes
    .filter((s) => s.startPly >= ply && s.startPly <= ply + 2 && s.steps[0])
    .map((s) => s.steps[0].answerUci.slice(0, 4))
}
