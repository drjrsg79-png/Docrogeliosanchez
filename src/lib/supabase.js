import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://byzoactlempcjqsxiexg.supabase.co'
const supabaseKey = 'sb_publishable_pjDN9ERlf07E_V0brj2ZZw_1TgE2pgO'

export const supabase = createClient(supabaseUrl, supabaseKey)
