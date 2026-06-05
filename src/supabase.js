
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://ieiotxbrjqddtvuqxevh.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllaW90eGJyanFkZHR2dXF4ZXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjI0MzMsImV4cCI6MjA5NDY5ODQzM30.E8rLzERY6OmIzVY3GbsGR87Vxc5Pvgx3KD0Z1PhMpYU"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)