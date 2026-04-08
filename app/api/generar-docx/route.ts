import { NextRequest, NextResponse } from 'next/server';
import {
  AlignmentType,
  Document,
  LineRuleType,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

type GenerarDocxBody = {
  carta?: string;
  nombreReclamante?: string;
};

export async function POST(request: NextRequest) {
  try {
    const { carta, nombreReclamante } = (await request.json()) as GenerarDocxBody;

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

    const parrafos = carta
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const parrafosDocumento: Paragraph[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: 'ACCIDENTALEX',
            font: 'Arial',
            size: 36,
            bold: true,
            color: '4a9999',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 40,
        },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'ABOGADOS ESPECIALIZADOS EN ACCIDENTES',
            font: 'Arial',
            size: 18,
            color: '888888',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 200,
        },
      }),
      new Paragraph({
        text: '',
        spacing: {
          after: 160,
        },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'RECLAMACION EXTRAJUDICIAL - ACCIDENTE DE TRAFICO',
            bold: true,
            font: 'Arial',
            size: 24,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 160,
        },
      }),
      new Paragraph({
        text: '',
        spacing: {
          after: 160,
        },
      }),
      ...parrafos.map(
        (parrafo) =>
          new Paragraph({
            children: [
              new TextRun({
                text: parrafo,
                font: 'Arial',
                size: 24,
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: {
              after: 160,
              line: 360,
              lineRule: LineRuleType.AUTO,
            },
          })
      ),
      new Paragraph({
        children: [
          new TextRun({
            text: `Documento generado el ${fechaActual}`,
            font: 'Arial',
            size: 20,
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 400,
        },
      }),
    ];

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
          children: parrafosDocumento,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8Array = new Uint8Array(buffer);
    const blob = new Blob([uint8Array], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const cleanName = nombreReclamante.replace(/\s+/g, '_');
    const today = new Date().toISOString().split('T')[0];

    return new NextResponse(blob, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="reclamacion_${cleanName}_${today}.docx"`,
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
