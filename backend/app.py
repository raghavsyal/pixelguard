import streamlit as st
import hashlib, io, json, datetime, os, base64, re
import requests
from PIL import Image
import imagehash
from dotenv import load_dotenv

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

import firebase_admin
from firebase_admin import credentials, firestore
import google.generativeai as genai

load_dotenv()

# ── ENV ───────────────────────────────────────────────────────────────────────
GOOGLE_API_KEY        = os.getenv("GOOGLE_API_KEY", "")
VISION_API_KEY        = os.getenv("VISION_API_KEY", "")
CUSTOM_SEARCH_API_KEY = os.getenv("CUSTOM_SEARCH_API_KEY", "")
CUSTOM_SEARCH_CX      = os.getenv("CUSTOM_SEARCH_CX", "")
FIREBASE_CREDS_JSON   = os.getenv("FIREBASE_CREDS_JSON", "")
REACT_APP_URL         = os.getenv("REACT_APP_URL", "http://localhost:3000")

# PAGE CONFIG 
st.set_page_config(
    page_title="PixelGuard Scanner",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

st.markdown("""
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');

  html, body, [class*="css"] { font-family: 'Roboto', sans-serif !important; }
  .stApp { background-color: #F8F9FA !important; }

  /* Top bar */
  .pg-topbar {
    display: flex; align-items: center; justify-content: space-between;
    background: #fff; border-bottom: 1px solid #E0E0E0;
    padding: 12px 24px; margin: -1rem -1rem 2rem -1rem;
  }
  .pg-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .pg-logo-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: linear-gradient(135deg, #1A73E8, #0D9488);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; color: white;
  }
  .pg-logo-text { font-size: 1.1rem; font-weight: 600; color: #202124; }
  .pg-back-btn {
    background: #F1F3F4; border: none; border-radius: 20px;
    padding: 8px 16px; font-size: 0.875rem; color: #5F6368;
    cursor: pointer; font-family: 'Roboto', sans-serif;
    text-decoration: none; display: inline-block;
  }
  .pg-back-btn:hover { background: #E8EAED; color: #202124; }

  /* Cards */
  .pg-card {
    background: #fff; border-radius: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    padding: 24px; margin-bottom: 16px;
  }
  .pg-card-title { font-size: 1.1rem; font-weight: 600; color: #202124; margin-bottom: 16px; }

  /* Risk badges */
  .badge-high   { background:#FCE8E6; color:#C62828; padding:3px 10px; border-radius:8px; font-size:0.75rem; font-weight:600; }
  .badge-medium { background:#FEF3C7; color:#92400E; padding:3px 10px; border-radius:8px; font-size:0.75rem; font-weight:600; }
  .badge-low    { background:#E6F4EA; color:#1B5E20; padding:3px 10px; border-radius:8px; font-size:0.75rem; font-weight:600; }

  /* Info box */
  .pg-info { background:#E8F0FE; border-radius:12px; padding:16px; margin-bottom:16px; }
  .pg-info p { color:#1565C0; font-size:0.875rem; margin:0; line-height:1.6; }
  .pg-warn { background:#FEF3C7; border-radius:12px; padding:16px; margin-bottom:16px; }
  .pg-warn p { color:#78350F; font-size:0.875rem; margin:0; line-height:1.6; }

  /* Buttons */
  .stButton > button {
    border-radius: 24px !important;
    font-family: 'Roboto', sans-serif !important;
    font-weight: 500 !important;
    text-transform: none !important;
  }

  /* Hide Streamlit default header/footer */
  #MainMenu { visibility: hidden; }
  footer    { visibility: hidden; }
  header    { visibility: hidden; }
</style>
""", unsafe_allow_html=True)

# FIREBASE 
@st.cache_resource
def init_firebase():
    if not firebase_admin._apps:
        if FIREBASE_CREDS_JSON:
            cred = credentials.Certificate(json.loads(FIREBASE_CREDS_JSON))
        else:
            cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
    return firestore.client()

try:
    db = init_firebase()
    FIREBASE_OK = True
except Exception as e:
    FIREBASE_OK = False
    db = None

#  GEMINI 
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-1.5-pro")
else:
    gemini_model = None

#  SESSION — read from URL params (React handoff) 
params = st.query_params
url_email = params.get("email", "")
url_name  = params.get("name",  "")
url_page  = params.get("page",  "upload")
url_asset = params.get("asset_id", "")

# Store in session state
if url_email and not st.session_state.get("user_email"):
    st.session_state.user_email = url_email
    st.session_state.user_name  = url_name
if not st.session_state.get("user_email"):
    st.session_state.user_email = ""
    st.session_state.user_name  = ""

#  TOP BAR 
st.markdown(f"""
<div class="pg-topbar">
  <div class="pg-logo">
    <div class="pg-logo-icon">🛡️</div>
    <span class="pg-logo-text">PixelGuard</span>
  </div>
  <a href="{REACT_APP_URL}/dashboard" class="pg-back-btn">← Back to Dashboard</a>
</div>
""", unsafe_allow_html=True)

#  HELPERS 
def compute_sha256(b): return hashlib.sha256(b).hexdigest()
def compute_phash(img): return str(imagehash.phash(img))

def clean_vision_results(vision_results):
    cleaned_results = []
    for item in vision_results:
        url = item.get("url", "") 
        if not url.startswith(("http://", "https://")): continue
        if url.endswith("..."): continue
        if "data:image" in url or "x-raw-image" in url: continue
        cleaned_results.append(item)
    return cleaned_results

def detect_platform(url):
    for k, v in {"etsy":"Etsy","redbubble":"Redbubble","instagram":"Instagram",
                 "pinterest":"Pinterest","twitter":"Twitter/X","x.com":"Twitter/X",
                 "facebook":"Facebook","deviantart":"DeviantArt","artstation":"ArtStation"}.items():
        if k in url: return v
    return "Other"

def risk_label(sim):
    if sim >= 80: return "High Risk"
    if sim >= 60: return "Medium Risk"
    return "Low Risk"

def cloud_vision_detect(image_bytes):
    if not VISION_API_KEY:
        return {"error": "VISION_API_KEY not set"}
    url = f"https://vision.googleapis.com/v1/images:annotate?key={VISION_API_KEY}"
    payload = {"requests": [{"image": {"content": base64.b64encode(image_bytes).decode()},
               "features": [{"type": "WEB_DETECTION", "maxResults": 20}]}]}
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return r.json()["responses"][0].get("webDetection", {})
    except Exception as e:
        return {"error": str(e)}

def gemini_analyse(desc, match_url, title, sim):
    if not gemini_model:
        return "Gemini not configured — add GOOGLE_API_KEY to .env"
    prompt = f"""You are a copyright assistant helping an indie digital artist.
Artwork: "{desc}"
Suspected infringing URL: {match_url}
Page title: "{title}"
Visual similarity: {sim}%
Write 3 concise sentences: (1) what the violation likely is, (2) how serious it is, (3) the single best next step. No jargon, no bullets."""
    try:
        return gemini_model.generate_content(prompt).text.strip()
    except Exception as e:
        return f"Gemini error: {e}"

def save_artwork(data):
    if not FIREBASE_OK: return False
    try:
        data["registered_at"] = firestore.SERVER_TIMESTAMP
        db.collection("artworks").document(data["asset_id"]).set(data)
        return True
    except Exception as e:
        st.error(f"Firestore: {e}"); return False

def save_violations(asset_id, violations):
    if not FIREBASE_OK: return
    try:
        db.collection("artworks").document(asset_id).update({
            "violations": violations,
            "last_scanned_at": firestore.SERVER_TIMESTAMP
        })
    except Exception as e:
        st.error(f"Firestore: {e}")

def get_artwork(asset_id):
    if not FIREBASE_OK: return None
    try:
        d = db.collection("artworks").document(asset_id).get()
        return d.to_dict() if d.exists else None
    except: return None

def get_user_artworks(email):
    if not FIREBASE_OK: return []
    try:
        docs = db.collection("artworks").where("owner_email", "==", email).stream()
        return [d.to_dict() for d in docs]
    except: return []

#  PDF: CERTIFICATE 
def generate_certificate_pdf(artist, title, sha256, phash, asset_id, timestamp, email):
    buf  = io.BytesIO()
    doc  = SimpleDocTemplate(buf, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    teal = colors.HexColor("#0D9488")
    navy = colors.HexColor("#1A73E8")
    lt   = colors.HexColor("#F1F3F4")
    mute = colors.HexColor("#5F6368")

    h1   = ParagraphStyle("h1",   fontSize=22, textColor=navy,  fontName="Helvetica-Bold", spaceAfter=4)
    sub  = ParagraphStyle("sub",  fontSize=11, textColor=teal,  fontName="Helvetica",      spaceAfter=2)
    note = ParagraphStyle("note", fontSize=8,  textColor=mute,  fontName="Helvetica",      leading=12)

    rows = [
        ["Artist / Creator",     artist],
        ["Artwork Title",        title],
        ["Owner Email",          email],
        ["Asset ID",             asset_id],
        ["Registered At (UTC)",  timestamp],
        ["SHA-256 Hash",         sha256],
        ["Perceptual Hash",      phash],
    ]
    tbl = Table(rows, colWidths=[1.8*inch, 5*inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",     (0,0),(0,-1), lt),
        ("FONTNAME",       (0,0),(0,-1), "Helvetica-Bold"),
        ("FONTSIZE",       (0,0),(-1,-1), 9.5),
        ("ROWBACKGROUNDS", (0,0),(-1,-1), [colors.white, lt]),
        ("GRID",           (0,0),(-1,-1), 0.4, colors.HexColor("#E0E0E0")),
        ("PADDING",        (0,0),(-1,-1), 9),
        ("VALIGN",         (0,0),(-1,-1), "MIDDLE"),
    ]))
    story = [
        Paragraph("🛡️  PixelGuard", h1),
        Paragraph("Digital Artwork Ownership Certificate", sub),
        HRFlowable(width="100%", thickness=1.5, color=navy, spaceAfter=20),
        tbl,
        Spacer(1, 20),
        HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E0E0E0"), spaceAfter=10),
        Paragraph(
            "This certificate is timestamped by Firebase (Google Cloud) servers and cannot be backdated. "
            "The SHA-256 hash is a cryptographic fingerprint of the original file. "
            "The pHash identifies visually similar copies even after editing, cropping, or watermark removal. "
            f"Verify at: {REACT_APP_URL}?verify={asset_id}",
            note
        ),
        Spacer(1, 6),
        Paragraph("Generated by PixelGuard · Powered by Google Firebase, Gemini AI & Cloud Vision", note),
    ]
    doc.build(story)
    return buf.getvalue()

#  PDF: DMCA REPORT 
def generate_dmca_pdf(artist, title, asset_id, cert_ts, violations):
    buf   = io.BytesIO()
    doc   = SimpleDocTemplate(buf, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    navy  = colors.HexColor("#1A73E8")
    red   = colors.HexColor("#EA4335")
    lt    = colors.HexColor("#F1F3F4")
    mute  = colors.HexColor("#5F6368")

    h1   = ParagraphStyle("h1",   fontSize=20, textColor=colors.HexColor("#202124"), fontName="Helvetica-Bold", spaceAfter=4)
    h2   = ParagraphStyle("h2",   fontSize=13, textColor=colors.HexColor("#202124"), fontName="Helvetica-Bold", spaceAfter=6)
    sub  = ParagraphStyle("sub",  fontSize=11, textColor=navy, fontName="Helvetica", spaceAfter=12)
    body = ParagraphStyle("body", fontSize=10, textColor=colors.HexColor("#202124"), fontName="Helvetica", leading=15)
    note = ParagraphStyle("note", fontSize=8,  textColor=mute, fontName="Helvetica", leading=12)

    meta = Table([
        ["Artist / Creator",            artist],
        ["Artwork Title",               title],
        ["PixelGuard Asset ID",         asset_id],
        ["Original Registration (UTC)", cert_ts],
    ], colWidths=[2.2*inch, 4.3*inch])
    meta.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(0,-1), lt),
        ("FONTNAME",   (0,0),(0,-1), "Helvetica-Bold"),
        ("FONTSIZE",   (0,0),(-1,-1), 9.5),
        ("GRID",       (0,0),(-1,-1), 0.4, colors.HexColor("#E0E0E0")),
        ("PADDING",    (0,0),(-1,-1), 8),
    ]))

    story = [
        Paragraph("PixelGuard — Copyright Infringement Report", h1),
        Paragraph(f"Generated: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", sub),
        HRFlowable(width="100%", thickness=1.5, color=navy, spaceAfter=12),
        Paragraph("Claimant Details", h2),
        meta,
        Spacer(1, 16),
        Paragraph(f"Infringements Identified: {len(violations)}", h2),
    ]

    for i, v in enumerate(violations, 1):
        risk_c = red if v.get("risk") == "High Risk" else colors.HexColor("#B45309")
        story.append(Paragraph(
            f"#{i} — {v.get('platform','?')} · {v.get('url','')[:70]}",
            ParagraphStyle("vt", fontSize=10, fontName="Helvetica-Bold", textColor=risk_c, spaceAfter=4)
        ))
        vt = Table([
            ["URL",         v.get("url","")],
            ["Platform",    v.get("platform","")],
            ["Similarity",  f"{v.get('similarity','')}%"],
            ["Risk Level",  v.get("risk","")],
            ["Status",      v.get("status","Pending Review")],
        ], colWidths=[1.8*inch, 4.7*inch])
        vt.setStyle(TableStyle([
            ("BACKGROUND",     (0,0),(0,-1), lt),
            ("FONTNAME",       (0,0),(0,-1), "Helvetica-Bold"),
            ("FONTSIZE",       (0,0),(-1,-1), 9),
            ("ROWBACKGROUNDS", (0,0),(-1,-1), [colors.white, lt]),
            ("GRID",           (0,0),(-1,-1), 0.4, colors.HexColor("#E0E0E0")),
            ("PADDING",        (0,0),(-1,-1), 7),
        ]))
        story.append(vt)
        if v.get("gemini_summary"):
            story += [Spacer(1,6), Paragraph(f"AI Analysis: {v['gemini_summary']}", body)]
        story += [Spacer(1,12), HRFlowable(width="100%", thickness=0.3, color=colors.HexColor("#E0E0E0"), spaceAfter=10)]

    story += [
        Spacer(1,10),
        Paragraph(
            "HOW TO USE: Send this PDF + your ownership certificate to the platform's DMCA team. "
            "Etsy: help.etsy.com/hc/en-us/requests/new · Redbubble: redbubble.com/about/ip-policy "
            "· Instagram: help.instagram.com. You must include: 'I have a good faith belief that "
            "use of this material is not authorised by the copyright owner, its agent, or the law.'",
            note
        ),
        Spacer(1,6),
        Paragraph("Generated by PixelGuard · Powered by Google Firebase & Gemini AI", note),
    ]
    doc.build(story)
    return buf.getvalue()



