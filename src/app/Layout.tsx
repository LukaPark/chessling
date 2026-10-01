import { Settings } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { Banner } from '../components/Banner'
import * as s from '../styles/features/layout.css'
import { IconLink } from '../ui/Button'
import { cx } from '../ui/cx'
import { GitHubMark } from './GitHubMark'
import { useStore } from './StoreContext'
import { ThemeToggle } from './ThemeToggle'

const navClass = ({ isActive }: { isActive: boolean }) => cx(s.navLink, isActive && s.navActive)

export function Layout() {
  const store = useStore()
  const SOURCE_URL = import.meta.env.VITE_SOURCE_URL
  return (
    <div className={s.shell}>
      <a href="#main" className={s.skip}>
        본문 바로가기
      </a>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link to="/" className={s.wordmark} aria-label="Chessling 홈">
            Chessling
            <span className={s.dot} aria-hidden="true" />
          </Link>
          <nav aria-label="주요 메뉴" className={s.nav}>
            <NavLink to="/events" className={navClass}>
              대회
            </NavLink>
            <NavLink to="/classics" className={navClass}>
              명국
            </NavLink>
            <NavLink to="/forks" className={navClass}>
              내 분기
            </NavLink>
            {/* md 미만에서는 자리가 모자라 테마 토글을 숨긴다. 테마는 설정에서 바꿀 수 있다. */}
            <span className={s.themeSlot}>
              <ThemeToggle />
            </span>
            <IconLink icon={Settings} label="설정" to="/settings" />
            {SOURCE_URL && (
              <a href={SOURCE_URL} className={cx(s.navLink, s.github)} aria-label="GitHub 저장소">
                <GitHubMark />
              </a>
            )}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className={s.main}>
        {!store.persistent && (
          <div className={s.bannerSlot}>
            <Banner tone="warn">이 브라우저에서는 저장소를 쓸 수 없어서 분기 대국과 리뷰가 저장되지 않아요.</Banner>
          </div>
        )}
        <Outlet />
      </main>
      <footer className={s.footer}>
        <span>Chessling · GPL-3.0-or-later</span>
        <Link to="/licenses" className={s.footerLink}>
          라이선스·소스 코드
        </Link>
      </footer>
    </div>
  )
}
