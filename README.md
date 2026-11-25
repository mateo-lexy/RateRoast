# RateRoast 🔥

**Brutally honest AI freelancer profile auditor & verified co-builder matchmaker.**  
Built by a duo team for **SLAY HACKS 2026**.

---

## 💡 Overview
Thousands of skilled freelancers underprice themselves and lose high-paying clients because their bios and cold pitches rely on generic buzzwords (*"passionate"*, *"hardworking"*, *"high quality"*) instead of measurable business outcomes. Meanwhile, founders struggle to filter genuine talent from noise.

**RateRoast** solves both problems by acting as a cynical, high-paying tech client. Powered by Google Gemini, it ruthlessly audits freelancer pitches, evaluates pricing strategy, rewrites weak offers into high-converting copy, and connects top-scoring builders in a live verified directory.

---

## ✨ Key Features
- **AI Pitch & Rate Audit Engine:** Analyzes your role, hourly/project rate, and bio in under 2 seconds, returning a **Sellability Score (0–100)**, a **3-point Brutal Reality Check**, and a **Pricing Verdict**.
- **High-Converting Pitch Rewriter:** Automatically transforms generic service descriptions into sharp, outcome-driven pitches ready for cold outreach.
- **Verified Co-Builder Directory:** Builders who score **75+** can publish their audited profile directly into a live Firebase Firestore directory.
- **Direct Collaboration Pings:** Founders and peers can browse verified profiles and send instant collaboration requests.
- **Tactile Glass-Minimalism UI:** Mobile-first dark glassmorphism interface with iOS-inspired spring physics, GSAP micro-interactions, and Lenis inertial smooth scrolling.

---

## 🛠️ Tech Stack
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Typography & Motion:** Rubik Font, GSAP, Lenis Smooth Scroll, Lucide Icons
- **AI Engine:** Google Gemini API (`gemini-2.5-flash` / `gemini-2.5-flash-lite` via official `@google/genai` server-side SDK)
- **Database & Hosting:** Firebase Firestore & Vercel

---

## 🚀 Run Locally

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory (refer to `.env.example`) and add your Google Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Start the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 👥 Team (Duo)
- **[Your Name / Handle]** — Full-Stack Architecture, AI Prompt Engineering & Frontend Motion
- **[Teammate Name / Handle]** — Product Strategy, QA Testing & Presentation

---

## 📄 License
Built for **SLAY HACKS 2026**. Open-source under the MIT License.