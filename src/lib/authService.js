// ห่อ Supabase Auth ไว้ชั้นเดียว คอมโพเนนต์ไม่เรียก supabase.auth ตรงๆ
// client รับเป็นพารามิเตอร์ เพื่อให้ทดสอบด้วย client จำลองได้

export const AUTH_ERROR = {
  MISSING_FIELDS: 'กรุณากรอกอีเมลและรหัสผ่าน',
  INVALID_CREDENTIALS: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  NETWORK: 'เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
  SIGN_OUT: 'ออกจากระบบไม่สำเร็จ กรุณาลองใหม่',
}

// status 0 หรือไม่มี status คือเรียกเซิร์ฟเวอร์ไม่ถึง นอกนั้นถือว่าเข้าสู่ระบบไม่ผ่าน
// (ไม่แยกว่าอีเมลหรือรหัสผ่านผิด)
const toSignInError = (error) =>
  error?.status ? AUTH_ERROR.INVALID_CREDENTIALS : AUTH_ERROR.NETWORK

export function createAuthService(client) {
  return {
    async signIn(email, password) {
      const trimmedEmail = email.trim()
      if (!trimmedEmail || !password) return { session: null, error: AUTH_ERROR.MISSING_FIELDS }
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })
        if (error) return { session: null, error: toSignInError(error) }
        return { session: data.session, error: null }
      } catch {
        return { session: null, error: AUTH_ERROR.NETWORK }
      }
    },

    async signOut() {
      try {
        const { error } = await client.auth.signOut()
        return { error: error ? AUTH_ERROR.SIGN_OUT : null }
      } catch {
        return { error: AUTH_ERROR.SIGN_OUT }
      }
    },

    async getSession() {
      try {
        const { data, error } = await client.auth.getSession()
        return error ? null : (data.session ?? null)
      } catch {
        return null
      }
    },

    // callback ได้ session ล่าสุด (null เมื่อออกจากระบบหรือ session หมดอายุ)
    onAuthChange(callback) {
      const { data } = client.auth.onAuthStateChange((_event, session) => callback(session))
      return () => data.subscription.unsubscribe()
    },
  }
}
