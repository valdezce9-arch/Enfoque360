// ============================================================
// config.js — Configuración del frontend de Consultas 360
// SOLO contiene la URL de NUESTRA API. Ninguna URL de fuentes
// externas ni credenciales vive en este archivo (blindaje).
//
// Producción: el backend se expone mediante Caddy en el mismo VPS.
// Local: si se corre sin proxy, cambiar a window.location.origin.
// ============================================================
const API_BASE = "https://consultas.enfoque360.pe";
const API_KEY = "web_publica_360_20260916";
