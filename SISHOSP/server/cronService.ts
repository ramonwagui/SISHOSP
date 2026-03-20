import { whatsappService, WhatsAppService } from "./whatsappService";
import { storage } from "./storage";
import { satisfactionService } from "./satisfactionService";


export class CronService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private jobInProgress = false;

  constructor() {
    // Não iniciar automaticamente - será iniciado explicitamente no index.ts
  }

  /**
   * Inicia o serviço de cron para lembretes automáticos
   */
  startCronJob() {
    if (this.isRunning) {
      console.log('⚠️  Cron service is already running');
      return;
    }

    console.log('🔄 Starting WhatsApp reminder cron service...');
    
    // Executa a cada 30 minutos
    this.intervalId = setInterval(() => {
      this.checkAndSendReminders();
    }, 30 * 60 * 1000); // 30 minutos

    // Prevent keeping the process alive if it's the only thing running
    this.intervalId.unref();

    this.isRunning = true;
    console.log('✅ WhatsApp reminder cron service started');

    // Executa uma vez no início para verificar imediatamente
    this.checkAndSendReminders();
  }

  /**
   * Para o serviço de cron
   */
  stopCronJob() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🛑 WhatsApp reminder cron service stopped');
    }
  }

  /**
   * Verifica e envia lembretes baseado na hora atual
   */
  private async checkAndSendReminders() {
    // Prevent overlapping executions
    if (this.jobInProgress) {
      console.log('⏳ Cron job already in progress, skipping this cycle');
      return;
    }

    this.jobInProgress = true;
    try {
      if (!whatsappService) {
        console.log('⚠️  WhatsApp service not configured, skipping reminders');
        return;
      }

      const waService = whatsappService as WhatsAppService;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      console.log(`🔍 Checking for reminders at ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);

      // Enviar lembretes de 24h às 9:00 da manhã
      if (currentHour === 9 && currentMinute >= 0 && currentMinute < 30) {
        await this.sendTomorrowReminders();
      }

      // Enviar lembretes do dia às 8:00 da manhã
      if (currentHour === 8 && currentMinute >= 0 && currentMinute < 30) {
        await this.sendTodayReminders();
      }

      // Enviar lembretes 2 horas antes (durante o horário comercial)
      if (currentHour >= 8 && currentHour <= 17) {
        await this.sendTwoHourReminders();
      }

      // Verificar e enviar pesquisas de satisfação pendentes
      await this.checkAndSendPendingSurveys();

    } catch (error) {
      console.error('❌ Error in cron reminder check:', error);
    } finally {
      this.jobInProgress = false;
    }
  }

  /**
   * Envia lembretes para consultas de amanhã
   */
  private async sendTomorrowReminders() {
    try {
      if (!whatsappService) {
        console.log('⚠️  WhatsApp service not configured, skipping tomorrow reminders');
        return;
      }

      const waService = whatsappService as WhatsAppService;
      const appointments = await storage.getAppointments();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDateStr = tomorrow.toISOString().split('T')[0];

      const tomorrowAppointments = appointments.filter(apt => 
        apt.appointmentDate === tomorrowDateStr && 
        apt.status === 'scheduled'
      );

      console.log(`📅 Found ${tomorrowAppointments.length} appointments for tomorrow`);

      for (const appointment of tomorrowAppointments) {
        try {
          const specialty = await storage.getSpecialty(appointment.specialtyId);
          const specialtyName = specialty?.name || 'Consulta Médica';

          const patientWhatsapp = appointment.patientWhatsapp || appointment.patient?.whatsapp;
          const patientName = appointment.patientName || appointment.patient?.name || 'Paciente';
          const phoneIsWhatsapp = appointment.patient?.phoneIsWhatsapp;

          // Verifica se o telefone está marcado como WhatsApp
          if (phoneIsWhatsapp === false) {
            console.log(`⏭️  Skipping WhatsApp reminder for appointment ${appointment.id} - phone is not WhatsApp`);
            continue;
          }

          if (patientWhatsapp) {
            const reminderData = {
              patientName,
              patientWhatsapp,
              appointmentDate: appointment.appointmentDate,
              appointmentTime: appointment.appointmentTime,
              specialtyName,
              hospitalName: 'Exu Saúde - Sistema de Atendimento Médico',
              appointmentId: appointment.id
            };

            const sent = await waService.sendAppointmentReminder(reminderData);
            
            if (sent) {
              // SECURITY: Never log patient names or phone numbers - LGPD compliance
              const maskedPhone = patientWhatsapp.replace(/\d/g, 'X');
              console.log(`✅ Tomorrow reminder sent to appointment ${appointment.id} (${maskedPhone})`);
            } else {
              console.log(`❌ Failed to send tomorrow reminder to appointment ${appointment.id}`);
            }

            // Delay entre mensagens para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`❌ Error sending tomorrow reminder for appointment ${appointment.id}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error in sendTomorrowReminders:', error);
    }
  }

  /**
   * Envia lembretes para consultas de hoje
   */
  private async sendTodayReminders() {
    try {
      if (!whatsappService) {
        console.log('⚠️  WhatsApp service not configured, skipping today reminders');
        return;
      }

      const waService = whatsappService as WhatsAppService;
      const appointments = await storage.getAppointments();
      const today = new Date().toISOString().split('T')[0];

      const todayAppointments = appointments.filter(apt => 
        apt.appointmentDate === today && 
        apt.status === 'scheduled'
      );

      console.log(`📅 Found ${todayAppointments.length} appointments for today`);

      for (const appointment of todayAppointments) {
        try {
          const specialty = await storage.getSpecialty(appointment.specialtyId);
          const specialtyName = specialty?.name || 'Consulta Médica';

          const patientWhatsapp = appointment.patientWhatsapp || appointment.patient?.whatsapp;
          const patientName = appointment.patientName || appointment.patient?.name || 'Paciente';
          const phoneIsWhatsapp = appointment.patient?.phoneIsWhatsapp;

          // Verifica se o telefone está marcado como WhatsApp
          if (phoneIsWhatsapp === false) {
            console.log(`⏭️  Skipping WhatsApp reminder for appointment ${appointment.id} - phone is not WhatsApp`);
            continue;
          }

          if (patientWhatsapp) {
            const reminderData = {
              patientName,
              patientWhatsapp,
              appointmentDate: appointment.appointmentDate,
              appointmentTime: appointment.appointmentTime,
              specialtyName,
              hospitalName: 'Exu Saúde - Sistema de Atendimento Médico',
              appointmentId: appointment.id
            };

            const sent = await waService.sendTodayReminder(reminderData);
            
            if (sent) {
              // SECURITY: Never log patient names or phone numbers - LGPD compliance
              const maskedPhone = patientWhatsapp.replace(/\d/g, 'X');
              console.log(`✅ Today reminder sent to appointment ${appointment.id} (${maskedPhone})`);
            } else {
              console.log(`❌ Failed to send today reminder to appointment ${appointment.id}`);
            }

            // Delay entre mensagens para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`❌ Error sending today reminder for appointment ${appointment.id}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error in sendTodayReminders:', error);
    }
  }

  /**
   * Envia lembretes 2 horas antes da consulta
   */
  private async sendTwoHourReminders() {
    try {
      if (!whatsappService) {
        console.log('⚠️  WhatsApp service not configured, skipping 2-hour reminders');
        return;
      }

      const waService = whatsappService as WhatsAppService;
      const appointments = await storage.getAppointments();
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const upcomingAppointments = appointments.filter(apt => {
        if (apt.appointmentDate !== today || apt.status !== 'scheduled') {
          return false;
        }

        // Calcular se a consulta é em aproximadamente 2 horas
        const [aptHour, aptMinute] = apt.appointmentTime.split(':').map(Number);
        const aptTimeInMinutes = aptHour * 60 + aptMinute;
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
        const timeDiff = aptTimeInMinutes - currentTimeInMinutes;

        // Enviar lembrete entre 2h e 1h45min antes (janela de 15 minutos)
        return timeDiff >= 105 && timeDiff <= 120;
      });

      if (upcomingAppointments.length > 0) {
        console.log(`⏰ Found ${upcomingAppointments.length} appointments in 2 hours`);

        for (const appointment of upcomingAppointments) {
          try {
            const specialty = await storage.getSpecialty(appointment.specialtyId);
            const specialtyName = specialty?.name || 'Consulta Médica';

            const patientWhatsapp = appointment.patientWhatsapp || appointment.patient?.whatsapp;
            const patientName = appointment.patientName || appointment.patient?.name || 'Paciente';
            const phoneIsWhatsapp = appointment.patient?.phoneIsWhatsapp;

            // Verifica se o telefone está marcado como WhatsApp
            if (phoneIsWhatsapp === false) {
              console.log(`⏭️  Skipping WhatsApp reminder for appointment ${appointment.id} - phone is not WhatsApp`);
              continue;
            }

            if (patientWhatsapp) {
              const reminderData = {
                patientName,
                patientWhatsapp,
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                specialtyName,
                hospitalName: 'Exu Saúde - Sistema de Atendimento Médico',
                appointmentId: appointment.id
              };

              const sent = await waService.sendTodayReminder(reminderData);
              
              if (sent) {
                // SECURITY: Never log patient names or phone numbers - LGPD compliance
                const maskedPhone = patientWhatsapp.replace(/\d/g, 'X');
                console.log(`✅ 2-hour reminder sent to appointment ${appointment.id} (${maskedPhone})`);
              } else {
                console.log(`❌ Failed to send 2-hour reminder to appointment ${appointment.id}`);
              }

              // Delay entre mensagens para evitar rate limiting
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } catch (error) {
            console.error(`❌ Error sending 2-hour reminder for appointment ${appointment.id}:`, error);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error in sendTwoHourReminders:', error);
    }
  }

  /**
   * Verifica e envia pesquisas de satisfação pendentes
   */
  private async checkAndSendPendingSurveys() {
    try {
      if (!whatsappService) {
        console.log('⚠️  WhatsApp service not configured, skipping survey checks');
        return;
      }

      console.log('🔍 Checking for pending satisfaction surveys...');
      console.log('⚠️  OLD SURVEY SYSTEM DISABLED - Using scheduler-service for queue surveys');
      console.log('   This cron only processes appointment-related surveys (not queue satisfaction surveys)');
      
      // DESABILITADO: Sistema antigo de pesquisas via texto (não funciona com WhatsApp Business)
      // As pesquisas da fila agora usam templates aprovados via scheduler-service.ts
      
      return; // Desabilitar sistema antigo temporariamente

    } catch (error) {
      console.error('❌ Error in checkAndSendPendingSurveys:', error);
    }
  }

  /**
   * Status do serviço de cron
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      whatsappConfigured: whatsappService !== null,
      nextCheck: this.intervalId ? new Date(Date.now() + 30 * 60 * 1000) : null
    };
  }
}

// Instância única do serviço de cron
export const cronService = new CronService();