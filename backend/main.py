

import datetime
import os
from dotenv import load_dotenv

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import io

load_dotenv()

from services.fingerprint import compute_sha256, compute_phash, generate_asset_id
from services.vision       import cloud_vision_detect, check_originality, build_matches
from services.gemini       import gemini_analyse
from services.firebase     import save_artwork, save_violations, get_artwork, get_user_artworks
from services.pdf          import generate_certificate_pdf, generate_dmca_pdf

REACT_APP_URL = os.getenv("REACT_APP_URL", "http://localhost:3000")

app = FastAPI(title="PixelGuard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://pixelguard-5bc93.web.app",
        "https://pixelguard-5bc93.firebaseapp.com",
        REACT_APP_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {"status": "ok", "service": "PixelGuard API"}


@app.post("/api/register")
async def register_artwork(
    file:          UploadFile = File(...),
    artwork_title: str        = Form(...),
    artwork_desc:  str        = Form(""),
    owner_email:   str        = Form(...),
    artist_name:   str        = Form(...),
):
    image_bytes = await file.read()

    web_data = cloud_vision_detect(image_bytes)

    if "error" not in web_data:
        originality = check_originality(web_data, strictness="High")
        if originality["blocked"]:
            raise HTTPException(
                status_code=409,
                detail={
                    "blocked":  True,
                    "message":  "Registration Blocked: Identical copies of this artwork already exist on the web.",
                    "prior_art_url": originality["url"],
                }
            )

    # Fingerprint
    sha256    = compute_sha256(image_bytes)
    phash     = compute_phash(image_bytes)
    asset_id  = generate_asset_id(sha256)
    timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Save to Firestore
    doc_data = {
        "owner_email":       owner_email,
        "artist_name":       artist_name,
        "artwork_title":     artwork_title,
        "artwork_desc":      artwork_desc,
        "sha256":            sha256,
        "phash":             phash,
        "asset_id":          asset_id,
        "registered_at_str": timestamp,
        "violations":        [],
    }
    saved = save_artwork(doc_data)
    if not saved:
        raise HTTPException(status_code=500, detail="Failed to save to Firestore.")

    return {
        "asset_id":  asset_id,
        "sha256":    sha256,
        "phash":     phash,
        "timestamp": timestamp,
        "verify_url": f"{REACT_APP_URL}?verify={asset_id}",
    }



@app.get("/api/certificate/{asset_id}")
def download_certificate(asset_id: str):
    art = get_artwork(asset_id)
    if not art:
        raise HTTPException(status_code=404, detail="Artwork not found.")

    pdf_bytes = generate_certificate_pdf(
        artist    = art.get("artist_name", ""),
        title     = art.get("artwork_title", ""),
        sha256    = art.get("sha256", ""),
        phash     = art.get("phash", ""),
        asset_id  = asset_id,
        timestamp = art.get("registered_at_str", ""),
        email     = art.get("owner_email", ""),
    )
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=PixelGuard_Certificate_{asset_id}.pdf"}
    )



@app.post("/api/scan")
async def scan_artwork(
    file:      UploadFile = File(...),
    asset_id:  str        = Form(""),
    scan_desc: str        = Form(""),
    threshold: int        = Form(60),
):
    image_bytes = await file.read()

    web_data = cloud_vision_detect(image_bytes)
    if "error" in web_data:
        raise HTTPException(status_code=502, detail=f"Vision API error: {web_data['error']}")

    matches = build_matches(web_data)

    matches = [m for m in matches if m["similarity"] >= threshold]

    if asset_id and matches:
        save_violations(asset_id, matches)

    return {
        "matches":   matches,
        "total":     len(matches),
        "high_risk": sum(1 for m in matches if m["risk"] == "High Risk"),
        "medium":    sum(1 for m in matches if m["risk"] == "Medium Risk"),
        "low":       sum(1 for m in matches if m["risk"] == "Low Risk"),
    }



@app.post("/api/analyse")
async def analyse_match(
    artwork_desc: str = Form(...),
    match_url:    str = Form(...),
    match_title:  str = Form(""),
    similarity:   float = Form(70),
):
    summary = gemini_analyse(artwork_desc, match_url, match_title, similarity)
    return {"summary": summary}



@app.post("/api/dmca")
async def generate_dmca(
    artist_name: str  = Form(...),
    artwork_title: str = Form(...),
    asset_id:     str  = Form(""),
    cert_ts:      str  = Form(""),
    violations:   str  = Form(...),  
):
    import json
    try:
        violations_list = json.loads(violations)
    except Exception:
        raise HTTPException(status_code=400, detail="violations must be a valid JSON array string.")

    pdf_bytes = generate_dmca_pdf(
        artist     = artist_name,
        title      = artwork_title,
        asset_id   = asset_id or "N/A",
        cert_ts    = cert_ts  or "N/A",
        violations = violations_list,
    )
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=PixelGuard_DMCA_{asset_id or 'report'}.pdf"}
    )



@app.get("/api/artworks/{email}")
def get_artworks(email: str):
    artworks = get_user_artworks(email)
    return {"artworks": artworks}



@app.get("/api/verify/{asset_id}")
def verify_artwork(asset_id: str):
    art = get_artwork(asset_id)
    if not art:
        raise HTTPException(status_code=404, detail="Artwork not found.")
    return {
        "verified":      True,
        "artist_name":   art.get("artist_name"),
        "artwork_title": art.get("artwork_title"),
        "asset_id":      asset_id,
        "registered_at": art.get("registered_at_str"),
        "sha256":        art.get("sha256"),
        "phash":         art.get("phash"),
    }
