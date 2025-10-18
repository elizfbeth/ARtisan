# ARtisan 🎨

Transform your memories into immersive AR experiences with AI magic!

ARtisan is an innovative Augmented Reality creative studio that transforms user-uploaded photos into interactive, explorable AR spaces. Features a real-time "Doodle to Life" imagination compiler and dynamically composed AI soundtracks for a deeply personal artistic journey.

## Features

- 📸 **Photo to AR Scene**: Upload any photo and watch as AI transforms it into an immersive 3D environment
- ✨ **Doodle to Life**: Create objects through sketching, text descriptions, or photos - they instantly appear in your AR scene
- 🎵 **AI-Composed Soundtrack**: Dynamic music that adapts to your scene's mood and content
- 🎮 **Interactive Navigation**: Explore your AR space with WASD + mouse controls
- ⚡ **Real-time Updates**: All changes sync instantly across your experience

## Tech Stack

### Frontend

- Next.js 14 (App Router)
- React Three Fiber & Drei (3D rendering)
- Tailwind CSS (styling)
- React Sketch Canvas (drawing)

### Backend & Infrastructure

- **Convex.dev**: Real-time API & state synchronization
- **Supabase**: Database & asset storage

### AI Services

- **Gemini 2.5 Flash**: Image analysis & object interpretation
- **fal.ai**: 3D model & environment generation
- **ElevenLabs**: Dynamic soundtrack generation
- **Groq**: Fast LLM inference for scene analysis
- **Manus AI**: Workflow orchestration
- **Mem0.ai**: Persistent user memory

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Accounts for all sponsor services (see below)

### 2. Clone and Install

```bash
cd artisan
npm install
```

### 3. Set Up API Keys

Create a `.env.local` file in the root directory with your API keys:

```bash
# Convex (run: npx convex dev to get this)
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

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Initialize Convex

```bash
npx convex dev
```

This will:

- Create your Convex project
- Set up the database schema
- Provide your `NEXT_PUBLIC_CONVEX_URL`

### 5. Set Up Supabase Storage

1. Go to your Supabase project dashboard
2. Navigate to Storage
3. Create the following buckets (all public):
   - `photos`
   - `environments`
   - `models`
   - `audio`

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Getting API Keys

### Convex

1. Run `npx convex dev` in your project
2. Follow the setup wizard
3. Copy the `NEXT_PUBLIC_CONVEX_URL` from the output

### Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to Settings → API
3. Copy the URL and `anon` key
4. Copy the `service_role` key (keep this secret!)

### fal.ai

1. Sign up at [fal.ai](https://fal.ai/)
2. Navigate to your dashboard
3. Generate an API key

### Google AI (Gemini)

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key

### Groq

1. Sign up at [console.groq.com](https://console.groq.com/)
2. Generate an API key from the dashboard

### ElevenLabs

1. Create an account at [elevenlabs.io](https://elevenlabs.io/)
2. Go to Profile Settings
3. Copy your API key

### Manus AI

1. Sign up at [manus.ai](https://www.manus.ai/)
2. Navigate to API settings
3. Generate an API key

### Mem0

1. Create an account at [mem0.ai](https://mem0.ai/)
2. Get your API key from the dashboard

## Project Structure

```
artisan/
├── src/
│   └── app/              # Next.js app directory
│       ├── api/          # API routes
│       ├── page.tsx      # Main application page
│       └── layout.tsx    # Root layout with Convex provider
├── components/           # React components
│   ├── ARViewer.tsx      # 3D scene viewer
│   ├── PhotoUpload.tsx   # Photo upload interface
│   └── DoodlePad.tsx     # Doodle to Life interface
├── lib/                  # Utility libraries
│   ├── workflows/        # AI workflow orchestration
│   ├── supabase.ts       # Supabase client
│   ├── ai-clients.ts     # AI service clients
│   └── manus.ts          # Manus AI client
├── convex/               # Convex backend
│   ├── schema.ts         # Database schema
│   ├── scenes.ts         # Scene operations
│   └── workflows.ts      # Workflow actions
└── ENV_SETUP.md          # Detailed environment setup guide
```

## Usage Guide

### Creating Your First AR Scene

1. **Upload a Photo**: Click or drag-and-drop a photo on the landing page
2. **Wait for Magic**: AI analyzes your photo and generates an immersive environment
3. **Explore**: Use WASD keys to move, mouse to look around, E/Q for up/down

### Adding Objects with Doodle to Life

1. **Choose Input Method**:
   - **Text**: Describe what you want (e.g., "a flying dragon")
   - **Sketch**: Draw your object on the canvas
   - **Photo**: Upload a reference image

2. **Name Your Creation** (optional): Give your object a custom name

3. **Bring to Life**: Click the "✨ Bring to Life" button

4. **Interact**: Your object appears in the AR scene - click and drag to move it!

### Soundtrack

- AI automatically generates music based on your scene's mood
- Click the music button (bottom right) to play/pause
- Use "Recompose Soundtrack" to generate a new track

## Troubleshooting

### Convex Connection Issues

- Make sure `npx convex dev` is running
- Check that `NEXT_PUBLIC_CONVEX_URL` is set correctly

### Image Loading Errors

- Verify Supabase storage buckets are created and public
- Check that `NEXT_PUBLIC_SUPABASE_URL` and keys are correct

### AI Generation Failures

- Verify all API keys are valid and have credits
- Check the browser console for specific error messages
- Some AI services may have rate limits

### 3D Scene Not Rendering

- Ensure WebGL is enabled in your browser
- Try using Chrome or Edge for best compatibility
- Check browser console for Three.js errors

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables in Vercel dashboard
4. Deploy!

### Convex Production

```bash
npx convex deploy
```

Update your `NEXT_PUBLIC_CONVEX_URL` to the production URL.

## Performance Tips

- Use high-quality but reasonably sized photos (< 5MB)
- Clear object descriptions lead to better AI generations
- Allow AI generation time (30-60 seconds per operation)
- Use modern browsers (Chrome, Edge, Safari) for best 3D performance

## Contributing

This is a hackathon project. Feel free to fork and improve!

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built with ❤️ using amazing sponsor tools:

- Convex, Supabase, fal.ai, Gemini, ElevenLabs, Groq, Manus AI, Mem0.ai

---

Made for [Hackathon Name] 2024
