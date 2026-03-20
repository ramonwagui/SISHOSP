import { type Specialty, type InsertSpecialty, type Patient, type InsertPatient, type Appointment, type InsertAppointment, type MedicalHistory, type InsertMedicalHistory, type Triage, type InsertTriage, type QueueEntry, type InsertQueueEntry, type User, type InsertUser, type AppointmentWithDetails, type MedicalHistoryWithDetails, type SatisfactionSurvey, type InsertSatisfactionSurvey, type ScheduledMessage, type InsertScheduledMessage, type SatisfactionSurveyWithDetails, type InsertAuditLog, type SelectAuditLog, type SelectPasswordResetToken, type InsertPasswordResetToken, type SelectSecurityEvent, type InsertSecurityEvent, type SelectLoginAttempt, type InsertLoginAttempt, type SelectSecurityLockout, type InsertSecurityLockout, type SelectPrescriptionTemplate, type InsertPrescriptionTemplate, type SelectMedicalDocument, type InsertMedicalDocument, type AnamnesisTemplate, type InsertAnamnesisTemplate, type ClinicalProtocol, type InsertClinicalProtocol, type ExamRequest, type InsertExamRequest, type SelectMedicationsCatalog, type InsertMedicationsCatalog, type SelectInventoryBatch, type InsertInventoryBatch, type SelectInventoryMovement, type InsertInventoryMovement, type SelectPrescription, type InsertPrescription, type SelectPrescriptionItem, type InsertPrescriptionItem, type SelectDispensingEvent, type InsertDispensingEvent, type SelectHospitalWard, type InsertHospitalWard, type SelectHospitalBed, type InsertHospitalBed, type SelectHospitalization, type InsertHospitalization, type SelectHospitalizationEvolution, type InsertHospitalizationEvolution, type SelectMaterialsCatalog, type InsertMaterialsCatalog, type SelectMaterialsBatch, type InsertMaterialsBatch, type SelectMaterialsMovement, type InsertMaterialsMovement, type SelectPharmacyKit, type InsertPharmacyKit, type SelectPharmacyKitItem, type InsertPharmacyKitItem, type SelectPharmacyKitDispensation, type InsertPharmacyKitDispensation, type PharmacyKitWithItems, type SelectMedicationMaterialRequirement, type InsertMedicationMaterialRequirement, type MedicationMaterialRequirementWithDetails, type SelectMedicationKitAssociation, type InsertMedicationKitAssociation, type MedicationKitAssociationWithDetails, type SelectProcedureRequest, type InsertProcedureRequest, type ProcedureRequestWithDetails, type SelectProcedureKit, type InsertProcedureKit, type SelectProcedureKitItem, type InsertProcedureKitItem, type SelectProcedureRequestItem, type InsertProcedureRequestItem, type ProcedureKitWithItems, type ProcedureRequestItemWithDetails } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, or, ilike, sql, desc, and, isNotNull } from "drizzle-orm";
import { specialties, patients, appointments, medicalHistory, triage, queueEntries, users, satisfactionSurveys, scheduledMessages, auditLogs, passwordResetTokens, securityEvents, loginAttempts, securityLockouts, prescriptionTemplates, medicalDocuments, anamnesisTemplates, clinicalProtocols, examRequests, cidCodes, SATISFACTION_SURVEY_STATUS, SCHEDULED_MESSAGE_STATUS, EXAM_REQUEST_STATUS, medicationsCatalog, inventoryBatches, inventoryMovements, prescriptions, prescriptionItems, dispensingEvents, hospitalWards, hospitalBeds, hospitalizations, hospitalizationEvolutions, materialsCatalog, materialsBatches, materialsMovements, pharmacyKits, pharmacyKitItems, pharmacyKitDispensations, medicationMaterialRequirements, medicationKitAssociations, procedureRequests, procedureKits, procedureKitItems, procedureRequestItems } from "@shared/schema";
import { SurveyTokenService } from "./surveyTokenService";

export interface IStorage {
  // Specialties
  getSpecialties(): Promise<Specialty[]>;
  getSpecialty(id: string): Promise<Specialty | undefined>;
  createSpecialty(specialty: InsertSpecialty): Promise<Specialty>;
  updateSpecialty(id: string, specialty: Partial<InsertSpecialty>): Promise<Specialty | undefined>;
  deleteSpecialty(id: string): Promise<boolean>;

  // Patients
  getPatients(): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByCpf(cpf: string): Promise<Patient | undefined>;
  searchPatients(query: string): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: string): Promise<boolean>;

  // Appointments
  getAppointments(): Promise<AppointmentWithDetails[]>;
  getAppointment(id: string): Promise<AppointmentWithDetails | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  createLegacyAppointment(appointment: any): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;

  // Medical History
  getMedicalHistory(): Promise<MedicalHistoryWithDetails[]>;
  getMedicalHistoryByPatient(patientId: string): Promise<MedicalHistoryWithDetails[]>;
  getMedicalHistoryBySusCard(susCard: string): Promise<MedicalHistoryWithDetails[]>;
  getMedicalHistoryByHospitalization(hospitalizationId: string): Promise<MedicalHistoryWithDetails[]>;
  getMedicalRecord(id: string): Promise<MedicalHistoryWithDetails | undefined>;
  createMedicalRecord(record: InsertMedicalHistory): Promise<MedicalHistory>;
  updateMedicalRecord(id: string, record: Partial<InsertMedicalHistory>): Promise<MedicalHistory | undefined>;
  deleteMedicalRecord(id: string): Promise<boolean>;
  getMedicalHistoryAttendanceMetrics(period: string): Promise<{
    totalConsultations: number;
    avgDuration: number | null; // Duração média em minutos
    byDoctor: Array<{
      doctorName: string;
      count: number;
      avgDuration: number | null;
      totalTime: number; // Tempo total em minutos
    }>;
    bySpecialty: Array<{
      specialtyName: string;
      count: number;
      avgDuration: number | null;
      totalTime: number;
    }>;
  }>;
  
  // Triage
  getTriages(): Promise<Triage[]>;
  getTriagesByPatient(patientId: string): Promise<Triage[]>;
  getTriage(id: string): Promise<Triage | undefined>;
  createTriage(triage: InsertTriage): Promise<Triage>;
  updateTriage(id: string, triage: Partial<InsertTriage>): Promise<Triage | undefined>;
  deleteTriage(id: string): Promise<boolean>;
  
  // Queue Entries
  getQueueEntries(): Promise<QueueEntry[]>;
  getActiveQueueEntries(): Promise<QueueEntry[]>; // Apenas aguardando, chamado, em_atendimento
  getQueueEntry(id: string): Promise<QueueEntry | undefined>;
  getNextQueueNumber(): Promise<string>; // Gera próximo número sequencial
  createQueueEntry(entry: InsertQueueEntry): Promise<QueueEntry>;
  updateQueueEntry(id: string, entry: Partial<InsertQueueEntry>): Promise<QueueEntry | undefined>;
  callNextPatient(doctorId: string): Promise<QueueEntry | undefined>; // Chama próximo da fila
  startAttendance(id: string, doctorId: string): Promise<QueueEntry | undefined>; // Inicia atendimento
  finishAttendance(id: string): Promise<QueueEntry | undefined>; // Finaliza atendimento
  cancelQueueEntry(id: string, reason: string): Promise<QueueEntry | undefined>; // Cancela entrada
  getQueueMetrics(period: string): Promise<{
    totalPatients: number;
    avgWaitTime: number | null; // Tempo médio de espera em minutos
    avgAttendanceTime: number | null; // Tempo médio de atendimento em minutos
    avgTotalTime: number | null; // Tempo total médio (chegada até finalização)
    byPriority: Array<{
      priority: string;
      count: number;
      avgWaitTime: number | null;
      avgAttendanceTime: number | null;
    }>;
    currentlyWaiting: number; // Pacientes aguardando agora
    currentlyInAttendance: number; // Pacientes em atendimento agora
  }>;
  
  // Reports
  getAppointmentReports(startDate: string, endDate: string, specialtyId?: string, zoneType?: string): Promise<{
    total: number;
    completed: number;
    cancelled: number;
    rescheduled: number;
    urban: number;
    rural: number;
    specialtyBreakdown: Array<{ name: string; count: number }>;
    zoneBreakdown: Array<{ name: string; count: number; color: string }>;
    dailyData: Array<{ date: string; count: number }>;
  }>;

  getAttendanceReports(startDate: string, endDate: string, specialtyId?: string, doctorName?: string, zoneType?: string): Promise<{
    total: number;
    urban: number;
    rural: number;
    activeDoctors: number;
    specialtyBreakdown: Array<{ name: string; count: number }>;
    doctorBreakdown: Array<{ name: string; count: number }>;
    zoneBreakdown: Array<{ name: string; count: number; color: string }>;
    locationBreakdown: Array<{ name: string; count: number; color: string }>;
    dailyData: Array<{ date: string; count: number }>;
  }>;

  getDistinctDoctorsFromHistory(): Promise<Array<{ name: string }>>;

  // User operations for local authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  changeUserPassword(id: string, newHashedPassword: string): Promise<boolean>;

  // Satisfaction Surveys
  getSatisfactionSurveys(): Promise<SatisfactionSurveyWithDetails[]>;
  getSatisfactionSurvey(id: string): Promise<SatisfactionSurveyWithDetails | undefined>;
  getSatisfactionSurveysByPatient(patientId: string): Promise<SatisfactionSurveyWithDetails[]>;
  getSatisfactionSurveysByQueueEntry(queueEntryId: string): Promise<SatisfactionSurveyWithDetails[]>;
  createSatisfactionSurvey(survey: InsertSatisfactionSurvey): Promise<SatisfactionSurvey>;
  updateSatisfactionSurvey(id: string, survey: Partial<InsertSatisfactionSurvey>): Promise<SatisfactionSurvey | undefined>;
  deleteSatisfactionSurvey(id: string): Promise<boolean>;
  
  // Scheduled Messages for WhatsApp
  getScheduledMessages(): Promise<ScheduledMessage[]>;
  getScheduledMessage(id: string): Promise<ScheduledMessage | undefined>;
  getScheduledMessagesByStatus(status: string): Promise<ScheduledMessage[]>;
  getPendingScheduledMessages(): Promise<ScheduledMessage[]>;
  createScheduledMessage(message: InsertScheduledMessage): Promise<ScheduledMessage>;
  updateScheduledMessage(id: string, message: Partial<InsertScheduledMessage>): Promise<ScheduledMessage | undefined>;
  deleteScheduledMessage(id: string): Promise<boolean>;
  
  // Prescription Templates
  getPrescriptionTemplates(doctorId?: string): Promise<SelectPrescriptionTemplate[]>;
  getPrescriptionTemplate(id: string): Promise<SelectPrescriptionTemplate | undefined>;
  createPrescriptionTemplate(template: InsertPrescriptionTemplate): Promise<SelectPrescriptionTemplate>;
  updatePrescriptionTemplate(id: string, template: Partial<InsertPrescriptionTemplate>): Promise<SelectPrescriptionTemplate | undefined>;
  deletePrescriptionTemplate(id: string): Promise<boolean>;
  
  // Medical Documents (Receitas, Atestados, Prescrições)
  getMedicalDocuments(doctorId?: string, patientId?: string): Promise<SelectMedicalDocument[]>;
  getMedicalDocument(id: string): Promise<SelectMedicalDocument | undefined>;
  createMedicalDocument(document: InsertMedicalDocument): Promise<SelectMedicalDocument>;
  updateMedicalDocument(id: string, document: Partial<InsertMedicalDocument>): Promise<SelectMedicalDocument | undefined>;
  deleteMedicalDocument(id: string): Promise<boolean>;
  
  // Anamnesis Templates
  getAnamnesisTemplates(specialtyName?: string): Promise<AnamnesisTemplate[]>;
  getAnamnesisTemplate(id: string): Promise<AnamnesisTemplate | undefined>;
  createAnamnesisTemplate(template: InsertAnamnesisTemplate): Promise<AnamnesisTemplate>;
  updateAnamnesisTemplate(id: string, template: Partial<InsertAnamnesisTemplate>): Promise<AnamnesisTemplate | undefined>;
  deleteAnamnesisTemplate(id: string): Promise<boolean>;
  
  // Clinical Protocols
  getClinicalProtocols(filters?: { category?: string; search?: string }): Promise<ClinicalProtocol[]>;
  getClinicalProtocol(id: string): Promise<ClinicalProtocol | undefined>;
  createClinicalProtocol(protocol: InsertClinicalProtocol): Promise<ClinicalProtocol>;
  updateClinicalProtocol(id: string, protocol: Partial<InsertClinicalProtocol>): Promise<ClinicalProtocol | undefined>;
  deleteClinicalProtocol(id: string): Promise<boolean>;
  
  // Exam Requests (Radiologia/Laboratório)
  getExamRequests(filters?: { status?: string; examType?: string; patientId?: string }): Promise<ExamRequest[]>;
  getExamRequest(id: string): Promise<ExamRequest | undefined>;
  getExamRequestsByPatient(patientId: string): Promise<ExamRequest[]>;
  getPendingExamRequests(): Promise<ExamRequest[]>;
  createExamRequest(request: InsertExamRequest): Promise<ExamRequest>;
  updateExamRequest(id: string, request: Partial<InsertExamRequest>): Promise<ExamRequest | undefined>;
  startExamRequest(id: string, performingDoctorId: string, performingDoctorName: string): Promise<ExamRequest | undefined>;
  completeExamRequest(id: string, result: string, observations?: string, attachments?: string[]): Promise<ExamRequest | undefined>;
  addExamImages(id: string, images: string[]): Promise<ExamRequest | undefined>;
  cancelExamRequest(id: string): Promise<ExamRequest | undefined>;
  deleteExamRequest(id: string): Promise<boolean>;
  
  // Audit Logs  
  createAuditLog(log: InsertAuditLog): Promise<SelectAuditLog>;
  getAuditLogs(limit?: number): Promise<SelectAuditLog[]>;
  getAuditLogsByUser(userId: string, limit?: number): Promise<SelectAuditLog[]>;
  getAuditLogsByEntity(entityType: string, entityId?: string, limit?: number): Promise<SelectAuditLog[]>;
  
  // Password Reset Tokens
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<SelectPasswordResetToken>;
  getPasswordResetToken(token: string): Promise<SelectPasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(token: string): Promise<boolean>;
  cleanupExpiredPasswordResetTokens(): Promise<void>;
  
  // Security Events
  createSecurityEvent(event: InsertSecurityEvent): Promise<SelectSecurityEvent>;
  getSecurityEvents(limit?: number): Promise<SelectSecurityEvent[]>;
  getUnresolvedSecurityEvents(): Promise<SelectSecurityEvent[]>;
  resolveSecurityEvent(id: string, resolvedBy: string): Promise<boolean>;
  markSecurityEventAlertSent(id: string): Promise<boolean>;
  
  // Login Attempts
  createLoginAttempt(attempt: InsertLoginAttempt): Promise<SelectLoginAttempt>;
  getLoginAttemptsByIP(ipAddress: string, timeWindowMinutes?: number): Promise<SelectLoginAttempt[]>;
  getLoginAttemptsByUsername(username: string, timeWindowMinutes?: number): Promise<SelectLoginAttempt[]>;
  getFailedLoginAttemptsInWindow(ipAddress: string, timeWindowMinutes?: number): Promise<number>;
  cleanupOldLoginAttempts(daysToKeep?: number): Promise<void>;
  
  // Security Lockouts
  createSecurityLockout(lockout: InsertSecurityLockout): Promise<SelectSecurityLockout>;
  getActiveLockout(type: string, identifier: string): Promise<SelectSecurityLockout | undefined>;
  isIPBlocked(ipAddress: string): Promise<boolean>;
  isUserLocked(username: string): Promise<boolean>;
  unlockUser(username: string): Promise<boolean>;
  unlockIP(ipAddress: string): Promise<boolean>;
  cleanupExpiredLockouts(): Promise<void>;
  
  // =============================================
  // MÓDULO DE ESTOQUE DE MEDICAMENTOS
  // =============================================
  
  // Medications Catalog
  getMedicationsCatalog(): Promise<SelectMedicationsCatalog[]>;
  getMedicationCatalog(id: string): Promise<SelectMedicationsCatalog | undefined>;
  searchMedicationsCatalog(query: string): Promise<SelectMedicationsCatalog[]>;
  createMedicationCatalog(medication: InsertMedicationsCatalog): Promise<SelectMedicationsCatalog>;
  updateMedicationCatalog(id: string, medication: Partial<InsertMedicationsCatalog>): Promise<SelectMedicationsCatalog | undefined>;
  deleteMedicationCatalog(id: string): Promise<boolean>;
  
  // Inventory Batches
  getInventoryBatches(): Promise<(SelectInventoryBatch & { medication?: SelectMedicationsCatalog })[]>;
  getInventoryBatch(id: string): Promise<(SelectInventoryBatch & { medication?: SelectMedicationsCatalog }) | undefined>;
  getInventoryBatchesByMedication(medicationId: string): Promise<SelectInventoryBatch[]>;
  getLowStockBatches(): Promise<(SelectInventoryBatch & { medication?: SelectMedicationsCatalog })[]>;
  getExpiringBatches(daysAhead: number): Promise<(SelectInventoryBatch & { medication?: SelectMedicationsCatalog })[]>;
  createInventoryBatch(batch: InsertInventoryBatch): Promise<SelectInventoryBatch>;
  updateInventoryBatch(id: string, batch: Partial<InsertInventoryBatch>): Promise<SelectInventoryBatch | undefined>;
  deleteInventoryBatch(id: string): Promise<boolean>;
  
  // Inventory Movements
  getInventoryMovements(limit?: number): Promise<(SelectInventoryMovement & { medication?: SelectMedicationsCatalog; batch?: SelectInventoryBatch })[]>;
  getInventoryMovementsByBatch(batchId: string): Promise<SelectInventoryMovement[]>;
  createInventoryMovement(movement: InsertInventoryMovement): Promise<SelectInventoryMovement>;
  
  // Prescriptions (Structured)
  getPrescriptions(status?: string): Promise<(SelectPrescription & { patient?: Patient })[]>;
  getPrescription(id: string): Promise<(SelectPrescription & { patient?: Patient; items?: SelectPrescriptionItem[] }) | undefined>;
  getPrescriptionsByPatient(patientId: string): Promise<SelectPrescription[]>;
  getPendingPrescriptions(): Promise<(SelectPrescription & { patient?: Patient })[]>;
  createPrescription(prescription: InsertPrescription): Promise<SelectPrescription>;
  updatePrescription(id: string, prescription: Partial<InsertPrescription>): Promise<SelectPrescription | undefined>;
  deletePrescription(id: string): Promise<boolean>;
  
  // Prescription Items
  getPrescriptionItems(prescriptionId: string): Promise<SelectPrescriptionItem[]>;
  createPrescriptionItem(item: InsertPrescriptionItem): Promise<SelectPrescriptionItem>;
  updatePrescriptionItem(id: string, item: Partial<InsertPrescriptionItem>): Promise<SelectPrescriptionItem | undefined>;
  deletePrescriptionItem(id: string): Promise<boolean>;
  
  // Dispensing Events
  getDispensingEvents(prescriptionItemId: string): Promise<SelectDispensingEvent[]>;
  createDispensingEvent(event: InsertDispensingEvent): Promise<SelectDispensingEvent>;
  dispenseMedication(prescriptionItemId: string, batchId: string, quantity: string, userId: string, userName: string, patientId?: string, patientName?: string): Promise<{ event: SelectDispensingEvent; movement: SelectInventoryMovement }>;
  
  // =============================================
  // MÓDULO DE INTERNAÇÃO HOSPITALAR
  // =============================================
  
  // Hospital Wards (Alas)
  getHospitalWards(): Promise<SelectHospitalWard[]>;
  getHospitalWard(id: string): Promise<SelectHospitalWard | undefined>;
  getHospitalWardWithBeds(id: string): Promise<(SelectHospitalWard & { beds: SelectHospitalBed[] }) | undefined>;
  createHospitalWard(ward: InsertHospitalWard): Promise<SelectHospitalWard>;
  updateHospitalWard(id: string, ward: Partial<InsertHospitalWard>): Promise<SelectHospitalWard | undefined>;
  deleteHospitalWard(id: string): Promise<boolean>;
  
  // Hospital Beds (Leitos)
  getHospitalBeds(wardId?: string): Promise<(SelectHospitalBed & { ward?: SelectHospitalWard })[]>;
  getHospitalBed(id: string): Promise<(SelectHospitalBed & { ward?: SelectHospitalWard }) | undefined>;
  getAvailableBeds(wardId?: string): Promise<(SelectHospitalBed & { ward?: SelectHospitalWard })[]>;
  getAllBedsWithDetails(wardId?: string): Promise<Array<SelectHospitalBed & { 
    ward?: SelectHospitalWard; 
    hospitalization?: SelectHospitalization & { patient?: Patient } 
  }>>;
  createHospitalBed(bed: InsertHospitalBed): Promise<SelectHospitalBed>;
  updateHospitalBed(id: string, bed: Partial<InsertHospitalBed>): Promise<SelectHospitalBed | undefined>;
  deleteHospitalBed(id: string): Promise<boolean>;
  
  // Hospitalizations (Internações)
  getHospitalizations(filters?: { status?: string; wardId?: string }): Promise<(SelectHospitalization & { patient?: Patient; bed?: SelectHospitalBed & { ward?: SelectHospitalWard }; attendingDoctor?: User })[]>;
  getHospitalization(id: string): Promise<(SelectHospitalization & { patient?: Patient; bed?: SelectHospitalBed & { ward?: SelectHospitalWard }; attendingDoctor?: User; evolutions?: SelectHospitalizationEvolution[] }) | undefined>;
  getHospitalizationsByPatient(patientId: string): Promise<SelectHospitalization[]>;
  getActiveHospitalizations(): Promise<(SelectHospitalization & { patient?: Patient; bed?: SelectHospitalBed & { ward?: SelectHospitalWard }; attendingDoctor?: User })[]>;
  createHospitalization(hospitalization: InsertHospitalization): Promise<SelectHospitalization>;
  updateHospitalization(id: string, hospitalization: Partial<InsertHospitalization>): Promise<SelectHospitalization | undefined>;
  dischargePatient(id: string, dischargeData: { dischargeType: string; dischargeSummary?: string; dischargedBy: string; dischargedByName: string }): Promise<SelectHospitalization | undefined>;
  deleteHospitalization(id: string): Promise<boolean>;
  
  // Hospitalization Evolutions (Evoluções)
  getHospitalizationEvolutions(hospitalizationId: string): Promise<SelectHospitalizationEvolution[]>;
  getHospitalizationEvolution(id: string): Promise<SelectHospitalizationEvolution | undefined>;
  createHospitalizationEvolution(evolution: InsertHospitalizationEvolution): Promise<SelectHospitalizationEvolution>;
  updateHospitalizationEvolution(id: string, evolution: Partial<InsertHospitalizationEvolution>): Promise<SelectHospitalizationEvolution | undefined>;
  deleteHospitalizationEvolution(id: string): Promise<boolean>;
  
  // Hospitalization Stats
  getHospitalizationOccupancy(): Promise<{
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    occupancyRate: number;
    byWard: Array<{
      wardId: string;
      wardName: string;
      totalBeds: number;
      occupiedBeds: number;
      availableBeds: number;
      occupancyRate: number;
    }>;
  }>;
  
  // =============================================
  // MÓDULO DE MATERIAIS HOSPITALARES
  // =============================================
  
  // Materials Catalog
  getMaterialsCatalog(): Promise<SelectMaterialsCatalog[]>;
  getMaterialCatalog(id: string): Promise<SelectMaterialsCatalog | undefined>;
  searchMaterialsCatalog(query: string): Promise<SelectMaterialsCatalog[]>;
  createMaterialCatalog(material: InsertMaterialsCatalog): Promise<SelectMaterialsCatalog>;
  updateMaterialCatalog(id: string, material: Partial<InsertMaterialsCatalog>): Promise<SelectMaterialsCatalog | undefined>;
  deleteMaterialCatalog(id: string): Promise<boolean>;
  
  // Materials Batches
  getMaterialsBatches(): Promise<(SelectMaterialsBatch & { material?: SelectMaterialsCatalog })[]>;
  getMaterialsBatch(id: string): Promise<(SelectMaterialsBatch & { material?: SelectMaterialsCatalog }) | undefined>;
  getMaterialsBatchesByMaterial(materialId: string): Promise<SelectMaterialsBatch[]>;
  getMaterialsLowStock(): Promise<(SelectMaterialsBatch & { material?: SelectMaterialsCatalog })[]>;
  getMaterialsExpiring(daysAhead: number): Promise<(SelectMaterialsBatch & { material?: SelectMaterialsCatalog })[]>;
  createMaterialsBatch(batch: InsertMaterialsBatch): Promise<SelectMaterialsBatch>;
  updateMaterialsBatch(id: string, batch: Partial<InsertMaterialsBatch>): Promise<SelectMaterialsBatch | undefined>;
  deleteMaterialsBatch(id: string): Promise<boolean>;
  
  // Materials Movements
  getMaterialsMovements(limit?: number): Promise<(SelectMaterialsMovement & { material?: SelectMaterialsCatalog; batch?: SelectMaterialsBatch })[]>;
  getMaterialsMovementsByBatch(batchId: string): Promise<SelectMaterialsMovement[]>;
  createMaterialsMovement(movement: InsertMaterialsMovement): Promise<SelectMaterialsMovement>;
  
  // =============================================
  // MÓDULO DE KITS DE MATERIAIS
  // =============================================
  
  // Kits CRUD
  getPharmacyKits(): Promise<SelectPharmacyKit[]>;
  getPharmacyKit(id: string): Promise<SelectPharmacyKit | undefined>;
  createPharmacyKit(kit: InsertPharmacyKit): Promise<SelectPharmacyKit>;
  updatePharmacyKit(id: string, kit: Partial<InsertPharmacyKit>): Promise<SelectPharmacyKit | undefined>;
  deletePharmacyKit(id: string): Promise<boolean>;
  
  // Kit Items CRUD
  getPharmacyKitItems(kitId: string): Promise<(SelectPharmacyKitItem & { material?: SelectMaterialsCatalog })[]>;
  createPharmacyKitItem(item: InsertPharmacyKitItem): Promise<SelectPharmacyKitItem>;
  updatePharmacyKitItem(id: string, item: Partial<InsertPharmacyKitItem>): Promise<SelectPharmacyKitItem | undefined>;
  deletePharmacyKitItem(id: string): Promise<boolean>;
  deletePharmacyKitItemsByKit(kitId: string): Promise<boolean>;
  
  // Kit Dispensations
  getPharmacyKitDispensations(limit?: number): Promise<(SelectPharmacyKitDispensation & { kit?: SelectPharmacyKit })[]>;
  createPharmacyKitDispensation(dispensation: InsertPharmacyKitDispensation): Promise<SelectPharmacyKitDispensation>;
  
  // Kit with full details (items and stock availability)
  getPharmacyKitWithItems(kitId: string): Promise<PharmacyKitWithItems | undefined>;
  getPharmacyKitsWithItems(): Promise<PharmacyKitWithItems[]>;
  
  // =============================================
  // MÓDULO DE MATERIAIS POR MEDICAMENTO
  // =============================================
  
  // Medication Material Requirements CRUD
  getMedicationMaterialRequirements(medicationId: string): Promise<MedicationMaterialRequirementWithDetails[]>;
  getAllMedicationMaterialRequirements(): Promise<MedicationMaterialRequirementWithDetails[]>;
  getMedicationMaterialRequirement(id: string): Promise<SelectMedicationMaterialRequirement | undefined>;
  createMedicationMaterialRequirement(requirement: InsertMedicationMaterialRequirement): Promise<SelectMedicationMaterialRequirement>;
  updateMedicationMaterialRequirement(id: string, requirement: Partial<InsertMedicationMaterialRequirement>): Promise<SelectMedicationMaterialRequirement | undefined>;
  deleteMedicationMaterialRequirement(id: string): Promise<boolean>;
  deleteMedicationMaterialRequirementsByMedication(medicationId: string): Promise<boolean>;
  
  // =============================================
  // MÓDULO DE KITS DE PROCEDIMENTO
  // =============================================
  
  // Procedure Kits CRUD
  getProcedureKits(): Promise<SelectProcedureKit[]>;
  getProcedureKit(id: string): Promise<ProcedureKitWithItems | undefined>;
  createProcedureKit(kit: InsertProcedureKit): Promise<SelectProcedureKit>;
  updateProcedureKit(id: string, kit: Partial<InsertProcedureKit>): Promise<SelectProcedureKit | undefined>;
  deleteProcedureKit(id: string): Promise<boolean>;
  
  // Procedure Kit Items CRUD
  getProcedureKitItems(kitId: string): Promise<SelectProcedureKitItem[]>;
  addProcedureKitItem(item: InsertProcedureKitItem): Promise<SelectProcedureKitItem>;
  removeProcedureKitItem(id: string): Promise<boolean>;
  
  // Procedure Request Items CRUD
  getProcedureRequestItems(requestId: string): Promise<ProcedureRequestItemWithDetails[]>;
  createProcedureRequestItem(item: InsertProcedureRequestItem): Promise<SelectProcedureRequestItem>;
  updateProcedureRequestItemStatus(id: string, status: string, userId: string, userName: string): Promise<SelectProcedureRequestItem | undefined>;
  completeProcedureRequestItem(id: string, userId: string, userName: string, batchId?: string, quantityToDispense?: number): Promise<SelectProcedureRequestItem | undefined>;
  
  // Create procedure request with items
  createProcedureRequestWithItems(request: InsertProcedureRequest, items: InsertProcedureRequestItem[]): Promise<SelectProcedureRequest>;
}

