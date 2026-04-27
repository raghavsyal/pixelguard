# services/fingerprint.py
import hashlib
import imagehash
from PIL import Image
import io


def compute_sha256(image_bytes: bytes) -> str:
    return hashlib.sha256(image_bytes).hexdigest()


def compute_phash(image_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return str(imagehash.phash(image))


def generate_asset_id(sha256: str) -> str:
    return "PG-" + sha256[:12].upper()
