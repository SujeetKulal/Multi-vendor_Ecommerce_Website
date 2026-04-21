import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"
});

apiClient.interceptors.request.use((config) => {
  const url = config.url || "";
  const isPublicAuthRoute =
    url.includes("/accounts/register/") ||
    url.includes("/auth/token/") ||
    url.includes("/auth/token/refresh/");

  if (isPublicAuthRoute) {
    return config;
  }

  const token = localStorage.getItem("access_token");
  const isLikelyJwt = token && token.split(".").length === 3;
  if (isLikelyJwt && token !== "null" && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