with st.sidebar:
    st.markdown(f"### 🛡️ PixelGuard")
    if st.session_state.user_name:
        st.caption(f"Signed in as **{st.session_state.user_name}**")
    st.divider()
    page = st.radio("", ["📤 Upload & Protect", "🔍 Scan for Violations", "📄 DMCA Report"], label_visibility="collapsed")
    st.divider()
    st.markdown(f"[← Back to Dashboard]({REACT_APP_URL}/dashboard)")
    st.caption("Powered by Gemini · Cloud Vision · Firebase")

# Override page from URL param on first load
if url_page == "scan"   and "forced_page" not in st.session_state:
    st.session_state.forced_page = "🔍 Scan for Violations"
elif url_page == "upload" and "forced_page" not in st.session_state:
    st.session_state.forced_page = "📤 Upload & Protect"
elif url_page == "dmca"   and "forced_page" not in st.session_state:
    st.session_state.forced_page = "📄 DMCA Report"

if "forced_page" in st.session_state:
    page = st.session_state.forced_page

user_email = st.session_state.get("user_email", "")
user_name  = st.session_state.get("user_name",  "")

if page == "📤 Upload & Protect":
    st.markdown("## 📤 Register Your Artwork")
    st.caption("Upload your artwork to generate a tamper-proof ownership certificate.")
    st.divider()

    col_form, col_prev = st.columns([1.1, 1])
    with col_form:
        artwork_title = st.text_input("Artwork title *", placeholder="e.g. Monsoon Dreams #3")
        artwork_desc  = st.text_area("Brief description", placeholder="Digital illustration in teal and gold...", height=90)
        uploaded      = st.file_uploader("Upload artwork *", type=["png","jpg","jpeg","webp"])
    with col_prev:
        if uploaded:
            st.image(uploaded, caption="Preview", use_container_width=True)
        else:
            st.info("Your artwork preview will appear here.")

    st.divider()

    if uploaded and artwork_title:
        if st.button("🔐 Generate Ownership Certificate", type="primary", use_container_width=True):
            img_bytes = uploaded.read()
            
            with st.spinner("Verifying originality (scanning the web for prior art)..."):
                web_data = cloud_vision_detect(img_bytes)
                
                if "error" not in web_data:
                    full_matches = web_data.get("fullMatchingImages", [])
                    partial_matches = web_data.get("partialMatchingImages", [])
                    STRICTNESS_LEVEL = "High" 

                    blocking_matches = full_matches
                    if STRICTNESS_LEVEL == "Medium":
                        blocking_matches = full_matches + partial_matches
                    if len(blocking_matches) > 0:
                        st.error("🚨 Registration Blocked: Identical copies of this artwork already exist on the web.")
                        st.warning(f"Prior art found at: {blocking_matches[0].get('url', 'Unknown URL')}")
                        st.info("PixelGuard only generates certificates for original, unpublished artwork.")
                        st.stop() 
            

          
            with st.spinner("Artwork verified! Generating fingerprint and registering on Firebase..."):
                image       = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                sha256      = compute_sha256(img_bytes)
                phash_val   = compute_phash(image)
                asset_id    = "PG-" + sha256[:12].upper()
                timestamp   = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

                doc_data = {
                    "owner_email":       user_email,
                    "artist_name":       user_name,
                    "artwork_title":     artwork_title,
                    "artwork_desc":      artwork_desc,
                    "sha256":            sha256,
                    "phash":             phash_val,
                    "asset_id":          asset_id,
                    "registered_at_str": timestamp,
                    "violations":        [],
                }
                save_artwork(doc_data)
                cert_pdf = generate_certificate_pdf(
                    user_name, artwork_title, sha256,
                    phash_val, asset_id, timestamp, user_email
                )

            st.success(f" Registered! Asset ID: **{asset_id}**")
            c1, c2, c3 = st.columns(3)
            c1.metric("Asset ID", asset_id)
            c2.metric("SHA-256 (first 16)", sha256[:16].upper())
            c3.metric("pHash", phash_val[:12])

            st.download_button(
                " Download Ownership Certificate (PDF)",
                data=cert_pdf,
                file_name=f"PixelGuard_Certificate_{asset_id}.pdf",
                mime="application/pdf",
                use_container_width=True
            )

            st.markdown(f"""
            <div class="pg-info">
            <p>🔗 <strong>Public verification link:</strong> Share this URL to prove your ownership to anyone:<br>
            <code>{REACT_APP_URL}?verify={asset_id}</code></p>
            </div>
            """, unsafe_allow_html=True)

            st.markdown(f"[← Back to Dashboard]({REACT_APP_URL}/dashboard)")

    elif uploaded and not artwork_title:
        st.warning("Please enter an artwork title.")


