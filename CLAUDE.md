# Reclamación Accidentes de Tráfico

## Descripción del proyecto
Aplicación web privada para generar cartas de reclamación extrajudicial a compañías 
aseguradoras en España, basadas en documentos legales subidos por el usuario 
(partes de accidente, atestados, informes médicos, presupuestos de reparación).

## Stack tecnológico
- Next.js 14 con App Router y TypeScript
- Tailwind CSS para estilos
- Anthropic SDK (@anthropic-ai/sdk) — modelo: claude-haiku-4-5-20251001
- pdf-parse — extracción de texto de PDFs
- mammoth — extracción de texto de DOCX
- docx (npm) — generación del Word descargable

## Estructura del proyecto
- app/api/reclamacion/route.ts → API route que llama a Claude
- app/api/generar-docx/route.ts → API route que genera el DOCX descargable
- app/components/ReclamacionForm.tsx → Componente cliente con toda la lógica
- app/page.tsx → Página principal
- .env.local → ANTHROPIC_API_KEY (nunca commitear)

## Variables de entorno necesarias
ANTHROPIC_API_KEY=sk-ant-...

## Comandos principales
- npm run dev → arrancar en desarrollo (http://localhost:3000)
- npm run build → verificar errores TypeScript
- npm run lint → linting

## Legislación española aplicable
El system prompt de Claude debe cubrir:
- RDL 8/2004 — Responsabilidad Civil y Seguro en la Circulación
- Ley 35/2015 — Baremo de indemnizaciones por accidentes de tráfico
- LCS 50/1980 (art. 22) — plazo respuesta aseguradora: 3 meses
- Plazos prescripción: 1 año daños personales, 3 años daños materiales

## Flujo de la aplicación
1. Usuario sube documento (PDF o DOCX) + rellena formulario con sus datos
2. POST /api/reclamacion → extrae texto → llama a Claude Haiku → devuelve carta
3. Usuario revisa y edita el texto en textarea editable
4. POST /api/generar-docx → genera Word → descarga automática
5. Nombre archivo: reclamacion_[apellido]_[fecha].docx

## Decisiones de arquitectura
- App Router de Next.js (no Pages Router)
- API routes en el mismo proyecto, sin backend separado
- Sin base de datos — stateless, uso estrictamente privado
- Formato Word: A4, Arial 12pt, márgenes 2.5cm
- Modelo LLM: claude-haiku-4-5-20251001 (SIEMPRE este modelo)
- Si pdf-parse da error de webpack añadir en next.config.js: externals: ['pdf-parse']

## Owner
Carlos Cardoso — consultor marketing digital y eCommerce, Sevilla
