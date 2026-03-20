import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index, jsonb, unique, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const specialties = pgTable("specialties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  medicalRecordNumber: varchar("medical_record_number", { length: 20 }).unique(),
  name: text("name").notNull(),
  cpf: text("cpf").notNull().unique(),
  rg: text("rg").notNull(),
  rgIssuingAgency: text("rg_issuing_agency"),
  susCard: text("sus_card").notNull(),
  birthDate: text("birth_date").notNull(),
  gender: text("gender").notNull(), // masculino, feminino
  email: text("email"),
  whatsapp: text("whatsapp"), // Campo de telefone (mantido nome para compatibilidade)
  phoneIsWhatsapp: boolean("phone_is_whatsapp").default(true), // Se o telefone é WhatsApp
  landlinePhone: text("landline_phone"), // Mantido para compatibilidade com dados existentes
  profession: text("profession"),
  occupation: text("occupation"),
  motherName: text("mother_name"),
  address: text("address").notNull(),
  addressNumber: text("address_number").notNull(),
  neighborhood: text("neighborhood").notNull(),
  zoneType: text("zone_type").notNull(), // urbana, rural
  city: text("city").notNull(),
  state: text("state").notNull(),
  // Informações Complementares
  fatherName: text("father_name"), // Nome do Pai
  religion: text("religion"), // Religião
  race: text("race"), // Cor/Raça (Branca, Parda, Preta, Amarela, Indígena)
  education: text("education"), // Instrução/Escolaridade
  nationality: text("nationality"), // Nacionalidade
  birthPlace: text("birth_place"), // Natural de (cidade/estado de nascimento)
  // Campos de Recém-Nascido (RN)
  isNewborn: boolean("is_newborn").default(false), // Flag para identificar se é cadastro de RN
  newbornStatus: text("newborn_status"), // Situação do RN (dropdown)
  skinColor: text("skin_color"), // Cor (Branca, Parda, Preta, Amarela, Indígena)
  isTwin: boolean("is_twin").default(false), // Gemelar
  antibioticGiven: text("antibiotic_given"), // Antibiótico administrado
  breastfeeding: text("breastfeeding"), // Leite Materno (Sim, Não, Misto)
  otherFeeding: text("other_feeding"), // Outra Alimentação
  isPremature: boolean("is_premature").default(false), // Prematuro
  gestationalAge: text("gestational_age"), // Idade Gestacional (semanas)
  hadTransfusion: boolean("had_transfusion").default(false), // Transfusão
  transfusionDate: text("transfusion_date"), // Data da transfusão
  referenceDate: text("reference_date"), // Data de Referência
  birthWeight: text("birth_weight"), // Peso ao Nascer (Kg)
  newbornObservation: text("newborn_observation"), // Observação do RN
  // Campos de Pessoa com Deficiência (PcD)
  isPcd: boolean("is_pcd").default(false), // Flag para identificar se é PcD
  disabilityType: text("disability_type"), // Tipo de deficiência (visual, auditiva, fisica, intelectual, multipla, psicossocial)
  disabilityCid: text("disability_cid"), // CID relacionado à deficiência
  disabilityDegree: text("disability_degree"), // Grau (leve, moderado, severo)
  needsPermanentCompanion: boolean("needs_permanent_companion").default(false), // Necessita acompanhante permanente
  accessibilityResources: text("accessibility_resources"), // Recursos de acessibilidade necessários
  hasBpcLoas: boolean("has_bpc_loas").default(false), // Beneficiário BPC/LOAS
  pcdObservation: text("pcd_observation"), // Observações sobre a deficiência
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id),
  // Legacy fields for backward compatibility - will be deprecated
  patientName: text("patient_name"),
  patientCpf: text("patient_cpf"),
  patientSusCard: text("patient_sus_card"),
  patientWhatsapp: text("patient_whatsapp"),
  specialtyId: varchar("specialty_id").references(() => specialties.id).notNull(),
  appointmentDate: text("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("scheduled").notNull(), // scheduled, rescheduled, cancelled, completed
  googleCalendarEventId: text("google_calendar_event_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Medical History table for tracking patient medical records
export const medicalHistory = pgTable("medical_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  hospitalizationId: varchar("hospitalization_id"),
  attendanceLocation: text("attendance_location"), // Local do atendimento: sala_vermelha, observacao, internacao, ambulatorio
  specialtyId: varchar("specialty_id").references(() => specialties.id).notNull(),
  consultationDate: text("consultation_date").notNull(),
  consultationTime: text("consultation_time").notNull(),
  reason: text("reason").notNull(), // Motivo/Resumo da Consulta
  symptoms: text("symptoms"), // Sintomas relatados
  diagnosis: text("diagnosis"), // Diagnóstico
  treatment: text("treatment"), // Tratamento prescrito
  medications: text("medications"), // Medicamentos prescritos
  observations: text("observations"), // Observações gerais
  examResults: text("exam_results"), // Resultados de exames
  nextConsultation: text("next_consultation"), // Próxima consulta recomendada
  doctorName: text("doctor_name").notNull(), // Nome do médico
  doctorRegistration: text("doctor_registration"), // CRM para médico, COREN para enfermeiro
  doctorRole: text("doctor_role"), // Role do profissional: doctor, triage, etc.
  startTime: timestamp("start_time"), // Horário de início da consulta
  endTime: timestamp("end_time"), // Horário de fim da consulta
  durationMinutes: text("duration_minutes"), // Duração em minutos
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Triage table for patient severity assessment
export const triage = pgTable("triage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  staffId: varchar("staff_id").references(() => users.id).notNull(), // Staff que realizou a triagem
  staffName: text("staff_name").notNull(), // Nome do staff para referência
  
  // Classificação de gravidade (Protocolo de Manchester)
  severity: text("severity").notNull(), // vermelho, laranja, amarelo, verde, azul
  suggestedSeverity: text("suggested_severity"), // Classificação sugerida pelo algoritmo
  severityOverridden: boolean("severity_overridden").default(false), // Se o enfermeiro alterou a sugestão
  overrideJustification: text("override_justification"), // Justificativa da alteração
  
  // Flags de condições (Anamnese de Enfermagem)
  flagHipertensao: boolean("flag_hipertensao").default(false), // Hipertensão
  flagDiabetes: boolean("flag_diabetes").default(false), // Diabetes
  flagGestante: boolean("flag_gestante").default(false), // Gestante
  flagSuspeitaTb: boolean("flag_suspeita_tb").default(false), // Suspeita de TB
  flagSuspeitaDengue: boolean("flag_suspeita_dengue").default(false), // Suspeita de Dengue
  flagAcidenteTransito: boolean("flag_acidente_transito").default(false), // Acidente de trânsito
  flagNotificacaoCompulsoria: boolean("flag_notificacao_compulsoria").default(false), // Notificação compulsória
  
  // Sinais vitais
  temperature: text("temperature"), // Temperatura (°C)
  bloodPressure: text("blood_pressure"), // Pressão arterial (ex: 120/80)
  heartRate: text("heart_rate"), // Frequência cardíaca (bpm)
  respiratoryRate: text("respiratory_rate"), // Frequência respiratória (rpm)
  oxygenSaturation: text("oxygen_saturation"), // Saturação de oxigênio (%)
  weight: text("weight"), // Peso (kg)
  height: text("height"), // Altura (cm)
  hgt: text("hgt"), // HGT - Hemoglicoteste (mg/dL)
  
  // Informações clínicas
  mainSymptoms: text("main_symptoms").notNull(), // Sintomas principais (pode ser JSON array das queixas selecionadas)
  selectedComplaints: text("selected_complaints"), // JSON array das queixas selecionadas por checkbox
  allergies: text("allergies"), // Alergias conhecidas
  hasAllergies: boolean("has_allergies").default(false), // Flag para destacar alergias
  currentMedications: text("current_medications"), // Medicações em uso
  preExistingConditions: text("pre_existing_conditions"), // Condições pré-existentes
  
  // Observações e ações
  observations: text("observations"), // Observações gerais
  recommendedAction: text("recommended_action"), // Ação recomendada (aguardar consulta, encaminhar urgência, etc)
  
  // Timestamps
  triageDate: text("triage_date").notNull(), // Data da triagem
  triageTime: text("triage_time").notNull(), // Horário da triagem
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Queue Entries table for walk-in patient queue management
export const queueEntries = pgTable("queue_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  triageId: varchar("triage_id").references(() => triage.id), // Opcional, preenchido após triagem
  doctorId: varchar("doctor_id").references(() => users.id), // Médico que atendeu
  
  // Controle da fila
  queueNumber: text("queue_number").notNull(), // Número da senha (ex: "001", "002") - gerado automaticamente no backend
  queueDate: text("queue_date").notNull(), // Data da fila (YYYY-MM-DD) para garantir uniqueness por dia
  status: text("status").default("aguardando_triagem").notNull(), // aguardando_triagem, aguardando, chamado, em_atendimento, finalizado, cancelado
  priority: text("priority").default("5").notNull(), // 1=emergência, 2=alta, 3=média, 4=baixa, 5=sem triagem
  
  // Timestamps do fluxo
  arrivalTime: timestamp("arrival_time").defaultNow().notNull(), // Quando entrou na fila
  calledTime: timestamp("called_time"), // Quando foi chamado pelo médico
  startTime: timestamp("start_time"), // Quando começou o atendimento
  endTime: timestamp("end_time"), // Quando finalizou
  
  // Informações adicionais
  observations: text("observations"), // Observações gerais
  cancellationReason: text("cancellation_reason"), // Motivo do cancelamento se aplicável
  
  // Dados do acompanhante (opcional)
  companionName: text("companion_name"), // Nome completo do acompanhante
  companionDocument: text("companion_document"), // CPF ou RG do acompanhante
  companionRelationship: text("companion_relationship"), // Grau de parentesco (mãe, pai, filho, cônjuge, etc)
  companionPhone: text("companion_phone"), // Telefone de contato do acompanhante
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Garante que não haja números duplicados no mesmo dia
  uniqueQueueNumberPerDay: unique("unique_queue_number_per_day").on(table.queueNumber, table.queueDate),
}));

// Anamnesis Templates table for specialty-specific medical history templates
export const anamnesisTemplates = pgTable("anamnesis_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  specialtyName: text("specialty_name").notNull(), // Ex: "Cardiologia", "Pediatria", "Clínica Geral"
  name: text("name").notNull(), // Nome do template
  description: text("description"), // Descrição do template
  sections: jsonb("sections").notNull(), // Array de seções com campos e perguntas
  isDefault: boolean("is_default").default(false).notNull(), // Template padrão do sistema
  createdBy: varchar("created_by").references(() => users.id), // Usuário que criou (null para templates padrão)
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Clinical Protocols table for medical treatment guidelines
export const clinicalProtocols = pgTable("clinical_protocols", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(), // Título do protocolo
  category: text("category").notNull(), // Categoria (Emergência, Cardiologia, Pediatria, etc)
  condition: text("condition").notNull(), // Condição médica (IAM, AVC, Asma, etc)
  description: text("description"), // Descrição breve
  sections: jsonb("sections").notNull(), // Seções estruturadas do protocolo (array de objetos)
  version: text("version").default("1.0").notNull(), // Versão do protocolo
  tags: text("tags").array(), // Tags para busca
  source: text("source"), // Fonte/referência do protocolo (Ministério da Saúde, SBC, etc)
  isDefault: boolean("is_default").default(false).notNull(), // Protocolo padrão do sistema
  createdBy: varchar("created_by").references(() => users.id), // Usuário que criou
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for local authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  name: varchar("name").notNull(),
  email: varchar("email").unique().notNull(),
  role: text("role").default("staff").notNull(), // admin, staff, viewer, doctor, triage, farmacia, laboratorio, diretor, radiologista
  // Campos específicos para profissionais de saúde
  crm: varchar("crm"), // Registro no Conselho Regional de Medicina (médicos)
  coren: varchar("coren"), // Registro no Conselho Regional de Enfermagem (enfermeiros)
  crbm: varchar("crbm"), // Registro no Conselho Regional de Biomedicina (biomédicos)
  crf: varchar("crf"), // Registro no Conselho Regional de Farmácia (farmacêuticos)
  crtr: varchar("crtr"), // Registro no Conselho Regional de Técnicos em Radiologia (radiologistas)
  medicalSpecialty: varchar("medical_specialty"), // Especialidade médica
  healthUnit: varchar("health_unit"), // Unidade de saúde (PSF, CEM, CEO, etc)
  profilePhotoUrl: text("profile_photo_url"), // URL da foto de perfil no object storage
  signature: text("signature"), // Assinatura digital em base64
  isActive: boolean("is_active").default(true).notNull(), // Status ativo do usuário
  mustChangePassword: boolean("must_change_password").default(false).notNull(), // Forçar troca de senha no primeiro login
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Scheduled Messages table for WhatsApp message scheduling
export const scheduledMessages = pgTable("scheduled_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queueEntryId: varchar("queue_entry_id").references(() => queueEntries.id).notNull(),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  messageType: text("message_type").notNull(), // queue_confirmation, receptionist_survey, doctor_survey
  scheduledFor: timestamp("scheduled_for").notNull(), // Quando a mensagem deve ser enviada
  status: text("status").default("pendente").notNull(), // pendente, enviada, erro, cancelada
  errorMessage: text("error_message"), // Mensagem de erro se falhar
  sentAt: timestamp("sent_at"), // Quando foi enviada
  messageData: jsonb("message_data"), // Dados adicionais da mensagem
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Satisfaction Surveys table for tracking patient feedback
// Scheduled Message Status Constants (English only - translate at presentation layer)
export const SCHEDULED_MESSAGE_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  ERROR: 'error',
  CANCELLED: 'cancelled'
} as const;

export type ScheduledMessageStatus = typeof SCHEDULED_MESSAGE_STATUS[keyof typeof SCHEDULED_MESSAGE_STATUS];

// Satisfaction Survey Status Constants (English only - translate at presentation layer)
export const SATISFACTION_SURVEY_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
} as const;

export type SatisfactionSurveyStatus = typeof SATISFACTION_SURVEY_STATUS[keyof typeof SATISFACTION_SURVEY_STATUS];

export const satisfactionSurveys = pgTable("satisfaction_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queueEntryId: varchar("queue_entry_id").references(() => queueEntries.id).notNull(),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  surveyType: text("survey_type").notNull(), // receptionist, doctor, pre_consultation, post_consultation
  surveyToken: varchar("survey_token").unique(), // Token único para acesso via web
  rating: text("rating"), // 1-5 estrelas
  feedback: text("feedback"), // Comentário opcional
  respondedAt: timestamp("responded_at"), // Quando respondeu
  responseMethod: text("response_method"), // web, whatsapp, email - como respondeu
  status: text("status").default(SATISFACTION_SURVEY_STATUS.PENDING).notNull(), // Use constants only
  whatsappMessageSent: boolean("whatsapp_message_sent"), // Se a mensagem WhatsApp foi enviada
  emailSent: boolean("email_sent"), // Se o email foi enviado
  sentAt: timestamp("sent_at"), // Quando a mensagem foi enviada
  whatsappConversationId: text("whatsapp_conversation_id"), // ID da conversa WhatsApp para rastreamento
  expiresAt: timestamp("expires_at"), // Data de expiração da pesquisa
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Exam Request Status Constants
export const EXAM_REQUEST_STATUS = {
  PENDING: 'pendente',
  IN_PROGRESS: 'em_andamento',
  COMPLETED: 'concluido',
  CANCELLED: 'cancelado'
} as const;

export type ExamRequestStatus = typeof EXAM_REQUEST_STATUS[keyof typeof EXAM_REQUEST_STATUS];

// Exam Requests table for radiology/laboratory exam management
export const examRequests = pgTable("exam_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  medicalHistoryId: varchar("medical_history_id").references(() => medicalHistory.id),
  queueEntryId: varchar("queue_entry_id").references(() => queueEntries.id),
  
  // Médico solicitante
  requestingDoctorId: varchar("requesting_doctor_id").references(() => users.id).notNull(),
  requestingDoctorName: text("requesting_doctor_name").notNull(),
  
  // Radiologista/Laboratorista que realizou
  performingDoctorId: varchar("performing_doctor_id").references(() => users.id),
  performingDoctorName: text("performing_doctor_name"),
  
  // Informações do exame
  examType: text("exam_type").notNull(), // imagem, laboratorio
  examCategory: text("exam_category").notNull(), // raio_x, ultrassom, hemograma, bioquimica, etc
  examName: text("exam_name").notNull(), // Nome completo do exame
  examCode: text("exam_code").notNull(), // ID do exame (rx_torax, lab_hemograma, etc)
  
  // Status e prioridade
  status: text("status").default(EXAM_REQUEST_STATUS.PENDING).notNull(),
  priority: text("priority").default("normal").notNull(), // urgente, normal
  
  // Indicação clínica (motivo da solicitação)
  clinicalIndication: text("clinical_indication"),
  
  // Resultado/Laudo
  result: text("result"), // Laudo do exame
  resultDate: text("result_date"), // Data do laudo
  resultTime: text("result_time"), // Hora do laudo
  observations: text("observations"), // Observações adicionais
  
  // Imagens do exame (URLs do object storage)
  images: text("images").array(), // Array de URLs das imagens do exame
  
  // Timestamps
  requestDate: text("request_date").notNull(), // Data da solicitação
  requestTime: text("request_time").notNull(), // Hora da solicitação
  startedAt: timestamp("started_at"), // Quando começou a realizar
  completedAt: timestamp("completed_at"), // Quando finalizou
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertSpecialtySchema = createInsertSchema(specialties).omit({
  id: true,
  createdAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  medicalRecordNumber: true,
}).extend({
  cpf: z.union([
    z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve estar no formato 000.000.000-00"),
    z.literal(""),
  ]),
  susCard: z.union([
    z.string().min(15, "Cartão SUS deve ter pelo menos 15 dígitos"),
    z.literal(""),
  ]),
  whatsapp: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone é obrigatório e deve estar no formato (87) 99999-9999"),
  race: z.string().min(1, "Raça/Cor é obrigatória"),
  gender: z.enum(["masculino", "feminino"]),
  zoneType: z.enum(["urbana", "rural"]),
  state: z.string().length(2, "UF deve ter 2 caracteres"),
});

// Legacy appointment schema for backward compatibility
export const insertLegacyAppointmentSchema = z.object({
  patientName: z.string().min(1, "Nome é obrigatório"),
  patientCpf: z.string().min(1, "CPF é obrigatório"),
  patientRg: z.string().min(1, "RG é obrigatório"),
  patientBirthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  patientGender: z.enum(["masculino", "feminino"]),
  patientSusCard: z.string().min(1, "Cartão SUS é obrigatório"),
  patientWhatsapp: z.string().min(1, "WhatsApp é obrigatório"),
  patientAddress: z.string().min(1, "Endereço é obrigatório"),
  patientAddressNumber: z.string().min(1, "Número do endereço é obrigatório"),
  patientNeighborhood: z.string().min(1, "Bairro é obrigatório"),
  patientZoneType: z.enum(["urbana", "rural"]),
  patientCity: z.string().min(1, "Cidade é obrigatória"),
  patientState: z.string().length(2, "UF deve ter 2 caracteres"),
  specialtyId: z.string().min(1, "Especialidade é obrigatória"),
  appointmentDate: z.string().min(1, "Data é obrigatória"),
  appointmentTime: z.string().min(1, "Horário é obrigatório"),
  reason: z.string().min(1, "Motivo é obrigatório"),
  status: z.enum(["scheduled", "rescheduled", "cancelled", "completed"]).default("scheduled"),
});

// Modern appointment schema using patient ID
export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  googleCalendarEventId: true,
  patientName: true,
  patientCpf: true,
  patientSusCard: true,
  patientWhatsapp: true,
}).extend({
  status: z.enum(["scheduled", "rescheduled", "cancelled", "completed"]).default("scheduled"),
});

// Medical History schema
export const insertMedicalHistorySchema = createInsertSchema(medicalHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  specialtyId: z.string().optional().nullable(), // Opcional para enfermeiros
  consultationDate: z.string().min(1, "Data da consulta é obrigatória"),
  consultationTime: z.string().min(1, "Horário da consulta é obrigatório"),
  reason: z.string().min(1, "Motivo da consulta é obrigatório"),
  doctorName: z.string().min(1, "Nome do profissional é obrigatório"),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
});

// Triage schema
export const insertTriageSchema = createInsertSchema(triage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  staffId: z.string().min(1, "Funcionário é obrigatório"),
  staffName: z.string().min(1, "Nome do funcionário é obrigatório"),
  severity: z.enum(["azul", "verde", "amarelo", "laranja", "vermelho"], {
    errorMap: () => ({ message: "Gravidade deve ser: azul, verde, amarelo, laranja ou vermelho" })
  }),
  suggestedSeverity: z.enum(["azul", "verde", "amarelo", "laranja", "vermelho"]).optional().nullable(),
  severityOverridden: z.boolean().optional().default(false),
  overrideJustification: z.string().optional().nullable(),
  mainSymptoms: z.string().min(1, "Sintomas principais são obrigatórios"),
  triageDate: z.string().min(1, "Data da triagem é obrigatória"),
  triageTime: z.string().min(1, "Horário da triagem é obrigatório"),
  // Novos campos opcionais
  flagHipertensao: z.boolean().optional().default(false),
  flagDiabetes: z.boolean().optional().default(false),
  flagGestante: z.boolean().optional().default(false),
  flagSuspeitaTb: z.boolean().optional().default(false),
  flagSuspeitaDengue: z.boolean().optional().default(false),
  flagAcidenteTransito: z.boolean().optional().default(false),
  flagNotificacaoCompulsoria: z.boolean().optional().default(false),
  hgt: z.string().optional().nullable(),
  selectedComplaints: z.string().optional().nullable(),
  hasAllergies: z.boolean().optional().default(false),
});

// Lista de queixas principais comuns para triagem (baseado no formulário de enfermagem)
export const TRIAGE_COMPLAINTS = {
  // Coluna 1 - Queixas Gerais
  gerais: [
    "Acidente com Animais Peçonhentos",
    "Afecções de Pele",
    "Afogamento",
    "Agressões e/ou Causas Especiais",
    "Alterações dos SSVV",
    "Alterações Neurológicas",
    "Cefaleia",
    "Choque Elétrico",
    "Convulsão",
    "Desidratação",
    "Diarreia",
  ],
  // Coluna 2 - Dores e Respiratórias
  doresRespiratorias: [
    "Dispnéia",
    "Distúrbios Psiquiátricos",
    "Dor abdominal",
    "Dor Cervical",
    "Dor Lombar",
    "DOR MMSS/MMII",
    "Dor Ouvido/Garganta",
    "Dor torácica",
    "Edemas",
    "Engasgo/Corpo Estranho",
    "Febre",
  ],
  // Coluna 3 - Intoxicações e Mal-estar
  intoxicacoes: [
    "Intoxicação alimentar",
    "Intoxicação Exógena",
    "Intoxicação medicamentosa",
    "Intoxicação Subs Química",
    "Mal-Estar/Náuseas",
    "Mialgia",
    "PAB",
    "PAF",
    "PCR",
    "Queimaduras",
    "Queixas Ginecológicas/Obstétricas",
  ],
  // Coluna 4 - Outros
  outros: [
    "Queixas Odontológicas",
    "Queixas Oftalmológicas",
    "Queixas Urinárias",
    "Reação Alérgica",
    "Sangramentos",
    "Síncope",
    "Sudorese/Palidez Cutânea",
    "TCE",
    "Tontura",
    "Tosse",
    "Traumas",
    "Vômitos",
  ],
} as const;

// Lista plana de todas as queixas para facilitar busca
export const ALL_TRIAGE_COMPLAINTS = [
  ...TRIAGE_COMPLAINTS.gerais,
  ...TRIAGE_COMPLAINTS.doresRespiratorias,
  ...TRIAGE_COMPLAINTS.intoxicacoes,
  ...TRIAGE_COMPLAINTS.outros,
];

// Queue Entry schema
export const insertQueueEntrySchema = createInsertSchema(queueEntries).omit({
  id: true,
  queueNumber: true, // Gerado automaticamente no backend
  queueDate: true, // Gerado automaticamente no backend
  createdAt: true,
  updatedAt: true,
  arrivalTime: true,
  calledTime: true,
  startTime: true,
  endTime: true,
}).extend({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  status: z.enum(["aguardando_triagem", "aguardando", "chamado", "em_atendimento", "finalizado", "cancelado"]).default("aguardando_triagem"),
  priority: z.enum(["1", "2", "3", "4", "5"]).default("5"), // 1=emergência, 2=alta, 3=média, 4=baixa, 5=sem triagem
});

// Exam Request schema
export const insertExamRequestSchema = createInsertSchema(examRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
}).extend({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  requestingDoctorId: z.string().min(1, "Médico solicitante é obrigatório"),
  requestingDoctorName: z.string().min(1, "Nome do médico é obrigatório"),
  examType: z.enum(["imagem", "laboratorio"]),
  examCategory: z.string().min(1, "Categoria do exame é obrigatória"),
  examName: z.string().min(1, "Nome do exame é obrigatório"),
  examCode: z.string().min(1, "Código do exame é obrigatório"),
  status: z.enum(["pendente", "em_andamento", "concluido", "cancelado"]).default("pendente"),
  priority: z.enum(["urgente", "normal"]).default("normal"),
  requestDate: z.string().min(1, "Data da solicitação é obrigatória"),
  requestTime: z.string().min(1, "Hora da solicitação é obrigatória"),
});

