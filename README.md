# PixelGuard 🛡️ 
**AI-Powered Digital Art Protection for Independent Creators**

> Google Solution Challenge 2026 · Open Innovation · Digital Asset Protection
> 
> 🌐 **Live Demo:** [https://pixelguard-nine.vercel.app](https://pixelguard-nine.vercel.app)

---

## The Problem
Digital artists face widespread, unauthorized reuse of their work online. Anyone can download an image, instantly remove watermarks using modern AI tools, and resell the artwork on commercial platforms like Etsy or Redbubble. 

The original creator currently has no way to **prove** they made it first, **detect** where it is being misused, or **take meaningful action** without an accessible, unified tool built for independent creators.

## The Solution
PixelGuard is a full-stack platform that protects indie digital artists in three simple steps:

1. **Prove** — Upload artwork → get a tamper-proof PDF ownership certificate with a Firebase server timestamp + SHA-256 + pHash fingerprint.
2. **Detect** — Scan the internet for stolen, cropped, recoloured, or watermark-removed copies using Cloud Vision AI.
3. **Act** — Review violations with Gemini AI analysis, mark actions, and download a ready-to-send DMCA takedown report.

---

## Architecture

Both the frontend and backend connect to the same Firebase Firestore database.

* **Frontend (React):** Handles all UI including Login, Dashboard, My Artworks, Upload, Scan, Violations, Certificates, and DMCA. Hosted on Vercel.
* **Backend (FastAPI):** Handles all heavy processing including fingerprinting, Vision API integration, Gemini analysis, and PDF generation. Deployed on Google Cloud Run.
* *(Note: No Streamlit in the user flow — it remains in the repo as a legacy fallback only).*

---

## Google Stack

| Service | Purpose |
|---|---|
| **Gemini 1.5 Pro** | Plain-language violation analysis per match. |
| **Cloud Vision API** | Web detection — finds exact and partial copies across the internet. |
| **Firebase Firestore** | Asset registry with server-side, tamper-proof timestamps. |
| **Firebase Hosting / Vercel** | React frontend hosting. |
| **Google Cloud Run** | FastAPI backend deployment. |

---

## API Endpoints (FastAPI)

| Method | Endpoint | What it does |
|---|---|---|
| `POST` | `/api/register` | Originality check → fingerprint → Firestore → returns asset data |
| `GET` | `/api/certificate/{asset_id}` | Returns ownership certificate PDF |
| `POST` | `/api/scan` | Cloud Vision web detection → returns matches |
| `POST` | `/api/analyse` | Gemini analysis for one match URL |
| `POST` | `/api/dmca` | Generates DMCA report PDF |
| `GET` | `/api/artworks/{email}` | Returns all artworks for a user |
| `GET` | `/api/verify/{asset_id}` | Public verification — no auth needed |

---

## Running Locally

### 1. Backend (FastAPI)

~~~bash
cd backend

# Activate venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
~~~
* **API runs at:** `http://localhost:8000`
* **Swagger docs at:** `http://localhost:8000/docs`

### 2. Frontend (React)

~~~bash
cd frontend
npm install
npm start
~~~
* **React runs at:** `http://localhost:3000`

### 3. Environment Variables

Create `.env` files in both directories before running.

**`backend/.env`:**
~~~env
GOOGLE_API_KEY=           # Gemini API key
VISION_API_KEY=           # Cloud Vision API key
CUSTOM_SEARCH_API_KEY=    # Google Custom Search API key
CUSTOM_SEARCH_CX=         # Search Engine ID
FIREBASE_CREDS_JSON=      # Firebase service account JSON (one line)
REACT_APP_URL=http://localhost:3000
~~~

**`frontend/.env.local`:**
~~~env
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=pixelguard-5bc93.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=pixelguard-5bc93
REACT_APP_FIREBASE_STORAGE_BUCKET=pixelguard-5bc93.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_API_URL=http://localhost:8000
~~~

---

## Deployment

### Frontend → Vercel
Currently deployed at `https://pixelguard-nine.vercel.app`. For redeployment:

~~~bash
cd frontend
npm run build
# Push to GitHub → Vercel auto-deploys
~~~
*Make sure to set all `REACT_APP_*` variables in your Vercel project settings.*

### Backend → Google Cloud Run
~~~bash
cd backend
PROJECT_ID="pixelguard-5bc93"

# Build and push the docker image
docker build -t gcr.io/$PROJECT_ID/pixelguard-backend .
docker push gcr.io/$PROJECT_ID/pixelguard-backend

# Deploy to Cloud Run
gcloud run deploy pixelguard-backend \
  --image gcr.io/$PROJECT_ID/pixelguard-backend \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_API_KEY=xxx,VISION_API_KEY=xxx,FIREBASE_CREDS_JSON=xxx,REACT_APP_URL=https://pixelguard-nine.vercel.app"
~~~

---

## Known Limitations (Future Work)

* **No real authentication:** Email is currently used as a session identifier only, without passwords. Phase 3 will introduce proper Google Sign-In via Firebase Auth.
* **Image not stored:** Users must re-upload the artwork file for each scan. A future version will store the image in Firebase Storage and auto-fetch it during scans.
* **SHA-256 limitation:** This proves file *integrity*, not creation *priority*. Creators should maintain dated drafts as additional evidence.
* **Vision API CDN URLs:** Some matches return image CDN links rather than the actual page URLs. This is currently mitigated via the `clean_vision_results()` filter.
* **Automated scans:** Scanning is currently manual. Future versions will utilize Cloud Scheduler for periodic background scanning.

---

## Project Structure

~~~text
pixelguard/
├── backend/
│   ├── main.py               ← FastAPI — all 7 endpoints
│   ├── app.py                ← Streamlit (legacy fallback)
│   ├── services/
│   │   ├── fingerprint.py    ← SHA-256, pHash
│   │   ├── vision.py         ← Cloud Vision + URL cleaning + originality check
│   │   ├── gemini.py         ← Gemini 1.5 Pro analysis
│   │   ├── firebase.py       ← Firestore operations
│   │   └── pdf.py            ← Certificate + DMCA PDF generation
│   ├── requirements.txt
│   └── Dockerfile
│
└── frontend/
    ├── src/
    │   ├── api.js            ← All API calls in one centralized file
    │   ├── App.js            ← Application Router
    │   ├── firebase.js       ← Firebase configuration
    │   ├── context/
    │   │   └── AuthContext.js
    │   ├── components/
    │   │   ├── Layout.js
    │   │   ├── Sidebar.js
    │   │   └── TopBar.js
    │   └── pages/
    │       ├── Login.js
    │       ├── Dashboard.js
    │       ├── MyArtworks.js
    │       ├── Upload.js
    │       ├── Scan.js
    │       ├── Violations.js
    │       ├── Certificates.js
    │       └── DMCA.js
    ├── package.json
    └── firebase.json
~~~
