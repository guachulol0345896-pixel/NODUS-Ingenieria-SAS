# Trazabilidad de requerimientos → implementación

Cada requerimiento de la matriz entregada, con el archivo y el mecanismo concreto
que lo implementa, y cómo verificarlo en la aplicación.

| ID | Requerimiento del sistema | Implementación | Cómo verificarlo |
| --- | --- | --- | --- |
| REQ-001 | Registrar empresas y casos en un flujo simplificado de menos de 3 minutos | `src/app/intake/page.tsx` (dos bloques, un envío) + `POST /api/auth/intake` (empresa + usuario + caso en una transacción) | Abrir `/intake` sin sesión y completar el formulario |
| REQ-002 | Validar duplicados por correo, dominio, nombre e ID empresarial | `buscarEmpresaExistente()` en `src/lib/casos.ts`; normalización que elimina sufijos societarios; se ignoran dominios genéricos (gmail, hotmail…) | Repetir el intake con el mismo dominio: la respuesta trae `empresaReutilizada: true` |
| REQ-003 | Generar ID único de caso y registrar fecha y hora automáticamente | `siguienteCodigo()` genera `NODUS-AAAA-NNNN`; índice único en `casos.codigo`; `created_at` con `defaultNow()` | Cabecera de la ficha del caso |
| REQ-004 | LOV parametrizadas para área, impacto, complejidad y tipo de intervención | Tabla `lov` + `PanelClasificacion` + `PATCH /api/casos/:id` con `accion=clasificar` | *Configuración → Taxonomías gobernadas* |
| REQ-005 | Registrar actor, fecha, hora, acción y cambios de estado | Tabla `bitacora` (sólo inserción) con punto único de escritura en `src/lib/audit.ts` | Pantalla *Bitácora* |
| REQ-006 | Filtros por especialidad, nivel y disponibilidad en la bolsa | Validación en `POST /api/postulaciones` + filtro visual en `/bolsa` | Postularse con un consultor de otra especialidad: rechazado |
| REQ-007 | Postulaciones estructuradas mediante plantilla T3C | Tabla `postulaciones` (enfoque, experiencia, tiempo estimado) + `postulacionSchema` | Panel de postulaciones en la ficha del caso |
| REQ-008 | Impedir múltiples responsables principales activos | `casos.consultorAsignadoId` único por caso; `POST /api/postulaciones/:id/aceptar` rechaza reasignar y marca las demás postulaciones como rechazadas en una transacción | Intentar aceptar una segunda postulación |
| REQ-009 | Gestionar TP4A–TP4H con versionamiento documental | Tabla `propuestas` con `unique(caso, versión)`; la versión se autoincrementa en `POST /api/propuestas`; documentos versionados por nombre | Crear dos propuestas en el mismo caso |
| REQ-010 | Checklist de QA y observaciones internas | `propuestas.qaChecklist` (JSONB) + `POST /api/propuestas/:id/qa`; sólo pasa a `LISTA` con los seis ítems marcados | Panel de propuestas como Advisory |
| REQ-011 | Peer review opcional *(Fase 2 en la matriz)* | No implementado — declarado en el roadmap del README | — |
| REQ-012 | Notificación y control documental del envío | `POST /api/propuestas/:id/enviar` fija `enviadaAt`, notifica a los actores y registra bitácora | Enviar una propuesta y mirar la campana |
| REQ-013 | Decisiones estructuradas TP6A–TP6E | `POST /api/propuestas/:id/decision` con tres decisiones tipificadas y comentario obligatorio | Entrar como el cliente titular |
| REQ-014 | Impedir negociaciones fuera del flujo controlado | La decisión sólo la registra el cliente titular, sólo sobre propuestas en estado `ENVIADA`, y dispara la transición del caso automáticamente | Intentar decidir con otro cliente: 403 |
| REQ-015 | Checklist de contratación sin asumir rol contractual | Tabla `checklist_contratacion`: la plataforma exige evidencia pero no es parte del contrato | Ficha del caso en *Pendiente de contratación* |
| REQ-016 | Bloquear el paso a ejecución hasta checklist completo | *Guard* de la transición `PENDIENTE_CONTRATACIÓN → AUTORIZADO_EJECUCIÓN` en `src/lib/workflow.ts` | Intentar autorizar con ítems sin marcar |
| REQ-017 | Alertas, incidencias y seguimiento ejecutivo | `src/lib/sla.ts` (`escanearSla`), tablas `sla_reglas` y `alertas`, tabla `actividades`, `vercel.json` con cron diario | Pantalla *SLA y alertas* → «Ejecutar escaneo» |
| REQ-018 | Acta de cierre y evaluación final | `PATCH /api/casos/:id` con `accion=cerrar`; *guard* que impide cerrar sin acta ni evaluación | Ficha del caso en *Listo para cierre* |
| REQ-019 | Plantillas de comunicación y notificaciones automáticas | `notificarCaso()` en `src/lib/casos.ts` + tabla `notificaciones` + panel en la barra superior | Campana de notificaciones |
| REQ-020 | Arquitectura modular con RBAC | Capas separadas (presentación / API / negocio / datos), enum `rol`, `requireRol()`, `filtroVisibilidad()` y middleware Edge | Comparar lo que ve cada usuario de prueba |

## Resumen

| Estado | Cantidad |
| --- | --- |
| Implementados en el MVP | 19 de 20 |
| Declarados Fase 2 en la matriz original | 1 (REQ-011, peer review) |

## Puntos del modelo operativo

| Punto | Cubierto por |
| --- | --- |
| 1 — Onboarding y apertura del caso | `/intake`, estados `CREADO` |
| 2 — Debida diligencia y clasificación | `EN_REVISIÓN`, `CLASIFICADO`, taxonomías LOV |
| 3 — Bolsa interna, postulación y asignación | `EN_POSTULACIÓN`, `ASIGNADO`, `/bolsa` |
| 4 — Diseño de la propuesta | `PROPUESTA_EN_DISEÑO`, plantillas TP4 |
| 5 — QA y envío | `PROPUESTA_LISTA_QA`, `PROPUESTA_ENVIADA` |
| 6 — Decisión del cliente | `EN_DECISIÓN_CLIENTE`, decisiones TP6 |
| 7 — Contratación | `PENDIENTE_CONTRATACIÓN`, `AUTORIZADO_EJECUCIÓN` |
| 8 — Ejecución y seguimiento | `EN_EJECUCIÓN`, actividades, SLA |
| 9 — Cierre | `LISTO_CIERRE`, `CERRADO`, acta y evaluación |
| Transversal | Bitácora, notificaciones, RBAC |
