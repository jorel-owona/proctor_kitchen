// Configuration Supabase
const SUPABASE_CONFIG = {
    URL: "https://cwipqvafcvnrdzynwice.supabase.co",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aXBxdmFmY3ZucmR6eW53aWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MzcyNjUsImV4cCI6MjA4NDIxMzI2NX0._DS4GaZT42BVmHUFrcRtr31EmYhY8Y8TN6nzNcJ0Vgc"
};

// Fonction pour initialiser Supabase
function initSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase SDK non chargé');
        return null;
    }

    return supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
}