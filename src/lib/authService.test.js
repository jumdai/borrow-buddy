import { describe, expect, it, vi } from 'vitest'
import { AUTH_ERROR, createAuthService } from './authService.js'

const session = { user: { id: 'u1', email: 'owner@example.com' } }

const mockClient = (overrides = {}) => ({
  auth: {
    signInWithPassword: vi.fn(async () => ({ data: { session }, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    getSession: vi.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    ...overrides,
  },
})

describe('signIn', () => {
  it('ส่งอีเมล (ตัดช่องว่าง) และรหัสผ่านไปที่ signInWithPassword', async () => {
    const client = mockClient()
    const result = await createAuthService(client).signIn(' owner@example.com ', 'secret')
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'secret',
    })
    expect(result).toEqual({ session, error: null })
  })

  it('อีเมลหรือรหัสผ่านผิด = ข้อความเดียว ไม่บอกว่าผิดช่องไหน', async () => {
    const client = mockClient({
      signInWithPassword: vi.fn(async () => ({
        data: { session: null },
        error: { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' },
      })),
    })
    expect(await createAuthService(client).signIn('a@b.c', 'x')).toEqual({
      session: null,
      error: AUTH_ERROR.INVALID_CREDENTIALS,
    })
  })

  it('กรอกไม่ครบ = ไม่เรียก Supabase', async () => {
    const client = mockClient()
    const result = await createAuthService(client).signIn('', '')
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(result.error).toBe(AUTH_ERROR.MISSING_FIELDS)
  })

  it('เครือข่ายล่ม (status 0 หรือโยนข้อผิดพลาด) = ข้อความเชื่อมต่อไม่ได้', async () => {
    const offline = mockClient({
      signInWithPassword: vi.fn(async () => ({ data: { session: null }, error: { status: 0 } })),
    })
    expect((await createAuthService(offline).signIn('a@b.c', 'x')).error).toBe(AUTH_ERROR.NETWORK)

    const throwing = mockClient({
      signInWithPassword: vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    })
    expect((await createAuthService(throwing).signIn('a@b.c', 'x')).error).toBe(AUTH_ERROR.NETWORK)
  })
})

describe('signOut', () => {
  it('เรียก signOut และคืน error null เมื่อสำเร็จ', async () => {
    const client = mockClient()
    expect(await createAuthService(client).signOut()).toEqual({ error: null })
    expect(client.auth.signOut).toHaveBeenCalled()
  })

  it('ออกจากระบบไม่สำเร็จ = ข้อความภาษาไทย', async () => {
    const client = mockClient({ signOut: vi.fn(async () => ({ error: { status: 500 } })) })
    expect((await createAuthService(client).signOut()).error).toBe(AUTH_ERROR.SIGN_OUT)
  })
})

describe('getSession', () => {
  it('คืน session ปัจจุบัน', async () => {
    expect(await createAuthService(mockClient()).getSession()).toBe(session)
  })

  it('อ่านไม่ได้ = null', async () => {
    const client = mockClient({
      getSession: vi.fn(async () => ({ data: { session: null }, error: { status: 0 } })),
    })
    expect(await createAuthService(client).getSession()).toBeNull()
  })
})

describe('onAuthChange', () => {
  it('ส่ง session ให้ callback และคืนฟังก์ชันยกเลิกการติดตาม', () => {
    const unsubscribe = vi.fn()
    let listener
    const client = mockClient({
      onAuthStateChange: vi.fn((cb) => {
        listener = cb
        return { data: { subscription: { unsubscribe } } }
      }),
    })
    const callback = vi.fn()
    const stop = createAuthService(client).onAuthChange(callback)

    listener('SIGNED_OUT', null)
    expect(callback).toHaveBeenCalledWith(null)

    stop()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
