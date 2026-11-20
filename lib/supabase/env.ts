// อ่านค่าที่ใส่ไว้ใน .env.local (บนเครื่อง) หรือ Environment Variables (บน Vercel)
// ทั้งสองค่านี้เปิดเผยได้ เพราะข้อมูลถูกป้องกันด้วย RLS ในฐานข้อมูล
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const hasSupabaseEnv = Boolean(supabaseUrl && supabasePublishableKey);

const projectUrl = URL.canParse(supabaseUrl) ? new URL(supabaseUrl) : null;
export const hasSupabaseConfig = Boolean(
  hasSupabaseEnv &&
    projectUrl &&
    (projectUrl.protocol === "https:" || projectUrl.protocol === "http:") &&
    projectUrl.hostname !== "your-project-ref.supabase.co" &&
    supabasePublishableKey !== "sb_publishable_your_key_here",
);
