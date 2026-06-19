<div align="center">
  <img src="public/logo.png" width="80" alt="Saarthi Logo" />
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
    <img src="https://img.shields.io/badge/Gemini_2.0-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
    <img src="https://img.shields.io/badge/ElevenLabs-000000?style=for-the-badge&logo=elevenlabs&logoColor=white" alt="ElevenLabs" />
    <img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render" />
    <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  </div>
</div>

---

## ✨ Features

- 🎙️ **Hands-Free Control:** Speak in Hinglish (Hindi + English) to trigger explanations, quizzes, and activities.
- 📺 **Interactive Smart Board:** Generates 9-part visual lessons complete with custom diagrams (via Pollinations.ai), real-life Indian analogies, and LaTeX math formatting.
- 💬 **High-Quality TTS:** Real-time, expressive Hindi/English narration using ElevenLabs, with a seamless fallback to native browser Web Speech API.
- 📚 **Strict RAG (Bring Your Own Textbook):** Upload NCERT PDFs. Saarthi chunks and embeds them using Google's `text-embedding-004`, allowing the AI to answer strictly from the syllabus.
- 🛡️ **Resilient Fallback Engine:** Primary requests go to **Google Gemini 2.0 Flash**. If rate-limited, the backend silently cascades through a 5-model OpenRouter chain (DeepSeek, Llama 3.3, Qwen) ensuring the classroom is never interrupted.
- 📊 **Teacher Analytics:** Tracks student participation, spoken seconds, and quiz accuracy. Generates downloadable PDF/CSV reports.

---

## 🏗️ Architecture

```mermaid
graph TD
    subgraph Frontend
        UI[React UI + Tailwind]
        VD[VoiceDock STT]
        Player[Audio Player]
    end

    subgraph Backend
        API[Hono API]
        Auth[JWT Auth]
        RAG[PDF Ingest & Chunking]
    end

    subgraph Database
        PG[(PostgreSQL)]
        VEC[(pgvector)]
    end

    subgraph AI_Services
        GEMINI[Google Gemini 2.0]
        OR[OpenRouter Fallback]
        POL[Pollinations.ai Images]
        EL[ElevenLabs TTS]
        EMB[Google Embeddings]
    end

    UI <-->|JSON over HTTP| API
    VD -->|Web Speech API| UI
    API -->|Prompt| GEMINI
    API -->|Fallback| OR
    API -->|Text| EL
    API -->|Prompt| POL
    API -->|Upload| RAG
    RAG -->|Vector| EMB
    EMB --> VEC
    API <-->|Queries| PG
    EL -->|Audio Stream| Player
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL database (local or hosted)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/saarthi.git
cd saarthi

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
```

Create `.env` in the `api/` folder (backend):
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/saarthi
JWT_SECRET=your_super_secret_jwt_string

# Required for AI
GEMINI_API_KEY=your_google_ai_studio_key

# Optional (but recommended for full experience)
OPENROUTER_API_KEY=your_openrouter_key
ELEVENLABS_API_KEY=your_elevenlabs_key

PORT=3001
FRONTEND_URL=http://localhost:5173
```

### 3. Initialize Database
**⚠️ CRITICAL WARNING FOR NEON DB USERS:** 
If you are using Neon.tech for your Postgres database, you **MUST** go to your Neon Project Dashboard -> Extensions tab and click **"Enable pgvector"** before running the setup below. The script will fail if the extension is not enabled in the Neon dashboard first!

Ensure your Postgres server is running (or your Neon URL is in the `.env`), then execute:
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
Visit `http://localhost:5173`. Create a new account or click "Create demo admin account" on the login page.

---

## ☁️ Deployment

**⚠️ NOTE FOR EVALUATORS:** Built using Render's free tier. If the app takes 30-50 seconds to respond initially, the backend container is just waking up from a cold sleep. Please give it a moment!

### Backend (Render)
1. Push the repository to GitHub.
2. In Render, create a new **Web Service**.
3. Connect your GitHub repository.
4. Set the **Root Directory** to `api`.
5. Set the **Build Command** to `npm install && npm run build`.
6. Set the **Start Command** to `npm start`.
7. Go to the **Environment** tab and add all the variables from your `api/.env` file.
8. If asked, choose **Ohio (US East)** as your region (matches the Neon DB region).
9. Render will automatically build and deploy.

### Frontend (Vercel)
1. In Vercel, import the same GitHub repository.
2. Leave the root directory as the default (the root of the repo).
3. Set the Environment Variable: `VITE_API_URL=https://your-render-app-url.onrender.com`
4. Deploy. The `vercel.json` ensures client-side routing works perfectly.

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