// Types
export type Specialty = typeof specialties.$inferSelect;
export type InsertSpecialty = z.infer<typeof insertSpecialtySchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertLegacyAppointment = z.infer<typeof insertLegacyAppointmentSchema>;

export type MedicalHistory = typeof medicalHistory.$inferSelect;
export type InsertMedicalHistory = z.infer<typeof insertMedicalHistorySchema>;

export type Triage = typeof triage.$inferSelect;
export type InsertTriage = z.infer<typeof insertTriageSchema>;

export type QueueEntry = typeof queueEntries.$inferSelect;
export type InsertQueueEntry = z.infer<typeof insertQueueEntrySchema>;

export type ExamRequest = typeof examRequests.$inferSelect;
export type InsertExamRequest = z.infer<typeof insertExamRequestSchema>;

// Anamnesis Templates schema
export const insertAnamnesisTemplateSchema = createInsertSchema(anamnesisTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  specialtyName: z.string().min(1, "Especialidade é obrigatória"),
  name: z.string().min(1, "Nome do template é obrigatório"),
  sections: z.array(z.object({
    title: z.string(),
    fields: z.array(z.object({
      id: z.string(),
      label: z.string(),
      type: z.enum(["text", "textarea", "select", "checkbox", "radio"]),
      placeholder: z.string().optional(),
      required: z.boolean().default(false),
      options: z.array(z.string()).optional(),
    })),
  })),
  isDefault: z.boolean().default(false),
});

