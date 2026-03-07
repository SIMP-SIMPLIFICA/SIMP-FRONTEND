import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { API_URL } from "./api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAvatarUrl(path?: string | null) {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;

  // Remove leading slash if exists to avoid double slash
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${API_URL}/${cleanPath}`;
}
