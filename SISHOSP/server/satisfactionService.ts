import { storage } from "./storage";
import { whatsappService } from "./whatsappService";
import { type SatisfactionSurvey, type InsertSatisfactionSurvey, type SurveyTemplate, type InsertSurveyTemplate, SATISFACTION_SURVEY_STATUS } from "@shared/schema";

export interface SurveyQuestionTemplate {
  id: string;
  type: "rating" | "comment" | "nps";
  question: string;
  required: boolean;
  options?: string[];
}

export interface SatisfactionSurveyService {
  // Survey Management
  createPreConsultationSurvey(patientId: string, appointmentId?: string): Promise<SatisfactionSurvey>;
  createPostConsultationSurvey(patientId: string, appointmentId: string): Promise<SatisfactionSurvey>;
  updateSurveyResponse(surveyId: string, responses: Partial<InsertSatisfactionSurvey>): Promise<SatisfactionSurvey | undefined>;
  
  // WhatsApp Integration
  sendSurveyViaWhatsApp(surveyId: string): Promise<boolean>;
  processSurveyResponseFromWhatsApp(conversationId: string, response: string): Promise<boolean>;
  
  // Template Management
  getDefaultTemplates(): Promise<SurveyTemplate[]>;
  createCustomTemplate(template: InsertSurveyTemplate): Promise<SurveyTemplate>;
  
  // Analytics
  getSurveyAnalytics(startDate?: string, endDate?: string): Promise<{
    totalSurveys: number;
    completedSurveys: number;
    averageRatings: {
      attendance: number;
      doctor: number;
      treatment: number;
      facilities: number;
      general: number;
      nps: number;
    };
    responseRate: number;
  }>;
}

class SatisfactionServiceImpl implements SatisfactionSurveyService {
  
  async createPreConsultationSurvey(patientId: string, appointmentId?: string): Promise<SatisfactionSurvey> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // Expires in 7 days
    
    const surveyData: InsertSatisfactionSurvey = {
      patientId,
      appointmentId: appointmentId || null,
      surveyType: "pre_consultation",
      status: "pending",
      expiresAt: expirationDate,
    };
    
