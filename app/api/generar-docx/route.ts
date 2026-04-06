import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

export async function POST(request: NextRequest) {
  try {
    const { carta, nombreReclamante } = await request.json();

    if (!carta || !nombreReclamante) {
      return NextResponse.json(
        { error: 'Carta y nombreReclamante son requeridos' },
        { status: 400 }
      );
    }

    const fechaActual = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Dividir la carta en párrafos
    const parrafos = carta.split('\n').filter((p: string) => p.trim() !== '');

    // Crear párrafos del documento
    const paragrafosDocumento = [
      // Encabezado con logo/nombre de empresa
      new Paragraph({
        children: [
          new TextRun({
            text: 'ACCIDENTALEX',
            font: 'Arial',
            size: 36, // 18pt en bold
            bold: true,
            color: '4a9999',
          }),
        ],
        alignment: 'center' as any,
        spacing: {
          after: 40,
        },
      }),
      // Subtítulo
      new Paragraph({
        children: [
          new TextRun({
            text: 'ABOGADOS ESPECIALIZADOS EN ACCIDENTES',
            font: 'Arial',
            size: 18, // 9pt
            color: '888888',
          }),
        ],
        alignment: 'center' as any,
        spacing: {
          after: 200,
        },
      }),
      // Línea en blanco separadora
      new Paragraph({
        text: '',
        spacing: {
          after: 160,
        },
      }),
      // Título centrado en negrita
      new Paragraph({
        children: [
          new TextRun({
            text: 'RECLAMACIÓN EXTRAJUDICIAL - ACCIDENTE DE TRÁFICO',
            bold: true,
            font: 'Arial',
            size: 24, // 12pt
          }),
        ],
        alignment: 'center' as any,
        spacing: {
          after: 160,
        },
      }),
      // Línea en blanco separadora
      new Paragraph({
        text: '',
        spacing: {
          after: 160,
        },
      }),
      // Contenido de la carta
      ...parrafos.map(
        (parrafo: string) =>
          new Paragraph({
            children: [
              new TextRun({
                text: parrafo,
                font: 'Arial',
                size: 24, // 12pt
              }),
            ],
            alignment: 'left' as any,
            spacing: {
              after: 160,
              line: 360,
              lineRule: 'auto' as any,
            },
          })
      ),
    ];

    // Agregar párrafo final con la fecha
    paragrafosDocumento.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Documento generado el ${fechaActual}`,
            font: 'Arial',
            size: 20, // 10pt
            italics: true,
          }),
        ],
        alignment: 'center' as any,
        spacing: {
          before: 400,
        },
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1418,
                bottom: 1418,
                left: 1418,
                right: 1418,
              },
            },
          },
          children: paragrafosDocumento,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8Array = new Uint8Array(buffer);
    const blob = new Blob([uint8Array], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    return new NextResponse(blob, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="reclamacion_${nombreReclamante.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx"`,
      },
    });
  } catch (error) {
    console.error('Error en /api/generar-docx:', error);
    return NextResponse.json(
      { error: 'Error al generar el documento' },
      { status: 500 }
    );
  }
}
