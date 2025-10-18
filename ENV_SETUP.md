# Environment Setup Guide

Create a `.env.local` file in the project root with the following variables:

```bash
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Convex
NEXT_PUBLIC_CONVEX_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
FAL_KEY=
GOOGLE_AI_API_KEY=
GROQ_API_KEY=
ELEVENLABS_API_KEY=
MANUS_API_KEY=
MEM0_API_KEY=
EXA_API_KEY=
```

## How to Get API Keys

1. **Convex**: Run `npx convex dev` and follow the setup wizard
2. **Supabase**: Create project at https://supabase.com/dashboard
3. **fal.ai**: Sign up at https://fal.ai/ and get API key
4. **Google AI (Gemini)**: Get key from https://aistudio.google.com/app/apikey
5. **Groq**: Sign up at https://console.groq.com/
6. **ElevenLabs**: Get key from https://elevenlabs.io/
7. **Manus AI**: Sign up at https://www.manus.ai/
8. **Mem0**: Get key from https://mem0.ai/
9. **Exa AI**: Get key from https://exa.ai/ (for location intelligence)

## Quick Setup

```bash
# Copy this file
cp ENV_SETUP.md .env.local

# Edit .env.local with your actual API keys

# Initialize Convex
npx convex dev
```