export type AnamnesisTemplate = typeof anamnesisTemplates.$inferSelect;
export type InsertAnamnesisTemplate = z.infer<typeof insertAnamnesisTemplateSchema>;

// Clinical Protocols schema
export const insertClinicalProtocolSchema = createInsertSchema(clinicalProtocols).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Título é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  condition: z.string().min(1, "Condição é obrigatória"),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })),
  version: z.string().default("1.0"),
  tags: z.array(z.string()).optional(),
});

export type ClinicalProtocol = typeof clinicalProtocols.$inferSelect;
export type InsertClinicalProtocol = z.infer<typeof insertClinicalProtocolSchema>;

// User types
export type InsertUserData = z.infer<typeof insertUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

// User management schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Email deve ser um endereço válido").min(1, "Email é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["admin", "staff", "viewer", "doctor", "triage", "farmacia", "laboratorio", "diretor", "radiologista"]).default("staff"),
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  name: z.string().min(1, "Nome é obrigatório"),
  // Campos específicos para profissionais de saúde (opcionais)
  crm: z.string().optional(),
  coren: z.string().optional(),
  crbm: z.string().optional(),
  medicalSpecialty: z.string().optional(),
  isActive: z.boolean().default(true),
}).superRefine((data, ctx) => {
  // Se o role é doctor, CRM é obrigatório
  if (data.role === "doctor" && !data.crm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CRM é obrigatório para usuários médicos",
      path: ["crm"],
    });
  }
  // Se o role é triage (enfermeiro), COREN é obrigatório
  if (data.role === "triage" && !data.coren) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "COREN é obrigatório para usuários enfermeiros",
      path: ["coren"],
    });
  }
  // Se o role é laboratorio (biomédico), CRBM é obrigatório
  if (data.role === "laboratorio" && !data.crbm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CRBM é obrigatório para usuários biomédicos",
      path: ["crbm"],
    });
  }
});

export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
  password: true,
  createdAt: true,
  updatedAt: true,
  profilePhotoUrl: true, // Profile photo has its own upload route
}).extend({
  email: z.string().email("Email deve ser um endereço válido").min(1, "Email é obrigatório"),
  role: z.enum(["admin", "staff", "viewer", "doctor", "triage", "farmacia", "laboratorio", "diretor", "radiologista"]),
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  name: z.string().min(1, "Nome é obrigatório"),
  // Campos específicos para profissionais de saúde (opcionais)
  crm: z.string().optional(),
  coren: z.string().optional(),
  crbm: z.string().optional(),
  medicalSpecialty: z.string().optional(),
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // Se o role é doctor, CRM é obrigatório
  if (data.role === "doctor" && !data.crm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CRM é obrigatório para usuários médicos",
      path: ["crm"],
    });
  }
  // Se o role é triage (enfermeiro), COREN é obrigatório
  if (data.role === "triage" && !data.coren) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "COREN é obrigatório para usuários enfermeiros",
      path: ["coren"],
    });
  }
  // Se o role é laboratorio (biomédico), CRBM é obrigatório
  if (data.role === "laboratorio" && !data.crbm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CRBM é obrigatório para usuários biomédicos",
      path: ["crbm"],
    });
  }
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(), // Opcional para admins alterando senha de outros
  newPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

