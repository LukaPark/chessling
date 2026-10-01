import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChartLine } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { refToPath } from '../../chess/gameRef'
import { queryKeys } from '../../sources'
import { listTopBroadcasts } from '../../sources/broadcast'
import { classics, todaysClassic, type Classic } from '../../sources/classics'
import * as h from '../../styles/features/home.css'
import { Button, LinkButton } from '../../ui/Button'
import { TextField } from '../../ui/Field'
import { Section } from '../../ui/Section'
import { Segmented } from '../../ui/Segmented'
import { AutoplayBoard } from './AutoplayBoard'
import { HeroTitle } from './HeroTitle'

type Platform = 'chesscom' | 'lichess'

export function HomePage() {
  const navigate = useNavigate()
  const [platform, setPlatform] = useState<Platform>('chesscom')
  const [username, setUsername] = useState('')
  const today = todaysClassic()

  return (
    <div className={h.home}>
      <section className={h.hero} aria-labelledby="hero-title">
        <HeroTitle id="hero-title" lead="역사적인 대국에 " ink="직접 참여하세요." />
        <p className={h.lead}>Chess.com·Lichess에서 둔 내 대국도 브라우저 속 Stockfish로 분석하고, 원하는 수에서 엔진과 이어 둘 수 있어요.</p>
        <form
          className={h.form}
          onSubmit={(e) => {
            e.preventDefault()
            const u = username.trim()
            if (u) navigate(`/player/${platform}/${encodeURIComponent(u)}`)
          }}
        >
          <Segmented
            className={h.platform}
            legend="플랫폼"
            name="platform"
            value={platform}
            onChange={setPlatform}
            options={[
              { value: 'chesscom', label: 'Chess.com' },
              { value: 'lichess', label: 'Lichess' },
            ]}
          />
          <TextField
            label="아이디"
            hideLabel
            placeholder="아이디"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button type="submit">불러오기</Button>
        </form>
        <LinkButton tone="secondary" to={refToPath({ kind: 'classic', slug: today.slug })}>
          오늘의 명경기 보기
        </LinkButton>
        <AutoplayBoard classic={today} />
      </section>

      <TodayStory classic={today} />
      <LiveEvents />
      <ClassicsTeaser exclude={today.slug} />
    </div>
  )
}

function TodayStory({ classic }: { classic: Classic }) {
  const to = refToPath({ kind: 'classic', slug: classic.slug })
  return (
    <Section title="오늘의 명경기" description={`${classic.white} vs ${classic.black} · ${classic.event ? `${classic.event}, ` : ''}${classic.year}`}>
      <div className={h.story}>
        <div>
          <h3 className={h.storyTitle}>
            <Link to={to} className={h.storyLink}>
              {classic.title}
            </Link>
          </h3>
          <p>{classic.summaryKo}</p>
        </div>
        <div className={h.actions}>
          <LinkButton to={to} icon={ChartLine}>
            분석하기
          </LinkButton>
        </div>
      </div>
    </Section>
  )
}

function LiveEvents() {
  const top = useQuery({ queryKey: queryKeys.broadcastTop(), queryFn: ({ signal }) => listTopBroadcasts(signal), retry: false })
  const tours = top.data?.active.slice(0, 3) ?? []
  if (tours.length === 0) return null
  return (
    <Section
      title="진행 중인 대회"
      action={
        <LinkButton tone="ghost" size="sm" icon={ArrowRight} to="/events">
          전체 대회
        </LinkButton>
      }
    >
      <ul className={h.cards}>
        {tours.map((t) => (
          <li key={t.id}>
            <Link to={`/events/${t.id}`} className={h.cardLink}>
              <span className={h.cardTitle}>{t.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function ClassicsTeaser({ exclude }: { exclude: string }) {
  const pool = classics.filter((c) => c.slug !== exclude)
  const picks = [...new Set([0, 1 / 3, 2 / 3, 1].map((f) => Math.round(f * (pool.length - 1))))].map((i) => pool[i])
  return (
    <Section
      title="명경기 모음"
      description="시대마다 체스의 흐름을 바꾼 대국들이에요."
      action={
        <LinkButton tone="ghost" size="sm" icon={ArrowRight} to="/classics">
          컬렉션 전체
        </LinkButton>
      }
    >
      <ul className={h.cards}>
        {picks.map((c) => (
          <li key={c.slug}>
            <Link to={refToPath({ kind: 'classic', slug: c.slug })} className={h.cardLink}>
              <span className={h.cardTitle}>{c.title}</span>
              <span className={h.cardMeta}>
                {c.white} vs {c.black} · {c.year}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}
