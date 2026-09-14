# NODUS — Ecosistema Empresarial de Orquestación de Casos

Prueba técnica de desarrollo de software — **NODUS Ingeniería SAS**.

Plataforma SaaS que orquesta el ciclo de vida completo de un caso empresarial entre
**Mipymes**, **consultores** y el equipo **Advisory / PMO**: desde el registro de la
necesidad hasta el cierre formal, con workflow gobernado, SLA, gestión documental,
trazabilidad y auditoría.

\---

## Índice

1. [Puesta en marcha en 5 minutos](#1-puesta-en-marcha-en-5-minutos)
2. [Variables de entorno](#2-variables-de-entorno)
3. [Usuarios de prueba](#3-usuarios-de-prueba)
4. [Qué probar primero](#4-qué-probar-primero)
5. [Arquitectura](#5-arquitectura)
6. [Decisiones técnicas y su justificación](#6-decisiones-técnicas-y-su-justificación)
7. [Modelo de datos](#7-modelo-de-datos)
8. [Motor de workflow](#8-motor-de-workflow)
9. [Módulos implementados](#9-módulos-implementados)
10. [API](#10-api)
11. [Seguridad](#11-seguridad)
12. [Scripts disponibles](#12-scripts-disponibles)
13. [Despliegue](#13-despliegue)
14. [Evidencias de funcionamiento](#14-evidencias-de-funcionamiento)
15. [Alcance del MVP y roadmap](#15-alcance-del-mvp-y-roadmap)

\---

## 1\. Puesta en marcha en 5 minutos

### Requisitos

|Herramienta|Versión mínima|Verificar con|
|-|-|-|
|Node.js|20 (recomendado 22 LTS)|`node -v`|
|npm|10|`npm -v`|
|PostgreSQL|14|Neon (nube) o Docker|

### Pasos

```bash
# 1. Clonar
git clone https://github.com/<usuario>/nodus-ingenieria-sas.git
cd nodus-ingenieria-sas

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
#    -> abra .env y ponga su DATABASE\\\\\\\_URL y su JWT\\\\\\\_SECRET (ver sección 2)

# 4. Crear las tablas y cargar los datos de demostración
npm run setup

# 5. Levantar la aplicación
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) e ingrese con `advisory@nodus.co` / `nodus123`.

### Base de datos — dos caminos

**Opción A — PostgreSQL en la nube (recomendada, gratuita, sin instalar nada).**
Cree una base en [Neon](https://neon.tech) o [Supabase](https://supabase.com), copie la
cadena de conexión y péguela en `DATABASE\\\\\\\_URL`.

**Opción B — PostgreSQL local con Docker.**

```bash
docker compose up -d
# DATABASE\\\\\\\_URL="postgresql://nodus:nodus@localhost:5432/nodus"
```

> \\\\\\\*\\\\\\\*Nota:\\\\\\\*\\\\\\\* no agregue `?schema=public` a la cadena de conexión. El driver
> `postgres.js` la envía como parámetro de sesión y PostgreSQL la rechaza.
> Si su proveedor lo exige, use `?sslmode=require` únicamente.

\---

## 2\. Variables de entorno

Todas están documentadas en `.env.example`.

|Variable|Obligatoria|Descripción|
|-|-|-|
|`DATABASE\\\\\\\_URL`|Sí|Cadena de conexión a PostgreSQL.|
|`JWT\\\\\\\_SECRET`|Sí|Clave para firmar los JWT de sesión. Mínimo 32 caracteres. Genérela con `openssl rand -base64 32`.|
|`NEXT\\\\\\\_PUBLIC\\\\\\\_APP\\\\\\\_NAME`|No|Nombre visible de la aplicación. Por defecto `NODUS`.|
|`CRON\\\\\\\_SECRET`|No|Si se define, protege `GET /api/sla/scan` para el cron de Vercel.|

\---

## 3\. Usuarios de prueba

Cargados por `npm run db:seed`. **Contraseña para todos: `nodus123`.**

|Correo|Rol|Qué puede hacer|
|-|-|-|
|`admin@nodus.co`|Super administrador|Todo.|
|`advisory@nodus.co`|Advisory / PMO|Clasificar, publicar en bolsa, asignar consultores, aprobar QA, enviar propuestas, checklist contractual, autorizar ejecución, cerrar casos.|
|`pmo@nodus.co`|Advisory / PMO|Igual que el anterior.|
|`consultor@nodus.co`|Consultor (Operaciones, Estrategia)|Ver la bolsa, postularse, diseñar propuestas, registrar actividades.|
|`consultor2@nodus.co`|Consultor (Finanzas, Estrategia)|Igual, con otras especialidades.|
|`consultor3@nodus.co`|Consultor (Tecnología, Operaciones)|Igual.|
|`consultor4@nodus.co`|Consultor (Talento, Legal)|Disponibilidad parcial.|
|`cliente@nodus.co`|Cliente Mipyme (Textiles Andinas)|Registrar casos, ver sólo los de su empresa, decidir sobre propuestas.|
|`cliente2@nodus.co`|Cliente Mipyme (Logística del Valle)|Igual.|
|`cliente3@nodus.co`|Cliente Mipyme (Panadería La Espiga)|Igual.|

El seed también crea 3 empresas y 6 casos distribuidos a lo largo del workflow,
con postulaciones, propuestas, documentos, actividades, alertas de SLA y bitácora.

\---

## 4\. Qué probar primero

Recorrido sugerido para el equipo evaluador (unos 10 minutos):

1. **Onboarding sin cuenta.** Vaya a `/intake` sin iniciar sesión y registre una
necesidad. Verá que crea empresa + usuario + caso en un solo envío y que
entra directamente a su panel.
2. **Empresa Única – Casos Múltiples.** Repita el intake con el *mismo dominio de
correo* y otro nombre de contacto: el sistema detecta la empresa existente y le
asocia el nuevo caso en lugar de duplicarla.
3. **Reglas de negocio del workflow.** Entre como `advisory@nodus.co`, abra el caso
recién creado e intente clasificarlo sin llenar complejidad y tipo de
intervención: el botón aparece bloqueado con el motivo exacto.
4. **Elegibilidad de la bolsa.** Publique el caso en la bolsa, entre como
`consultor2@nodus.co` (Finanzas) e intente postularse a un caso de Operaciones:
el sistema lo rechaza por especialidad.
5. **QA y envío.** Como consultor cree la propuesta; como Advisory intente enviarla
al cliente sin aprobar el checklist de QA: bloqueado.
6. **Decisión del cliente.** Entre con el cliente titular y acepte la propuesta.
El caso pasa solo a *Pendiente de contratación*.
7. **Bloqueo contractual.** Intente autorizar la ejecución con el checklist
incompleto: bloqueado hasta marcar los seis ítems.
8. **Aislamiento por rol.** Entre como `cliente2@nodus.co` e intente abrir por URL
un caso de otra empresa: acceso denegado.
9. **SLA.** En *SLA y alertas* pulse «Ejecutar escaneo de SLA»: se generan alertas
y notificaciones de escalamiento.
10. **Trazabilidad.** Revise *Bitácora*: cada una de las acciones anteriores quedó
registrada con actor, rol, acción, entidad, cambio de estado e IP.

\---

## 5\. Arquitectura

Aplicación **fullstack en un solo proyecto Next.js 15 (App Router)**, desplegable
como una sola unidad.

```
┌──────────────────────────────────────────────────────────────┐
│  Capa de presentación — React Server Components + Client      │
│  src/app/(app)/\\\\\\\*  ·  src/components/\\\\\\\*                         │
├──────────────────────────────────────────────────────────────┤
│  Capa de API — Route Handlers REST                            │
│  src/app/api/\\\\\\\*\\\\\\\*/route.ts                                      │
├──────────────────────────────────────────────────────────────┤
│  Capa de negocio                                              │
│  lib/workflow.ts  máquina de estados y reglas                 │
│  lib/casos.ts     servicio de casos y transiciones            │
│  lib/sla.ts       motor de SLA, alertas y escalamiento        │
│  lib/kpis.ts      indicadores del dashboard                   │
│  lib/audit.ts     bitácora (único punto de escritura)         │
│  lib/auth.ts      sesión, JWT y RBAC                          │
├──────────────────────────────────────────────────────────────┤
│  Capa de datos — Drizzle ORM                                  │
│  src/db/schema.ts  ·  src/db/index.ts  ·  drizzle/\\\\\\\*.sql       │
├──────────────────────────────────────────────────────────────┤
│  PostgreSQL                                                   │
└──────────────────────────────────────────────────────────────┘
```

### Estructura de carpetas

```
src/
├── app/
│   ├── (app)/                 # Rutas privadas, comparten el layout con sidebar
│   │   ├── dashboard/         # Dashboard PMO con KPIs
│   │   ├── casos/             # Listado, ficha y alta de casos
│   │   ├── bolsa/             # Bolsa interna de consultores
│   │   ├── empresas/          # Registro único de empresas
│   │   ├── consultores/       # Directorio y elegibilidad
│   │   ├── propuestas/        # Todas las versiones de propuestas
│   │   ├── documentos/        # Repositorio documental
│   │   ├── sla/               # SLA, alertas y escalamiento
│   │   ├── bitacora/          # Auditoría
│   │   └── configuracion/     # Workflow, taxonomías, SLA, usuarios
│   ├── api/                   # Route Handlers (REST)
│   ├── intake/                # Onboarding público (plantilla T1)
│   ├── login/
│   └── page.tsx               # Landing
├── components/                # UI y paneles de la ficha del caso
├── db/                        # Esquema, cliente y seed
├── lib/                       # Lógica de negocio
└── middleware.ts              # Guardia de sesión previa al renderizado
```

\---

## 6\. Decisiones técnicas y su justificación

|Decisión|Por qué|
|-|-|
|**Next.js 15 fullstack** en vez de frontend y backend separados|El MVP debe ser *ejecutable por un tercero con un solo comando*. Un único proyecto elimina dos despliegues, dos configuraciones de CORS y dos juegos de variables. Las fronteras entre capas se mantienen por convención de carpetas, no por procesos separados; migrar `lib/` a un servicio NestJS independiente cuando el volumen lo exija es mecánico.|
|**React Server Components** para las lecturas|Las pantallas consultan la base directamente en el servidor, sin round-trip HTTP ni estado de carga en el cliente. Las mutaciones sí pasan por APIs REST explícitas y documentadas.|
|**PostgreSQL**|El dominio es fuertemente relacional (empresa → casos → propuestas → versiones → documentos) y exige integridad referencial, transacciones y trazabilidad. Un motor documental sería la herramienta equivocada.|
|**Drizzle ORM** en vez de Prisma|Es TypeScript puro: se instala desde npm sin descargar binarios nativos, lo que hace la instalación reproducible en cualquier entorno y en CI. Genera SQL explícito y versionado en `drizzle/\\\\\\\*.sql`, de modo que el esquema es auditable. La inferencia de tipos es de extremo a extremo.|
|**Sesión con JWT propio (`jose` + cookie httpOnly)**|Sin dependencia de un proveedor externo de identidad, sin costo, y con control total sobre el contenido del token (rol y empresa viajan en él, lo que permite validar la sesión en el middleware Edge antes de renderizar).|
|**Máquina de estados declarativa** (`lib/workflow.ts`)|Las 14 etapas, los roles autorizados y las reglas de negocio viven en una sola estructura de datos. La UI la lee para decidir qué botones mostrar y el backend la usa para validar. No hay forma de saltarse una regla desde el cliente porque la validación ocurre del lado del servidor con el mismo código.|
|**Documentos almacenados en PostgreSQL (`bytea`)**|El evaluador ejecuta el proyecto sin credenciales de AWS y sin configurar un bucket. La interfaz de acceso está aislada en un único Route Handler: migrar a S3 o R2 es cambiar una función. Límite de 5 MB por archivo, adecuado para el MVP.|
|**Bitácora de sólo inserción**|La aplicación nunca actualiza ni borra `bitacora`. Hay un único punto de escritura (`lib/audit.ts`), lo que garantiza que ninguna acción relevante quede sin registrar.|
|**Español en el dominio, inglés en lo técnico**|Los nombres de tablas, campos y funciones de negocio están en el idioma del negocio para que el código sea legible por quien conoce el proceso; las convenciones del framework se mantienen en inglés.|

\---

## 7\. Modelo de datos

15 tablas. El esquema completo está en `src/db/schema.ts` y el SQL generado en
`drizzle/0000\\\\\\\_\\\\\\\*.sql`.

|Tabla|Propósito|
|-|-|
|`empresas`|Registro único por empresa. Deduplicación por nombre normalizado, NIT y dominio de correo.|
|`usuarios`|Identidad y rol. Los clientes están ligados a una empresa.|
|`consultor\\\\\\\_perfiles`|Especialidades, nivel, disponibilidad y reputación. Base de la elegibilidad.|
|`casos`|Entidad central. Código legible, clasificación, estado, SLA, consultor responsable y cierre.|
|`transiciones`|Historial de cambios de estado (timeline del caso).|
|`postulaciones`|Plantilla T3C. Índice único `(caso, consultor)`.|
|`propuestas`|Plantillas TP4A–TP4H con versión, checklist de QA y decisión del cliente. Único `(caso, versión)`.|
|`documentos`|Archivos con tipo, versión y contenido binario.|
|`checklist\\\\\\\_contratacion`|Seis ítems que bloquean el paso a ejecución.|
|`actividades`|Hitos de la ejecución.|
|`sla\\\\\\\_reglas`|Horas máximas y nivel de escalamiento por estado.|
|`alertas`|Alertas generadas por el motor de SLA.|
|`notificaciones`|Comunicación estructurada in-app por usuario.|
|`bitacora`|Auditoría inmutable.|
|`lov`|Taxonomías gobernadas (áreas, complejidad, tipo de intervención, especialidades).|

### Relaciones principales

```
empresas 1 ──── N casos 1 ──── N postulaciones ──── 1 usuarios (consultor)
                     1 ──── N propuestas 1 ──── N documentos
                     1 ──── N transiciones
                     1 ──── N actividades
                     1 ──── N alertas
                     1 ──── 1 checklist\\\\\\\_contratacion
```

\---

## 8\. Motor de workflow

Catorce estados, definidos en `src/lib/workflow.ts`. Se pueden ver en la
aplicación en **Configuración → Máquina de estados**.

```
CREADO
  └─▶ EN\\\\\\\_REVISIÓN ─────────────────────────────┐
        └─▶ CLASIFICADO                        │ (descartar)
              └─▶ EN\\\\\\\_POSTULACIÓN               │
                    └─▶ ASIGNADO               │
                          └─▶ PROPUESTA\\\\\\\_EN\\\\\\\_DISEÑO ◀──┐
                                └─▶ PROPUESTA\\\\\\\_LISTA\\\\\\\_QA │
                                      └─▶ PROPUESTA\\\\\\\_ENVIADA
                                            └─▶ EN\\\\\\\_DECISIÓN\\\\\\\_CLIENTE
                                                  ├─ aceptar ─▶ PENDIENTE\\\\\\\_CONTRATACIÓN
                                                  ├─ ajustes ─┘
                                                  └─ rechazar ─▶ CERRADO
                                                        └─▶ AUTORIZADO\\\\\\\_EJECUCIÓN
                                                              └─▶ EN\\\\\\\_EJECUCIÓN
                                                                    └─▶ LISTO\\\\\\\_CIERRE
                                                                          └─▶ CERRADO
```

### Reglas de negocio implementadas

Cada transición declara un *guard* que se evalúa en el servidor. Si no se cumple,
la API responde `422` con el motivo y la interfaz deshabilita el botón mostrando
ese mismo mensaje.

|Transición|Regla|
|-|-|
|`EN\\\\\\\_REVISIÓN → CLASIFICADO`|Exige complejidad y tipo de intervención (taxonomías gobernadas).|
|`EN\\\\\\\_POSTULACIÓN → ASIGNADO`|Exige una postulación aceptada. Sólo puede haber un consultor responsable principal.|
|`PROPUESTA\\\\\\\_EN\\\\\\\_DISEÑO → LISTA\\\\\\\_QA`|Exige al menos una versión de propuesta creada.|
|`LISTA\\\\\\\_QA → ENVIADA`|Exige el checklist de QA aprobado por Advisory.|
|`EN\\\\\\\_DECISIÓN → PENDIENTE\\\\\\\_CONTRATACIÓN`|Exige decisión de aceptación registrada sobre la propuesta.|
|`PENDIENTE\\\\\\\_CONTRATACIÓN → AUTORIZADO`|Exige los seis ítems del checklist contractual.|
|`EN\\\\\\\_EJECUCIÓN → LISTO\\\\\\\_CIERRE`|Exige cero actividades pendientes.|
|`LISTO\\\\\\\_CIERRE → CERRADO`|Exige acta de cierre y evaluación final.|

Además, cada transición valida el **rol** del actor y toda ejecución pasa por
`ejecutarTransicion()`, que en una sola operación actualiza el caso, recalcula el
SLA del nuevo estado, escribe la transición, registra la bitácora y notifica a los
actores involucrados.

\---

## 9\. Módulos implementados

|#|Módulo|Estado|Dónde verlo|
|-|-|-|-|
|1|Autenticación, usuarios y roles (RBAC)|✅|`/login`, `/configuracion`|
|2|Gestión de empresas + identidad única|✅|`/empresas`, `/intake`|
|3|Casos: intake, clasificación y ciclo de vida|✅|`/casos`|
|4|Motor de workflow con reglas de negocio|✅|`/casos/\\\\\\\[id]`, `/configuracion`|
|5|Bolsa interna, postulación y asignación|✅|`/bolsa`|
|6|Propuestas versionadas y QA metodológico|✅|`/propuestas`|
|7|Gestión documental con versionamiento|✅|`/documentos`|
|8|SLA, alertas y escalamiento|✅|`/sla`|
|9|Bitácora y auditoría|✅|`/bitacora`|
|10|Dashboard PMO e indicadores|✅|`/dashboard`|
|11|Seguimiento de actividades de ejecución|✅|ficha del caso en ejecución|
|12|Checklist de contratación|✅|ficha del caso|
|13|Notificaciones in-app|✅|campana en la barra superior|
|—|Peer review (marcado Fase 2 en la matriz)|Roadmap|—|

La trazabilidad requerimiento por requerimiento (REQ-001 a REQ-020) está en
[`docs/MATRIZ\\\\\\\_REQUERIMIENTOS.md`](docs/MATRIZ_REQUERIMIENTOS.md).

\---

## 10\. API

Todas las respuestas tienen la forma `{ ok: true, data }` o
`{ ok: false, error, detalles? }`. Los errores de validación devuelven `422` con el
campo y el mensaje.

### Autenticación

|Método|Ruta|Descripción|
|-|-|-|
|`POST`|`/api/auth/login`|Inicia sesión y crea la cookie httpOnly.|
|`POST`|`/api/auth/logout`|Cierra la sesión.|
|`POST`|`/api/auth/intake`|Onboarding público: empresa + usuario + caso en una transacción.|

### Casos

|Método|Ruta|Descripción|
|-|-|-|
|`GET`|`/api/casos?estado=\\\\\\\&q=`|Listado filtrado por la visibilidad del rol.|
|`POST`|`/api/casos`|Crea un caso desde la plataforma.|
|`GET`|`/api/casos/:id`|Detalle (valida permisos).|
|`PATCH`|`/api/casos/:id`|`accion=clasificar` \| `accion=cerrar`.|
|`POST`|`/api/casos/:id/transicion`|**Único** punto de cambio de estado.|
|`PUT`|`/api/casos/:id/checklist`|Checklist de contratación.|
|`GET`/`POST`|`/api/casos/:id/documentos`|Lista y carga documentos.|

### Bolsa y propuestas

|Método|Ruta|Descripción|
|-|-|-|
|`POST`|`/api/postulaciones`|Postulación T3C (valida elegibilidad).|
|`POST`|`/api/postulaciones/:id/aceptar`|Asigna el consultor responsable.|
|`POST`|`/api/propuestas`|Crea una nueva versión.|
|`POST`|`/api/propuestas/:id/qa`|Registra el checklist de QA.|
|`POST`|`/api/propuestas/:id/enviar`|Envío formal al cliente.|
|`POST`|`/api/propuestas/:id/decision`|Decisión estructurada del cliente.|

### Operación

|Método|Ruta|Descripción|
|-|-|-|
|`POST`|`/api/actividades` · `PATCH /api/actividades/:id`|Hitos de ejecución.|
|`GET`|`/api/documentos/:id`|Descarga controlada por permisos.|
|`POST`/`GET`|`/api/sla/scan`|Motor de SLA: alertas y escalamiento.|
|`GET`|`/api/dashboard/kpis`|Indicadores operativos, comerciales y de ecosistema.|
|`GET`/`POST`|`/api/notificaciones`|Bandeja del usuario.|

Ejemplo:

```bash
curl -c cookies.txt -H 'Content-Type: application/json' \\\\\\\\
  -d '{"email":"advisory@nodus.co","password":"nodus123"}' \\\\\\\\
  http://localhost:3000/api/auth/login

curl -b cookies.txt http://localhost:3000/api/dashboard/kpis
```

\---

## 11\. Seguridad

* **Contraseñas** con bcrypt (10 rondas). Nunca se devuelven al cliente.
* **Sesión** en JWT HS256 dentro de una cookie `httpOnly`, `sameSite=lax` y
`secure` en producción. Vigencia de 8 horas.
* **Middleware Edge** que bloquea toda ruta privada antes de renderizar.
* **RBAC en dos niveles**: el rol autoriza la transición del workflow y, por
separado, un filtro de visibilidad limita qué registros ve cada actor
(un cliente sólo ve su empresa; un consultor sólo sus casos y la bolsa).
* **Validación con Zod** en cada endpoint antes de tocar la base de datos.
* **Consultas parametrizadas** en todo el acceso a datos (sin SQL concatenado).
* **Descarga de documentos** siempre verificada contra los permisos del caso.
* **Bitácora inmutable**, incluidos los intentos fallidos de inicio de sesión.
* **Límite de 5 MB** por archivo cargado.

\---

## 12\. Scripts disponibles

|Script|Qué hace|
|-|-|
|`npm run dev`|Servidor de desarrollo en [http://localhost:3000](http://localhost:3000).|
|`npm run build`|Compilación de producción.|
|`npm start`|Ejecuta la compilación de producción.|
|`npm run setup`|`db:push` + `db:seed`. Deja la base lista.|
|`npm run db:generate`|Genera un archivo de migración SQL a partir del esquema.|
|`npm run db:migrate`|Aplica las migraciones versionadas.|
|`npm run db:push`|Sincroniza el esquema directamente (útil en desarrollo).|
|`npm run db:seed`|Carga los datos de demostración.|
|`npm run db:studio`|Explorador visual de la base de datos.|
|`npm run lint`|ESLint.|

\---

## 13\. Despliegue

El proyecto está preparado para **Vercel + Neon**, ambos con plan gratuito.

1. Cree la base en Neon y copie la cadena de conexión.
2. Importe el repositorio en Vercel.
3. En *Settings → Environment Variables* agregue `DATABASE\\\\\\\_URL`, `JWT\\\\\\\_SECRET` y
(opcionalmente) `CRON\\\\\\\_SECRET`.
4. Despliegue.
5. Con las tablas aún vacías, ejecute una sola vez desde su máquina, apuntando
`DATABASE\\\\\\\_URL` a Neon:

```bash
npm run db:push \\\\\\\&\\\\\\\& npm run db:seed
```

`vercel.json` programa el escaneo de SLA una vez al día. En planes superiores puede
subirse la frecuencia.

\---

## 14\. Evidencias de funcionamiento

Capturas en [`docs/capturas/`](docs/capturas/):

|Archivo|Pantalla|
|-|-|
|`01-landing.png`|Portada pública|
|`02-intake.png`|Onboarding de la Mipyme (plantilla T1)|
|`03-login.png`|Inicio de sesión|
|`04-dashboard.png`|Dashboard PMO con KPIs|
|`05-casos.png`|Listado de casos con filtros|
|`06-caso-detalle.png`|Ficha del caso con workflow y trazabilidad|
|`07-sla.png`|SLA, alertas y escalamiento|
|`08-bitacora.png`|Auditoría|
|`09-workflow.png`|Máquina de estados y taxonomías|
|`10-consultores.png`|Directorio de consultores|

El recorrido funcional completo, con las llamadas a la API y las respuestas
obtenidas del sistema, está en [`docs/PRUEBAS.md`](docs/PRUEBAS.md).

\---

## 15\. Alcance del MVP y roadmap

### Dentro del MVP

Los 18 requerimientos marcados «Incluido» en la matriz, cubriendo el flujo completo
de los nueve puntos del modelo operativo más los tres requerimientos transversales
(bitácora, comunicación estructurada y arquitectura modular con RBAC).

### Fuera del MVP, por prioridad

1. **Peer review** de propuestas (REQ-011, marcado Fase 2 en la propia matriz).
2. **Notificaciones por correo y WhatsApp** — hoy son in-app. La capa de
notificación ya está aislada en `notificarCaso()`: añadir un proveedor es
implementar una función.
3. **Almacenamiento en objetos (S3 / R2)** para documentos grandes.
4. **Multi-tenancy** con aislamiento a nivel de fila.
5. **Pruebas automatizadas** (unitarias del motor de workflow y de extremo a extremo
del ciclo de vida del caso).
6. **Matching asistido** consultor–caso por reputación e historial.

\---

## Licencia

Proyecto desarrollado como prueba técnica para NODUS Ingeniería SAS.

