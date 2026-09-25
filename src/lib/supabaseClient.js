import { createClient } from '@supabase/supabase-js'

export const CONFIG_ERROR = 'ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// ไม่มีค่า env = supabase เป็น null ให้หน้าเว็บแสดง CONFIG_ERROR แทนการล้ม
export const supabase = url && key ? createClient(url, key) : null
