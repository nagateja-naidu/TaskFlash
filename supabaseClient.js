const SUPABASE_URL = 'https://jmyclmumzdzuiwbwypji.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpteWNsbXVtemR6dWl3Ynd5cGppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzY2OTksImV4cCI6MjA3MzYxMjY5OX0.aCYDMv2Z3ioQ9JCtA695VGP47ifMYwEmr2cGGUZRHRc';

// This creates the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);