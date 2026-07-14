# Contabilidad Vertex

Sistema web de contabilidad para **VERTEX SOFTWARE**. Registra compras, ventas, movimientos, calcula IGV y adjunta documentos. Accesible desde celular o PC vía navegador.

## Características

- **Código de acceso** — Protege tu app con una contraseña personal
- **Ventas y compras** — Registro con cálculo automático de IGV (18%)
- **Movimientos** — Ingresos, salidas, préstamos recibidos/otorgados
- **Conceptos** — Etiqueta cada movimiento (préstamos, servicios, etc.)
- **Documentos adjuntos** — Sube facturas, boletas o comprobantes (PDF/imagen)
- **Resumen por período** — Balance, totales, IGV neto por mes
- **Responsive** — Optimizado para móvil y escritorio
- **Marca Vertex** — UI con los colores de tu empresa

## Stack

| Tecnología | Uso |
|---|---|
| Next.js 15 | Framework web |
| Supabase | Base de datos + almacenamiento de archivos |
| Vercel | Hosting y despliegue |
| Tailwind CSS | Estilos |

---

## Configuración paso a paso

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto gratuito
2. En **SQL Editor**, pega y ejecuta el contenido de `supabase/schema.sql`
3. En **Settings → API**, copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Variables de entorno locales

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

```env
ACCESS_CODE=tu_codigo_secreto_123
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> **Importante:** Elige un `ACCESS_CODE` seguro. Solo tú (y quien compartas el código) podrá entrar.

### 3. Instalar y ejecutar en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e ingresa tu código de acceso.

### 4. Subir a GitHub

```bash
git init
git add .
git commit -m "Contabilidad Vertex - app inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/contabilidad-vertex.git
git push -u origin main
```

### 5. Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) e importa tu repositorio de GitHub
2. En **Environment Variables**, agrega las 4 variables del `.env.local`:
   - `ACCESS_CODE`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Haz clic en **Deploy**

Tu app estará disponible en `https://tu-proyecto.vercel.app`

---

## Uso de la aplicación

### Tipos de movimiento

| Tipo | Descripción |
|---|---|
| Venta | Ingreso por venta de producto/servicio |
| Compra | Egreso por compra de insumos/equipo |
| Ingreso | Otros ingresos (cobros, devoluciones) |
| Salida | Otros gastos (servicios, operativos) |
| Préstamo recibido | Dinero que recibes prestado |
| Préstamo otorgado | Dinero que prestas a terceros |

### Cálculo de IGV

- Marca **"Monto incluye IGV"** si el monto ya tiene el 18% incluido
- Si no lo marcas, el IGV se suma al monto ingresado
- El resumen muestra IGV de ventas, compras e IGV neto del período

### Documentos

Puedes adjuntar PDF o imágenes (máx. 10 MB) a cada movimiento. Se almacenan en Supabase Storage.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── api/          # API routes (auth, movimientos)
│   ├── dashboard/    # Resumen y estadísticas
│   ├── login/        # Pantalla de acceso
│   └── movimientos/  # Lista y registro
├── components/       # UI reutilizable
└── lib/              # Lógica (IGV, auth, Supabase)
supabase/
└── schema.sql        # Esquema de base de datos
public/
├── logo.png          # Logo Vertex (icono)
└── logo-full.png     # Logo con nombre
```

---

## VERTEX SOFTWARE

Desarrollado para la gestión contable personal/empresarial de Vertex Software.
