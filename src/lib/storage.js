// เวอร์ชัน 2 เก็บ Loan ใน Supabase ไฟล์นี้ใช้อ่าน Loan เวอร์ชัน 1 และธงนำเข้าข้อมูลเดิม
// ข้อมูลเวอร์ชัน 1 ไม่ถูกลบ (เก็บไว้เป็นสำรอง)
export const STORAGE_KEY = 'borrow-buddy:loans'

export const LOAD_WARNING = 'อ่านข้อมูลเดิมไม่ได้ จึงเริ่มด้วยรายการว่าง ข้อมูลเดิมยังไม่ถูกลบจนกว่าจะบันทึกรายการใหม่'
export const SAVE_WARNING = 'บันทึกข้อมูลไม่สำเร็จ ข้อมูลล่าสุดอาจไม่ถูกเก็บไว้'

// storage รับเป็นพารามิเตอร์ เพื่อให้ทดสอบด้วย storage จำลองได้
// อ่านอย่างเดียว ไม่เขียนอะไรกลับ เพื่อไม่ทับข้อมูลเดิมที่อ่านไม่ได้
export function loadLoans(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return { loans: [], warning: null }
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return { loans: [], warning: LOAD_WARNING }
    return { loans: data, warning: null }
  } catch {
    return { loans: [], warning: LOAD_WARNING }
  }
}

// ของเวอร์ชัน 1 (แอปเวอร์ชัน 2 ไม่เรียกแล้ว) คงไว้ให้เทสต์เดิมผ่านโดยไม่ต้องแก้
// คืน null เมื่อสำเร็จ หรือข้อความเตือนภาษาไทยเมื่อบันทึกไม่ได้
export function saveLoans(loans, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(loans))
    return null
  } catch {
    return SAVE_WARNING
  }
}

// ธงนำเข้าข้อมูลเดิม แยกตามเจ้าของ เพื่อไม่ให้นำเข้าซ้ำ
export const importFlagKey = (ownerId) => `borrow-buddy:legacy-imported:${ownerId}`

export function isImportDone(ownerId, storage = globalThis.localStorage) {
  try {
    return storage.getItem(importFlagKey(ownerId)) !== null
  } catch {
    return false
  }
}

// คืน true เมื่อตั้งธงสำเร็จ
export function markImportDone(ownerId, storage = globalThis.localStorage) {
  try {
    storage.setItem(importFlagKey(ownerId), new Date().toISOString())
    return true
  } catch {
    return false
  }
}
