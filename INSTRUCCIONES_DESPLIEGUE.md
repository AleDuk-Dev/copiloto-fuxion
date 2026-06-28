# Instrucciones de despliegue — Copiloto Fuxion

---

## PASO 0 — Instalar dependencias localmente (para probar antes de desplegar)

```bash
cd "Proyecto RAC/copiloto-fuxion"
npm install
```

---

## PASO 1 — Crear el proyecto en Supabase y obtener credenciales

1. Ve a **https://supabase.com** y crea una cuenta gratuita (o inicia sesión).
2. Haz clic en **"New project"**.
3. Completa:
   - **Name:** `copiloto-fuxion` (o el nombre que prefieras)
   - **Database Password:** guárdala en un lugar seguro
   - **Region:** elige la más cercana a tus usuarios (ej. South America - São Paulo)
4. Espera ~2 minutos a que el proyecto se inicialice.
5. En el panel izquierdo, ve a **Settings → API**.
6. Copia estos dos valores (los necesitarás en el Paso 4):
   - **Project URL** → este es tu `SUPABASE_URL`
   - **anon / public** (bajo "Project API Keys") → este es tu `SUPABASE_ANON_KEY`

---

## PASO 2 — Crear la tabla en Supabase (SQL exacto)

1. En el panel de Supabase, ve a **SQL Editor** (ícono de base de datos en el menú izquierdo).
2. Haz clic en **"New query"**.
3. Pega y ejecuta el siguiente SQL:

```sql
-- Tabla para guardar cada interacción del Copiloto Fuxion
CREATE TABLE objeciones (
  id           BIGSERIAL PRIMARY KEY,
  objecion_original   TEXT        NOT NULL,
  perfil              TEXT        NOT NULL CHECK (perfil IN ('general', 'peso', 'energia', 'piel')),
  respuesta_emocional TEXT        NOT NULL,
  respuesta_logica    TEXT        NOT NULL,
  respuesta_cierre    TEXT        NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consultas por fecha (útil para revisar el dataset)
CREATE INDEX idx_objeciones_created_at ON objeciones (created_at DESC);

-- Habilitar Row Level Security (buena práctica)
ALTER TABLE objeciones ENABLE ROW LEVEL SECURITY;

-- Política: solo el servidor (service role / anon desde API route) puede insertar
-- La anon key desde el servidor puede insertar; nadie puede leer desde el cliente
CREATE POLICY "Insertar desde servidor" ON objeciones
  FOR INSERT WITH CHECK (true);
```

4. Haz clic en **"Run"**. Deberías ver "Success. No rows returned."

---

## PASO 3 — Probar localmente antes de desplegar

1. Copia el archivo de ejemplo de variables de entorno:
   ```bash
   cp .env.example .env.local
   ```
2. Abre `.env.local` y rellena los tres valores reales:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...    ← de console.anthropic.com
   SUPABASE_URL=https://xxx.supabase.co  ← del Paso 1
   SUPABASE_ANON_KEY=eyJ...              ← del Paso 1
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre **http://localhost:3000** en el navegador y prueba el formulario.

---

## PASO 4 — Desplegar en Vercel (plan gratuito)

### 4a. Preparar el repositorio en GitHub

1. Ve a **https://github.com/new** y crea un repositorio nuevo (puede ser privado).
2. En la carpeta del proyecto, ejecuta:
   ```bash
   git init
   git add .
   git commit -m "feat: Copiloto Fuxion inicial"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/copiloto-fuxion.git
   git push -u origin main
   ```

### 4b. Importar en Vercel

1. Ve a **https://vercel.com** y crea una cuenta gratuita (puedes usar tu cuenta de GitHub).
2. Haz clic en **"Add New… → Project"**.
3. Conecta tu cuenta de GitHub y selecciona el repositorio `copiloto-fuxion`.
4. Vercel detectará automáticamente que es un proyecto Next.js. Deja la configuración por defecto.
5. **ANTES de hacer clic en "Deploy"**, ve al paso 4c.

### 4c. Configurar las variables de entorno en Vercel ← CRÍTICO

En la pantalla de configuración del proyecto (antes del primer deploy):

1. Despliega la sección **"Environment Variables"**.
2. Agrega las siguientes variables, una por una:

   | Name | Value |
   |------|-------|
   | `ANTHROPIC_API_KEY` | tu key real de console.anthropic.com |
   | `SUPABASE_URL` | la URL de tu proyecto Supabase |
   | `SUPABASE_ANON_KEY` | la anon key de Supabase |

3. Para cada variable, asegúrate de que los entornos **Production**, **Preview** y **Development** estén marcados.
4. Haz clic en **"Deploy"**.

> ⚠️ Las variables de entorno en Vercel se configuran en:
> **Project → Settings → Environment Variables**
> NUNCA en el código fuente. NUNCA en el archivo `.env.local` (este archivo es solo para desarrollo local y está en `.gitignore`).

### 4d. Verificar el despliegue

1. Vercel te dará una URL del tipo `https://copiloto-fuxion-xxx.vercel.app`.
2. Abre esa URL en tu teléfono (el dispositivo principal de tus distribuidores).
3. Prueba enviar una objeción.
4. Verifica en **Supabase → Table Editor → objeciones** que la fila se guardó.

---

## PASO 5 — Configurar dominio personalizado (opcional)

Si tienes un dominio, en Vercel: **Project → Settings → Domains → Add domain**.

---

## CHECKLIST FINAL ANTES DE COMPARTIR EL LINK

- [ ] Las 3 variables de entorno están configuradas en Vercel
- [ ] La tabla `objeciones` fue creada en Supabase
- [ ] Probaste una objeción y aparece en la tabla de Supabase
- [ ] Probaste desde el móvil que el diseño se ve bien
- [ ] Revisaste que el link de Vercel carga correctamente

---

## ⚠️ RECORDATORIO IMPORTANTE — LÍMITE DE GASTO EN ANTHROPIC

**Antes de poner tu API key real en Vercel, configura un spending limit mensual en Anthropic.**

Pasos:
1. Ve a **https://console.anthropic.com**
2. Inicia sesión con tu cuenta
3. Ve a **Settings → Billing → Usage limits** (o "Spending limits")
4. Configura un límite mensual que no te genere sorpresas (ej. $5 o $10 para empezar)

Esto es tu red de seguridad. El rate limiting de 5 req/hora del código protege contra abuso, pero el spending limit en Anthropic es tu última línea de defensa contra costos inesperados.

**No omitas este paso.**
