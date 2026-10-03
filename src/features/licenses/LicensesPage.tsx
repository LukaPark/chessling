import * as p from '../../styles/features/page.css'
import { sourceUrl } from '../../app/sourceUrl'


type Credit = { name: string; author?: string; license: string; url: string; copying?: boolean; licenseFile?: string }

const DEPENDENCIES: Credit[] = [
  { name: 'Stockfish.js (Stockfish 19)', license: 'GPL-3.0', url: 'https://github.com/nmrugg/stockfish.js', copying: true },
  { name: 'chessground', license: 'GPL-3.0-or-later', url: 'https://github.com/lichess-org/chessground' },
  { name: 'chess.js', license: 'BSD-2-Clause', url: 'https://github.com/jhlywa/chess.js' },
  { name: 'React', license: 'MIT', url: 'https://react.dev' },
  { name: 'React Router', license: 'MIT', url: 'https://reactrouter.com' },
  { name: 'TanStack Query', license: 'MIT', url: 'https://tanstack.com/query' },
  { name: 'Dexie.js', license: 'Apache-2.0', url: 'https://dexie.org' },
  { name: 'Pretendard', license: 'OFL-1.1', url: 'https://github.com/orioncactus/pretendard', licenseFile: '/licenses/Pretendard-OFL.txt' },
  { name: 'Lucide', license: 'ISC', url: 'https://lucide.dev' },
  { name: 'Motion', license: 'MIT', url: 'https://motion.dev' },
  { name: 'Vanilla Extract', license: 'MIT', url: 'https://vanilla-extract.style' },
]

// 기물 이미지는 lichess-org/lila 저장소의 public/piece/<세트>/에서 가져왔다. 저작자·라이선스는 lila COPYING.md 기준.
const PIECE_SETS: Credit[] = [
  { name: 'cburnett 기물', author: 'Colin M.L. Burnett', license: 'GPL-2.0-or-later', url: 'https://en.wikipedia.org/wiki/User:Cburnett' },
  { name: 'Merida 기물', author: 'Armando Hernandez Marroquin', license: 'GPL-2.0-or-later', url: 'https://github.com/lichess-org/lila/blob/master/COPYING.md' },
  {
    name: 'Chessnut 기물',
    author: 'Alexis Luengas',
    license: 'Apache-2.0',
    url: 'https://github.com/LexLuengas/chessnut-pieces',
    licenseFile: '/licenses/chessnut-Apache-2.0.txt',
  },
  { name: 'Fantasy 기물', author: 'Maurizio Monge', license: 'MIT', url: 'https://github.com/maurimo/chess-art', licenseFile: '/licenses/fantasy-MIT.txt' },
]

function CreditList({ items }: { items: Credit[] }) {
  return (
    <ul className={p.list}>
      {items.map((d) => (
        <li key={d.name}>
          <a href={d.url}>{d.name}</a>
          {d.author && <> ({d.author})</>} — {d.license}
          {d.copying && (
            <>
              {' '}· <a href="/engine/COPYING.txt">라이선스 전문</a>
            </>
          )}
          {d.licenseFile && (
            <>
              {' '}· <a href={d.licenseFile}>라이선스 전문</a>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

export function LicensesPage() {
  return (
    <div className={p.reading}>
      <h1 className={p.pageTitle}>라이선스</h1>
      <p>
        Chessling은 <a href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0-or-later</a> 라이선스로 배포되는 자유
        소프트웨어입니다.
      </p>
      <p>
        소스 코드: <a href={sourceUrl()}>{sourceUrl()}</a>
      </p>
      <h2>사용한 오픈소스</h2>
      <CreditList items={DEPENDENCIES} />
      <h2>기물 이미지</h2>
      <p>
        기물 이미지는 <a href="https://github.com/lichess-org/lila">Lichess(lila)</a> 저장소에서 가져왔어요. GPL 계열 세트는
        Chessling의 GPL-3.0-or-later 조건으로 함께 배포해요.
      </p>
      <CreditList items={PIECE_SETS} />
      <p>대국 데이터는 Chess.com 공개 API와 Lichess API에서 가져옵니다. 명경기 소개 글은 Chessling이 직접 작성했습니다.</p>
      <p>
        오프닝 이름과 수순은 <a href="https://github.com/lichess-org/chess-openings">lichess-org/chess-openings</a>(CC0)를 썼고,
        한국어 오프닝 설명은 Chessling이 직접 작성했습니다.
      </p>
    </div>
  )
}
