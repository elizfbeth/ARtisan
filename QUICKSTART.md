# ARtisan Quick Start Guide 🚀

Get your ARtisan installation up and running in 10 minutes!

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git installed (optional)
- [ ] Modern browser (Chrome, Edge, or Safari)

## Step-by-Step Setup

### 1. Install Dependencies (2 minutes)

```bash
cd artisan
npm install
```

### 2. Set Up Environment Variables (5 minutes)

Create a `.env.local` file in the project root:

```bash
# Copy the template
cp ENV_SETUP.md .env.local

# Then edit .env.local with your API keys
```

**Minimum Required Keys to Start:**

- `NEXT_PUBLIC_CONVEX_URL` (get this from step 3)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `FAL_KEY`
- `GOOGLE_AI_API_KEY`

**Optional Keys (add later for full features):**

- `GROQ_API_KEY` (for music prompts)
- `ELEVENLABS_API_KEY` (for soundtracks)
- `MANUS_API_KEY` (for advanced orchestration)
- `MEM0_API_KEY` (for user memory)

### 3. Initialize Convex (1 minute)

```bash
npx convex dev
```

This command will:

1. Open your browser for authentication
2. Create a new Convex project
3. Deploy your schema
4. Provide your `NEXT_PUBLIC_CONVEX_URL`

**Important:** Copy the URL from the output and add it to `.env.local`

### 4. Set Up Supabase Storage (2 minutes)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Navigate to **Storage** in the sidebar
3. Create these four buckets (click "New bucket" for each):
   - `photos` (make public)
   - `environments` (make public)
   - `models` (make public)
   - `audio` (make public)

To make buckets public:

- Click on each bucket
- Go to "Policies"
- Click "New Policy"
- Select "Allow public access" template
- Click "Save"

4. Get your API keys:
   - Go to **Settings** → **API**
   - Copy `URL` → Add to `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → Add to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → Add to `SUPABASE_SERVICE_ROLE_KEY`

### 5. Get AI Service Keys (varies)

#### fal.ai (required)

1. Visit [fal.ai](https://fal.ai/)
2. Sign up and log in
3. Go to your dashboard
4. Click "Generate API Key"
5. Copy to `FAL_KEY`

#### Google AI / Gemini (required)

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy to `GOOGLE_AI_API_KEY`

#### Groq (optional - for music)

1. Visit [console.groq.com](https://console.groq.com/)
2. Sign up and create an API key
3. Copy to `GROQ_API_KEY`

#### ElevenLabs (optional - for soundtracks)

1. Visit [elevenlabs.io](https://elevenlabs.io/)
2. Sign up and go to Profile
3. Copy your API key to `ELEVENLABS_API_KEY`

### 6. Run the Application

Open **two terminal windows**:

**Terminal 1 - Convex:**

```bash
npx convex dev
```

**Terminal 2 - Next.js:**

```bash
npm run dev
```

### 7. Test Your Setup

1. Open [http://localhost:3000](http://localhost:3000)
2. Upload a test photo
3. Watch the magic happen! ✨

## Common Issues & Solutions

### Issue: "Cannot find NEXT_PUBLIC_CONVEX_URL"

**Solution:** Make sure `npx convex dev` is running and you've added the URL to `.env.local`

### Issue: "Failed to upload photo"

**Solution:**

- Check Supabase buckets are created and public
- Verify `NEXT_PUBLIC_SUPABASE_URL` and keys are correct

### Issue: "Scene generation failed"

**Solution:**

- Verify `FAL_KEY` and `GOOGLE_AI_API_KEY` are valid
- Check that you have API credits
- Look at browser console for specific errors

### Issue: 3D scene doesn't render

**Solution:**

- Make sure you're using a modern browser (Chrome recommended)
- Check browser console for WebGL errors
- Try refreshing the page

### Issue: Music doesn't play

**Solution:**

- This is optional - app works without it
- Add `GROQ_API_KEY` and `ELEVENLABS_API_KEY` to enable
- Click the music button to start playback

## Development Workflow

### During Development

Keep two terminals running:

```bash
# Terminal 1
npx convex dev

# Terminal 2
npm run dev
```

### Testing Changes

1. Frontend changes: Just refresh the browser
2. Convex changes: Automatically deployed by `convex dev`
3. Workflow changes: Restart Next.js dev server

### Deployment

When ready to deploy:

```bash
# Deploy Convex functions
npx convex deploy

# Deploy Next.js to Vercel
vercel --prod
```

Don't forget to add all environment variables to your Vercel project!

## Feature Availability by API Keys

| Feature          | Required Keys              |
| ---------------- | -------------------------- |
| Photo Upload     | Supabase                   |
| Scene Generation | Gemini, fal.ai, Supabase   |
| Doodle to Life   | Gemini, fal.ai, Supabase   |
| AI Soundtrack    | Groq, ElevenLabs, Supabase |
| User Memory      | Mem0                       |

**Minimum for MVP:** Convex, Supabase, Gemini, fal.ai

## Next Steps

1. ✅ Get the basic setup working with minimum keys
2. ✅ Test photo upload and scene generation
3. ✅ Try Doodle to Life feature
4. ✅ Add optional keys for full experience
5. ✅ Deploy to production

## Need Help?

- Check `README.md` for detailed documentation
- Review `ENV_SETUP.md` for environment variable details
- Look at browser console for error messages
- Check Convex dashboard for backend logs

## Tips for Best Experience

1. **Use Good Quality Photos**: Clear, well-lit photos work best
2. **Be Descriptive**: Detailed text prompts create better objects
3. **Be Patient**: AI generation takes 30-60 seconds
4. **Start Simple**: Test with basic features before adding complexity
5. **Monitor Credits**: Keep an eye on API usage limits

---

Happy creating! 🎨✨
