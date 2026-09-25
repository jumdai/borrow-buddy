import ThemeToggle from './ThemeToggle.jsx'

// ส่วนหัว: ชื่อแอป, อีเมลเจ้าของ + ออกจากระบบ (เมื่อเข้าสู่ระบบแล้ว), ปุ่มสลับธีม
export default function AppHeader({ email, onSignOut, signingOut, theme, onToggleTheme }) {
  return (
    <header className="app-header">
      <h1>Borrow Buddy</h1>
      <div className="header-actions">
        {email && (
          <>
            <span className="owner-email">{email}</span>
            <button type="button" onClick={onSignOut} disabled={signingOut}>
              {signingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
            </button>
          </>
        )}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  )
}
