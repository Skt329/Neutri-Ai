import "@testing-library/jest-dom"

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key"
process.env.AZURE_RESOURCE_NAME = "test-resource"
process.env.AZURE_API_KEY = "test-key"
process.env.NIM_API_KEY = "test-nim-key"
process.env.USDA_API_KEY = "test-usda-key"
process.env.CRON_SECRET = "test-cron-secret"
