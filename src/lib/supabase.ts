import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jftwjqprwjeesivzmycy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_r0U5JThsuKCB5wqX5s9aXQ_wQgamwTs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

