import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100 MB

const SYSTEM_PROMPT = `Eres un abogado especialista en accidentes de trafico y reclamaciones a companias aseguradoras en Espana.
Redacta una RECLAMACION PREVIA (solicitud de oferta motivada) conforme al articulo 7 del RDL 8/2004.
Usa los documentos aportados (texto extraido e imagenes adjuntas) para obtener datos del lesionado, siniestro, lesiones, danos, gastos y peticion.
Devuelve solo el texto final de la reclamacion, con tono formal y estructura juridica profesional.`;

type ParsedFormData = {
  descripcion?: string;
  tiposDanos?: string[];
};

type FileKind = 'pdf' | 'word' | 'excel' | 'image' | 'unknown';

type ImageMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp';

const IMAGE_MEDIA_TYPES = new Set<ImageMediaType>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const MIME_TO_KIND: Record<string, FileKind> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
  'application/msword': 'word',
  'application/vnd.ms-excel': 'excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'text/csv': 'excel',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'image/bmp': 'image',
  'image/tiff': 'image',
  'image/heic': 'image',
  'image/heif': 'image',
};

function kindFromExtension(fileName: string): FileKind {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'pdf';
  if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) return 'word';
  if (
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.csv')
  ) {
    return 'excel';
  }
  if (
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.gif') ||
    lowerName.endsWith('.bmp') ||
    lowerName.endsWith('.tif') ||
    lowerName.endsWith('.tiff') ||
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif')
  ) {
    return 'image';
  }
  return 'unknown';
}

function detectFileKind(file: File): FileKind {
  const mime = file.type.toLowerCase();
  return MIME_TO_KIND[mime] ?? kindFromExtension(file.name);
}

function mediaTypeFromFile(file: File): ImageMediaType | null {
  const mime = file.type.toLowerCase();
  if (IMAGE_MEDIA_TYPES.has(mime as ImageMediaType)) {
    return mime as ImageMediaType;
  }

  const lower = file.name.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return null;
}

function normalizeExtractedText(text: string): string {
  return text.replace(/\r/g, '').trim();
}

async function extractTextFromPDF(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return normalizeExtractedText(data.text || '');
  } catch (error) {
    console.error(`Error extrayendo PDF (${fileName}):`, error);
    throw new Error(`No se pudo extraer texto del PDF: ${fileName}`);
  }
}

async function extractTextFromWord(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeExtractedText(result.value || '');
  } catch (error) {
    console.error(`Error extrayendo Word (${fileName}):`, error);
    throw new Error(`No se pudo extraer texto de Word: ${fileName}`);
  }
}

async function extractTextFromExcel(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetTexts = workbook.SheetNames.map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
        worksheet,
        {
          header: 1,
          raw: false,
          defval: '',
        }
      );

      const lines = rows
        .map((row) => row.map((cell) => String(cell ?? '').trim()).join(' | '))
        .filter((line) => line.length > 0);

      return `[Hoja: ${sheetName}]\n${lines.join('\n')}`;
    });

    return normalizeExtractedText(sheetTexts.join('\n\n'));
  } catch (error) {
    console.error(`Error extrayendo Excel (${fileName}):`, error);
    throw new Error(`No se pudo extraer texto de Excel: ${fileName}`);
  }
}

