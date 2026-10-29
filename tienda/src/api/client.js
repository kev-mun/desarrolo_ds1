import { getToken, clearSession } from "../utils/auth.js";

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(mensaje, estado, errores) {
    super(mensaje);
    this.estado = estado;
    this.errores = errores || [];
  }
}

export async function request(ruta, { method = "GET", body, params } = {}) {
  const url = new URL(BASE + ruta);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    }
  }

  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  let respuesta;
  try {
    respuesta = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor", 0);
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }

  if (!respuesta.ok) {
    if (respuesta.status === 401 && token) {
      clearSession();
      location.hash = "#/login";
    }
    throw new ApiError((datos && datos.message) || "Error inesperado", respuesta.status, datos && datos.errores);
  }
  return datos;
}