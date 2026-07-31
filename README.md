# Agendate — MVP de turnos

App tipo Calendly: el profesional gestiona la agenda en **Expo** y el paciente reserva por **link web** o por **WhatsApp (bot)**. Al confirmar, se envía email + link “Agregar a Google Calendar” (y `.ics`).

## Estructura

```
apps/mobile   # Expo (profesional)
apps/web      # Vite + React (booking público /u/:slug)
apps/api      # Node + Express + Mongoose
packages/shared
```

## Requisitos

- Node 20+
- MongoDB local **o** dejá `MONGODB_URI` vacío para usar Mongo in-memory (demo)
- (Opcional) `RESEND_API_KEY` para emails reales
- (Opcional) WhatsApp Cloud API para el bot de turnos

## Setup

```bash
cd agendate
cp .env.example .env
npm install
```

### API

```bash
npm run api:dev
# http://localhost:4000
```

### Web (paciente)

```bash
npm run web
# http://localhost:5173/u/<slug>
```

### Mobile (profesional)

```bash
cd apps/mobile
npm start
```

## WhatsApp bot (reserva sin link)

El cliente escribe al número de WhatsApp Business de Agendate:

1. Manda el **código/slug** del profesional (ej. `maria-lopez`)
2. Elige un horario por número
3. Confirma nombre y email → el bot agenda solo
4. Si no hay lugar: escribe `lista` y queda en lista de espera FIFO

Webhook Meta: `GET/POST https://<tu-api>/webhooks/whatsapp`

Variables: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.

Sin token, la API hace dry-run (log en consola).

## Lista de espera

- Web: si un día no tiene turnos, formulario de lista de espera
- Mobile (Nuevo): lista ordenada + WhatsApp al contacto
- Al cancelar un turno: se ofrece el lugar al primero (push + WhatsApp si hay API)

## Variables (`.env`)

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto API (4000) |
| `MONGODB_URI` | Vacío = memoria; o Atlas/local |
| `JWT_SECRET` | Secreto JWT |
| `WEB_URL` | Base del link público (Vercel) |
| `RESEND_API_KEY` | Opcional |
| `EMAIL_FROM` | Remitente Resend |
| `WHATSAPP_*` | Cloud API del bot |

Web: `VITE_API_URL`. Mobile: `apps/mobile/src/api/config.js`.
