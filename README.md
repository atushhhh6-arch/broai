# BRO — your AI homie 💙

**A Windows + macOS desktop AI companion that remembers your goals and texts first.** Sky-blue UI, original SVG character art, animated launch screen, three-step conversational onboarding, conversation history, goals, native notifications, quiet hours, system tray, and an optional Supabase + OpenAI backend.

> This repository contains a functional desktop **local preview** plus cloud integration. The preview's replies are intentionally scripted and visibly labeled. Real AI and server-triggered check-ins require the credentials and deployment steps below. There are no API keys in the client code.

![BRO mascot](src/assets/bro-mascot.svg)

## Requirements

- Node.js 22 or later, npm
- Windows 10/11 or recent macOS
- Optional for live AI: Supabase project, OpenAI API account

## Start on your computer

```bash
npm install
npm run dev
```

The app opens with an animated blue splash, then onboarding. Without `.env`, it runs in local preview mode, including chats, editable goals, settings, tray integration, and on-device check-in/notification logic while the app is running.

Run a production renderer/main build:

```bash
npm run build
```

Package on the target OS:

```bash
npm run pack:win    # Run on Windows
npm run pack:mac    # Run on macOS
```

Or use **GitHub → Actions → Build desktop installers → Run workflow** after pushing the project; each platform job uploads its installer under **Artifacts**. The build workflow runs Windows and macOS separately. These unsigned beta builds may trigger OS security warnings. Public distribution should use a Windows code-signing certificate and Apple Developer ID signing/notarization. Never distribute a build as verified/signed unless it actually is.

## Turn on live AI (Supabase + OpenAI)

1. Create a Supabase project. In **Authentication → Providers**, enable **Anonymous sign-ins** for this private-beta build. Anonymous sessions are tied to their local session; an email/login upgrade is recommended before public launch.
2. In Supabase SQL Editor, apply `supabase/migrations/202609230001_initial.sql` in its entirety. It enables RLS for profiles, goals, conversations, messages; only your user may read their own data. AI message writes are server-side.
3. Install Supabase CLI, log in, and link your project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY OPENAI_MODEL=gpt-4.1-mini PROACTIVE_CRON_SECRET=YOUR_LONG_RANDOM_SECRET
npx supabase functions deploy companion
npx supabase functions deploy proactive --no-verify-jwt
```

4. Copy `.env.example` to `.env`. Fill in only the public project URL and **anon/publishable** key:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

5. Rebuild (`npm run dev`, or package installer). Live chats now call the `companion` Edge Function, which authenticates the user, reads their own context, calls OpenAI server-side, then stores the response. The actual OpenAI key and Supabase service-role key must **never** be prefixed `VITE_`, committed, or bundled into the application.

6. For check-ins when the app is completely closed, configure your GitHub repository's **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` |
| `PROACTIVE_CRON_SECRET` | The same random secret configured in Supabase |
| `VITE_SUPABASE_URL` | Public Supabase project URL for installer builds |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon/publishable key for installer builds |

`.github/workflows/proactive.yml` requests check-ins every 30 minutes. GitHub schedules are **best effort** and can be delayed. For a production service, use a durable queue and dedicated scheduler instead. The MVP scans up to 1,000 enrolled users in a run; paginate/queue before scaling. If the app is quit, messages are stored in Supabase and appear at its next launch; a *native desktop popup* requires the background app process to be running.

## How BRO decides to message

1. An opt-in `proactive` setting and notification setting must both be enabled.
2. Respect the local user's timezone and quiet hours.
3. A DB-atomic claim throttles frequency: Chill (8h), Balanced (4h), Chaotic (90m).
4. The AI sees stored goals and recent chat, then writes one short, relevant message or chooses `SKIP`.
5. On an active app, the user sees a native notification. On a closed app, the server saves the message for next open.

No system-wide screen capture, mic, webcam, browsing, or computer control is implemented. BRO never needs those permissions to chat.

## Structure

```text
electron/                       Main process, tray, notifications, preload bridge
src/App.tsx                     Sky-blue app, onboarding, chats, goals, settings
src/styles.css                  Responsive animations and design system
src/assets/                     Original mascot, icon and sky artwork (SVG)
src/lib/model.ts                Typed user memory and local preview behavior
src/lib/cloud.ts                Auth and Supabase cloud integration
supabase/migrations/            Row-level security and check-in claim function
supabase/functions/companion/   Authenticated AI chat and check-in requests
supabase/functions/proactive/   Authorized scheduled proactive processing
.github/workflows/             CI installers + scheduled check-ins
build/                          Original PNG and ICO app icons
```

## Known beta limitations

- Local preview messages are scripted, **not** OpenAI responses.
- Cloud mode requires manual Supabase/OpenAI setup, anonymous sign-in, and paid API usage. The user's anonymous account may be lost if local auth state is cleared; add email or OAuth account linking before launch.
- No installer signatures, notarization, updater service, abuse dashboard, or usage billing is configured yet.
- Chat uploads/attachments, voice and screen awareness are intentionally out of scope for the first version.
- Offline chat history uses localStorage for preview; live chat is stored in Supabase.
- The renderer imports Google Fonts when the network permits and falls back to system fonts offline.

## Troubleshooting

- **Preview mode?** Populate both `VITE_` variables and rebuild.
- **Anonymous sign-in failed?** Enable anonymous sign-ins in Supabase Auth settings.
- **Function not found?** Deploy `companion` and `proactive`, and confirm you linked the right project.
- **AI request failed?** Check Edge Function logs, your OpenAI key/model access and API usage limits.
- **No notifications?** Enable notifications in BRO and your operating system; keep BRO running in the tray.

BRO is a prototype companion, not a human or a replacement for real-world support. Keep personal context to what users choose to share, disclose data retention and offer account deletion before public launch.