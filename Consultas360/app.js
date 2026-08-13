// ============================================================
// app.js — Lógica del frontend de Consultas 360
// Tabs DNI / RUC / Techo Propio, consultas a nuestra API,
// contador diario y renderizado de resultados (modo oscuro).
// ============================================================
const WHATSAPP = "https://wa.me/51934441569?text=" +
    encodeURIComponent("Hola, consulté en Consultas 360 y quiero más información.");

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ---------- utilidades ---------- */
function el(tag, cls, texto) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto !== undefined) n.textContent = texto;
    return n;
}
function dinero(v) {
    if (v === null || v === undefined || v === 0) return "S/ 0";
    return "S/ " + Number(v).toLocaleString("es-PE");
}
function keyEstado(estado) {
    const e = (estado || "").toUpperCase();
    if (e.includes("DESEMBOLSADO")) return "emerald";
    if (e.includes("ELEGIBLE")) return "amber";
    if (e.includes("INSCRITO")) return "sky";
    if (e.includes("REVISIÓN") || e.includes("REVISION")) return "violet";
    if (e.includes("POR DESEMBOLSAR")) return "orange";
    if (e.includes("BENEFICIARIO")) return "emerald";
    return "gris";
}
const ESTADO_STYLE = {
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    amber:   "bg-amber-500/15 text-amber-300 border-amber-500/40",
    sky:     "bg-sky-500/15 text-sky-300 border-sky-500/40",
    violet:  "bg-violet-500/15 text-violet-300 border-violet-500/40",
    orange:  "bg-orange-500/15 text-orange-300 border-orange-500/40",
    red:     "bg-red-500/15 text-red-300 border-red-500/40",
    verde:   "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    gris:    "bg-white/10 text-white/60 border-white/15",
};
function badge(texto, clave) {
    return el("span", "text-xs font-bold px-3 py-1 rounded-full border " +
        (ESTADO_STYLE[clave] || ESTADO_STYLE.gris), texto);
}

