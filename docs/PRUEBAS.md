# Recorrido funcional verificado

Ejecución real del ciclo de vida completo contra la API, con las respuestas
obtenidas del sistema. Sirve como evidencia de funcionamiento y como guion de
verificación para el equipo evaluador.

Todas las llamadas asumen el servidor en `http://localhost:3000` y usan cookies de
sesión (`-c` para guardar, `-b` para enviar).

```bash
B=http://localhost:3000
curl -s -c adv.txt -H 'Content-Type: application/json' \
  -d '{"email":"advisory@nodus.co","password":"nodus123"}' $B/api/auth/login
```

---

## 1. Autenticación

| Prueba | Resultado |
| --- | --- |
| Login válido | `{"ok":true,"data":{"nombre":"Carlos Mejía","rol":"ADVISORY"}}` |
| Contraseña incorrecta | `{"ok":false,"error":"Credenciales inválidas"}` — además queda registrado en bitácora |
| API sin sesión | `{"ok":false,"error":"No autenticado"}` (401) |

## 2. Onboarding y empresa única

| Prueba | Resultado |
| --- | --- |
| Intake de empresa nueva | `{"casoId":"…","codigo":"NODUS-2026-0007","empresaReutilizada":false}` |
| Intake con el mismo dominio de correo y otro contacto | `{"codigo":"NODUS-2026-0008","empresaReutilizada":true}` — no se duplicó la empresa |

## 3. Reglas de negocio del workflow

Cada intento de saltarse una regla es rechazado por el servidor con `422` y el
motivo exacto que ve el usuario en la interfaz.

| Intento | Respuesta del sistema |
| --- | --- |
| `CREADO → CLASIFICADO` (salto de estado) | `Transición no permitida: Creado → Clasificado.` |
| Clasificar sin complejidad ni tipo de intervención | `Debe registrar complejidad y tipo de intervención antes de clasificar.` |
| Asignar sin postulación aceptada | `Debe aceptar una postulación para definir el consultor responsable.` |
| Pasar a QA sin propuesta creada | `Debe crear una versión de propuesta antes de enviarla a QA.` |
| Enviar al cliente sin QA aprobado | `La propuesta debe tener el checklist de QA aprobado por Advisory.` |
| Autorizar ejecución con checklist incompleto | `El checklist de contratación debe estar completo antes de autorizar la ejecución.` |
| Solicitar cierre con actividades pendientes | `Quedan 1 actividad(es) sin completar.` |
| Cerrar sin acta de cierre | `Debe registrar el acta de cierre y la evaluación final.` |

## 4. Control de acceso

| Intento | Respuesta del sistema |
| --- | --- |
| Consultor acepta su propia postulación | `Se requiere rol: ADVISORY o SUPER_ADMIN` (403) |
| Consultor de Finanzas se postula a un caso de Operaciones | `El caso pertenece al área OPERACIONES y no coincide con sus especialidades.` |
| Consultor se postula dos veces al mismo caso | `Ya se postuló a este caso.` (409) |
| Cliente de otra empresa decide sobre una propuesta | `Sólo el cliente titular del caso puede registrar la decisión.` |
| Cliente de otra empresa abre un caso por URL | `No tiene acceso a este caso` (403) |
| Cliente de otra empresa descarga un documento | `Sin acceso al documento` (403) |

### Aislamiento verificado en el listado de casos

Con ocho casos en la base:

| Rol | Casos visibles |
| --- | --- |
| Advisory | 8 (todos) |
| Consultor | 3 (sus casos asignados + los publicados en la bolsa) |
| Cliente Mipyme | 2 (sólo los de su empresa) |

## 5. Ciclo de vida completo

Recorrido de los catorce estados, ejecutado de extremo a extremo:

