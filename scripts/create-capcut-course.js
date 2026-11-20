globalThis.WebSocket = class {};
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const CAPCUT_COURSE_ID = 'c9f4c3a1-7e82-4f91-b384-5a2d8e41a001';

async function main() {
  console.log('--- Starting CapCut Course Creation ---');

  // Fetch admin user ID
  const { data: adminProfile } = await sb
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single();

  const adminId = adminProfile?.id || '9ab2b5d4-e912-4609-b5ba-bc92da398607';

  // 1. Insert or update the course
  const coursePayload = {
    id: CAPCUT_COURSE_ID,
    title: 'CapCut Pro - Full Course',
    description: 'Complete CapCut Pro course for Mobile & PC. Learn professional video editing workflows, AI tools & monthly credits, viral Reels creation with 500,000 Ready Reels, premium companion apps, and proven monetization methods.',
    category: 'Video Editing',
    difficulty: 'beginner',
    estimated_duration_minutes: 240,
    status: 'published',
    visibility: 'all',
    qualifying_for_reseller: false,
    created_by: adminId,
    deleted_at: null,
    updated_at: new Date().toISOString()
  };

  const { error: courseErr } = await sb.from('courses').upsert(coursePayload);
  if (courseErr) {
    console.error('Error creating course:', courseErr);
    process.exit(1);
  }
  console.log('Course created/updated successfully: CapCut Pro - Full Course');

  // 2. Define the 7 Modules
  const modulesData = [
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410001',
      title: 'CapCut basics and setup (Mobile + PC)',
      description: 'Account setup, mobile & desktop installation, 1-device vs 2-device rules, enrolment plans overview, and manual verification process.',
      order_index: 0,
    },
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410002',
      title: 'Mobile editing full workflow',
      description: 'End-to-end mobile video editing: timeline splitting, keyframes, picture-in-picture overlay, auto-captions, sound design, and 4K 60fps export.',
      order_index: 1,
    },
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410003',
      title: 'PC editing full workflow',
      description: 'Desktop editing masterclass: multi-track timeline, keyboard shortcuts, speed curve ramping, optical flow smooth slow-motion, and desktop color grading.',
      order_index: 2,
    },
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410004',
      title: 'CapCut AI tools and AI credits - how to use them',
      description: 'Using AI script-to-video, auto-captions with animated typography, AI background removal, text-to-speech, and managing monthly AI credits tiers.',
      order_index: 3,
    },
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410005',
      title: 'Reels editing with 500,000 Ready Reels',
      description: 'How to utilize the 500,000 Ready Reels library included with your plan: niche selection, hook editing, re-purposing, and audio synchronization.',
      order_index: 4,
    },
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410006',
      title: 'Premium Mobile Apps and PC Softwares - how to use them',
      description: 'Companion toolkit: setup guides for the 50 Premium Mobile Apps and PC Softwares included free with every plan.',
      order_index: 5,
    },
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410007',
      title: 'Earning method with CapCut - how to earn from editing',
      description: 'Monetization blueprint: selling short-form editing retainers, theme page automation, e-commerce ad creation, and client closing scripts.',
      order_index: 6,
    },
  ];

  // 3. Define the comprehensive lessons and content blocks for each module
  const lessonsData = [
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410011',
      module_id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410001',
      title: 'CapCut Basics, Installation & Device Setup (Mobile + PC)',
      subtitle: 'Complete setup guide, account login, 1-device vs 2-device rules, and official plans overview',
      order_index: 0,
      content: `### 1. Introduction to CapCut Pro Ecosystem
CapCut Pro is the world's most powerful, all-in-one video editing solution for short-form content creators, digital marketers, and freelance video editors. Whether you are producing Instagram Reels, YouTube Shorts, or TikTok videos, CapCut offers unmatched speed, AI automation, and professional desktop and mobile tools.

---

### 2. Installation on Mobile & PC

#### A. Mobile Installation (Android & iOS)
- **Android:** Download CapCut directly from the Google Play Store or the official APK download page. Ensure your device runs Android 8.0 or higher with at least 4 GB RAM for smooth timeline scrubbing.
- **iOS (iPhone / iPad):** Download CapCut from the Apple App Store. Ensure iOS 14.0 or later is installed.
- **Initial Setup:** Grant storage, camera, and microphone permissions so media files import with zero latency.

#### B. PC Desktop Installation (Windows & Mac)
- **Windows:** Download the official CapCut Windows Desktop installer from the official portal. Run the setup installer and allocate a dedicated cache folder on your SSD (e.g. \`D:\\CapCutCache\`) to keep your primary C-drive clean.
- **Mac:** Install CapCut from the Mac App Store (macOS 10.15 or later). Optimized for Apple Silicon M1/M2/M3 chips for lightning-fast hardware-accelerated rendering.

---

### 3. Critical Device Rules & Plan Guidelines
Understanding your enrolment tier is essential to ensure seamless editing:

- **1 Device Plan (Mobile only):**
  - Strictly limited to one mobile phone (Android or iPhone).
  - Does NOT allow PC login. If you edit on a PC, you MUST choose a 2-Device plan.
- **2 Devices Plan (Mobile + PC):**
  - Allows simultaneous activation on **1 Mobile Phone + 1 Desktop PC**.
  - **PC editing strictly requires the 2-Device plan.**
- **Device Security & Usage Integrity:**
  - Plans are individual creator licences for the duration of your enrolment (1 month or 7 days weekly).
  - Do not share login details across unauthorized multiple persons.

---

### 4. Official Enrolment Plans & Pricing Overview
The CapCut Pro course offers 7 specific enrolment tiers with transparent pricing:

1. **1 Device (Mobile only), 1 month, no AI credits** — **Rs 399**
2. **2 Devices (Mobile + PC), 1 month, no AI credits** — **Rs 499**
3. **2 Devices (Mobile + PC), 1 month, 500 monthly AI credits** — **Rs 599**
4. **2 Devices (Mobile + PC), 1 month, 1200 monthly AI credits** — **Rs 699**
5. **2 Devices (Mobile + PC), 1 month, 1600 monthly AI credits** — **Rs 799**
6. **2 Devices (Mobile + PC), 1 month, 2000 monthly AI credits** — **Rs 899**
7. **2 Devices (Mobile + PC), 7 days, 500 AI credits (Weekly)** — **Rs 249**

> 🎁 **Every Plan Includes FREE:**
> - **500,000 Ready Reels** (Categorized across 10+ viral niches)
> - **50 Premium Mobile Apps** (Android utility & graphic apps)
> - **Premium PC Softwares** (Essential video & audio production utilities)

---

### 5. Manual Enrolment & Verification Policy
- **Manual Enrolment Only:**
  - After payment, enrolment is done manually by the team after verification.
  - There is NO automated enrolment or instant grant on payment without human verification.
  - To activate: submit payment via official channels (EasyPaisa / JazzCash / Bank), take a clear screenshot of the transaction ID, and send it to our team on WhatsApp.
  - Our support team verifies the transaction and grants access manually.`
    },
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410012',
      module_id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410002',
      title: 'Mobile Editing Full Workflow Masterclass',
      subtitle: 'Complete step-by-step mobile editing guide from raw clip to viral 4K export',
      order_index: 0,
      content: `### 1. Project Initialization & Aspect Ratio
- Open CapCut Mobile and tap **New Project**.
- Select your raw video clips from your gallery.
- Tap **Aspect Ratio** on the bottom toolbar and select **9:16** for vertical short-form video (Instagram Reels, YouTube Shorts, TikTok).
- Resize or reframe your clips using pinch-to-zoom to ensure the subject remains centered within the safe margins.

---

### 2. Timeline Manipulation: Splitting, Trimming & Pacing
- **Rough Cut:** Scrub along the timeline and tap **Split** at natural speech pauses or filler words ('um', 'ah', long silences).
- **Fast-Paced Hook:** Ensure your first clip transitions or delivers a compelling visual punch within the first 1.5 to 2.5 seconds.
- **Ripple Deletion:** Delete unwanted segments; the timeline automatically ripples forward to maintain continuous pacing.

---

### 3. Keyframes & Dynamic Motion
Keyframes allow you to animate any element (scale, position, opacity, rotation):
1. Position the playhead where the motion should start.
2. Tap the **Diamond Keyframe** icon next to the Play button.
3. Move the playhead forward by 0.5 to 1 second.
4. Scale up the video or reposition the element; CapCut will smoothly interpolate the transition between the two points.
5. Use keyframes for subtle continuous push-ins during talking-head clips to maintain viewer attention.

---

### 4. Overlays & Picture-in-Picture (PiP)
- Tap **Overlay** > **Add Overlay** to place secondary B-roll footage or stickers on a track above your main video.
- **Masking:** Tap **Mask** to select Circle, Split, or Filmstrip for split-screen reaction videos. Use the arrow handles to feather edges smoothly.
- **Chroma Key (Green Screen):** Tap **Cutout** > **Chroma Key**, pick the green color using the color dropper, and increase **Intensity** until the background disappears completely.

---

### 5. Auto-Captions & Typography
- Tap **Text** > **Auto Captions** > select audio source (Original Sound or Voiceover) and language.
- Select from high-converting animated caption styles.
- Customize fonts, stroke outline, shadow, and word-by-word highlights.
- Highlight key emotional words with contrasting colors (e.g. Yellow or Green).

---

### 6. Sound Design & Audio Mixing
- Tap **Audio** > **Effects** to add transitional sound effects: *Woosh*, *Pop*, *Camera Click*, and *Ding*.
- Add trending background music and tap **Volume** to set background track between **8% and 15%** so voiceover remains crystal clear.
- Tap **Reduce Noise** on voice recordings to filter out ambient room hum.

---

### 7. Color Grading & Export Settings
- Go to **Adjust** > sharpen footage (+15), increase contrast (+8), and balance saturation (+5).
- Tap the **Export Settings** dropdown at the top right:
  - Resolution: **1080p** or **2K/4K**
  - Frame Rate: **60 FPS** (or 30 FPS if recorded at 30)
  - Codec Rate: Set to **Higher** to prevent social media compression artifacts.
- Tap **Export** and keep CapCut open until rendering reaches 100%.`
    },
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410013',
      module_id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410003',
      title: 'PC Editing Full Workflow & Professional Shortcuts',
      subtitle: 'Multi-track desktop editing, speed curves, optical flow, and desktop color grading',
      order_index: 0,
      content: `### 1. CapCut PC Interface Architecture
The PC version is designed for high-speed desktop production:
- **Top-Left Bin:** Media import, audio library, text presets, stickers, effects, and transitions.
- **Center Preview Window:** 4K video canvas with safe margin guides and player controls.
- **Top-Right Inspector:** Detailed properties for Video, Audio, Speed, Animation, and Color adjustments.
- **Bottom Multi-Track Timeline:** Magnetic timeline supporting unlimited simultaneous video, overlay, and audio tracks.

---

### 2. Essential Keyboard Shortcuts for Rapid Editing
Mastering keyboard shortcuts will triple your editing output:
- **B:** Split Blade tool (cuts clip at cursor position)
- **A:** Selection Arrow tool
- **Spacebar:** Play / Pause playback
- **Ctrl + B (Windows) / Cmd + B (Mac):** Split clip at playhead
- **Q:** Ripple trim clip start to playhead
- **W:** Ripple trim clip end to playhead
- **Delete / Backspace:** Remove selected clip with automatic timeline collapse
- **Shift + Z:** Zoom to fit entire project on timeline
- **Ctrl + Z:** Undo last action

---

### 3. Multi-Track Timeline Organization & Compound Clips
- **Color Coding:** Assign specific tracks for A-Roll (main narrative), B-Roll (supporting visuals), Overlays, Captions, and Audio FX.
- **Locking & Muting:** Use track padlocks to prevent accidental edits to background tracks.
- **Compound Clips:** Select multiple clips or layers, right-click, and select **Create Compound Clip**. This groups them into a single nested clip so you can apply unified color grades, zoom transitions, or speed curves to the whole block.

---

### 4. Advanced Speed Ramping with Curves & Optical Flow
- Select clip > open **Speed** tab in the Inspector panel > choose **Curve** > **Custom**.
- Shape your velocity curve: fast start (3x speed), slow-motion drop at the visual impact moment (0.2x speed), and snap back to regular speed (1x).
- **Optical Flow Smooth Slow-Motion:** When slowing footage below 50% speed, enable **Make It Smoother** > select **Optical Flow**. CapCut calculates artificial intermediate frames, producing silky-smooth 120fps/240fps slow-motion even from standard 30fps footage.

---

### 5. Professional Audio Mastering
- Select dialogue track > go to **Audio** in Inspector:
  - Enable **Loudness Normalization** (-14 LUFS standard for Instagram & YouTube).
  - Enable **Enhance Voice** to eliminate echo and impart broadcast microphone warmth.
  - Apply **Noise Reduction** to eliminate background PC fan noise or air conditioning hum.

---

### 6. Desktop Color Grading & LUTs
- Navigate to **Adjustment** in Inspector > **Basic**:
  - Exposure, Contrast, Highlights, Shadows, Whites, Blacks.
  - **HSL Wheels:** Fine-tune individual color channels (e.g. skin tones under Orange channel; background foliage under Green channel).
  - **Curves:** Create an S-Curve in the RGB master channel for deep contrast and cinematic highlights.

---

### 7. High-Bitrate Desktop 4K Export
- Click **Export** in the top right corner:
  - Resolution: **4K (3840x2160)** or **1080p (1920x1080)**
  - Bitrate: Set to **Custom** and input **25,000 - 35,000 Kbps**
  - Codec: **H.264**
  - Format: **MP4**
  - Frame Rate: **60 fps**`
    },
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410014',
      module_id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410004',
      title: 'CapCut AI Tools & Monthly AI Credits Management',
      subtitle: 'AI script-to-video, auto-captions, background removal, and credit tiers',
      order_index: 0,
      content: `### 1. Comprehensive Overview of CapCut AI Tools
CapCut Pro features cutting-edge artificial intelligence models designed to automate tedious video production tasks:

1. **AI Script-to-Video:**
   - Type a topic, blog summary, or product description.
   - CapCut generates an intelligent script, sources relevant high-definition B-roll stock, synchronizes multilingual voiceover, and adds background music in under 60 seconds.
2. **AI Smart Cutout & Auto Background Removal:**
   - Automatically isolates subjects without a physical green screen studio backdrop.
   - Smart Brush allows manual masking of complex edges like fine hair or moving hands.
3. **AI Animated Auto-Captions:**
   - Automatically transcribes speech with word-level timing precision.
   - Features trending dynamic templates (karaoke effects, glowing borders, auto-zoom emojis).
4. **AI Text-to-Speech (Voiceover):**
   - Studio-grade AI voice actors across English, Urdu, Hindi, Arabic, and European languages with customizable emotional inflection and pacing.
5. **AI Video Upscaling & Image Enhancer:**
   - Enhances low-resolution 720p or compressed archival footage into crisp 1080p and 4K visuals.
6. **AI Flash Effects & Body Tracking:**
   - Automatically tracks moving subjects and applies neon outline glows, electro-pulses, and kinetic motion effects.

---

### 2. Understanding Your Monthly AI Credits by Plan
CapCut AI features that run on CapCut cloud servers utilize **AI Credits**. Different creator workflows require different credit allotments:

| Plan | AI Credits | Best For |
|---|---|---|
| **1 Device (Mobile only) - Rs 399** | **No AI credits** | Editors who edit manually on phone without cloud AI generation |
| **2 Devices (Mobile + PC) - Rs 499** | **No AI credits** | Editors working on PC & Mobile using timeline, transitions & manual tools |
| **2 Devices (Mobile + PC) - Rs 599** | **500 Monthly Credits** | Casual creators generating 15-20 AI voiceovers or automated scripts/month |
| **2 Devices (Mobile + PC) - Rs 699** | **1200 Monthly Credits** | Daily content creators posting 1-2 videos every day |
| **2 Devices (Mobile + PC) - Rs 799** | **1600 Monthly Credits** | Agency editors managing multiple client accounts |
| **2 Devices (Mobile + PC) - Rs 899** | **2000 Monthly Credits** | High-volume video production teams and power creators |
| **2 Devices (Mobile + PC) - Rs 249** | **500 AI Credits (Weekly)** | 7 days access for short-term projects or fast delivery sprints |

---

### 3. Credit Consumption & Best Practices
- **How Credits Are Charged:** Cloud AI generation tasks (such as AI Script-to-Video generation and specialized cloud voice synthesis) consume credits per request.
- **Standard Pro Tools Do NOT Consume Credits:** Standard Pro filters, Pro transitions, timeline split, speed curves, manual keyframing, and local exports do NOT consume your AI credits.
- **Monitoring Balance:** Check your active credit balance by clicking your profile avatar in the CapCut app.
- **Renewal Cycle:** On monthly plans, your AI credit balance resets every 30 days upon plan renewal.`
    },
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410015',
      module_id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410005',
      title: 'Reels Editing with 500,000 Ready Reels Library',
      subtitle: 'Niche selection, hook customization, re-purposing pre-made assets, and audio sync',
      order_index: 0,
      content: `### 1. Accessing Your 500,000 Ready Reels Library
Every CapCut Pro enrolment plan includes instant access to the **500,000 Ready Reels Digital Asset Library**. This collection covers top viral categories:
- **Business & Entrepreneurship:** Startup advice, trading graphs, high-finance interviews, business lessons.
- **Luxury & Lifestyle:** Supercars, modern architecture, luxury watches, private jets, travel aesthetics.
- **Technology & AI:** Future tech visuals, cybersecurity animations, AI tool demonstrations.
- **Fitness & Wellness:** Gym workouts, calisthenics, meal prep, transformation reels.
- **Islamic & Spiritual:** Inspiring recitations, calligraphy b-roll, reflective landscapes.
- **Motivation & Mindset:** Iconic quotes, dark aesthetic cinema, discipline speeches.

---

### 2. Organizing Assets on Your Storage
- Do NOT download all 500,000 reels at once. Download by specific niche folders based on your content calendar.
- Create organized subfolders on your drive:
  - \`01_Hooks\` (first 2 seconds high-energy visuals)
  - \`02_B-Roll\` (contextual supporting clips)
  - \`03_Outros\` (calls to action, follow prompts)

---

### 3. The 3-Second Hook Customization Formula
To prevent social media algorithms from flagging content as repetitive or unoriginal, always customize ready reels:
1. **Swap the Opening Hook:** Replace the first 1.5 seconds of the pre-made reel with a fresh, dynamic clip or sound effect.
2. **Apply Custom Branding:** Add your personal or brand logo watermark in the corner (reduce opacity to 60-70% for a polished look).
3. **Change Audio Track:** Strip the original audio and attach a currently trending audio track directly inside Instagram or TikTok.
4. **Re-style Typography:** Add your unique font, brand primary colors, and custom animated caption presets.
5. **Subtle Color Tweaks:** Adjust temperature (+3), contrast (+5), and vignette (+5) in CapCut so the video fingerprint is entirely unique.

---

### 4. Batch Production Workflow
- Set aside 2 hours every Sunday to batch edit 14 reels for the upcoming week.
- Import 14 ready clips into one project timeline, apply your standardized brand template, insert daily hooks, and export all 14 files in one session.`
    },
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410016',
      module_id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410006',
      title: 'Premium Mobile Apps & PC Softwares Toolkit',
      subtitle: 'Setup guides for the 50 Mobile Apps and PC utilities included free with every plan',
      order_index: 0,
      content: `### 1. The Companion Creator Toolkit
In addition to CapCut Pro, every enrolment plan includes:
- **50 Premium Mobile Apps** (Android APK utilities, creative suites, design apps)
- **Premium PC Softwares** (Desktop audio, video, compression, and screen capture suites)

---

### 2. Key Categories of the 50 Mobile Apps
1. **Graphic & Thumbnail Creation Apps:**
   - Quick poster and thumbnail editors with thousands of unlocked design presets.
   - Vector cutout and background remover apps for creating high-CTR YouTube and Reel covers.
2. **Audio & Voice Enhancement Apps:**
   - Mobile studio voice recorders with built-in noise gates and pitch correctors.
   - Audio format transcoders for high-bitrate WAV export.
3. **Photo Retouching & AI Avatar Apps:**
   - HDR photo enhancers and aesthetic preset managers.
   - AI headshot generators for creator profile avatars.
4. **Productivity & Content Planners:**
   - Mobile content calendar apps, social media caption copywriters, and hashtag analyzers.

---

### 3. Key Categories of Premium PC Softwares
1. **Lossless Video Compression (HandBrake Studio Presets):**
   - Compress 2 GB 4K video files down to 80 MB without any visible loss in sharpness, making client uploads via Google Drive effortless.
2. **Advanced Audio Studio (Audacity with Studio Mastering Plugins):**
   - Multi-band equalization, compression, and studio limiter presets to give your mic voice radio broadcast quality.
3. **High-FPS Screen Recording (OBS Studio Vertical Suite):**
   - Pre-configured 1080x1920 60fps vertical canvas profiles for recording smartphone tutorials and software demonstrations.

---

### 4. Installation Guidelines & Safety
- Download all companion apps from the verified Google Drive links provided in your student portal.
- On Android, enable **Install from unknown sources** in security settings for approved apps.
- On Windows PC, run setup files as administrator.`
    },
    {
      id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410017',
      module_id: 'c9f4c3a1-7e82-4f91-b384-5a2d8e410007',
      title: 'Earning Methods with CapCut — How to Earn from Editing',
      subtitle: 'Monetization blueprint, client acquisition scripts, monthly retainers, and theme page automation',
      order_index: 0,
      content: `### 1. Four Proven Monetization Channels

#### Channel 1: Freelance Short-Form Video Editor
- **Target Audience:** Digital marketing agencies, business coaches, doctors, real estate realtors, fitness trainers, e-commerce brand owners.
- **The Retainer Model:**
  - Package A: 15 Reels / month — **Rs 15,000 to Rs 25,000 PKR**
  - Package B: 30 Reels / month — **Rs 35,000 to Rs 55,000 PKR**
  - With just 3 regular retainer clients, you can earn **Rs 80,000 to Rs 150,000+ PKR monthly**.

#### Channel 2: Faceless Theme Pages (Instagram & TikTok)
- Pick a high-engagement niche (e.g. AI tools, Luxury motivation, Business wisdom).
- Use the 500,000 Ready Reels library with custom hooks and trending audio.
- Post 2 to 3 reels daily consistently for 60 to 90 days.
- **Monetize via:**
  - Affiliate links in bio
  - Selling digital assets / bundles
  - Sponsored promo shoutouts (Rs 3,000 - Rs 10,000 per 24-hr story/post).

#### Channel 3: E-Commerce & Dropshipping Video Ads
- Dropshippers and Shopify store owners constantly need 3 to 5 video ad variations per product.
- Create 15-second hook-problem-solution video ads in CapCut.
- Charge **Rs 2,500 to Rs 5,000 PKR** per ad creative.

#### Channel 4: Local Business Outreach (WhatsApp / Direct Walk-in)
- Identify local restaurants, clothing boutiques, salons, and car detailing centers in your city with active Instagram accounts but poor reel quality.
- Edit 1 free sample reel for them using footage from their page.
- Send the sample with a polite pitch offering a monthly reel package.

---

### 2. Building a 30-Second Showreel Portfolio
- Do not send clients unedited raw videos.
- Create one punchy 30-second portfolio showreel demonstrating:
  - Dynamic caption animations with colored keyword highlights
  - Seamless speed ramps and optical flow slow-motion
  - Precise sound design and sound effects
  - Split-screen overlays and green screen keying
- Host your showreel on Google Drive or an Instagram creator account.

---

### 3. Word-for-Word Client Pitch Script (WhatsApp / DM)
\`\`\`text
Assalam-o-Alaikum [Client Name], umeed hai aap khairiyat se honge!

Maine aapka Instagram page dekha — aapka business aur content bohot zabardast hai. Lekin maine notice kiya ke aapke reels ki reach mazeed 3x barh sakti hai agar usme modern captions, sound design aur fast-paced pacing use ki jaye.

Maine aapke latest clip ka ek 15-second sample reel edit kiya hai modern hook aur sound effects ke sath: [Showreel Link]

Agar aap chahein to hum monthly basis par aapke liye 15 ya 30 high-engagement reels handle kar sakte hain, taake aap apne core business par focus karein aur social media reach hum automate karein.

Aapka is hawalay se kya khayal hai?
\`\`\`

---

### 4. Client Retention & Professional Delivery
- **Always take 50% to 100% advance** before commencing work on any retainer.
- Deliver work via clean Google Drive folders organized by date (\`Day 1 - Reel 1\`, etc.).
- Allow 2 rounds of minor revisions per clip.
- Always deliver on or ahead of deadline to build lasting trust.`
    }
  ];

  // 4. Insert modules
  console.log('Inserting 7 modules...');
  for (const m of modulesData) {
    const { error: modErr } = await sb.from('modules').upsert({
      id: m.id,
      course_id: CAPCUT_COURSE_ID,
      title: m.title,
      description: m.description,
      order_index: m.order_index,
      status: 'published',
      deleted_at: null,
    });
    if (modErr) {
      console.error('Error inserting module:', m.title, modErr);
    } else {
      console.log('  Module inserted:', m.title);
    }
  }

  // 5. Insert lessons & content blocks
  console.log('Inserting lessons & content blocks...');
  for (const l of lessonsData) {
    const { error: lessonErr } = await sb.from('lessons').upsert({
      id: l.id,
      module_id: l.module_id,
      title: l.title,
      subtitle: l.subtitle,
      description: l.subtitle,
      order_index: l.order_index,
      is_required: true,
      status: 'published',
      deleted_at: null,
    });
    if (lessonErr) {
      console.error('Error inserting lesson:', l.title, lessonErr);
      continue;
    }
    console.log('  Lesson inserted:', l.title);

    // Delete existing blocks for this lesson if any, then insert
    await sb.from('content_blocks').delete().eq('lesson_id', l.id);
    const { error: blockErr } = await sb.from('content_blocks').insert({
      lesson_id: l.id,
      type: 'text',
      content: { body: l.content },
      order_index: 0,
    });
    if (blockErr) {
      console.error('Error inserting block for lesson:', l.title, blockErr);
    } else {
      console.log('    Block inserted for lesson:', l.title);
    }
  }

  // 6. Assign course to active salesmen
  console.log('Assigning course to active salesmen...');
  const { data: salesmen } = await sb
    .from('profiles')
    .select('id')
    .eq('role', 'salesman')
    .eq('status', 'active');

  if (salesmen && salesmen.length > 0) {
    const assignmentRows = salesmen.map(s => ({
      course_id: CAPCUT_COURSE_ID,
      user_id: s.id,
      assigned_by: adminId,
    }));
    const { error: assignErr } = await sb
      .from('course_assignments')
      .upsert(assignmentRows, { onConflict: 'course_id,user_id' });
    if (assignErr) {
      console.warn('Assignment warning:', assignErr.message);
    } else {
      console.log(`  Assigned course to ${salesmen.length} active salesmen.`);
    }
  }

  console.log('--- CapCut Course Creation Completed Successfully! ---');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