/* ---------- copiar resultados ---------- */
function copiarTexto(texto, btn) {
    const ok = () => {
        const span = btn.querySelector("span");
        const original = span.textContent;
        span.textContent = "¡Copiado!";
        btn.classList.add("text-gold", "border-gold/60");
        setTimeout(() => {
            span.textContent = original;
            btn.classList.remove("text-gold", "border-gold/60");
        }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(ok).catch(() => copiarFallback(texto, ok));
    } else {
        copiarFallback(texto, ok);
    }
}
function copiarFallback(texto, ok) {
    try {
        const ta = document.createElement("textarea");
        ta.value = texto;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        ok();
    } catch (e) { /* sin acción */ }
}
function btnCopiar(texto) {
    const b = el("button", "flex items-center gap-1.5 text-xs font-semibold border border-white/20 hover:border-gold/60 hover:text-gold text-white/70 rounded-full px-3 py-1.5 transition");
    b.type = "button";
    b.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg><span>Copiar</span>';
    b.addEventListener("click", () => copiarTexto(texto, b));
    return b;
}
function textoDni(d) {
    const lineas = ["DNI " + d.dni, d.completos || "",
        "Nombres: " + (d.nombres || "—"),
        "Apellido paterno: " + (d.apellido_paterno || "—"),
        "Apellido materno: " + (d.apellido_materno || "—")];
    if (d.fecha_nacimiento) lineas.push("Fecha de nacimiento: " + d.fecha_nacimiento);
    return lineas.join("\n");
}
function textoRuc(d) {
    const lineas = ["RUC " + d.ruc, d.razon_social || "",
        "Tipo: " + (d.tipo || "—"),
        "Estado: " + (d.estado || "—"),
        "Condición: " + (d.condicion || "—"),
        "Domicilio fiscal: " + (d.domicilio || "—")];
    if (d.fecha_inscrip && d.fecha_inscrip !== "---") lineas.push("Inscripción: " + d.fecha_inscrip);
    if (d.actividades && d.actividades !== "---") lineas.push("Actividades: " + d.actividades);
    if (d.subs) {
        const conDatos = Object.entries(d.subs)
            .filter(([, s]) => (s.campos && Object.keys(s.campos).length) || (s.tablas && Object.keys(s.tablas).length))
            .map(([k]) => k).join(", ");
        if (conDatos) lineas.push("Consultas SUNAT: " + conDatos);
    }
    return lineas.join("\n");
}
function textoFmv(r) {
    const lineas = ["DNI " + r.dni, (r.busqueda && r.busqueda.nombre) || "",
        "Estado: " + (r.estado_actual || (r.busqueda && r.busqueda.estado) || "—"),
        "Formulario: " + ((r.busqueda && r.busqueda.formId) || "—")];
    if (r.busqueda && r.busqueda.ubicacion && r.busqueda.ubicacion !== "---") lineas.push("Ubicación: " + r.busqueda.ubicacion);
    if (r.historial && r.historial.length) {
        lineas.push("Historial:");
        r.historial.forEach((h) => lineas.push("  " + h.estado + ": " + (h.fechaInicio || "") + " → " + (h.fechaFin || "actualidad")));
    }
    const p = r.proyecto || {};
    if (p.nombre && p.nombre !== "---") {
        lineas.push("Proyecto:");
        lineas.push("  Compra:");
        lineas.push("    Ahorro: " + dinero(p.montoAhorro));
        lineas.push("    Crédito: " + dinero(p.montoCredito));
        lineas.push("    Bono Familiar Habitacional: " + dinero(p.valorBFH));
        lineas.push("    Valor de la vivienda: " + dinero(p.valorVivienda));
        if (p.fechaContrato) lineas.push("    Fecha de contrato: " + p.fechaContrato);
        lineas.push("  Vivienda:");
        lineas.push("    Proyecto: " + p.nombre);
        if (p.cuh) lineas.push("    CUH: " + p.cuh);
        if (p.manzana) lineas.push("    Manzana: " + p.manzana);
        if (p.lote) lineas.push("    Lote: " + p.lote);
        if (p.etapa) lineas.push("    Etapa: " + p.etapa);
        if (p.modelo) lineas.push("    Modelo: " + p.modelo);
        if (p.promotor) lineas.push("    Promotor: " + p.promotor);
    }
    return lineas.join("\n");
}

/* ---------- contador diario ---------- */
function hoyISO() { return new Date().toISOString().slice(0, 10); }
function setContador(n) {
    $("#contador-num").textContent = n === null || n === undefined ? "—" : n;
    const chip = $("#contador");
    if (n === 0) chip.classList.add("text-red-300", "border-red-500/40", "bg-red-500/10");
    else chip.classList.remove("text-red-300", "border-red-500/40", "bg-red-500/10");
}
function restantesDeRespuesta(resp) {
    const v = resp.headers.get("X-Consultas-Restantes");
    if (v !== null) { setContador(parseInt(v, 10)); localStorage.setItem("c360_" + hoyISO(), v); }
}
function cargarContador() {
    const guardado = localStorage.getItem("c360_" + hoyISO());
    if (guardado !== null) setContador(parseInt(guardado, 10));
    fetch(API_BASE + "/api/v1/estado", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (d && d.consultas_restantes !== undefined) setContador(d.consultas_restantes); })
        .catch(() => {});
}

/* ---------- tabs ---------- */
function initTabs() {
    $$(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            $$(".tab-btn").forEach((b) => b.classList.remove("activo"));
            btn.classList.add("activo");
            const tab = btn.dataset.tab;
            $$(".panel").forEach((p) => p.classList.add("hidden"));
            $(`[data-panel="${tab}"]`).classList.remove("hidden");
        });
    });
}

/* ---------- carga y errores ---------- */
const RESULTADOS = $("#resultados");
function limpiarResultados() { RESULTADOS.innerHTML = ""; }
function agregarConAnimacion(card) {
    // Las tarjetas creadas dinámicamente NO son observadas por el IntersectionObserver
    // de la página (solo ve los elementos del HTML inicial). Sin esto quedan con
    // opacity: 0 y "no aparecen". Se añade is-visible tras insertarlas.
    RESULTADOS.appendChild(card);
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("is-visible")));
}
function tarjetaError(msg, extra) {
    const card = el("div", "glass-card rounded-2xl p-7 mb-6 border-red-500/30");
    card.appendChild(el("p", "font-semibold text-red-300", "⚠ " + msg));
    if (extra) card.appendChild(el("p", "mt-2 text-sm text-white/60", extra));
    return card;
}
function spinnerBtn(btn, activo) {
    if (activo) {
        btn.dataset.original = btn.innerHTML;
        btn.innerHTML = '<span class="spinner mr-2 align-middle"></span>' + btn.textContent.trim();
        btn.disabled = true;
        btn.classList.add("opacity-80", "cursor-wait");
    } else {
        btn.innerHTML = btn.dataset.original || btn.textContent;
        btn.disabled = false;
        btn.classList.remove("opacity-80", "cursor-wait");
    }
}