export class MemStorage implements IStorage {
  private specialties: Map<string, Specialty>;
  private patients: Map<string, Patient>;
  private appointments: Map<string, Appointment>;
  private medicalRecords: Map<string, MedicalHistory>;
  private triageRecords: Map<string, Triage>;
  private users: Map<string, User>;
  private satisfactionSurveys: Map<string, SatisfactionSurvey>;
  private scheduledMessages: Map<string, ScheduledMessage>;
  private passwordResetTokens: Map<string, SelectPasswordResetToken>;
  private securityEvents: Map<string, SelectSecurityEvent>;
  private loginAttempts: Map<string, SelectLoginAttempt>;
  private securityLockouts: Map<string, SelectSecurityLockout>;
  private prescriptionTemplates: Map<string, SelectPrescriptionTemplate>;

  constructor() {
    this.specialties = new Map();
    this.patients = new Map();
    this.appointments = new Map();
    this.medicalRecords = new Map();
    this.triageRecords = new Map();
    this.users = new Map();
    this.satisfactionSurveys = new Map();
    this.scheduledMessages = new Map();
    this.passwordResetTokens = new Map();
    this.securityEvents = new Map();
    this.loginAttempts = new Map();
    this.securityLockouts = new Map();
    this.prescriptionTemplates = new Map();
    
    // Initialize with default data (async but non-blocking)
    this.initializeDefaultData().catch(console.error);
  }

