# 🚗 Control de Revisiones de Vehículo

Aplicación web para llevar el recuento de revisiones e inspecciones técnicas de un único vehículo. Construida con **Next.js 16**, **TypeScript**, **better-sqlite3** y CSS Modules.

---

## 📋 Características

- **Ficha del vehículo**: visualiza y edita los datos del coche (marca, modelo, año, matrícula, VIN, kilometraje).
- **Nueva revisión**: formulario completo de inspección dividido en categorías:
  - ⚙️ Motor y Mecánica
  - 🚗 Ruedas y Frenos
  - ⚡ Sistemas Eléctricos
  - 🛡️ Seguridad y Chasis
- **Historial**: línea de tiempo de todas las revisiones, con detalle expandible por punto.
- **Dashboard analítico**: gráfico SVG de evolución del kilometraje y distribución del estado del último reporte.
- **API REST** con Route Handlers de Next.js y base de datos SQLite local.

---

## 🚀 Cómo ejecutar el proyecto localmente

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd <nombre-del-repositorio>
```

### 2. Instalar dependencias

> [!IMPORTANT]
> La carpeta `node_modules` **no está incluida** en el repositorio. Debes instalar las dependencias antes de poder ejecutar el proyecto.

```bash
npm install
```

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🗄️ Base de datos

La aplicación utiliza **SQLite** mediante `better-sqlite3`. El archivo de base de datos (`car_revision.db`) se crea **automáticamente** la primera vez que arrancas el servidor, y viene precargado con un vehículo de ejemplo (Porsche 911 Carrera S) y una revisión de muestra.

> [!NOTE]
> El archivo `.db` está excluido del repositorio (`.gitignore`). Cada instalación generará su propia base de datos local desde cero.

---

## 🏗️ Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── car/route.ts            # GET/PUT ficha del coche
│   │   └── revisions/
│   │       ├── route.ts            # GET lista / POST nueva revisión
│   │       └── [id]/route.ts       # GET/PUT/DELETE revisión específica
│   ├── globals.css                 # Tema global (dark mode premium)
│   ├── page.module.css
│   ├── page.tsx                    # Página principal (Dashboard)
│   └── layout.tsx
├── components/
│   ├── CarHeader.tsx               # Ficha del vehículo con edición inline
│   ├── DashboardCharts.tsx         # Gráficos SVG personalizados
│   ├── RevisionForm.tsx            # Formulario de inspección
│   └── RevisionTimeline.tsx        # Historial de revisiones
└── lib/
    └── db.ts                       # Cliente SQLite + schema + seed
```

---

## 🛠️ Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm install` | Instala todas las dependencias |
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Compila la aplicación para producción |
| `npm run start` | Inicia el servidor en modo producción |

---

## 🌐 Despliegue

> [!WARNING]
> `better-sqlite3` requiere un entorno con sistema de ficheros persistente. **Vercel** (serverless) **no es compatible** con SQLite local directamente. Para desplegar en producción, considera:
> - **Railway** o **Render**: soportan SQLite en disco persistente.
> - **Turso** (SQLite en la nube): migrar `db.ts` a `@libsql/client`.
> - Sustituir SQLite por **PostgreSQL/Neon** con `DATABASE_URL`.
