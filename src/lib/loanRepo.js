import { LOAN_COLUMNS, fromRow, toInsertRow, toUpdateRow } from './loanMapper.js'

// อ่าน/เขียน Loan ในตาราง loans (ไม่มีการลบ และไม่ใช้ upsert)
// ทุกฟังก์ชันคืน { data, error } โดย error = { message, sessionExpired } หรือ null
// client รับเป็นพารามิเตอร์ เพื่อให้ทดสอบด้วย client จำลองได้

export const REPO_ERROR = {
  NETWORK: 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
  SESSION_EXPIRED: 'หมดเวลาการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่',
  INVALID: 'ข้อมูลไม่ถูกต้องตามกติกา ไม่ได้บันทึก',
  NOT_FOUND: 'ไม่พบรายการนี้ อาจถูกเปลี่ยนแปลงไปแล้ว',
  UNKNOWN: 'บันทึกหรืออ่านข้อมูลไม่สำเร็จ กรุณาลองใหม่',
}

// รหัสข้อผิดพลาดของ Postgres ที่หมายถึงข้อมูลผิดกติกา (check, not null, รูปแบบวันที่)
const INVALID_CODES = new Set(['23514', '23502', '22007', '22008'])
const SESSION_CODES = new Set(['PGRST301', 'PGRST303'])

const repoError = (message, sessionExpired = false) => ({ message, sessionExpired })

function toRepoError(error, status) {
  if (status === 401 || SESSION_CODES.has(error.code)) {
    return repoError(REPO_ERROR.SESSION_EXPIRED, true)
  }
  if (INVALID_CODES.has(error.code)) return repoError(REPO_ERROR.INVALID)
  if (error.code === 'PGRST116') return repoError(REPO_ERROR.NOT_FOUND)
  // เรียกเซิร์ฟเวอร์ไม่ถึง supabase-js คืน error ที่ไม่มี code
  if (!error.code) return repoError(REPO_ERROR.NETWORK)
  return repoError(REPO_ERROR.UNKNOWN)
}

async function run(buildQuery, mapData) {
  try {
    const { data, error, status } = await buildQuery()
    if (error) return { data: null, error: toRepoError(error, status) }
    return { data: mapData(data), error: null }
  } catch {
    return { data: null, error: repoError(REPO_ERROR.NETWORK) }
  }
}

const mapRows = (rows) => rows.map(fromRow)

export function createLoanRepo(client) {
  return {
    // RLS กรองให้อยู่แล้ว ใส่ owner_id ซ้ำเพื่อให้ Postgres ใช้ดัชนีได้
    list: (ownerId) =>
      run(() => client.from('loans').select(LOAN_COLUMNS).eq('owner_id', ownerId), mapRows),

    create: (loan) =>
      run(
        () => client.from('loans').insert(toInsertRow(loan)).select(LOAN_COLUMNS).single(),
        fromRow,
      ),

    // insert หลายแถวในคำขอเดียว สำเร็จทั้งหมดหรือไม่สำเร็จทั้งหมด
    createMany: (loans) =>
      run(() => client.from('loans').insert(loans.map(toInsertRow)).select(LOAN_COLUMNS), mapRows),

    update: (loan) =>
      run(
        () =>
          client
            .from('loans')
            .update(toUpdateRow(loan))
            .eq('id', loan.id)
            .select(LOAN_COLUMNS)
            .single(),
        fromRow,
      ),
  }
}
