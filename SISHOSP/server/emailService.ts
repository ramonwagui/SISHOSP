import nodemailer from 'nodemailer';
import type { SatisfactionSurvey } from '@shared/schema';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD
  }
});

interface SurveyEmailData {
  patientName: string;
  patientEmail: string;
  queueNumber: string;
  surveyToken: string;
  surveyType: 'receptionist_satisfaction' | 'doctor_satisfaction';
  doctorName?: string;
}

export class EmailService {
  /**
   * Gera a URL completa da pesquisa baseado no token
   */
  private static getSurveyUrl(token: string): string {
    const baseUrl = process.env.REPL_URL || 'http://localhost:5000';
    return `${baseUrl}/pesquisa/${token}`;
  }

  /**
   * Retorna o título da pesquisa baseado no tipo
   */
  private static getSurveyTitle(surveyType: string): string {
    switch (surveyType) {
      case 'receptionist_satisfaction':
        return 'Atendimento da Recepção';
      case 'doctor_satisfaction':
        return 'Atendimento Médico';
      default:
        return 'Atendimento';
    }
  }

  /**
   * Gera template HTML bonito para email de pesquisa
   */
  private static generateSurveyEmailHTML(data: SurveyEmailData): string {
    const surveyUrl = this.getSurveyUrl(data.surveyToken);
    const surveyTitle = this.getSurveyTitle(data.surveyType);
    
    const greeting = data.surveyType === 'doctor_satisfaction' && data.doctorName
      ? `Você foi atendido(a) por: <strong>${data.doctorName}</strong>`
      : `Seu protocolo de atendimento: <strong>${data.queueNumber}</strong>`;

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pesquisa de Satisfação - Exu Saúde</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
        🏥 Pesquisa de Satisfação
      </h1>
      <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">
        Exu Saúde - Sistema de Atendimento Médico
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="color: #1f2937; font-size: 18px; margin: 0 0 10px 0;">
        Olá, <strong>${data.patientName}</strong>!
      </p>
      
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 20px 0;">
        Sua opinião é muito importante para nós! Gostaríamos de saber como foi sua experiência com nosso atendimento.
      </p>

      <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px 20px; margin: 25px 0;">
        <p style="color: #1e40af; margin: 0; font-size: 14px;">
          <strong>📋 ${surveyTitle}</strong>
        </p>
        <p style="color: #3b82f6; margin: 8px 0 0 0; font-size: 14px;">
          ${greeting}
        </p>
      </div>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 20px 0;">
        Por favor, dedique alguns segundos para avaliar nosso atendimento. Seu feedback nos ajuda a melhorar continuamente.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${surveyUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
          ⭐ Avaliar Atendimento
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 25px 0 10px 0;">
        Ou copie e cole este link no seu navegador:
      </p>
      <p style="color: #3b82f6; font-size: 12px; text-align: center; word-break: break-all; margin: 0;">
        ${surveyUrl}
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0 0 10px 0;">
        <strong>Hospital Municipal Joaquim Pereira de Sousa</strong>
      </p>
      <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 0;">
        Exu Bem Cuidada - Secretaria Municipal de Saúde
      </p>
      <p style="color: #d1d5db; font-size: 12px; text-align: center; margin: 15px 0 0 0;">
        Este é um email automático, por favor não responda.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Envia email com link da pesquisa de satisfação
   */
  static async sendSurveyEmail(data: SurveyEmailData): Promise<boolean> {
    try {
      if (!data.patientEmail) {
        console.log('⚠️  No email provided, skipping survey email');
        return false;
      }

      if (!process.env.GMAIL_USER || (!process.env.GMAIL_APP_PASSWORD && !process.env.GMAIL_PASSWORD)) {
        console.log('⚠️  Gmail credentials not configured, skipping email');
        return false;
      }

      const surveyUrl = this.getSurveyUrl(data.surveyToken);
      const surveyTitle = this.getSurveyTitle(data.surveyType);
      const htmlContent = this.generateSurveyEmailHTML(data);

      const mailOptions = {
        from: `"Exu Saúde" <${process.env.GMAIL_USER}>`,
        to: data.patientEmail,
        subject: `🏥 Pesquisa de Satisfação - ${surveyTitle}`,
        html: htmlContent,
        text: `
Olá, ${data.patientName}!

Sua opinião é muito importante para nós! Gostaríamos de saber como foi sua experiência com nosso ${surveyTitle}.

${data.surveyType === 'doctor_satisfaction' && data.doctorName ? `Você foi atendido(a) por: ${data.doctorName}` : `Seu protocolo: ${data.queueNumber}`}

Por favor, avalie nosso atendimento acessando o link abaixo:
${surveyUrl}

Obrigado!

Hospital Municipal Joaquim Pereira de Sousa
Exu Bem Cuidada - Secretaria Municipal de Saúde
        `.trim()
      };

      await transporter.sendMail(mailOptions);
      
      console.log(`✅ Survey email sent to ${data.patientEmail} for ${data.surveyType}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending survey email:', error);
      return false;
    }
  }

  /**
   * Envia notificação de backup bem-sucedido
   */
  static async sendBackupSuccessEmail(data: {
    jsonFileName: string;
    sqlFileName: string;
    totalRecords: number;
    totalTables: number;
    backupAt: Date;
  }): Promise<boolean> {
    try {
      const to = process.env.BACKUP_NOTIFY_EMAIL || process.env.GMAIL_USER;
      if (!to) {
        console.log('⚠️  No recipient configured for backup notification email');
        return false;
      }
      if (!process.env.GMAIL_USER || (!process.env.GMAIL_APP_PASSWORD && !process.env.GMAIL_PASSWORD)) {
        console.log('⚠️  Gmail credentials not configured, skipping backup notification');
        return false;
      }

      const dateStr = data.backupAt.toLocaleString('pt-BR');
      const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <div style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:40px 20px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:600;">✅ Backup Concluído</h1>
      <p style="color:#dcfce7;margin:10px 0 0 0;font-size:15px;">Exu Saúde - Sistema de Atendimento Médico</p>
    </div>
    <div style="padding:40px 30px;">
      <p style="color:#1f2937;font-size:16px;margin:0 0 20px 0;">O backup automático do banco de dados foi realizado com sucesso.</p>
      <div style="background-color:#f0fdf4;border-left:4px solid #16a34a;padding:20px;margin:20px 0;border-radius:4px;">
        <p style="margin:0 0 8px 0;color:#166534;font-size:14px;"><strong>📅 Data/Hora:</strong> ${dateStr}</p>
        <p style="margin:0 0 8px 0;color:#166534;font-size:14px;"><strong>📊 Registros:</strong> ${data.totalRecords.toLocaleString('pt-BR')} registros em ${data.totalTables} tabelas</p>
        <p style="margin:0 0 8px 0;color:#166534;font-size:14px;"><strong>📄 JSON:</strong> ${data.jsonFileName}</p>
        <p style="margin:0;color:#166534;font-size:14px;"><strong>🗄️ SQL:</strong> ${data.sqlFileName}</p>
      </div>
      <p style="color:#6b7280;font-size:14px;">Os arquivos estão salvos na pasta <strong>Exu Saúde - Backups</strong> no Google Drive.</p>
    </div>
    <div style="background-color:#f9fafb;padding:20px 30px;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">Este é um email automático do sistema de backup — não responda.</p>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:6px 0 0 0;">Hospital Municipal Joaquim Pereira de Sousa — Exu Bem Cuidada</p>
    </div>
  </div>
</body>
</html>`;

      await transporter.sendMail({
        from: `"Exu Saúde - Backup" <${process.env.GMAIL_USER}>`,
        to,
        subject: `✅ Backup concluído — ${dateStr}`,
        html,
        text: `Backup concluído com sucesso em ${dateStr}.\nArquivos: ${data.jsonFileName}, ${data.sqlFileName}\nRegistros: ${data.totalRecords} em ${data.totalTables} tabelas.`,
      });

      console.log(`✅ Backup success email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending backup success email:', error);
      return false;
    }
  }

  /**
   * Envia notificação de falha no backup
   */
  static async sendBackupFailureEmail(data: {
    errorMessage: string;
    attemptedAt: Date;
  }): Promise<boolean> {
    try {
      const to = process.env.BACKUP_NOTIFY_EMAIL || process.env.GMAIL_USER;
      if (!to) {
        console.log('⚠️  No recipient configured for backup failure email');
        return false;
      }
      if (!process.env.GMAIL_USER || (!process.env.GMAIL_APP_PASSWORD && !process.env.GMAIL_PASSWORD)) {
        console.log('⚠️  Gmail credentials not configured, skipping backup failure notification');
        return false;
      }

      const dateStr = data.attemptedAt.toLocaleString('pt-BR');
      const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <div style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:40px 20px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:600;">❌ Falha no Backup</h1>
      <p style="color:#fee2e2;margin:10px 0 0 0;font-size:15px;">Exu Saúde - Sistema de Atendimento Médico</p>
    </div>
    <div style="padding:40px 30px;">
      <p style="color:#1f2937;font-size:16px;margin:0 0 20px 0;">O backup automático do banco de dados <strong>não foi concluído</strong>. Ação pode ser necessária.</p>
      <div style="background-color:#fef2f2;border-left:4px solid #dc2626;padding:20px;margin:20px 0;border-radius:4px;">
        <p style="margin:0 0 8px 0;color:#991b1b;font-size:14px;"><strong>📅 Tentativa em:</strong> ${dateStr}</p>
        <p style="margin:0;color:#991b1b;font-size:14px;"><strong>⚠️ Erro:</strong> ${data.errorMessage}</p>
      </div>
      <p style="color:#4b5563;font-size:14px;">Verifique os logs do servidor e a conexão com o Google Drive. Você pode tentar executar o backup manualmente pelo painel administrativo.</p>
    </div>
    <div style="background-color:#f9fafb;padding:20px 30px;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">Este é um email automático do sistema de backup — não responda.</p>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:6px 0 0 0;">Hospital Municipal Joaquim Pereira de Sousa — Exu Bem Cuidada</p>
    </div>
  </div>
</body>
</html>`;

      await transporter.sendMail({
        from: `"Exu Saúde - Backup" <${process.env.GMAIL_USER}>`,
        to,
        subject: `❌ Falha no backup — ${dateStr}`,
        html,
        text: `Falha no backup em ${dateStr}.\nErro: ${data.errorMessage}\nVerifique os logs e a conexão com o Google Drive.`,
      });

      console.log(`✅ Backup failure email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending backup failure email:', error);
      return false;
    }
  }

  /**
   * Envia email de teste para verificar configuração
   */
  static async sendTestEmail(to: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"Exu Saúde" <${process.env.GMAIL_USER}>`,
        to,
        subject: '✅ Teste de Email - Exu Saúde',
        html: `
          <h2>Email de Teste</h2>
          <p>Se você recebeu este email, a configuração está correta! ✅</p>
          <p><strong>Sistema:</strong> Exu Saúde - Sistema de Atendimento Médico</p>
        `,
        text: 'Email de teste - Configuração OK!'
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Test email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      return false;
    }
  }
}
