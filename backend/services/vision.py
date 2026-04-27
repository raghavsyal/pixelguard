# services/vision.py
import base64
import os
import requests


VISION_API_KEY = os.getenv("VISION_API_KEY", "")


def cloud_vision_detect(image_bytes: bytes) -> dict:
    if not VISION_API_KEY:
        return {"error": "VISION_API_KEY not set"}
    url = f"https://vision.googleapis.com/v1/images:annotate?key={VISION_API_KEY}"
    payload = {
        "requests": [{
            "image": {"content": base64.b64encode(image_bytes).decode()},
            "features": [{"type": "WEB_DETECTION", "maxResults": 20}]
        }]
    }
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return r.json()["responses"][0].get("webDetection", {})
    except Exception as e:
        return {"error": str(e)}


# ── YOUR FUNCTION — unchanged ─────────────────────────────────────────────────
def clean_vision_results(vision_results: list) -> list:
    cleaned_results = []
    for item in vision_results:
        url = item.get("url", "")
        if not url.startswith(("http://", "https://")):
            continue
        if url.endswith("..."):
            continue
        if "data:image" in url or "x-raw-image" in url:
            continue
        cleaned_results.append(item)
    return cleaned_results


def detect_platform(url: str) -> str:
    mapping = {
        "etsy":       "Etsy",
        "redbubble":  "Redbubble",
        "instagram":  "Instagram",
        "pinterest":  "Pinterest",
        "twitter":    "Twitter/X",
        "x.com":      "Twitter/X",
        "facebook":   "Facebook",
        "deviantart": "DeviantArt",
        "artstation": "ArtStation",
    }
    for key, name in mapping.items():
        if key in url:
            return name
    return "Other"


def risk_label(similarity: float) -> str:
    if similarity >= 80:
        return "High Risk"
    if similarity >= 60:
        return "Medium Risk"
    return "Low Risk"


def check_originality(web_data: dict, strictness: str = "High") -> dict:
    """
    YOUR originality check logic — ported exactly from app.py.
    Returns {"blocked": True/False, "url": first_match_url or None}
    """
    full_matches    = web_data.get("fullMatchingImages", [])
    partial_matches = web_data.get("partialMatchingImages", [])

    blocking_matches = full_matches
    if strictness == "Medium":
        blocking_matches = full_matches + partial_matches

    if len(blocking_matches) > 0:
        return {
            "blocked": True,
            "url": blocking_matches[0].get("url", "Unknown URL"),
            "message": "Identical copies of this artwork already exist on the web."
        }
    return {"blocked": False, "url": None, "message": ""}


def build_matches(web_data: dict) -> list:
    """
    Build the unified match list from Cloud Vision response.
    Applies clean_vision_results (your function) to both raw and page URLs.
    """
    page_map = {
        p.get("url", ""): p.get("pageTitle", "")
        for p in web_data.get("pagesWithMatchingImages", [])
    }

    raw = []
    for m in web_data.get("fullMatchingImages",    []): raw.append({"url": m.get("url",""), "base_sim": 99,  "type": "Full match"})
    for m in web_data.get("partialMatchingImages", []): raw.append({"url": m.get("url",""), "base_sim": 85,  "type": "Partial match"})
    for m in web_data.get("visuallySimilarImages", [])[:8]: raw.append({"url": m.get("url",""), "base_sim": 70, "type": "Visually similar"})

    # YOUR clean function applied here
    raw       = clean_vision_results(raw)
    page_urls = clean_vision_results(list(web_data.get("pagesWithMatchingImages", [])))

    matches = []
    for m in raw:
        url = m["url"]
        sim = m["base_sim"]
        matches.append({
            "url":            url,
            "type":           m["type"],
            "similarity":     sim,
            "risk":           risk_label(sim),
            "platform":       detect_platform(url),
            "title":          page_map.get(url, ""),
            "gemini_summary": "",
            "status":         "Pending Review",
        })

    # Add page URLs not already in matches
    for p in page_urls:
        purl = p.get("url", "")
        if purl and not any(m["url"] == purl for m in matches):
            matches.append({
                "url":            purl,
                "type":           "Page match",
                "similarity":     85,
                "risk":           "High Risk",
                "platform":       detect_platform(purl),
                "title":          p.get("pageTitle", ""),
                "gemini_summary": "",
                "status":         "Pending Review",
            })

    return matches