/* ---------- render DNI ---------- */
function renderDni(d) {
    const card = el("div", "glass-card rounded-2xl p-5 mb-4 animate-in");
    const head = el("div", "flex items-start justify-between gap-3 flex-wrap");
    head.appendChild(el("h2", "text-lg font-bold leading-snug", d.completos || "Sin nombre"));
    const der = el("div", "flex items-center gap-2 flex-wrap shrink-0");
    der.appendChild(badge("DNI " + d.dni, "verde"));
    der.appendChild(btnCopiar(textoDni(d)));
    head.appendChild(der);
    card.appendChild(head);
    if (d.desde_cache) card.appendChild(el("p", "mt-1 text-[10px] text-white/35", "Respuesta desde caché"));
    const grid = el("div", "mt-2 grid sm:grid-cols-2 gap-x-8");
    const filas = [
        ["Nombres", d.nombres],
        ["Apellido paterno", d.apellido_paterno],
        ["Apellido materno", d.apellido_materno],
    ];
    if (d.fecha_nacimiento) filas.push(["Fecha de nacimiento", d.fecha_nacimiento]);
    filas.forEach(([l, v]) => {
        if (!v) return;
        const fila = el("div", "flex items-baseline justify-between gap-3 py-1.5 border-b border-white/5");
        fila.appendChild(el("span", "text-xs text-white/50 shrink-0", l));
        fila.appendChild(el("span", "text-sm font-semibold text-right", String(v)));
        grid.appendChild(fila);
    });
    card.appendChild(grid);
    agregarConAnimacion(card);
}

