# services/gemini.py
import os
import google.generativeai as genai

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

_model = None

def get_model():
    global _model
    if _model is None and GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
        _model = genai.GenerativeModel("gemini-1.5-pro")
    return _model


def gemini_analyse(desc: str, match_url: str, title: str, similarity: float) -> str:
    """
    YOUR prompt — unchanged from app.py.
    """
    model = get_model()
    if not model:
        return "Gemini not configured — add GOOGLE_API_KEY to .env"

    prompt = f"""You are a copyright assistant helping an indie digital artist.
Artwork: "{desc}"
Suspected infringing URL: {match_url}
Page title: "{title}"
Visual similarity: {similarity}%
Write 3 concise sentences: (1) what the violation likely is, (2) how serious it is, (3) the single best next step. No jargon, no bullets."""

    try:
        return model.generate_content(prompt).text.strip()
    except Exception as e:
        return f"Gemini error: {e}"
