// Backend base URL. Override in dev by setting VITE_API_URL in a .env file.
export const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  "https://clothingecommerce-backend.onrender.com";
