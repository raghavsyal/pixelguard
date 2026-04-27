# PixelGuard 🛡️
**AI-Powered Digital Art Protection for Independent Creators**
> Google Solution Challenge 2026 · Open Innovation · Digital Asset Protection

---

## How to Run Locally in VS Code

### Step 1 — Install prerequisites

Make sure you have these installed:
- [Python 3.11+](https://www.python.org/downloads/)
- [VS Code](https://code.visualstudio.com/)
- VS Code extension: **Python** (by Microsoft) — install from Extensions tab

---

### Step 2 — Open the project

1. Open VS Code
2. `File → Open Folder` → select the `pixelguard` folder
3. Open the terminal inside VS Code: `Terminal → New Terminal`

---

### Step 3 — Create a virtual environment

In the VS Code terminal, run:

```bash
# Create virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# You should see (venv) at the start of your terminal line
```

---

### Step 4 — Install dependencies

```bash
pip install -r requirements.txt
```

This will take 1-2 minutes. It installs Streamlit, Firebase, Gemini, and all other libraries.

---

### Step 5 — Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** → name it `pixelguard` → Continue
3. Disable Google Analytics (not needed) → Create project
4. In the left sidebar: **Build → Firestore Database → Create database**
   - Choose **Start in test mode**
   - Pick a region (asia-south1 for India)
5. Go to **Project Settings** (gear icon) → **Service Accounts**
6. Click **Generate new private key** → Download the JSON file
7. Rename it to `serviceAccountKey.json` and place it in the `pixelguard/` folder

> ⚠️ Never upload serviceAccountKey.json to GitHub. It is in .gitignore already.

---

### Step 6 — Get your API keys

#### Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API key** → Copy it

#### Cloud Vision API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Make sure you're in the same project as Firebase
3. Search for **Cloud Vision API** → Enable it
4. Go to **APIs & Services → Credentials → Create Credentials → API Key**
5. Copy the key

#### Custom Search API + CX
1. In Cloud Console, search for **Custom Search API** → Enable it
2. Create another API key (or reuse same one)
3. Go to [Programmable Search Engine](https://programmablesearchengine.google.com)
4. Click **Add** → Name: PixelGuard → enable **Search the entire web** → Create
5. Click on your search engine → Copy the **Search engine ID (CX)**

---

### Step 7 — Create your .env file

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` in VS Code and fill in your keys:
   ```
   GOOGLE_API_KEY=AIza...
   VISION_API_KEY=AIza...
   CUSTOM_SEARCH_API_KEY=AIza...
   CUSTOM_SEARCH_CX=a1b2c3d4e5...
   ```
3. For `FIREBASE_CREDS_JSON`, run this in terminal to convert your JSON to one line:
   ```bash
   python -c "import json; print(json.dumps(json.load(open('serviceAccountKey.json'))))"
   ```
   Paste the output as the value for `FIREBASE_CREDS_JSON` in your `.env`.

---

### Step 8 — Run the app

```bash
streamlit run app.py
```

Your browser will open automatically at `http://localhost:8501`

---

## Project Structure

```
pixelguard/
├── app.py                  ← Full Streamlit application (all pages)
├── requirements.txt        ← Python dependencies
├── Dockerfile              ← For Cloud Run deployment
├── .env.example            ← Template for environment variables
├── .env                    ← Your actual keys (DO NOT commit this)
├── serviceAccountKey.json  ← Firebase credentials (DO NOT commit this)
└── README.md
```

---

## Deploy to Google Cloud Run

Once your app works locally:

```bash
# Set your GCP project ID
PROJECT_ID="your-gcp-project-id"

# Build Docker image
docker build -t gcr.io/$PROJECT_ID/pixelguard .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/pixelguard

# Deploy to Cloud Run
gcloud run deploy pixelguard \
  --image gcr.io/$PROJECT_ID/pixelguard \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_API_KEY=xxx,VISION_API_KEY=xxx,CUSTOM_SEARCH_API_KEY=xxx,CUSTOM_SEARCH_CX=xxx,FIREBASE_CREDS_JSON=xxx"
```

Your live URL will be: `https://pixelguard-xxxx-as.a.run.app`

---

## Submission Checklist

- [ ] App runs locally without errors
- [ ] Register at least one artwork and download its certificate
- [ ] Run a scan and see violations appear
- [ ] Deploy to Cloud Run — get live URL
- [ ] Push code to public GitHub repo
- [ ] Take screenshots for PPTX Slide 11
- [ ] Record 3-minute demo video
- [ ] Update PPTX Slide 2 (name + college) and Slide 13 (links)
- [ ] Submit on hack2skill portal

---

## Google Stack Used

| Service | Purpose |
|---|---|
| Gemini 1.5 Pro | Plain-language violation analysis |
| Cloud Vision API | Web detection — finds copies across the internet |
| Google Custom Search API | Web-wide image discovery |
| Firebase Firestore | Asset registry with server-side timestamps |
| Google Cloud Run | Serverless deployment |
