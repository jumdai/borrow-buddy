import { useState } from 'react'

const describeLoan = (loan) =>
  loan && typeof loan === 'object'
    ? `${loan.itemName || '(ไม่มีชื่อของ)'} - ${loan.friendName || '(ไม่มีชื่อเพื่อน)'}`
    : '(ข้อมูลเสีย)'

// แถบนำเข้าข้อมูลเดิมจาก localStorage ของเวอร์ชัน 1
// onImport คืน Promise ของข้อความผิดพลาด หรือ null เมื่อสำเร็จ
export default function ImportBanner({ loans, skipped, onImport, onDismiss }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const total = loans.length + skipped.length

  const handleImport = async () => {
    setBusy(true)
    setError(null)
    const message = await onImport()
    // สำเร็จแล้วแถบจะหายไปเอง
    if (message) {
      setError(message)
      setBusy(false)
    }
  }

  return (
    <section className="import-banner" aria-label="นำเข้าข้อมูลเดิม">
      <h2>นำเข้าข้อมูลเดิม</h2>
      <p>
        พบการยืม {total} รายการที่บันทึกไว้ในเครื่องนี้ (เวอร์ชันก่อน)
        {loans.length > 0
          ? ` นำเข้าได้ ${loans.length} รายการ`
          : ' แต่ไม่มีรายการที่นำเข้าได้'}
        {skipped.length > 0 && ` และจะข้าม ${skipped.length} รายการที่ข้อมูลไม่ถูกต้อง`}
      </p>

      {skipped.length > 0 && (
        <details>
          <summary>รายการที่จะข้าม</summary>
          <ul>
            {skipped.map(({ loan, errors }, index) => (
              <li key={index}>
                {describeLoan(loan)}: {errors.join(', ')}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p>ข้อมูลเดิมในเครื่องนี้จะไม่ถูกลบ</p>
      {error && <p role="alert">{error}</p>}

      <div className="form-actions">
        {loans.length > 0 && (
          <button type="button" onClick={handleImport} disabled={busy}>
            {busy ? 'กำลังนำเข้า...' : 'นำเข้า'}
          </button>
        )}
        <button type="button" onClick={onDismiss} disabled={busy}>
          ไม่นำเข้า
        </button>
      </div>
    </section>
  )
}