/* ---------- render RUC ---------- */
function renderRuc(d) {
    const card = el("div", "glass-card rounded-2xl p-5 mb-4 animate-in");

    // Header compacto
    const head = el("div", "flex items-start justify-between gap-3 flex-wrap");
    head.appendChild(el("h2", "text-lg font-bold leading-snug", d.razon_social || d.ruc));
    const der = el("div", "flex items-center gap-2 flex-wrap shrink-0");
    der.appendChild(badge("RUC " + d.ruc, "gris"));
    const act = (d.estado || "").toUpperCase();
    der.appendChild(badge("ESTADO: " + d.estado, act === "ACTIVO" ? "emerald" : (act === "BAJA" ? "red" : "amber")));
    const con = (d.condicion || "").toUpperCase();
    if (con.includes("HABIDO")) der.appendChild(badge("CONDICIÓN: " + d.condicion, "emerald"));
    else if (con && con !== "---") der.appendChild(badge("CONDICIÓN: " + d.condicion, "red"));
    der.appendChild(btnCopiar(textoRuc(d)));
    head.appendChild(der);
    card.appendChild(head);
    if (d.desde_cache) card.appendChild(el("p", "mt-1 text-[10px] text-white/35", "Respuesta desde caché"));

    // Fila de dato plana (etiqueta ... valor) + grupo con sub-encabezado
    const filaDato = (l, v) => {
        if (!v || v === "---") return null;
        const fila = el("div", "flex items-baseline justify-between gap-3 py-1.5 border-b border-white/5");
        fila.appendChild(el("span", "text-xs text-white/50 shrink-0", l));
        fila.appendChild(el("span", "text-sm font-semibold text-right", String(v)));
        return fila;
    };
    const grupo = (titulo, pares) => {
        const g = el("div");
        g.appendChild(el("h4", "mb-1 text-[10px] font-bold uppercase tracking-widest text-forest-light", titulo));
        const c = el("div", "grid sm:grid-cols-2 gap-x-8");
        pares.forEach(([l, v]) => { const f = filaDato(l, v); if (f) c.appendChild(f); });
        g.appendChild(c);
        return g;
    };

    const dosCol = el("div", "grid md:grid-cols-2 gap-x-8 gap-y-4");
    dosCol.appendChild(grupo("Datos generales", [
        ["Tipo de contribuyente", d.tipo],
        ["Nombre comercial", d.comercial],
        ["Fecha de inscripción", d.fecha_inscrip],
        ["Inicio de actividades", d.fecha_inicio],
    ]));
    dosCol.appendChild(grupo("Operación", [
        ["Sistema de emisión", d.sistema_emision],
        ["Comercio exterior", d.comercio_exterior],
        ["Contabilidad", d.sistema_contabilidad],
        ["Emisor electrónico desde", d.emisor_electronico_desde],
        ["Afiliado al PLE desde", d.afiliado_ple],
    ]));
    card.appendChild(dosCol);

    card.appendChild(grupo("Emisión y comprobantes", [
        ["Comprobantes electrónicos", d.comprobantes_electronicos],
        ["Comprobantes de pago", d.comprobantes],
        ["Sistema de emisión electrónica", d.emision_electronica],
        ["Padrones", d.padrones],
    ]));
    card.appendChild(grupo("Ubicación y actividad", [
        ["Domicilio fiscal", d.domicilio],
        ["Actividades económicas", d.actividades],
    ]));

    // Sub-consultas SUNAT (compactas)
    if (d.subs) {
        card.appendChild(el("h3", "mt-4 mb-1.5 text-[11px] font-bold uppercase tracking-widest text-white/40", "Consultas SUNAT"));
        const NOMBRES_SUBS = {
            deudas_coactivas: "Deudas coactivas",
            representantes_legales: "Representantes legales",
            establecimientos_anexos: "Establecimientos anexos",
            informacion_historica: "Información histórica",
            omisiones_tributarias: "Omisiones tributarias",
            trabajadores: "Cantidad de trabajadores",
            actas_probatorias: "Actas probatorias",
            facturas_fisicas: "Facturas físicas",
            reactiva_peru: "Reactiva Perú",
            garantias_covid19: "Garantías COVID-19",
        };
        Object.entries(d.subs).forEach(([clave, sub]) => {
            const tieneCampos = sub.campos && Object.keys(sub.campos).length;
            const tieneTablas = sub.tablas && Object.keys(sub.tablas).length;
            if (!tieneCampos && !tieneTablas) return;
            const det = el("details", "mb-1.5 bg-white/5 rounded-lg overflow-hidden");
            const sum = el("summary", "cursor-pointer px-4 py-2.5 font-semibold text-xs hover:bg-white/5",
                NOMBRES_SUBS[clave] || clave);
            det.appendChild(sum);
            const cuerpo = el("div", "px-4 pb-3 text-xs space-y-1.5");
            if (sub.campos) {
                Object.entries(sub.campos).forEach(([l, v]) => {
                    if (!v) return;
                    const fila = el("div", "flex justify-between gap-4 border-b border-white/5 py-1");
                    fila.appendChild(el("span", "text-white/50", l));
                    fila.appendChild(el("span", "font-medium text-right", v));
                    cuerpo.appendChild(fila);
                });
            }
            if (sub.tablas) {
                Object.entries(sub.tablas).forEach(([heading, tablas]) => {
                    // Nota de sección cuando existe (ej: "Información actualizada al ...")
                    if (heading && heading !== "TABLA" && tablas.length) {
                        cuerpo.appendChild(el("p", "text-[10px] text-white/40 mt-1.5", heading));
                    }
                    tablas.forEach((tabla) => {
                        if (!tabla || !tabla.length) return;
                        const wrap = el("div", "overflow-x-auto");
                        const table = el("table", "w-full text-left text-[11px] my-1");
                        // Primera fila = encabezado de columnas
                        const thead = el("thead");
                        const headTr = el("tr", "text-[9px] uppercase tracking-wider text-white/40 border-b border-white/10");
                        (tabla[0] || []).forEach((c) => {
                            headTr.appendChild(el("th", "py-1 pr-2.5 font-bold whitespace-nowrap", c));
                        });
                        thead.appendChild(headTr);
                        table.appendChild(thead);
                        const tbody = el("tbody");
                        tabla.slice(1).forEach((row) => {
                            const tr = el("tr", "border-b border-white/5");
                            row.forEach((c) => {
                                tr.appendChild(el("td", "py-1 pr-2.5 align-top text-white/80", c));
                            });
                            tbody.appendChild(tr);
                        });
                        table.appendChild(tbody);
                        wrap.appendChild(table);
                        cuerpo.appendChild(wrap);
                    });
                });
            }
            det.appendChild(cuerpo);
            card.appendChild(det);
        });
    }
    agregarConAnimacion(card);
}

/* ---------- render FMV ---------- */
const ESTADO_DOT = {
    emerald: "#34d399", amber: "#fbbf24", sky: "#38bdf8",
    violet: "#a78bfa", orange: "#fb923c", red: "#f87171", gris: "#9ca3af",
};