elif page == "🔍 Scan for Violations":
    st.markdown("## 🔍 Scan for Unauthorised Use")
    st.caption("Upload your artwork — we search the web for copies, then you decide what to do about each one.")
    st.divider()

    artworks    = get_user_artworks(user_email) if user_email else []
    artwork_map = {a["artwork_title"]: a for a in artworks} if artworks else {}

    scan_mode = st.radio("Scan mode", ["Choose from my registered artworks", "Upload a new image to scan"], horizontal=True)

    selected_art     = None
    scan_image_bytes = None
    scan_desc        = ""
    scan_asset_id    = url_asset or None

    if scan_mode == "Choose from my registered artworks":
        if not artwork_map:
            st.info("No registered artworks found. Register one first.")
        else:
            default_title = next((a["artwork_title"] for a in artworks if a.get("asset_id") == scan_asset_id), list(artwork_map.keys())[0])
            chosen = st.selectbox("Select artwork", list(artwork_map.keys()), index=list(artwork_map.keys()).index(default_title) if default_title in artwork_map else 0)
            selected_art     = artwork_map[chosen]
            scan_desc        = selected_art.get("artwork_desc", "")
            scan_asset_id    = selected_art.get("asset_id")
            uploaded_scan    = st.file_uploader("Re-upload this artwork file for scanning", type=["png","jpg","jpeg","webp"])
            if uploaded_scan:
                scan_image_bytes = uploaded_scan.read()
    else:
        uploaded_scan = st.file_uploader("Upload artwork to scan", type=["png","jpg","jpeg","webp"])
        scan_desc     = st.text_input("Artwork description (helps Gemini analysis)", placeholder="Digital portrait in teal and gold...")
        if uploaded_scan:
            scan_image_bytes = uploaded_scan.read()

    if scan_image_bytes:
        col_p, _ = st.columns([1, 2])
        col_p.image(scan_image_bytes, caption="Image to scan", use_container_width=True)

    st.divider()

    if scan_image_bytes and st.button("🔎 Scan the Web Now", type="primary", use_container_width=True):
        with st.spinner("Running Cloud Vision Web Detection... this takes about 15-30 seconds"):
            web_data = cloud_vision_detect(scan_image_bytes)

        if "error" in web_data:
            st.error(f"Vision API error: {web_data['error']}")
            st.stop()

        page_map = {p.get("url",""): p.get("pageTitle","") for p in web_data.get("pagesWithMatchingImages",[])}
        raw = []
        for m in web_data.get("fullMatchingImages",    []): raw.append({"url": m.get("url",""), "base_sim": 99,  "type": "Full match"})
        for m in web_data.get("partialMatchingImages", []): raw.append({"url": m.get("url",""), "base_sim": 85,  "type": "Partial match"})
        for m in web_data.get("visuallySimilarImages", [])[:8]: raw.append({"url": m.get("url",""), "base_sim": 70, "type": "Visually similar"})

        raw = clean_vision_results(raw)

        page_urls = list(web_data.get("pagesWithMatchingImages", []))
        
        page_urls = clean_vision_results(page_urls)

        matches = []
        for m in raw:
            url  = m["url"]
            sim  = m["base_sim"]
            matches.append({
                "url":          url,
                "type":         m["type"],
                "similarity":   sim,
                "risk":         risk_label(sim),
                "platform":     detect_platform(url),
                "title":        page_map.get(url, ""),
                "gemini_summary": "",
                "status":       "Pending Review",
            })

        for p in page_urls:
            purl = p.get("url","")
            if purl and not any(m["url"] == purl for m in matches):
                matches.append({
                    "url":        purl,
                    "type":       "Page match",
                    "similarity": 85,
                    "risk":       "High Risk",
                    "platform":   detect_platform(purl),
                    "title":      p.get("pageTitle",""),
                    "gemini_summary": "",
                    "status":     "Pending Review",
                })

        threshold = st.slider("Minimum similarity to show", 40, 95, 60)
        matches   = [m for m in matches if m["similarity"] >= threshold]

        st.divider()

        if not matches:
            st.success(" No matches found above threshold. Your artwork appears safe.")
        else:
            h, med, low = (
                sum(1 for m in matches if m["risk"] == "High Risk"),
                sum(1 for m in matches if m["risk"] == "Medium Risk"),
                sum(1 for m in matches if m["risk"] == "Low Risk"),
            )
            c1,c2,c3,c4 = st.columns(4)
            c1.metric("Total matches", len(matches))
            c2.metric("🔴 High risk",   h)
            c3.metric("🟡 Medium risk", med)
            c4.metric("🟢 Low risk",    low)
            st.warning(f"⚠️ {len(matches)} potential unauthorised uses found. Review each one below.")
            st.divider()

            for i, m in enumerate(matches):
                badge_cls = "badge-high" if m["risk"]=="High Risk" else "badge-medium" if m["risk"]=="Medium Risk" else "badge-low"
                with st.expander(f"Match #{i+1} — {m['platform']} · {m['url'][:65]}"):
                    # Side by side
                    col_o, col_m = st.columns(2)
                    with col_o:
                        st.caption("Your original")
                        st.image(scan_image_bytes, use_container_width=True)
                    with col_m:
                        st.caption("Suspected copy")
                        try:
                            st.image(m["url"], use_container_width=True)
                        except:
                            st.caption("Cannot preview — open URL directly")

                    st.markdown(f"""
                    <span class="{badge_cls}">{m['risk']}</span>
                    &nbsp; <strong>Platform:</strong> {m['platform']}
                    &nbsp; <strong>Type:</strong> {m['type']}
                    &nbsp; <strong>Similarity:</strong> {m['similarity']}%
                    """, unsafe_allow_html=True)

                    if m["title"]:
                        st.caption(f"Page title: {m['title']}")
                    st.markdown(f"**URL:** [{m['url'][:80]}...]({m['url']})" if len(m['url'])>80 else f"**URL:** [{m['url']}]({m['url']})")

                    # Gemini
                    if scan_desc:
                        if st.button(f"🤖 Analyse with Gemini", key=f"gem_{i}"):
                            with st.spinner("Gemini analysing..."):
                                summary = gemini_analyse(scan_desc, m["url"], m["title"], m["similarity"])
                                matches[i]["gemini_summary"] = summary
                            st.info(f"**Gemini:** {summary}")
                    elif m.get("gemini_summary"):
                        st.info(f"**Gemini:** {m['gemini_summary']}")

                    # Human-in-the-loop
                    st.markdown("**What do you want to do?**")
                    a1, a2, a3 = st.columns(3)
                    if a1.button("⚪ Ignore",      key=f"ign_{i}"): matches[i]["status"] = "Ignored";        st.success("Marked as Ignored.")
                    if a2.button("👁️ Monitor",     key=f"mon_{i}"): matches[i]["status"] = "Monitoring";     st.success("Marked as Monitoring.")
                    if a3.button("⚖️ Take Action", key=f"act_{i}"): matches[i]["status"] = "Action Needed";  st.warning("Marked for Action. Go to DMCA Report.")

            # Save to Firestore
            if scan_asset_id:
                save_violations(scan_asset_id, matches)
                st.success("✅ Violations saved to your artwork record.")

            st.session_state["scan_results"] = {
                "violations":    matches,
                "asset_id":      scan_asset_id or "",
                "artwork_title": selected_art["artwork_title"] if selected_art else "Unknown",
                "cert_ts":       selected_art.get("registered_at_str","") if selected_art else "",
            }

            st.info("➡️ Go to **DMCA Report** in the sidebar to generate your takedown document.")
            st.markdown(f"[← Back to Dashboard]({REACT_APP_URL}/dashboard)")


