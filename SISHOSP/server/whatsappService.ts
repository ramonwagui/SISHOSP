import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken?: string;
}

export interface WhatsAppMessage {
  messaging_product: string;
  to: string;
  type: 'text' | 'template';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text?: string;
        document?: {
          link: string;
          filename: string;
        };
      }>;
    }>;
  };
}

export interface MedicalDocumentData {
  patientName: string;
  patientWhatsapp: string;
  documentType: string;
  documentTitle: string;
  doctorName: string;
  issueDate: string;
  pdfUrl: string;
  filename: string;
}

export interface AppointmentReminderData {
  patientName: string;
  patientWhatsapp: string;
  appointmentDate: string;
  appointmentTime: string;
  specialtyName: string;
  hospitalName: string;
  appointmentId: string;
}

export class WhatsAppService {
  private phoneNumberId: string;
  private accessToken: string;
  private baseUrl: string;

  constructor(credentials: WhatsAppCredentials) {
    this.phoneNumberId = credentials.phoneNumberId;
    this.accessToken = credentials.accessToken;
    this.baseUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}`;
  }

  /**
   * Formata número de WhatsApp para o formato internacional
   */
  private formatPhoneNumber(whatsapp: string): string {
    // Remove todos os caracteres não numéricos
    const cleaned = whatsapp.replace(/\D/g, '');
    
    // SECURITY: Phone numbers are PII - only log format detection without actual numbers
    const maskedInput = whatsapp.replace(/\d/g, 'X');
    console.log(`🔍 Formatando número WhatsApp: formato "${maskedInput}"`);
    
    // Se começar com 87 (DDD local), adiciona código do país
    if (cleaned.startsWith('87') && cleaned.length === 11) {
      const formatted = `55${cleaned}`;
      console.log(`📱 Formato DDD local detectado - convertido para internacional`);
      return formatted;
    }
    
    // Se começar com 55 (código do país), mantém
    if (cleaned.startsWith('55') && cleaned.length === 13) {
      console.log(`📱 Formato internacional detectado`);
      return cleaned;
    }
    
    // Se não tem código do país, adiciona 5587
    if (cleaned.length === 9) {
      const formatted = `5587${cleaned}`;
      console.log(`📱 Formato local 9 dígitos detectado - adicionado DDD`);
      return formatted;
    }
    
    // Outros casos - tenta adicionar 55 se for número brasileiro sem código
    if (cleaned.length >= 10 && cleaned.length <= 11 && !cleaned.startsWith('55')) {
      const formatted = `55${cleaned}`;
      console.log(`📱 Adicionando código do país ao número`);
      return formatted;
    }
    
    console.log(`⚠️ Formato de número não reconhecido - ${cleaned.length} dígitos`);
    return cleaned;
  }

  /**
   * Envia mensagem via WhatsApp Business API
   */
  async sendMessage(message: WhatsAppMessage): Promise<boolean> {
    try {
      // SECURITY: Never log actual phone numbers - use masked format
      const maskedPhone = message.to.replace(/\d/g, 'X');
      console.log('🔄 Enviando mensagem WhatsApp para:', maskedPhone);
      
      // Log payload para debug (sem dados sensíveis)
      const debugPayload = {
        messaging_product: message.messaging_product,
        to: maskedPhone,
        type: message.type,
        ...(message.type === 'template' ? {
          template: {
            name: message.template?.name,
            language: message.template?.language,
            components: message.template?.components?.map(c => ({
              type: c.type,
              hasParameters: !!c.parameters,
              parameterCount: c.parameters?.length
            }))
          }
        } : {})
      };
      console.log('📦 DEBUG Payload:', JSON.stringify(debugPayload, null, 2));
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
      
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const result = await response.json();
      console.log('📥 DEBUG Resposta API:', JSON.stringify(result, null, 2));

      if (response.ok) {
        const messageId = result.messages?.[0]?.id;
        console.log('✅ Mensagem WhatsApp enviada com sucesso:', messageId);
        
        // SECURITY: Log contact verification without exposing actual phone numbers
        const contact = result.contacts?.[0];
        if (contact) {
          const maskedWaId = contact.wa_id.replace(/\d/g, 'X');
          console.log('📞 WhatsApp ID válido:', maskedWaId);
          if (contact.input !== contact.wa_id) {
            console.log('⚠️  ATENÇÃO: Número formatado automaticamente pelo WhatsApp');
          }
        } else {
          console.log('⚠️  AVISO: Nenhuma informação de contato retornada - possível problema');
        }
        
        // SECURITY: Debug mode disabled - phone numbers are PII and should never be logged
        // Only log technical status and message IDs for operational monitoring
        
        return true;
      } else {
        // SECURITY: Never log phone numbers in error messages
        console.error('❌ Erro ao enviar mensagem WhatsApp - destino mascarado');
        console.error('❌ Status HTTP:', response.status);
        console.error('❌ Resposta da API:', JSON.stringify(result, null, 2));
        
        // Verificar códigos de erro específicos
        if (result.error?.code === 131026) {
          console.error('❌ ERRO 131026: Número não está registrado no WhatsApp Business');
          console.error('⚠️  POSSÍVEL CAUSA: Conta em modo SANDBOX - apenas números pré-aprovados podem receber mensagens');
        } else if (result.error?.code === 131047) {
          console.error('❌ ERRO 131047: Re-engagement message is required');
        } else if (result.error?.code === 131021) {
          console.error('❌ ERRO 131021: Recipient cannot be sender');
        } else if (result.error?.code === 80007) {
          console.error('❌ ERRO 80007: Phone number not in allowed list');
          console.error('⚠️  POSSÍVEL CAUSA: Conta em modo SANDBOX - número não está na lista de permissões');
        } else if (result.error?.message?.includes('phone number')) {
          console.error('❌ ERRO DE NÚMERO: Problema com formatação ou registro do número');
        }
        
        return false;
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        // SECURITY: Never log phone numbers - even in timeout errors
        console.error('❌ Timeout na requisição WhatsApp (10s) - destino mascarado');
      } else {
        console.error('❌ Erro na requisição WhatsApp:', error);
      }
      return false;
    }
  }

  /**
   * Envia confirmação de agendamento via WhatsApp
   */
  async sendAppointmentConfirmation(data: AppointmentReminderData): Promise<boolean> {
    const formattedPhone = this.formatPhoneNumber(data.patientWhatsapp);
    
    // SECURITY: Never log patient names or phone numbers - use IDs only
    console.log(`📨 Enviando confirmação de agendamento - ID: ${data.appointmentId}`);
    
    const appointmentDate = format(parseISO(data.appointmentDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    
    const message: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'appointment_confirmation',
        language: {
          code: 'pt_BR'
        },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: data.hospitalName },
            { type: 'text', text: data.patientName },
            { type: 'text', text: appointmentDate },
            { type: 'text', text: data.appointmentTime },
            { type: 'text', text: data.specialtyName },
            { type: 'text', text: data.appointmentId }
          ]
        }]
      }
    };

    return await this.sendMessage(message);
  }

  /**
   * Envia lembrete de agendamento 1 dia antes
   */
  async sendAppointmentReminder(data: AppointmentReminderData): Promise<boolean> {
    const formattedPhone = this.formatPhoneNumber(data.patientWhatsapp);
    
    const appointmentDate = format(parseISO(data.appointmentDate), "dd 'de' MMMM", { locale: ptBR });
    
    const message: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'appointment_reminder',
        language: {
          code: 'pt_BR'
        },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: data.patientName },
            { type: 'text', text: data.hospitalName },
            { type: 'text', text: appointmentDate },
            { type: 'text', text: data.appointmentTime },
            { type: 'text', text: data.specialtyName },
            { type: 'text', text: data.appointmentId }
          ]
        }]
      }
    };

    return await this.sendMessage(message);
  }

  /**
   * Envia lembrete no dia da consulta (2 horas antes)
   */
  async sendTodayReminder(data: AppointmentReminderData): Promise<boolean> {
    const formattedPhone = this.formatPhoneNumber(data.patientWhatsapp);
    
    const message: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'appointment_today',
        language: {
          code: 'pt_BR'
        },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: data.patientName },
            { type: 'text', text: data.hospitalName },
            { type: 'text', text: data.appointmentTime },
            { type: 'text', text: data.specialtyName },
            { type: 'text', text: data.appointmentId }
          ]
        }]
      }
    };

    return await this.sendMessage(message);
  }

  /**
   * Envia documento médico via WhatsApp usando template com PDF anexado
   */
  async sendMedicalDocument(data: MedicalDocumentData): Promise<boolean> {
    const formattedPhone = this.formatPhoneNumber(data.patientWhatsapp);
    
    // SECURITY: Never log patient names or phone numbers - use masked format
    console.log(`📨 Enviando documento médico via WhatsApp - Tipo: ${data.documentType}`);
    
    // Usa template template_documentos com header DOCUMENT e body com 4 variáveis
    const message: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'template_documentos',
        language: {
          code: 'pt_BR'
        },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'document',
                document: {
                  link: data.pdfUrl,
                  filename: data.filename
                }
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.patientName },
              { type: 'text', text: data.documentTitle },
              { type: 'text', text: data.doctorName },
              { type: 'text', text: data.issueDate }
            ]
          }
        ]
      }
    };

    console.log('📤 Enviando documento via template WhatsApp:', {
      template: 'template_documentos',
      pdfUrl: data.pdfUrl,
      filename: data.filename
    });

    return await this.sendMessage(message);
  }

  /**
   * Envia confirmação de entrada na fila usando template aprovado
   * Template: confirmacao_fila_exu
   * Parâmetros: {{1}} Unidade, {{2}} Nome, {{3}} Protocolo, {{4}} Especialidade
   */
  async sendQueueConfirmation(
    to: string, 
    queueNumber: string, 
    patientName: string,
    healthUnit: string = "Exu Saúde",
    specialty: string = "Atendimento Geral"
  ): Promise<boolean> {
    const formattedPhone = this.formatPhoneNumber(to);
    
    const message: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'confirmacao_fila_exu',
        language: {
          code: 'pt_BR'
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: healthUnit },
              { type: 'text', text: patientName },
              { type: 'text', text: queueNumber },
              { type: 'text', text: specialty }
            ]
          }
        ]
      }
    };

    return await this.sendMessage(message);
  }

  /**
   * Envia pesquisa de satisfação do atendente usando template aprovado
   * Template: pesquisa_recepcao_exu
   * Parâmetros: {{1}} Nome, {{2}} Protocolo
   */
  async sendReceptionistSurvey(to: string, patientName: string, queueNumber: string): Promise<boolean> {
    const formattedPhone = this.formatPhoneNumber(to);
    
    const message: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'pesquisa_recepcao_exu',
        language: {
          code: 'pt_BR'
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: patientName },
              { type: 'text', text: queueNumber }
            ]
          }
        ]
      }
    };

    return await this.sendMessage(message);
  }

  /**
   * Envia pesquisa de satisfação do médico usando template aprovado
   * Template: pesquisa_medico_exu
   * Parâmetros: {{1}} Nome, {{2}} Protocolo, {{3}} Médico
   */
  async sendDoctorSurvey(
    to: string, 
    patientName: string, 
    queueNumber: string,
    doctorName: string = "Equipe Médica"
  ): Promise<boolean> {
    const formattedPhone = this.formatPhoneNumber(to);
    
    const message: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'pesquisa_medico_exu',
        language: {
          code: 'pt_BR'
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: patientName },
              { type: 'text', text: queueNumber },
              { type: 'text', text: doctorName }
            ]
          }
        ]
      }
    };

    return await this.sendMessage(message);
  }

  /**
   * Verifica se as credenciais do WhatsApp estão configuradas
   */
  static isConfigured(): boolean {
    return !!(
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_ACCESS_TOKEN
    );
  }

  /**
   * Cria uma instância do serviço se as credenciais estiverem disponíveis
   */
  static create(): WhatsAppService | null {
    if (!this.isConfigured()) {
      return null;
    }

    // Sanitiza o token removendo prefixos, aspas e caracteres invisíveis
    const raw = process.env.WHATSAPP_ACCESS_TOKEN || "";
    const accessToken = raw.trim()
      .replace(/^\s*Bearer\s+/i, "")
      .replace(/^['"]|['"]$/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "");

    // Log seguro - apenas confirma que token foi carregado (sem exposição de dados sensíveis)
    console.log('🔐 WhatsApp token configured:', { configured: true });

    return new WhatsAppService({
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
      accessToken: accessToken,
      webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    });
  }
}

export const whatsappService = WhatsAppService.create();