function renderFmv(r) {
    if (r.error) {
        RESULTADOS.appendChild(tarjetaError("DNI " + r.dni + ": " + r.error));
        return;
    }
    const card = el("div", "glass-card rounded-2xl p-5 mb-4 animate-in");

    // Header compacto
    const head = el("div", "flex items-start justify-between gap-3 flex-wrap");
    const izq = el("div", "min-w-0");
    izq.appendChild(el("h2", "text-lg font-bold leading-snug", r.busqueda.nombre || "Postulante"));
    izq.appendChild(el("p", "text-xs text-white/50 mt-0.5",
        "DNI " + r.dni + " · Form. " + r.busqueda.formId +
        (r.busqueda.ubicacion ? " · " + r.busqueda.ubicacion : "") +
        (r.busqueda.fecha ? " · " + r.busqueda.fecha : "")));
    head.appendChild(izq);
    const der = el("div", "flex items-center gap-2 flex-wrap shrink-0");
    der.appendChild(badge("ESTADO: " + (r.estado_actual || r.busqueda.estado), keyEstado(r.estado_actual)));
    der.appendChild(btnCopiar(textoFmv(r)));
    head.appendChild(der);
    card.appendChild(head);
    if (r.desde_cache) card.appendChild(el("p", "mt-1 text-[10px] text-white/35", "Respuesta desde caché"));

    // Historial horizontal: INSCRITO → ELEGIBLE → … con fecha de inicio debajo
    if (r.historial && r.historial.length) {
        card.appendChild(el("h3", "mt-4 mb-2 text-[11px] font-bold uppercase tracking-widest text-white/40", "Historial"));
        const cadena = el("div", "flex flex-wrap items-start gap-y-3");
        r.historial.forEach((h, i) => {
            const ultimo = i === r.historial.length - 1;
            const paso = el("div", "flex items-start gap-2");
            const caja = el("div", "text-center min-w-[70px] px-1");
            caja.appendChild(el("span",
                "block text-[11px] font-bold leading-tight " + (ultimo ? "text-gold" : "text-white/85"),
                h.estado));
            caja.appendChild(el("span", "block text-[10px] text-white/45 mt-0.5",
                h.fechaInicio || "—"));
            paso.appendChild(caja);
            if (!ultimo) {
                paso.appendChild(el("span", "text-white/30 self-center text-sm leading-none", "→"));
            }
            cadena.appendChild(paso);
        });
        card.appendChild(cadena);
    }

    // Proyecto agrupado: COMPRA (financiamiento) y VIVIENDA (ubicación/modelo)
    const p = r.proyecto || {};
    const tieneProyecto = p.nombre && p.nombre !== "---";
    card.appendChild(el("h3", "mt-4 mb-1.5 text-[11px] font-bold uppercase tracking-widest text-white/40", "Proyecto"));
    if (tieneProyecto) {
        const filaDato = (l, v, extraCls) => {
            if (v === null || v === undefined || v === "" || v === "---") return null;
            const fila = el("div", "flex items-baseline justify-between gap-3 py-1.5 border-b border-white/5");
            fila.appendChild(el("span", "text-xs text-white/50 shrink-0", l));
            fila.appendChild(el("span", "text-sm text-right " + (extraCls || "font-semibold"), String(v)));
            return fila;
        };

        const grupos = el("div", "grid md:grid-cols-2 gap-x-8 gap-y-4");

        // Grupo COMPRA: Ahorro + Crédito + BFH = Valor de la vivienda
        const gCompra = el("div");
        gCompra.appendChild(el("h4", "mb-1 text-[10px] font-bold uppercase tracking-widest text-forest-light", "Compra"));
        const c1 = el("div");
        [
            ["Ahorro", dinero(p.montoAhorro)],
            ["Crédito", dinero(p.montoCredito)],
            ["Bono Familiar Habitacional", dinero(p.valorBFH)],
            ["Valor de la vivienda", dinero(p.valorVivienda), "font-bold text-gold"],
        ].forEach(([l, v, x]) => { const f = filaDato(l, v, x); if (f) c1.appendChild(f); });
        const fc = filaDato("Fecha de contrato", p.fechaContrato);
        if (fc) c1.appendChild(fc);
        gCompra.appendChild(c1);

        // Grupo VIVIENDA: identificación y ubicación
        const gViv = el("div");
        gViv.appendChild(el("h4", "mb-1 text-[10px] font-bold uppercase tracking-widest text-forest-light", "Vivienda"));
        const c2 = el("div");
        [
            ["Proyecto", p.nombre],
            ["CUH", p.cuh],
            ["Manzana", p.manzana],
            ["Lote", p.lote],
            ["Etapa", p.etapa],
            ["Modelo", p.modelo],
            ["Promotor", p.promotor],
            ["Plazo de obra", p.plazoEjecucionObra],
        ].forEach(([l, v]) => { const f = filaDato(l, v); if (f) c2.appendChild(f); });
        gViv.appendChild(c2);

        grupos.appendChild(gCompra);
        grupos.appendChild(gViv);
        card.appendChild(grupos);
    } else {
        card.appendChild(el("p", "text-xs text-white/55",
            "Sin proyecto asignado (estado " + (r.estado_actual || "—") + ")."));
    }
    agregarConAnimacion(card);
}

