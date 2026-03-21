// Test fixture: simulates a typical app file with env var references
const db = process.env.DATABASE_URL
const apiKey = process.env.API_KEY
const jwt = process.env['JWT_SECRET']
const redis = process.env.REDIS_URL

// This one is NOT in .env.example (should be flagged as MISSING)
const smtp = process.env.SMTP_HOST

// Vite-style env var (should also be detected)
const publicUrl = import.meta.env.VITE_PUBLIC_URL

export { db, apiKey, jwt, redis, smtp, publicUrl }
