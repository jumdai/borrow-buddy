import { describe, expect, it } from 'vitest'
import { INVALID_DATE_FORMAT, prepareLegacyImport } from './legacyImport.js'
import { STORAGE_KEY, importFlagKey, isImportDone, markImportDone } from './storage.js'

const memoryStorage = (initial = {}) => {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value)
    },
  }
}

const loan = {
  id: 'old-1',
  friendName: 'ต้น',
  itemName: 'ร่มสีฟ้า',
  borrowedDate: '2026-09-01',
  dueDate: '2026-09-24',
  returnedDate: null,
}

const withLoans = (loans, extra = {}) =>
  memoryStorage({ [STORAGE_KEY]: JSON.stringify(loans), ...extra })

describe('prepareLegacyImport', () => {
  it('ข้อมูลปกติ = พร้อมนำเข้า และตัด id เดิมออก', () => {
    const result = prepareLegacyImport(withLoans([loan]), 'u1')
    const { id: _, ...withoutId } = loan
    expect(result).toEqual({ ready: true, loans: [withoutId], skipped: [] })
  })

  it('ไม่มีข้อมูลเวอร์ชัน 1 = ไม่แสดงแถบ', () => {
    expect(prepareLegacyImport(memoryStorage(), 'u1').ready).toBe(false)
  })

  it('อาร์เรย์ว่าง = ไม่แสดงแถบ', () => {
    expect(prepareLegacyImport(withLoans([]), 'u1').ready).toBe(false)
  })

  it('JSON เสีย = ไม่แสดงแถบ และไม่แตะข้อมูลเดิม', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{เสีย' })
    expect(prepareLegacyImport(storage, 'u1').ready).toBe(false)
    expect(storage.data[STORAGE_KEY]).toBe('{เสีย')
  })

  it('Loan ผิดกติกาถูกคัดออก พร้อมเหตุผล', () => {
    const bad = { ...loan, id: 'old-2', friendName: '  ', dueDate: '2026-08-01' }
    const result = prepareLegacyImport(withLoans([loan, bad]), 'u1')
    expect(result.loans).toHaveLength(1)
    expect(result.skipped).toEqual([
      { loan: bad, errors: ['กรุณากรอกชื่อเพื่อน', 'กำหนดคืนต้องไม่ก่อนวันที่ยืม'] },
    ])
  })

  it('วันที่ผิดรูปแบบถูกคัดออก', () => {
    const bad = { ...loan, dueDate: '24/09/2026' }
    const result = prepareLegacyImport(withLoans([bad]), 'u1')
    expect(result.loans).toEqual([])
    expect(result.skipped[0].errors).toContain(INVALID_DATE_FORMAT)
  })

  it('รายการที่ไม่ใช่อ็อบเจ็กต์ถูกคัดออก ไม่ทำให้ล้ม', () => {
    const result = prepareLegacyImport(withLoans([null, 'x', loan]), 'u1')
    expect(result.loans).toHaveLength(1)
    expect(result.skipped).toHaveLength(2)
  })

  it('ตัดช่องว่างชื่อ และ returnedDate ที่ไม่มีเป็น null', () => {
    const { returnedDate: _, ...noReturn } = { ...loan, friendName: ' ต้น ' }
    const [prepared] = prepareLegacyImport(withLoans([noReturn]), 'u1').loans
    expect(prepared.friendName).toBe('ต้น')
    expect(prepared.returnedDate).toBeNull()
  })

  it('นำเข้าแล้วสำหรับเจ้าของคนนี้ = ไม่แสดงแถบ', () => {
    const storage = withLoans([loan])
    markImportDone('u1', storage)
    expect(prepareLegacyImport(storage, 'u1').ready).toBe(false)
  })

  it('ธงนำเข้าแยกตามเจ้าของ', () => {
    const storage = withLoans([loan])
    markImportDone('u1', storage)
    expect(prepareLegacyImport(storage, 'u2').ready).toBe(true)
  })
})

describe('ธงนำเข้า', () => {
  it('ตั้งธงแล้วอ่านกลับได้ และไม่ลบข้อมูลเวอร์ชัน 1', () => {
    const storage = withLoans([loan])
    expect(isImportDone('u1', storage)).toBe(false)
    markImportDone('u1', storage)
    expect(isImportDone('u1', storage)).toBe(true)
    expect(storage.data[importFlagKey('u1')]).toBeDefined()
    expect(JSON.parse(storage.data[STORAGE_KEY])).toEqual([loan])
  })

  it('storage ใช้ไม่ได้ = ไม่โยนข้อผิดพลาด', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(isImportDone('u1', broken)).toBe(false)
    expect(markImportDone('u1', broken)).toBe(false)
  })
})