    return await storage.createSatisfactionSurvey(surveyData);
  }
  
  async createPostConsultationSurvey(patientId: string, appointmentId: string): Promise<SatisfactionSurvey> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 3); // Expires in 3 days
    
    const surveyData: InsertSatisfactionSurvey = {
      patientId,
      appointmentId,
      surveyType: "post_consultation",
      status: "pending",
      expiresAt: expirationDate,
    };
    
    return await storage.createSatisfactionSurvey(surveyData);
  }
  
  async updateSurveyResponse(surveyId: string, responses: Partial<InsertSatisfactionSurvey>): Promise<SatisfactionSurvey | undefined> {
    const updatedData = {
      ...responses,
      status: "completed" as const,
      completedAt: new Date(),
      updatedAt: new Date(),
    };
    
    return await storage.updateSatisfactionSurvey(surveyId, updatedData);
  }
  
  async sendSurveyViaWhatsApp(surveyId: string): Promise<boolean> {
    try {
      const survey = await storage.getSatisfactionSurvey(surveyId);
      if (!survey || !survey.patient) {
        console.error("Survey or patient not found:", surveyId);
        return false;
      }
      
      // Verificar se pesquisa já expirou
      if (survey.expiresAt && new Date() > new Date(survey.expiresAt)) {
        console.error("Survey expired:", surveyId);
        await storage.updateSatisfactionSurvey(surveyId, { status: "expired" });
        return false;
      }
      
      const patient = survey.patient;
      
      let message = "";
      if (survey.surveyType === "pre_consultation") {
        message = this.generatePreConsultationMessage(patient.name, survey.id);
      } else {
        message = this.generatePostConsultationMessage(patient.name, survey.id);
      }
      
      if (!whatsappService) {
        console.error("WhatsApp service not available");
        return false;
      }
      
      // Usar o formatador do WhatsApp service se disponível
      const formattedNumber = (whatsappService as any).formatPhoneNumber ? 
        (whatsappService as any).formatPhoneNumber(patient.whatsapp) : 
        patient.whatsapp.replace(/\D/g, '');
      
      const whatsappMessage = {
        messaging_product: 'whatsapp' as const,
        to: formattedNumber,
        type: 'text' as const,
        text: { body: message }
      };
      
      const success = await whatsappService.sendMessage(whatsappMessage);
      
      if (success) {
        await storage.updateSatisfactionSurvey(surveyId, {
          whatsappMessageSent: true,
          sentAt: new Date(),
          whatsappConversationId: `survey_${surveyId}_${Date.now()}`,
        });
      }
      
      return success;
    } catch (error) {
      console.error("Error sending survey via WhatsApp:", error);
      return false;
    }
  }
  
  private generatePreConsultationMessage(patientName: string, surveyId: string): string {
    return `🏥 *Exu Saúde - Sistema de Atendimento Médico*

Olá ${patientName}! 

Esperamos que seu atendimento de marcação de consulta tenha sido satisfatório. 

Sua opinião é muito importante para melhorarmos nossos serviços! Por favor, responda nossa breve pesquisa de satisfação:

📝 *Avalie nosso atendimento de 1 a 5 estrelas:*

⭐ 1 - Muito insatisfeito
⭐⭐ 2 - Insatisfeito  
⭐⭐⭐ 3 - Neutro
⭐⭐⭐⭐ 4 - Satisfeito
⭐⭐⭐⭐⭐ 5 - Muito satisfeito

Responda apenas com o número de estrelas (1-5).

ID da pesquisa: ${surveyId}

Obrigado pela confiança! 🙏`;
  }
  
  private generatePostConsultationMessage(patientName: string, surveyId: string): string {
    return `🏥 *Exu Saúde - Sistema de Atendimento Médico*

Olá ${patientName}! 

Esperamos que sua consulta médica tenha atendido suas expectativas.

Sua opinião é fundamental para melhorarmos constantemente! Por favor, avalie:

📋 *1. Atendimento do médico (1-5 estrelas):*
👩‍⚕️ *2. Qualidade do tratamento (1-5 estrelas):*
🏢 *3. Instalações do hospital (1-5 estrelas):*

📊 *4. De 0 a 10, você recomendaria nosso hospital?*

Responda em sequência, ex: "5 4 5 9"

ID da pesquisa: ${surveyId}

Obrigado por escolher nosso hospital! 🙏`;
  }
  
  async processSurveyResponseFromWhatsApp(conversationId: string, response: string): Promise<boolean> {
    try {
      // Extrair surveyId do conversationId (formato: survey_<id>)
      const surveyId = conversationId.replace('survey_', '');
      
      console.log(`🔍 Processing survey response: ${surveyId}, response: "${response}"`);
      
      // Buscar pesquisa pendente
      const survey = await storage.getSatisfactionSurvey(surveyId);
      
      if (!survey) {
        console.error("❌ Survey not found:", surveyId);
        return false;
      }
      
      if (survey.status !== SATISFACTION_SURVEY_STATUS.PENDING) {
        console.error("❌ Survey not pending:", survey.status);
        return false;
      }
      
      // Validar resposta (deve ser número de 1 a 5)
      const rating = parseInt(response.trim());
      
      if (isNaN(rating) || rating < 1 || rating > 5) {
        console.error("❌ Invalid rating:", response);
        return false;
      }
      
      // Atualizar pesquisa com a resposta
      const updated = await storage.updateSatisfactionSurvey(surveyId, {
        rating: rating.toString(),
        respondedAt: new Date(),
        status: SATISFACTION_SURVEY_STATUS.COMPLETED,
      });
      
      if (updated) {
        console.log(`✅ Survey response saved: ${surveyId}, rating: ${rating}, type: ${survey.surveyType}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("❌ Error processing survey response:", error);
      return false;
    }
  }
  
  async getDefaultTemplates(): Promise<SurveyTemplate[]> {
    const templates = await storage.getSurveyTemplates();
    if (templates.length === 0) {
      // Create default templates if none exist
      await this.createDefaultTemplates();
      return await storage.getSurveyTemplates();
    }
    return templates;
  }
  
  private async createDefaultTemplates(): Promise<void> {
    const preConsultationTemplate: InsertSurveyTemplate = {
      templateType: "pre_consultation",
      templateName: "Avaliação do Atendimento Inicial",
      questions: [
        {
          id: "attendance_rating",
          type: "rating",
          question: "Como você avalia nosso atendimento de marcação de consulta?",
          required: true,
          options: ["1", "2", "3", "4", "5"]
        },
        {
          id: "attendance_comments",
          type: "comment",
          question: "Deixe seus comentários sobre o atendimento (opcional):",
          required: false
        }
      ],
      whatsappTemplate: "Avalie nosso atendimento de 1 a 5 estrelas:",
      isActive: true,
    };
    
    const postConsultationTemplate: InsertSurveyTemplate = {
      templateType: "post_consultation",
      templateName: "Avaliação da Consulta Médica",
      questions: [
        {
          id: "doctor_rating",
          type: "rating",
          question: "Como você avalia o atendimento do médico?",
          required: true,
          options: ["1", "2", "3", "4", "5"]
        },
        {
          id: "treatment_rating",
          type: "rating",
          question: "Como você avalia a qualidade do tratamento?",
          required: true,
          options: ["1", "2", "3", "4", "5"]
        },
        {
          id: "facilities_rating",
          type: "rating",
          question: "Como você avalia as instalações do hospital?",
          required: true,
          options: ["1", "2", "3", "4", "5"]
        },
        {
          id: "recommendation_score",
          type: "nps",
          question: "De 0 a 10, você recomendaria nosso hospital?",
          required: true,
          options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
        }
      ],
      whatsappTemplate: "Avalie: médico (1-5), tratamento (1-5), instalações (1-5), recomendação (0-10)",
      isActive: true,
    };
    
    await storage.createSurveyTemplate(preConsultationTemplate);
    await storage.createSurveyTemplate(postConsultationTemplate);
  }
  
  async createCustomTemplate(template: InsertSurveyTemplate): Promise<SurveyTemplate> {
    return await storage.createSurveyTemplate(template);
  }
  
  async getSurveyAnalytics(startDate?: string, endDate?: string): Promise<{
    totalSurveys: number;
    completedSurveys: number;
    averageRatings: {
      attendance: number;
      doctor: number;
      treatment: number;
      facilities: number;
      general: number;
      nps: number;
    };
    responseRate: number;
  }> {
    const surveys = await storage.getSatisfactionSurveys();
    
    let filteredSurveys = surveys;
    if (startDate && endDate) {
      filteredSurveys = surveys.filter(survey => {
        const createdAt = new Date(survey.createdAt);
        return createdAt >= new Date(startDate) && createdAt <= new Date(endDate);
      });
    }
    
    const totalSurveys = filteredSurveys.length;
    const completedSurveys = filteredSurveys.filter(s => s.status === "completed").length;
    
    const completed = filteredSurveys.filter(s => s.status === "completed");
    
    // Log only aggregated, non-sensitive metrics for operational monitoring
    
    const averageRatings = {
      attendance: this.calculateAverage(completed.map(s => s.attendanceRating).filter((rating): rating is string => rating !== null && rating !== undefined)),
      doctor: this.calculateAverage(completed.map(s => s.doctorRating).filter((rating): rating is string => rating !== null && rating !== undefined)),
      treatment: this.calculateAverage(completed.map(s => s.treatmentRating).filter((rating): rating is string => rating !== null && rating !== undefined)),
      facilities: this.calculateAverage(completed.map(s => s.facilitiesRating).filter((rating): rating is string => rating !== null && rating !== undefined)),
      general: this.calculateAverage(completed.map(s => s.generalRating).filter((rating): rating is string => rating !== null && rating !== undefined)),
      nps: this.calculateAverage(completed.map(s => s.recommendationScore).filter((rating): rating is string => rating !== null && rating !== undefined)),
    };
    
    // SECURITY: Only log aggregated metrics, never individual survey data
    
    return {
      totalSurveys,
      completedSurveys,
      averageRatings,
      responseRate: totalSurveys > 0 ? (completedSurveys / totalSurveys) * 100 : 0,
    };
  }
  
  private calculateAverage(values: string[]): number {
    if (values.length === 0) return 0;
    const numbers = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
}

export const satisfactionService = new SatisfactionServiceImpl();