// Scheduled Messages schemas
export const insertScheduledMessageSchema = createInsertSchema(scheduledMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  queueEntryId: z.string().min(1, "Queue entry é obrigatório"),
  patientId: z.string().min(1, "Paciente é obrigatório"),
  messageType: z.enum(["queue_confirmation", "receptionist_survey", "doctor_survey"]),
  scheduledFor: z.date(),
  status: z.enum(["pending", "sent", "error", "cancelled"] as const).default("pending"),
});

export type ScheduledMessage = typeof scheduledMessages.$inferSelect;
export type InsertScheduledMessage = z.infer<typeof insertScheduledMessageSchema>;

// Satisfaction Survey schemas
export const insertSatisfactionSurveySchema = createInsertSchema(satisfactionSurveys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  queueEntryId: z.string().min(1, "Queue entry é obrigatório"),
  patientId: z.string().min(1, "Paciente é obrigatório"),
  surveyType: z.enum(["receptionist", "doctor"]),
  rating: z.string().optional(),
  feedback: z.string().optional(),
  status: z.enum(["pending", "completed", "cancelled", "expired"] as const).default("pending"),
});

// Additional types for complex queries
export type AppointmentWithDetails = Appointment & {
  patient?: Patient;
  specialty?: Specialty;
};

export type MedicalHistoryWithDetails = MedicalHistory & {
  patient?: Patient;
  specialty?: Specialty;
  appointment?: Appointment;
  examRequests?: ExamRequest[];
};

export type SatisfactionSurvey = typeof satisfactionSurveys.$inferSelect;
export type InsertSatisfactionSurvey = z.infer<typeof insertSatisfactionSurveySchema>;

export type SatisfactionSurveyWithDetails = SatisfactionSurvey & {
  patient?: Patient;
  queueEntry?: QueueEntry;
};

// Audit Log table for tracking all critical actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  username: text("username"),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, ACCESS_DENIED
  entityType: text("entity_type").notNull(), // specialty, patient, appointment, user, etc.
  entityId: varchar("entity_id"),
  description: text("description").notNull(),
  metadata: jsonb("metadata"), // Additional data: old values, new values, etc.
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Audit log insert schema
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export type SelectAuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Password Reset Tokens table for secure password recovery
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Password reset schemas
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type SelectPasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Security Events table for monitoring suspicious activities
export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // FAILED_LOGIN, SUSPICIOUS_ACCESS, MULTIPLE_FAILED_ATTEMPTS, ADMIN_ACCESS_AFTER_HOURS, etc.
  severity: text("severity").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  username: text("username"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  description: text("description").notNull(),
  metadata: jsonb("metadata"), // Additional event details
  alertSent: boolean("alert_sent").default(false),
  resolved: boolean("resolved").default(false),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Login Attempts tracking table for rate limiting and attack detection
export const loginAttempts = pgTable("login_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username"),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  attemptTime: timestamp("attempt_time").defaultNow().notNull(),
  // Index on ip_address and attempt_time for efficient queries
});

// Security Events schemas
export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({
  id: true,
  createdAt: true,
});

export const insertLoginAttemptSchema = createInsertSchema(loginAttempts).omit({
  id: true,
  attemptTime: true,
});

export type SelectSecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;

export type SelectLoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;

// Security Lockouts table for persistent IP/user blocking
export const securityLockouts = pgTable("security_lockouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'IP' or 'USER'
  identifier: text("identifier").notNull(), // IP address or username
  lockedAt: timestamp("locked_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  reason: text("reason"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Security Lockouts schemas
export const insertSecurityLockoutSchema = createInsertSchema(securityLockouts).omit({
  id: true,
  createdAt: true,
});

export type SelectSecurityLockout = typeof securityLockouts.$inferSelect;
export type InsertSecurityLockout = z.infer<typeof insertSecurityLockoutSchema>;

// Prescription Templates table for quick medical notes
export const prescriptionTemplates = pgTable("prescription_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  templateName: text("template_name").notNull(),
  specialty: text("specialty"), // Especialidade médica associada
  diagnosis: text("diagnosis"), // Diagnóstico comum
  treatment: text("treatment"), // Tratamento padrão
  medications: text("medications"), // Medicamentos frequentes
  observations: text("observations"), // Observações padrão
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Prescription Templates schemas
export const insertPrescriptionTemplateSchema = createInsertSchema(prescriptionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  templateName: z.string().min(1, "Nome do template é obrigatório"),
  specialty: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  medications: z.string().optional(),
  observations: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type SelectPrescriptionTemplate = typeof prescriptionTemplates.$inferSelect;
export type InsertPrescriptionTemplate = z.infer<typeof insertPrescriptionTemplateSchema>;

// Medical Documents table for prescriptions, certificates and medical reports
export const medicalDocuments = pgTable("medical_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  doctorName: text("doctor_name").notNull(),
  doctorCrm: text("doctor_crm").notNull(), // CRM do médico
  documentType: text("document_type").notNull(), // 'prescription', 'certificate', 'medical_report', 'radiology_images'
  
  // Conteúdo do documento
  title: text("title").notNull(), // Título do documento
  content: text("content").notNull(), // Conteúdo completo em texto
  diagnosis: text("diagnosis"), // Diagnóstico (para receitas e relatórios)
  medications: text("medications"), // Medicamentos prescritos
  observations: text("observations"), // Observações adicionais
  
  // Para atestados médicos
  daysOff: text("days_off"), // Número de dias de afastamento
  cid: text("cid"), // Código CID (para atestados)
  
  // Assinatura Digital
  isSigned: boolean("is_signed").default(false).notNull(), // Se o documento está assinado
  signedBy: varchar("signed_by").references(() => users.id), // ID do médico que assinou
  signedAt: timestamp("signed_at"), // Data e hora da assinatura
  signatureHash: text("signature_hash"), // Hash do documento no momento da assinatura (para auditoria)
  signatureIp: text("signature_ip"), // IP de onde foi assinado
  
  // Metadados
  issueDate: text("issue_date").notNull(), // Data de emissão
  fileUrl: text("file_url"),
  
  sentViaWhatsApp: boolean("sent_via_whatsapp").default(false).notNull(),
  sentViaEmail: boolean("sent_via_email").default(false).notNull(),
  printed: boolean("printed").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Medical Documents schemas
export const insertMedicalDocumentSchema = createInsertSchema(medicalDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  doctorId: z.string().min(1, "Médico é obrigatório"),
  doctorName: z.string().min(1, "Nome do médico é obrigatório"),
  doctorCrm: z.string().min(1, "CRM do médico é obrigatório"),
  documentType: z.enum(["prescription", "certificate", "medical_report", "radiology_images"]),
  title: z.string().min(1, "Título é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  diagnosis: z.string().optional(),
  medications: z.string().optional(),
  observations: z.string().optional(),
  daysOff: z.string().optional(),
  cid: z.string().optional(),
  issueDate: z.string().min(1, "Data de emissão é obrigatória"),
  sentViaWhatsApp: z.boolean().default(false),
  sentViaEmail: z.boolean().default(false),
  printed: z.boolean().default(false),
  isSigned: z.boolean().default(false),
  signedBy: z.string().optional(),
  signedAt: z.date().optional(),
  signatureHash: z.string().optional(),
  signatureIp: z.string().optional(),
});

export type SelectMedicalDocument = typeof medicalDocuments.$inferSelect;
export type InsertMedicalDocument = z.infer<typeof insertMedicalDocumentSchema>;

// CID-10 Codes table - International Classification of Diseases
export const cidCodes = pgTable("cid_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // Ex: E11.9, A00.0
  description: text("description").notNull(), // Descrição completa
  shortDescription: text("short_description"), // Descrição abreviada
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  codeIdx: index("cid_code_idx").on(table.code),
  descriptionIdx: index("cid_description_idx").on(table.description),
}));

export const insertCidCodeSchema = createInsertSchema(cidCodes).omit({
  id: true,
  createdAt: true,
});

export type SelectCidCode = typeof cidCodes.$inferSelect;
export type InsertCidCode = z.infer<typeof insertCidCodeSchema>;

// =============================================
// MÓDULO DE ESTOQUE DE MEDICAMENTOS
// =============================================

// Catálogo de Medicamentos - base de medicamentos cadastrados
// Classificação por tarja/cor do medicamento
export const TARJA_CLASSIFICACAO = [
  "Azul",
  "Azul Escuro", 
  "Magenta",
  "Preta",
  "Verde",
  "Verde Escuro",
  "Vermelho",
  "Vermelho Escuro",
] as const;

export const medicationsCatalog = pgTable("medications_catalog", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Nome comercial
  genericName: text("generic_name"), // Nome genérico
  form: text("form").notNull(), // Forma farmacêutica (comprimido, solução, injetável, etc)
  concentration: text("concentration").notNull(), // Concentração (ex: 500mg, 10mg/ml)
  unit: text("unit").notNull(), // Unidade (comprimido, frasco, ampola, etc)
  code: text("code").unique(), // Código interno ou CATMAT
  barcode: text("barcode"), // Código de barras
  manufacturer: text("manufacturer"), // Fabricante
  therapeuticClass: text("therapeutic_class"), // Classe terapêutica
  tarjaClassificacao: text("tarja_classificacao"), // Classificação por tarja/cor (Azul, Preta, Verde, etc)
  controlledMedication: boolean("controlled_medication").default(false).notNull(), // Medicamento controlado
  requiresPrescription: boolean("requires_prescription").default(true).notNull(), // Requer receita
  minStock: text("min_stock").default("10"), // Quantidade mínima de estoque
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("med_name_idx").on(table.name),
  genericIdx: index("med_generic_idx").on(table.genericName),
  codeIdx: index("med_code_idx").on(table.code),
}));

// Lotes de Estoque - controle por lote
export const inventoryBatches = pgTable("inventory_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  medicationId: varchar("medication_id").references(() => medicationsCatalog.id).notNull(),
  batchNumber: text("batch_number").notNull(), // Número do lote
  quantity: text("quantity").notNull().default("0"), // Quantidade atual em estoque
  initialQuantity: text("initial_quantity").notNull(), // Quantidade inicial quando cadastrado
  expirationDate: text("expiration_date").notNull(), // Data de validade (YYYY-MM-DD)
  manufacturingDate: text("manufacturing_date"), // Data de fabricação
  purchaseDate: text("purchase_date"), // Data de compra/entrada
  purchasePrice: text("purchase_price"), // Preço de compra unitário
  supplier: text("supplier"), // Fornecedor
  storageLocation: text("storage_location"), // Local de armazenamento
  status: text("status").default("active").notNull(), // active, low_stock, expired, depleted
  notes: text("notes"), // Observações
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  medicationIdx: index("batch_medication_idx").on(table.medicationId),
  batchIdx: index("batch_number_idx").on(table.batchNumber),
  expirationIdx: index("batch_expiration_idx").on(table.expirationDate),
}));

