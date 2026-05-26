import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ejzlalwarphdhfdsfsno.supabase.co'
const supabaseKey = 'sb_publishable_Typ40SHz-FsdZYNlcMdaUQ__MFc0uN6'

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}