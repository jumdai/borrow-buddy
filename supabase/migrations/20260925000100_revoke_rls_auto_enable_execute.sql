-- ฟังก์ชัน rls_auto_enable มีอยู่เดิมในโปรเจ็กต์ (ใช้กับ event trigger)
-- ไม่ควรเรียกผ่าน API ได้ จึงถอนสิทธิ์ EXECUTE (event trigger ยังทำงานตามปกติ)
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
