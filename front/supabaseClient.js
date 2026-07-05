// Reemplaza con los datos de tu proyecto Supabase (Settings → API)
const SUPABASE_URL      = "https://esgzmozqvahagjgojwng.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ3ptb3pxdmFoYWdqZ29qd25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTk2NjYsImV4cCI6MjA5ODU5NTY2Nn0.0JCMjJTvVYBo4Rc8lju2ssiZTOimk2bv-eVkHLmL9Fk";

// El SDK del CDN se carga como window.supabase (el módulo); lo reemplazamos
// por el cliente ya inicializado para que "supabase" siga funcionando en script.js
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
