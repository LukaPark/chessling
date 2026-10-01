import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Play, Trash2 } from 'lucide-react'
import { useStore } from '../../app/StoreContext'
import { downloadText } from '../../app/download'
import { forkToPgn } from '../../chess/fork'
import * as l from '../../styles/features/lists.css'
import * as p from '../../styles/features/page.css'
import * as s from '../../styles/features/play.css'
import { IconButton, IconLink } from '../../ui/Button'

export function ForksPage() {
  const store = useStore()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['forks'], queryFn: () => store.forks.list() })

  const remove = async (id: string) => {
    if (!window.confirm('이 분기를 삭제할까요?')) return
    await store.forks.delete(id)
    qc.removeQueries({ queryKey: ['fork', id] })
    await qc.invalidateQueries({ queryKey: ['forks'] })
  }

  if (q.isPending) return <p className={p.meta}>불러오는 중…</p>
  const forks = q.data ?? []
  return (
    <div className={p.page}>
      <header className={p.pageHead}>
        <h1 className={p.pageTitle}>내 분기</h1>
      </header>
      {forks.length === 0 ? (
        <p className={p.lead}>아직 분기한 대국이 없어요. 대국 뷰어에서 "여기서 분기"를 눌러 보세요.</p>
      ) : (
        <ul className={l.rows}>
          {forks.map((f) => (
            <li key={f.id} className={l.row}>
              <span className={l.rowMeta}>
                {f.moves.length}수 진행 · {f.result === '*' ? '진행 중' : f.result} · Elo {f.engineElo} · {new Date(f.updatedAt).toLocaleString('ko-KR')}
              </span>
              <h2 className={l.rowMain}>{f.title}</h2>
              <div className={s.forkActions}>
                <IconLink icon={Play} label="이어 두기" to={`/play/${f.id}`} />
                <IconButton icon={Download} label="PGN" onClick={() => downloadText(`chessling-${f.id.slice(0, 8)}.pgn`, forkToPgn(f))} />
                <IconButton icon={Trash2} label="삭제" onClick={() => void remove(f.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
