# Configuracion Manual - Gastos Hogar

Esta guia detalla todos los pasos manuales necesarios para poner la app en funcionamiento.

---

## 1. Crear Proyecto en Supabase

1. Ir a [https://supabase.com](https://supabase.com) y crear una cuenta (o iniciar sesion).
2. Click en **"New Project"**.
3. Elegir un nombre (ej: `gastos-hogar`), una contrasena para la base de datos, y la region mas cercana (ej: South America - Sao Paulo).
4. Esperar a que el proyecto se cree.

---

## 2. Configurar Variables de Entorno

1. En el dashboard de Supabase, ir a **Settings > API**.
2. Copiar:
   - **Project URL** (ej: `https://xxxxx.supabase.co`)
   - **anon public key** (la key que dice `anon`)
3. Editar el archivo `.env.local` en la raiz del proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

---

## 3. Ejecutar el Schema SQL

1. En Supabase Dashboard, ir a **SQL Editor**.
2. Click en **"New Query"**.
3. Copiar y pegar **todo** el contenido del archivo `supabase/migrations/001_initial_schema.sql`.
4. Click en **"Run"**.
5. Esto crea todas las tablas, indices, categorias predefinidas, y politicas de seguridad (RLS).

---

## 4. Crear los 2 Usuarios

### Paso A: Crear usuarios en Supabase Auth

1. En Supabase Dashboard, ir a **Authentication > Users**.
2. Click en **"Add user" > "Create new user"**.
3. Crear el primer usuario:
   - Email: el email de Lauti
   - Password: una contrasena temporal (o usar "Auto Confirm Email")
   - Marcar **"Auto Confirm User"** para que no requiera verificacion
4. Repetir para el segundo usuario (Cami).
5. **Anotar los UUID** de ambos usuarios (se ven en la columna "UID" de la tabla de usuarios).

### Paso B: Insertar perfiles en la tabla `users`

1. Ir a **SQL Editor** y ejecutar:

```sql
INSERT INTO users (id, name, email) VALUES
  ('UUID-DE-LAUTI-AQUI', 'Lauti', 'email-de-lauti@ejemplo.com'),
  ('UUID-DE-CAMI-AQUI', 'Cami', 'email-de-cami@ejemplo.com');
```

> **IMPORTANTE**: Reemplazar `UUID-DE-LAUTI-AQUI` y `UUID-DE-CAMI-AQUI` con los UUIDs reales del paso anterior. Los emails deben coincidir con los de Auth.

---

## 5. Crear Bucket de Storage para Comprobantes

1. En Supabase Dashboard, ir a **Storage**.
2. Click en **"New Bucket"**.
3. Nombre: `receipts`
4. Marcar como **"Public"** (para que las fotos de comprobantes sean accesibles).
5. Ir a **Policies** del bucket `receipts` y crear una politica:
   - Click "New Policy" > "For full customization"
   - Policy name: `Authenticated users can upload`
   - Allowed operations: SELECT, INSERT, UPDATE, DELETE
   - Target roles: `authenticated`
   - USING expression: `true`
   - WITH CHECK expression: `true`
   - Click "Review" > "Save Policy"

---

## 6. Configurar Autenticacion (Email Magic Link)

1. En Supabase Dashboard, ir a **Authentication > Providers**.
2. Asegurarse de que **Email** esta habilitado.
3. Ir a **Authentication > URL Configuration**.
4. Configurar:
   - **Site URL**: `http://localhost:3000` (para desarrollo) o tu dominio en Vercel (para produccion)
   - **Redirect URLs**: agregar:
     - `http://localhost:3000/auth/callback`
     - `https://tu-dominio-vercel.vercel.app/auth/callback` (cuando hagas deploy)

> **Nota sobre Magic Link**: La app usa "Magic Link" (link por email) para autenticacion. Cuando un usuario pone su email y hace click en "Enviar link de acceso", recibe un email con un link. Al hacer click en ese link, queda autenticado automaticamente. No se necesita contrasena.

---

## 7. Iconos PWA

Para que la app sea instalable como PWA, necesitas generar iconos:

1. Crear/conseguir un icono de la app (idealmente 512x512 px, formato PNG).
2. Guardar 2 versiones en `public/icons/`:
   - `icon-192.png` (192x192 px)
   - `icon-512.png` (512x512 px)

Puedes usar herramientas online como [https://realfavicongenerator.net](https://realfavicongenerator.net) para generar los iconos a partir de una imagen.

---

## 8. Ejecutar la App en Desarrollo

```bash
cd gastos-hogar
npm run dev
```

La app estara disponible en `http://localhost:3000`.

---

## 9. Deploy a Vercel

1. Subir el proyecto a un repositorio de GitHub:
   ```bash
   cd gastos-hogar
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TU-USUARIO/gastos-hogar.git
   git push -u origin main
   ```

2. Ir a [https://vercel.com](https://vercel.com) e importar el repositorio.

3. En la configuracion del proyecto en Vercel, agregar las **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = tu URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu anon key de Supabase

4. Click en **Deploy**.

5. Una vez deployado, **actualizar en Supabase** (Authentication > URL Configuration):
   - **Site URL**: `https://tu-app.vercel.app`
   - **Redirect URLs**: agregar `https://tu-app.vercel.app/auth/callback`

---

## 10. Verificacion Final

Checklist para confirmar que todo funciona:

- [ ] La app carga sin errores en `http://localhost:3000`
- [ ] Al acceder, redirige a `/login`
- [ ] Se puede enviar un magic link por email
- [ ] Al hacer click en el link del email, queda autenticado
- [ ] El dashboard muestra "No hay gastos registrados"
- [ ] Se puede crear un nuevo gasto con todos los campos
- [ ] Las categorias predefinidas aparecen en el formulario
- [ ] Se puede cambiar entre ARS y USD
- [ ] La lista de gastos muestra los gastos creados
- [ ] Los filtros de mes, categoria y busqueda funcionan
- [ ] El balance se calcula correctamente
- [ ] Se puede registrar una liquidacion
- [ ] Los reportes muestran graficos con datos
- [ ] Se puede exportar CSV
- [ ] Los gastos fijos se pueden crear y se generan automaticamente
- [ ] En mobile, se ve correctamente y la navegacion inferior funciona
- [ ] La app es instalable como PWA (aparece opcion "Agregar a pantalla de inicio")

---

## Resumen de Credenciales Necesarias

| Dato | Donde Obtenerlo |
|------|-----------------|
| Supabase URL | Supabase Dashboard > Settings > API |
| Supabase Anon Key | Supabase Dashboard > Settings > API |
| UUID Usuario 1 | Supabase Dashboard > Authentication > Users |
| UUID Usuario 2 | Supabase Dashboard > Authentication > Users |
