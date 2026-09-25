import { validateLoan } from './loanRules.js'
import { isImportDone, loadLoans } from './storage.js'

export const INVALID_DATE_FORMAT = 'รูปแบบวันที่ไม่ถูกต้อง'
export const INVALID_RECORD = 'ข้อมูลไม่ใช่รายการยืม'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const isIsoDate = (value) => typeof value === 'string' && ISO_DATE.test(value)

// แปลง Loan เวอร์ชัน 1 เป็นข้อมูลที่พร้อมส่งขึ้น Supabase (ไม่มี id เดิม)
function toImportDraft(loan) {
  return {
    friendName: typeof loan.friendName === 'string' ? loan.friendName.trim() : '',
    itemName: typeof loan.itemName === 'string' ? loan.itemName.trim() : '',
    borrowedDate: loan.borrowedDate,
    dueDate: loan.dueDate,
    returnedDate: loan.returnedDate ?? null,
  }
}

function checkDraft(draft) {
  const errors = validateLoan(draft)
  const dates = [draft.borrowedDate, draft.dueDate, draft.returnedDate].filter(Boolean)
  if (!dates.every(isIsoDate)) errors.push(INVALID_DATE_FORMAT)
  return errors
}

// เตรียมนำเข้าข้อมูลเดิม: อ่านอย่างเดียว ไม่เขียนหรือลบอะไรใน storage
// ready = false เมื่อไม่มีข้อมูล, JSON เสีย, หรือเจ้าของคนนี้นำเข้า/ปฏิเสธไปแล้ว
export function prepareLegacyImport(storage, ownerId) {
  const none = { ready: false, loans: [], skipped: [] }
  if (isImportDone(ownerId, storage)) return none

  const { loans, warning } = loadLoans(storage)
  if (warning || loans.length === 0) return none

  const valid = []
  const skipped = []
  for (const loan of loans) {
    if (!loan || typeof loan !== 'object') {
      skipped.push({ loan, errors: [INVALID_RECORD] })
      continue
    }
    const draft = toImportDraft(loan)
    const errors = checkDraft(draft)
    if (errors.length > 0) skipped.push({ loan, errors })
    else valid.push(draft)
  }
  return { ready: true, loans: valid, skipped }
}
