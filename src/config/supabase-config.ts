// Supabase Configuration
// Update these values with your actual Supabase project credentials
// You can find these in your Supabase project dashboard under Settings > API

export const SUPABASE_CONFIG = {
  // Your Supabase project URL (e.g., https://your-project.supabase.co)
  URL: 'https://npwikubnmgcewfkwstkd.supabase.co',
  
  // Your Supabase anon/public key
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wd2lrdWJubWdjZXdma3dzdGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NzU0ODQsImV4cCI6MjA3MDQ1MTQ4NH0.pTLwf4N4OsR-gZPh1tT00u2-NNOMKSnmnRMrGoBuxj8'
}

// Instructions:
// 1. Go to https://supabase.com and create a new project
// 2. Go to Settings > API in your project dashboard
// 3. Copy the "Project URL" and "anon public" key
// 4. Replace the placeholder values above
// 5. Create a .env.local file in your project root with:
//    VITE_SUPABASE_URL=your_actual_url
//    VITE_SUPABASE_ANON_KEY=your_actual_key
