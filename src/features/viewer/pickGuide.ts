import type { GuideShape } from '../../engine/comment/guide'
import { parseGuide } from '../../sources/guideNotation'

/**
 * 직접 지정한 가이드가 있으면 그것만 쓴다. 없으면 자동 계산.
 * 퀴즈 장면 시작 포지션에서는 놓친 수·반박 수가 곧 정답일 수 있어 노림 화살표만 남긴다.
 * (직접 지정한 가이드의 스포일러는 해설 검증기가 막는다)
 */
export function pickGuide({ authored, auto, sceneStart }: { authored: string[] | undefined; auto: () => GuideShape[]; sceneStart: boolean }): GuideShape[] {
  if (authored) return parseGuide(authored)
  const list = auto()
  return sceneStart ? list.filter((g) => g.kind === 'attack') : list
}
