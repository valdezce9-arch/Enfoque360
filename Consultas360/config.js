// ============================================================
// config.js — Configuración del frontend de Consultas 360
// SOLO contiene la URL de NUESTRA API. Ninguna URL de fuentes
// externas ni credenciales vive en este archivo (blindaje).
//
// Producción: el backend se expone vía Cloudflare Tunnel en
// https://api.enfoque360.pe (servicio cloudflared en el servidor).
// Local: si se corre sin túnel, cambiar a window.location.origin.
// ============================================================
const API_BASE = "https://api.enfoque360.pe";
