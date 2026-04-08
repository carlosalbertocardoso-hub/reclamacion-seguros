declare module 'pdf-parse' {
  export interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
    text: string;
  }

  export default function pdfParse(
    dataBuffer: Buffer | Uint8Array | ArrayBuffer,
    options?: Record<string, unknown>
  ): Promise<PdfParseResult>;
}
