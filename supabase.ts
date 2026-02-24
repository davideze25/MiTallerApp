import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// Esta lógica evita el error de "window is not defined"
const storage = Platform.OS === 'web' 
  ? (typeof window !== 'undefined' ? window.localStorage : undefined) 
  : AsyncStorage
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
