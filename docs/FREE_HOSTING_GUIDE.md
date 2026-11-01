# Devora — 100% Free-Tier Hosting Guide (Vercel + Render + Firebase Spark)

Devora is architected to run completely on **$0/month free tiers** without Docker or paid persistent disks.

---

## Architecture on Free Tiers

| Layer | Free Provider | Plan | Storage / Persistence Strategy |
|-------|---------------|------|--------------------------------|
| **Frontend (Next.js 16)** | **Vercel** | Hobby ($0/mo) | Global Edge CDN, automatic GitHub deploys from `frontend/` |
| **Backend + Agent (FastAPI + LangGraph)** | **Render** | Free Web Service ($0/mo) | Ephemeral `/tmp/devora/workspaces` + automatic **Cloud Firestore** workspace metadata & file snapshot sync |
| **Database & Auth** | **Firebase** | Spark Plan ($0/mo) | Firebase Auth + Cloud Firestore (`rapid-shift-r8chg` / `ai-studio-1c7f4661-dbcb-4537-bd88-5e63b84c93f3`) |
| **LLM Synthesis** | **Google AI Studio** | Free Tier ($0/mo) | `GEMINI_API_KEY` (`gemini-2.5-flash` / `gemini-2.5-pro`) |

---

## Step 1: Deploy Backend on Render (Free Web Service)

1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign in with your GitHub account (`Sanjai-225`).
2. Click **New +** → **Blueprint** (or **Web Service**) and select the `Sanjai-225/devora` repository (`testing` or `main` branch).
3. Render will automatically detect `/render.yaml` with:
   - **Plan**: `Free`
   - **Build Command**: `pip install --upgrade pip && pip install -r backend/requirements.txt`
   - **Start Command**: `PYTHONPATH=.:backend uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}`
   - **Workspaces Directory**: `/tmp/devora/workspaces` (no paid Render Disk required!)
4. In the Render dashboard **Environment** tab, add:
   - `GEMINI_API_KEY`: Your free Google AI Studio API key
   - `CORS_ORIGINS`: `http://localhost:3000,https://your-vercel-domain.vercel.app`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: *(Optional)* Paste your Firebase Admin service account JSON string on one line.
5. Copy your live Render URL (e.g., `https://devora-backend.onrender.com`).

---

## Step 2: Deploy Frontend on Vercel (Free Hobby Plan)

1. Go to [https://vercel.com/new](https://vercel.com/new) and import `Sanjai-225/devora`.
2. Set **Root Directory** to `frontend`.
3. Framework Preset will auto-detect **Next.js**.
4. Add the following **Environment Variables** in Vercel:
   - `NEXT_PUBLIC_API_URL` = `https://devora-backend.onrender.com/api/v1`
   - `NEXT_PUBLIC_WS_URL` = `wss://devora-backend.onrender.com/api/v1`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `rapid-shift-r8chg`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = `rapid-shift-r8chg.firebasestorage.app`
5. Click **Deploy**. Your Devora frontend will be live on `https://<your-project>.vercel.app`!

---

## How Free-Tier Cold Starts & Ephemeral Storage Are Handled

- **Zero Paid Disks**: Render's Free Web Service does not allow paid persistent disks. Devora writes active workspace files and SQLite checkpoints to `/tmp/devora/` and mirrors workspace file trees & metadata to your free **Cloud Firestore** database (`/projects/{projectId}/workspaces/{workspaceId}`).
- **Graceful Cold-Start Fallback**: Render Free instances sleep after 15 minutes of inactivity and take ~20–30 seconds to wake up on the first request. Devora's Next.js frontend includes built-in local state fallbacks and in-browser Sandpack previews so the UI stays responsive even while the Render backend wakes up.