/* ---------- resumen en tabla para lotes de más de 1 DNI ---------- */
function textoResumenLote(lista) {
    const lineas = ["RESUMEN DE POSTULACIONES (" + lista.length + ")"];
    lista.forEach((r) => {
        if (r.error) { lineas.push("• " + r.dni + ": " + r.error); return; }
        const b = r.busqueda || {};
        const p = r.proyecto || {};
        lineas.push("• " + r.dni + " | " + (b.nombre || "—") + " | " +
            (r.estado_actual || b.estado) + " | " + (b.fecha || "—") + " | " + (b.formId || "—") +
            (p.nombre && p.nombre !== "---" ? " | " + p.nombre : ""));
    });
    return lineas.join("\n");
}

function renderResumenLote(lista) {
    const card = el("div", "glass-card rounded-2xl p-5 mb-4 animate-in");
    const head = el("div", "flex items-center justify-between gap-3 flex-wrap mb-3");
    const titulo = el("div");
    titulo.appendChild(el("h2", "text-lg font-bold", "Resumen de " + lista.length + " postulaciones"));
    titulo.appendChild(el("p", "text-[11px] text-white/50 mt-0.5", "Haz clic en una fila para ver el detalle completo"));
    head.appendChild(titulo);
    const acc = el("div", "flex items-center gap-2");
    acc.appendChild(btnCopiar(textoResumenLote(lista)));
    head.appendChild(acc);
    card.appendChild(head);

    const wrap = el("div", "overflow-x-auto");
    const tabla = el("table", "w-full text-left text-sm min-w-[680px]");
    const thead = el("thead");
    const trH = el("tr", "text-[10px] uppercase tracking-widest text-white/40 border-b border-white/10");
    ["DNI", "Postulante", "Estado", "Fecha", "Formulario", "Proyecto"].forEach((c) => {
        trH.appendChild(el("th", "py-2 pr-3 font-bold whitespace-nowrap", c));
    });
    thead.appendChild(trH);
    tabla.appendChild(thead);

    const tbody = el("tbody");
    lista.forEach((r) => {
        const tr = el("tr", "border-b border-white/5 hover:bg-white/5 cursor-pointer transition");
        if (r.error) {
            tr.appendChild(el("td", "py-2 pr-3 font-mono text-xs", r.dni));
            tr.appendChild(el("td", "py-2 pr-3 text-red-300", r.error));
            tbody.appendChild(tr);
            return;
        }
        const b = r.busqueda || {};
        const p = r.proyecto || {};
        tr.appendChild(el("td", "py-2 pr-3 text-xs whitespace-nowrap", r.dni));
        tr.appendChild(el("td", "py-2 pr-3 font-semibold whitespace-nowrap", b.nombre || "—"));
        const tdEstado = el("td", "py-2 pr-3");
        tdEstado.appendChild(badge((r.estado_actual || b.estado) || "—", keyEstado(r.estado_actual)));
        tr.appendChild(tdEstado);
        tr.appendChild(el("td", "py-2 pr-3 text-xs text-white/50 whitespace-nowrap", b.fecha || "—"));
        tr.appendChild(el("td", "py-2 pr-3 text-xs whitespace-nowrap", b.formId || "—"));
        tr.appendChild(el("td", "py-2 pr-3 text-xs text-white/60 max-w-[200px] truncate",
            p.nombre && p.nombre !== "---" ? p.nombre : "—"));
        tr.addEventListener("click", () => mostrarDetalleLote(r, lista));
        tbody.appendChild(tr);
    });
    tabla.appendChild(tbody);
    wrap.appendChild(tabla);
    card.appendChild(wrap);
    agregarConAnimacion(card);
}

