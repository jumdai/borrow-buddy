import { useState } from 'react'

// ฟอร์มเข้าสู่ระบบของเจ้าของ ไม่มีการสมัครสมาชิก
// onSignIn(email, password) คืน Promise ของข้อความผิดพลาด หรือ null เมื่อสำเร็จ
export default function LoginForm({ onSignIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const message = await onSignIn(email, password)
    // สำเร็จแล้วหน้านี้จะหายไปเอง จึงตั้งค่าเฉพาะตอนไม่สำเร็จ
    if (message) {
      setError(message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2>เข้าสู่ระบบ</h2>

      <label>
        อีเมล
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label>
        รหัสผ่าน
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {error && <p role="alert">{error}</p>}

      <div className="form-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </div>
    </form>
  )
}
