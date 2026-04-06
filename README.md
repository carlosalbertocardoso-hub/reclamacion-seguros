# Generador de Reclamaciones por Accidente de Tráfico

Aplicación web privada para generar **cartas de reclamación previa** (solicitud de oferta motivada) a compañías aseguradoras en España, basadas en documentos legales subidos por el usuario.

## Características

✅ **Generación de reclamaciones previas** conforme al artículo 7 del RDL 8/2004
✅ **Soporte múltiples documentos**: PDF y DOCX (parte accidente, informes médicos, presupuestos, etc.)
✅ **Procesamiento con IA**: Claude Haiku analiza documentos y redacta carta formal
✅ **Descarga en Word**: Documento editble con logo ACCIDENTALEX
✅ **Legislación española**: Cubre RDL 8/2004, Ley 35/2015, LCS 50/1980
✅ **Uso privado**: Sin registro, datos no guardados en servidor

## Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **IA**: Anthropic Claude API (claude-haiku-4-5-20251001)
- **Procesamiento de documentos**: 
  - PDF: pdfjs-dist
  - DOCX: mammoth
- **Generación de Word**: docx (npm)
- **Hosting**: Vercel (deployment automático)

## Requisitos Locales

- Node.js 18+
- npm o yarn
- Cuenta Anthropic con API key

## Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/carlosalbertocardoso-hub/reclamacion-seguros.git
cd reclamacion-seguros

# Instalar dependencias
npm install

# Crear archivo .env.local
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# Ejecutar en desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Variables de Entorno

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

Obtén la API key en: https://console.anthropic.com/

## Comandos

```bash
npm run dev      # Desarrollo (http://localhost:3000)
npm run build    # Build producción
npm run start    # Ejecutar build
npm run lint     # Linting
```

## Estructura del Proyecto

```
├── app/
│   ├── api/
│   │   ├── reclamacion/route.ts      # API para generar reclamación
│   │   └── generar-docx/route.ts     # API para descargar Word
│   ├── components/
│   │   └── ReclamacionForm.tsx       # Formulario principal (cliente)
│   ├── page.tsx                      # Página principal
│   └── layout.tsx                    # Layout
├── public/
│   └── logo.svg                      # Logo ACCIDENTALEX
├── CLAUDE.md                         # Documentación del proyecto
└── package.json
```

## Flujo de Uso

1. **Usuario sube documentos** (PDF o DOCX)
   - Parte accidente, informes médicos, presupuestos, etc.

2. **Completa formulario** con datos personales:
   - Nombre, apellidos, DNI, teléfono, email
   - Datos aseguradora, póliza, vehículo
   - Descripción del accidente
   - Tipos de daños (materiales, personales, lucro cesante)

3. **Claude genera reclamación previa**
   - Estructura profesional según RDL 8/2004
   - Solicita oferta motivada
   - Plazo 3 meses (art. 22 LCS)

4. **Usuario revisa y descarga**
   - Edita texto si es necesario
   - Descarga Word profesional con logo

## API Endpoints

### POST `/api/reclamacion`
Genera la reclamación previa.

**Request:**
```
FormData:
  - archivos: File[] (PDF/DOCX)
  - datosAdicionales: JSON string con datos formulario
```

**Response:**
```json
{
  "carta": "Muy señores míos; Por la presente..."
}
```

### POST `/api/generar-docx`
Genera documento Word descargable.

**Request:**
```json
{
  "carta": "Texto de la reclamación",
  "nombreReclamante": "Juan García"
}
```

**Response:** Archivo DOCX (descargar)

## Deploy en Vercel

```bash
# Push a GitHub (automáticamente Vercel hace deploy)
git push origin main
```

**URL en vivo**: https://reclamacion-seguros.vercel.app

## Legislación Aplicable

El system prompt de Claude cubre:
- **RDL 8/2004** - Responsabilidad Civil y Seguro en Circulación
- **Ley 35/2015** - Baremo de indemnizaciones
- **LCS 50/1980 art. 22** - Plazo respuesta aseguradora: 3 meses
- **Plazos prescripción**: 1 año daños personales, 3 años materiales

## Nota Legal

⚠️ Esta aplicación es de **uso privado y educativo**. El documento generado es **orientativo** y no constituye asesoramiento legal profesional. Se recomienda consultar con un abogado especializado antes de enviar cualquier reclamación.

## Owner

**Carlos Cardoso** - Consultor marketing digital y eCommerce, Sevilla

---

**Última actualización**: Abril 2026
