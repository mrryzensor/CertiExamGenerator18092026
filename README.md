# CertiExamGenerator 🎓

> Plataforma SaaS full-stack en **React + TypeScript (TSX)**, **mobile-first**, ejecutándose en el **puerto 3000**.
> Integra un editor visual de certificados con selección persistente, emisión masiva/pegado desde Excel, verificación pública por QR, registro con control de duplicados y generador de exámenes pedagógicos impulsado por **Google Gemini (Flash-Lite)** con calificación automática y emisión de certificados al aprobar.

---

## 🚀 Características Principales

- **Editor Visual WYSIWYG**: Diseña certificados con tamaños **Carta, A4, Oficio, A3 y Personalizado**, orientación Horizontal/Vertical y modos de ajuste de fondo (**Fit, Cover, Stretch, Custom**).
- **Selección Persistente**: Clic/tap para seleccionar un elemento y mantener activos sus controles y panel de propiedades.
- **Optimización WebP en Frontend**: Toda imagen cargada se optimiza en el navegador a formato WebP al 95% de calidad antes de enviarse al servidor.
- **Emisión Masiva**: Carga archivos Excel (`.xlsx`, `.csv`) o pega celdas copiadas directamente de Excel / Google Sheets con detección inteligente de columnas.
- **Verificación QR Pública**: Escaneo directo en `/verify/:id` con comprobación de validez, estado (válido/revocado) y descarga del PDF.
- **Registro Público con Control de Duplicados**: Formulario público `/register/:slug`. Si la persona ya está registrada, recupera su certificado existente sin duplicar el ID único.
- **Exámenes con Gemini AI**: Generación de preguntas (Opción múltiple, V/F, completar, relacionar) con modelos **Flash-Lite** y **failover automático** entre múltiples API Keys (almacenadas únicamente en `localStorage`).
- **Calificación en Tiempo Real**: Temporizador con entrega automática y emisión inmediata de certificado al aprobar con $\ge 70\%$.
- **Almacenamiento Físico en Disco y SQLite**: Base de datos SQLite (`node:sqlite`) con rutas relativas y metadatos. Cero BLOBs en base de datos; todos los archivos multimedia y PDFs se almacenan físicamente en `DATA_DIR`.

---

## 🛠️ Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar la aplicación (corre en el puerto 3000):
   ```bash
   npm run dev
   ```
3. Abrir en el navegador: [http://localhost:3000](http://localhost:3000)

---

## 🐳 Despliegue en Coolify (Oracle Cloud)

### 1. Requisitos Previos en Oracle Cloud (OCI)
1. En tu consola de Oracle Cloud, abre el puerto HTTP/HTTPS en la **Security List** de tu VCN (puertos `80` y `443` para Traefik de Coolify, o `3000` si expones directamente).
2. Si usas Oracle Linux / Ubuntu, verifica las reglas de firewall:
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

### 2. Despliegue en Coolify
1. En tu panel de Coolify, entra a tu **Project / Environment** y haz clic en **+ New Resource** -> **Git Repository (GitHub)**.
2. Selecciona el repositorio: `mrryzensor/CertiExamGenerator18092026`.
3. Tipo de Build: **Dockerfile** (Coolify detectará automáticamente el `Dockerfile` optimizado en la raíz).
4. Puerto: Configura `3000`.

### 3. ⚠️ Configuración Crucial: Persistent Storage (Volumen Persistente)
Para que tu base de datos SQLite (`certiexam.db`), los certificados PDF emitidos y los fondos de plantillas **sobrevivan a los despliegues y reinicios del contenedor**:

1. En la página de tu aplicación en Coolify, dirígete a la pestaña **Storages** / **Persistent Storage**.
2. Haz clic en **+ Add Persistent Storage**.
3. Configura los siguientes campos:
   - **Name**: `certiexam-data` (o el nombre que prefieras).
   - **Destination Path**: `/app/data` (Ruta exacta del contenedor donde se guardan la BD SQLite y los archivos físicos).
   - **Source Path / Volume**: Deja el valor por defecto generado por Coolify (ej. `certiexam-data` o una ruta en el host como `/data/coolify/...`).
4. Haz clic en **Save**.

### 4. Variables de Entorno (Opcional)
En la pestaña **Environment Variables**:
- `PORT`: `3000`
- `NODE_ENV`: `production`
- `DATA_DIR`: `/app/data`

¡Listo! Presiona **Deploy** en Coolify. Tu aplicación estará disponible con certificado SSL automático (Let's Encrypt) y persistencia total de datos en disco.
