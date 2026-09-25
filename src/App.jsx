import { useEffect, useEffectEvent, useLayoutEffect, useState } from 'react'
import './App.css'
import AppHeader from './components/AppHeader.jsx'
import ImportBanner from './components/ImportBanner.jsx'
import LoanForm from './components/LoanForm.jsx'
import LoanList from './components/LoanList.jsx'
import LoginForm from './components/LoginForm.jsx'
import SearchBox from './components/SearchBox.jsx'
import { createAuthService } from './lib/authService.js'
import { toIsoDate } from './lib/dateFormat.js'
import { prepareLegacyImport } from './lib/legacyImport.js'
import { filterLoansByFriend, markReturned, unmarkReturned } from './lib/loanRules.js'
import { createLoanRepo } from './lib/loanRepo.js'
import { markImportDone } from './lib/storage.js'
import { CONFIG_ERROR, supabase } from './lib/supabaseClient.js'
import { getInitialTheme, saveTheme, toggleTheme } from './lib/theme.js'

// คอมโพเนนต์ไม่เรียก supabase ตรงๆ ใช้ผ่าน authService / loanRepo เท่านั้น
const auth = supabase && createAuthService(supabase)
const repo = supabase && createLoanRepo(supabase)

const NO_LEGACY = { ready: false, loans: [], skipped: [] }

function App() {
  const [theme, setTheme] = useState(() =>
    getInitialTheme(undefined, window.matchMedia('(prefers-color-scheme: dark)').matches),
  )
  // undefined = กำลังตรวจ session, null = ยังไม่เข้าสู่ระบบ
  const [session, setSession] = useState(undefined)
  const [signingOut, setSigningOut] = useState(false)
  const [authError, setAuthError] = useState(null)

  // ตั้งธีมให้ <html> ก่อนวาดหน้าจอ เพื่อไม่ให้จอกะพริบ
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // onAuthStateChange แจ้ง session ตั้งแต่ตอนเริ่ม และทุกครั้งที่เข้า/ออกหรือ session หมดอายุ
  useEffect(() => auth?.onAuthChange((next) => setSession(next ?? null)), [])

  const handleToggleTheme = () => {
    const next = toggleTheme(theme)
    setTheme(next)
    saveTheme(next)
  }

  const handleSignIn = async (email, password) => {
    const { error } = await auth.signIn(email, password)
    if (!error) setAuthError(null)
    return error
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    const { error } = await auth.signOut()
    setSigningOut(false)
    setAuthError(error)
  }

  // session หมดอายุระหว่างใช้งาน: ล้าง session ในเครื่องแล้วกลับไปหน้าเข้าสู่ระบบ
  const handleSessionExpired = async (message) => {
    await auth.signOut()
    setSession(null)
    setAuthError(message)
  }

  const user = session?.user ?? null

  let content
  if (!supabase) content = <p role="alert">{CONFIG_ERROR}</p>
  else if (session === undefined) content = <p>กำลังโหลด...</p>
  else if (!user) content = <LoginForm onSignIn={handleSignIn} />
  // key ตามเจ้าของ: ออกจากระบบหรือเปลี่ยนบัญชีแล้ว Loan เดิมถูกล้างทั้งหมด
  else content = <OwnerPage key={user.id} ownerId={user.id} onSessionExpired={handleSessionExpired} />

  return (
    <main>
      <AppHeader
        email={user?.email}
        onSignOut={handleSignOut}
        signingOut={signingOut}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
      {authError && <p role="alert">{authError}</p>}
      {content}
    </main>
  )
}