function mostrarDetalleLote(r, lista) {
    limpiarResultados();
    const barra = el("div", "flex items-center gap-3 mb-4");
    const volver = el("button", "text-xs font-semibold text-gold border border-gold/40 hover:bg-gold/10 rounded-full px-4 py-1.5 transition");
    volver.type = "button";
    volver.textContent = "← Volver al resumen";
    volver.addEventListener("click", () => { limpiarResultados(); renderResumenLote(lista); });
    barra.appendChild(volver);
    RESULTADOS.appendChild(barra);
    RESULTADOS.appendChild(ctaPromo(CTA_TEXTO.fmv));
    renderFmv(r);
}

/* ---------- CTA de promoción (banner destacado) ---------- */
function ctaPromo(texto) {
    // Fondo DORADO sólido con texto oscuro: contraste máximo sobre la página oscura
    const c = el("div",
        "mt-5 flex flex-col sm:flex-row items-center gap-4 rounded-2xl px-6 py-5 " +
        "bg-gold border border-gold-light shadow-[0_0_30px_rgba(201,186,139,0.45)]");
    const icono = el("span",
        "w-11 h-11 rounded-full bg-[#0d1817] text-gold flex items-center justify-center shrink-0 shadow-lg");
    icono.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>';
    c.appendChild(icono);
    c.appendChild(el("p", "flex-1 text-lg font-bold text-[#0d1817] leading-snug", texto));
    const a = el("a",
        "bg-[#0d1817] hover:bg-[#122420] text-gold font-bold px-7 py-3.5 rounded-full whitespace-nowrap transition hover:scale-105 shadow-lg",
        "WhatsApp →");
    a.href = WHATSAPP;
    a.target = "_blank";
    c.appendChild(a);
    return c;
}

/* ---------- consultas DNI / RUC ---------- */
const CTA_TEXTO = {
    dni: "¿Necesitas validar muchos DNIs? Nosotros lo automatizamos para tu empresa.",
    ruc: "¿Verificas proveedores seguido? Nosotros lo automatizamos para tu empresa.",
    fmv: "¿Gestionas postulaciones Techo Propio? Nosotros lo automatizamos para tu empresa.",
    lote: "¿Validas postulaciones en lote seguido? Nosotros lo automatizamos para tu empresa.",
};

function consultar(route, valor, renderFn, tipo) {
    limpiarResultados();
    const btn = document.activeElement;
    if (btn && btn.tagName === "BUTTON") spinnerBtn(btn, true);
    const card = el("div", "glass-card rounded-2xl p-8 text-center animate-in");
    card.appendChild(el("p", "text-white/70", "Consultando…"));
    agregarConAnimacion(card);

    fetch(API_BASE + route, { cache: "no-store" })
        .then(async (resp) => {
            restantesDeRespuesta(resp);
            if (resp.status === 429) {
                RESULTADOS.innerHTML = "";
    RESULTADOS.appendChild(tarjetaError(
                "Límite diario alcanzado (10 consultas gratis por día).",
                "Vuelve mañana, o escríbenos por WhatsApp para planes con más consultas o integración a tu sistema."));
                RESULTADOS.appendChild(ctaPromo("¿Necesitas más consultas o validación masiva?"));
                return;
            }
            const data = await resp.json();
            RESULTADOS.innerHTML = "";
            if (!resp.ok) {
                RESULTADOS.appendChild(tarjetaError(data.detail || "Error al consultar. Intenta nuevamente."));
                return;
            }
            // Banner promocional SIEMPRE arriba de los resultados
            RESULTADOS.appendChild(ctaPromo(CTA_TEXTO[tipo] || ""));
            renderFn(data);
        })
        .catch(() => {
            RESULTADOS.innerHTML = "";
            RESULTADOS.appendChild(tarjetaError(
                "No se pudo conectar con el servicio de consultas.",
                "Verifica que el servidor esté corriendo o inténtalo más tarde."));
        })
        .finally(() => { if (btn && btn.tagName === "BUTTON") spinnerBtn(btn, false); });
}