function buildFallbackCarta(textoDocumentos: string, datos: ParsedFormData): string {
  const descripcion =
    datos.descripcion?.trim() ||
    'Sin descripcion adicional en el formulario. Se recomienda revisar los adjuntos.';
  const tipos = datos.tiposDanos?.length ? datos.tiposDanos.join(', ') : 'No especificado';
  const resumen = textoDocumentos.slice(0, 2400) || 'No se pudo extraer texto legible.';

  return `Muy senores mios:

Por la presente, y al amparo de lo dispuesto en el articulo 7 del Real Decreto Legislativo 8/2004, formulo RECLAMACION PREVIA frente a la entidad aseguradora responsable por los danos y perjuicios derivados del siniestro.

1. IDENTIFICACION Y DOCUMENTACION APORTADA
Se adjunta documentacion de soporte del siniestro y de sus consecuencias.
Resumen inicial de documentos:
${resumen}

2. DANOS RECLAMADOS
Tipos de danos declarados: ${tipos}.

3. DESCRIPCION DEL SINIESTRO
${descripcion}

4. PETICION
Solicito emitan OFERTA MOTIVADA conforme al articulo 7.4 del RDL 8/2004, dentro del plazo legal de 3 meses (articulo 22 LCS), con indemnizacion completa de dano personal, dano emergente y lucro cesante que procedan.

Sin mas, quedo a la espera de su respuesta.
Reciban un cordial saludo.`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const archivos = formData.getAll('archivos') as File[];
    const datosAdicionalesRaw = formData.get('datosAdicionales') as string | null;

    if (!archivos || archivos.length === 0) {
      return NextResponse.json(
        { error: 'Al menos un archivo es requerido' },
        { status: 400 }
      );
    }

    let totalSize = 0;
    for (const archivo of archivos) {
      totalSize += archivo.size;
      if (archivo.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `El archivo "${archivo.name}" excede el tamano maximo de 20 MB`,
          },
          { status: 400 }
        );
      }

      const kind = detectFileKind(archivo);
      if (kind === 'unknown') {
        return NextResponse.json(
          {
            error: `Formato no admitido en "${archivo.name}". Usa PDF, Word, Excel o imagen.`,
          },
          { status: 400 }
        );
      }
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { error: 'El tamano total de archivos excede 100 MB' },
        { status: 400 }
      );
    }

    let datosFormulario: ParsedFormData = {};
    if (datosAdicionalesRaw) {
      try {
        datosFormulario = JSON.parse(datosAdicionalesRaw) as ParsedFormData;
      } catch (parseError) {
        console.error('Error parsing datosAdicionales:', parseError);
        return NextResponse.json({ error: 'datosAdicionales invalido' }, { status: 400 });
      }
    }

    const textosExtraidos: string[] = [];
    const imageBlocks: Array<{
      type: 'image';
      source: {
        type: 'base64';
        media_type: ImageMediaType;
        data: string;
      };
    }> = [];

    for (const archivo of archivos) {
      try {
        const arrayBuffer = await archivo.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const kind = detectFileKind(archivo);

        if (kind === 'pdf') {
          const texto = await extractTextFromPDF(buffer, archivo.name);
          textosExtraidos.push(`[${archivo.name}] (PDF)\n${texto || '(Sin texto extraido)'}`);
          continue;
        }

        if (kind === 'word') {
          const texto = await extractTextFromWord(buffer, archivo.name);
          textosExtraidos.push(`[${archivo.name}] (Word)\n${texto || '(Sin texto extraido)'}`);
          continue;
        }

        if (kind === 'excel') {
          const texto = await extractTextFromExcel(buffer, archivo.name);
          textosExtraidos.push(`[${archivo.name}] (Excel)\n${texto || '(Sin texto extraido)'}`);
          continue;
        }

        if (kind === 'image') {
          const mediaType = mediaTypeFromFile(archivo);
          if (!mediaType) {
            textosExtraidos.push(
              `[${archivo.name}] (Imagen)\nFormato no apto para analisis visual directo; revisar manualmente.`
            );
            continue;
          }

          imageBlocks.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: buffer.toString('base64'),
            },
          });
          textosExtraidos.push(
            `[${archivo.name}] (Imagen)\nImagen adjunta para analisis visual de Claude.`
          );
        }
      } catch (fileError) {
        console.error(`Error procesando archivo ${archivo.name}:`, fileError);
        const errorMsg =
          fileError instanceof Error ? fileError.message : 'Error desconocido';
        return NextResponse.json(
          { error: `Error al procesar ${archivo.name}: ${errorMsg}` },
          { status: 400 }
        );
      }
    }

    const textosCombinados = textosExtraidos.join('\n\n---\n\n');

    const promptBase = `Documentos analizados:
${textosCombinados || '(Sin texto extraido)'}

Datos opcionales del formulario:
${JSON.stringify(datosFormulario, null, 2)}

Instruccion:
Redacta la carta de reclamacion previa basandote en esta informacion.
Si faltan datos concretos, deja constancia formal de que se acreditaran documentalmente.`;

    const messageContent: Array<
      | {
          type: 'text';
          text: string;
        }
      | {
          type: 'image';
          source: {
            type: 'base64';
            media_type: ImageMediaType;
            data: string;
          };
        }
    > = [{ type: 'text', text: promptBase }, ...imageBlocks];

    let carta = '';

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: messageContent,
          },
        ],
      });

      const firstBlock = response.content[0];
      carta = firstBlock?.type === 'text' ? firstBlock.text : '';
    } catch (claudeError) {
      console.error('Claude no disponible, se genera borrador local:', claudeError);
      carta = buildFallbackCarta(textosCombinados, datosFormulario);
    }

    if (!carta) {
      carta = buildFallbackCarta(textosCombinados, datosFormulario);
    }

    return NextResponse.json({ carta });
  } catch (error) {
    console.error('Error en /api/reclamacion:', error);
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: `Error al procesar la solicitud: ${errorMsg}` },
      { status: 500 }
    );
  }
}
