// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Plus } from 'lucide-react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button, IconButton, IconLink, LinkButton } from './Button'

afterEach(cleanup)

describe('Button', () => {
  it('기본 type은 button이고 클릭을 전달한다', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>저장</Button>)
    const b = screen.getByRole('button', { name: '저장' })
    expect(b).toHaveAttribute('type', 'button')
    fireEvent.click(b)
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('submit으로 바꿀 수 있다', () => {
    render(<Button type="submit">보내기</Button>)
    expect(screen.getByRole('button', { name: '보내기' })).toHaveAttribute('type', 'submit')
  })
  it('busy면 비활성이고 aria-busy', () => {
    render(<Button busy>시작</Button>)
    const b = screen.getByRole('button', { name: '시작' })
    expect(b).toBeDisabled()
    expect(b).toHaveAttribute('aria-busy', 'true')
  })
  it('아이콘은 접근성 트리에서 숨긴다', () => {
    const { container } = render(<Button icon={Plus}>추가</Button>)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('svg')).toHaveAttribute('stroke-width', '1.5')
  })
})

describe('LinkButton / IconButton / IconLink', () => {
  it('LinkButton은 링크 역할', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/classics">명경기</LinkButton>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: '명경기' })).toHaveAttribute('href', '/classics')
  })
  it('IconButton은 label을 접근성 이름으로 쓴다', () => {
    render(<IconButton icon={Plus} label="추가" pressed />)
    expect(screen.getByRole('button', { name: '추가' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('IconLink', () => {
    render(
      <MemoryRouter>
        <IconLink icon={Plus} label="이어 두기" to="/play/1" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: '이어 두기' })).toHaveAttribute('href', '/play/1')
  })
})