// Movimentações de Estoque - histórico de entradas e saídas
export const inventoryMovements = pgTable("inventory_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").references(() => inventoryBatches.id).notNull(),
  medicationId: varchar("medication_id").references(() => medicationsCatalog.id).notNull(),
  movementType: text("movement_type").notNull(), // entrada, saida, ajuste, perda, vencido
  quantity: text("quantity").notNull(), // Quantidade movimentada (positivo ou negativo)
  previousQuantity: text("previous_quantity").notNull(), // Quantidade antes do movimento
  newQuantity: text("new_quantity").notNull(), // Quantidade após o movimento
  referenceType: text("reference_type"), // dispensation, adjustment, receipt, loss
  referenceId: varchar("reference_id"), // ID da referência (dispensação, etc)
  reason: text("reason"), // Motivo do movimento
  performedBy: varchar("performed_by").references(() => users.id).notNull(),
  performedByName: text("performed_by_name").notNull(),
  patientId: varchar("patient_id").references(() => patients.id), // Paciente que recebeu o medicamento
  patientName: text("patient_name"), // Nome do paciente
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  batchIdx: index("movement_batch_idx").on(table.batchId),
  typeIdx: index("movement_type_idx").on(table.movementType),
  dateIdx: index("movement_date_idx").on(table.createdAt),
}));

// Prescrições Estruturadas - pedidos de medicamentos
export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  medicalDocumentId: varchar("medical_document_id").references(() => medicalDocuments.id),
  medicalHistoryId: text("medical_history_id"), // UUID as text - references medical_history(id)
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  doctorName: text("doctor_name").notNull(),
  doctorCrm: text("doctor_crm"), // CRM do médico prescritor
  prescriptionDate: text("prescription_date").notNull(), // Data da prescrição
  status: text("status").default("pending").notNull(), // pending, partial, completed, cancelled, expired
  validUntil: text("valid_until"), // Validade da receita (ex: 30 dias para medicamentos controlados)
  notes: text("notes"), // Observações gerais
  priority: text("priority").default("normal"), // urgent, normal
  sourceType: text("source_type"), // hospitalization, observation, queue, outpatient - origem da prescrição
  sourceId: varchar("source_id"), // ID da internação, fila, etc
  sourceName: text("source_name"), // Nome amigável da origem (ex: "Internação - UTI", "Sala de Observação")
  dispensedBy: varchar("dispensed_by").references(() => users.id), // Quem dispensou
  dispensedByName: text("dispensed_by_name"),
  dispensedAt: timestamp("dispensed_at"), // Quando foi dispensado
  sentToList: boolean("sent_to_list").default(false).notNull(), // Enviado para lista de controle
  listReleasedAt: timestamp("list_released_at"), // Quando o atendente da farmácia liberou
  listReleasedBy: text("list_released_by"), // Nome de quem liberou
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  patientIdx: index("prescription_patient_idx").on(table.patientId),
  statusIdx: index("prescription_status_idx").on(table.status),
  dateIdx: index("prescription_date_idx").on(table.prescriptionDate),
}));

// Itens da Prescrição - medicamentos prescritos
export const prescriptionItems = pgTable("prescription_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prescriptionId: varchar("prescription_id").references(() => prescriptions.id).notNull(),
  medicationId: varchar("medication_id").references(() => medicationsCatalog.id),
  medicationName: text("medication_name").notNull(), // Nome do medicamento (pode ser livre)
  dosage: text("dosage").notNull(), // Dosagem (ex: "1 comprimido")
  frequency: text("frequency").notNull(), // Frequência (ex: "8 em 8 horas")
  duration: text("duration"), // Duração (ex: "7 dias")
  route: text("route"), // Via (oral, intravenosa, etc)
  quantityPrescribed: text("quantity_prescribed").notNull(), // Quantidade prescrita
  quantityDispensed: text("quantity_dispensed").default("0"), // Quantidade já dispensada
  instructions: text("instructions"), // Instruções especiais
  kitId: varchar("kit_id").references(() => pharmacyKits.id), // Kit de procedimento selecionado
  kitName: text("kit_name"), // Nome do kit (desnormalizado para exibição)
  status: text("status").default("pending"), // pending, partial, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  prescriptionIdx: index("item_prescription_idx").on(table.prescriptionId),
}));

// Eventos de Dispensação - registro de entrega de medicamentos
export const dispensingEvents = pgTable("dispensing_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prescriptionItemId: varchar("prescription_item_id").references(() => prescriptionItems.id).notNull(),
  batchId: varchar("batch_id").references(() => inventoryBatches.id).notNull(),
  quantity: text("quantity").notNull(), // Quantidade dispensada
  dispensedBy: varchar("dispensed_by").references(() => users.id).notNull(),
  dispensedByName: text("dispensed_by_name").notNull(),
  patientAcknowledged: boolean("patient_acknowledged").default(false), // Paciente confirmou recebimento
  acknowledgedAt: timestamp("acknowledged_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  prescriptionItemIdx: index("dispensing_prescription_item_idx").on(table.prescriptionItemId),
  batchIdx: index("dispensing_batch_idx").on(table.batchId),
}));

// Schemas de validação
export const insertMedicationsCatalogSchema = createInsertSchema(medicationsCatalog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Nome do medicamento é obrigatório"),
  form: z.string().min(1, "Forma farmacêutica é obrigatória"),
  concentration: z.string().min(1, "Concentração é obrigatória"),
  unit: z.string().min(1, "Unidade é obrigatória"),
});

export const insertInventoryBatchSchema = createInsertSchema(inventoryBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  medicationId: z.string().min(1, "Medicamento é obrigatório"),
  batchNumber: z.string().min(1, "Número do lote é obrigatório"),
  quantity: z.string().min(1, "Quantidade é obrigatória"),
  initialQuantity: z.string().min(1, "Quantidade inicial é obrigatória"),
  expirationDate: z.string().min(1, "Data de validade é obrigatória"),
});

export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({
  id: true,
  createdAt: true,
}).extend({
  batchId: z.string().min(1, "Lote é obrigatório"),
  medicationId: z.string().min(1, "Medicamento é obrigatório"),
  movementType: z.string().min(1, "Tipo de movimentação é obrigatório"),
  quantity: z.string().min(1, "Quantidade é obrigatória"),
  performedBy: z.string().min(1, "Usuário é obrigatório"),
  performedByName: z.string().min(1, "Nome do usuário é obrigatório"),
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  doctorId: z.string().min(1, "Médico é obrigatório"),
  doctorName: z.string().min(1, "Nome do médico é obrigatório"),
  prescriptionDate: z.string().min(1, "Data da prescrição é obrigatória"),
});

export const insertPrescriptionItemSchema = createInsertSchema(prescriptionItems).omit({
  id: true,
  createdAt: true,
}).extend({
  prescriptionId: z.string().min(1, "Prescrição é obrigatória"),
  medicationName: z.string().min(1, "Nome do medicamento é obrigatório"),
  dosage: z.string().min(1, "Dosagem é obrigatória"),
  frequency: z.string().min(1, "Frequência é obrigatória"),
  quantityPrescribed: z.string().min(1, "Quantidade é obrigatória"),
});

export const insertDispensingEventSchema = createInsertSchema(dispensingEvents).omit({
  id: true,
  createdAt: true,
}).extend({
  prescriptionItemId: z.string().min(1, "Item da prescrição é obrigatório"),
  batchId: z.string().min(1, "Lote é obrigatório"),
  quantity: z.string().min(1, "Quantidade é obrigatória"),
  dispensedBy: z.string().min(1, "Usuário é obrigatório"),
  dispensedByName: z.string().min(1, "Nome do usuário é obrigatório"),
});

// ========================================
// HOSPITALIZATION / INTERNAÇÃO MODULE
// ========================================

// Status de internação
export const HOSPITALIZATION_STATUS = {
  ACTIVE: 'ativo',
  OBSERVATION: 'observacao',
  DISCHARGED: 'alta',
  TRANSFERRED: 'transferido',
  DECEASED: 'obito',
  CANCELLED: 'cancelado'
} as const;

export type HospitalizationStatus = typeof HOSPITALIZATION_STATUS[keyof typeof HOSPITALIZATION_STATUS];

// Status de leito
export const BED_STATUS = {
  AVAILABLE: 'disponivel',
  OCCUPIED: 'ocupado',
  MAINTENANCE: 'manutencao',
  RESERVED: 'reservado',
  PRE_DISCHARGE: 'pre_alta',
  BLOCKED: 'bloqueado',
  RELEASING: 'em_liberacao'
} as const;

