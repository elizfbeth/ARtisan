# ARtisan Pre-Launch Checklist ✅

Use this checklist before your hackathon demo or deployment.

## 🔧 Environment Setup

### API Keys & Configuration

- [ ] `.env.local` file created
- [ ] `NEXT_PUBLIC_CONVEX_URL` set (from `npx convex dev`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `FAL_KEY` set and has credits
- [ ] `GOOGLE_AI_API_KEY` set and active
- [ ] `GROQ_API_KEY` set (optional but recommended)
- [ ] `ELEVENLABS_API_KEY` set (optional but recommended)
- [ ] All API keys verified and working

### Supabase Storage

- [ ] Supabase project created
- [ ] `photos` bucket created and public
- [ ] `environments` bucket created and public
- [ ] `models` bucket created and public
- [ ] `audio` bucket created and public
- [ ] Test upload to each bucket successful

### Convex Setup

- [ ] `npx convex dev` runs without errors
- [ ] Schema deployed successfully
- [ ] Can view tables in Convex dashboard
- [ ] Test mutation runs successfully

## 🚀 Local Testing

### Development Servers

- [ ] `npx convex dev` running in terminal 1
- [ ] `npm run dev` running in terminal 2
- [ ] No console errors on startup
- [ ] Can access http://localhost:3000

### Photo Upload Flow

- [ ] Upload page loads correctly
- [ ] Drag-and-drop works
- [ ] File selection works
- [ ] Image preview displays
- [ ] Upload button enabled
- [ ] "Creating AR Scene" message appears
- [ ] Progress transitions to processing state

### Scene Generation

- [ ] Photo appears in Supabase `photos` bucket
- [ ] Scene record created in Convex
- [ ] Status changes: uploading → analyzing → generating → ready
- [ ] Analysis data populates (environment type, mood, objects)
- [ ] Environment texture generated
- [ ] Environment texture stored in Supabase
- [ ] No errors in browser console
- [ ] No errors in Convex logs

### AR Viewer

- [ ] 3D scene loads
- [ ] Environment/skybox visible
- [ ] Ground plane or environment visible
- [ ] Controls hint displayed
- [ ] WASD movement works
- [ ] Mouse look works
- [ ] E/Q up/down works
- [ ] No black screen
- [ ] Smooth frame rate (>30 FPS)

### Doodle to Life

- [ ] Doodle pad interface visible
- [ ] Can switch between text/sketch/photo modes
- [ ] Text input accepts description
- [ ] Sketch canvas allows drawing
- [ ] Clear canvas button works
- [ ] Photo upload works in doodle mode
- [ ] "Bring to Life" button enabled
- [ ] Synthesis starts on click
- [ ] "Compiling your imagination" message shows
- [ ] Object appears in scene after generation
- [ ] Object is visible and positioned correctly
- [ ] Object label shows on hover

### Audio/Music

- [ ] Music icon appears (bottom right)
- [ ] Click to play/pause works
- [ ] Audio file generated
- [ ] Audio stored in Supabase
- [ ] Sound plays correctly
- [ ] No audio errors in console

### UI/UX

- [ ] All buttons have hover effects
- [ ] Loading states display correctly
- [ ] Error messages are clear
- [ ] Scene info panel updates
- [ ] Created objects list updates
- [ ] Smooth transitions between states
- [ ] Mobile responsive (if testing on mobile)

## 🧪 Test Scenarios

### Happy Path Test

1. [ ] Upload a clear, colorful photo
2. [ ] Wait for scene generation (should be < 2 min)
3. [ ] Navigate the AR scene
4. [ ] Add text object: "a red sports car"
5. [ ] Wait for object to appear
6. [ ] Add sketch object: draw a star
7. [ ] Check music plays
8. [ ] Verify all 3 objects visible

### Edge Cases

- [ ] Upload very small image (< 100KB)
- [ ] Upload large image (> 5MB - should warn)
- [ ] Upload non-image file (should reject)
- [ ] Try empty text input (should validate)
- [ ] Add 5+ objects (performance check)
- [ ] Refresh during generation (state persists)
- [ ] Navigate away and back (reconnects)

### Error Handling

- [ ] Invalid API key shows error
- [ ] Network failure handled gracefully
- [ ] Generation timeout handled
- [ ] Invalid file type rejected
- [ ] File too large rejected
- [ ] Errors don't crash app

## 📱 Browser Compatibility

### Desktop Browsers

- [ ] Chrome (recommended) - full test
- [ ] Edge - basic test
- [ ] Firefox - basic test
- [ ] Safari - basic test (may have limitations)

### Mobile Browsers (Optional)

- [ ] Chrome mobile - upload works
- [ ] Safari iOS - basic functionality

### WebGL Support

- [ ] WebGL enabled in browser
- [ ] No WebGL errors in console
- [ ] 3D scene renders correctly

## 🎨 Visual Polish

### Landing Page

- [ ] Header looks good
- [ ] Gradient background visible
- [ ] Upload area centered
- [ ] Icons display correctly
- [ ] Text readable

### AR Viewer

- [ ] Full screen display
- [ ] Controls hint readable
- [ ] Music button positioned well
- [ ] Scene info panel styled
- [ ] No UI overlap

### Doodle Pad

- [ ] Tabs clearly visible
- [ ] Input areas properly sized
- [ ] Buttons have good contrast
- [ ] Status messages clear

## 📊 Performance

### Load Times

- [ ] Initial page load < 3 seconds
- [ ] Photo upload < 5 seconds
- [ ] Scene generation < 90 seconds
- [ ] Object synthesis < 60 seconds
- [ ] Music generation < 60 seconds

### Resource Usage

- [ ] Memory usage reasonable (check DevTools)
- [ ] No memory leaks after multiple operations
- [ ] CPU usage acceptable
- [ ] Network requests complete successfully

## 📝 Documentation

### Files Present

- [ ] README.md complete
- [ ] QUICKSTART.md available
- [ ] ENV_SETUP.md detailed
- [ ] DEPLOYMENT.md ready
- [ ] TROUBLESHOOTING.md helpful
- [ ] BUILD_SUMMARY.md accurate

### Code Quality

- [ ] All components have comments
- [ ] Complex functions documented
- [ ] Type safety maintained (no `any` types where avoidable)
- [ ] Error handling present
- [ ] Console.logs removed/minimized

## 🚨 Pre-Demo Checklist

### 5 Minutes Before

- [ ] Restart both dev servers
- [ ] Clear browser cache
- [ ] Close unnecessary tabs
- [ ] Check internet connection
- [ ] Verify all API keys working
- [ ] Test one complete flow
- [ ] Have backup photos ready
- [ ] Prepare demo script

### Demo Photos

- [ ] Photo 1: Outdoor scene (beach, park)
- [ ] Photo 2: Indoor scene (room, office)
- [ ] Photo 3: Interesting objects (car, building)
- [ ] All photos < 5MB
- [ ] All photos clear and colorful

### Demo Objects

- [ ] Text example 1: "a flying dragon"
- [ ] Text example 2: "a vintage car"
- [ ] Sketch ready: simple drawing
- [ ] Photo ready: object on white background

### Backup Plan

- [ ] Screenshots of working features
- [ ] Video recording of full flow
- [ ] Localhost recording (if demo offline)
- [ ] Slides explaining concept

## 🎯 Success Criteria

### Must Work

- [x] Photo upload
- [x] Scene generation
- [x] AR viewer with controls
- [x] At least one Doodle to Life input method

### Should Work

- [x] All three Doodle to Life methods
- [x] Multiple objects in scene
- [x] Music generation

### Nice to Have

- [ ] Mobile support
- [ ] Social sharing
- [ ] Scene gallery

## 🐛 Known Issues

Document any known issues here:

1. ***
2. ***
3. ***

## 📞 Emergency Contacts

- Convex Support: https://discord.gg/convex
- Supabase Support: https://discord.supabase.com
- Team member: **************\_**************

## ✅ Final Sign-Off

- [ ] All critical features tested
- [ ] All API keys verified
- [ ] Documentation complete
- [ ] Demo script prepared
- [ ] Backup plan ready
- [ ] Team confident

---

**Signed off by:** ********\_******** **Date:** ****\_****

**Ready to launch!** 🚀✨

---

## Quick Test Script

Run this in your terminal for a quick health check:

```bash
#!/bin/bash
echo "🔍 ARtisan Health Check"
echo "======================="

# Check Node version
echo "✓ Node version: $(node --version)"

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "✓ .env.local exists"
else
    echo "✗ .env.local missing!"
fi

# Check if Convex is configured
if grep -q "NEXT_PUBLIC_CONVEX_URL" .env.local; then
    echo "✓ Convex URL configured"
else
    echo "✗ Convex URL missing!"
fi

# Check if Supabase is configured
if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
    echo "✓ Supabase URL configured"
else
    echo "✗ Supabase URL missing!"
fi

# Check dependencies
if [ -d "node_modules" ]; then
    echo "✓ Dependencies installed"
else
    echo "✗ Run npm install!"
fi

echo "======================="
echo "Ready to: npm run dev"
```

Save as `health-check.sh` and run: `bash health-check.sh`