// หน้าหลักของเจ้าของที่เข้าสู่ระบบแล้ว
// ทุกการเปลี่ยน Loan เขียนลงฐานข้อมูลก่อน แล้วค่อยอัปเดตหน้าจอเมื่อสำเร็จ
function OwnerPage({ ownerId, onSessionExpired }) {
  const [loans, setLoans] = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [loadError, setLoadError] = useState(null)
  const [reloadCount, setReloadCount] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [query, setQuery] = useState('')
  const [legacy, setLegacy] = useState(() => prepareLegacyImport(globalThis.localStorage, ownerId))
  const [notice, setNotice] = useState(null)

  // ไม่ให้การโหลดซ้ำทุกครั้งที่ App วาดใหม่ (onSessionExpired เปลี่ยนทุกครั้ง)
  const onLoaded = useEffectEvent(({ data, error }) => {
    if (error) {
      if (error.sessionExpired) onSessionExpired(error.message)
      setLoadError(error.message)
      setLoadState('error')
      return
    }
    setLoans(data)
    setLoadState('ready')
  })

  useEffect(() => {
    let ignore = false
    repo.list(ownerId).then((result) => {
      if (!ignore) onLoaded(result)
    })
    return () => {
      ignore = true
    }
  }, [ownerId, reloadCount])

  const handleRetry = () => {
    setLoadState('loading')
    setReloadCount((n) => n + 1)
  }

  // คืนข้อความผิดพลาดให้คอมโพเนนต์ที่เรียกแสดง หรือ null เมื่อสำเร็จ
  const toMessage = (error) => {
    if (error.sessionExpired) onSessionExpired(error.message)
    return error.message
  }

  const replaceInList = (saved) =>
    setLoans((prev) => prev.map((l) => (l.id === saved.id ? saved : l)))

  const saveExisting = async (loan) => {
    const { data, error } = await repo.update(loan)
    if (error) return toMessage(error)
    replaceInList(data)
    return null
  }

  // Loan ที่ยังไม่มี id คือเพิ่มใหม่ ถ้ามี id คือแก้ไขรายการเดิม
  const handleSave = async (loan) => {
    if (loan.id) {
      const message = await saveExisting(loan)
      if (!message) setEditingId(null)
      return message
    }
    const { data, error } = await repo.create(loan)
    if (error) return toMessage(error)
    setLoans((prev) => [...prev, data])
    return null
  }

  const today = toIsoDate(new Date())

  const handleMarkReturned = (loan, returnedDate) =>
    saveExisting(markReturned(loan, today, returnedDate))

  const handleUnmarkReturned = (loan) => saveExisting(unmarkReturned(loan))

  const finishImport = () => {
    markImportDone(ownerId)
    setLegacy(NO_LEGACY)
  }

  const handleImport = async () => {
    const { data, error } = await repo.createMany(legacy.loans)
    if (error) return toMessage(error)
    setLoans((prev) => [...prev, ...data])
    const skippedText = legacy.skipped.length > 0 ? ` ข้าม ${legacy.skipped.length} รายการ` : ''
    setNotice(`นำเข้าข้อมูลเดิมแล้ว ${data.length} รายการ${skippedText}`)
    finishImport()
    return null
  }

  if (loadState === 'loading') return <p>กำลังโหลด...</p>

  if (loadState === 'error') {
    return (
      <div className="load-error">
        <p role="alert">โหลดรายการไม่สำเร็จ: {loadError}</p>
        <button type="button" onClick={handleRetry}>
          ลองใหม่
        </button>
      </div>
    )
  }

  const editingLoan = loans.find((loan) => loan.id === editingId) ?? null
  const visibleLoans = filterLoansByFriend(loans, query)

  return (
    <>
      {notice && <p role="status">{notice}</p>}
      {legacy.ready && (
        <ImportBanner
          loans={legacy.loans}
          skipped={legacy.skipped}
          onImport={handleImport}
          onDismiss={finishImport}
        />
      )}
      <LoanForm
        key={editingLoan?.id ?? 'new'}
        today={today}
        editingLoan={editingLoan}
        onSave={handleSave}
        onCancelEdit={() => setEditingId(null)}
      />
      <SearchBox value={query} onChange={setQuery} />
      <LoanList
        loans={visibleLoans}
        today={today}
        onMarkReturned={handleMarkReturned}
        onUnmarkReturned={handleUnmarkReturned}
        onEdit={(loan) => setEditingId(loan.id)}
      />
    </>
  )
}

export default App
