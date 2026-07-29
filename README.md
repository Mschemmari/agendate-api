# Agendate — MVP de turnos

App tipo Calendly: el profesional gestiona la agenda en **Expo** y el paciente reserva por **link web**. Al confirmar, se envía email + link “Agregar a Google Calendar” (y `.ics`).

## Estructura

```
apps/mobile   # Expo (profesional)
apps/web      # Vite + React (booking público /u/:slug)
apps/api      # Node + Express + Mongoose
packages/shared
```

## Requisitos

- Node 18+
- MongoDB local **o** dejá `MONGODB_URI` vacío para usar Mongo in-memory (demo)
- (Opcional) `RESEND_API_KEY` para emails reales

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
# En dispositivo físico, seteá la IP de tu Mac:
# EXPO_PUBLIC_API_URL=http://192.168.x.x:4000
npm start
```

Escaneá el QR con Expo Go.

## Flujo de prueba

1. En la app: registrate (se crean horarios lun–vie 9–18 y servicio “Consulta” 45 min).
2. Abrí **Link** y copiá la URL.
3. Abrila en el browser, elegí un slot y reservá.
4. El turno aparece en la agenda; en la consola de la API verás el email (si no hay Resend) y el link de Google Calendar.

## Variables (`.env`)

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto API (4000) |
| `MONGODB_URI` | Vacío = memoria; o Atlas/local |
| `JWT_SECRET` | Secreto JWT |
| `WEB_URL` | Base del link público |
| `RESEND_API_KEY` | Opcional |
| `EMAIL_FROM` | Remitente Resend |

Web: `VITE_API_URL` (default `http://localhost:4000`).

Mobile: `EXPO_PUBLIC_API_URL` (default `http://localhost:4000`).
