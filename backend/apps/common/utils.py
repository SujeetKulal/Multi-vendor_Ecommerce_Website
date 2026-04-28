def normalize_public_url(url: str) -> str:
    if not url:
        return url
    fixed = str(url).strip()
    if fixed.startswith("https://https://"):
        return fixed.replace("https://https://", "https://", 1)
    if fixed.startswith("http://http://"):
        return fixed.replace("http://http://", "http://", 1)
    return fixed
