<div align="center">
  <img src=".github/assets/readme_logo.png" width="280" height="140" alt="Saarthi Logo" />
  <h1 align="center">Saarthi</h1>
  <p align="center">
    <strong>Voice-first Hinglish AI Co-Pilot for Indian Classrooms</strong>
  </p>
  <p align="center">
    A smart, hands-free teaching assistant that turns simple voice commands into rich, interactive smart-board lessons. Built specifically for Haryana government schools to bridge the language and tech gap.
  </p>

  <div>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  </div>
  <div style="margin-top: 5px;">
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white" alt="Hono" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/pgvector-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="pgvector" />
  </div>
  <div style="margin-top: 5px;">
    <img src="https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" alt="Clerk" />
    <img src="https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white" alt="Groq" />
    <img src="https://img.shields.io/badge/Edge_TTS-0078D4?style=for-the-badge&logo=microsoft&logoColor=white" alt="Edge TTS" />
    <img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render" />
    <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  </div>
</div>

---

## ✨ Features

- 🎙️ **Hands-Free Control:** Speak in Hinglish (Hindi + English) to trigger explanations and quizzes.
- 📺 **Interactive Smart Board:** Generates 9-part visual lessons with AI diagrams (Pollinations.ai), real-life Indian analogies, and LaTeX math.
- 🗣️ **Free Hindi TTS:** Natural female Hindi narration via Microsoft Edge TTS (`hi-IN-SwaraNeural`) — no API key needed.
- 🎤 **Groq Whisper STT:** Lightning-fast Hinglish speech recognition via `whisper-large-v3`, always outputs romanized Latin script.
- 📚 **RAG (Bring Your Own Textbook):** Upload NCERT PDFs. Saarthi chunks and embeds them using Google's `gemini-embedding-2`, answering strictly from the syllabus. Includes smart relevance filtering — irrelevant topics are never forced from the PDF.
- 🏆 **Interactive Quiz Mode:** Click-to-answer MCQs with live scoring (5 questions per quiz). Topic-locked — the AI stays on your chosen topic.
- 🛡️ **Unbreakable 3-Tier Fallback:** Groq `llama-3.3-70b` (primary) → OpenRouter free models (8 models) → Google Gemini 2.0 Flash. The classroom is never interrupted.
- 📊 **Teacher Analytics:** Tracks student participation, spoken seconds, and quiz accuracy with downloadable PDF/CSV reports.
- ✍️ **Dictate Mode:** Speak in Hinglish and get instant parallel output in Original, Hinglish (romanized), Hindi (Devanagari), and English.
- 🔐 **Google Authentication:** Powered by Clerk — sign in with Google or email. No passwords to remember.

---

## 🏗️ Architecture

```mermaid
graph TD
    subgraph Frontend
        UI[React UI + Tailwind]
        VD[VoiceDock STT]
        Player[Audio Player]
        CLK[Clerk Auth]
    end

    subgraph Backend
        API[Hono API]
        MW[Clerk Middleware]
        RAG[PDF Ingest]
    end

    subgraph Database
        PG[(PostgreSQL)]
        VEC[(pgvector)]
    end

    subgraph AI_Services
        GROQ[Groq LLM + Whisper]
        OR[OpenRouter Fallback]
        GEMINI[Google Gemini]
        POL[Pollinations.ai Images]
        EDGE[Edge TTS]
        EMB[Google Embeddings]
    end

    UI <-->|JSON over HTTP| API
    CLK -->|JWT Token| MW
    VD -->|Audio Blob| GROQ
    API -->|Primary| GROQ
    API -->|Secondary| OR
    API -->|Tertiary| GEMINI
    API -->|Text| EDGE
    UI -->|Direct URL| POL
    API -->|Upload| RAG
    RAG -->|Vector| EMB
    EMB --> VEC
    API <-->|Queries| PG
    EDGE -->|Audio Stream| Player
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL database with `pgvector` extension (local or [Neon](https://neon.tech))

### 1. Clone & Install
```bash
git clone https://github.com/njd07/Saarthi.git
cd Saarthi

# Install frontend dependencies
npm install

# Install backend dependencies
cd api
npm install
```

### 2. Environment Variables
Create `.env` in the root folder (frontend):
```env
VITE_API_URL=http://localhost:3001
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
```

Create `.env` in the `api/` folder (backend):
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/saarthi

# Authentication (Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key

# AI - Required (at least one)
GROQ_API_KEY=your_groq_key

# AI - Recommended for fallback
OPENROUTER_API_KEY=your_openrouter_key
GEMINI_API_KEY=your_google_ai_studio_key

PORT=3001
FRONTEND_URL=http://localhost:5173
```

### 3. Initialize Database
**⚠️ NEON DB USERS:** Enable `pgvector` extension from your Neon Dashboard → Extensions tab before running the setup.

```bash
cd api
npm run db:init
```

### 4. Run Servers
**Backend:**
```bash
cd api
npm run dev
```

**Frontend:**
```bash
# In a new terminal, from the project root:
npm run dev
```
Visit `http://localhost:5173`. Sign in with Google or create an account via Clerk.

---

## ☁️ Deployment

**⚠️ NOTE FOR EVALUATORS:** Built using Render's free tier. If the app takes 10-20 seconds to respond initially, the backend container is just waking up from a cold sleep. Please give it a moment! Clerk authentication works independently — login/signup will always work instantly even when the backend is cold.

### Backend (Render)
1. Push the repository to GitHub.
2. In Render, create a new **Web Service**.
3. Connect your GitHub repository.
4. Set the **Root Directory** to `api`.
5. Set the **Build Command** to `npm install && npm run build`.
6. Set the **Start Command** to `npm start`.
7. Add all env vars from your `api/.env` file (including `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`).

### Frontend (Vercel)
1. In Vercel, import the same GitHub repository.
2. Leave the root directory as the default.
3. Set Environment Variables:
   - `VITE_API_URL=https://your-render-app-url.onrender.com`
   - `VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key`
4. Deploy.

### Clerk Setup
1. Go to [clerk.com](https://clerk.com) and create a free application.
2. Enable **Email** and **Google** sign-in methods.
3. Copy the Publishable Key and Secret Key into your environment variables.
4. Clerk handles all authentication independently — it does NOT depend on your backend being awake. Users can always sign in even during backend cold starts.

---

## 🤝 Contributing

Contributions are welcome! This project was built to empower under-resourced classrooms.
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  <p>Built with ❤️ for Indian Educators.</p>
</div>
