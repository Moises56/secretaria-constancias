// Plantilla PURA — sin I/O, sin acceso a DB.
// Se usa para:
//   - Preview en pantalla (live update mientras el operador tipea)
//   - Tests de snapshot
//   - Versión PDF: misma estructura, pero con <Text> + bolds inline.

import { type ConstanciaType } from "@prisma/client";

import { dateInWords } from "@/lib/date-words";

export interface TypeConfig {
  verbForm: "fue" | "es";
  includeInternationalClause: boolean;
}

export const TYPE_CONFIG: Record<ConstanciaType, TypeConfig> = {
  CVD: { verbForm: "fue", includeInternationalClause: false },
  CVP: { verbForm: "es", includeInternationalClause: false },
  CVE: { verbForm: "es", includeInternationalClause: true },
};

export const TYPE_LABEL: Record<ConstanciaType, string> = {
  CVD: "Vecindad — Residencia pasada",
  CVP: "Vecindad — Residencia vigente",
  CVE: "Vecindad — Uso en el extranjero",
};

export const TYPE_DESCRIPTION: Record<ConstanciaType, string> = {
  CVD: "Para quien fue vecino de este municipio en el pasado.",
  CVP: "Para residente actual, uso nacional.",
  CVE: "Para residente actual, uso fuera del país (cláusula internacional incluida).",
};

export interface RenderData {
  folioNumber: number;
  folioYear: number;
  fullName: string;
  idNumber: string;
  type: ConstanciaType;
  issuedAt: Date;
  signerName: string;
  signerTitleLine: string;
}

export const INTL_CLAUSE = ", República de Honduras, Centroamérica";

export function renderConstanciaText(data: RenderData): string {
  const cfg = TYPE_CONFIG[data.type];
  const intl = cfg.includeInternationalClause ? INTL_CLAUSE : "";
  const d = dateInWords(data.issuedAt);

  return [
    `CONSTANCIA DE VECINDAD N. ${data.folioNumber}-${data.folioYear}`,
    "",
    `Por medio de la presente se HACE CONSTAR: Que, de conformidad a los ` +
      `documentos presentados ante esta Alcaldía Municipal, el (la) ciudadano ` +
      `(a) ${data.fullName.toUpperCase()}, con Documento Nacional de ` +
      `Identificación No. ${data.idNumber}, ${cfg.verbForm} vecino (a) de este ` +
      `Municipio del Distrito Central, departamento de Francisco Morazán${intl}.`,
    "",
    "VIGENCIA POR SEIS (6) MESES",
    "",
    `Y para los fines que el interesado convenga, se le extiende la presente ` +
      `en la ciudad de Tegucigalpa, Municipio del Distrito Central, ` +
      `departamento de Francisco Morazán, a los ${d.day} días del mes de ` +
      `${d.month} del año ${d.year}.`,
    "",
    "",
    data.signerName,
    data.signerTitleLine,
  ].join("\n");
}