export type BedStatus = typeof BED_STATUS[keyof typeof BED_STATUS];

// Labels para status de leito (para UI)
export const BED_STATUS_LABELS: Record<string, string> = {
  'disponivel': 'Livre',
  'ocupado': 'Ocupado',
  'manutencao': 'Manutenção',
  'reservado': 'Reservado',
  'pre_alta': 'Pré-Alta',
  'bloqueado': 'Bloqueado',
  'em_liberacao': 'Em Liberação'
};

// Alas do hospital
export const hospitalWards = pgTable("hospital_wards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Ex: UTI, Enfermaria A, Pediatria
  description: text("description"),
  floor: text("floor"), // Andar
  specialization: text("specialization"), // Especialização (ex: Cardiologia, Neurologia)
  totalBeds: integer("total_beds").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Leitos hospitalares
export const hospitalBeds = pgTable("hospital_beds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wardId: varchar("ward_id").references(() => hospitalWards.id).notNull(),
  bedNumber: text("bed_number").notNull(), // Número do leito
  bedType: text("bed_type").default("standard"), // standard, icu, pediatric, isolation
  status: text("status").default("disponivel").notNull(), // disponivel, ocupado, manutencao, reservado
  currentHospitalizationId: varchar("current_hospitalization_id"), // Internação atual (se ocupado)
  equipment: text("equipment"), // Equipamentos especiais (ex: respirador, monitor)
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  wardIdx: index("bed_ward_idx").on(table.wardId),
  statusIdx: index("bed_status_idx").on(table.status),
}));

// Internações
export const hospitalizations = pgTable("hospitalizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  bedId: varchar("bed_id").references(() => hospitalBeds.id), // Optional for observations (null = no bed)
  queueEntryId: varchar("queue_entry_id").references(() => queueEntries.id), // Origem da fila (opcional)
  
  // Médico responsável
  attendingDoctorId: varchar("attending_doctor_id").references(() => users.id).notNull(),
  attendingDoctorName: text("attending_doctor_name").notNull(),
  
  // Dados da internação
  admissionDate: timestamp("admission_date").defaultNow().notNull(),
  estimatedDischargeDate: timestamp("estimated_discharge_date"),
  actualDischargeDate: timestamp("actual_discharge_date"),
  
  // Diagnóstico e motivo
  admissionDiagnosis: text("admission_diagnosis").notNull(), // Diagnóstico de admissão
  admissionReason: text("admission_reason").notNull(), // Motivo da internação
  cidCode: text("cid_code"), // CID-10
  
  // Condição do paciente
  severity: text("severity").default("media"), // baixa, media, alta, critica
  
  // Status
  status: text("status").default("ativo").notNull(), // ativo, alta, transferido, obito, cancelado
  
  // Alta hospitalar
  dischargeType: text("discharge_type"), // alta_medica, alta_pedido, transferencia, obito, fuga
  dischargeSummary: text("discharge_summary"),
  dischargedBy: varchar("discharged_by").references(() => users.id),
  dischargedByName: text("discharged_by_name"),
  
  // Observações
  observations: text("observations"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  patientIdx: index("hospitalization_patient_idx").on(table.patientId),
  bedIdx: index("hospitalization_bed_idx").on(table.bedId),
  statusIdx: index("hospitalization_status_idx").on(table.status),
  doctorIdx: index("hospitalization_doctor_idx").on(table.attendingDoctorId),
}));

// Evoluções de internação (registros diários)
export const hospitalizationEvolutions = pgTable("hospitalization_evolutions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hospitalizationId: varchar("hospitalization_id").references(() => hospitalizations.id).notNull(),
  
  // Profissional que registrou
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdByName: text("created_by_name").notNull(),
  createdByRole: text("created_by_role").notNull(), // doctor, nurse, etc
  createdByRegistration: text("created_by_registration"), // CRM para médico, COREN para enfermeiro
  
  // Dados da evolução
  evolutionDate: timestamp("evolution_date").defaultNow().notNull(),
  evolutionType: text("evolution_type").default("rotina"), // rotina, intercorrencia, alta, admissao
  
  // Conteúdo clínico
  subjectiveNotes: text("subjective_notes"), // Queixas do paciente
  objectiveNotes: text("objective_notes"), // Exame físico
  assessment: text("assessment"), // Avaliação
  plan: text("plan"), // Plano de tratamento
  
  // Sinais vitais (opcional)
  vitalSigns: jsonb("vital_signs"), // { pressao, temperatura, fc, fr, saturacao }
  
  // Prescrição médica do dia
  medications: text("medications"),
  procedures: text("procedures"),
  diet: text("diet"),
  
  observations: text("observations"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  hospitalizationIdx: index("evolution_hospitalization_idx").on(table.hospitalizationId),
  dateIdx: index("evolution_date_idx").on(table.evolutionDate),
}));

// Schemas de validação para Internação
export const insertHospitalWardSchema = createInsertSchema(hospitalWards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Nome da ala é obrigatório"),
});

export const insertHospitalBedSchema = createInsertSchema(hospitalBeds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  wardId: z.string().min(1, "Ala é obrigatória"),
  bedNumber: z.string().min(1, "Número do leito é obrigatório"),
});

export const insertHospitalizationSchema = createInsertSchema(hospitalizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  actualDischargeDate: true,
  dischargeType: true,
  dischargeSummary: true,
  dischargedBy: true,
  dischargedByName: true,
}).extend({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  bedId: z.string().min(1, "Leito é obrigatório"),
  attendingDoctorId: z.string().min(1, "Médico responsável é obrigatório"),
  attendingDoctorName: z.string().min(1, "Nome do médico é obrigatório"),
  admissionDiagnosis: z.string().min(1, "Diagnóstico de admissão é obrigatório"),
  admissionReason: z.string().min(1, "Motivo da internação é obrigatório"),
  severity: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
  estimatedDischargeDate: z.union([z.date(), z.string(), z.null()]).optional().nullable(),
});

export const insertHospitalizationEvolutionSchema = createInsertSchema(hospitalizationEvolutions).omit({
  id: true,
  createdAt: true,
}).extend({
  hospitalizationId: z.string().min(1, "Internação é obrigatória"),
  createdBy: z.string().min(1, "Usuário é obrigatório"),
  createdByName: z.string().min(1, "Nome do usuário é obrigatório"),
  createdByRole: z.string().min(1, "Cargo do usuário é obrigatório"),
  createdByRegistration: z.string().optional(), // CRM ou COREN
  evolutionType: z.enum(["rotina", "intercorrencia", "alta", "admissao"]).default("rotina"),
});

// Types para Internação
export type SelectHospitalWard = typeof hospitalWards.$inferSelect;
export type InsertHospitalWard = z.infer<typeof insertHospitalWardSchema>;

export type SelectHospitalBed = typeof hospitalBeds.$inferSelect;
export type InsertHospitalBed = z.infer<typeof insertHospitalBedSchema>;

export type SelectHospitalization = typeof hospitalizations.$inferSelect;
export type InsertHospitalization = z.infer<typeof insertHospitalizationSchema>;

export type SelectHospitalizationEvolution = typeof hospitalizationEvolutions.$inferSelect;
export type InsertHospitalizationEvolution = z.infer<typeof insertHospitalizationEvolutionSchema>;

// Types com detalhes
export type HospitalizationWithDetails = SelectHospitalization & {
  patient?: Patient;
  bed?: SelectHospitalBed & { ward?: SelectHospitalWard };
  evolutions?: SelectHospitalizationEvolution[];
};

export type HospitalBedWithDetails = SelectHospitalBed & {
  ward?: SelectHospitalWard;
  currentHospitalization?: SelectHospitalization & { patient?: Patient };
};

// Types
export type SelectMedicationsCatalog = typeof medicationsCatalog.$inferSelect;
export type InsertMedicationsCatalog = z.infer<typeof insertMedicationsCatalogSchema>;

export type SelectInventoryBatch = typeof inventoryBatches.$inferSelect;
export type InsertInventoryBatch = z.infer<typeof insertInventoryBatchSchema>;

export type SelectInventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;

export type SelectPrescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;

export type SelectPrescriptionItem = typeof prescriptionItems.$inferSelect;
export type InsertPrescriptionItem = z.infer<typeof insertPrescriptionItemSchema>;

export type SelectDispensingEvent = typeof dispensingEvents.$inferSelect;
export type InsertDispensingEvent = z.infer<typeof insertDispensingEventSchema>;

// =============================================
// MÓDULO DE MATERIAIS HOSPITALARES
// =============================================

// Catálogo de Materiais - base de materiais cadastrados
export const MATERIAL_GROUPS = [
  "ANTISSÉPTICOS / DESINFETANTES",
  "PRODUTOS QUÍMICOS",
  "OUTROS MATERIAIS",
  "RADIOLOGIA",
  "TUBOS, SONDAS E DRENOS",
  "FIOS, CABOS E CONEXÕES",
  "ACESSÓRIOS E INSTRUMENTAIS CIRÚRGICOS",
  "DISPOSITIVOS DE INFUSÃO",
  "CURATIVOS",
  "DISPOSITIVOS DE INCISÃO",
  "LÁTEX",
  "TÊXTEIS",
  "BOLSAS E COLETORES",
  "ÓRTESES / PRÓTESES",
  "MATERIAIS ESPECIAIS"
] as const;

export const materialsCatalog = pgTable("materials_catalog", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Nome/descrição do material
  shortName: text("short_name"), // Nome curto para exibição
  code: text("code").unique(), // Código interno
  barcode: text("barcode"), // Código de barras
  unit: text("unit").notNull(), // Unidade de medida (PCT, LITRO, CX., ROLO, GALÃO, etc)
  category: text("category"), // Categoria (EPI, Curativo, Descartável, Limpeza, etc)
  materialGroup: text("material_group"), // Grupo do material (ANTISSÉPTICOS, CURATIVOS, etc)
  minStock: text("min_stock").default("10"), // Quantidade mínima de estoque
  maxStock: text("max_stock"), // Quantidade máxima de estoque
  storageLocation: text("storage_location"), // Local de armazenamento padrão
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("mat_name_idx").on(table.name),
  codeIdx: index("mat_code_idx").on(table.code),
  categoryIdx: index("mat_category_idx").on(table.category),
  groupIdx: index("mat_group_idx").on(table.materialGroup),
}));