| # | Acción | Actor | Estado resultante |
| --- | --- | --- | --- |
| 1 | Intake público | Cliente | `CREADO` |
| 2 | Iniciar debida diligencia | Advisory | `EN_REVISIÓN` |
| 3 | Clasificar (complejidad + tipo) | Advisory | `EN_REVISIÓN` |
| 4 | Confirmar clasificación | Advisory | `CLASIFICADO` |
| 5 | Publicar en bolsa | Advisory | `EN_POSTULACIÓN` |
| 6 | Postulación T3C | Consultor elegible | `EN_POSTULACIÓN` |
| 7 | Aceptar postulación | Advisory | `EN_POSTULACIÓN` |
| 8 | Asignar | Advisory | `ASIGNADO` |
| 9 | Iniciar diseño | Consultor | `PROPUESTA_EN_DISEÑO` |
| 10 | Crear propuesta v1 | Consultor | `PROPUESTA_EN_DISEÑO` |
| 11 | Enviar a QA | Consultor | `PROPUESTA_LISTA_QA` |
| 12 | QA incompleto (2 ítems sin marcar) | Advisory | propuesta en `EN_QA` |
| 13 | QA completo | Advisory | propuesta en `LISTA` |
| 14 | Envío formal | Advisory | propuesta `ENVIADA` |
| 15 | Confirmar envío | Advisory | `PROPUESTA_ENVIADA` |
| 16 | Marcar como recibida | Advisory | `EN_DECISIÓN_CLIENTE` |
| 17 | Aceptar propuesta | Cliente titular | `PENDIENTE_CONTRATACIÓN` |
| 18 | Completar checklist | Advisory | `PENDIENTE_CONTRATACIÓN` |
| 19 | Autorizar ejecución | Advisory | `AUTORIZADO_EJECUCIÓN` |
| 20 | Iniciar ejecución | Advisory | `EN_EJECUCIÓN` |
| 21 | Crear y completar actividad | Consultor | `EN_EJECUCIÓN` |
| 22 | Solicitar cierre | Consultor | `LISTO_CIERRE` |
| 23 | Registrar acta y evaluación | Advisory | `LISTO_CIERRE` |
| 24 | Cerrar caso | Advisory | `CERRADO` |

## 6. Gestión documental

| Prueba | Resultado |
| --- | --- |
| Cargar `evidencia.txt` | `{"nombre":"evidencia.txt","version":1}` |
| Cargar el mismo nombre otra vez | `{"nombre":"evidencia.txt","version":2}` — versionamiento automático |
| Descargar con permisos | Devuelve el contenido del archivo |
| Descargar sin permisos | `Sin acceso al documento` |

## 7. Motor de SLA

```bash
curl -s -b adv.txt -X POST $B/api/sla/scan
{"ok":true,"data":{"evaluados":6,"alertasCreadas":0,"vencidos":1}}
```

El escaneo es idempotente: no duplica una alerta abierta del mismo tipo para el
mismo caso. Al cambiar de estado, las alertas del estado anterior se marcan como
atendidas y se recalcula la fecha de vencimiento.

## 8. Indicadores

```bash
curl -s -b adv.txt $B/api/dashboard/kpis
```

```json
{
  "operativos": {
    "casosActivos": 6, "slaVencidos": 1, "cumplimientoSla": 83,
    "tiempoClasificacion": 33, "tiempoPropuesta": 51, "alertasAbiertas": 1
  },
  "comerciales": {
    "propuestasEnviadas": 2, "propuestasAceptadas": 1,
    "conversion": 50, "ticketPromedio": 18500000, "pipeline": 9800000
  },
  "ecosistema": { "consultoresActivos": 4, "empresasAtendidas": 3 }
}
```

## 9. Renderizado de pantallas

Todas las pantallas responden `200` para los roles autorizados, sin errores en el
servidor:

`/dashboard` · `/casos` · `/casos/[id]` · `/casos/nuevo` · `/bolsa` · `/empresas` ·
`/consultores` · `/propuestas` · `/documentos` · `/sla` · `/bitacora` ·
`/configuracion` · `/intake` · `/login`