elif page == "📄 DMCA Report":
    st.markdown("## 📄 DMCA Infringement Report")
    st.caption("Generate a ready-to-send takedown document. You always review before anything is sent.")
    st.divider()

    artist_r  = st.text_input("Your legal name", value=user_name)
    title_r   = st.text_input("Artwork title", placeholder="Monsoon Dreams #3")
    asset_r   = st.text_input("Asset ID (from certificate)", placeholder="PG-XXXXXXXXXX")
    ts_r      = st.text_input("Certificate timestamp", placeholder="2026-04-17T10:30:00Z")

    violations_r = []
    if "scan_results" in st.session_state:
        sr = st.session_state["scan_results"]
        violations_r = sr["violations"]
        if not title_r: title_r = sr.get("artwork_title","")
        if not asset_r: asset_r = sr.get("asset_id","")
        if not ts_r:    ts_r    = sr.get("cert_ts","")
        st.success(f"✅ {len(violations_r)} violation(s) from your last scan loaded.")

        include = st.multiselect(
            "Include violations with status",
            ["Pending Review", "Action Needed", "Monitoring"],
            default=["Action Needed", "Pending Review"]
        )
        violations_r = [v for v in violations_r if v.get("status","Pending Review") in include]
        st.caption(f"{len(violations_r)} violation(s) will be included in the report.")
    else:
        st.info("Run a scan first — your violations will auto-populate here.")

    st.divider()

    st.markdown("""
    <div class="pg-warn">
    <p>⚠️ <strong>Important:</strong> PixelGuard never auto-sends takedowns. You review and confirm before anything is sent.
    Filing a false DMCA claim can have legal consequences.</p>
    </div>
    """, unsafe_allow_html=True)

    confirmed = st.checkbox(
        "I have a good faith belief that the use of the material is not authorised by the copyright owner, "
        "its agent, or the law. I understand that filing a false claim may result in legal liability."
    )

    if artist_r and title_r and violations_r and confirmed:
        if st.button("📥 Generate DMCA Report PDF", type="primary", use_container_width=True):
            with st.spinner("Generating report..."):
                pdf = generate_dmca_pdf(artist_r, title_r, asset_r or "N/A", ts_r or "N/A", violations_r)
            st.download_button(
                "⬇️ Download DMCA Report PDF",
                data=pdf,
                file_name=f"PixelGuard_DMCA_{asset_r or 'report'}.pdf",
                mime="application/pdf",
                use_container_width=True
            )
            st.info("Send this PDF + your ownership certificate to the platform's DMCA team.")
    elif not confirmed and violations_r:
        st.warning("Please confirm the good-faith statement before generating the report.")

    st.markdown(f"[← Back to Dashboard]({REACT_APP_URL}/dashboard)")
