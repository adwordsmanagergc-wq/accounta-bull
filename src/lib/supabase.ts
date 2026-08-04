import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Helps you catch a missing/blank .env early instead of a cryptic auth error.
export const supabaseConfigured =
  !!url && !!anonKey && !url.includes('YOUR-PROJECT') && !anonKey.includes('YOUR-ANON')

if (!supabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Accounta-Bull] Supabase is not configured. Copy .env.example to .env and add ' +
      'your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart `npm run dev`.'
  )
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      // PKCE keeps auth tokens in the query string (?code=...) instead of the
      // URL hash, which avoids clashing with the app's HashRouter (#/route).
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

// Base URL of the deployed app, used for magic-link / signup email redirects.
// e.g. https://your-name.github.io/accountabull-web/
export const appUrl = `${window.location.origin}${import.meta.env.BASE_URL}`
