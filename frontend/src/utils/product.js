export function resolveImageUrl(imagePath) {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    if (typeof window !== "undefined" && window.location.protocol === "https:" && imagePath.startsWith("http://")) {
      return imagePath.replace(/^http:\/\//, "https://");
    }
    return imagePath;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
  const backendBase = apiBase.replace(/\/api\/?$/, "");
  return `${backendBase}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;
}

export function formatPrice(value) {
  return Number(value || 0).toFixed(2);
}
