// แปลงระหว่างแถวในตาราง loans (snake_case) กับ Loan ในแอป (camelCase)
// owner_id ไม่อยู่ใน Loan และไม่ส่งจากฝั่งเว็บ ให้ฐานข้อมูลใส่จาก auth.uid()

export const LOAN_COLUMNS = 'id, friend_name, item_name, borrowed_date, due_date, returned_date'

export function fromRow(row) {
  return {
    id: row.id,
    friendName: row.friend_name,
    itemName: row.item_name,
    borrowedDate: row.borrowed_date,
    dueDate: row.due_date,
    returnedDate: row.returned_date ?? null,
  }
}

// ใช้ตอนสร้าง: ไม่ส่ง id ให้ฐานข้อมูลสร้างเอง
export function toInsertRow(loan) {
  return {
    friend_name: loan.friendName,
    item_name: loan.itemName,
    borrowed_date: loan.borrowedDate,
    due_date: loan.dueDate,
    returned_date: loan.returnedDate ?? null,
  }
}

// ใช้ตอนแก้ไข: ฟิลด์เดียวกับตอนสร้าง ส่วน id ใช้เป็นเงื่อนไขแยก
export const toUpdateRow = toInsertRow
