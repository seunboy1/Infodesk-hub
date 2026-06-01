import os
import qrcode
import cloudinary
import cloudinary.uploader
from io import BytesIO
from PIL import Image
from config import get_settings

settings = get_settings()



def _configure_cloudinary():
    cloudinary_url = os.environ.get("CLOUDINARY_URL", "")
    if not cloudinary_url:
        raise RuntimeError("CLOUDINARY_URL environment variable is not set")
    cloudinary.config(cloudinary_url=cloudinary_url)

def generate_qr_bytes(url: str, size: int = 300) -> bytes:
    """Generate a QR code PNG from a URL and return raw bytes."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1A1714", back_color="white")
    img = img.resize((size, size), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def generate_qr_data_uri(url: str) -> str:
    """Return a base64 data URI for inline display."""
    import base64
    raw = generate_qr_bytes(url)
    b64 = base64.b64encode(raw).decode()
    return f"data:image/png;base64,{b64}"


def upload_qr_to_cloudinary(image_bytes: bytes, link_id: str) -> str:
    """Upload QR image bytes to Cloudinary and return the public URL."""
    _configure_cloudinary()
    buf = BytesIO(image_bytes)
    result = cloudinary.uploader.upload(
        buf,
        public_id=f"infodesk/qr_{link_id}",
        overwrite=True,
        resource_type="image",
        format="png",
    )
    return result["secure_url"]


def upload_custom_qr(file_bytes: bytes, link_id: str) -> str:
    """Upload a user-provided QR image to Cloudinary."""
    _configure_cloudinary()
    buf = BytesIO(file_bytes)
    result = cloudinary.uploader.upload(
        buf,
        public_id=f"infodesk/custom_qr_{link_id}",
        overwrite=True,
        resource_type="image",
    )
    return result["secure_url"]
