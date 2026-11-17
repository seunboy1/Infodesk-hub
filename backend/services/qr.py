import cloudinary
import cloudinary.uploader
from io import BytesIO
from config import get_settings

settings = get_settings()


def upload_custom_qr(file_bytes: bytes, link_id: str) -> str:
    """Upload a user-provided QR image to Cloudinary."""
    if not settings.cloudinary_url:
        raise RuntimeError("CLOUDINARY_URL environment variable is not set")
    cloudinary.config(cloudinary_url=settings.cloudinary_url)
    buf = BytesIO(file_bytes)
    result = cloudinary.uploader.upload(
        buf,
        public_id=f"infodesk/custom_qr_{link_id}",
        overwrite=True,
        resource_type="image",
    )
    return result["secure_url"]
