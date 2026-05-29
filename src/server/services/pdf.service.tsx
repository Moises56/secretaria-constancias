import "server-only";

import { type Constancia } from "@prisma/client";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import { env } from "@/env";
import { TYPE_CONFIG } from "@/lib/constancia-template";
import { dateInWords } from "@/lib/date-words";
import { displayFolio } from "@/lib/utils/format";
import { sanitizeForPdf } from "@/lib/utils/sanitize";
import { generateQrBuffer } from "@/server/services/qr.service";

const inches = (n: number) => n * 72; // 72 pt = 1 in

const styles = StyleSheet.create({
  page: {
    paddingTop: inches(env.PDF_TOP_MARGIN_INCHES),
    paddingBottom: inches(env.PDF_BOTTOM_MARGIN_INCHES),
    paddingLeft: inches(env.PDF_LEFT_MARGIN_INCHES),
    paddingRight: inches(env.PDF_RIGHT_MARGIN_INCHES),
    fontFamily: "Helvetica",
    fontSize: 12,
    lineHeight: 1.6,
  },
  title: {
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  body: { textAlign: "justify" },
  bold: { fontFamily: "Helvetica-Bold" },
  vigencia: {
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 18,
  },
  signerName: {
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    // ~1.67 cm de aire entre el último párrafo del cuerpo y el nombre
    // del firmante: en el impreso va un sello físico de la Secretaría
    // sobre el papel membretado y antes (marginTop:64) lo tapaba.
    marginTop: 120,
  },
  signerTitle: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 2,
  },
  spacer14: { height: 14 },
  // QR en bottom-RIGHT: el sello físico de AMDC ocupa el bottom-LEFT del
  // papel membretado. Sin caption — el QR se basta a sí mismo y la URL
  // larga distraía. Quien lo escanee lleva directo a /v/{token}.
  qrFooter: {
    position: "absolute",
    bottom: 24,
    right: inches(env.PDF_RIGHT_MARGIN_INCHES),
  },
  qrImage: { width: 64, height: 64 },
});

interface DocumentProps {
  c: Constancia;
  qrBuffer: Buffer;
}

function ConstanciaDocument({ c, qrBuffer }: DocumentProps) {
  const cfg = TYPE_CONFIG[c.type];
  const intl = cfg.includeInternationalClause ? ", República de Honduras, Centroamérica" : "";
  const d = dateInWords(c.issuedAt);

  return (
    <Document
      title={`Constancia de Vecindad ${c.folio}`}
      author="Secretaría Municipal del Distrito Central"
      subject="Constancia de Vecindad"
      creator="constancias-amdc"
      producer="constancias-amdc"
      language="es-HN"
    >
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>CONSTANCIA DE VECINDAD N. {displayFolio(c)}</Text>

        <View style={styles.spacer14} />

        <Text style={styles.body}>
          Por medio de la presente se <Text style={styles.bold}>HACE CONSTAR:</Text> Que, de
          conformidad a los documentos presentados ante esta Alcaldía Municipal, el (la) ciudadano
          (a) <Text style={styles.bold}>{sanitizeForPdf(c.applicantFullName).toUpperCase()}</Text>,
          con Documento Nacional de Identificación{" "}
          <Text style={styles.bold}>No. {sanitizeForPdf(c.applicantIdNumber)}</Text>, {cfg.verbForm}{" "}
          vecino (a) de este Municipio del Distrito Central, departamento de Francisco Morazán
          {intl}.
        </Text>

        <Text style={styles.vigencia}>VIGENCIA POR SEIS (6) MESES</Text>

        <Text style={styles.body}>
          Y para los fines que el interesado convenga, se le extiende la presente en la ciudad de
          Tegucigalpa, Municipio del Distrito Central, departamento de Francisco Morazán, a los{" "}
          {d.day} días del mes de {d.month} del año {d.year}.
        </Text>

        <Text style={styles.signerName}>{sanitizeForPdf(c.signerName)}</Text>
        <Text style={styles.signerTitle}>{sanitizeForPdf(c.signerTitleLine)}</Text>

        <View style={styles.qrFooter} fixed>
          {/* @react-pdf Image no soporta alt; el QR es decorativo en el PDF impreso. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={qrBuffer} style={styles.qrImage} />
        </View>
      </Page>
    </Document>
  );
}

export async function generateConstanciaPdf(c: Constancia): Promise<Buffer> {
  const qrBuffer = await generateQrBuffer(c.verificationToken);
  return renderToBuffer(<ConstanciaDocument c={c} qrBuffer={qrBuffer} />);
}