// Lotes de Materiais - controle por lote
export const materialsBatches = pgTable("materials_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  materialId: varchar("material_id").references(() => materialsCatalog.id).notNull(),
  batchNumber: text("batch_number"), // Número do lote (opcional para alguns materiais)
  quantity: text("quantity").notNull().default("0"), // Quantidade atual em estoque
  initialQuantity: text("initial_quantity").notNull(), // Quantidade inicial quando cadastrado
  expirationDate: text("expiration_date"), // Data de validade (YYYY-MM-DD) - opcional para alguns materiais
  manufacturingDate: text("manufacturing_date"), // Data de fabricação
  purchaseDate: text("purchase_date"), // Data de compra/entrada
  purchasePrice: text("purchase_price"), // Preço de compra unitário
  supplier: text("supplier"), // Fornecedor
  storageLocation: text("storage_location"), // Local de armazenamento
  status: text("status").default("active").notNull(), // active, low_stock, expired, depleted
  notes: text("notes"), // Observações
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  materialIdx: index("matbatch_material_idx").on(table.materialId),
  batchIdx: index("matbatch_number_idx").on(table.batchNumber),
  expirationIdx: index("matbatch_expiration_idx").on(table.expirationDate),
}));

// Movimentações de Materiais - histórico de entradas e saídas
export const materialsMovements = pgTable("materials_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").references(() => materialsBatches.id).notNull(),
  materialId: varchar("material_id").references(() => materialsCatalog.id).notNull(),
  movementType: text("movement_type").notNull(), // entrada, saida, ajuste, perda, vencido
  quantity: text("quantity").notNull(), // Quantidade movimentada
  previousQuantity: text("previous_quantity").notNull(), // Quantidade antes do movimento
  newQuantity: text("new_quantity").notNull(), // Quantidade após o movimento
  referenceType: text("reference_type"), // ajuste, recebimento, consumo, perda
  referenceId: varchar("reference_id"), // ID da referência
  reason: text("reason"), // Motivo do movimento
  performedBy: varchar("performed_by").references(() => users.id).notNull(),
  performedByName: text("performed_by_name").notNull(),
  destinationSector: text("destination_sector"), // Setor de destino (para saídas)
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  batchIdx: index("matmov_batch_idx").on(table.batchId),
  typeIdx: index("matmov_type_idx").on(table.movementType),
  dateIdx: index("matmov_date_idx").on(table.createdAt),
}));

// Schemas de validação para Materiais
export const insertMaterialsCatalogSchema = createInsertSchema(materialsCatalog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Nome do material é obrigatório"),
  unit: z.string().min(1, "Unidade é obrigatória"),
});

export const insertMaterialsBatchSchema = createInsertSchema(materialsBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  materialId: z.string().min(1, "Material é obrigatório"),
  quantity: z.string().min(1, "Quantidade é obrigatória"),
  initialQuantity: z.string().min(1, "Quantidade inicial é obrigatória"),
});

export const insertMaterialsMovementSchema = createInsertSchema(materialsMovements).omit({
  id: true,
  createdAt: true,
}).extend({
  batchId: z.string().min(1, "Lote é obrigatório"),
  materialId: z.string().min(1, "Material é obrigatório"),
  movementType: z.string().min(1, "Tipo de movimentação é obrigatório"),
  quantity: z.string().min(1, "Quantidade é obrigatória"),
  performedBy: z.string().min(1, "Usuário é obrigatório"),
  performedByName: z.string().min(1, "Nome do usuário é obrigatório"),
});

// Types para Materiais
export type SelectMaterialsCatalog = typeof materialsCatalog.$inferSelect;
export type InsertMaterialsCatalog = z.infer<typeof insertMaterialsCatalogSchema>;

export type SelectMaterialsBatch = typeof materialsBatches.$inferSelect;
export type InsertMaterialsBatch = z.infer<typeof insertMaterialsBatchSchema>;

export type SelectMaterialsMovement = typeof materialsMovements.$inferSelect;
export type InsertMaterialsMovement = z.infer<typeof insertMaterialsMovementSchema>;

// Types com detalhes para Materiais
export type MaterialWithStock = SelectMaterialsCatalog & {
  totalStock: number;
  batches?: SelectMaterialsBatch[];
};

export type MaterialsBatchWithDetails = SelectMaterialsBatch & {
  material?: SelectMaterialsCatalog;
};

// ============================================================================
// KITS DE MATERIAIS - Conjuntos pré-definidos de materiais para procedimentos
// ============================================================================

// Associação de Materiais a Medicamentos (para dispensação automática)
export const medicationMaterialRequirements = pgTable("medication_material_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  medicationId: varchar("medication_id").references(() => medicationsCatalog.id).notNull(),
  materialId: varchar("material_id").references(() => materialsCatalog.id).notNull(),
  quantity: text("quantity").notNull(), // Quantidade do material por unidade de medicamento
  notes: text("notes"), // Observações (ex: "para injeção IM", "descartável")
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  medicationIdx: index("medmat_medication_idx").on(table.medicationId),
  materialIdx: index("medmat_material_idx").on(table.materialId),
}));

export const insertMedicationMaterialRequirementSchema = createInsertSchema(medicationMaterialRequirements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  medicationId: z.string().min(1, "Medicamento é obrigatório"),
  materialId: z.string().min(1, "Material é obrigatório"),
  quantity: z.string().min(1, "Quantidade é obrigatória"),
});

export type SelectMedicationMaterialRequirement = typeof medicationMaterialRequirements.$inferSelect;
export type InsertMedicationMaterialRequirement = z.infer<typeof insertMedicationMaterialRequirementSchema>;

export type MedicationMaterialRequirementWithDetails = SelectMedicationMaterialRequirement & {
  medication?: SelectMedicationsCatalog;
  material?: SelectMaterialsCatalog;
};

// Tabela principal de Kits
export const pharmacyKits = pgTable("pharmacy_kits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Nome do kit (ex: Kit Curativo, Kit Punção Venosa)
  code: text("code"), // Código interno do kit
  description: text("description"), // Descrição do kit
  category: text("category"), // Categoria (Procedimentos, Emergência, etc.)
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("kit_name_idx").on(table.name),
  categoryIdx: index("kit_category_idx").on(table.category),
}));

// Itens de cada Kit (materiais e quantidades)
export const pharmacyKitItems = pgTable("pharmacy_kit_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kitId: varchar("kit_id").references(() => pharmacyKits.id).notNull(),
  materialId: varchar("material_id").references(() => materialsCatalog.id).notNull(),
  quantity: text("quantity").notNull(), // Quantidade do material no kit
  notes: text("notes"), // Observações específicas do item
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  kitIdx: index("kititem_kit_idx").on(table.kitId),
  materialIdx: index("kititem_material_idx").on(table.materialId),
}));

// Dispensações de Kits - histórico de quando kits foram dispensados
export const pharmacyKitDispensations = pgTable("pharmacy_kit_dispensations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kitId: varchar("kit_id").references(() => pharmacyKits.id).notNull(),
  patientId: varchar("patient_id").references(() => patients.id), // Paciente (opcional)
  patientName: text("patient_name"), // Nome do paciente (para referência rápida)
  destinationSector: text("destination_sector").notNull(), // Setor de destino (UTI, Enfermaria, etc.)
  dispensedBy: varchar("dispensed_by").references(() => users.id).notNull(),
  dispensedByName: text("dispensed_by_name").notNull(),
  quantity: text("quantity").default("1").notNull(), // Quantidade de kits dispensados
  status: text("status").default("completed").notNull(), // completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  kitIdx: index("kitdisp_kit_idx").on(table.kitId),
  sectorIdx: index("kitdisp_sector_idx").on(table.destinationSector),
  dateIdx: index("kitdisp_date_idx").on(table.createdAt),
}));

// Schemas de validação para Kits
export const insertPharmacyKitSchema = createInsertSchema(pharmacyKits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Nome do kit é obrigatório"),
});

export const insertPharmacyKitItemSchema = createInsertSchema(pharmacyKitItems).omit({
  id: true,
  createdAt: true,
}).extend({
  kitId: z.string().min(1, "Kit é obrigatório"),
  materialId: z.string().min(1, "Material é obrigatório"),
  quantity: z.string().min(1, "Quantidade é obrigatória"),
});

export const insertPharmacyKitDispensationSchema = createInsertSchema(pharmacyKitDispensations).omit({
  id: true,
  createdAt: true,
}).extend({
  kitId: z.string().min(1, "Kit é obrigatório"),
  destinationSector: z.string().min(1, "Setor de destino é obrigatório"),
  dispensedBy: z.string().min(1, "Dispensador é obrigatório"),
  dispensedByName: z.string().min(1, "Nome do dispensador é obrigatório"),
});

// Types para Kits
export type SelectPharmacyKit = typeof pharmacyKits.$inferSelect;
export type InsertPharmacyKit = z.infer<typeof insertPharmacyKitSchema>;

export type SelectPharmacyKitItem = typeof pharmacyKitItems.$inferSelect;
export type InsertPharmacyKitItem = z.infer<typeof insertPharmacyKitItemSchema>;

export type SelectPharmacyKitDispensation = typeof pharmacyKitDispensations.$inferSelect;
export type InsertPharmacyKitDispensation = z.infer<typeof insertPharmacyKitDispensationSchema>;

// Types com detalhes para Kits
export type PharmacyKitWithItems = SelectPharmacyKit & {
  items: (SelectPharmacyKitItem & { material?: SelectMaterialsCatalog })[];
  totalMaterials: number;
  hasStock: boolean; // Se há estoque suficiente para montar o kit
};

