import { describe, expect, it } from 'vitest'
import { LOAN_COLUMNS } from './loanMapper.js'
import { REPO_ERROR, createLoanRepo } from './loanRepo.js'

// client จำลอง: บันทึกทุกเมธอดที่เรียกในสาย query แล้วคืน result ที่กำหนด
const mockClient = (result) => {
  const calls = []
  const builder = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve, reject) => Promise.resolve(result).then(resolve, reject)
        }
        return (...args) => {
          calls.push([prop, ...args])
          return builder
        }
      },
    },
  )
  return {
    calls,
    from: (table) => {
      calls.push(['from', table])
      return builder
    },
  }
}

const row = {
  id: 'a1',
  friend_name: 'ต้น',
  item_name: 'ร่ม',
  borrowed_date: '2026-09-01',
  due_date: '2026-09-24',
  returned_date: null,
}
const loan = {
  id: 'a1',
  friendName: 'ต้น',
  itemName: 'ร่ม',
  borrowedDate: '2026-09-01',
  dueDate: '2026-09-24',
  returnedDate: null,
}
const { id: _id, ...draft } = loan
const ok = (data) => ({ data, error: null, status: 200 })
const failed = (error, status) => ({ data: null, error, status })
const callNames = (client) => client.calls.map(([name]) => name)

describe('list', () => {
  it('อ่านตาราง loans กรองตามเจ้าของ และแปลงเป็น Loan', async () => {
    const client = mockClient(ok([row]))
    expect(await createLoanRepo(client).list('u1')).toEqual({ data: [loan], error: null })
    expect(client.calls).toEqual([
      ['from', 'loans'],
      ['select', LOAN_COLUMNS],
      ['eq', 'owner_id', 'u1'],
    ])
  })
})

describe('create', () => {
  it('insert โดยไม่ส่ง id และ owner_id แล้วคืน Loan ที่ฐานข้อมูลสร้าง', async () => {
    const client = mockClient(ok(row))
    expect(await createLoanRepo(client).create(draft)).toEqual({ data: loan, error: null })
    const [, inserted] = client.calls.find(([name]) => name === 'insert')
    expect(inserted).not.toHaveProperty('id')
    expect(inserted).not.toHaveProperty('owner_id')
    expect(callNames(client)).toEqual(['from', 'insert', 'select', 'single'])
  })
})

describe('createMany', () => {
  it('insert หลายแถวในคำขอเดียว', async () => {
    const client = mockClient(ok([row, { ...row, id: 'a2' }]))
    const result = await createLoanRepo(client).createMany([draft, draft])
    expect(result.data).toHaveLength(2)
    const inserts = client.calls.filter(([name]) => name === 'insert')
    expect(inserts).toHaveLength(1)
    expect(inserts[0][1]).toHaveLength(2)
  })
})

describe('update', () => {
  it('update ระบุ id ไม่ใช้ upsert และไม่ส่ง id ในข้อมูล', async () => {
    const client = mockClient(ok({ ...row, returned_date: '2026-09-20' }))
    const result = await createLoanRepo(client).update({ ...loan, returnedDate: '2026-09-20' })
    expect(result.data.returnedDate).toBe('2026-09-20')
    expect(callNames(client)).toEqual(['from', 'update', 'eq', 'select', 'single'])
    expect(client.calls[1][1]).not.toHaveProperty('id')
    expect(client.calls[2]).toEqual(['eq', 'id', 'a1'])
  })

  it('ไม่พบแถว (ไม่ใช่ของตัวเองหรือไม่มีอยู่) = ข้อความไม่พบรายการ', async () => {
    const client = mockClient(failed({ code: 'PGRST116' }, 406))
    expect((await createLoanRepo(client).update(loan)).error).toEqual({
      message: REPO_ERROR.NOT_FOUND,
      sessionExpired: false,
    })
  })
})

describe('ข้อผิดพลาด', () => {
  it('ฐานข้อมูลปฏิเสธตามกติกา (check constraint) = ข้อความภาษาไทยทั่วไป', async () => {
    const client = mockClient(failed({ code: '23514', message: 'raw' }, 400))
    expect((await createLoanRepo(client).create(draft)).error.message).toBe(REPO_ERROR.INVALID)
  })

  it('session หมดอายุ (401) = sessionExpired เป็น true', async () => {
    const client = mockClient(failed({ code: 'PGRST303' }, 401))
    expect((await createLoanRepo(client).list('u1')).error).toEqual({
      message: REPO_ERROR.SESSION_EXPIRED,
      sessionExpired: true,
    })
  })

  it('เครือข่ายล่ม (error ไม่มี code หรือโยนข้อผิดพลาด) = ข้อความเชื่อมต่อไม่ได้', async () => {
    const noCode = mockClient(failed({ message: 'TypeError: Failed to fetch', code: '' }, 0))
    expect((await createLoanRepo(noCode).list('u1')).error.message).toBe(REPO_ERROR.NETWORK)

    const throwing = {
      from: () => {
        throw new TypeError('Failed to fetch')
      },
    }
    expect((await createLoanRepo(throwing).list('u1')).error.message).toBe(REPO_ERROR.NETWORK)
  })

  it('ข้อผิดพลาดอื่น = ข้อความทั่วไป ไม่แสดงข้อความดิบ', async () => {
    const client = mockClient(failed({ code: 'XX000', message: 'raw' }, 500))
    expect((await createLoanRepo(client).list('u1')).error.message).toBe(REPO_ERROR.UNKNOWN)
  })
})

it('ไม่มีฟังก์ชันลบ', () => {
  const repo = createLoanRepo(mockClient(ok(null)))
  expect(Object.keys(repo).sort()).toEqual(['create', 'createMany', 'list', 'update'])
})
