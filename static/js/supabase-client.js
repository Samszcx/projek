/**
 * INFORYZE26 - Konfigurasi Supabase Client
 * Ganti nilai SUPABASE_URL, SUPABASE_ANON_KEY, dan SUPABASE_MANAGER_EMAIL
 * sesuai dengan project Supabase Anda (Settings -> Data API & API Keys).
 */
(() => {
  const SUPABASE_URL = "https://yryvvkbtcmxhvtqwkkzv.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_jOfvt4z8LKPLV_0ziRKL0g_-MJ4pYaT";
  const SUPABASE_MANAGER_EMAIL = "pengurus@inforyze26.id";

  const isConfigured =
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("GANTI_DENGAN") &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes("GANTI_DENGAN") &&
    typeof window.supabase !== "undefined";

  window.SUPABASE_MANAGER_EMAIL = SUPABASE_MANAGER_EMAIL;
  window.sb = isConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
})();
