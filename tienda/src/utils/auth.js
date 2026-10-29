const CLAVE = "biblioteca_sesion";
let enMemoria = null; // respaldo si localStorage no está disponible

export function getSession() {
  if (enMemoria) return enMemoria;
  try {
    return JSON.parse(localStorage.getItem(CLAVE));
  } catch {
    return null;
  }
}

export function setSession(sesion) {
  enMemoria = sesion;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    /* sin almacenamiento: queda solo en memoria */
  }
}

export function clearSession() {
  enMemoria = null;
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada */
  }
}

export const getToken = () => getSession()?.token || null;
export const getUsuario = () => getSession()?.usuario || null;
export const esPersonal = () => ["admin", "bibliotecario"].includes(getUsuario()?.rol);