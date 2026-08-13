// ============================================================
// config.js — Configuración del frontend de Consultas 360
// SOLO contiene la URL de NUESTRA API. Ninguna URL de fuentes
// externas ni credenciales vive en este archivo (blindaje).
//
// Local: usa el mismo origen (evita el problema localhost vs 127.0.0.1).
// Producción: reemplaza por la URL del backend desplegado, ej:
//   const API_BASE = "https://api.enfoque360.pe";
// ============================================================
const API_BASE = window.location.origin;
