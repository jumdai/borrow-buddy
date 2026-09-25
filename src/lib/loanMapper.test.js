import { describe, expect, it } from 'vitest'
import { LOAN_COLUMNS, fromRow, toInsertRow, toUpdateRow } from './loanMapper.js'

const row = {
  id: 'a1',
  owner_id: 'u1',
  friend_name: 'ต้น',
  item_name: 'ร่มสีฟ้า',
  borrowed_date: '2026-09-01',
  due_date: '2026-09-24',
  returned_date: '2026-09-20',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-20T00:00:00Z',
}

const loan = {
  id: 'a1',
  friendName: 'ต้น',
  itemName: 'ร่มสีฟ้า',
  borrowedDate: '2026-09-01',
  dueDate: '2026-09-24',
  returnedDate: '2026-09-20',
}

describe('fromRow', () => {
  it('แปลงแถวเป็น Loan ครบทุกฟิลด์ และไม่มี owner_id', () => {
    expect(fromRow(row)).toEqual(loan)
  })

  it('returned_date เป็น null = returnedDate เป็น null', () => {
    expect(fromRow({ ...row, returned_date: null }).returnedDate).toBeNull()
  })
})

describe('toInsertRow', () => {
  it('แปลง Loan เป็นแถว โดยไม่ส่ง id และ owner_id', () => {
    expect(toInsertRow({ ...loan, ownerId: 'x' })).toEqual({
      friend_name: 'ต้น',
      item_name: 'ร่มสีฟ้า',
      borrowed_date: '2026-09-01',
      due_date: '2026-09-24',
      returned_date: '2026-09-20',
    })
  })

  it('returnedDate ไม่มีค่า = ส่ง null', () => {
    const { returnedDate: _, ...noReturn } = loan
    expect(toInsertRow(noReturn).returned_date).toBeNull()
  })
})

describe('toUpdateRow', () => {
  it('ไม่ส่ง id และ owner_id (ระบุ id ด้วยเงื่อนไขแยก)', () => {
    const result = toUpdateRow(loan)
    expect(result).not.toHaveProperty('id')
    expect(result).not.toHaveProperty('owner_id')
    expect(result.returned_date).toBe('2026-09-20')
  })
})

describe('แปลงไป-กลับ', () => {
  it('Loan → แถว → Loan ได้ค่าเดิม', () => {
    expect(fromRow({ id: loan.id, ...toInsertRow(loan) })).toEqual(loan)
  })

  it('LOAN_COLUMNS เลือกเฉพาะคอลัมน์ที่ใช้', () => {
    expect(LOAN_COLUMNS).toBe('id, friend_name, item_name, borrowed_date, due_date, returned_date')
  })
})
