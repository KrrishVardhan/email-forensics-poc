from fastapi import APIRouter, UploadFile, File, HTTPException

from email_forensics import analyze_eml

router = APIRouter()


@router.post("/analyze-email")
async def analyze_email(file: UploadFile = File(...)):
    if not file.filename.endswith(".eml"):
        raise HTTPException(400, "Please upload a .eml file")

    raw_bytes = await file.read()

    try:
        result = analyze_eml(raw_bytes)
    except Exception as e:
        raise HTTPException(400, f"Could not parse email: {e}")

    return result