/* ---------- consulta lote FMV ---------- */
function initFmv() {
    const ta = $("#in-fmv");
    const chips = $("#chips-fmv");
    let dnis = [];

    function normalizar(texto) {
        const vistos = [];
        (texto.match(/\b\d{8}\b/g) || []).forEach((d) => { if (!vistos.includes(d)) vistos.push(d); });
        return vistos.slice(0, 10);
    }
    function renderChips() {
        chips.innerHTML = "";
        dnis.forEach((d, i) => {
            const c = el("span", "flex items-center gap-2 bg-forest/20 border border-forest/40 rounded-full px-3 py-1 text-xs font-semibold");
            c.appendChild(el("span", "text-forest-light", d));
            const x = el("button", "text-white/60 hover:text-red-300", "✕");
            x.type = "button";
            x.addEventListener("click", () => {
                dnis.splice(i, 1);
                renderChips();
            });
            c.appendChild(x);
            chips.appendChild(c);
        });
        const sobra = (ta.value.match(/\b\d{8}\b/g) || []).length - dnis.length;
        if (sobra > 0) chips.appendChild(el("span", "text-xs text-amber-300 font-semibold", "… y " + sobra + " más (máx 10)"));
    }

    ta.addEventListener("input", () => {
        dnis = normalizar(ta.value);
        renderChips();
    });

    $("#form-fmv").addEventListener("submit", (e) => {
        e.preventDefault();
        dnis = normalizar(ta.value);
        if (!dnis.length) {
            chips.innerHTML = "";
            chips.appendChild(el("span", "text-xs text-red-300 font-semibold", "No se detectaron DNIs (8 dígitos)."));
            return;
        }
        limpiarResultados();
        const card = el("div", "glass-card rounded-2xl p-8 text-center animate-in");
        card.appendChild(el("p", "text-white/70", "Consultando " + dnis.length + " DNI(s)…"));
        agregarConAnimacion(card);

        $("#progreso-fmv").classList.remove("hidden");
        $("#barra-fmv").classList.add("progress-anim");
        let tick = 0;
        $("#progreso-texto").textContent = "Consultando 1 de " + dnis.length + "…";
        const timer = setInterval(() => {
            tick = (tick + 1) % dnis.length;
            $("#progreso-texto").textContent = "Consultando " + (tick + 1) + " de " + dnis.length + "…";
        }, 900);

        fetch(API_BASE + "/api/v1/fmv/lote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dnis }),
        })
            .then(async (resp) => {
                restantesDeRespuesta(resp);
                const data = await resp.json();
                RESULTADOS.innerHTML = "";
                if (!resp.ok) {
                    RESULTADOS.appendChild(tarjetaError(data.detail || "Error al consultar el lote."));
                    return;
                }
                const res = data.resultados || [];
                // Banner promocional SIEMPRE arriba de los resultados
                RESULTADOS.appendChild(ctaPromo(CTA_TEXTO.lote));
                if (res.length > 1) {
                    // Lote de varios DNIs: resumen en tabla para revisar de un vistazo
                    renderResumenLote(res);
                } else {
                    res.forEach(renderFmv);
                }
            })
            .catch(() => {
                RESULTADOS.innerHTML = "";
                RESULTADOS.appendChild(tarjetaError("No se pudo conectar con el servicio de consultas."));
            })
            .finally(() => {
                clearInterval(timer);
                $("#progreso-fmv").classList.add("hidden");
                $("#barra-fmv").classList.remove("progress-anim");
            });
    });
}

/* ---------- animaciones on-scroll ---------- */
function initAnimaciones() {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-visible"); obs.unobserve(en.target); } });
    }, { rootMargin: "0px 0px 100px 0px" });
    document.querySelectorAll(".animate-in").forEach((n) => obs.observe(n));
}

/* ---------- arranque ---------- */
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initFmv();
    initAnimaciones();
    cargarContador();

    $("#form-dni").addEventListener("submit", (e) => {
        e.preventDefault();
        const v = $("#in-dni").value.trim();
        if (!/^\d{8}$/.test(v)) { limpiarResultados(); RESULTADOS.appendChild(tarjetaError("El DNI debe tener 8 dígitos.")); return; }
        consultar("/api/v1/dni/" + v, v, renderDni, "dni");
    });
    $("#form-ruc").addEventListener("submit", (e) => {
        e.preventDefault();
        const v = $("#in-ruc").value.trim();
        if (!/^\d{11}$/.test(v)) { limpiarResultados(); RESULTADOS.appendChild(tarjetaError("El RUC debe tener 11 dígitos.")); return; }
        consultar("/api/v1/ruc/" + v, v, renderRuc, "ruc");
    });
});
