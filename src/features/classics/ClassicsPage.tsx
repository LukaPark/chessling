import { Link } from 'react-router'
import { refToPath } from '../../chess/gameRef'
import { classics } from '../../sources/classics'
import * as l from '../../styles/features/lists.css'
import * as p from '../../styles/features/page.css'
import { Reveal } from '../../ui/Reveal'

export function ClassicsPage() {
  return (
    <div className={p.page}>
      <header className={p.pageHead}>
        <h1 className={p.pageTitle}>명경기 모음</h1>
        <p className={p.lead}>시대마다 체스의 흐름을 바꾼 대국 {classics.length}판을 모았어요.</p>
      </header>
      <ul className={l.classicGrid} aria-label="명경기 목록">
        {classics.map((c, i) => (
          <li key={c.slug}>
            <Reveal index={i % 2} className={l.classicItem}>
              <span className={l.classicYear}>{c.year}</span>
              <h2 className={l.classicTitle}>
                <Link to={refToPath({ kind: 'classic', slug: c.slug })} className={l.classicLink}>
                  {c.title}
                </Link>
              </h2>
              <p className={p.meta}>
                {c.white} vs {c.black}
                {c.event ? ` · ${c.event}` : ''}
              </p>
              <p className={l.clamp}>{c.summaryKo}</p>
            </Reveal>
          </li>
        ))}
      </ul>
    </div>
  )
}
