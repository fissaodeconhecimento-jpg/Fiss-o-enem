// ═══════════════════════════════════════════════════════════
// supabase.js — Inicializa o cliente Supabase.
// Toda a lógica de leitura/escrita fica no storage.js.
// ═══════════════════════════════════════════════════════════
 
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
 
const SUPABASE_URL      = 'https://yhedivjkzircjgggjsqj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloZWRpdmpremlyY2pnZ2dqc3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2ODQ5NzUsImV4cCI6MjA4OTI2MDk3NX0.TAEd8P249eIniCXRWpTErXgO_hRevHg9ngonJuyde3k';
 
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 