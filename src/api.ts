import { API_URL } from "./config";
import { getToken } from "./auth";

async function req<T = any>(path: string, method = "GET", body?: any): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.detail ? JSON.stringify(data.detail) : `Error ${res.status}`);
  return data as T;
}

export const api = {
  get: <T = any>(p: string) => req<T>(p),
  post: <T = any>(p: string, b?: any) => req<T>(p, "POST", b),
  put: <T = any>(p: string, b?: any) => req<T>(p, "PUT", b),
  patch: <T = any>(p: string, b?: any) => req<T>(p, "PATCH", b),
  del: <T = any>(p: string) => req<T>(p, "DELETE"),
};

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/upload/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "Upload failed");
  return data.url as string;
}
