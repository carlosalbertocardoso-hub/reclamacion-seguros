import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import mammoth from 'mammoth';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Importar pdfjs-dist dinámicamente
let pdfjsLib: any = null;

async function initPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
  }
  return pdfjsLib;
}

const SYSTEM_PROMPT = `Eres un abogado especialista en accidentes de tráfico y reclamaciones a compañías
aseguradoras en España. Tienes profundo conocimiento de:
- RDL 8/2004 (Responsabilidad Civil y Seguro en la Circulación de Vehículos a Motor)
- Ley 35/2015 (Baremo de indemnizaciones por accidentes de tráfico)
- LCS 50/1980 art. 22 (plazo de respuesta obligatorio de la aseguradora: 3 meses)
- Plazos de prescripción: 1 año para daños personales, 3 años para daños materiales

Redacta una RECLAMACIÓN PREVIA (solicitud de oferta motivada) conforme al artículo 7 del RDL 8/2004.
Esta es una reclamación extrajudicial previa a cualquier acción legal.

ESTRUCTURA OBLIGATORIA:

**ENCABEZAMIENTO**
"Muy señores míos;"
"Por la presente y al amparo de lo dispuesto en el artículo 7 del Real Decreto Legislativo 8/2004
por el que se aprueba el texto refundido de la Ley sobre Responsabilidad Civil y seguro en la
Circulación de vehículos a Motor procedo a formular RECLAMACIÓN PREVIA..."

**SECCIONES NUMERADAS:**
1. SOBRE EL RECLAMANTE LESIONADO: Nombre, edad, DNI
2. SOBRE LA IDENTIFICACIÓN Y CIRCUNSTANCIAS DEL SINIESTRO:
   - Ubicación exacta (carretera, km, localidad)
   - Fecha y hora
   - Vehículos implicados (marca, modelo, matrícula)
   - Descripción clara de dinámica y responsabilidad del vehículo asegurado
   - Estado de los daños (destrozo, inservibilidad, etc.)
3. SOBRE LAS LESIONES SUFRIDAS:
   - Atención de urgencias (fechas)
   - Lesiones específicas (diagnósticos médicos)
   - Baja laboral (duración exacta, impacto laboral)
   - Limitaciones de autonomía personal
4. RESUMEN SOBRE LA VALORACIÓN DEL DAÑO PERSONAL:
   - Juicio clínico
   - Lesiones temporales (número exacto de días de baja)
   - Secuelas permanentes (con referencias a baremo: códigos 03013, 03075, etc.)
   - Descripción de secuelas persistentes
5. DAÑO EMERGENTE: Gastos concretos (medicinas, collarín, gasolina, fisioterapia, resonancia magnética, etc.)
6. LUCRO CESANTE: Pérdida de ingresos durante baja laboral, con referencia a nóminas
7. RELACIÓN DE DOCUMENTOS: Lista de documentos adjuntos
8. PETICIÓN CONCRETA Y LEGAL:
   - "Por todo lo anteriormente expuesto, ruego realicen OFERTA MOTIVADA conforme a lo dispuesto en el
     artículo 7.4 del Real Decreto Legislativo 8/2004..."
   - Plazo de respuesta: 3 meses (art. 22 LCS)
   - Apercibimiento de acciones legales si no se atiende

**CIERRE**
"Sin más, quedo a la espera de su respuesta.
Reciban un cordial saludo,"
[Nombre del letrado/reclamante]

TONO Y ESTILO: Profesional, formal, preciso. Como abogado especializado.
Incluye referencias específicas a legislación. Usa datos del documento aportado.
Estructura idéntica al modelo de reclamación previa proporcionado.

Responde ÚNICAMENTE con el texto completo de la reclamación, SIN explicaciones adicionales.`;

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfjs = await initPdfjs();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting PDF:', error);
    throw new Error('No se pudo extraer texto del PDF');
  }
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const archivos = formData.getAll('archivos') as File[];
    const datosAdicionales = formData.get('datosAdicionales') as string;

    if (!archivos || archivos.length === 0 || !datosAdicionales) {
      return NextResponse.json(
        { error: 'Al menos un archivo y datosAdicionales son requeridos' },
        { status: 400 }
      );
    }

    // Extraer texto de todos los archivos
    const textosExtraidos: string[] = [];

    for (const archivo of archivos) {
      const arrayBuffer = await archivo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = archivo.type.toLowerCase();

      let textoExtraido = '';

      if (mimeType === 'application/pdf') {
        textoExtraido = await extractTextFromPDF(buffer);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        textoExtraido = await extractTextFromDOCX(buffer);
      } else {
        return NextResponse.json(
          { error: 'Los archivos deben ser PDF o DOCX' },
          { status: 400 }
        );
      }

      textosExtraidos.push(`[${archivo.name}]\n${textoExtraido}`);
    }

    const textosCombinados = textosExtraidos.join('\n\n---\n\n');
    const datosFormulario = JSON.parse(datosAdicionales);
    const userMessage = `Documentos extraídos:
${textosCombinados}

Datos del formulario:
${JSON.stringify(datosFormulario, null, 2)}

Por favor, redacta la carta de reclamación basándote en esta información.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const carta =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({ carta });
  } catch (error) {
    console.error('Error en /api/reclamacion:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
