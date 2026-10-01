// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { SelectField, TextField } from './Field'

afterEach(cleanup)

it('라벨과 입력이 연결된다', () => {
  render(
    <>
      <TextField label="아이디" hideLabel placeholder="아이디" />
      <SelectField label="라운드">
        <option value="r1">1라운드</option>
      </SelectField>
    </>,
  )
  expect(screen.getByLabelText('아이디')).toHaveAttribute('placeholder', '아이디')
  expect(screen.getByLabelText('라운드')).toHaveValue('r1')
})

it('호출자가 준 id로도 라벨이 연결된다', () => {
  render(
    <>
      <TextField label="이름" id="custom" />
      <SelectField label="선택" id="sel">
        <option value="a">a</option>
      </SelectField>
    </>,
  )
  expect(screen.getByLabelText('이름')).toHaveAttribute('id', 'custom')
  expect(screen.getByLabelText('선택')).toHaveAttribute('id', 'sel')
})
