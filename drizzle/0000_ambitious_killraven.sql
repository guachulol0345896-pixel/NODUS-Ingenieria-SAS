CREATE TYPE "public"."disponibilidad" AS ENUM('DISPONIBLE', 'PARCIAL', 'NO_DISPONIBLE');--> statement-breakpoint
CREATE TYPE "public"."estado_actividad" AS ENUM('PLANIFICADA', 'EN_CURSO', 'COMPLETADA', 'BLOQUEADA');--> statement-breakpoint
CREATE TYPE "public"."estado_caso" AS ENUM('CREADO', 'EN_REVISION', 'CLASIFICADO', 'EN_POSTULACION', 'ASIGNADO', 'PROPUESTA_EN_DISENO', 'PROPUESTA_LISTA_QA', 'PROPUESTA_ENVIADA', 'EN_DECISION_CLIENTE', 'PENDIENTE_CONTRATACION', 'AUTORIZADO_EJECUCION', 'EN_EJECUCION', 'LISTO_CIERRE', 'CERRADO');--> statement-breakpoint
CREATE TYPE "public"."estado_postulacion" AS ENUM('POSTULADA', 'ACEPTADA', 'RECHAZADA', 'RETIRADA');--> statement-breakpoint
CREATE TYPE "public"."estado_propuesta" AS ENUM('BORRADOR', 'EN_QA', 'LISTA', 'ENVIADA', 'ACEPTADA', 'AJUSTES_SOLICITADOS', 'RECHAZADA');--> statement-breakpoint
CREATE TYPE "public"."impacto" AS ENUM('ALTO', 'MEDIO', 'BAJO');--> statement-breakpoint
CREATE TYPE "public"."nivel_consultor" AS ENUM('JUNIOR', 'SEMI_SENIOR', 'SENIOR', 'EXPERTO');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('SUPER_ADMIN', 'ADVISORY', 'CONSULTOR', 'CLIENTE_MIPYME');--> statement-breakpoint
CREATE TYPE "public"."tipo_alerta" AS ENUM('SLA_PROXIMO', 'SLA_VENCIDO', 'ESCALAMIENTO', 'INFORMATIVA');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('INTAKE', 'PROPUESTA', 'CONTRACTUAL', 'EVIDENCIA', 'ACTA_CIERRE', 'OTRO');--> statement-breakpoint
CREATE TYPE "public"."urgencia" AS ENUM('ALTA', 'MEDIA', 'BAJA');--> statement-breakpoint
CREATE TABLE "actividades" (
	"id" text PRIMARY KEY NOT NULL,
	"caso_id" text NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"estado" "estado_actividad" DEFAULT 'PLANIFICADA' NOT NULL,
	"fecha_plan" timestamp with time zone,
	"fecha_real" timestamp with time zone,
	"responsable_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alertas" (
	"id" text PRIMARY KEY NOT NULL,
	"caso_id" text NOT NULL,
	"tipo" "tipo_alerta" NOT NULL,
	"mensaje" text NOT NULL,
	"nivel" integer DEFAULT 1 NOT NULL,
	"atendida" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bitacora" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_nombre" text NOT NULL,
	"actor_rol" text NOT NULL,
	"accion" text NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" text,
	"estado_anterior" text,
	"estado_nuevo" text,
	"detalle" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "casos" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text NOT NULL,
	"estado" "estado_caso" DEFAULT 'CREADO' NOT NULL,
	"area_negocio" text NOT NULL,
	"urgencia" "urgencia" NOT NULL,
	"impacto" "impacto" NOT NULL,
	"complejidad" text,
	"tipo_intervencion" text,
	"etiquetas" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"notas_clasificacion" text,
	"empresa_id" text NOT NULL,
	"creado_por_id" text NOT NULL,
	"consultor_asignado_id" text,
	"asignado_at" timestamp with time zone,
	"sla_vence_at" timestamp with time zone,
	"sla_horas" integer,
	"sla_incumplido" boolean DEFAULT false NOT NULL,
	"valor_cerrado" double precision,
	"cerrado_at" timestamp with time zone,
	"acta_cierre" text,
	"evaluacion_final" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_contratacion" (
	"id" text PRIMARY KEY NOT NULL,
	"caso_id" text NOT NULL,
	"propuesta_aceptada" boolean DEFAULT false NOT NULL,
	"contrato_firmado" boolean DEFAULT false NOT NULL,
	"alcance_confirmado" boolean DEFAULT false NOT NULL,
	"cronograma_acordado" boolean DEFAULT false NOT NULL,
	"condiciones_economicas" boolean DEFAULT false NOT NULL,
	"datos_tratamiento" boolean DEFAULT false NOT NULL,
	"observaciones" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultor_perfiles" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"especialidades" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"nivel" "nivel_consultor" DEFAULT 'SEMI_SENIOR' NOT NULL,
	"disponibilidad" "disponibilidad" DEFAULT 'DISPONIBLE' NOT NULL,
	"anos_experiencia" integer DEFAULT 0 NOT NULL,
	"bio" text,
	"reputacion" double precision DEFAULT 0 NOT NULL,
	"casos_cerrados" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "tipo_documento" DEFAULT 'OTRO' NOT NULL,
	"mime_type" varchar(160) NOT NULL,
	"tamano" integer NOT NULL,
	"contenido" "bytea" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"descripcion" text,
	"caso_id" text,
	"propuesta_id" text,
	"subido_por_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"nombre_normalizado" text NOT NULL,
	"nit" text,
	"dominio_correo" text,
	"correo_contacto" text NOT NULL,
	"telefono" text,
	"pais" text NOT NULL,
	"ciudad" text NOT NULL,
	"sector" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lov" (
	"id" text PRIMARY KEY NOT NULL,
	"grupo" text NOT NULL,
	"codigo" text NOT NULL,
	"etiqueta" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificaciones" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"titulo" text NOT NULL,
	"mensaje" text NOT NULL,
	"url" text,
	"leida" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postulaciones" (
	"id" text PRIMARY KEY NOT NULL,
	"caso_id" text NOT NULL,
	"consultor_id" text NOT NULL,
	"enfoque" text NOT NULL,
	"experiencia" text NOT NULL,
	"tiempo_estimado" integer NOT NULL,
	"estado" "estado_postulacion" DEFAULT 'POSTULADA' NOT NULL,
	"observacion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propuestas" (
	"id" text PRIMARY KEY NOT NULL,
	"caso_id" text NOT NULL,
	"version" integer NOT NULL,
	"titulo" text NOT NULL,
	"resumen" text NOT NULL,
	"alcance" text NOT NULL,
	"metodologia" text NOT NULL,
	"entregables" text NOT NULL,
	"cronograma" text NOT NULL,
	"supuestos" text,
	"valor_estimado" double precision,
	"duracion_dias" integer,
	"estado" "estado_propuesta" DEFAULT 'BORRADOR' NOT NULL,
	"qa_checklist" jsonb,
	"qa_observaciones" text,
	"qa_aprobada_por" text,
	"enviada_at" timestamp with time zone,
	"decision_at" timestamp with time zone,
	"decision_comentario" text,
	"creada_por_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_reglas" (
	"id" text PRIMARY KEY NOT NULL,
	"estado" "estado_caso" NOT NULL,
	"horas" integer NOT NULL,
	"nivel_escalamiento" integer DEFAULT 1 NOT NULL,
	"descripcion" text
);
--> statement-breakpoint
CREATE TABLE "transiciones" (
	"id" text PRIMARY KEY NOT NULL,
	"caso_id" text NOT NULL,
	"estado_anterior" "estado_caso",
	"estado_nuevo" "estado_caso" NOT NULL,
	"actor_id" text,
	"actor_nombre" text NOT NULL,
	"comentario" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"rol" "rol" DEFAULT 'CLIENTE_MIPYME' NOT NULL,
	"cargo" text,
	"telefono" text,
	"activo" boolean DEFAULT true NOT NULL,
	"empresa_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_responsable_id_usuarios_id_fk" FOREIGN KEY ("responsable_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casos" ADD CONSTRAINT "casos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casos" ADD CONSTRAINT "casos_creado_por_id_usuarios_id_fk" FOREIGN KEY ("creado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casos" ADD CONSTRAINT "casos_consultor_asignado_id_usuarios_id_fk" FOREIGN KEY ("consultor_asignado_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_contratacion" ADD CONSTRAINT "checklist_contratacion_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultor_perfiles" ADD CONSTRAINT "consultor_perfiles_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_propuesta_id_propuestas_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuestas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_subido_por_id_usuarios_id_fk" FOREIGN KEY ("subido_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_consultor_id_usuarios_id_fk" FOREIGN KEY ("consultor_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_creada_por_id_usuarios_id_fk" FOREIGN KEY ("creada_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transiciones" ADD CONSTRAINT "transiciones_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actividades_caso_idx" ON "actividades" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX "alertas_caso_idx" ON "alertas" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX "bitacora_entidad_idx" ON "bitacora" USING btree ("entidad","entidad_id");--> statement-breakpoint
CREATE INDEX "bitacora_created_idx" ON "bitacora" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "casos_codigo_uq" ON "casos" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "casos_estado_idx" ON "casos" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "casos_empresa_idx" ON "casos" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "casos_consultor_idx" ON "casos" USING btree ("consultor_asignado_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_caso_uq" ON "checklist_contratacion" USING btree ("caso_id");--> statement-breakpoint
CREATE UNIQUE INDEX "consultor_perfil_usuario_uq" ON "consultor_perfiles" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "documentos_caso_idx" ON "documentos" USING btree ("caso_id");--> statement-breakpoint
CREATE UNIQUE INDEX "empresas_nombre_norm_uq" ON "empresas" USING btree ("nombre_normalizado");--> statement-breakpoint
CREATE INDEX "empresas_dominio_idx" ON "empresas" USING btree ("dominio_correo");--> statement-breakpoint
CREATE UNIQUE INDEX "lov_grupo_codigo_uq" ON "lov" USING btree ("grupo","codigo");--> statement-breakpoint
CREATE INDEX "lov_grupo_idx" ON "lov" USING btree ("grupo");--> statement-breakpoint
CREATE INDEX "notificaciones_usuario_idx" ON "notificaciones" USING btree ("usuario_id","leida");--> statement-breakpoint
CREATE UNIQUE INDEX "postulacion_caso_consultor_uq" ON "postulaciones" USING btree ("caso_id","consultor_id");--> statement-breakpoint
CREATE INDEX "postulaciones_caso_idx" ON "postulaciones" USING btree ("caso_id");--> statement-breakpoint
CREATE UNIQUE INDEX "propuesta_caso_version_uq" ON "propuestas" USING btree ("caso_id","version");--> statement-breakpoint
CREATE INDEX "propuestas_caso_idx" ON "propuestas" USING btree ("caso_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sla_regla_estado_uq" ON "sla_reglas" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "transiciones_caso_idx" ON "transiciones" USING btree ("caso_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_uq" ON "usuarios" USING btree ("email");--> statement-breakpoint
CREATE INDEX "usuarios_rol_idx" ON "usuarios" USING btree ("rol");