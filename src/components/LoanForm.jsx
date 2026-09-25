import { useState } from 'react'
import { validateLoan } from '../lib/loanRules.js'

// ฟอร์มเดียวใช้ทั้งเพิ่มและแก้ไข
// editingLoan = null คือเพิ่มใหม่ ผู้เรียกควรใส่ key ให้ฟอร์มรีเซ็ตเมื่อเปลี่ยนรายการที่แก้
// onSave คืน Promise ของข้อความผิดพลาด หรือ null เมื่อบันทึกสำเร็จ
export default function LoanForm({ today, editingLoan, onSave, onCancelEdit }) {
  const [friendName, setFriendName] = useState(editingLoan?.friendName ?? '')
  const [itemName, setItemName] = useState(editingLoan?.itemName ?? '')
  const [borrowedDate, setBorrowedDate] = useState(editingLoan?.borrowedDate ?? today)
  const [dueDate, setDueDate] = useState(editingLoan?.dueDate ?? '')
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    const draft = {
      ...(editingLoan ?? { returnedDate: null }),
      friendName: friendName.trim(),
      itemName: itemName.trim(),
      borrowedDate,
      dueDate,
    }
    const found = validateLoan(draft)
    setErrors(found)
    if (found.length > 0) return

    setSaving(true)
    const saveError = await onSave(draft)
    setSaving(false)
    // บันทึกไม่สำเร็จ: คงค่าที่กรอกไว้ให้กดบันทึกใหม่ได้
    if (saveError) {
      setErrors([saveError])
      return
    }
    if (!editingLoan) {
      setFriendName('')
      setItemName('')
      setBorrowedDate(today)
      setDueDate('')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2>{editingLoan ? 'แก้ไขการยืม' : 'เพิ่มการยืม'}</h2>

      <label>
        เพื่อน
        <input
          type="text"
          value={friendName}
          onChange={(e) => setFriendName(e.target.value)}
        />
      </label>

      <label>
        ของ
        <input
          type="text"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
        />
      </label>

      <label>
        วันที่ยืม
        <input
          type="date"
          value={borrowedDate}
          onChange={(e) => setBorrowedDate(e.target.value)}
        />
      </label>

      <label>
        กำหนดคืน
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </label>

      {errors.length > 0 && (
        <ul role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'กำลังบันทึก...' : editingLoan ? 'บันทึกการแก้ไข' : 'เพิ่ม'}
        </button>
        {editingLoan && (
          <button type="button" onClick={onCancelEdit} disabled={saving}>
            ยกเลิกการแก้ไข
          </button>
        )}
      </div>
    </form>
  )
}
