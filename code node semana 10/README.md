# Control de Revisiones de Vehículo

Aplicación web para llevar el control de revisiones e inspecciones técnicas de vehículos. Permite gestionar la ficha del coche activo, registrar nuevas revisiones y consultar el historial de forma visual. La aplicación está desarrollada con Next.js, TypeScript y CSS Modules.

## Características

- Ficha del vehículo con datos como marca, modelo, año, matrícula, VIN, motor y kilometraje.
- Gestión de múltiples vehículos, pudiendo cambiar entre ellos sin perder los datos de los anteriores.
- Formulario de revisión con categorías de inspección.
- Historial de revisiones con detalle de cada una.
- Dashboard con información resumida del estado de las revisiones.
- API REST para gestionar coches y revisiones.

## Requisitos

- Node.js 18 o superior.
- npm.

## Cómo ejecutar el proyecto localmente

1. Clonar el repositorio:

```bash
git clone <URL_DEL_REPOSITORIO>
cd <nombre-del-repositorio>
```

2. Instalar dependencias:

```bash
npm install
```

3. Iniciar el servidor de desarrollo:

```bash
npm run dev
```

4. Abrir la aplicación en el navegador:

```text
http://localhost:3000
```

## Base de datos

La aplicación usa SQLite de forma local para el desarrollo. El archivo de base de datos se crea automáticamente la primera vez que se inicia la app. También está preparada para trabajar con Postgres cuando se define la variable de entorno DATABASE_URL, lo que permite desplegarla en Vercel con una base de datos externa.

## Estructura del proyecto

```text
src/
├── app/
│   ├── api/
│   │   ├── car/
│   │   ├── car/change
│   │   └── revisions/
│   ├── page.tsx
│   └── layout.tsx
├── components/
│   ├── CarHeader.tsx
│   ├── DashboardCharts.tsx
│   ├── RevisionForm.tsx
│   └── RevisionTimeline.tsx
└── lib/
    └── db.ts
```

## Scripts disponibles

| Comando | Descripción |
|---|---|
| npm install | Instala las dependencias |
| npm run dev | Inicia el servidor de desarrollo |
| npm run build | Genera la versión de producción |
| npm run start | Inicia la aplicación ya compilada |

## Despliegue en Vercel

Para desplegar en Vercel es necesario configurar una base de datos Postgres y añadir la variable de entorno DATABASE_URL con la URL de conexión.

## Uso de Inteligencia Artificial
Durante el desarrollo de este proyecto, he utilizado Github Copilot (integrado en VS Code) como herramienta de asistencia para las siguientes tareas:

- Resolución de errores.
- Generación de código repetitivo.
- Ideas para el diseño de la pagina.
- Corrección de faltas de ortografía.

Todo el código sugerido por la IA ha sido analizado, modificado manualmente para encajar con la lógica de mi proyecto, y probado exhaustivamente para garantizar su correcto funcionamiento.
