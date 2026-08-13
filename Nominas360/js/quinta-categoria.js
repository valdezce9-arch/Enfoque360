/**
 * Módulo de cálculo de Renta de Quinta Categoría (Perú)
 * Basado en normas SUNAT - Ejercicio gravable
 *
 * Uso (navegador):
 *   <script src="js/quinta-categoria.js"></script>
 *   const calc = new QuintaCategoria({ anio: 2025 });
 *   const resultado = calc.calcularMes({ remuneracionMensual: 5000, mesActual: 5 });
 *
 * Uso (Node):
 *   const { QuintaCategoria } = require('./quinta-categoria.js');
 */
(function() {
'use strict';

const TRAMOS_PREDETERMINADOS = [
  { desde: 0, hasta: 5, tasa: 0.08 },
  { desde: 5, hasta: 20, tasa: 0.14 },
  { desde: 20, hasta: 35, tasa: 0.17 },
  { desde: 35, hasta: 45, tasa: 0.20 },
  { desde: 45, hasta: Infinity, tasa: 0.30 },
];

class QuintaCategoria {
  constructor({ anio, uit, tramos } = {}) {
    this.anio = anio || new Date().getFullYear();
    this.uit = uit ?? (uitPorAnio(this.anio) || 5350);
    this.tramos = tramos || TRAMOS_PREDETERMINADOS;
  }

  enSoles(cantidad) { return this.uit * cantidad; }

  proyectarIngresoAnual({
    remuneracionMensual, mesActual, gratificaciones = [0, 0],
    ingresosExtraordinariosPrevios = 0, ingresosExtraordinariosMes = 0,
  }) {
    const mesesTranscurridos = mesActual - 1;
    const mesesRestantes = 12 - mesActual + 1;
    const yaPercibido = mesesTranscurridos * remuneracionMensual + ingresosExtraordinariosPrevios;
    const porPercibir = mesesRestantes * remuneracionMensual + ingresosExtraordinariosMes;
    const totalGratificaciones = gratificaciones.reduce((a, b) => a + b, 0);
    return yaPercibido + porPercibir + totalGratificaciones;
  }

  calcularRentaNeta(ingresoBrutoAnual) {
    return Math.max(0, ingresoBrutoAnual - 7 * this.uit);
  }

  calcularImpuestoAnual(rentaNeta) {
    let impuesto = 0;
    let restante = rentaNeta;
    for (const t of this.tramos) {
      const base = t.desde * this.uit;
      const techo = t.hasta === Infinity ? Infinity : t.hasta * this.uit;
      const porcion = Math.min(restante, techo - base);
      if (porcion <= 0) break;
      impuesto += porcion * t.tasa;
      restante -= porcion;
    }
    return impuesto;
  }

  desglosarImpuesto(rentaNeta) {
    const tramos = [];
    let restante = rentaNeta;
    for (const t of this.tramos) {
      const base = t.desde * this.uit;
      const techo = t.hasta === Infinity ? Infinity : t.hasta * this.uit;
      const porcion = Math.min(restante, techo - base);
      if (porcion <= 0) break;
      tramos.push({
        tramo: `${t.desde}-${t.hasta === Infinity ? '∞' : t.hasta} UIT`,
        desdeSoles: base, hastaSoles: techo === Infinity ? Infinity : techo,
        porcion, tasa: t.tasa, impuesto: +(porcion * t.tasa).toFixed(2),
      });
      restante -= porcion;
    }
    return { tramos, total: +(tramos.reduce((a, t) => a + t.impuesto, 0)).toFixed(2) };
  }

  calcularRetencionMensual({ impuestoAnual, retencionesAcumuladas = [], mesActual }) {
    if (mesActual < 1 || mesActual > 12) throw new Error('mesActual debe estar entre 1 y 12');
    const totalRetenido = retencionesAcumuladas.reduce((a, b) => a + b, 0);
    if (mesActual === 12) return Math.max(0, +(impuestoAnual - totalRetenido).toFixed(2));
    const divisor = 12 - mesActual + 1;
    return Math.max(0, +((impuestoAnual - totalRetenido) / divisor).toFixed(2));
  }

  calcularRetencionAdicional({
    remuneracionMensual, mesActual, gratificaciones = [0, 0],
    ingresosExtraordinariosPrevios = 0, pagoExtraordinarioMes = 0,
  }) {
    if (pagoExtraordinarioMes <= 0) return 0;
    const sinExtra = this.proyectarIngresoAnual({
      remuneracionMensual, mesActual, gratificaciones,
      ingresosExtraordinariosPrevios, ingresosExtraordinariosMes: 0,
    });
    const conExtra = this.proyectarIngresoAnual({
      remuneracionMensual, mesActual, gratificaciones,
      ingresosExtraordinariosPrevios, ingresosExtraordinariosMes: pagoExtraordinarioMes,
    });
    const diff = this.calcularImpuestoAnual(this.calcularRentaNeta(conExtra))
              - this.calcularImpuestoAnual(this.calcularRentaNeta(sinExtra));
    return +Math.max(0, diff / (12 - mesActual + 1)).toFixed(2);
  }

  calcularMes({
    remuneracionMensual, mesActual, gratificaciones = [0, 0],
    ingresosExtraordinariosPrevios = 0, ingresosExtraordinariosMes = 0,
    retencionesAcumuladas = [], pagoExtraordinarioMes = 0,
  }) {
    const proyectoBase = this.proyectarIngresoAnual({
      remuneracionMensual, mesActual, gratificaciones,
      ingresosExtraordinariosPrevios, ingresosExtraordinariosMes: 0,
    });
    const proyectoConExtra = pagoExtraordinarioMes > 0
      ? this.proyectarIngresoAnual({ remuneracionMensual, mesActual, gratificaciones, ingresosExtraordinariosPrevios, ingresosExtraordinariosMes: pagoExtraordinarioMes })
      : proyectoBase;

    const rentaNetaBase = this.calcularRentaNeta(proyectoBase);
    const impuestoAnualBase = this.calcularImpuestoAnual(rentaNetaBase);
    const retencionBase = this.calcularRetencionMensual({ impuestoAnual: impuestoAnualBase, retencionesAcumuladas, mesActual });
    const retencionAdicional = this.calcularRetencionAdicional({ remuneracionMensual, mesActual, gratificaciones, ingresosExtraordinariosPrevios, pagoExtraordinarioMes });
    const retencionTotal = +(retencionBase + retencionAdicional).toFixed(2);

    const rentaNetaCon = this.calcularRentaNeta(proyectoConExtra);
    const impuestoAnualCon = this.calcularImpuestoAnual(rentaNetaCon);

    return {
      anio: this.anio, uit: this.uit, mesActual, remuneracionMensual, gratificaciones,
      ingresosExtraordinariosPrevios, ingresosExtraordinariosMes,
      ingresoBrutoAnual: +proyectoConExtra.toFixed(2),
      deduccion7UIT: 7 * this.uit,
      rentaNeta: +rentaNetaCon.toFixed(2),
      impuestoAnual: +impuestoAnualCon.toFixed(2),
      desglose: this.desglosarImpuesto(rentaNetaCon).tramos,
      retencionBase, retencionAdicional, retencionTotal,
      estaExonerado: rentaNetaCon <= 0,
    };
  }

  calcularAnio({ remuneracionMensual, gratificaciones = [0, 0], extraordinarios = {} }) {
    const meses = [];
    let retenciones = [];
    for (let mes = 1; mes <= 12; mes++) {
      const extraordinariosPrevios = Object.entries(extraordinarios)
        .filter(([m]) => parseInt(m) < mes).reduce((a, [_, v]) => a + v, 0);
      const extraordinariosMes = extraordinarios[mes] || 0;
      const r = this.calcularMes({
        remuneracionMensual, mesActual: mes, gratificaciones,
        ingresosExtraordinariosPrevios: extraordinariosPrevios,
        ingresosExtraordinariosMes: extraordinariosMes,
        retencionesAcumuladas: retenciones,
        pagoExtraordinarioMes: extraordinariosMes,
      });
      retenciones.push(r.retencionTotal);
      meses.push(r);
    }
    const totalRetenido = retenciones.reduce((a, b) => a + b, 0);
    return {
      anio: this.anio, uit: this.uit, remuneracionMensual, gratificaciones,
      extraordinariosTotal: Object.values(extraordinarios).reduce((a, b) => a + b, 0),
      ingresoBrutoAnual: remuneracionMensual * 12 + gratificaciones.reduce((a, b) => a + b, 0),
      meses, totalRetenido: +totalRetenido.toFixed(2),
    };
  }
}

function uitPorAnio(anio) {
  const tabla = {
    2004: 3200, 2005: 3300, 2006: 3400, 2007: 3450, 2008: 3500,
    2009: 3550, 2010: 3600, 2011: 3600, 2012: 3650, 2013: 3700,
    2014: 3800, 2015: 3850, 2016: 3950, 2017: 4050, 2018: 4150,
    2019: 4200, 2020: 4300, 2021: 4400, 2022: 4600, 2023: 4950,
    2024: 5150, 2025: 5350, 2026: 5500,
  };
  return tabla[anio] || null;
}

// Exponer para navegador
if (typeof window !== 'undefined') {
  window.QuintaCategoria = QuintaCategoria;
  window.uitPorAnio = uitPorAnio;
}

// Exponer para Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QuintaCategoria, uitPorAnio };
}

})();