export type PharmacyKitDispensationWithDetails = SelectPharmacyKitDispensation & {
  kit?: SelectPharmacyKit;
  patient?: Patient;
};

// =============================================
// ASSOCIAÇÕES MEDICAMENTO-KIT
// =============================================

// Tabela de associação entre medicamentos e kits
// Permite configurar quais kits estão disponíveis para cada medicamento
export const medicationKitAssociations = pgTable("medication_kit_associations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  medicationId: varchar("medication_id").references(() => medicationsCatalog.id).notNull(),
  kitId: varchar("kit_id").references(() => pharmacyKits.id).notNull(),
  isDefault: boolean("is_default").default(false), // Kit padrão para o medicamento
  notes: text("notes"), // Observações sobre quando usar este kit
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  medicationIdx: index("medkit_medication_idx").on(table.medicationId),
  kitIdx: index("medkit_kit_idx").on(table.kitId),
  uniqueAssoc: index("medkit_unique_idx").on(table.medicationId, table.kitId),
}));

// Schema de validação
export const insertMedicationKitAssociationSchema = createInsertSchema(medicationKitAssociations).omit({
  id: true,
  createdAt: true,
}).extend({
  medicationId: z.string().min(1, "Medicamento é obrigatório"),
  kitId: z.string().min(1, "Kit é obrigatório"),
});

// Types
export type SelectMedicationKitAssociation = typeof medicationKitAssociations.$inferSelect;
export type InsertMedicationKitAssociation = z.infer<typeof insertMedicationKitAssociationSchema>;

// Type com detalhes
export type MedicationKitAssociationWithDetails = SelectMedicationKitAssociation & {
  medication?: SelectMedicationsCatalog;
  kit?: SelectPharmacyKit;
};

// =============================================
// SOLICITAÇÕES DE PROCEDIMENTOS (SISTEMA FLEXÍVEL)
// =============================================

// Status das solicitações de procedimento
export const PROCEDURE_REQUEST_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Origens da solicitação de procedimento (exclusivo para internação, observação, sala vermelha)
export const PROCEDURE_SOURCE_TYPES = {
  HOSPITALIZATION: 'hospitalization',
  OBSERVATION: 'observation', 
  RED_ROOM: 'red_room',
} as const;

// Tipo de item (medicação ou material)
export const PROCEDURE_ITEM_TYPES = {
  MEDICATION: 'medication',
  MATERIAL: 'material',
} as const;

// Modo de solicitação (kit pré-configurado ou personalizado)
export const PROCEDURE_REQUEST_MODES = {
  KIT: 'kit',
  CUSTOM: 'custom',
} as const;

// Canal de atendimento (farmácia, materiais ou ambos)
export const PROCEDURE_FULFILLMENT_CHANNELS = {
  PHARMACY: 'pharmacy',
  MATERIALS: 'materials',
  MIXED: 'mixed',
} as const;

// Kits de Procedimento - kits pré-configurados que podem ter medicações, materiais ou ambos
export const procedureKits = pgTable("procedure_kits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Nome do kit (ex: Kit Sutura, Kit Nebulização)
  code: text("code"), // Código interno
  description: text("description"), // Descrição do procedimento
  clinicalContext: text("clinical_context"), // Contexto clínico (ex: "Sutura", "Curativo de Queimadura")
  category: text("category"), // Categoria (Emergência, Procedimentos, etc.)
  defaultPriority: text("default_priority").default("normal"), // Prioridade padrão
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("prockit_name_idx").on(table.name),
  categoryIdx: index("prockit_category_idx").on(table.category),
  clinicalIdx: index("prockit_clinical_idx").on(table.clinicalContext),
}));

// Itens dos Kits de Procedimento - podem ser medicações ou materiais
export const procedureKitItems = pgTable("procedure_kit_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kitId: varchar("kit_id").references(() => procedureKits.id).notNull(),
  itemType: text("item_type").notNull(), // 'medication' ou 'material'
  medicationId: varchar("medication_id").references(() => medicationsCatalog.id), // Se for medicação
  materialId: varchar("material_id").references(() => materialsCatalog.id), // Se for material
  defaultQuantity: text("default_quantity").notNull().default("1"), // Quantidade padrão
  unit: text("unit"), // Unidade (comprimido, frasco, unidade, etc.)
  instructions: text("instructions"), // Instruções específicas para o item
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  kitIdx: index("prockititem_kit_idx").on(table.kitId),
  medicationIdx: index("prockititem_medication_idx").on(table.medicationId),
  materialIdx: index("prockititem_material_idx").on(table.materialId),
}));

// Tabela de solicitações de procedimentos - flexível para kit ou personalizado
export const procedureRequests = pgTable("procedure_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Modo da solicitação
  requestMode: text("request_mode").default("custom").notNull(), // 'kit' ou 'custom'
  procedureKitId: varchar("procedure_kit_id").references(() => procedureKits.id), // Se for modo kit
  
  // Paciente
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  patientName: text("patient_name").notNull(),
  
  // Médico solicitante
  requestedBy: varchar("requested_by").references(() => users.id).notNull(),
  requestedByName: text("requested_by_name").notNull(),
  
  // Origem da solicitação (apenas internação, observação, sala vermelha)
  sourceType: text("source_type").notNull(), // hospitalization, observation, red_room
  sourceId: varchar("source_id"), // ID da internação, observação, etc.
  sourceName: text("source_name"),
  
  // Canal de atendimento (determinado automaticamente pelos itens)
  fulfillmentChannel: text("fulfillment_channel").default("pharmacy").notNull(), // pharmacy, materials, mixed
  
  // Urgência e observações
  priority: text("priority").default("normal").notNull(), // low, normal, high, urgent
  notes: text("notes"),
  
  // Status geral da solicitação
  status: text("status").default("pending").notNull(), // pending, in_progress, completed, cancelled
  
  // Processamento
  processedBy: varchar("processed_by").references(() => users.id),
  processedByName: text("processed_by_name"),
  processedAt: timestamp("processed_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  kitIdx: index("procreq_kit_idx").on(table.procedureKitId),
  patientIdx: index("procreq_patient_idx").on(table.patientId),
  statusIdx: index("procreq_status_idx").on(table.status),
  channelIdx: index("procreq_channel_idx").on(table.fulfillmentChannel),
  dateIdx: index("procreq_date_idx").on(table.createdAt),
}));

// Itens individuais de cada solicitação de procedimento
export const procedureRequestItems = pgTable("procedure_request_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").references(() => procedureRequests.id).notNull(),
  
  // Tipo e referência do item
  itemType: text("item_type").notNull(), // 'medication' ou 'material'
  medicationId: varchar("medication_id").references(() => medicationsCatalog.id),
  materialId: varchar("material_id").references(() => materialsCatalog.id),
  kitItemId: varchar("kit_item_id").references(() => procedureKitItems.id), // Se veio de um kit
  
  // Detalhes do item (copiados no momento da solicitação)
  itemName: text("item_name").notNull(), // Nome do medicamento ou material
  quantity: text("quantity").notNull().default("1"),
  unit: text("unit"),
  instructions: text("instructions"),
  
  // Status individual do item (cada item pode ser processado separadamente)
  status: text("status").default("pending").notNull(), // pending, completed, cancelled
  processedBy: varchar("processed_by").references(() => users.id),
  processedByName: text("processed_by_name"),
  processedAt: timestamp("processed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  requestIdx: index("procreqitem_request_idx").on(table.requestId),
  medicationIdx: index("procreqitem_medication_idx").on(table.medicationId),
  materialIdx: index("procreqitem_material_idx").on(table.materialId),
  statusIdx: index("procreqitem_status_idx").on(table.status),
}));

// Schemas de validação
export const insertProcedureKitSchema = createInsertSchema(procedureKits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProcedureKitItemSchema = createInsertSchema(procedureKitItems).omit({
  id: true,
  createdAt: true,
});

export const insertProcedureRequestSchema = createInsertSchema(procedureRequests).omit({
  id: true,
  processedBy: true,
  processedByName: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  patientName: z.string().min(1, "Nome do paciente é obrigatório"),
  requestedBy: z.string().min(1, "Médico solicitante é obrigatório"),
  requestedByName: z.string().min(1, "Nome do médico é obrigatório"),
  sourceType: z.enum(['hospitalization', 'observation', 'red_room']),
});

export const insertProcedureRequestItemSchema = createInsertSchema(procedureRequestItems).omit({
  id: true,
  processedBy: true,
  processedByName: true,
  processedAt: true,
  createdAt: true,
}).extend({
  requestId: z.string().min(1, "ID da solicitação é obrigatório"),
  itemType: z.enum(['medication', 'material']),
  itemName: z.string().min(1, "Nome do item é obrigatório"),
});

// Types
export type SelectProcedureKit = typeof procedureKits.$inferSelect;
export type InsertProcedureKit = z.infer<typeof insertProcedureKitSchema>;

export type SelectProcedureKitItem = typeof procedureKitItems.$inferSelect;
export type InsertProcedureKitItem = z.infer<typeof insertProcedureKitItemSchema>;

export type SelectProcedureRequest = typeof procedureRequests.$inferSelect;
export type InsertProcedureRequest = z.infer<typeof insertProcedureRequestSchema>;

export type SelectProcedureRequestItem = typeof procedureRequestItems.$inferSelect;
export type InsertProcedureRequestItem = z.infer<typeof insertProcedureRequestItemSchema>;

// Types com detalhes
export type ProcedureKitWithItems = SelectProcedureKit & {
  items?: (SelectProcedureKitItem & {
    medication?: SelectMedicationsCatalog;
    material?: SelectMaterialsCatalog;
  })[];
};

export type ProcedureRequestItemWithDetails = SelectProcedureRequestItem & {
  medication?: SelectMedicationsCatalog;
  material?: SelectMaterialsCatalog;
};

export type ProcedureRequestWithDetails = SelectProcedureRequest & {
  kit?: SelectProcedureKit;
  patient?: Patient;
  items?: ProcedureRequestItemWithDetails[];
};
