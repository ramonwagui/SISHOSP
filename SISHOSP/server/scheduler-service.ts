/**
 * Scheduler Service - Processa mensagens agendadas do WhatsApp
 * Verifica periodicamente se há mensagens pendentes para enviar
 */

import { db } from "./db";
import { scheduledMessages, patients, queueEntries, users, satisfactionSurveys, SCHEDULED_MESSAGE_STATUS, SATISFACTION_SURVEY_STATUS } from "@shared/schema";
import { whatsappService } from "./whatsappService";
import { EmailService } from "./emailService";
import { eq, and, lte, sql } from "drizzle-orm";

export class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  
  /**
   * Inicia o scheduler (executa a cada 1 minuto)
   */
  start() {
    if (this.intervalId) {
      console.log("⚠️  Scheduler already running");
      return;
    }

    console.log("🚀 Starting WhatsApp Scheduler Service...");
    
    // Executa imediatamente e depois a cada 1 minuto
    this.processScheduledMessages().catch(console.error);
    
    this.intervalId = setInterval(() => {
      this.processScheduledMessages().catch(console.error);
    }, 60 * 1000); // 1 minuto

    console.log("✅ WhatsApp Scheduler Service started");
  }

  /**
   * Para o scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("🛑 WhatsApp Scheduler Service stopped");
    }
  }

  /**
   * Processa todas as mensagens pendentes
   */
  async processScheduledMessages() {
    if (this.isProcessing) {
      console.log("⏭️  Skipping scheduler cycle - already processing");
      return;
    }

    this.isProcessing = true;

    try {
      // Busca mensagens pendentes que já devem ser enviadas
      const pendingMessages = await db
        .select({
          message: scheduledMessages,
          patient: patients,
          queue: queueEntries,
          doctor: users
        })
        .from(scheduledMessages)
        .innerJoin(patients, eq(scheduledMessages.patientId, patients.id))
        .innerJoin(queueEntries, eq(scheduledMessages.queueEntryId, queueEntries.id))
        .leftJoin(users, eq(queueEntries.doctorId, users.id))
        .where(
          and(
            eq(scheduledMessages.status, SCHEDULED_MESSAGE_STATUS.PENDING),
            lte(scheduledMessages.scheduledFor, new Date())
          )
        );

      if (pendingMessages.length === 0) {
        return; // Sem mensagens para processar
      }

      console.log(`📬 Processing ${pendingMessages.length} scheduled messages...`);

      for (const { message, patient, queue, doctor } of pendingMessages) {
        try {
          await this.processMessage(message, patient, queue, doctor);
        } catch (error) {
          console.error(`❌ Error processing message ${message.id}:`, error);
        }
      }

      console.log(`✅ Processed ${pendingMessages.length} messages`);
    } catch (error) {
      console.error("❌ Error in scheduler:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Processa uma mensagem individual
   */
  private async processMessage(
    message: any,
    patient: any,
    queue: any,
    doctor: any | null
  ) {
    const { messageType, id } = message;
    const { whatsapp, name, phoneIsWhatsapp } = patient;
    const { queueNumber } = queue;
    const healthUnit = patient.healthUnit || "Exu Saúde";
    const doctorName = doctor?.name || "Equipe Médica";

    let result = null;

    if (!whatsappService) {
      console.warn("⚠️  WhatsApp service not configured, cannot send message");
      return;
    }

    // Verifica se o telefone do paciente está marcado como WhatsApp
    if (phoneIsWhatsapp === false) {
      console.log(`⏭️  Skipping WhatsApp message for ${name} - phone is not WhatsApp`);
      // Marca mensagem como cancelada pois telefone não é WhatsApp
      await db
        .update(scheduledMessages)
        .set({
          status: SCHEDULED_MESSAGE_STATUS.CANCELLED,
          errorMessage: "Telefone do paciente não é WhatsApp",
          updatedAt: new Date()
        })
        .where(eq(scheduledMessages.id, id));
      return;
    }

    try {
      switch (messageType) {
        case "queue_confirmation":
          result = await whatsappService.sendQueueConfirmation(
            whatsapp,
            queueNumber,
            name,
            healthUnit,
            "Atendimento Geral"
          );
          break;

        case "receptionist_survey":
          result = await whatsappService.sendReceptionistSurvey(
            whatsapp,
            name,
            queueNumber
          );
          
          // Também enviar email com link da pesquisa (se tiver email e surveyToken)
          await this.sendSurveyEmail(message, patient, queue, "receptionist_satisfaction");
          break;

        case "doctor_survey":
          result = await whatsappService.sendDoctorSurvey(
            whatsapp,
            name,
            queueNumber,
            doctorName
          );
          
          // Também enviar email com link da pesquisa (se tiver email e surveyToken)
          await this.sendSurveyEmail(message, patient, queue, "doctor_satisfaction", doctorName);
          break;

        default:
          console.warn(`⚠️  Unknown message type: ${messageType}`);
          return;
      }

      // Atualiza status da mensagem
      if (result) {
        await db
          .update(scheduledMessages)
          .set({
            status: SCHEDULED_MESSAGE_STATUS.SENT,
            sentAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(scheduledMessages.id, id));

        console.log(`✅ Sent ${messageType} to ${name} (${queueNumber})`);
      } else {
        // Falha ao enviar
        await db
          .update(scheduledMessages)
          .set({
            status: SCHEDULED_MESSAGE_STATUS.ERROR,
            errorMessage: "Failed to send WhatsApp message",
            updatedAt: new Date()
          })
          .where(eq(scheduledMessages.id, id));

        console.error(`❌ Failed to send ${messageType} to ${name}`);
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${messageType}:`, error);

      // Marca como erro
      await db
        .update(scheduledMessages)
        .set({
          status: SCHEDULED_MESSAGE_STATUS.ERROR,
          errorMessage: error.message || "Unknown error",
          updatedAt: new Date()
        })
        .where(eq(scheduledMessages.id, id));
    }
  }

  /**
   * Envia email com link da pesquisa de satisfação
   */
  private async sendSurveyEmail(
    message: any,
    patient: any,
    queue: any,
    surveyType: "receptionist_satisfaction" | "doctor_satisfaction",
    doctorName?: string
  ) {
    try {
      // Verificar se o paciente tem email
      if (!patient.email) {
        console.log(`⚠️  Patient ${patient.name} has no email, skipping survey email`);
        return;
      }

      // Buscar a pesquisa de satisfação relacionada
      const [survey] = await db
        .select()
        .from(satisfactionSurveys)
        .where(
          and(
            eq(satisfactionSurveys.queueEntryId, queue.id),
            eq(satisfactionSurveys.surveyType, surveyType)
          )
        )
        .limit(1);

      if (!survey) {
        console.log(`⚠️  No survey found for queue ${queue.queueNumber} and type ${surveyType}`);
        return;
      }

      // Verificar se já foi enviado email
      if (survey.emailSent) {
        console.log(`⏭️  Survey email already sent for ${survey.id}`);
        return;
      }

      // Verificar se tem token
      if (!survey.surveyToken) {
        console.log(`⚠️  Survey ${survey.id} has no token, cannot send email`);
        return;
      }

      // Enviar email com link da pesquisa
      const emailSent = await EmailService.sendSurveyEmail({
        patientName: patient.name,
        patientEmail: patient.email,
        queueNumber: queue.queueNumber,
        surveyToken: survey.surveyToken,
        surveyType: surveyType,
        doctorName: doctorName
      });

      // Atualizar flag de email enviado
      if (emailSent) {
        await db
          .update(satisfactionSurveys)
          .set({
            emailSent: true,
            updatedAt: new Date()
          })
          .where(eq(satisfactionSurveys.id, survey.id));

        console.log(`✅ Survey email sent for ${survey.surveyType} to ${patient.email}`);
      }
    } catch (error) {
      console.error(`❌ Error sending survey email:`, error);
      // Não lançar erro para não bloquear o processamento do WhatsApp
    }
  }

  /**
   * Verifica se o serviço está rodando
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();