  private async initializeDefaultData() {
    // Create default admin user with hashed password
    const adminId = randomUUID();
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const admin: User = {
      id: adminId,
      username: "admin",
      password: hashedPassword,
      name: "Administrador",
      email: "ramonwagui@gmail.com",
      role: "admin",
      isActive: true,
      crm: null,
      medicalSpecialty: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(adminId, admin);

    // Create default specialties
    const defaultSpecialties = [
      { name: "Cardiologia", description: "Especialidade focada em doenças do coração e sistema cardiovascular" },
      { name: "Clínico Geral", description: "Atendimento médico geral e acompanhamento de saúde" },
      { name: "Dermatologia", description: "Cuidados com a pele, cabelos e unhas" },
      { name: "Endocrinologia", description: "Tratamento de distúrbios hormonais e metabólicos" },
      { name: "Generalista", description: "Medicina geral para diagnóstico e tratamento abrangente" },
      { name: "Ginecologia", description: "Saúde reprodutiva feminina" },
      { name: "Medicina da Familia e Comunidade", description: "Atenção primária à saúde da família e comunidade" },
      { name: "Nefrologista", description: "Especialidade em doenças renais e do sistema urinário" },
      { name: "Neuropediatra", description: "Neurologia pediátrica, distúrbios neurológicos em crianças" },
      { name: "Neurologia", description: "Doenças do sistema nervoso" },
      { name: "Ortopedia", description: "Tratamento de problemas musculares e ósseos" },
      { name: "Pediatria", description: "Cuidados médicos especializados para crianças e adolescentes" },
      { name: "Psiquiatria", description: "Saúde mental e transtornos psiquiátricos" },
      { name: "Saude da Familia e Comunidade", description: "Cuidados integrais de saúde familiar e comunitária" },
      { name: "Ultrassonografia", description: "Diagnóstico por imagem através de ultrassom" },
      { name: "Urologia", description: "Sistema urinário e reprodutor masculino" }
    ];

    defaultSpecialties.forEach(spec => {
      const id = randomUUID();
      const specialty: Specialty = {
        id,
        name: spec.name,
        description: spec.description,
        isActive: true,
        createdAt: new Date()
      };
      this.specialties.set(id, specialty);
    });
  }

  // Specialties methods
  async getSpecialties(): Promise<Specialty[]> {
    return Array.from(this.specialties.values()).filter(s => s.isActive);
  }

  async getSpecialty(id: string): Promise<Specialty | undefined> {
    return this.specialties.get(id);
  }

  async createSpecialty(insertSpecialty: InsertSpecialty): Promise<Specialty> {
    const id = randomUUID();
    const specialty: Specialty = {
      id,
      name: insertSpecialty.name,
      description: insertSpecialty.description || null,
      isActive: true,
      createdAt: new Date()
    };
    this.specialties.set(id, specialty);
    return specialty;
  }

  async updateSpecialty(id: string, updateData: Partial<InsertSpecialty>): Promise<Specialty | undefined> {
    const existing = this.specialties.get(id);
    if (!existing) return undefined;

    const updated: Specialty = { ...existing, ...updateData };
    this.specialties.set(id, updated);
    return updated;
  }

  async deleteSpecialty(id: string): Promise<boolean> {
    const existing = this.specialties.get(id);
    if (!existing) return false;

    // Soft delete
    const updated: Specialty = { ...existing, isActive: false };
    this.specialties.set(id, updated);
    return true;
  }

  // Patients methods
  async getPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async getPatientByCpf(cpf: string): Promise<Patient | undefined> {
    return Array.from(this.patients.values()).find(patient => patient.cpf === cpf);
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const allPatients = Array.from(this.patients.values());
    const lowerQuery = query.toLowerCase();
    
    return allPatients.filter(patient => 
      patient.name.toLowerCase().includes(lowerQuery) ||
      patient.cpf.includes(query)
    );
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const patient: Patient = {
      id,
      name: insertPatient.name,
      cpf: insertPatient.cpf,
      rg: insertPatient.rg,
      susCard: insertPatient.susCard,
      birthDate: insertPatient.birthDate,
      gender: insertPatient.gender,
      whatsapp: insertPatient.whatsapp,
      address: insertPatient.address,
      addressNumber: insertPatient.addressNumber,
      neighborhood: insertPatient.neighborhood,
      zoneType: insertPatient.zoneType,
      city: insertPatient.city,
      state: insertPatient.state,
      createdAt: new Date()
    };
    this.patients.set(id, patient);
    return patient;
  }

  async updatePatient(id: string, updateData: Partial<InsertPatient>): Promise<Patient | undefined> {
    const existing = this.patients.get(id);
    if (!existing) return undefined;

    const updated: Patient = { ...existing, ...updateData };
    this.patients.set(id, updated);
    return updated;
  }

  async deletePatient(id: string): Promise<boolean> {
    return this.patients.delete(id);
  }

  // Appointments methods
  async getAppointments(): Promise<AppointmentWithDetails[]> {
    const appointments = Array.from(this.appointments.values());
    const result: AppointmentWithDetails[] = [];

    for (const appointment of appointments) {
      const specialty = this.specialties.get(appointment.specialtyId);
      if (specialty) {
        let patient: Patient | undefined;
        
        // Try to get patient from patientId first
        if (appointment.patientId) {
          patient = this.patients.get(appointment.patientId);
        }
        
        // For legacy appointments without patientId, create a virtual patient object
        if (!patient && appointment.patientName) {
          patient = {
            id: 'legacy-' + appointment.id,
            name: appointment.patientName,
            cpf: appointment.patientCpf || '',
            rg: '',
            susCard: appointment.patientSusCard || '',
            birthDate: '',
            gender: 'feminino',
            whatsapp: appointment.patientWhatsapp || '',
            address: '',
            addressNumber: '',
            neighborhood: '',
            zoneType: 'urbana',
            city: '',
            state: 'PE',
            createdAt: new Date()
          };
        }
        
        if (patient) {
          result.push({ ...appointment, patient, specialty });
        }
      }
    }

    return result.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
  }

  async getAppointment(id: string): Promise<AppointmentWithDetails | undefined> {
    const appointment = this.appointments.get(id);
    if (!appointment) return undefined;

    const patient = appointment.patientId ? this.patients.get(appointment.patientId) : undefined;
    const specialty = this.specialties.get(appointment.specialtyId);
    if (!specialty) return undefined;

    return { ...appointment, patient, specialty };
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const appointment: Appointment = {
      id,
      patientId: insertAppointment.patientId || null,
      patientName: null,
      patientCpf: null,
      patientSusCard: null,
      patientWhatsapp: null,
      specialtyId: insertAppointment.specialtyId,
      appointmentDate: insertAppointment.appointmentDate,
      appointmentTime: insertAppointment.appointmentTime,
      reason: insertAppointment.reason,
      status: insertAppointment.status || "scheduled",
      googleCalendarEventId: null,
      createdAt: new Date()
    };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async createLegacyAppointment(legacyAppointment: any): Promise<Appointment> {
    // First, create or get the patient
    let patient = await this.getPatientByCpf(legacyAppointment.patientCpf);
    
    if (!patient) {
      // Create new patient from legacy appointment data
      const newPatient: InsertPatient = {
        name: legacyAppointment.patientName,
        cpf: legacyAppointment.patientCpf,
        rg: legacyAppointment.patientRg,
        birthDate: legacyAppointment.patientBirthDate,
        gender: legacyAppointment.patientGender,
        susCard: legacyAppointment.patientSusCard,
        whatsapp: legacyAppointment.patientWhatsapp,
        address: legacyAppointment.patientAddress,
        addressNumber: legacyAppointment.patientAddressNumber,
        neighborhood: legacyAppointment.patientNeighborhood,
        zoneType: legacyAppointment.patientZoneType,
        city: legacyAppointment.patientCity,
        state: legacyAppointment.patientState,
      };
      patient = await this.createPatient(newPatient);
    }

    // Create appointment with patient ID
    const appointmentData: InsertAppointment = {
      patientId: patient.id,
      specialtyId: legacyAppointment.specialtyId,
      appointmentDate: legacyAppointment.appointmentDate,
      appointmentTime: legacyAppointment.appointmentTime,
      reason: legacyAppointment.reason,
      status: legacyAppointment.status || "scheduled",
    };

    return this.createAppointment(appointmentData);
  }

  async updateAppointment(id: string, updateData: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const existing = this.appointments.get(id);
    if (!existing) return undefined;

    const updated: Appointment = { ...existing, ...updateData };
    this.appointments.set(id, updated);
    return updated;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    return this.appointments.delete(id);
  }

  // Medical History methods
  async getMedicalHistory(): Promise<MedicalHistoryWithDetails[]> {
    const records = Array.from(this.medicalRecords.values());
    const result: MedicalHistoryWithDetails[] = [];

    for (const record of records) {
      const patient = this.patients.get(record.patientId);
      const specialty = this.specialties.get(record.specialtyId);
      const appointment = record.appointmentId ? this.appointments.get(record.appointmentId) : undefined;
      
      if (patient && specialty) {
        result.push({ ...record, patient, specialty, appointment });
      }
    }

    return result.sort((a, b) => new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime());
  }

  async getMedicalHistoryByPatient(patientId: string): Promise<MedicalHistoryWithDetails[]> {
    const allRecords = await this.getMedicalHistory();
    return allRecords.filter(record => record.patientId === patientId);
  }

  async getMedicalHistoryBySusCard(susCard: string): Promise<MedicalHistoryWithDetails[]> {
    // Find patient by SUS card first
    const patient = Array.from(this.patients.values()).find(p => p.susCard === susCard);
    if (!patient) return [];
    
    return this.getMedicalHistoryByPatient(patient.id);
  }

  async getMedicalHistoryByHospitalization(hospitalizationId: string): Promise<MedicalHistoryWithDetails[]> {
    const allRecords = await this.getMedicalHistory();
    return allRecords.filter(record => (record as any).hospitalizationId === hospitalizationId);
  }

  async getMedicalRecord(id: string): Promise<MedicalHistoryWithDetails | undefined> {
    const record = this.medicalRecords.get(id);
    if (!record) return undefined;

    const patient = this.patients.get(record.patientId);
    const specialty = this.specialties.get(record.specialtyId);
    const appointment = record.appointmentId ? this.appointments.get(record.appointmentId) : undefined;
    
    if (!patient || !specialty) return undefined;

    return { ...record, patient, specialty, appointment };
  }

  async createMedicalRecord(insertRecord: InsertMedicalHistory): Promise<MedicalHistory> {
    const id = randomUUID();
    const record: MedicalHistory = {
      id,
      patientId: insertRecord.patientId,
      appointmentId: insertRecord.appointmentId || null,
      specialtyId: insertRecord.specialtyId,
      consultationDate: insertRecord.consultationDate,
      consultationTime: insertRecord.consultationTime,
      reason: insertRecord.reason,
      symptoms: insertRecord.symptoms || null,
      diagnosis: insertRecord.diagnosis || null,
      treatment: insertRecord.treatment || null,
      medications: insertRecord.medications || null,
      observations: insertRecord.observations || null,
      examResults: insertRecord.examResults || null,
      nextConsultation: insertRecord.nextConsultation || null,
      doctorName: insertRecord.doctorName,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.medicalRecords.set(id, record);
    return record;
  }

  async updateMedicalRecord(id: string, updateData: Partial<InsertMedicalHistory>): Promise<MedicalHistory | undefined> {
    const existing = this.medicalRecords.get(id);
    if (!existing) return undefined;

    const updated: MedicalHistory = { 
      ...existing, 
      ...updateData, 
      updatedAt: new Date() 
    };
    this.medicalRecords.set(id, updated);
    return updated;
  }

  async deleteMedicalRecord(id: string): Promise<boolean> {
    return this.medicalRecords.delete(id);
  }

  // Triage methods
  async getTriages(): Promise<Triage[]> {
    const triages = Array.from(this.triageRecords.values());
    return triages.sort((a, b) => new Date(b.triageDate).getTime() - new Date(a.triageDate).getTime());
  }

  async getTriagesByPatient(patientId: string): Promise<Triage[]> {
    const allTriages = await this.getTriages();
    return allTriages.filter(t => t.patientId === patientId);
  }

  async getTriage(id: string): Promise<Triage | undefined> {
    return this.triageRecords.get(id);
  }

  async createTriage(insertTriage: InsertTriage): Promise<Triage> {
    const id = randomUUID();
    const now = new Date();
    const triageRecord: Triage = {
      id,
      ...insertTriage,
      createdAt: now,
      updatedAt: now,
    };
    this.triageRecords.set(id, triageRecord);
    return triageRecord;
  }

  async updateTriage(id: string, updateData: Partial<InsertTriage>): Promise<Triage | undefined> {
    const existing = this.triageRecords.get(id);
    if (!existing) return undefined;

    const updated: Triage = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    this.triageRecords.set(id, updated);
    return updated;
  }

  async deleteTriage(id: string): Promise<boolean> {
    return this.triageRecords.delete(id);
  }

  // Reports methods
  async getAppointmentReports(startDate: string, endDate: string, specialtyId?: string, zoneType?: string): Promise<{
    total: number;
    completed: number;
    cancelled: number;
    rescheduled: number;
    urban: number;
    rural: number;
    specialtyBreakdown: Array<{ name: string; count: number }>;
    zoneBreakdown: Array<{ name: string; count: number; color: string }>;
    dailyData: Array<{ date: string; count: number }>;
  }> {
    const appointments = await this.getAppointments();
    
    // Filter appointments by date range
    let filteredAppointments = appointments.filter(apt => {
      const appointmentDate = new Date(apt.appointmentDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return appointmentDate >= start && appointmentDate <= end;
    });

    // Apply additional filters
    if (specialtyId) {
      filteredAppointments = filteredAppointments.filter(apt => apt.specialtyId === specialtyId);
    }

    if (zoneType) {
      filteredAppointments = filteredAppointments.filter(apt => {
        return apt.patient?.zoneType === zoneType;
      });
    }

    const total = filteredAppointments.length;
    
    // Count appointments by status
    const completed = filteredAppointments.filter(apt => apt.status === 'completed').length;
    const cancelled = filteredAppointments.filter(apt => apt.status === 'cancelled').length;
    const rescheduled = filteredAppointments.filter(apt => apt.status === 'rescheduled').length;
    
    // Count by zone
    let urban = 0;
    let rural = 0;
    
    filteredAppointments.forEach(apt => {
      const zone = apt.patient?.zoneType;
      if (zone === 'urbana') urban++;
      else if (zone === 'rural') rural++;
    });

    // Specialty breakdown
    const specialtyCount = new Map<string, number>();
    filteredAppointments.forEach(apt => {
      const specialtyName = apt.specialty?.name || 'Especialidade não informada';
      specialtyCount.set(specialtyName, (specialtyCount.get(specialtyName) || 0) + 1);
    });

    const specialtyBreakdown = Array.from(specialtyCount.entries()).map(([name, count]) => ({
      name,
      count
    }));

    // Zone breakdown with colors
    const zoneBreakdown = [
      { name: 'Urbana', count: urban, color: '#2563eb' },
      { name: 'Rural', count: rural, color: '#16a34a' }
    ].filter(item => item.count > 0);

    // Daily data
    const dailyCount = new Map<string, number>();
    filteredAppointments.forEach(apt => {
      const date = apt.appointmentDate;
      dailyCount.set(date, (dailyCount.get(date) || 0) + 1);
    });

    const dailyData = Array.from(dailyCount.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Status breakdown
    const statusCount = new Map<string, number>();
    filteredAppointments.forEach(apt => {
      const status = apt.status || 'scheduled';
      statusCount.set(status, (statusCount.get(status) || 0) + 1);
    });

    const statusBreakdown = [
      { name: 'Agendados', count: statusCount.get('scheduled') || 0, color: '#2563eb' },
      { name: 'Reagendados', count: statusCount.get('rescheduled') || 0, color: '#ca8a04' },
      { name: 'Realizados', count: statusCount.get('completed') || 0, color: '#16a34a' },
      { name: 'Cancelados', count: statusCount.get('cancelled') || 0, color: '#dc2626' }
    ].filter(item => item.count > 0);

    return {
      total,
      completed,
      cancelled,
      rescheduled,
      urban,
      rural,
      specialtyBreakdown,
      zoneBreakdown,
      dailyData
    };
  }

  async getAttendanceReports(startDate: string, endDate: string, specialtyId?: string, doctorName?: string, zoneType?: string): Promise<{
    total: number;
    urban: number;
    rural: number;
    activeDoctors: number;
    specialtyBreakdown: Array<{ name: string; count: number }>;
    doctorBreakdown: Array<{ name: string; count: number }>;
    zoneBreakdown: Array<{ name: string; count: number; color: string }>;
    locationBreakdown: Array<{ name: string; count: number; color: string }>;
    dailyData: Array<{ date: string; count: number }>;
  }> {
    // MemStorage stub — returns empty
    return { total: 0, urban: 0, rural: 0, activeDoctors: 0, specialtyBreakdown: [], doctorBreakdown: [], zoneBreakdown: [], locationBreakdown: [], dailyData: [] };
  }

  async getDistinctDoctorsFromHistory(): Promise<Array<{ name: string }>> {
    return [];
  }

  // Users methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values())
      .map(user => ({ ...user, password: "[PROTECTED]" } as any))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Check for unique username and email
    const existingUsername = await this.getUserByUsername(insertUser.username);
    if (existingUsername) {
      throw new Error("Nome de usuário já existe");
    }
    
    const existingEmail = await this.getUserByEmail(insertUser.email);
    if (existingEmail) {
      throw new Error("Email já está cadastrado");
    }

    const id = randomUUID();
    // Hash password if provided
    const hashedPassword = insertUser.password ? await bcrypt.hash(insertUser.password, 12) : insertUser.password;
    const user: User = { 
      ...insertUser, 
      id,
      password: hashedPassword,
      role: insertUser.role || "staff", // Default role for new users
      isActive: insertUser.isActive ?? true,
      crm: insertUser.crm || null,
      medicalSpecialty: insertUser.medicalSpecialty || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, password: "[PROTECTED]" } as User;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    // Check for unique username and email (excluding current user)
    if (userData.username && userData.username !== existingUser.username) {
      const existingUsername = await this.getUserByUsername(userData.username);
      if (existingUsername && existingUsername.id !== id) {
        throw new Error("Nome de usuário já existe");
      }
    }
    
    if (userData.email && userData.email !== existingUser.email) {
      const existingEmail = await this.getUserByEmail(userData.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new Error("Email já está cadastrado");
      }
    }
    
    // Prevent role change if this is the last admin
    if (userData.role && userData.role !== "admin" && existingUser.role === "admin") {
      const allAdmins = Array.from(this.users.values()).filter(u => u.role === "admin");
      if (allAdmins.length === 1) {
        throw new Error("Não é possível alterar o role do último administrador");
      }
    }
    
    // Hash password if provided
    const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 12) : userData.password;
    const updatedUser: User = {
      ...existingUser,
      ...userData,
      id, // Preserve original ID
      password: hashedPassword || existingUser.password,
      updatedAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    // Return user without password
    const { password, ...userWithoutPassword } = updatedUser;
    return { ...userWithoutPassword, password: "[PROTECTED]" } as User;
  }

  async deleteUser(id: string): Promise<boolean> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return false;
    }
    
    // Prevent deletion of the last admin
    if (existingUser.role === "admin") {
      const allAdmins = Array.from(this.users.values()).filter(u => u.role === "admin");
      if (allAdmins.length === 1) {
        throw new Error("Não é possível excluir o último administrador");
      }
    }
    
    return this.users.delete(id);
  }

  async changeUserPassword(id: string, newHashedPassword: string): Promise<boolean> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return false;
    }
    
    const updatedUser: User = {
      ...existingUser,
      password: newHashedPassword,
      updatedAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    return true;
  }

  // Satisfaction Surveys methods
  async getSatisfactionSurveys(): Promise<SatisfactionSurveyWithDetails[]> {
    const surveys = Array.from(this.satisfactionSurveys.values());
    const result: SatisfactionSurveyWithDetails[] = [];

    for (const survey of surveys) {
      const patient = this.patients.get(survey.patientId);
      
      if (patient) {
        result.push({ ...survey, patient });
      }
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getSatisfactionSurvey(id: string): Promise<SatisfactionSurveyWithDetails | undefined> {
    const survey = this.satisfactionSurveys.get(id);
    if (!survey) return undefined;

    const patient = this.patients.get(survey.patientId);
    if (!patient) return undefined;

    return { ...survey, patient };
  }

  async getSatisfactionSurveysByPatient(patientId: string): Promise<SatisfactionSurveyWithDetails[]> {
    const allSurveys = await this.getSatisfactionSurveys();
    return allSurveys.filter(survey => survey.patientId === patientId);
  }

  async getSatisfactionSurveysByQueueEntry(queueEntryId: string): Promise<SatisfactionSurveyWithDetails[]> {
    const allSurveys = await this.getSatisfactionSurveys();
    return allSurveys.filter(survey => survey.queueEntryId === queueEntryId);
  }

  async createSatisfactionSurvey(insertSurvey: InsertSatisfactionSurvey): Promise<SatisfactionSurvey> {
    const id = randomUUID();
    // Gerar token único se não foi fornecido
    const surveyToken = insertSurvey.surveyToken || SurveyTokenService.generateToken();
    
    const survey: SatisfactionSurvey = {
      id,
      queueEntryId: insertSurvey.queueEntryId,
      patientId: insertSurvey.patientId,
      surveyType: insertSurvey.surveyType,
      surveyToken,
      rating: insertSurvey.rating || null,
      feedback: insertSurvey.feedback || null,
      respondedAt: insertSurvey.respondedAt || null,
      responseMethod: insertSurvey.responseMethod || null,
      status: insertSurvey.status || SATISFACTION_SURVEY_STATUS.PENDING,
      whatsappMessageSent: insertSurvey.whatsappMessageSent || null,
      emailSent: insertSurvey.emailSent || null,
      sentAt: insertSurvey.sentAt || null,
      whatsappConversationId: insertSurvey.whatsappConversationId || null,
      expiresAt: insertSurvey.expiresAt || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.satisfactionSurveys.set(id, survey);
    return survey;
  }

  async updateSatisfactionSurvey(id: string, updateData: Partial<InsertSatisfactionSurvey>): Promise<SatisfactionSurvey | undefined> {
    const existing = this.satisfactionSurveys.get(id);
    if (!existing) return undefined;

    const updated: SatisfactionSurvey = { 
      ...existing, 
      ...updateData, 
      updatedAt: new Date() 
    };
    this.satisfactionSurveys.set(id, updated);
    return updated;
  }

  async deleteSatisfactionSurvey(id: string): Promise<boolean> {
    return this.satisfactionSurveys.delete(id);
  }

  // Scheduled Messages methods
  async getScheduledMessages(): Promise<ScheduledMessage[]> {
    return Array.from(this.scheduledMessages.values());
  }

  async getScheduledMessage(id: string): Promise<ScheduledMessage | undefined> {
    return this.scheduledMessages.get(id);
  }

  async getScheduledMessagesByStatus(status: string): Promise<ScheduledMessage[]> {
    return Array.from(this.scheduledMessages.values())
      .filter(msg => msg.status === status);
  }

  async getPendingScheduledMessages(): Promise<ScheduledMessage[]> {
    return Array.from(this.scheduledMessages.values())
      .filter(msg => msg.status === SCHEDULED_MESSAGE_STATUS.PENDING && msg.scheduledFor <= new Date());
  }

  async createScheduledMessage(insertMessage: InsertScheduledMessage): Promise<ScheduledMessage> {
    const id = randomUUID();
    const message: ScheduledMessage = {
      id,
      queueEntryId: insertMessage.queueEntryId,
      patientId: insertMessage.patientId,
      messageType: insertMessage.messageType,
      scheduledFor: insertMessage.scheduledFor,
      status: insertMessage.status || SCHEDULED_MESSAGE_STATUS.PENDING,
      errorMessage: insertMessage.errorMessage || null,
      sentAt: insertMessage.sentAt || null,
      messageData: insertMessage.messageData || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.scheduledMessages.set(id, message);
    return message;
  }

  async updateScheduledMessage(id: string, updateData: Partial<InsertScheduledMessage>): Promise<ScheduledMessage | undefined> {
    const existing = this.scheduledMessages.get(id);
    if (!existing) return undefined;

    const updated: ScheduledMessage = {
      ...existing,
      ...updateData,
      updatedAt: new Date()
    };
    this.scheduledMessages.set(id, updated);
    return updated;
  }

  async deleteScheduledMessage(id: string): Promise<boolean> {
    return this.scheduledMessages.delete(id);
  }

  // Audit Log methods for MemStorage (not implemented - use DatabaseStorage for production)
  async createAuditLog(logData: InsertAuditLog): Promise<SelectAuditLog> {
    console.warn('Audit logging not implemented in MemStorage');
    return {} as SelectAuditLog;
  }

  async getAuditLogs(limit: number = 100): Promise<SelectAuditLog[]> {
    console.warn('Audit logging not implemented in MemStorage');
    return [];
  }

  async getAuditLogsByUser(userId: string, limit: number = 50): Promise<SelectAuditLog[]> {
    console.warn('Audit logging not implemented in MemStorage');
    return [];
  }

  async getAuditLogsByEntity(entityType: string, entityId?: string, limit: number = 50): Promise<SelectAuditLog[]> {
    console.warn('Audit logging not implemented in MemStorage');
    return [];
  }

  // Password Reset Token methods
  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<SelectPasswordResetToken> {
    const id = randomUUID();
    const token: SelectPasswordResetToken = {
      id,
      userId: tokenData.userId,
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
      used: tokenData.used || false,
      ipAddress: tokenData.ipAddress || null,
      userAgent: tokenData.userAgent || null,
      createdAt: new Date()
    };
    this.passwordResetTokens.set(tokenData.token, token);
    return token;
  }

  async getPasswordResetToken(token: string): Promise<SelectPasswordResetToken | undefined> {
    const tokenData = this.passwordResetTokens.get(token);
    if (!tokenData) return undefined;
    
    // Check if token is expired
    if (new Date() > tokenData.expiresAt) {
      return undefined;
    }
    
    // Check if token is already used
    if (tokenData.used) {
      return undefined;
    }
    
    return tokenData;
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<boolean> {
    const tokenData = this.passwordResetTokens.get(token);
    if (!tokenData) return false;
    
    const updatedToken: SelectPasswordResetToken = {
      ...tokenData,
      used: true
    };
    this.passwordResetTokens.set(token, updatedToken);
    return true;
  }

  async cleanupExpiredPasswordResetTokens(): Promise<void> {
    const now = new Date();
    const tokensToRemove: string[] = [];
    
    Array.from(this.passwordResetTokens.entries()).forEach(([tokenKey, tokenData]) => {
      if (now > tokenData.expiresAt) {
        tokensToRemove.push(tokenKey);
      }
    });
    
    tokensToRemove.forEach(token => this.passwordResetTokens.delete(token));
  }

  // Security Events methods
  async createSecurityEvent(event: InsertSecurityEvent): Promise<SelectSecurityEvent> {
    const id = randomUUID();
    const securityEvent: SelectSecurityEvent = {
      id,
      eventType: event.eventType,
      severity: event.severity,
      username: event.username || null,
      ipAddress: event.ipAddress || null,
      userAgent: event.userAgent || null,
      description: event.description,
      metadata: event.metadata || null,
      alertSent: event.alertSent || false,
      resolved: event.resolved || false,
      resolvedBy: event.resolvedBy || null,
      resolvedAt: event.resolvedAt || null,
      createdAt: new Date()
    };
    this.securityEvents.set(id, securityEvent);
    return securityEvent;
  }

  async getSecurityEvents(limit: number = 100): Promise<SelectSecurityEvent[]> {
    return Array.from(this.securityEvents.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getUnresolvedSecurityEvents(): Promise<SelectSecurityEvent[]> {
    return Array.from(this.securityEvents.values())
      .filter(event => !event.resolved)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async resolveSecurityEvent(id: string, resolvedBy: string): Promise<boolean> {
    const event = this.securityEvents.get(id);
    if (!event) return false;

    const updatedEvent: SelectSecurityEvent = {
      ...event,
      resolved: true,
      resolvedBy,
      resolvedAt: new Date()
    };
    this.securityEvents.set(id, updatedEvent);
    return true;
  }

  async markSecurityEventAlertSent(id: string): Promise<boolean> {
    const event = this.securityEvents.get(id);
    if (!event) return false;

    const updatedEvent: SelectSecurityEvent = {
      ...event,
      alertSent: true
    };
    this.securityEvents.set(id, updatedEvent);
    return true;
  }

  // Login Attempts methods
  async createLoginAttempt(attempt: InsertLoginAttempt): Promise<SelectLoginAttempt> {
    const id = randomUUID();
    const loginAttempt: SelectLoginAttempt = {
      id,
      username: attempt.username || null,
      ipAddress: attempt.ipAddress,
      userAgent: attempt.userAgent || null,
      success: attempt.success,
      attemptTime: new Date()
    };
    this.loginAttempts.set(id, loginAttempt);
    return loginAttempt;
  }

  async getLoginAttemptsByIP(ipAddress: string, timeWindowMinutes: number = 30): Promise<SelectLoginAttempt[]> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);
    
    return Array.from(this.loginAttempts.values())
      .filter(attempt => 
        attempt.ipAddress === ipAddress && 
        new Date(attempt.attemptTime) >= windowStart
      )
      .sort((a, b) => new Date(b.attemptTime).getTime() - new Date(a.attemptTime).getTime());
  }

  async getLoginAttemptsByUsername(username: string, timeWindowMinutes: number = 30): Promise<SelectLoginAttempt[]> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);
    
    return Array.from(this.loginAttempts.values())
      .filter(attempt => 
        attempt.username === username && 
        new Date(attempt.attemptTime) >= windowStart
      )
      .sort((a, b) => new Date(b.attemptTime).getTime() - new Date(a.attemptTime).getTime());
  }

  async getFailedLoginAttemptsInWindow(ipAddress: string, timeWindowMinutes: number = 30): Promise<number> {
    const attempts = await this.getLoginAttemptsByIP(ipAddress, timeWindowMinutes);
    return attempts.filter(attempt => !attempt.success).length;
  }

  async cleanupOldLoginAttempts(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const attemptsToRemove: string[] = [];
    Array.from(this.loginAttempts.entries()).forEach(([id, attempt]) => {
      if (new Date(attempt.attemptTime) < cutoffDate) {
        attemptsToRemove.push(id);
      }
    });
    
    attemptsToRemove.forEach(id => this.loginAttempts.delete(id));
  }

  // Security Lockouts implementation
  async createSecurityLockout(lockout: InsertSecurityLockout): Promise<SelectSecurityLockout> {
    const id = randomUUID();
    const newLockout: SelectSecurityLockout = {
      id,
      type: lockout.type,
      identifier: lockout.identifier,
      expiresAt: lockout.expiresAt,
      reason: lockout.reason || null,
      lockedAt: lockout.lockedAt || new Date(),
      active: lockout.active ?? true,
      createdAt: new Date(),
    };
    this.securityLockouts.set(id, newLockout);
    return newLockout;
  }

  async getActiveLockout(type: string, identifier: string): Promise<SelectSecurityLockout | undefined> {
    const now = new Date();
    for (const lockout of Array.from(this.securityLockouts.values())) {
      if (lockout.type === type && 
          lockout.identifier === identifier && 
          lockout.active && 
          new Date(lockout.expiresAt) > now) {
        return lockout;
      }
    }
    return undefined;
  }

  async isIPBlocked(ipAddress: string): Promise<boolean> {
    const lockout = await this.getActiveLockout('IP', ipAddress);
    return !!lockout;
  }

  async isUserLocked(username: string): Promise<boolean> {
    const lockout = await this.getActiveLockout('USER', username);
    return !!lockout;
  }

  async unlockUser(username: string): Promise<boolean> {
    for (const [id, lockout] of Array.from(this.securityLockouts.entries())) {
      if (lockout.type === 'USER' && lockout.identifier === username && lockout.active) {
        this.securityLockouts.set(id, { ...lockout, active: false });
        return true;
      }
    }
    return false;
  }

  async unlockIP(ipAddress: string): Promise<boolean> {
    for (const [id, lockout] of Array.from(this.securityLockouts.entries())) {
      if (lockout.type === 'IP' && lockout.identifier === ipAddress && lockout.active) {
        this.securityLockouts.set(id, { ...lockout, active: false });
        return true;
      }
    }
    return false;
  }

  async cleanupExpiredLockouts(): Promise<void> {
    const now = new Date();
    const expiredIds: string[] = [];
    
    for (const [id, lockout] of Array.from(this.securityLockouts.entries())) {
      if (new Date(lockout.expiresAt) <= now) {
        expiredIds.push(id);
      }
    }
    
    expiredIds.forEach(id => this.securityLockouts.delete(id));
  }

  // Prescription Templates implementation - MemStorage version
  async getPrescriptionTemplates(doctorId?: string): Promise<SelectPrescriptionTemplate[]> {
    const templates = Array.from(this.prescriptionTemplates.values());
    if (doctorId) {
      return templates
        .filter(t => t.doctorId === doctorId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getPrescriptionTemplate(id: string): Promise<SelectPrescriptionTemplate | undefined> {
    return this.prescriptionTemplates.get(id);
  }

  async createPrescriptionTemplate(template: InsertPrescriptionTemplate): Promise<SelectPrescriptionTemplate> {
    const id = randomUUID();
    const newTemplate: SelectPrescriptionTemplate = {
      id,
      doctorId: template.doctorId,
      templateName: template.templateName,
      specialty: template.specialty ?? null,
      diagnosis: template.diagnosis ?? null,
      treatment: template.treatment ?? null,
      medications: template.medications ?? null,
      observations: template.observations ?? null,
      isActive: template.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.prescriptionTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async updatePrescriptionTemplate(id: string, template: Partial<InsertPrescriptionTemplate>): Promise<SelectPrescriptionTemplate | undefined> {
    const existing = this.prescriptionTemplates.get(id);
    if (!existing) return undefined;

    const updated: SelectPrescriptionTemplate = {
      ...existing,
      ...template,
      updatedAt: new Date(),
    };
    this.prescriptionTemplates.set(id, updated);
    return updated;
  }

  async deletePrescriptionTemplate(id: string): Promise<boolean> {
    return this.prescriptionTemplates.delete(id);
  }
}

// Database implementation

export class DatabaseStorage implements IStorage {
  // User operations for local authentication
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      // Hash password if provided
      const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 12) : userData.password;
      // Admins don't need to change password on first login
      const mustChangePassword = userData.role !== 'admin';
      const [user] = await db.insert(users).values({
        ...userData,
        password: hashedPassword,
        mustChangePassword,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      // Return user without password for security
      return { ...user, password: "[PROTECTED]" };
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === '23505') { // PostgreSQL unique violation
        if (error.detail?.includes('username')) {
          throw new Error("Nome de usuário já existe");
        }
        if (error.detail?.includes('email')) {
          throw new Error("Email já está cadastrado");
        }
      }
      throw error;
    }
  }

  async listUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    // Remove passwords from response for security
    return allUsers.map(user => ({ ...user, password: "[PROTECTED]" }));
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      // Check for last admin protection
      if (userData.role && userData.role !== "admin") {
        const [currentUser] = await db.select().from(users).where(eq(users.id, id));
        if (currentUser?.role === "admin") {
          const adminCount = await db.select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.role, "admin"));
          if (adminCount[0]?.count === 1) {
            throw new Error("Não é possível alterar o role do último administrador");
          }
        }
      }
      
      // Hash password if provided
      const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 12) : userData.password;
      const updateData = {
        ...userData,
        ...(hashedPassword && { password: hashedPassword }),
        updatedAt: new Date()
      };
      
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();
        
      return updatedUser ? { ...updatedUser, password: "[PROTECTED]" } : undefined;
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === '23505') { // PostgreSQL unique violation
        if (error.detail?.includes('username')) {
          throw new Error("Nome de usuário já existe");
        }
        if (error.detail?.includes('email')) {
          throw new Error("Email já está cadastrado");
        }
      }
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    // Check if this is the last admin
    const [userToDelete] = await db.select().from(users).where(eq(users.id, id));
    if (!userToDelete) {
      return false;
    }
    
    if (userToDelete.role === "admin") {
      const adminCount = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "admin"));
      if (adminCount[0]?.count === 1) {
        throw new Error("Não é possível excluir o último administrador");
      }
    }
    
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async changeUserPassword(id: string, newHashedPassword: string): Promise<boolean> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        password: newHashedPassword, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    
    return !!updatedUser;
  }

  // Medical History methods
  async getMedicalHistory(): Promise<MedicalHistoryWithDetails[]> {
    const result = await db.select({
      id: medicalHistory.id,
      patientId: medicalHistory.patientId,
      appointmentId: medicalHistory.appointmentId,
      specialtyId: medicalHistory.specialtyId,
      consultationDate: medicalHistory.consultationDate,
      consultationTime: medicalHistory.consultationTime,
      reason: medicalHistory.reason,
      symptoms: medicalHistory.symptoms,
      diagnosis: medicalHistory.diagnosis,
      treatment: medicalHistory.treatment,
      medications: medicalHistory.medications,
      observations: medicalHistory.observations,
      examResults: medicalHistory.examResults,
      nextConsultation: medicalHistory.nextConsultation,
      doctorName: medicalHistory.doctorName,
      createdAt: medicalHistory.createdAt,
      updatedAt: medicalHistory.updatedAt,
      patient: patients,
      specialty: specialties,
      appointment: appointments
    })
    .from(medicalHistory)
    .leftJoin(patients, sql`${medicalHistory.patientId} = ${patients.id}::uuid`)
    .leftJoin(specialties, sql`${medicalHistory.specialtyId} = ${specialties.id}::uuid`)
    .leftJoin(appointments, sql`${medicalHistory.appointmentId} = ${appointments.id}::uuid`)
    .orderBy(medicalHistory.consultationDate);

    // Fetch exam requests for all medical history records
    const allExamRequests = await db.select().from(examRequests);
    const examRequestsByHistoryId = new Map<string, typeof allExamRequests>();
    
    for (const exam of allExamRequests) {
      if (exam.medicalHistoryId) {
        const existing = examRequestsByHistoryId.get(exam.medicalHistoryId) || [];
        existing.push(exam);
        examRequestsByHistoryId.set(exam.medicalHistoryId, existing);
      }
    }

    return result.map(row => ({
      id: row.id,
      patientId: row.patientId,
      appointmentId: row.appointmentId,
      specialtyId: row.specialtyId,
      consultationDate: row.consultationDate,
      consultationTime: row.consultationTime,
      reason: row.reason,
      symptoms: row.symptoms,
      diagnosis: row.diagnosis,
      treatment: row.treatment,
      medications: row.medications,
      observations: row.observations,
      examResults: row.examResults,
      nextConsultation: row.nextConsultation,
      doctorName: row.doctorName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: row.patient ?? undefined,
      specialty: row.specialty ?? undefined,
      appointment: row.appointment ?? undefined,
      examRequests: examRequestsByHistoryId.get(row.id) || []
    }));
  }

  async getMedicalHistoryByPatient(patientId: string): Promise<MedicalHistoryWithDetails[]> {
    const result = await db.select({
      id: medicalHistory.id,
      patientId: medicalHistory.patientId,
      appointmentId: medicalHistory.appointmentId,
      specialtyId: medicalHistory.specialtyId,
      consultationDate: medicalHistory.consultationDate,
      consultationTime: medicalHistory.consultationTime,
      reason: medicalHistory.reason,
      symptoms: medicalHistory.symptoms,
      diagnosis: medicalHistory.diagnosis,
      treatment: medicalHistory.treatment,
      medications: medicalHistory.medications,
      observations: medicalHistory.observations,
      examResults: medicalHistory.examResults,
      nextConsultation: medicalHistory.nextConsultation,
      doctorName: medicalHistory.doctorName,
      createdAt: medicalHistory.createdAt,
      updatedAt: medicalHistory.updatedAt,
      patient: patients,
      specialty: specialties,
      appointment: appointments
    })
    .from(medicalHistory)
    .leftJoin(patients, sql`${medicalHistory.patientId} = ${patients.id}::uuid`)
    .leftJoin(specialties, sql`${medicalHistory.specialtyId} = ${specialties.id}::uuid`)
    .leftJoin(appointments, sql`${medicalHistory.appointmentId} = ${appointments.id}::uuid`)
    .where(sql`${medicalHistory.patientId} = ${patientId}::uuid`)
    .orderBy(medicalHistory.consultationDate);

    // Fetch exam requests for this patient's medical history records using parameterized query
    const historyIds = result.map(r => r.id);
    const patientExamRequests = historyIds.length > 0 
      ? await db.select().from(examRequests).where(
          sql`${examRequests.medicalHistoryId} IN (${sql.join(historyIds.map(id => sql`${id}`), sql`, `)})`
        )
      : [];
    
    const examRequestsByHistoryId = new Map<string, typeof patientExamRequests>();
    for (const exam of patientExamRequests) {
      if (exam.medicalHistoryId) {
        const existing = examRequestsByHistoryId.get(exam.medicalHistoryId) || [];
        existing.push(exam);
        examRequestsByHistoryId.set(exam.medicalHistoryId, existing);
      }
    }

    return result.map(row => ({
      id: row.id,
      patientId: row.patientId,
      appointmentId: row.appointmentId,
      specialtyId: row.specialtyId,
      consultationDate: row.consultationDate,
      consultationTime: row.consultationTime,
      reason: row.reason,
      symptoms: row.symptoms,
      diagnosis: row.diagnosis,
      treatment: row.treatment,
      medications: row.medications,
      observations: row.observations,
      examResults: row.examResults,
      nextConsultation: row.nextConsultation,
      doctorName: row.doctorName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: row.patient ?? undefined,
      specialty: row.specialty ?? undefined,
      appointment: row.appointment ?? undefined,
      examRequests: examRequestsByHistoryId.get(row.id) || []
    }));
  }

  async getMedicalHistoryBySusCard(susCard: string): Promise<MedicalHistoryWithDetails[]> {
    // Find patient by SUS card first
    const [patient] = await db.select().from(patients).where(eq(patients.susCard, susCard));
    if (!patient) return [];
    
    return this.getMedicalHistoryByPatient(patient.id);
  }

  async getMedicalHistoryByHospitalization(hospitalizationId: string): Promise<MedicalHistoryWithDetails[]> {
    const result = await db.select({
      id: medicalHistory.id,
      patientId: medicalHistory.patientId,
      appointmentId: medicalHistory.appointmentId,
      hospitalizationId: medicalHistory.hospitalizationId,
      attendanceLocation: medicalHistory.attendanceLocation,
      specialtyId: medicalHistory.specialtyId,
      consultationDate: medicalHistory.consultationDate,
      consultationTime: medicalHistory.consultationTime,
      reason: medicalHistory.reason,
      symptoms: medicalHistory.symptoms,
      diagnosis: medicalHistory.diagnosis,
      treatment: medicalHistory.treatment,
      medications: medicalHistory.medications,
      observations: medicalHistory.observations,
      examResults: medicalHistory.examResults,
      nextConsultation: medicalHistory.nextConsultation,
      doctorName: medicalHistory.doctorName,
      doctorRegistration: medicalHistory.doctorRegistration,
      doctorRole: medicalHistory.doctorRole,
      startTime: medicalHistory.startTime,
      endTime: medicalHistory.endTime,
      createdAt: medicalHistory.createdAt,
      updatedAt: medicalHistory.updatedAt,
      patient: patients,
      specialty: specialties,
      appointment: appointments
    })
    .from(medicalHistory)
    .leftJoin(patients, sql`${medicalHistory.patientId} = ${patients.id}::uuid`)
    .leftJoin(specialties, sql`${medicalHistory.specialtyId} = ${specialties.id}::uuid`)
    .leftJoin(appointments, sql`${medicalHistory.appointmentId} = ${appointments.id}::uuid`)
    .where(sql`${medicalHistory.hospitalizationId} = ${hospitalizationId}`)
    .orderBy(desc(medicalHistory.createdAt));

    return result.map(row => ({
      id: row.id,
      patientId: row.patientId,
      appointmentId: row.appointmentId,
      hospitalizationId: row.hospitalizationId,
      attendanceLocation: row.attendanceLocation,
      specialtyId: row.specialtyId,
      consultationDate: row.consultationDate,
      consultationTime: row.consultationTime,
      reason: row.reason,
      symptoms: row.symptoms,
      diagnosis: row.diagnosis,
      treatment: row.treatment,
      medications: row.medications,
      observations: row.observations,
      examResults: row.examResults,
      nextConsultation: row.nextConsultation,
      doctorName: row.doctorName,
      doctorRegistration: row.doctorRegistration,
      doctorRole: row.doctorRole,
      startTime: row.startTime,
      endTime: row.endTime,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: row.patient ?? undefined,
      specialty: row.specialty ?? undefined,
      appointment: row.appointment ?? undefined,
      examRequests: []
    }));
  }

  async getMedicalRecord(id: string): Promise<MedicalHistoryWithDetails | undefined> {
    const result = await db.select({
      id: medicalHistory.id,
      patientId: medicalHistory.patientId,
      appointmentId: medicalHistory.appointmentId,
      specialtyId: medicalHistory.specialtyId,
      consultationDate: medicalHistory.consultationDate,
      consultationTime: medicalHistory.consultationTime,
      reason: medicalHistory.reason,
      symptoms: medicalHistory.symptoms,
      diagnosis: medicalHistory.diagnosis,
      treatment: medicalHistory.treatment,
      medications: medicalHistory.medications,
      observations: medicalHistory.observations,
      examResults: medicalHistory.examResults,
      nextConsultation: medicalHistory.nextConsultation,
      doctorName: medicalHistory.doctorName,
      createdAt: medicalHistory.createdAt,
      updatedAt: medicalHistory.updatedAt,
      patient: patients,
      specialty: specialties,
      appointment: appointments
    })
    .from(medicalHistory)
    .leftJoin(patients, sql`${medicalHistory.patientId} = ${patients.id}::uuid`)
    .leftJoin(specialties, sql`${medicalHistory.specialtyId} = ${specialties.id}::uuid`)
    .leftJoin(appointments, sql`${medicalHistory.appointmentId} = ${appointments.id}::uuid`)
    .where(sql`${medicalHistory.id} = ${id}::uuid`);

    if (result.length === 0) return undefined;

    // Fetch exam requests for this medical history record
    const recordExamRequests = await db.select().from(examRequests).where(eq(examRequests.medicalHistoryId, id));

    const row = result[0];
    return {
      id: row.id,
      patientId: row.patientId,
      appointmentId: row.appointmentId,
      specialtyId: row.specialtyId,
      consultationDate: row.consultationDate,
      consultationTime: row.consultationTime,
      reason: row.reason,
      symptoms: row.symptoms,
      diagnosis: row.diagnosis,
      treatment: row.treatment,
      medications: row.medications,
      observations: row.observations,
      examResults: row.examResults,
      nextConsultation: row.nextConsultation,
      doctorName: row.doctorName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: row.patient ?? undefined,
      specialty: row.specialty ?? undefined,
      appointment: row.appointment ?? undefined,
      examRequests: recordExamRequests
    };
  }

  async createMedicalRecord(insertRecord: InsertMedicalHistory): Promise<MedicalHistory> {
    // Converter startTime de string para Date se necessário
    const processedRecord = {
      ...insertRecord,
      startTime: insertRecord.startTime 
        ? (typeof insertRecord.startTime === 'string' ? new Date(insertRecord.startTime) : insertRecord.startTime)
        : new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const [record] = await db.insert(medicalHistory).values(processedRecord).returning();
    return record;
  }

  async updateMedicalRecord(id: string, updateData: Partial<InsertMedicalHistory>): Promise<MedicalHistory | undefined> {
    // Converter campos de timestamp de string para Date se necessário
    const processedData: any = { ...updateData };
    
    if (processedData.startTime !== undefined) {
      processedData.startTime = typeof processedData.startTime === 'string' 
        ? new Date(processedData.startTime) 
        : processedData.startTime;
    }
    if (processedData.endTime !== undefined) {
      processedData.endTime = typeof processedData.endTime === 'string' 
        ? new Date(processedData.endTime) 
        : processedData.endTime;
    }
    
    const [record] = await db.update(medicalHistory)
      .set({
        ...processedData,
        updatedAt: new Date()
      })
      .where(sql`${medicalHistory.id} = ${id}::uuid`)
      .returning();
    return record || undefined;
  }

  async deleteMedicalRecord(id: string): Promise<boolean> {
    const result = await db.delete(medicalHistory).where(sql`${medicalHistory.id} = ${id}::uuid`);
    return (result.rowCount || 0) > 0;
  }

  async getMedicalHistoryAttendanceMetrics(period: string): Promise<{
    totalConsultations: number;
    avgDuration: number | null;
    byDoctor: Array<{
      doctorName: string;
      count: number;
      avgDuration: number | null;
      totalTime: number;
    }>;
    bySpecialty: Array<{
      specialtyName: string;
      count: number;
      avgDuration: number | null;
      totalTime: number;
    }>;
  }> {
    // Define date filter based on period
    let dateFilter = sql`TRUE`;
    const today = new Date().toISOString().split('T')[0];
    
    if (period === 'today') {
      dateFilter = sql`consultation_date = ${today}`;
    } else if (period === 'week') {
      dateFilter = sql`consultation_date >= (CURRENT_DATE - INTERVAL '7 days')::text`;
    } else if (period === 'month') {
      dateFilter = sql`consultation_date >= (CURRENT_DATE - INTERVAL '30 days')::text`;
    }
    // 'all' = no date filter

    // Get overall metrics
    const overallResult = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total_consultations,
        AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)::numeric as avg_duration
      FROM medical_history
      WHERE ${dateFilter}
        AND start_time IS NOT NULL
        AND end_time IS NOT NULL
    `);

    // Get metrics by doctor
    const byDoctorResult = await db.execute(sql`
      SELECT 
        doctor_name,
        COUNT(*)::int as count,
        AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)::numeric as avg_duration,
        SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)::numeric as total_time
      FROM medical_history
      WHERE ${dateFilter}
        AND start_time IS NOT NULL
        AND end_time IS NOT NULL
      GROUP BY doctor_name
      ORDER BY count DESC
    `);

    // Get metrics by specialty
    const bySpecialtyResult = await db.execute(sql`
      SELECT 
        s.name as specialty_name,
        COUNT(mh.id)::int as count,
        AVG(EXTRACT(EPOCH FROM (mh.end_time - mh.start_time)) / 60)::numeric as avg_duration,
        SUM(EXTRACT(EPOCH FROM (mh.end_time - mh.start_time)) / 60)::numeric as total_time
      FROM medical_history mh
      JOIN specialties s ON mh.specialty_id::text = s.id
      WHERE ${dateFilter}
        AND mh.start_time IS NOT NULL
        AND mh.end_time IS NOT NULL
      GROUP BY s.name
      ORDER BY count DESC
    `);

    const overall = overallResult.rows[0] as any;

    return {
      totalConsultations: overall.total_consultations || 0,
      avgDuration: overall.avg_duration ? parseFloat(overall.avg_duration) : null,
      byDoctor: (byDoctorResult.rows as any[]).map(row => ({
        doctorName: row.doctor_name,
        count: row.count,
        avgDuration: row.avg_duration ? parseFloat(row.avg_duration) : null,
        totalTime: row.total_time ? parseFloat(row.total_time) : 0,
      })),
      bySpecialty: (bySpecialtyResult.rows as any[]).map(row => ({
        specialtyName: row.specialty_name,
        count: row.count,
        avgDuration: row.avg_duration ? parseFloat(row.avg_duration) : null,
        totalTime: row.total_time ? parseFloat(row.total_time) : 0,
      })),
    };
  }
  
  // Triage methods
  async getTriages(): Promise<Triage[]> {
    return await db.select().from(triage).orderBy(desc(triage.triageDate));
  }

  async getTriagesByPatient(patientId: string): Promise<Triage[]> {
    return await db.select().from(triage)
      .where(eq(triage.patientId, patientId))
      .orderBy(desc(triage.triageDate));
  }

  async getTriage(id: string): Promise<Triage | undefined> {
    const [result] = await db.select().from(triage).where(eq(triage.id, id));
    return result;
  }

  async createTriage(insertTriage: InsertTriage): Promise<Triage> {
    const [result] = await db.insert(triage).values(insertTriage).returning();
    return result;
  }

  async updateTriage(id: string, updateData: Partial<InsertTriage>): Promise<Triage | undefined> {
    const [result] = await db.update(triage)
      .set({ ...updateData, updatedAt: new Date() })
      .where(sql`${triage.id} = ${id}::uuid`)
      .returning();
    return result;
  }

  async deleteTriage(id: string): Promise<boolean> {
    const result = await db.delete(triage).where(sql`${triage.id} = ${id}::uuid`);
    return (result.rowCount || 0) > 0;
  }
  
  // Queue Entries methods
  async getQueueEntries(): Promise<QueueEntry[]> {
    // Retorna todas as entradas de hoje (para estatísticas)
    const today = new Date().toISOString().split('T')[0]; // formato YYYY-MM-DD
    return await db.select().from(queueEntries)
      .where(eq(queueEntries.queueDate, today))
      .orderBy(desc(queueEntries.arrivalTime));
  }

  async getActiveQueueEntries(): Promise<QueueEntry[]> {
    return await db.select().from(queueEntries)
      .where(or(
        eq(queueEntries.status, 'aguardando_triagem'),
        eq(queueEntries.status, 'aguardando'),
        eq(queueEntries.status, 'chamado'),
        eq(queueEntries.status, 'em_atendimento')
      ))
      .orderBy(queueEntries.priority, queueEntries.arrivalTime);
  }

  async getQueueEntry(id: string): Promise<QueueEntry | undefined> {
    const [result] = await db.select().from(queueEntries).where(eq(queueEntries.id, id));
    return result;
  }

  async getNextQueueNumber(): Promise<string> {
    // Pega o último número da fila de hoje
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = await db.select().from(queueEntries)
      .where(sql`DATE(${queueEntries.arrivalTime}) = ${today}`);
    
    const nextNumber = todayEntries.length + 1;
    return String(nextNumber).padStart(3, '0'); // Formato: 001, 002, etc
  }

  async createQueueEntry(insertEntry: InsertQueueEntry): Promise<QueueEntry> {
    // Gera queueNumber e queueDate automaticamente de forma atômica
    return await db.transaction(async (tx) => {
      const today = new Date().toISOString().split('T')[0];
      
      // Busca todas as entradas de hoje para gerar o próximo número
      const todayEntries = await tx.select().from(queueEntries)
        .where(eq(queueEntries.queueDate, today))
        .orderBy(desc(queueEntries.queueNumber));
      
      const nextNumber = todayEntries.length + 1;
      const queueNumber = String(nextNumber).padStart(3, '0'); // Formato: 001, 002, etc
      
      // Insere a entrada com queueNumber e queueDate gerados automaticamente
      const [result] = await tx.insert(queueEntries).values({
        ...insertEntry,
        queueNumber,
        queueDate: today,
      } as any).returning();
      
      return result;
    });
  }

  async updateQueueEntry(id: string, updateData: Partial<InsertQueueEntry>): Promise<QueueEntry | undefined> {
    const [result] = await db.update(queueEntries)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(queueEntries.id, id))
      .returning();
    return result;
  }

  async callNextPatient(doctorId: string): Promise<QueueEntry | undefined> {
    // Busca o próximo paciente na fila COM triagem completa (menor prioridade = mais urgente, depois ordem de chegada)
    const [nextPatient] = await db.select().from(queueEntries)
      .where(
        and(
          eq(queueEntries.status, 'aguardando'),
          isNotNull(queueEntries.triageId) // Apenas pacientes que já passaram pela triagem
        )
      )
      .orderBy(queueEntries.priority, queueEntries.createdAt)
      .limit(1);

    if (!nextPatient) {
      console.log(`⚠️ Nenhum paciente aguardando com triagem completa`);
      return undefined;
    }

    // Atualiza status para "chamado" e registra o horário e médico usando SQL nativo
    const result = await db.execute(sql`
      UPDATE queue_entries
      SET status = 'chamado',
          called_time = NOW(),
          doctor_id = ${doctorId},
          updated_at = NOW()
      WHERE id = ${nextPatient.id}
      RETURNING *
    `);

    return result.rows[0] as QueueEntry;
  }

  async startAttendance(id: string, doctorId: string): Promise<QueueEntry | undefined> {
    // Atualiza status para "em_atendimento" e registra médico usando SQL nativo
    const result = await db.execute(sql`
      UPDATE queue_entries
      SET status = 'em_atendimento',
          start_time = NOW(),
          doctor_id = ${doctorId},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);

    return result.rows[0] as QueueEntry;
  }

  async finishAttendance(id: string): Promise<QueueEntry | undefined> {
    // Finaliza o atendimento usando Drizzle ORM para garantir mapeamento correto
    const [updated] = await db.update(queueEntries)
      .set({
        status: 'finalizado',
        endTime: new Date(),
        updatedAt: new Date()
      })
      .where(eq(queueEntries.id, id))
      .returning();

    return updated;
  }

  async backToQueueFromAttendance(id: string): Promise<QueueEntry | undefined> {
    const [updated] = await db.update(queueEntries)
      .set({
        status: 'aguardando',
        doctorId: null,
        startTime: null,
        updatedAt: new Date()
      })
      .where(eq(queueEntries.id, id))
      .returning();

    return updated;
  }

  async cancelQueueEntry(id: string, reason: string): Promise<QueueEntry | undefined> {
    const [updated] = await db.update(queueEntries)
      .set({
        status: 'cancelado',
        cancellationReason: reason,
        updatedAt: new Date()
      })
      .where(eq(queueEntries.id, id))
      .returning();

    return updated;
  }

  async getQueueMetrics(period: string): Promise<{
    totalPatients: number;
    avgWaitTime: number | null;
    avgAttendanceTime: number | null;
    avgTotalTime: number | null;
    byPriority: Array<{
      priority: string;
      count: number;
      avgWaitTime: number | null;
      avgAttendanceTime: number | null;
    }>;
    currentlyWaiting: number;
    currentlyInAttendance: number;
  }> {
    // Define date filter based on period
    let dateFilter = sql`TRUE`;
    const today = new Date().toISOString().split('T')[0];
    
    if (period === 'today') {
      dateFilter = sql`queue_date = ${today}`;
    } else if (period === 'week') {
      dateFilter = sql`queue_date >= (CURRENT_DATE - INTERVAL '7 days')::text`;
    } else if (period === 'month') {
      dateFilter = sql`queue_date >= (CURRENT_DATE - INTERVAL '30 days')::text`;
    }
    // 'all' = no date filter

    // Get general metrics
    const metricsResult = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total_patients,
        AVG(EXTRACT(EPOCH FROM (called_time - arrival_time)) / 60)::numeric as avg_wait_time,
        AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)::numeric as avg_attendance_time,
        AVG(EXTRACT(EPOCH FROM (end_time - arrival_time)) / 60)::numeric as avg_total_time
      FROM queue_entries
      WHERE ${dateFilter}
        AND status IN ('finalizado', 'em_atendimento', 'chamado', 'aguardando')
    `);

    // Get metrics by priority
    const priorityResult = await db.execute(sql`
      SELECT 
        priority,
        COUNT(*)::int as count,
        AVG(EXTRACT(EPOCH FROM (called_time - arrival_time)) / 60)::numeric as avg_wait_time,
        AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)::numeric as avg_attendance_time
      FROM queue_entries
      WHERE ${dateFilter}
        AND status IN ('finalizado', 'em_atendimento', 'chamado', 'aguardando')
      GROUP BY priority
      ORDER BY priority
    `);

    // Get current status counts
    const currentStatusResult = await db.execute(sql`
      SELECT 
        status,
        COUNT(*)::int as count
      FROM queue_entries
      WHERE queue_date = ${today}
        AND status IN ('aguardando', 'em_atendimento', 'chamado')
      GROUP BY status
    `);

    const metrics = metricsResult.rows[0] as any;
    const currentStatus = currentStatusResult.rows as any[];
    
    const currentlyWaiting = (
      currentStatus.find(s => s.status === 'aguardando')?.count || 0
    ) + (
      currentStatus.find(s => s.status === 'chamado')?.count || 0
    );
    
    const currentlyInAttendance = currentStatus.find(s => s.status === 'em_atendimento')?.count || 0;

    return {
      totalPatients: metrics.total_patients || 0,
      avgWaitTime: metrics.avg_wait_time ? parseFloat(metrics.avg_wait_time) : null,
      avgAttendanceTime: metrics.avg_attendance_time ? parseFloat(metrics.avg_attendance_time) : null,
      avgTotalTime: metrics.avg_total_time ? parseFloat(metrics.avg_total_time) : null,
      byPriority: (priorityResult.rows as any[]).map(row => ({
        priority: row.priority,
        count: row.count,
        avgWaitTime: row.avg_wait_time ? parseFloat(row.avg_wait_time) : null,
        avgAttendanceTime: row.avg_attendance_time ? parseFloat(row.avg_attendance_time) : null,
      })),
      currentlyWaiting,
      currentlyInAttendance,
    };
  }
  
  // Specialties
  async getSpecialties(): Promise<Specialty[]> {
    return await db.select().from(specialties).where(eq(specialties.isActive, true));
  }

  async getSpecialty(id: string): Promise<Specialty | undefined> {
    const [specialty] = await db.select().from(specialties).where(eq(specialties.id, id));
    return specialty || undefined;
  }

  async createSpecialty(insertSpecialty: InsertSpecialty): Promise<Specialty> {
    const [specialty] = await db.insert(specialties).values(insertSpecialty).returning();
    return specialty;
  }

  async updateSpecialty(id: string, updatedSpecialty: Partial<InsertSpecialty>): Promise<Specialty | undefined> {
    const [specialty] = await db.update(specialties)
      .set(updatedSpecialty)
      .where(eq(specialties.id, id))
      .returning();
    return specialty || undefined;
  }

  async deleteSpecialty(id: string): Promise<boolean> {
    const result = await db.update(specialties)
      .set({ isActive: false })
      .where(eq(specialties.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Patients
  async getPatients(): Promise<Patient[]> {
    return await db.select().from(patients);
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getPatientByCpf(cpf: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.cpf, cpf));
    return patient || undefined;
  }

  async searchPatients(query: string): Promise<Patient[]> {
    return await db.select().from(patients).where(
      or(
        ilike(patients.name, `%${query}%`),
        ilike(patients.cpf, `%${query}%`)
      )
    );
  }

  async generateMedicalRecordNumber(): Promise<string> {
    const result = await db.execute(sql`
      SELECT medical_record_number FROM patients 
      WHERE medical_record_number IS NOT NULL 
      ORDER BY CAST(REPLACE(medical_record_number, 'PRONT-', '') AS INTEGER) DESC
      LIMIT 1
    `);
    
    let nextNumber = 1;
    if (result.rows.length > 0 && result.rows[0].medical_record_number) {
      const lastNumber = result.rows[0].medical_record_number as string;
      const numericPart = parseInt(lastNumber.replace('PRONT-', ''), 10);
      nextNumber = numericPart + 1;
    }
    
    return nextNumber.toString().padStart(6, '0');
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const medicalRecordNumber = await this.generateMedicalRecordNumber();
    const [patient] = await db.insert(patients).values({
      ...insertPatient,
      medicalRecordNumber
    }).returning();
    return patient;
  }

  async updatePatient(id: string, updatedPatient: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [patient] = await db.update(patients)
      .set(updatedPatient)
      .where(eq(patients.id, id))
      .returning();
    return patient || undefined;
  }

  async deletePatient(id: string): Promise<boolean> {
    const result = await db.delete(patients).where(eq(patients.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Appointments
  async getAppointments(): Promise<AppointmentWithDetails[]> {
    const result = await db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      patientName: appointments.patientName,
      patientCpf: appointments.patientCpf,
      patientSusCard: appointments.patientSusCard,
      patientWhatsapp: appointments.patientWhatsapp,
      specialtyId: appointments.specialtyId,
      appointmentDate: appointments.appointmentDate,
      appointmentTime: appointments.appointmentTime,
      reason: appointments.reason,
      status: appointments.status,
      googleCalendarEventId: appointments.googleCalendarEventId,
      createdAt: appointments.createdAt,
      patient: patients,
      specialty: specialties
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(specialties, eq(appointments.specialtyId, specialties.id))
    .orderBy(appointments.appointmentDate);

    return result.map(row => ({
      id: row.id,
      patientId: row.patientId,
      patientName: row.patientName,
      patientCpf: row.patientCpf,
      patientSusCard: row.patientSusCard,
      patientWhatsapp: row.patientWhatsapp,
      specialtyId: row.specialtyId,
      appointmentDate: row.appointmentDate,
      appointmentTime: row.appointmentTime,
      reason: row.reason,
      status: row.status,
      googleCalendarEventId: row.googleCalendarEventId,
      createdAt: row.createdAt,
      patient: row.patient || undefined,
      specialty: row.specialty || undefined
    }));
  }

  async getAppointment(id: string): Promise<AppointmentWithDetails | undefined> {
    const result = await db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      patientName: appointments.patientName,
      patientCpf: appointments.patientCpf,
      patientSusCard: appointments.patientSusCard,
      patientWhatsapp: appointments.patientWhatsapp,
      specialtyId: appointments.specialtyId,
      appointmentDate: appointments.appointmentDate,
      appointmentTime: appointments.appointmentTime,
      reason: appointments.reason,
      status: appointments.status,
      googleCalendarEventId: appointments.googleCalendarEventId,
      createdAt: appointments.createdAt,
      patient: patients,
      specialty: specialties
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(specialties, eq(appointments.specialtyId, specialties.id))
    .where(eq(appointments.id, id));

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      id: row.id,
      patientId: row.patientId,
      patientName: row.patientName,
      patientCpf: row.patientCpf,
      patientSusCard: row.patientSusCard,
      patientWhatsapp: row.patientWhatsapp,
      specialtyId: row.specialtyId,
      appointmentDate: row.appointmentDate,
      appointmentTime: row.appointmentTime,
      reason: row.reason,
      status: row.status,
      googleCalendarEventId: row.googleCalendarEventId,
      createdAt: row.createdAt,
      patient: row.patient || undefined,
      specialty: row.specialty || undefined
    };
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db.insert(appointments).values(insertAppointment).returning();
    return appointment;
  }

  async createLegacyAppointment(legacyAppointment: any): Promise<Appointment> {
    // First, create or get the patient
    let patient = await this.getPatientByCpf(legacyAppointment.patientCpf);
    
    if (!patient) {
      // Create new patient from legacy appointment data
      const newPatient: InsertPatient = {
        name: legacyAppointment.patientName,
        cpf: legacyAppointment.patientCpf,
        rg: legacyAppointment.patientRg,
        birthDate: legacyAppointment.patientBirthDate,
        gender: legacyAppointment.patientGender,
        susCard: legacyAppointment.patientSusCard,
        whatsapp: legacyAppointment.patientWhatsapp,
        address: legacyAppointment.patientAddress,
        addressNumber: legacyAppointment.patientAddressNumber,
        neighborhood: legacyAppointment.patientNeighborhood,
        zoneType: legacyAppointment.patientZoneType,
        city: legacyAppointment.patientCity,
        state: legacyAppointment.patientState,
      };
      patient = await this.createPatient(newPatient);
    }

    // Create appointment with patient ID
    const appointmentData: InsertAppointment = {
      patientId: patient.id,
      specialtyId: legacyAppointment.specialtyId,
      appointmentDate: legacyAppointment.appointmentDate,
      appointmentTime: legacyAppointment.appointmentTime,
      reason: legacyAppointment.reason,
      status: legacyAppointment.status || "scheduled",
    };

    return this.createAppointment(appointmentData);
  }

  async updateAppointment(id: string, updatedAppointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [appointment] = await db.update(appointments)
      .set(updatedAppointment)
      .where(eq(appointments.id, id))
      .returning();
    return appointment || undefined;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const result = await db.delete(appointments).where(eq(appointments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Reports methods
  async getAppointmentReports(startDate: string, endDate: string, specialtyId?: string, zoneType?: string): Promise<{
    total: number;
    completed: number;
    cancelled: number;
    rescheduled: number;
    urban: number;
    rural: number;
    specialtyBreakdown: Array<{ name: string; count: number }>;
    zoneBreakdown: Array<{ name: string; count: number; color: string }>;
    dailyData: Array<{ date: string; count: number }>;
  }> {
    const appointmentsList = await this.getAppointments();
    
    // Filter appointments by date range
    let filteredAppointments = appointmentsList.filter(apt => {
      const appointmentDate = new Date(apt.appointmentDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return appointmentDate >= start && appointmentDate <= end;
    });

    // Apply additional filters
    if (specialtyId) {
      filteredAppointments = filteredAppointments.filter(apt => apt.specialtyId === specialtyId);
    }

    if (zoneType) {
      filteredAppointments = filteredAppointments.filter(apt => {
        return apt.patient?.zoneType === zoneType;
      });
    }

    const total = filteredAppointments.length;
    
    // Count appointments by status
    const completed = filteredAppointments.filter(apt => apt.status === 'completed').length;
    const cancelled = filteredAppointments.filter(apt => apt.status === 'cancelled').length;
    const rescheduled = filteredAppointments.filter(apt => apt.status === 'rescheduled').length;
    
    // Count by zone
    let urban = 0;
    let rural = 0;
    
    filteredAppointments.forEach(apt => {
      const zone = apt.patient?.zoneType;
      if (zone === 'urbana') urban++;
      else if (zone === 'rural') rural++;
    });

    // Specialty breakdown
    const specialtyCount = new Map<string, number>();
    filteredAppointments.forEach(apt => {
      const specialtyName = apt.specialty?.name || 'Especialidade não informada';
      specialtyCount.set(specialtyName, (specialtyCount.get(specialtyName) || 0) + 1);
    });

    const specialtyBreakdown = Array.from(specialtyCount.entries()).map(([name, count]) => ({
      name,
      count
    }));

    // Zone breakdown with colors
    const zoneBreakdown = [
      { name: 'Urbana', count: urban, color: '#2563eb' },
      { name: 'Rural', count: rural, color: '#16a34a' }
    ].filter(item => item.count > 0);

    // Daily data
    const dailyCount = new Map<string, number>();
    filteredAppointments.forEach(apt => {
      const date = apt.appointmentDate;
      dailyCount.set(date, (dailyCount.get(date) || 0) + 1);
    });

    const dailyData = Array.from(dailyCount.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      total,
      completed,
      cancelled,
      rescheduled,
      urban,
      rural,
      specialtyBreakdown,
      zoneBreakdown,
      dailyData
    };
  }

  async getAttendanceReports(startDate: string, endDate: string, specialtyId?: string, doctorName?: string, zoneType?: string): Promise<{
    total: number;
    urban: number;
    rural: number;
    activeDoctors: number;
    specialtyBreakdown: Array<{ name: string; count: number }>;
    doctorBreakdown: Array<{ name: string; count: number }>;
    zoneBreakdown: Array<{ name: string; count: number; color: string }>;
    locationBreakdown: Array<{ name: string; count: number; color: string }>;
    dailyData: Array<{ date: string; count: number }>;
  }> {
    const records = await db
      .select({
        id: medicalHistory.id,
        consultationDate: medicalHistory.consultationDate,
        doctorName: medicalHistory.doctorName,
        attendanceLocation: medicalHistory.attendanceLocation,
        specialtyId: medicalHistory.specialtyId,
        specialtyName: specialties.name,
        zoneType: patients.zoneType,
      })
      .from(medicalHistory)
      .leftJoin(specialties, sql`${medicalHistory.specialtyId}::text = ${specialties.id}`)
      .leftJoin(patients, sql`${medicalHistory.patientId}::text = ${patients.id}`);

    const start = new Date(startDate);
    const end = new Date(endDate + 'T23:59:59.999Z');

    let filtered = records.filter(r => {
      const d = new Date(r.consultationDate);
      return d >= start && d <= end;
    });

    if (specialtyId) {
      filtered = filtered.filter(r => r.specialtyId === specialtyId);
    }
    if (doctorName) {
      filtered = filtered.filter(r => r.doctorName?.toLowerCase().includes(doctorName.toLowerCase()));
    }
    if (zoneType) {
      filtered = filtered.filter(r => r.zoneType === zoneType);
    }

    const total = filtered.length;

    let urban = 0;
    let rural = 0;
    filtered.forEach(r => {
      if (r.zoneType === 'urbana') urban++;
      else if (r.zoneType === 'rural') rural++;
    });

    // Specialty breakdown
    const specMap = new Map<string, number>();
    filtered.forEach(r => {
      const name = r.specialtyName || 'Não informado';
      specMap.set(name, (specMap.get(name) || 0) + 1);
    });
    const specialtyBreakdown = Array.from(specMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Doctor breakdown
    const docMap = new Map<string, number>();
    filtered.forEach(r => {
      const name = r.doctorName || 'Não informado';
      docMap.set(name, (docMap.get(name) || 0) + 1);
    });
    const doctorBreakdown = Array.from(docMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const activeDoctors = docMap.size;

    // Zone breakdown
    const zoneBreakdown = [
      { name: 'Urbana', count: urban, color: '#2563eb' },
      { name: 'Rural', count: rural, color: '#16a34a' },
    ].filter(z => z.count > 0);

    // Location breakdown
    const locMap = new Map<string, number>();
    filtered.forEach(r => {
      const loc = r.attendanceLocation || 'ambulatorio';
      locMap.set(loc, (locMap.get(loc) || 0) + 1);
    });
    const locationColors: Record<string, string> = {
      ambulatorio: '#2563eb',
      internacao: '#7c3aed',
      observacao: '#ca8a04',
      sala_vermelha: '#dc2626',
    };
    const locationLabels: Record<string, string> = {
      ambulatorio: 'Ambulatório',
      internacao: 'Internação',
      observacao: 'Observação',
      sala_vermelha: 'Sala Vermelha',
    };
    const locationBreakdown = Array.from(locMap.entries())
      .map(([loc, count]) => ({
        name: locationLabels[loc] || loc,
        count,
        color: locationColors[loc] || '#6b7280',
      }))
      .sort((a, b) => b.count - a.count);

    // Daily data
    const dailyMap = new Map<string, number>();
    filtered.forEach(r => {
      const date = r.consultationDate.split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
    });
    const dailyData = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { total, urban, rural, activeDoctors, specialtyBreakdown, doctorBreakdown, zoneBreakdown, locationBreakdown, dailyData };
  }

  async getDistinctDoctorsFromHistory(): Promise<Array<{ name: string }>> {
    const rows = await db
      .selectDistinct({ name: medicalHistory.doctorName })
      .from(medicalHistory)
      .where(sql`${medicalHistory.doctorName} IS NOT NULL AND ${medicalHistory.doctorName} != ''`)
      .orderBy(medicalHistory.doctorName);
    return rows.filter(r => r.name).map(r => ({ name: r.name! }));
  }

  // Satisfaction Surveys methods for DatabaseStorage
  async getSatisfactionSurveys(): Promise<SatisfactionSurveyWithDetails[]> {
    const result = await db.select({
      id: satisfactionSurveys.id,
      queueEntryId: satisfactionSurveys.queueEntryId,
      patientId: satisfactionSurveys.patientId,
      surveyType: satisfactionSurveys.surveyType,
      surveyToken: satisfactionSurveys.surveyToken,
      rating: satisfactionSurveys.rating,
      feedback: satisfactionSurveys.feedback,
      respondedAt: satisfactionSurveys.respondedAt,
      responseMethod: satisfactionSurveys.responseMethod,
      status: satisfactionSurveys.status,
      whatsappMessageSent: satisfactionSurveys.whatsappMessageSent,
      emailSent: satisfactionSurveys.emailSent,
      sentAt: satisfactionSurveys.sentAt,
      whatsappConversationId: satisfactionSurveys.whatsappConversationId,
      expiresAt: satisfactionSurveys.expiresAt,
      createdAt: satisfactionSurveys.createdAt,
      updatedAt: satisfactionSurveys.updatedAt,
      patient: patients
    })
    .from(satisfactionSurveys)
    .leftJoin(patients, eq(satisfactionSurveys.patientId, patients.id))
    .orderBy(desc(satisfactionSurveys.createdAt));

    return result.map(row => ({
      id: row.id,
      queueEntryId: row.queueEntryId,
      patientId: row.patientId,
      surveyType: row.surveyType,
      surveyToken: row.surveyToken,
      rating: row.rating,
      feedback: row.feedback,
      respondedAt: row.respondedAt,
      responseMethod: row.responseMethod,
      status: row.status,
      whatsappMessageSent: row.whatsappMessageSent,
      emailSent: row.emailSent,
      sentAt: row.sentAt,
      whatsappConversationId: row.whatsappConversationId,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: row.patient || undefined
    }));
  }

  async getSatisfactionSurvey(id: string): Promise<SatisfactionSurveyWithDetails | undefined> {
    const result = await db.select({
      id: satisfactionSurveys.id,
      queueEntryId: satisfactionSurveys.queueEntryId,
      patientId: satisfactionSurveys.patientId,
      surveyType: satisfactionSurveys.surveyType,
      surveyToken: satisfactionSurveys.surveyToken,
      rating: satisfactionSurveys.rating,
      feedback: satisfactionSurveys.feedback,
      respondedAt: satisfactionSurveys.respondedAt,
      responseMethod: satisfactionSurveys.responseMethod,
      status: satisfactionSurveys.status,
      whatsappMessageSent: satisfactionSurveys.whatsappMessageSent,
      emailSent: satisfactionSurveys.emailSent,
      sentAt: satisfactionSurveys.sentAt,
      whatsappConversationId: satisfactionSurveys.whatsappConversationId,
      expiresAt: satisfactionSurveys.expiresAt,
      createdAt: satisfactionSurveys.createdAt,
      updatedAt: satisfactionSurveys.updatedAt,
      patient: patients
    })
    .from(satisfactionSurveys)
    .leftJoin(patients, eq(satisfactionSurveys.patientId, patients.id))
    .where(eq(satisfactionSurveys.id, id));

    if (result.length === 0) return undefined;

    const row = result[0];

    return {
      id: row.id,
      queueEntryId: row.queueEntryId,
      patientId: row.patientId,
      surveyType: row.surveyType,
      surveyToken: row.surveyToken,
      rating: row.rating,
      feedback: row.feedback,
      respondedAt: row.respondedAt,
      responseMethod: row.responseMethod,
      status: row.status,
      whatsappMessageSent: row.whatsappMessageSent,
      emailSent: row.emailSent,
      sentAt: row.sentAt,
      whatsappConversationId: row.whatsappConversationId,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: row.patient || undefined
    };
  }

  async getSatisfactionSurveysByPatient(patientId: string): Promise<SatisfactionSurveyWithDetails[]> {
    const result = await db.select({
      id: satisfactionSurveys.id,
      queueEntryId: satisfactionSurveys.queueEntryId,
      patientId: satisfactionSurveys.patientId,
      surveyType: satisfactionSurveys.surveyType,
      surveyToken: satisfactionSurveys.surveyToken,
      rating: satisfactionSurveys.rating,
      feedback: satisfactionSurveys.feedback,
      respondedAt: satisfactionSurveys.respondedAt,
      responseMethod: satisfactionSurveys.responseMethod,
      status: satisfactionSurveys.status,
      whatsappMessageSent: satisfactionSurveys.whatsappMessageSent,
      emailSent: satisfactionSurveys.emailSent,
      sentAt: satisfactionSurveys.sentAt,
      whatsappConversationId: satisfactionSurveys.whatsappConversationId,
      expiresAt: satisfactionSurveys.expiresAt,
      createdAt: satisfactionSurveys.createdAt,
      updatedAt: satisfactionSurveys.updatedAt,
      patient: patients
    })
    .from(satisfactionSurveys)
    .leftJoin(patients, eq(satisfactionSurveys.patientId, patients.id))
    .where(eq(satisfactionSurveys.patientId, patientId))
    .orderBy(desc(satisfactionSurveys.createdAt));

    return result.map(row => ({
      id: row.id,
      queueEntryId: row.queueEntryId,
      patientId: row.patientId,
      surveyType: row.surveyType,
      surveyToken: row.surveyToken,
      rating: row.rating,
      feedback: row.feedback,
      respondedAt: row.respondedAt,
      responseMethod: row.responseMethod,
      status: row.status,
      whatsappMessageSent: row.whatsappMessageSent,
      emailSent: row.emailSent,
      sentAt: row.sentAt,
      whatsappConversationId: row.whatsappConversationId,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: row.patient || undefined
    }));
  }

  async getSatisfactionSurveysByQueueEntry(queueEntryId: string): Promise<SatisfactionSurveyWithDetails[]> {
    const result = await db.select({
      id: satisfactionSurveys.id,
      queueEntryId: satisfactionSurveys.queueEntryId,
      patientId: satisfactionSurveys.patientId,
      surveyType: satisfactionSurveys.surveyType,
      surveyToken: satisfactionSurveys.surveyToken,
      rating: satisfactionSurveys.rating,
      feedback: satisfactionSurveys.feedback,
      respondedAt: satisfactionSurveys.respondedAt,
      responseMethod: satisfactionSurveys.responseMethod,
      status: satisfactionSurveys.status,
      whatsappMessageSent: satisfactionSurveys.whatsappMessageSent,
      emailSent: satisfactionSurveys.emailSent,
      sentAt: satisfactionSurveys.sentAt,
      whatsappConversationId: satisfactionSurveys.whatsappConversationId,
      expiresAt: satisfactionSurveys.expiresAt,
      createdAt: satisfactionSurveys.createdAt,
      updatedAt: satisfactionSurveys.updatedAt,
      patient: patients
    })
    .from(satisfactionSurveys)
    .leftJoin(patients, eq(satisfactionSurveys.patientId, patients.id))
    .where(eq(satisfactionSurveys.queueEntryId, queueEntryId))
    .orderBy(desc(satisfactionSurveys.createdAt));

    return result.map(row => ({
      id: row.id,
      queueEntryId: row.queueEntryId,
      patientId: row.patientId,
      surveyType: row.surveyType,
      surveyToken: row.surveyToken,
      rating: row.rating,
      feedback: row.feedback,
      respondedAt: row.respondedAt,
      responseMethod: row.responseMethod,
      status: row.status,
      whatsappMessageSent: row.whatsappMessageSent,
      emailSent: row.emailSent,
      sentAt: row.sentAt,
      whatsappConversationId: row.whatsappConversationId,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: row.patient || undefined
    }));
  }

  async createSatisfactionSurvey(insertSurvey: InsertSatisfactionSurvey): Promise<SatisfactionSurvey> {
    // Gerar token único se não foi fornecido
    const surveyToken = insertSurvey.surveyToken || SurveyTokenService.generateToken();
    
    const [survey] = await db.insert(satisfactionSurveys).values({
      ...insertSurvey,
      surveyToken,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return survey;
  }

  async updateSatisfactionSurvey(id: string, updateData: Partial<InsertSatisfactionSurvey>): Promise<SatisfactionSurvey | undefined> {
    const [survey] = await db.update(satisfactionSurveys)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(satisfactionSurveys.id, id))
      .returning();
    return survey || undefined;
  }

  async deleteSatisfactionSurvey(id: string): Promise<boolean> {
    const result = await db.delete(satisfactionSurveys).where(eq(satisfactionSurveys.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Scheduled Messages methods for DatabaseStorage
  async getScheduledMessages(): Promise<ScheduledMessage[]> {
    return await db.select().from(scheduledMessages);
  }

  async getScheduledMessage(id: string): Promise<ScheduledMessage | undefined> {
    const [message] = await db.select().from(scheduledMessages)
      .where(eq(scheduledMessages.id, id));
    return message;
  }

  async getScheduledMessagesByStatus(status: string): Promise<ScheduledMessage[]> {
    return await db.select().from(scheduledMessages)
      .where(eq(scheduledMessages.status, status));
  }

  async getPendingScheduledMessages(): Promise<ScheduledMessage[]> {
    return await db.select().from(scheduledMessages)
      .where(sql`${scheduledMessages.status} = ${SCHEDULED_MESSAGE_STATUS.PENDING} AND ${scheduledMessages.scheduledFor} <= ${new Date()}`);
  }

  async createScheduledMessage(insertMessage: InsertScheduledMessage): Promise<ScheduledMessage> {
    const [message] = await db.insert(scheduledMessages).values({
      ...insertMessage,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return message;
  }

  async updateScheduledMessage(id: string, updateData: Partial<InsertScheduledMessage>): Promise<ScheduledMessage | undefined> {
    const [message] = await db.update(scheduledMessages)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(scheduledMessages.id, id))
      .returning();
    return message || undefined;
  }

  async deleteScheduledMessage(id: string): Promise<boolean> {
    const result = await db.delete(scheduledMessages).where(eq(scheduledMessages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Audit Log methods for DatabaseStorage
  async createAuditLog(logData: InsertAuditLog): Promise<SelectAuditLog> {
    const [auditLog] = await db.insert(auditLogs).values({
      ...logData,
      timestamp: new Date()
    }).returning();
    return auditLog;
  }

  async getAuditLogs(limit: number = 100): Promise<SelectAuditLog[]> {
    const result = await db.select().from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
    return result;
  }

  async getAuditLogsByUser(userId: string, limit: number = 50): Promise<SelectAuditLog[]> {
    const result = await db.select().from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
    return result;
  }

  async getAuditLogsByEntity(entityType: string, entityId?: string, limit: number = 50): Promise<SelectAuditLog[]> {
    const conditions = [eq(auditLogs.entityType, entityType)];
    
    if (entityId) {
      conditions.push(eq(auditLogs.entityId, entityId));
    }
    
    const result = await db.select().from(auditLogs)
      .where(conditions.length > 1 ? sql`${conditions[0]} AND ${conditions[1]}` : conditions[0])
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
    return result;
  }

  // Password Reset Token methods for DatabaseStorage
  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<SelectPasswordResetToken> {
    const [token] = await db.insert(passwordResetTokens).values({
      ...tokenData,
      createdAt: new Date()
    }).returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<SelectPasswordResetToken | undefined> {
    const [tokenData] = await db.select().from(passwordResetTokens)
      .where(sql`${passwordResetTokens.token} = ${token} 
                AND ${passwordResetTokens.expiresAt} > ${new Date()} 
                AND ${passwordResetTokens.used} = false`);
    return tokenData;
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<boolean> {
    const result = await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
    return (result.rowCount ?? 0) > 0;
  }

  async cleanupExpiredPasswordResetTokens(): Promise<void> {
    await db.delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < ${new Date()}`);
  }

  // Security Events methods for DatabaseStorage
  async createSecurityEvent(event: InsertSecurityEvent): Promise<SelectSecurityEvent> {
    const [securityEvent] = await db.insert(securityEvents).values({
      ...event,
      createdAt: new Date()
    }).returning();
    return securityEvent;
  }

  async getSecurityEvents(limit: number = 100): Promise<SelectSecurityEvent[]> {
    const result = await db.select().from(securityEvents)
      .orderBy(desc(securityEvents.createdAt))
      .limit(limit);
    return result;
  }

  async getUnresolvedSecurityEvents(): Promise<SelectSecurityEvent[]> {
    const result = await db.select().from(securityEvents)
      .where(eq(securityEvents.resolved, false))
      .orderBy(desc(securityEvents.createdAt));
    return result;
  }

  async resolveSecurityEvent(id: string, resolvedBy: string): Promise<boolean> {
    const result = await db.update(securityEvents)
      .set({
        resolved: true,
        resolvedBy,
        resolvedAt: new Date()
      })
      .where(eq(securityEvents.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async markSecurityEventAlertSent(id: string): Promise<boolean> {
    const result = await db.update(securityEvents)
      .set({ alertSent: true })
      .where(eq(securityEvents.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Login Attempts methods for DatabaseStorage
  async createLoginAttempt(attempt: InsertLoginAttempt): Promise<SelectLoginAttempt> {
    const [loginAttempt] = await db.insert(loginAttempts).values({
      ...attempt,
      attemptTime: new Date()
    }).returning();
    return loginAttempt;
  }

  async getLoginAttemptsByIP(ipAddress: string, timeWindowMinutes: number = 30): Promise<SelectLoginAttempt[]> {
    const windowStart = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    const result = await db.select().from(loginAttempts)
      .where(sql`${loginAttempts.ipAddress} = ${ipAddress} 
                AND ${loginAttempts.attemptTime} >= ${windowStart}`)
      .orderBy(desc(loginAttempts.attemptTime));
    return result;
  }

  async getLoginAttemptsByUsername(username: string, timeWindowMinutes: number = 30): Promise<SelectLoginAttempt[]> {
    const windowStart = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    const result = await db.select().from(loginAttempts)
      .where(sql`${loginAttempts.username} = ${username} 
                AND ${loginAttempts.attemptTime} >= ${windowStart}`)
      .orderBy(desc(loginAttempts.attemptTime));
    return result;
  }

  async getFailedLoginAttemptsInWindow(ipAddress: string, timeWindowMinutes: number = 30): Promise<number> {
    const windowStart = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    const result = await db.select({
      count: sql<number>`cast(count(*) as integer)`
    })
    .from(loginAttempts)
    .where(sql`${loginAttempts.ipAddress} = ${ipAddress} 
              AND ${loginAttempts.attemptTime} >= ${windowStart}
              AND ${loginAttempts.success} = false`);
    
    return result[0]?.count || 0;
  }

  async cleanupOldLoginAttempts(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    await db.delete(loginAttempts)
      .where(sql`${loginAttempts.attemptTime} < ${cutoffDate}`);
  }

  // Security Lockouts implementation - Database version
  async createSecurityLockout(lockout: InsertSecurityLockout): Promise<SelectSecurityLockout> {
    const [result] = await db.insert(securityLockouts)
      .values(lockout)
      .returning();
    return result;
  }

  async getActiveLockout(type: string, identifier: string): Promise<SelectSecurityLockout | undefined> {
    const [result] = await db.select()
      .from(securityLockouts)
      .where(sql`${securityLockouts.type} = ${type} 
                 AND ${securityLockouts.identifier} = ${identifier}
                 AND ${securityLockouts.active} = true 
                 AND ${securityLockouts.expiresAt} > NOW()`);
    return result;
  }

  async isIPBlocked(ipAddress: string): Promise<boolean> {
    const lockout = await this.getActiveLockout('IP', ipAddress);
    return !!lockout;
  }

  async isUserLocked(username: string): Promise<boolean> {
    const lockout = await this.getActiveLockout('USER', username);
    return !!lockout;
  }

  async unlockUser(username: string): Promise<boolean> {
    const result = await db.update(securityLockouts)
      .set({ active: false })
      .where(sql`${securityLockouts.type} = 'USER' 
                 AND ${securityLockouts.identifier} = ${username}
                 AND ${securityLockouts.active} = true`)
      .returning();
    return result.length > 0;
  }

  async unlockIP(ipAddress: string): Promise<boolean> {
    const result = await db.update(securityLockouts)
      .set({ active: false })
      .where(sql`${securityLockouts.type} = 'IP' 
                 AND ${securityLockouts.identifier} = ${ipAddress}
                 AND ${securityLockouts.active} = true`)
      .returning();
    return result.length > 0;
  }

  async cleanupExpiredLockouts(): Promise<void> {
    await db.delete(securityLockouts)
      .where(sql`${securityLockouts.expiresAt} <= NOW()`);
  }

  // Prescription Templates implementation - Database version
  async getPrescriptionTemplates(doctorId?: string): Promise<SelectPrescriptionTemplate[]> {
    if (doctorId) {
      return await db.select()
        .from(prescriptionTemplates)
        .where(eq(prescriptionTemplates.doctorId, doctorId))
        .orderBy(desc(prescriptionTemplates.createdAt));
    }
    return await db.select()
      .from(prescriptionTemplates)
      .orderBy(desc(prescriptionTemplates.createdAt));
  }

  async getPrescriptionTemplate(id: string): Promise<SelectPrescriptionTemplate | undefined> {
    const [template] = await db.select()
      .from(prescriptionTemplates)
      .where(eq(prescriptionTemplates.id, id));
    return template;
  }

  async createPrescriptionTemplate(template: InsertPrescriptionTemplate): Promise<SelectPrescriptionTemplate> {
    const [result] = await db.insert(prescriptionTemplates)
      .values(template)
      .returning();
    return result;
  }

  async updatePrescriptionTemplate(id: string, template: Partial<InsertPrescriptionTemplate>): Promise<SelectPrescriptionTemplate | undefined> {
    const [updated] = await db.update(prescriptionTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(prescriptionTemplates.id, id))
      .returning();
    return updated;
  }

  async deletePrescriptionTemplate(id: string): Promise<boolean> {
    const result = await db.delete(prescriptionTemplates)
      .where(eq(prescriptionTemplates.id, id))
      .returning();
    return result.length > 0;
  }

  // Medical Documents implementation - Database version
  async getMedicalDocuments(doctorId?: string, patientId?: string): Promise<any[]> {
    // Build query with LEFT JOIN to get signer's name
    const baseQuery = db
      .select({
        id: medicalDocuments.id,
        doctorId: medicalDocuments.doctorId,
        doctorName: medicalDocuments.doctorName,
        doctorCrm: medicalDocuments.doctorCrm,
        patientId: medicalDocuments.patientId,
        documentType: medicalDocuments.documentType,
        title: medicalDocuments.title,
        content: medicalDocuments.content,
        diagnosis: medicalDocuments.diagnosis,
        medications: medicalDocuments.medications,
        observations: medicalDocuments.observations,
        daysOff: medicalDocuments.daysOff,
        cid: medicalDocuments.cid,
        issueDate: medicalDocuments.issueDate,
        sentViaWhatsApp: medicalDocuments.sentViaWhatsApp,
        sentViaEmail: medicalDocuments.sentViaEmail,
        printed: medicalDocuments.printed,
        isSigned: medicalDocuments.isSigned,
        signedBy: medicalDocuments.signedBy,
        signedAt: medicalDocuments.signedAt,
        signatureHash: medicalDocuments.signatureHash,
        signatureIp: medicalDocuments.signatureIp,
        createdAt: medicalDocuments.createdAt,
        updatedAt: medicalDocuments.updatedAt,
        signedByName: users.name,
      })
      .from(medicalDocuments)
      .leftJoin(users, sql`${medicalDocuments.signedBy}::text = ${users.id}::text`);
    
    if (doctorId && patientId) {
      return await baseQuery
        .where(sql`${medicalDocuments.doctorId} = ${doctorId} AND ${medicalDocuments.patientId} = ${patientId}`)
        .orderBy(desc(medicalDocuments.createdAt));
    } else if (doctorId) {
      return await baseQuery
        .where(eq(medicalDocuments.doctorId, doctorId))
        .orderBy(desc(medicalDocuments.createdAt));
    } else if (patientId) {
      return await baseQuery
        .where(eq(medicalDocuments.patientId, patientId))
        .orderBy(desc(medicalDocuments.createdAt));
    }
    
    return await baseQuery.orderBy(desc(medicalDocuments.createdAt));
  }

  async getMedicalDocument(id: string): Promise<SelectMedicalDocument | undefined> {
    const [document] = await db.select()
      .from(medicalDocuments)
      .where(eq(medicalDocuments.id, id));
    return document;
  }

  async createMedicalDocument(document: InsertMedicalDocument): Promise<SelectMedicalDocument> {
    const [result] = await db.insert(medicalDocuments)
      .values(document)
      .returning();
    return result;
  }

  async updateMedicalDocument(id: string, document: Partial<InsertMedicalDocument>): Promise<SelectMedicalDocument | undefined> {
    const [updated] = await db.update(medicalDocuments)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(medicalDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteMedicalDocument(id: string): Promise<boolean> {
    const result = await db.delete(medicalDocuments)
      .where(eq(medicalDocuments.id, id))
      .returning();
    return result.length > 0;
  }

  // Anamnesis Templates
  async getAnamnesisTemplates(specialtyName?: string): Promise<AnamnesisTemplate[]> {
    if (specialtyName) {
      return await db.select()
        .from(anamnesisTemplates)
        .where(eq(anamnesisTemplates.specialtyName, specialtyName))
        .orderBy(desc(anamnesisTemplates.isDefault), desc(anamnesisTemplates.createdAt));
    }
    return await db.select()
      .from(anamnesisTemplates)
      .orderBy(desc(anamnesisTemplates.isDefault), desc(anamnesisTemplates.createdAt));
  }

  async getAnamnesisTemplate(id: string): Promise<AnamnesisTemplate | undefined> {
    const [template] = await db.select()
      .from(anamnesisTemplates)
      .where(eq(anamnesisTemplates.id, id));
    return template;
  }

  async createAnamnesisTemplate(template: InsertAnamnesisTemplate): Promise<AnamnesisTemplate> {
    const [result] = await db.insert(anamnesisTemplates)
      .values(template)
      .returning();
    return result;
  }

  async updateAnamnesisTemplate(id: string, template: Partial<InsertAnamnesisTemplate>): Promise<AnamnesisTemplate | undefined> {
    const [updated] = await db.update(anamnesisTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(anamnesisTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteAnamnesisTemplate(id: string): Promise<boolean> {
    const result = await db.delete(anamnesisTemplates)
      .where(eq(anamnesisTemplates.id, id))
      .returning();
    return result.length > 0;
  }

  // Clinical Protocols
  async getClinicalProtocols(filters?: { category?: string; search?: string }): Promise<ClinicalProtocol[]> {
    let query = db.select().from(clinicalProtocols).where(eq(clinicalProtocols.isActive, true));
    
    if (filters?.category) {
      query = query.where(eq(clinicalProtocols.category, filters.category)) as any;
    }
    
    const results = await query;
    
    // Apply search filter in JavaScript since we can't easily do JSONB search with Drizzle
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      return results.filter(protocol => 
        protocol.title.toLowerCase().includes(searchLower) ||
        protocol.condition.toLowerCase().includes(searchLower) ||
        protocol.description?.toLowerCase().includes(searchLower) ||
        protocol.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    return results;
  }

  async getClinicalProtocol(id: string): Promise<ClinicalProtocol | undefined> {
    const [protocol] = await db.select()
      .from(clinicalProtocols)
      .where(eq(clinicalProtocols.id, id));
    return protocol;
  }

  async createClinicalProtocol(protocol: InsertClinicalProtocol): Promise<ClinicalProtocol> {
    const [result] = await db.insert(clinicalProtocols)
      .values(protocol)
      .returning();
    return result;
  }

  async updateClinicalProtocol(id: string, protocol: Partial<InsertClinicalProtocol>): Promise<ClinicalProtocol | undefined> {
    const [updated] = await db.update(clinicalProtocols)
      .set({ ...protocol, updatedAt: new Date() })
      .where(eq(clinicalProtocols.id, id))
      .returning();
    return updated;
  }

  async deleteClinicalProtocol(id: string): Promise<boolean> {
    const result = await db.delete(clinicalProtocols)
      .where(eq(clinicalProtocols.id, id))
      .returning();
    return result.length > 0;
  }

  // Exam Requests (Radiologia/Laboratório)
  async getExamRequests(filters?: { status?: string; examType?: string; patientId?: string }): Promise<ExamRequest[]> {
    let query = db.select().from(examRequests);
    
    if (filters?.status) {
      query = query.where(eq(examRequests.status, filters.status)) as any;
    }
    if (filters?.examType) {
      query = query.where(eq(examRequests.examType, filters.examType)) as any;
    }
    if (filters?.patientId) {
      query = query.where(eq(examRequests.patientId, filters.patientId)) as any;
    }
    
    return await query.orderBy(desc(examRequests.createdAt));
  }

  async getExamRequest(id: string): Promise<ExamRequest | undefined> {
    const [request] = await db.select()
      .from(examRequests)
      .where(eq(examRequests.id, id));
    return request;
  }

  async getExamRequestsByPatient(patientId: string): Promise<ExamRequest[]> {
    return await db.select()
      .from(examRequests)
      .where(eq(examRequests.patientId, patientId))
      .orderBy(desc(examRequests.createdAt));
  }

  async getPendingExamRequests(): Promise<ExamRequest[]> {
    return await db.select()
      .from(examRequests)
      .where(eq(examRequests.status, EXAM_REQUEST_STATUS.PENDING))
      .orderBy(desc(examRequests.createdAt));
  }

  async createExamRequest(request: InsertExamRequest): Promise<ExamRequest> {
    const [result] = await db.insert(examRequests)
      .values(request)
      .returning();
    return result;
  }

  async updateExamRequest(id: string, request: Partial<InsertExamRequest>): Promise<ExamRequest | undefined> {
    const [updated] = await db.update(examRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(examRequests.id, id))
      .returning();
    return updated;
  }

  async startExamRequest(id: string, performingDoctorId: string, performingDoctorName: string): Promise<ExamRequest | undefined> {
    const [updated] = await db.update(examRequests)
      .set({
        status: EXAM_REQUEST_STATUS.IN_PROGRESS,
        performingDoctorId,
        performingDoctorName,
        startedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(examRequests.id, id))
      .returning();
    return updated;
  }

  async completeExamRequest(id: string, result: string, observations?: string, attachments?: string[]): Promise<ExamRequest | undefined> {
    const now = new Date();
    const [existing] = await db.select().from(examRequests).where(eq(examRequests.id, id));
    if (!existing) return undefined;
    
    const existingImages = existing.images || [];
    const allImages = attachments ? [...existingImages, ...attachments] : existingImages;
    
    const [updated] = await db.update(examRequests)
      .set({
        status: EXAM_REQUEST_STATUS.COMPLETED,
        result,
        observations,
        images: allImages.length > 0 ? allImages : undefined,
        resultDate: now.toISOString().split('T')[0],
        resultTime: now.toTimeString().slice(0, 5),
        completedAt: now,
        updatedAt: now
      })
      .where(eq(examRequests.id, id))
      .returning();
    return updated;
  }

  async addExamImages(id: string, images: string[]): Promise<ExamRequest | undefined> {
    const now = new Date();
    const [existing] = await db.select().from(examRequests).where(eq(examRequests.id, id));
    if (!existing) return undefined;
    
    const existingImages = existing.images || [];
    const allImages = [...existingImages, ...images];
    
    const [updated] = await db.update(examRequests)
      .set({
        images: allImages,
        status: EXAM_REQUEST_STATUS.COMPLETED,
        resultDate: now.toISOString().split('T')[0],
        resultTime: now.toTimeString().slice(0, 5),
        completedAt: now,
        updatedAt: now
      })
      .where(eq(examRequests.id, id))
      .returning();
    return updated;
  }

  async cancelExamRequest(id: string): Promise<ExamRequest | undefined> {
    const [updated] = await db.update(examRequests)
      .set({
        status: EXAM_REQUEST_STATUS.CANCELLED,
        updatedAt: new Date()
      })
      .where(eq(examRequests.id, id))
      .returning();
    return updated;
  }

  async deleteExamRequest(id: string): Promise<boolean> {
    const result = await db.delete(examRequests)
      .where(eq(examRequests.id, id))
      .returning();
    return result.length > 0;
  }

  async searchCidCodes(query: string, limit: number = 20): Promise<{ code: string; description: string }[]> {
    if (!query || query.length < 2) return [];
    
    const searchQuery = `%${query}%`;
    const results = await db.select({
      code: cidCodes.code,
      description: cidCodes.description
    })
    .from(cidCodes)
    .where(
      or(
        ilike(cidCodes.code, searchQuery),
        ilike(cidCodes.description, searchQuery)
      )
    )
    .limit(limit);
    
    return results;
  }

  // =============================================
  // MÓDULO DE ESTOQUE DE MEDICAMENTOS
  // =============================================

  // Medications Catalog
  async getMedicationsCatalog(): Promise<SelectMedicationsCatalog[]> {
    return await db.select()
      .from(medicationsCatalog)
      .where(eq(medicationsCatalog.isActive, true))
      .orderBy(medicationsCatalog.name);
  }

  async getMedicationCatalog(id: string): Promise<SelectMedicationsCatalog | undefined> {
    const [result] = await db.select()
      .from(medicationsCatalog)
      .where(eq(medicationsCatalog.id, id));
    return result;
  }

  async searchMedicationsCatalog(query: string): Promise<SelectMedicationsCatalog[]> {
    if (!query || query.length < 2) return [];
    const searchQuery = `%${query}%`;
    return await db.select()
      .from(medicationsCatalog)
      .where(
        sql`${medicationsCatalog.isActive} = true AND (
          ${medicationsCatalog.name} ILIKE ${searchQuery} OR
          ${medicationsCatalog.genericName} ILIKE ${searchQuery} OR
          ${medicationsCatalog.code} ILIKE ${searchQuery}
        )`
      )
      .orderBy(medicationsCatalog.name)
      .limit(20);
  }

  async createMedicationCatalog(medication: InsertMedicationsCatalog): Promise<SelectMedicationsCatalog> {
    const [result] = await db.insert(medicationsCatalog)
      .values(medication)
      .returning();
    return result;
  }

  async updateMedicationCatalog(id: string, medication: Partial<InsertMedicationsCatalog>): Promise<SelectMedicationsCatalog | undefined> {
    const [updated] = await db.update(medicationsCatalog)
      .set({ ...medication, updatedAt: new Date() })
      .where(eq(medicationsCatalog.id, id))
      .returning();
    return updated;
  }

  async deleteMedicationCatalog(id: string): Promise<boolean> {
    // Soft delete
    const [updated] = await db.update(medicationsCatalog)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(medicationsCatalog.id, id))
      .returning();
    return !!updated;
  }

  // Inventory Batches
  async getInventoryBatches(): Promise<(SelectInventoryBatch & { medication?: SelectMedicationsCatalog })[]> {
    const result = await db.select({
      batch: inventoryBatches,
      medication: medicationsCatalog
    })
    .from(inventoryBatches)
    .leftJoin(medicationsCatalog, eq(inventoryBatches.medicationId, medicationsCatalog.id))
    .where(sql`${inventoryBatches.status} != 'deleted'`)
    .orderBy(desc(inventoryBatches.createdAt));
    
    return result.map(r => ({
      ...r.batch,
      medication: r.medication || undefined
    }));
  }

  async getInventoryBatch(id: string): Promise<(SelectInventoryBatch & { medication?: SelectMedicationsCatalog }) | undefined> {
    const [result] = await db.select({
      batch: inventoryBatches,
      medication: medicationsCatalog
    })
    .from(inventoryBatches)
    .leftJoin(medicationsCatalog, eq(inventoryBatches.medicationId, medicationsCatalog.id))
    .where(eq(inventoryBatches.id, id));
    
    if (!result) return undefined;
    return {
      ...result.batch,
      medication: result.medication || undefined
    };
  }

  async getInventoryBatchesByMedication(medicationId: string): Promise<SelectInventoryBatch[]> {
    return await db.select()
      .from(inventoryBatches)
      .where(sql`${inventoryBatches.medicationId} = ${medicationId} AND ${inventoryBatches.status} != 'deleted'`)
      .orderBy(inventoryBatches.expirationDate);
  }

  async getLowStockBatches(): Promise<(SelectInventoryBatch & { medication?: SelectMedicationsCatalog })[]> {
    const result = await db.select({
      batch: inventoryBatches,
      medication: medicationsCatalog
    })
    .from(inventoryBatches)
    .leftJoin(medicationsCatalog, eq(inventoryBatches.medicationId, medicationsCatalog.id))
    .where(
      sql`${inventoryBatches.status} = 'active' AND 
          CAST(${inventoryBatches.quantity} AS INTEGER) <= CAST(COALESCE(${medicationsCatalog.minStock}, '10') AS INTEGER)`
    )
    .orderBy(medicationsCatalog.name);
    
    return result.map(r => ({
      ...r.batch,
      medication: r.medication || undefined
    }));
  }

  async getExpiringBatches(daysAhead: number = 30): Promise<(SelectInventoryBatch & { medication?: SelectMedicationsCatalog })[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    const result = await db.select({
      batch: inventoryBatches,
      medication: medicationsCatalog
    })
    .from(inventoryBatches)
    .leftJoin(medicationsCatalog, eq(inventoryBatches.medicationId, medicationsCatalog.id))
    .where(
      sql`${inventoryBatches.status} = 'active' AND 
          ${inventoryBatches.expirationDate} <= ${futureDateStr} AND
          CAST(${inventoryBatches.quantity} AS INTEGER) > 0`
    )
    .orderBy(inventoryBatches.expirationDate);
    
    return result.map(r => ({
      ...r.batch,
      medication: r.medication || undefined
    }));
  }

  async createInventoryBatch(batch: InsertInventoryBatch): Promise<SelectInventoryBatch> {
    const [result] = await db.insert(inventoryBatches)
      .values(batch)
      .returning();
    return result;
  }

  async updateInventoryBatch(id: string, batch: Partial<InsertInventoryBatch>): Promise<SelectInventoryBatch | undefined> {
    const [updated] = await db.update(inventoryBatches)
      .set({ ...batch, updatedAt: new Date() })
      .where(eq(inventoryBatches.id, id))
      .returning();
    return updated;
  }

  async deleteInventoryBatch(id: string, performedBy?: string, performedByName?: string): Promise<boolean> {
    // Get batch info before marking as deleted
    const batch = await this.getInventoryBatch(id);
    if (!batch) return false;
    
    const previousQuantity = batch.quantity || '0';
    
    // Create movement record for the deletion
    await this.createInventoryMovement({
      batchId: id,
      medicationId: batch.medicationId,
      movementType: 'lote_excluido',
      quantity: `-${previousQuantity}`,
      previousQuantity: previousQuantity,
      newQuantity: '0',
      referenceType: 'batch_deletion',
      reason: `Lote ${batch.batchNumber} excluído do sistema`,
      performedBy: performedBy || 'system',
      performedByName: performedByName || 'Sistema'
    });
    
    // Soft delete: mark batch as deleted instead of physically removing
    const [result] = await db.update(inventoryBatches)
      .set({ 
        status: 'deleted',
        quantity: '0',
        updatedAt: new Date()
      })
      .where(eq(inventoryBatches.id, id))
      .returning();
    
    return !!result;
  }

  // Inventory Movements
  async getInventoryMovements(limit: number = 100): Promise<(SelectInventoryMovement & { medication?: SelectMedicationsCatalog; batch?: SelectInventoryBatch })[]> {
    const result = await db.select({
      movement: inventoryMovements,
      medication: medicationsCatalog,
      batch: inventoryBatches
    })
    .from(inventoryMovements)
    .leftJoin(medicationsCatalog, eq(inventoryMovements.medicationId, medicationsCatalog.id))
    .leftJoin(inventoryBatches, eq(inventoryMovements.batchId, inventoryBatches.id))
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(limit);
    
    return result.map(r => ({
      ...r.movement,
      medication: r.medication || undefined,
      batch: r.batch || undefined
    }));
  }

  async getInventoryMovementsByBatch(batchId: string): Promise<SelectInventoryMovement[]> {
    return await db.select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.batchId, batchId))
      .orderBy(desc(inventoryMovements.createdAt));
  }

  async createInventoryMovement(movement: InsertInventoryMovement): Promise<SelectInventoryMovement> {
    const [result] = await db.insert(inventoryMovements)
      .values(movement)
      .returning();
    return result;
  }

  // Prescriptions (Structured)
  async getPrescriptions(status?: string): Promise<(SelectPrescription & { patient?: Patient })[]> {
    let query = db.select({
      prescription: prescriptions,
      patient: patients
    })
    .from(prescriptions)
    .leftJoin(patients, eq(prescriptions.patientId, patients.id));
    
    if (status) {
      query = query.where(eq(prescriptions.status, status)) as any;
    }
    
    const result = await query.orderBy(desc(prescriptions.createdAt));
    
    return result.map(r => ({
      ...r.prescription,
      patient: r.patient || undefined
    }));
  }

  async getPrescription(id: string): Promise<(SelectPrescription & { patient?: Patient; items?: SelectPrescriptionItem[] }) | undefined> {
    const [result] = await db.select({
      prescription: prescriptions,
      patient: patients
    })
    .from(prescriptions)
    .leftJoin(patients, eq(prescriptions.patientId, patients.id))
    .where(eq(prescriptions.id, id));
    
    if (!result) return undefined;
    
    const items = await db.select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, id));
    
    return {
      ...result.prescription,
      patient: result.patient || undefined,
      items
    };
  }

  async getPrescriptionsByPatient(patientId: string): Promise<SelectPrescription[]> {
    return await db.select()
      .from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt));
  }

  async getPendingPrescriptions(): Promise<(SelectPrescription & { patient?: Patient; items?: SelectPrescriptionItem[] })[]> {
    const result = await db.select({
      prescription: prescriptions,
      patient: patients
    })
    .from(prescriptions)
    .leftJoin(patients, eq(prescriptions.patientId, patients.id))
    .where(eq(prescriptions.status, 'pending'))
    .orderBy(desc(prescriptions.createdAt));
    
    // Fetch items for each prescription
    const prescriptionsWithItems = await Promise.all(
      result.map(async (r) => {
        const items = await db.select()
          .from(prescriptionItems)
          .where(eq(prescriptionItems.prescriptionId, r.prescription.id));
        
        return {
          ...r.prescription,
          patient: r.patient || undefined,
          items
        };
      })
    );
    
    return prescriptionsWithItems;
  }

  async createPrescription(prescription: InsertPrescription): Promise<SelectPrescription> {
    const [result] = await db.insert(prescriptions)
      .values(prescription)
      .returning();
    return result;
  }

  async updatePrescription(id: string, prescription: Partial<InsertPrescription>): Promise<SelectPrescription | undefined> {
    const [updated] = await db.update(prescriptions)
      .set({ ...prescription, updatedAt: new Date() })
      .where(eq(prescriptions.id, id))
      .returning();
    return updated;
  }

  async deletePrescription(id: string): Promise<boolean> {
    // First delete prescription items
    await db.delete(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, id));
    
    const result = await db.delete(prescriptions)
      .where(eq(prescriptions.id, id))
      .returning();
    return result.length > 0;
  }

  // Prescription Items
  async getPrescriptionItems(prescriptionId: string): Promise<SelectPrescriptionItem[]> {
    return await db.select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, prescriptionId));
  }

  async createPrescriptionItem(item: InsertPrescriptionItem): Promise<SelectPrescriptionItem> {
    const [result] = await db.insert(prescriptionItems)
      .values(item)
      .returning();
    return result;
  }

  async updatePrescriptionItem(id: string, item: Partial<InsertPrescriptionItem>): Promise<SelectPrescriptionItem | undefined> {
    const [updated] = await db.update(prescriptionItems)
      .set(item)
      .where(eq(prescriptionItems.id, id))
      .returning();
    return updated;
  }

  async deletePrescriptionItem(id: string): Promise<boolean> {
    const result = await db.delete(prescriptionItems)
      .where(eq(prescriptionItems.id, id))
      .returning();
    return result.length > 0;
  }

  // Dispensing Events
  async getDispensingEvents(prescriptionItemId: string): Promise<SelectDispensingEvent[]> {
    return await db.select()
      .from(dispensingEvents)
      .where(eq(dispensingEvents.prescriptionItemId, prescriptionItemId))
      .orderBy(desc(dispensingEvents.createdAt));
  }

  async createDispensingEvent(event: InsertDispensingEvent): Promise<SelectDispensingEvent> {
    const [result] = await db.insert(dispensingEvents)
      .values(event)
      .returning();
    return result;
  }

  async dispenseMedication(
    prescriptionItemId: string, 
    batchId: string, 
    quantity: string, 
    userId: string, 
    userName: string,
    patientIdParam?: string,
    patientNameParam?: string
  ): Promise<{ event: SelectDispensingEvent; movement: SelectInventoryMovement }> {
    // Get the batch
    const batch = await this.getInventoryBatch(batchId);
    if (!batch) {
      throw new Error('Lote não encontrado');
    }
    
    const currentQty = parseInt(batch.quantity || '0');
    const dispenseQty = parseInt(quantity);
    
    if (dispenseQty > currentQty) {
      throw new Error('Quantidade insuficiente no lote');
    }
    
    const newQty = currentQty - dispenseQty;
    
    // Get patient info from prescription if not provided
    let patientId = patientIdParam;
    let patientName = patientNameParam;
    
    if (!patientId || !patientName) {
      // Get prescription item to find the prescription and then the patient
      const [prescriptionItem] = await db.select()
        .from(prescriptionItems)
        .where(eq(prescriptionItems.id, prescriptionItemId));
      
      if (prescriptionItem) {
        const [prescription] = await db.select()
          .from(prescriptions)
          .where(eq(prescriptions.id, prescriptionItem.prescriptionId));
        
        if (prescription) {
          patientId = prescription.patientId;
          
          // Get patient name
          const [patient] = await db.select()
            .from(patients)
            .where(eq(patients.id, prescription.patientId));
          
          if (patient) {
            patientName = patient.name;
          }
        }
      }
    }
    
    // Update batch quantity
    await this.updateInventoryBatch(batchId, {
      quantity: newQty.toString(),
      status: newQty === 0 ? 'depleted' : (newQty <= parseInt(batch.medication?.minStock || '10') ? 'low_stock' : 'active')
    });
    
    // Create inventory movement with patient info
    const movement = await this.createInventoryMovement({
      batchId,
      medicationId: batch.medicationId,
      movementType: 'saida',
      quantity: `-${quantity}`,
      previousQuantity: currentQty.toString(),
      newQuantity: newQty.toString(),
      referenceType: 'dispensation',
      referenceId: prescriptionItemId,
      reason: 'Dispensação de medicamento',
      performedBy: userId,
      performedByName: userName,
      patientId: patientId || null,
      patientName: patientName || null
    });
    
    // Create dispensing event
    const event = await this.createDispensingEvent({
      prescriptionItemId,
      batchId,
      quantity,
      dispensedBy: userId,
      dispensedByName: userName
    });
    
    // Update prescription item quantity dispensed
    const [prescriptionItem] = await db.select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.id, prescriptionItemId));
    
    if (prescriptionItem) {
      const currentDispensed = parseInt(prescriptionItem.quantityDispensed || '0');
      const newDispensed = currentDispensed + dispenseQty;
      const prescribed = parseInt(prescriptionItem.quantityPrescribed || '0');
      
      await this.updatePrescriptionItem(prescriptionItemId, {
        quantityDispensed: newDispensed.toString(),
        status: newDispensed >= prescribed ? 'completed' : 'partial'
      });
    }
    
    return { event, movement };
  }

  // =============================================
  // MÓDULO DE INTERNAÇÃO HOSPITALAR
  // =============================================

  // Hospital Wards (Alas)
  async getHospitalWards(): Promise<SelectHospitalWard[]> {
    return await db.select()
      .from(hospitalWards)
      .where(eq(hospitalWards.isActive, true))
      .orderBy(hospitalWards.name);
  }

  async getHospitalWard(id: string): Promise<SelectHospitalWard | undefined> {
    const [ward] = await db.select()
      .from(hospitalWards)
      .where(eq(hospitalWards.id, id));
    return ward;
  }

  async getHospitalWardWithBeds(id: string): Promise<(SelectHospitalWard & { beds: SelectHospitalBed[] }) | undefined> {
    const ward = await this.getHospitalWard(id);
    if (!ward) return undefined;
    
    const beds = await db.select()
      .from(hospitalBeds)
      .where(eq(hospitalBeds.wardId, id))
      .orderBy(hospitalBeds.bedNumber);
    
    return { ...ward, beds };
  }

  async createHospitalWard(ward: InsertHospitalWard): Promise<SelectHospitalWard> {
    const [result] = await db.insert(hospitalWards)
      .values(ward)
      .returning();
    return result;
  }

  async updateHospitalWard(id: string, ward: Partial<InsertHospitalWard>): Promise<SelectHospitalWard | undefined> {
    const [updated] = await db.update(hospitalWards)
      .set({ ...ward, updatedAt: new Date() })
      .where(eq(hospitalWards.id, id))
      .returning();
    return updated;
  }

  async deleteHospitalWard(id: string): Promise<boolean> {
    const result = await db.update(hospitalWards)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(hospitalWards.id, id))
      .returning();
    return result.length > 0;
  }

  // Hospital Beds (Leitos)
  async getHospitalBeds(wardId?: string): Promise<(SelectHospitalBed & { ward?: SelectHospitalWard })[]> {
    const allBeds = await db.select()
      .from(hospitalBeds)
      .where(eq(hospitalBeds.isActive, true))
      .orderBy(hospitalBeds.wardId, hospitalBeds.bedNumber);
    
    const filteredBeds = wardId ? allBeds.filter(b => b.wardId === wardId) : allBeds;
    
    const wards = await this.getHospitalWards();
    const wardMap = new Map(wards.map(w => [w.id, w]));
    
    return filteredBeds.map(bed => ({
      ...bed,
      ward: wardMap.get(bed.wardId)
    }));
  }

  async getHospitalBed(id: string): Promise<(SelectHospitalBed & { ward?: SelectHospitalWard }) | undefined> {
    const [bed] = await db.select()
      .from(hospitalBeds)
      .where(eq(hospitalBeds.id, id));
    
    if (!bed) return undefined;
    
    const ward = await this.getHospitalWard(bed.wardId);
    return { ...bed, ward };
  }

  async getAvailableBeds(wardId?: string): Promise<(SelectHospitalBed & { ward?: SelectHospitalWard })[]> {
    const beds = await this.getHospitalBeds(wardId);
    return beds.filter(b => b.status === 'disponivel');
  }

  async getAllBedsWithDetails(wardId?: string): Promise<Array<SelectHospitalBed & { 
    ward?: SelectHospitalWard; 
    hospitalization?: SelectHospitalization & { patient?: Patient } 
  }>> {
    const beds = await this.getHospitalBeds(wardId);
    
    const activeHospitalizations = await db.select()
      .from(hospitalizations)
      .where(eq(hospitalizations.status, 'ativo'));
    
    const patientsData = await this.getPatients();
    const patientMap = new Map(patientsData.map(p => [p.id, p]));
    
    const hospitalizationMap = new Map<string, SelectHospitalization & { patient?: Patient }>();
    activeHospitalizations.forEach(h => {
      hospitalizationMap.set(h.bedId, {
        ...h,
        patient: patientMap.get(h.patientId)
      });
    });
    
    return beds.map(bed => ({
      ...bed,
      hospitalization: hospitalizationMap.get(bed.id)
    }));
  }

  async createHospitalBed(bed: InsertHospitalBed): Promise<SelectHospitalBed> {
    const [result] = await db.insert(hospitalBeds)
      .values(bed)
      .returning();
    return result;
  }

  async updateHospitalBed(id: string, bed: Partial<InsertHospitalBed>): Promise<SelectHospitalBed | undefined> {
    const [updated] = await db.update(hospitalBeds)
      .set({ ...bed, updatedAt: new Date() })
      .where(eq(hospitalBeds.id, id))
      .returning();
    return updated;
  }

  async deleteHospitalBed(id: string): Promise<boolean> {
    const result = await db.update(hospitalBeds)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(hospitalBeds.id, id))
      .returning();
    return result.length > 0;
  }

  // Hospitalizations (Internações)
  async getHospitalizations(filters?: { status?: string; wardId?: string }): Promise<(SelectHospitalization & { patient?: Patient; bed?: SelectHospitalBed & { ward?: SelectHospitalWard }; attendingDoctor?: User })[]> {
    let allHospitalizations = await db.select()
      .from(hospitalizations)
      .orderBy(desc(hospitalizations.admissionDate));
    
    if (filters?.status) {
      allHospitalizations = allHospitalizations.filter(h => h.status === filters.status);
    }
    
    const patientsData = await this.getPatients();
    const patientMap = new Map(patientsData.map(p => [p.id, p]));
    
    const usersData = await this.listUsers();
    const userMap = new Map(usersData.map(u => [u.id, u]));
    
    const bedsData = await this.getHospitalBeds();
    const bedMap = new Map(bedsData.map(b => [b.id, b]));
    
    let result = allHospitalizations.map(h => ({
      ...h,
      patient: patientMap.get(h.patientId),
      bed: bedMap.get(h.bedId),
      attendingDoctor: userMap.get(h.attendingDoctorId)
    }));
    
    if (filters?.wardId) {
      result = result.filter(h => h.bed?.wardId === filters.wardId);
    }
    
    return result;
  }

  async getHospitalization(id: string): Promise<(SelectHospitalization & { patient?: Patient; bed?: SelectHospitalBed & { ward?: SelectHospitalWard }; attendingDoctor?: User; evolutions?: SelectHospitalizationEvolution[] }) | undefined> {
    const [hospitalization] = await db.select()
      .from(hospitalizations)
      .where(eq(hospitalizations.id, id));
    
    if (!hospitalization) return undefined;
    
    const patient = await this.getPatient(hospitalization.patientId);
    const bed = await this.getHospitalBed(hospitalization.bedId);
    const doctor = await this.getUser(hospitalization.attendingDoctorId);
    const evolutions = await this.getHospitalizationEvolutions(id);
    
    return {
      ...hospitalization,
      patient,
      bed,
      attendingDoctor: doctor,
      evolutions
    };
  }

  async getHospitalizationsByPatient(patientId: string): Promise<SelectHospitalization[]> {
    return await db.select()
      .from(hospitalizations)
      .where(eq(hospitalizations.patientId, patientId))
      .orderBy(desc(hospitalizations.admissionDate));
  }

  async getActiveHospitalizations(): Promise<(SelectHospitalization & { patient?: Patient; bed?: SelectHospitalBed & { ward?: SelectHospitalWard }; attendingDoctor?: User })[]> {
    return await this.getHospitalizations({ status: 'ativo' });
  }

  async createHospitalization(hospitalization: InsertHospitalization): Promise<SelectHospitalization> {
    // Convert string dates to Date objects for Drizzle ORM
    const dataToInsert = {
      ...hospitalization,
      admissionDate: hospitalization.admissionDate 
        ? (typeof hospitalization.admissionDate === 'string' ? new Date(hospitalization.admissionDate) : hospitalization.admissionDate)
        : new Date(),
      estimatedDischargeDate: hospitalization.estimatedDischargeDate
        ? (typeof hospitalization.estimatedDischargeDate === 'string' ? new Date(hospitalization.estimatedDischargeDate) : hospitalization.estimatedDischargeDate)
        : null
    };

    const [result] = await db.insert(hospitalizations)
      .values(dataToInsert)
      .returning();
    
    // Update bed status to 'ocupado'
    await this.updateHospitalBed(hospitalization.bedId, {
      status: 'ocupado',
      currentHospitalizationId: result.id
    });
    
    return result;
  }

  async updateHospitalization(id: string, hospitalization: Partial<InsertHospitalization>): Promise<SelectHospitalization | undefined> {
    const [updated] = await db.update(hospitalizations)
      .set({ ...hospitalization, updatedAt: new Date() })
      .where(eq(hospitalizations.id, id))
      .returning();
    return updated;
  }

  async dischargePatient(id: string, dischargeData: { dischargeType: string; dischargeSummary?: string; dischargedBy: string; dischargedByName: string }): Promise<SelectHospitalization | undefined> {
    const hospitalization = await this.getHospitalization(id);
    if (!hospitalization) return undefined;
    
    // Update hospitalization with discharge info
    const [updated] = await db.update(hospitalizations)
      .set({
        status: 'alta',
        actualDischargeDate: new Date(),
        dischargeType: dischargeData.dischargeType,
        dischargeSummary: dischargeData.dischargeSummary,
        dischargedBy: dischargeData.dischargedBy,
        dischargedByName: dischargeData.dischargedByName,
        updatedAt: new Date()
      })
      .where(eq(hospitalizations.id, id))
      .returning();
    
    // Free up the bed
    await this.updateHospitalBed(hospitalization.bedId, {
      status: 'disponivel',
      currentHospitalizationId: null
    });
    
    return updated;
  }

  async deleteHospitalization(id: string): Promise<boolean> {
    const hospitalization = await this.getHospitalization(id);
    if (hospitalization) {
      // Free up the bed if hospitalization was active
      if (hospitalization.status === 'ativo') {
        await this.updateHospitalBed(hospitalization.bedId, {
          status: 'disponivel',
          currentHospitalizationId: null
        });
      }
    }
    
    // First delete evolutions
    await db.delete(hospitalizationEvolutions)
      .where(eq(hospitalizationEvolutions.hospitalizationId, id));
    
    const result = await db.delete(hospitalizations)
      .where(eq(hospitalizations.id, id))
      .returning();
    return result.length > 0;
  }

  // Hospitalization Evolutions (Evoluções)
  async getHospitalizationEvolutions(hospitalizationId: string): Promise<SelectHospitalizationEvolution[]> {
    return await db.select()
      .from(hospitalizationEvolutions)
      .where(eq(hospitalizationEvolutions.hospitalizationId, hospitalizationId))
      .orderBy(desc(hospitalizationEvolutions.evolutionDate));
  }

  async getHospitalizationEvolution(id: string): Promise<SelectHospitalizationEvolution | undefined> {
    const [evolution] = await db.select()
      .from(hospitalizationEvolutions)
      .where(eq(hospitalizationEvolutions.id, id));
    return evolution;
  }

  async createHospitalizationEvolution(evolution: InsertHospitalizationEvolution): Promise<SelectHospitalizationEvolution> {
    const [result] = await db.insert(hospitalizationEvolutions)
      .values(evolution)
      .returning();
    return result;
  }

  async updateHospitalizationEvolution(id: string, evolution: Partial<InsertHospitalizationEvolution>): Promise<SelectHospitalizationEvolution | undefined> {
    const [updated] = await db.update(hospitalizationEvolutions)
      .set(evolution)
      .where(eq(hospitalizationEvolutions.id, id))
      .returning();
    return updated;
  }

  async deleteHospitalizationEvolution(id: string): Promise<boolean> {
    const result = await db.delete(hospitalizationEvolutions)
      .where(eq(hospitalizationEvolutions.id, id))
      .returning();
    return result.length > 0;
  }

  // Hospitalization Stats
  async getHospitalizationOccupancy(): Promise<{
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    occupancyRate: number;
    byWard: Array<{
      wardId: string;
      wardName: string;
      totalBeds: number;
      occupiedBeds: number;
      availableBeds: number;
      occupancyRate: number;
    }>;
  }> {
    const beds = await this.getHospitalBeds();
    const wards = await this.getHospitalWards();
    
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter(b => b.status === 'ocupado').length;
    const availableBeds = beds.filter(b => b.status === 'disponivel').length;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    
    const byWard = wards.map(ward => {
      const wardBeds = beds.filter(b => b.wardId === ward.id);
      const wardTotal = wardBeds.length;
      const wardOccupied = wardBeds.filter(b => b.status === 'ocupado').length;
      const wardAvailable = wardBeds.filter(b => b.status === 'disponivel').length;
      
      return {
        wardId: ward.id,
        wardName: ward.name,
        totalBeds: wardTotal,
        occupiedBeds: wardOccupied,
        availableBeds: wardAvailable,
        occupancyRate: wardTotal > 0 ? Math.round((wardOccupied / wardTotal) * 100) : 0
      };
    });
    
    return {
      totalBeds,
      occupiedBeds,
      availableBeds,
      occupancyRate,
      byWard
    };
  }

  // =============================================
  // MÓDULO DE MATERIAIS HOSPITALARES
  // =============================================

  // Materials Catalog
  async getMaterialsCatalog(): Promise<SelectMaterialsCatalog[]> {
    return await db.select().from(materialsCatalog).where(eq(materialsCatalog.isActive, true));
  }

  async getMaterialCatalog(id: string): Promise<SelectMaterialsCatalog | undefined> {
    const [material] = await db.select().from(materialsCatalog).where(eq(materialsCatalog.id, id));
    return material;
  }

  async searchMaterialsCatalog(query: string): Promise<SelectMaterialsCatalog[]> {
    return await db.select()
      .from(materialsCatalog)
      .where(and(
        eq(materialsCatalog.isActive, true),
        or(
          ilike(materialsCatalog.name, `%${query}%`),
          ilike(materialsCatalog.code, `%${query}%`),
          ilike(materialsCatalog.category, `%${query}%`)
        )
      ));
  }

  async createMaterialCatalog(material: InsertMaterialsCatalog): Promise<SelectMaterialsCatalog> {
    const [result] = await db.insert(materialsCatalog).values(material).returning();
    return result;
  }

  async updateMaterialCatalog(id: string, material: Partial<InsertMaterialsCatalog>): Promise<SelectMaterialsCatalog | undefined> {
    const [updated] = await db.update(materialsCatalog)
      .set({ ...material, updatedAt: new Date() })
      .where(eq(materialsCatalog.id, id))
      .returning();
    return updated;
  }

  async deleteMaterialCatalog(id: string): Promise<boolean> {
    const [updated] = await db.update(materialsCatalog)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(materialsCatalog.id, id))
      .returning();
    return !!updated;
  }

  // Materials Batches
  async getMaterialsBatches(): Promise<(SelectMaterialsBatch & { material?: SelectMaterialsCatalog })[]> {
    const batches = await db.select()
      .from(materialsBatches)
      .orderBy(desc(materialsBatches.createdAt));
    
    const materialsData = await db.select().from(materialsCatalog);
    const materialsMap = new Map(materialsData.map(m => [m.id, m]));
    
    return batches.map(batch => ({
      ...batch,
      material: materialsMap.get(batch.materialId)
    }));
  }

  async getMaterialsBatch(id: string): Promise<(SelectMaterialsBatch & { material?: SelectMaterialsCatalog }) | undefined> {
    const [batch] = await db.select().from(materialsBatches).where(eq(materialsBatches.id, id));
    if (!batch) return undefined;
    
    const [material] = await db.select().from(materialsCatalog).where(eq(materialsCatalog.id, batch.materialId));
    return { ...batch, material };
  }

  async getMaterialsBatchesByMaterial(materialId: string): Promise<SelectMaterialsBatch[]> {
    return await db.select()
      .from(materialsBatches)
      .where(eq(materialsBatches.materialId, materialId))
      .orderBy(desc(materialsBatches.createdAt));
  }

  async getMaterialsLowStock(): Promise<(SelectMaterialsBatch & { material?: SelectMaterialsCatalog })[]> {
    const batches = await db.select()
      .from(materialsBatches)
      .where(eq(materialsBatches.status, "low_stock"));
    
    const materialsData = await db.select().from(materialsCatalog);
    const materialsMap = new Map(materialsData.map(m => [m.id, m]));
    
    return batches.map(batch => ({
      ...batch,
      material: materialsMap.get(batch.materialId)
    }));
  }

  async getMaterialsExpiring(daysAhead: number): Promise<(SelectMaterialsBatch & { material?: SelectMaterialsCatalog })[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    const batches = await db.select()
      .from(materialsBatches)
      .where(and(
        isNotNull(materialsBatches.expirationDate),
        sql`${materialsBatches.expirationDate} <= ${futureDateStr}`,
        sql`${materialsBatches.expirationDate} >= CURRENT_DATE`
      ));
    
    const materialsData = await db.select().from(materialsCatalog);
    const materialsMap = new Map(materialsData.map(m => [m.id, m]));
    
    return batches.map(batch => ({
      ...batch,
      material: materialsMap.get(batch.materialId)
    }));
  }

  async createMaterialsBatch(batch: InsertMaterialsBatch): Promise<SelectMaterialsBatch> {
    const [result] = await db.insert(materialsBatches).values(batch).returning();
    return result;
  }

  async updateMaterialsBatch(id: string, batch: Partial<InsertMaterialsBatch>): Promise<SelectMaterialsBatch | undefined> {
    const [updated] = await db.update(materialsBatches)
      .set({ ...batch, updatedAt: new Date() })
      .where(eq(materialsBatches.id, id))
      .returning();
    return updated;
  }

  async deleteMaterialsBatch(id: string): Promise<boolean> {
    const result = await db.delete(materialsBatches)
      .where(eq(materialsBatches.id, id))
      .returning();
    return result.length > 0;
  }

  // Materials Movements
  async getMaterialsMovements(limit?: number): Promise<(SelectMaterialsMovement & { material?: SelectMaterialsCatalog; batch?: SelectMaterialsBatch })[]> {
    let query = db.select()
      .from(materialsMovements)
      .orderBy(desc(materialsMovements.createdAt));
    
    const movements = limit ? await query.limit(limit) : await query;
    
    const materialsData = await db.select().from(materialsCatalog);
    const materialsMap = new Map(materialsData.map(m => [m.id, m]));
    
    const batchesData = await db.select().from(materialsBatches);
    const batchesMap = new Map(batchesData.map(b => [b.id, b]));
    
    return movements.map(mov => ({
      ...mov,
      material: materialsMap.get(mov.materialId),
      batch: batchesMap.get(mov.batchId)
    }));
  }

  async getMaterialsMovementsByBatch(batchId: string): Promise<SelectMaterialsMovement[]> {
    return await db.select()
      .from(materialsMovements)
      .where(eq(materialsMovements.batchId, batchId))
      .orderBy(desc(materialsMovements.createdAt));
  }

  async createMaterialsMovement(movement: InsertMaterialsMovement): Promise<SelectMaterialsMovement> {
    const [result] = await db.insert(materialsMovements).values(movement).returning();
    return result;
  }

  // =============================================
  // MÓDULO DE KITS DE MATERIAIS - IMPLEMENTAÇÃO
  // =============================================

  async getPharmacyKits(): Promise<SelectPharmacyKit[]> {
    return await db.select().from(pharmacyKits).orderBy(pharmacyKits.name);
  }

  async getPharmacyKit(id: string): Promise<SelectPharmacyKit | undefined> {
    const [result] = await db.select().from(pharmacyKits).where(eq(pharmacyKits.id, id));
    return result;
  }

  async createPharmacyKit(kit: InsertPharmacyKit): Promise<SelectPharmacyKit> {
    const [result] = await db.insert(pharmacyKits).values(kit).returning();
    return result;
  }

  async updatePharmacyKit(id: string, kit: Partial<InsertPharmacyKit>): Promise<SelectPharmacyKit | undefined> {
    const [updated] = await db.update(pharmacyKits)
      .set({ ...kit, updatedAt: new Date() })
      .where(eq(pharmacyKits.id, id))
      .returning();
    return updated;
  }

  async deletePharmacyKit(id: string): Promise<boolean> {
    await db.delete(pharmacyKitItems).where(eq(pharmacyKitItems.kitId, id));
    const result = await db.delete(pharmacyKits).where(eq(pharmacyKits.id, id)).returning();
    return result.length > 0;
  }

  async getPharmacyKitItems(kitId: string): Promise<(SelectPharmacyKitItem & { material?: SelectMaterialsCatalog })[]> {
    const items = await db.select().from(pharmacyKitItems).where(eq(pharmacyKitItems.kitId, kitId));
    const materials = await db.select().from(materialsCatalog);
    const materialsMap = new Map(materials.map(m => [m.id, m]));
    
    return items.map(item => ({
      ...item,
      material: materialsMap.get(item.materialId)
    }));
  }

  async createPharmacyKitItem(item: InsertPharmacyKitItem): Promise<SelectPharmacyKitItem> {
    const [result] = await db.insert(pharmacyKitItems).values(item).returning();
    return result;
  }

  async updatePharmacyKitItem(id: string, item: Partial<InsertPharmacyKitItem>): Promise<SelectPharmacyKitItem | undefined> {
    const [updated] = await db.update(pharmacyKitItems)
      .set(item)
      .where(eq(pharmacyKitItems.id, id))
      .returning();
    return updated;
  }

  async deletePharmacyKitItem(id: string): Promise<boolean> {
    const result = await db.delete(pharmacyKitItems).where(eq(pharmacyKitItems.id, id)).returning();
    return result.length > 0;
  }

  async deletePharmacyKitItemsByKit(kitId: string): Promise<boolean> {
    await db.delete(pharmacyKitItems).where(eq(pharmacyKitItems.kitId, kitId));
    return true;
  }

  async getPharmacyKitDispensations(limit?: number): Promise<(SelectPharmacyKitDispensation & { kit?: SelectPharmacyKit })[]> {
    let query = db.select().from(pharmacyKitDispensations).orderBy(desc(pharmacyKitDispensations.createdAt));
    const dispensations = limit ? await query.limit(limit) : await query;
    
    const kits = await db.select().from(pharmacyKits);
    const kitsMap = new Map(kits.map(k => [k.id, k]));
    
    return dispensations.map(disp => ({
      ...disp,
      kit: kitsMap.get(disp.kitId)
    }));
  }

  async createPharmacyKitDispensation(dispensation: InsertPharmacyKitDispensation): Promise<SelectPharmacyKitDispensation> {
    const [result] = await db.insert(pharmacyKitDispensations).values(dispensation).returning();
    return result;
  }

  async getPharmacyKitWithItems(kitId: string): Promise<PharmacyKitWithItems | undefined> {
    const kit = await this.getPharmacyKit(kitId);
    if (!kit) return undefined;
    
    const items = await this.getPharmacyKitItems(kitId);
    const batches = await db.select().from(materialsBatches);
    
    let hasStock = true;
    for (const item of items) {
      const materialBatches = batches.filter(b => b.materialId === item.materialId);
      const totalStock = materialBatches.reduce((sum, b) => sum + parseInt(b.quantity || "0"), 0);
      const requiredQty = parseInt(item.quantity || "0");
      if (totalStock < requiredQty) {
        hasStock = false;
        break;
      }
    }
    
    return {
      ...kit,
      items,
      totalMaterials: items.length,
      hasStock
    };
  }

  async getPharmacyKitsWithItems(): Promise<PharmacyKitWithItems[]> {
    const kits = await this.getPharmacyKits();
    const allItems = await db.select().from(pharmacyKitItems);
    const materials = await db.select().from(materialsCatalog);
    const batches = await db.select().from(materialsBatches);
    
    const materialsMap = new Map(materials.map(m => [m.id, m]));
    
    return kits.map(kit => {
      const kitItems = allItems.filter(item => item.kitId === kit.id).map(item => ({
        ...item,
        material: materialsMap.get(item.materialId)
      }));
      
      let hasStock = true;
      for (const item of kitItems) {
        const materialBatches = batches.filter(b => b.materialId === item.materialId);
        const totalStock = materialBatches.reduce((sum, b) => sum + parseInt(b.quantity || "0"), 0);
        const requiredQty = parseInt(item.quantity || "0");
        if (totalStock < requiredQty) {
          hasStock = false;
          break;
        }
      }
      
      return {
        ...kit,
        items: kitItems,
        totalMaterials: kitItems.length,
        hasStock
      };
    });
  }

  // =============================================
  // MÓDULO DE MATERIAIS POR MEDICAMENTO
  // =============================================

  async getMedicationMaterialRequirements(medicationId: string): Promise<MedicationMaterialRequirementWithDetails[]> {
    const requirements = await db.select().from(medicationMaterialRequirements)
      .where(and(
        eq(medicationMaterialRequirements.medicationId, medicationId),
        eq(medicationMaterialRequirements.isActive, true)
      ));
    
    const medications = await db.select().from(medicationsCatalog);
    const materials = await db.select().from(materialsCatalog);
    
    const medicationsMap = new Map(medications.map(m => [m.id, m]));
    const materialsMap = new Map(materials.map(m => [m.id, m]));
    
    return requirements.map(req => ({
      ...req,
      medication: medicationsMap.get(req.medicationId),
      material: materialsMap.get(req.materialId)
    }));
  }

  async getAllMedicationMaterialRequirements(): Promise<MedicationMaterialRequirementWithDetails[]> {
    const requirements = await db.select().from(medicationMaterialRequirements)
      .where(eq(medicationMaterialRequirements.isActive, true));
    
    const medications = await db.select().from(medicationsCatalog);
    const materials = await db.select().from(materialsCatalog);
    
    const medicationsMap = new Map(medications.map(m => [m.id, m]));
    const materialsMap = new Map(materials.map(m => [m.id, m]));
    
    return requirements.map(req => ({
      ...req,
      medication: medicationsMap.get(req.medicationId),
      material: materialsMap.get(req.materialId)
    }));
  }

  async getMedicationMaterialRequirement(id: string): Promise<SelectMedicationMaterialRequirement | undefined> {
    const [requirement] = await db.select().from(medicationMaterialRequirements)
      .where(eq(medicationMaterialRequirements.id, id));
    return requirement;
  }

  async createMedicationMaterialRequirement(requirement: InsertMedicationMaterialRequirement): Promise<SelectMedicationMaterialRequirement> {
    const [result] = await db.insert(medicationMaterialRequirements).values(requirement).returning();
    return result;
  }

  async updateMedicationMaterialRequirement(id: string, requirement: Partial<InsertMedicationMaterialRequirement>): Promise<SelectMedicationMaterialRequirement | undefined> {
    const [result] = await db.update(medicationMaterialRequirements)
      .set({ ...requirement, updatedAt: new Date() })
      .where(eq(medicationMaterialRequirements.id, id))
      .returning();
    return result;
  }

  async deleteMedicationMaterialRequirement(id: string): Promise<boolean> {
    const result = await db.update(medicationMaterialRequirements)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(medicationMaterialRequirements.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteMedicationMaterialRequirementsByMedication(medicationId: string): Promise<boolean> {
    const result = await db.update(medicationMaterialRequirements)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(medicationMaterialRequirements.medicationId, medicationId))
      .returning();
    return true;
  }

  // =============================================
  // ASSOCIAÇÕES MEDICAMENTO-KIT
  // =============================================

  async getMedicationKitAssociations(medicationId?: string): Promise<MedicationKitAssociationWithDetails[]> {
    let query = db.select().from(medicationKitAssociations);
    
    const associations = medicationId 
      ? await query.where(eq(medicationKitAssociations.medicationId, medicationId))
      : await query;
    
    const medications = await db.select().from(medicationsCatalog);
    const kits = await db.select().from(pharmacyKits);
    
    const medicationsMap = new Map(medications.map(m => [m.id, m]));
    const kitsMap = new Map(kits.map(k => [k.id, k]));
    
    return associations.map(assoc => ({
      ...assoc,
      medication: medicationsMap.get(assoc.medicationId),
      kit: kitsMap.get(assoc.kitId)
    }));
  }

  async getKitMedicationAssociations(kitId: string): Promise<MedicationKitAssociationWithDetails[]> {
    const associations = await db.select().from(medicationKitAssociations)
      .where(eq(medicationKitAssociations.kitId, kitId));
    
    const medications = await db.select().from(medicationsCatalog);
    const kits = await db.select().from(pharmacyKits);
    
    const medicationsMap = new Map(medications.map(m => [m.id, m]));
    const kitsMap = new Map(kits.map(k => [k.id, k]));
    
    return associations.map(assoc => ({
      ...assoc,
      medication: medicationsMap.get(assoc.medicationId),
      kit: kitsMap.get(assoc.kitId)
    }));
  }

  async createMedicationKitAssociation(association: InsertMedicationKitAssociation): Promise<SelectMedicationKitAssociation> {
    // Se for padrão, remover padrão dos outros
    if (association.isDefault) {
      await db.update(medicationKitAssociations)
        .set({ isDefault: false })
        .where(eq(medicationKitAssociations.medicationId, association.medicationId));
    }
    
    const [result] = await db.insert(medicationKitAssociations).values(association).returning();
    return result;
  }

  async updateMedicationKitAssociation(id: string, data: Partial<InsertMedicationKitAssociation>): Promise<SelectMedicationKitAssociation | undefined> {
    // Se for padrão, remover padrão dos outros
    if (data.isDefault) {
      const [existing] = await db.select().from(medicationKitAssociations).where(eq(medicationKitAssociations.id, id));
      if (existing) {
        await db.update(medicationKitAssociations)
          .set({ isDefault: false })
          .where(and(
            eq(medicationKitAssociations.medicationId, existing.medicationId),
            sql`id != ${id}`
          ));
      }
    }
    
    const [result] = await db.update(medicationKitAssociations)
      .set(data)
      .where(eq(medicationKitAssociations.id, id))
      .returning();
    return result;
  }

  async deleteMedicationKitAssociation(id: string): Promise<boolean> {
    const result = await db.delete(medicationKitAssociations)
      .where(eq(medicationKitAssociations.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteKitMedicationAssociations(kitId: string): Promise<boolean> {
    await db.delete(medicationKitAssociations)
      .where(eq(medicationKitAssociations.kitId, kitId));
    return true;
  }

  // =============================================
  // SOLICITAÇÕES DE PROCEDIMENTOS
  // =============================================

  async getProcedureRequests(status?: string): Promise<ProcedureRequestWithDetails[]> {
    let query = db.select().from(procedureRequests);
    
    if (status) {
      query = query.where(eq(procedureRequests.status, status)) as typeof query;
    }
    
    const requests = await query.orderBy(desc(procedureRequests.createdAt));
    
    const kits = await db.select().from(pharmacyKits);
    const allPatients = await db.select().from(patients);
    const allItems = await db.select().from(procedureRequestItems);
    const medications = await db.select().from(medicationsCatalog);
    const materials = await db.select().from(materialsCatalog);
    
    const kitsMap = new Map(kits.map(k => [k.id, k]));
    const patientsMap = new Map(allPatients.map(p => [p.id, p]));
    const medicationsMap = new Map(medications.map(m => [m.id, m]));
    const materialsMap = new Map(materials.map(m => [m.id, m]));
    
    return requests.map(req => ({
      ...req,
      kit: req.procedureKitId ? kitsMap.get(req.procedureKitId) : undefined,
      patient: patientsMap.get(req.patientId),
      items: allItems.filter(item => item.requestId === req.id).map(item => ({
        ...item,
        medication: item.medicationId ? medicationsMap.get(item.medicationId) : undefined,
        material: item.materialId ? materialsMap.get(item.materialId) : undefined
      }))
    }));
  }

  async getPendingProcedureRequests(): Promise<ProcedureRequestWithDetails[]> {
    return this.getProcedureRequests('pending');
  }

  async getCompletedProcedureRequests(): Promise<ProcedureRequestWithDetails[]> {
    return this.getProcedureRequests('completed');
  }

  async getProcedureRequest(id: string): Promise<ProcedureRequestWithDetails | undefined> {
    const [request] = await db.select().from(procedureRequests)
      .where(eq(procedureRequests.id, id));
    
    if (!request) return undefined;
    
    const kit = request.procedureKitId 
      ? (await db.select().from(pharmacyKits).where(eq(pharmacyKits.id, request.procedureKitId)))[0]
      : undefined;
    const [patient] = await db.select().from(patients)
      .where(eq(patients.id, request.patientId));
    
    const items = await db.select().from(procedureRequestItems)
      .where(eq(procedureRequestItems.requestId, id));
    const medications = await db.select().from(medicationsCatalog);
    const materials = await db.select().from(materialsCatalog);
    
    const medicationsMap = new Map(medications.map(m => [m.id, m]));
    const materialsMap = new Map(materials.map(m => [m.id, m]));
    
    return {
      ...request,
      kit,
      patient,
      items: items.map(item => ({
        ...item,
        medication: item.medicationId ? medicationsMap.get(item.medicationId) : undefined,
        material: item.materialId ? materialsMap.get(item.materialId) : undefined
      }))
    };
  }

  async createProcedureRequest(request: InsertProcedureRequest): Promise<SelectProcedureRequest> {
    const [result] = await db.insert(procedureRequests).values(request).returning();
    return result;
  }

  async updateProcedureRequest(id: string, data: Partial<InsertProcedureRequest> & { 
    processedBy?: string; 
    processedByName?: string; 
    processedAt?: Date;
    status?: string;
  }): Promise<SelectProcedureRequest | undefined> {
    const [result] = await db.update(procedureRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(procedureRequests.id, id))
      .returning();
    return result;
  }

  async completeProcedureRequest(id: string, userId: string, userName: string): Promise<SelectProcedureRequest | undefined> {
    const [result] = await db.update(procedureRequests)
      .set({ 
        status: 'completed',
        processedBy: userId,
        processedByName: userName,
        processedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(procedureRequests.id, id))
      .returning();
    return result;
  }

  async cancelProcedureRequest(id: string): Promise<SelectProcedureRequest | undefined> {
    const [result] = await db.update(procedureRequests)
      .set({ 
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(procedureRequests.id, id))
      .returning();
    return result;
  }

  async getPatientProcedureRequests(patientId: string): Promise<ProcedureRequestWithDetails[]> {
    const requests = await db.select().from(procedureRequests)
      .where(eq(procedureRequests.patientId, patientId))
      .orderBy(desc(procedureRequests.createdAt));
    
    const kits = await db.select().from(pharmacyKits);
    const kitsMap = new Map(kits.map(k => [k.id, k]));
    
    // Get all items for these requests
    const allItems = await db.select().from(procedureRequestItems);
    const medications = await db.select().from(medicationsCatalog);
    const materials = await db.select().from(materialsCatalog);
    
    const medicationsMap = new Map(medications.map(m => [m.id, m]));
    const materialsMap = new Map(materials.map(m => [m.id, m]));
    
    return requests.map(req => ({
      ...req,
      kit: req.procedureKitId ? kitsMap.get(req.procedureKitId) : undefined,
      items: allItems.filter(item => item.requestId === req.id).map(item => ({
        ...item,
        medication: item.medicationId ? medicationsMap.get(item.medicationId) : undefined,
        material: item.materialId ? materialsMap.get(item.materialId) : undefined
      }))
    }));
  }

  // =============================================
  // MÓDULO DE KITS DE PROCEDIMENTO
  // =============================================

  async getProcedureKits(): Promise<SelectProcedureKit[]> {
    return await db.select().from(procedureKits)
      .where(eq(procedureKits.isActive, true))
      .orderBy(procedureKits.name);
  }

  async getProcedureKit(id: string): Promise<ProcedureKitWithItems | undefined> {
    const [kit] = await db.select().from(procedureKits)
      .where(eq(procedureKits.id, id));
    
    if (!kit) return undefined;
    
    const kitItems = await db.select().from(procedureKitItems)
      .where(eq(procedureKitItems.kitId, id));
    
    const medications = await db.select().from(medicationsCatalog);
    const materials = await db.select().from(materialsCatalog);
    
    const medicationsMap = new Map(medications.map(m => [m.id, m]));
    const materialsMap = new Map(materials.map(m => [m.id, m]));
    
    return {
      ...kit,
      items: kitItems.map(item => ({
        ...item,
        medication: item.medicationId ? medicationsMap.get(item.medicationId) : undefined,
        material: item.materialId ? materialsMap.get(item.materialId) : undefined
      }))
    };
  }

  async createProcedureKit(kit: InsertProcedureKit): Promise<SelectProcedureKit> {
    const [result] = await db.insert(procedureKits).values(kit).returning();
    return result;
  }

  async updateProcedureKit(id: string, data: Partial<InsertProcedureKit>): Promise<SelectProcedureKit | undefined> {
    const [result] = await db.update(procedureKits)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(procedureKits.id, id))
      .returning();
    return result;
  }

  async deleteProcedureKit(id: string): Promise<boolean> {
    const [result] = await db.update(procedureKits)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(procedureKits.id, id))
      .returning();
    return !!result;
  }

  async getProcedureKitItems(kitId: string): Promise<SelectProcedureKitItem[]> {
    return await db.select().from(procedureKitItems)
      .where(eq(procedureKitItems.kitId, kitId));
  }

  async addProcedureKitItem(item: InsertProcedureKitItem): Promise<SelectProcedureKitItem> {
    const [result] = await db.insert(procedureKitItems).values(item).returning();
    return result;
  }

  async removeProcedureKitItem(id: string): Promise<boolean> {
    const result = await db.delete(procedureKitItems)
      .where(eq(procedureKitItems.id, id))
      .returning();
    return result.length > 0;
  }

  // =============================================
  // ITENS DE SOLICITAÇÃO DE PROCEDIMENTO
  // =============================================

  async getProcedureRequestItems(requestId: string): Promise<ProcedureRequestItemWithDetails[]> {
    const items = await db.select().from(procedureRequestItems)
      .where(eq(procedureRequestItems.requestId, requestId));
    
    const medications = await db.select().from(medicationsCatalog);
    const materials = await db.select().from(materialsCatalog);
    
    const medicationsMap = new Map(medications.map(m => [m.id, m]));
    const materialsMap = new Map(materials.map(m => [m.id, m]));
    
    return items.map(item => ({
      ...item,
      medication: item.medicationId ? medicationsMap.get(item.medicationId) : undefined,
      material: item.materialId ? materialsMap.get(item.materialId) : undefined
    }));
  }

  async createProcedureRequestItem(item: InsertProcedureRequestItem): Promise<SelectProcedureRequestItem> {
    const [result] = await db.insert(procedureRequestItems).values(item).returning();
    return result;
  }

  async updateProcedureRequestItemStatus(id: string, status: string, userId: string, userName: string): Promise<SelectProcedureRequestItem | undefined> {
    const [result] = await db.update(procedureRequestItems)
      .set({ 
        status, 
        processedBy: userId, 
        processedByName: userName,
        processedAt: new Date()
      })
      .where(eq(procedureRequestItems.id, id))
      .returning();
    return result;
  }

  async completeProcedureRequestItem(id: string, userId: string, userName: string, batchId?: string, quantityToDispense?: number): Promise<SelectProcedureRequestItem | undefined> {
    // Get the item first to know what to deduct from stock
    const [item] = await db.select().from(procedureRequestItems)
      .where(eq(procedureRequestItems.id, id));
    
    if (!item) return undefined;
    
    // Use provided quantity or default to item's requested quantity
    const qtyToDeduct = quantityToDispense ?? parseInt(item.quantity || '1');
    
    // Deduct from stock based on item type
    if (item.itemType === 'material' && item.materialId) {
      if (batchId) {
        // User selected a specific batch
        const [batch] = await db.select().from(materialsBatches)
          .where(eq(materialsBatches.id, batchId));
        
        if (batch) {
          const currentStock = parseInt(batch.currentQuantity || '0');
          const deductQty = Math.min(qtyToDeduct, currentStock);
          const newStock = currentStock - deductQty;
          
          await db.update(materialsBatches)
            .set({ 
              currentQuantity: newStock.toString(),
              status: newStock <= parseInt(batch.minimumQuantity || '0') ? 'low_stock' : 'available'
            })
            .where(eq(materialsBatches.id, batch.id));
          
          await db.insert(materialsMovements).values({
            materialId: item.materialId,
            batchId: batch.id,
            movementType: 'dispense',
            quantity: deductQty.toString(),
            reason: `Procedimento - ${item.itemName}`,
            performedBy: userId,
            performedByName: userName
          });
        }
      } else {
        // FIFO - oldest first by expiration
        const batches = await db.select().from(materialsBatches)
          .where(eq(materialsBatches.materialId, item.materialId))
          .orderBy(materialsBatches.expirationDate);
        
        let remainingQty = qtyToDeduct;
        
        for (const batch of batches) {
          if (remainingQty <= 0) break;
          
          const currentStock = parseInt(batch.currentQuantity || '0');
          if (currentStock <= 0) continue;
          
          const deductQty = Math.min(remainingQty, currentStock);
          const newStock = currentStock - deductQty;
          
          await db.update(materialsBatches)
            .set({ 
              currentQuantity: newStock.toString(),
              status: newStock <= parseInt(batch.minimumQuantity || '0') ? 'low_stock' : 'available'
            })
            .where(eq(materialsBatches.id, batch.id));
          
          await db.insert(materialsMovements).values({
            materialId: item.materialId,
            batchId: batch.id,
            movementType: 'dispense',
            quantity: deductQty.toString(),
            reason: `Procedimento - ${item.itemName}`,
            performedBy: userId,
            performedByName: userName
          });
          
          remainingQty -= deductQty;
        }
      }
    } else if (item.itemType === 'medication' && item.medicationId) {
      if (batchId) {
        // User selected a specific batch
        const [batch] = await db.select().from(inventoryBatches)
          .where(eq(inventoryBatches.id, batchId));
        
        if (batch) {
          const currentStock = batch.currentQuantity || 0;
          const deductQty = Math.min(qtyToDeduct, currentStock);
          const newStock = currentStock - deductQty;
          
          await db.update(inventoryBatches)
            .set({ 
              currentQuantity: newStock,
              status: newStock <= (batch.minimumQuantity || 0) ? 'low_stock' : 'available'
            })
            .where(eq(inventoryBatches.id, batch.id));
          
          await db.insert(inventoryMovements).values({
            medicationId: item.medicationId,
            batchId: batch.id,
            movementType: 'dispense',
            quantity: deductQty,
            previousQuantity: currentStock,
            newQuantity: newStock,
            reason: `Procedimento - ${item.itemName}`,
            performedBy: userId,
            performedByName: userName
          });
        }
      } else {
        // FIFO - oldest first by expiration
        const batches = await db.select().from(inventoryBatches)
          .where(eq(inventoryBatches.medicationId, item.medicationId))
          .orderBy(inventoryBatches.expirationDate);
        
        let remainingQty = qtyToDeduct;
        
        for (const batch of batches) {
          if (remainingQty <= 0) break;
          
          const currentStock = batch.currentQuantity || 0;
          if (currentStock <= 0) continue;
          
          const deductQty = Math.min(remainingQty, currentStock);
          const newStock = currentStock - deductQty;
          
          await db.update(inventoryBatches)
            .set({ 
              currentQuantity: newStock,
              status: newStock <= (batch.minimumQuantity || 0) ? 'low_stock' : 'available'
            })
            .where(eq(inventoryBatches.id, batch.id));
          
          await db.insert(inventoryMovements).values({
            medicationId: item.medicationId,
            batchId: batch.id,
            movementType: 'dispense',
            quantity: deductQty,
            previousQuantity: currentStock,
            newQuantity: newStock,
            reason: `Procedimento - ${item.itemName}`,
            performedBy: userId,
            performedByName: userName
          });
          
          remainingQty -= deductQty;
        }
      }
    }
    
    const result = await this.updateProcedureRequestItemStatus(id, 'completed', userId, userName);
    
    // Check if all items in this request are now completed
    if (result && item.requestId) {
      const allItems = await db.select().from(procedureRequestItems)
        .where(eq(procedureRequestItems.requestId, item.requestId));
      
      const allCompleted = allItems.every(i => i.status === 'completed' || i.id === id);
      
      if (allCompleted) {
        // Automatically mark the request as completed
        await this.completeProcedureRequest(item.requestId, userId, userName);
      }
    }
    
    return result;
  }

  async createProcedureRequestWithItems(request: InsertProcedureRequest, items: InsertProcedureRequestItem[]): Promise<SelectProcedureRequest> {
    const [createdRequest] = await db.insert(procedureRequests).values(request).returning();
    
    if (items && items.length > 0) {
      const itemsWithRequestId = items.map(item => ({
        ...item,
        requestId: createdRequest.id
      }));
      await db.insert(procedureRequestItems).values(itemsWithRequestId);
    }
    
    return createdRequest;
  }
}

export const storage = new DatabaseStorage();
