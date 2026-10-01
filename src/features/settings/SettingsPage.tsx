import type { ReactNode } from 'react'
import { BOARD_THEMES, PIECE_SETS, useBoardPrefs } from '../../app/boardPrefs'
import { useThemePreference, type ThemePreference } from '../../app/theme'
import { Board } from '../../components/Board'
import { BOARD_LABELS, PIECE_LABELS, pieceUrl } from '../../styles/boardThemes'
import * as p from '../../styles/features/page.css'
import * as s from '../../styles/features/settings.css'
import { visuallyHidden } from '../../ui/a11y.css'
import { cx } from '../../ui/cx'
import { Segmented } from '../../ui/Segmented'

/** 모든 기물 종류가 양쪽 색으로 다 보이는 중반 포지션 */
const PREVIEW_FEN = 'r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R2QKB1R w KQ - 0 8'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
]

/** 이름은 안쪽 fieldset의 legend가 준다. section에 이름을 또 붙이면 "보드 영역, 보드 그룹"처럼 두 번 읽힌다. */
function SettingSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

export function SettingsPage() {
  const { board, pieces, setBoard, setPieces } = useBoardPrefs()
  const { preference, setPreference } = useThemePreference()
  return (
    <div className={s.page}>
      <header className={s.head}>
        <h1 className={p.pageTitle}>설정</h1>
        <p className={p.lead}>고른 보드와 기물은 이 기기의 모든 보드에 바로 적용돼요.</p>
      </header>
      <figure className={s.preview} aria-label="보드 미리보기">
        <Board fen={PREVIEW_FEN} orientation="white" />
      </figure>
      <div className={s.sections}>
        <SettingSection title="보드">
          <fieldset className={s.group}>
            <legend className={visuallyHidden}>보드</legend>
            <div className={s.grid}>
              {BOARD_THEMES.map((t) => (
                <label key={t} className={s.option}>
                  <input type="radio" className={s.input} name="board" value={t} checked={board === t} onChange={() => setBoard(t)} />
                  <span className={cx(s.swatch, s.swatchColors[t])} aria-hidden="true" />
                  {BOARD_LABELS[t]}
                </label>
              ))}
            </div>
          </fieldset>
        </SettingSection>
        <SettingSection title="기물">
          <fieldset className={s.group}>
            <legend className={visuallyHidden}>기물</legend>
            <div className={s.pieceGrid}>
              {PIECE_SETS.map((set) => (
                <label key={set} className={s.option}>
                  <input
                    type="radio"
                    className={s.input}
                    name="pieces"
                    value={set}
                    checked={pieces === set}
                    onChange={() => setPieces(set)}
                  />
                  <span className={s.thumbs} aria-hidden="true">
                    <img className={s.thumbLight} src={pieceUrl(set, 'wN')} alt="" width={40} height={40} loading="lazy" />
                    <img className={s.thumbDark} src={pieceUrl(set, 'bK')} alt="" width={40} height={40} loading="lazy" />
                  </span>
                  {PIECE_LABELS[set]}
                </label>
              ))}
            </div>
          </fieldset>
        </SettingSection>
        <SettingSection title="화면">
          <Segmented legend="화면" name="theme" value={preference} options={THEME_OPTIONS} onChange={setPreference} />
        </SettingSection>
      </div>
    </div>
  )
}
