import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireAdmin, requireAdminOrStaff, requireAnyRole, requireDoctor, requireDoctorOrAdmin, requireDoctorOrStaff, requireAllRoles, requirePainelUser, requireFarmaciaOrAdmin, requireHospitalizationAccess, requireUserManagement, requireRadiologistaOrAdmin } from "./auth";
import { runBackup, getBackupHistory, getBackupStatus } from "./backupService";
import { auditLogger, logAuditAfterResponse, captureEntityId, logAuthEvent } from "./auditMiddleware";
import { sanitizeInputs, validateRequestFrequency, validateContentLength } from "./inputValidation";
import { logDataAccess, DataCategory, LegalBasis, generateLGPDReport, handlePrivacyRequest, PrivacyAction, checkDataRetentionCompliance } from "./lgpdCompliance";
import { SecurityMonitor } from "./securityMonitoring";
import { insertAppointmentSchema, insertSpecialtySchema, insertPatientSchema, insertLegacyAppointmentSchema, insertMedicalHistorySchema, insertTriageSchema, insertQueueEntrySchema, insertSatisfactionSurveySchema, insertUserSchema, updateUserSchema, changePasswordSchema, insertPrescriptionTemplateSchema, insertMedicalDocumentSchema, insertAnamnesisTemplateSchema, insertClinicalProtocolSchema, SATISFACTION_SURVEY_STATUS, SCHEDULED_MESSAGE_STATUS, insertHospitalWardSchema, insertHospitalBedSchema, insertHospitalizationSchema, insertHospitalizationEvolutionSchema } from "@shared/schema";
import { pdfGenerator, type ConsultationData } from "./pdfGenerator";
import { z } from "zod";
import { google } from "googleapis";
import csrf from "csurf";
import nodemailer from "nodemailer";
import { whatsappService, type AppointmentReminderData } from "./whatsappService";
import { satisfactionService } from "./satisfactionService";
import { profilePhotoService } from "./profilePhotoService";
import { EmailService } from "./emailService";
import { SurveyTokenService } from "./surveyTokenService";
import * as crypto from "crypto";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";

const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

// Password reset schemas
const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório")
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"]
});

// Google Calendar setup
const calendar = google.calendar('v3');
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Temporary storage for PDF tokens (in-memory, expires after 5 minutes)
const pdfTokens = new Map<string, { documentId: string, expiresAt: number }>();

export function registerRoutes(app: Express): Server {
  // TESTE: Endpoint ANTES de qualquer middleware para teste de WhatsApp
  app.post("/api/test/send-whatsapp-doc", async (req, res) => {
    try {
      const { documentId, phoneNumber } = req.body;
      
      console.log('🧪 TESTE WhatsApp - Document:', documentId);
      console.log('🧪 TESTE WhatsApp - Phone:', phoneNumber);

      if (!whatsappService) {
        return res.status(400).json({ message: "WhatsApp não configurado" });
      }

      if (!documentId || !phoneNumber) {
        return res.status(400).json({ message: "documentId e phoneNumber obrigatórios" });
      }

      const document = await storage.getMedicalDocument(documentId);
      if (!document) {
        return res.status(404).json({ message: "Documento não encontrado" });
      }

      const documentTypeNames: Record<string, string> = {
        'prescription': 'Receita Médica',
        'certificate': 'Atestado Médico',
        'medical_report': 'Laudo Médico'
      };
      const docTypeName = documentTypeNames[document.documentType] || document.title;

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + (5 * 60 * 1000);
      pdfTokens.set(token, { documentId, expiresAt });

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : `http://localhost:${process.env.PORT || 5000}`;
      const pdfUrl = `${baseUrl}/api/public/pdf/${token}`;
      const filename = `${document.title.replace(/\s+/g, '_')}.pdf`;
      const issueDate = new Intl.DateTimeFormat('pt-BR').format(new Date(document.issueDate));

      console.log('🔗 PDF URL:', pdfUrl);

      const success = await whatsappService.sendMedicalDocument({
        patientName: 'Teste',
        patientWhatsapp: phoneNumber,
        documentType: docTypeName,
        documentTitle: document.title,
        doctorName: document.doctorName,
        issueDate,
        pdfUrl,
        filename
      });

      if (success) {
        console.log('✅ TESTE: Documento enviado!');
        res.json({ success: true, message: "Enviado!", pdfUrl });
      } else {
        pdfTokens.delete(token);
        console.error('❌ TESTE: Falha');
        res.status(500).json({ success: false, message: "Falha ao enviar" });
      }
    } catch (error) {
      console.error("❌ TESTE Erro:", error);
      res.status(500).json({ message: "Erro" });
    }
  });

  // TESTE: Endpoint para enviar email de pesquisa de satisfação
  app.post("/api/test/send-survey-email", async (req, res) => {
    try {
      console.log('🧪 TESTE Email de Pesquisa - Iniciando...');

      // Buscar ou criar paciente de teste
      let testPatient = (await storage.getPatients()).find(p => p.cpf === '000.000.000-00');
      if (!testPatient) {
        console.log('Criando paciente de teste...');
        testPatient = await storage.createPatient({
          name: 'Ramon Wagui (Teste)',
          cpf: '000.000.000-00',
          rg: '0000000',
          susCard: '000000000000000',
          birthDate: '1990-01-01',
          gender: 'masculino',
          whatsapp: '5587999999999',
          address: 'Rua Teste',
          addressNumber: 'S/N',
          neighborhood: 'Centro',
          zoneType: 'urbana',
          city: 'Exu',
          state: 'PE'
        });
      }

      // Criar nova entrada de fila de teste (sempre nova para evitar conflitos)
      const randomNum = Math.floor(Math.random() * 10000);
      console.log('Criando entrada de fila de teste...');
      const testQueueEntry = await storage.createQueueEntry({
        patientId: testPatient.id,
        queueNumber: `TEST-${randomNum}`,
        specialty: 'Atendimento Geral',
        priority: 'normal',
        arrivalTime: new Date(),
        status: 'waiting'
      });

      // Criar pesquisa de teste com token
      const surveyToken = SurveyTokenService.generateToken();
      const surveyUrl = SurveyTokenService.generateSurveyUrl(surveyToken);

      const testSurvey = await storage.createSatisfactionSurvey({
        queueEntryId: testQueueEntry.id,
        patientId: testPatient.id,
        surveyType: 'receptionist_satisfaction',
        surveyToken,
        status: SATISFACTION_SURVEY_STATUS.PENDING
      });

      console.log('📝 Pesquisa de teste criada:', testSurvey.id);
      console.log('🔗 URL da pesquisa:', surveyUrl);

      // Enviar email
      const emailSent = await EmailService.sendSurveyEmail({
        patientName: testPatient.name,
        patientEmail: 'ramonwagui@gmail.com',
        queueNumber: testQueueEntry.queueNumber,
        surveyToken: surveyToken,
        surveyType: 'receptionist_satisfaction',
        doctorName: undefined
      });

      if (emailSent) {
        console.log('✅ TESTE: Email enviado com sucesso!');
        res.json({ 
          success: true, 
          message: "Email enviado para ramonwagui@gmail.com", 
          surveyUrl,
          surveyToken,
          patientId: testPatient.id,
          queueEntryId: testQueueEntry.id
        });
      } else {
        console.error('❌ TESTE: Falha ao enviar email');
        res.status(500).json({ success: false, message: "Falha ao enviar email" });
      }
    } catch (error) {
      console.error("❌ TESTE Erro ao enviar email:", error);
      res.status(500).json({ message: "Erro ao enviar email de teste", error: String(error) });
    }
  });
  
  // Auth middleware
  setupAuth(app);
  
  // Public endpoint for serving PDFs with secure token
  app.get("/api/public/pdf/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Check if token exists and is valid
      const tokenData = pdfTokens.get(token);
      if (!tokenData) {
        return res.status(404).json({ message: "Documento não encontrado ou expirado" });
      }
      
      // Check if token has expired (5 minutes)
      if (Date.now() > tokenData.expiresAt) {
        pdfTokens.delete(token);
        return res.status(404).json({ message: "Link expirado" });
      }
      
      // Get document
      const document = await storage.getMedicalDocument(tokenData.documentId);
      if (!document) {
        pdfTokens.delete(token);
        return res.status(404).json({ message: "Documento não encontrado" });
      }
      
      const patient = await storage.getPatient(document.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      // Calculate patient age
      const birthDate = new Date(patient.birthDate);
      const today = new Date();
      let patientAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        patientAge--;
      }
      
      // Calculate start and end dates for certificates
      let startDate: string | undefined;
      let endDate: string | undefined;
      if (document.documentType === 'certificate' && document.daysOff) {
        const days = parseInt(document.daysOff);
        if (!isNaN(days)) {
          const start = new Date(document.issueDate);
          const end = new Date(start);
          end.setDate(end.getDate() + days - 1);
          startDate = new Intl.DateTimeFormat('pt-BR').format(start);
          endDate = new Intl.DateTimeFormat('pt-BR').format(end);
        }
      }
      
      // Prepare data for PDF generation
      const pdfData = {
        id: document.id,
        title: document.title,
        patientName: patient.name,
        patientEmail: undefined,
        patientPhone: patient.whatsapp,
        patientGender: patient.gender === 'masculino' ? 'Masculino' : patient.gender === 'feminino' ? 'Feminino' : patient.gender,
        patientAge,
        documentType: document.documentType as 'prescription' | 'certificate' | 'medical_report',
        content: document.content,
        diagnosis: document.diagnosis || undefined,
        medications: document.medications || undefined,
        observations: document.observations || undefined,
        daysOff: document.daysOff || undefined,
        startDate,
        endDate,
        cid: document.cid || undefined,
        doctorName: document.doctorName,
        doctorCrm: document.doctorCrm,
        issueDate: document.issueDate
      };
      
      // Generate PDF
      const pdfBuffer = await pdfGenerator.generateMedicalDocumentPDF(pdfData);
      
      // Set headers for PDF
      const fileName = `${document.title.replace(/\s+/g, '_')}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      // Delete token after use (one-time link)
      pdfTokens.delete(token);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error("❌ Error serving public PDF:", error);
      res.status(500).json({ message: "Erro ao servir documento" });
    }
  });
  
  // SECURITY: CSRF Protection for state-changing operations
  const csrfProtection = csrf({ 
    cookie: false, // Use session instead of cookie
    sessionKey: 'session',
    value: (req) => req.body?._csrf || req.query._csrf || req.headers['x-csrf-token']
  });
  
  // Apply CSRF protection to all routes except webhook, health checks, and password reset endpoints
  app.use((req, res, next) => {
    // Skip CSRF for webhooks, health checks, password reset endpoints, public PDFs, test endpoints, and GET requests
    if (req.path.startsWith('/api/whatsapp/webhook') || 
        req.path.startsWith('/api/public/pdf/') ||
        req.path.startsWith('/api/test/') ||
        req.path === '/api' || 
        req.path === '/health' ||
        req.path === '/api/auth/forgot-password' ||
        req.path === '/api/auth/reset-password' ||
        req.method === 'GET' ||
        req.method === 'HEAD') {
      return next();
    }
    return csrfProtection(req, res, next);
  });
  
  // SECURITY: Apply input validation and sanitization to all routes
  app.use(sanitizeInputs);
  app.use(validateContentLength(10 * 1024 * 1024)); // 10MB limit
  
  // SECURITY: Apply request frequency validation to API routes
  app.use('/api/', validateRequestFrequency);
  
  // CSRF token endpoint for frontend
  app.get("/api/csrf-token", csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });
  
  // Health check for deployments - only respond to requests with proper headers
  app.get("/", (req, res, next) => {
    // If request is from a deployment health check (has user-agent indicating automation)
    // or explicitly requests JSON, return health status
    const userAgent = req.get('User-Agent') || '';
    const acceptsJson = req.get('Accept')?.includes('application/json');
    
    if (acceptsJson || userAgent.includes('bot') || userAgent.includes('monitor') || userAgent.includes('health')) {
      return res.status(200).json({ 
        status: "ok", 
        service: "Exu Saúde - Sistema de Atendimento Médico - Sistema de Atendimento Médico",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    }
    
    // For regular browser requests, continue to serve the web interface
    next();
  });
  
  // Health check endpoint for HEAD /api requests (very frequent monitoring)
  app.head("/api", (req, res) => {
    res.status(200).end();
  });

  // Basic API health endpoint (minimal response for monitoring)
  app.get("/api", (req, res) => {
    res.status(200).json({ status: "ok", uptime: Math.floor(process.uptime()) });
  });

  // Auth routes - removed /api/auth/user as it's using Replit Auth format
  // Using /api/user from auth.ts instead
  
  // Password reset endpoints (public access)
  app.post("/api/auth/forgot-password", 
    auditLogger('CREATE', 'password_reset', 'Password reset requested'),
    async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // For security, always return success even if email doesn't exist
        // This prevents email enumeration attacks
        return res.json({ 
          success: true, 
          message: "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha." 
        });
      }
      
      // Generate secure token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      
      // Save token hash to database (never store plaintext token)
      await storage.createPasswordResetToken({
        userId: user.id,
        token: tokenHash,
        expiresAt,
        used: false,
        ipAddress: clientIp,
        userAgent: userAgent
      });
      
      // Send email with reset link
      const resetUrl = `${req.protocol}://${req.get('host')}/redefinir-senha?token=${resetToken}`;
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Redefinição de Senha - Exu Saúde - Sistema de Atendimento Médico',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #2563eb;">🏥 Exu Saúde - Sistema de Atendimento Médico</h2>
              <h3 style="color: #dc2626;">Redefinição de Senha</h3>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #374151;">Olá <strong>${user.name}</strong>,</p>
              <p style="color: #374151;">Você solicitou a redefinição de sua senha do sistema de agendamentos.</p>
              
              <p style="color: #374151;"><strong>Clique no botão abaixo para redefinir sua senha:</strong></p>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  🔐 Redefinir Senha
                </a>
              </div>
              
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  ⚠️ <strong>Importante:</strong> Este link expira em 15 minutos por segurança.
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <span style="color: #2563eb; word-break: break-all;">${resetUrl}</span>
              </p>
              
              <p style="color: #6b7280; font-size: 12px;">
                Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="text-align: center; color: #6b7280; font-size: 12px;">
              © 2025 Exu Saúde - Sistema de Atendimento Médico - Sistema de Atendimento Médicos<br>
              Este email foi enviado automaticamente. Não responda a este email.
            </p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
      
      res.json({ 
        success: true, 
        message: "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha." 
      });
      
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/reset-password",
    auditLogger('UPDATE', 'password_reset', 'Password reset executed'),
    async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      
      // Hash the provided token to compare with stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Validate token
      const resetToken = await storage.getPasswordResetToken(tokenHash);
      if (!resetToken) {
        return res.status(400).json({ 
          message: "Token inválido ou expirado. Solicite uma nova redefinição de senha." 
        });
      }
      
      // Get user
      const user = await storage.getUser(resetToken.userId);
      if (!user) {
        return res.status(400).json({ message: "Usuário não encontrado" });
      }
      
      // Update password
      const hashedPassword = await bcrypt.hash(password, 12);
      await storage.updateUser(user.id, { password: hashedPassword });
      
      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(tokenHash);
      
      // Clean up expired tokens
      await storage.cleanupExpiredPasswordResetTokens();
      
      res.json({ 
        success: true, 
        message: "Senha redefinida com sucesso! Você já pode fazer login com sua nova senha." 
      });
      
    } catch (error) {
      console.error('Password reset completion error:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Legacy authentication - disabled, now using Replit Auth

  // User Management - Admin only
  app.get("/api/users", requireUserManagement,
    auditLogger('READ', 'user', 'Listed all users'),
    logDataAccess(DataCategory.PERSONAL_IDENTIFICATION, LegalBasis.LEGITIMATE_INTEREST, 'Consulta lista de usuários'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const users = await storage.listUsers();
      res.json(users);
    } catch (error) {
      console.error('Error listing users:', error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Get doctors list - accessible by authenticated users (for hospitalization forms)
  app.get("/api/doctors", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.listUsers();
      const doctors = users.filter(u => u.role === 'doctor' || u.role === 'admin');
      res.json(doctors.map(d => ({ 
        id: d.id, 
        name: d.name, 
        crm: d.crm,
        role: d.role 
      })));
    } catch (error) {
      console.error('Error listing doctors:', error);
      res.status(500).json({ message: "Erro ao buscar médicos" });
    }
  });

  app.post("/api/users", requireUserManagement,
    auditLogger('CREATE', 'user', 'Created new user'),
    captureEntityId('id'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      // Password hashing is handled in the storage layer
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message === "Nome de usuário já existe" || error.message === "Email já está cadastrado") {
        return res.status(409).json({ message: error.message });
      }
      res.status(400).json({ message: "Dados inválidos para usuário" });
    }
  });

  app.patch("/api/users/:id", requireUserManagement,
    auditLogger('UPDATE', 'user', 'Updated user information'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = updateUserSchema.parse(req.body);
      
      // Explicitly remove profilePhotoUrl to prevent it from being overwritten
      const { profilePhotoUrl, ...safeUpdateData } = updateData as any;
      
      const user = await storage.updateUser(id, safeUpdateData);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json(user);
    } catch (error: any) {
      console.error('Error updating user:', error);
      if (error.message === "Nome de usuário já existe" || error.message === "Email já está cadastrado") {
        return res.status(409).json({ message: error.message });
      }
      if (error.message === "Não é possível alterar o role do último administrador") {
        return res.status(400).json({ message: error.message });
      }
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.patch("/api/users/:id/password", requireUserManagement,
    auditLogger('UPDATE', 'user', 'Changed user password'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword, confirmPassword } = changePasswordSchema.parse(req.body);
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      const success = await storage.changeUserPassword(id, hashedPassword);
      
      if (!success) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Check if user is admin or admin.reserva - they don't need to change password on next login
      const user = await storage.getUser(id);
      if (user && user.username !== "admin" && user.username !== "admin.reserva") {
        await storage.updateUser(id, { mustChangePassword: true });
      }
      
      res.json({ message: "Senha alterada com sucesso" });
    } catch (error: any) {
      console.error('Error changing user password:', error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.delete("/api/users/:id", requireUserManagement,
    auditLogger('DELETE', 'user', 'Deleted user'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json({ message: "Usuário removido com sucesso" });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      if (error.message === "Não é possível excluir o último administrador") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Erro ao remover usuário" });
    }
  });

  // Reset all user passwords (admin only) - except admin and admin.reserva
  app.post("/api/admin/reset-all-passwords", requireAdmin,
    auditLogger('UPDATE', 'user', 'Reset all user passwords'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const defaultPassword = "123456";
      // NOTE: Do NOT hash here - updateUser already hashes the password internally
      
      // Get all users
      const users = await storage.listUsers();
      
      // Filter out admin and admin.reserva users
      const usersToReset = users.filter(u => 
        u.username !== "admin" && u.username !== "admin.reserva"
      );
      
      let resetCount = 0;
      for (const user of usersToReset) {
        try {
          // Pass plain password - updateUser handles hashing
          await storage.updateUser(user.id, { 
            password: defaultPassword,
            mustChangePassword: true 
          });
          resetCount++;
        } catch (err) {
          console.error(`Error resetting password for user ${user.username}:`, err);
        }
      }
      
      res.json({ 
        message: `Senhas resetadas com sucesso para ${resetCount} usuários`,
        count: resetCount 
      });
    } catch (error: any) {
      console.error('Error resetting all passwords:', error);
      res.status(500).json({ message: "Erro ao resetar senhas" });
    }
  });

  // Upload profile photo
  app.post("/api/users/:id/profile-photo", requireUserManagement,
    auditLogger('UPDATE', 'user', 'Uploaded user profile photo'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const { id } = req.params;
      const { imageData, mimeType } = req.body;

      if (!imageData || !mimeType) {
        return res.status(400).json({ message: "imageData e mimeType são obrigatórios" });
      }

      // Get user to check if exists
      const users = await storage.listUsers();
      const user = users.find(u => u.id === id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Normalize Base64 format (ensure semicolon before base64)
      const normalizedImageData = imageData.replace(/^data:image\/(\w+)base64,/, "data:image/$1;base64,");
      
      // Convert base64 to buffer for validation only
      const base64Data = normalizedImageData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Validate file
      profilePhotoService.validateImageFile(mimeType, buffer.length);

      // Save normalized Base64 directly to database
      const updatedUser = await storage.updateUser(id, { profilePhotoUrl: normalizedImageData });

      res.json({ message: "Foto de perfil atualizada com sucesso", user: updatedUser });
    } catch (error: any) {
      console.error('Error uploading profile photo:', error);
      res.status(500).json({ message: error.message || "Erro ao fazer upload da foto" });
    }
  });

  // Delete profile photo
  app.delete("/api/users/:id/profile-photo", requireUserManagement,
    auditLogger('UPDATE', 'user', 'Deleted user profile photo'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const { id } = req.params;

      // Get user
      const users = await storage.listUsers();
      const user = users.find(u => u.id === id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      if (!user.profilePhotoUrl) {
        return res.status(404).json({ message: "Usuário não possui foto de perfil" });
      }

      // Update user to remove photo (Base64 deleted by just removing from database)
      const updatedUser = await storage.updateUser(id, { profilePhotoUrl: null });

      res.json({ message: "Foto de perfil removida com sucesso", user: updatedUser });
    } catch (error: any) {
      console.error('Error deleting profile photo:', error);
      res.status(500).json({ message: error.message || "Erro ao deletar foto" });
    }
  });

  // Save user signature (doctors only)
  app.post("/api/users/signature", requireDoctor,
    auditLogger('UPDATE', 'user', 'Updated signature'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const user = req.user as any;
      let { signature } = req.body;

      console.log('📝 Signature save request:', {
        userId: user.id,
        hasSignature: !!signature,
        signatureLength: signature?.length,
        signaturePrefix: signature?.substring(0, 30)
      });

      if (!signature) {
        console.error('❌ No signature provided in request body');
        return res.status(400).json({ message: "Assinatura é obrigatória" });
      }

      // Normalize signature prefix (sanitizeInputs middleware strips semicolons)
      signature = signature.replace(/^data:image\/pngbase64,/, 'data:image/png;base64,');
      
      console.log('🔧 After normalization:', {
        signaturePrefix: signature.substring(0, 30)
      });

      // Validate base64 signature
      if (!signature.startsWith('data:image/png;base64,')) {
        console.error('❌ Invalid signature format. Expected: data:image/png;base64,...', {
          actualPrefix: signature.substring(0, 30)
        });
        return res.status(400).json({ message: "Formato de assinatura inválido" });
      }

      // Update user with signature
      console.log('✅ Signature format valid, updating user...');
      const updatedUser = await storage.updateUser(user.id, { signature });

      console.log('✅ Signature saved successfully');
      res.json({ 
        message: "Assinatura salva com sucesso", 
        user: updatedUser 
      });
    } catch (error: any) {
      console.error('❌ Error saving signature:', error);
      res.status(500).json({ message: error.message || "Erro ao salvar assinatura" });
    }
  });

  // Delete user signature (doctors only)
  app.delete("/api/users/signature", requireDoctor,
    auditLogger('UPDATE', 'user', 'Deleted signature'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const user = req.user as any;

      // Update user to remove signature
      const updatedUser = await storage.updateUser(user.id, { signature: null });

      res.json({ 
        message: "Assinatura removida com sucesso", 
        user: updatedUser 
      });
    } catch (error: any) {
      console.error('Error deleting signature:', error);
      res.status(500).json({ message: error.message || "Erro ao deletar assinatura" });
    }
  });


  // Specialties - all authenticated users can view
  app.get("/api/specialties", requireAnyRole, async (req, res) => {
    try {
      const specialties = await storage.getSpecialties();
      res.json(specialties);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar especialidades" });
    }
  });

  app.post("/api/specialties", requireAdmin, 
    auditLogger('CREATE', 'specialty', 'Created new medical specialty'),
    captureEntityId('id'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const specialtyData = insertSpecialtySchema.parse(req.body);
      const specialty = await storage.createSpecialty(specialtyData);
      res.status(201).json(specialty);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos para especialidade" });
    }
  });

  app.put("/api/specialties/:id", requireAdmin,
    auditLogger('UPDATE', 'specialty', 'Updated medical specialty'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertSpecialtySchema.partial().parse(req.body);
      const specialty = await storage.updateSpecialty(id, updateData);
      
      if (!specialty) {
        return res.status(404).json({ message: "Especialidade não encontrada" });
      }
      
      res.json(specialty);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.delete("/api/specialties/:id", requireAdmin,
    auditLogger('DELETE', 'specialty', 'Deleted medical specialty'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSpecialty(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Especialidade não encontrada" });
      }
      
      res.json({ message: "Especialidade removida com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao remover especialidade" });
    }
  });

  // CID-10 Codes search - for diagnosis autocomplete
  app.get("/api/cid/search", requireAnyRole, async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const limit = parseInt(req.query.limit as string) || 20;
      
      const results = await storage.searchCidCodes(query, limit);
      res.json(results);
    } catch (error) {
      console.error("Error searching CID codes:", error);
      res.status(500).json({ message: "Erro ao buscar códigos CID" });
    }
  });

  // Patients - staff and admin can view all (LGPD: Personal identification data)
  app.get("/api/patients", requireDoctorOrStaff,
    logDataAccess(DataCategory.PERSONAL_IDENTIFICATION, LegalBasis.LEGITIMATE_INTEREST, 'Consulta lista de pacientes'),
    async (req, res) => {
    try {
      const patients = await storage.getPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar pacientes" });
    }
  });

  app.get("/api/patients/:id", requireDoctorOrStaff,
    logDataAccess(DataCategory.PERSONAL_IDENTIFICATION, LegalBasis.LEGITIMATE_INTEREST, 'Consulta dados específicos de paciente'),
    async (req, res) => {
    try {
      const { id } = req.params;
      const patient = await storage.getPatient(id);
      
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar paciente" });
    }
  });

  app.post("/api/patients", requireDoctorOrStaff,
    auditLogger('CREATE', 'patient', 'Created new patient record'),
    captureEntityId('id'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const patientData = insertPatientSchema.parse(req.body);
      
      // For newborns, generate a temporary CPF placeholder if not provided
      if (patientData.isNewborn && (!patientData.cpf || patientData.cpf.trim() === '')) {
        // Generate unique placeholder CPF for newborns: RN + timestamp + random
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        patientData.cpf = `RN${timestamp}${random}`;
      }
      
      // Check if CPF already exists (skip for newborn placeholder CPFs)
      if (!patientData.cpf.startsWith('RN')) {
        const existingPatient = await storage.getPatientByCpf(patientData.cpf);
        if (existingPatient) {
          return res.status(400).json({ message: "CPF já cadastrado no sistema" });
        }
      }
      
      const patient = await storage.createPatient(patientData);
      res.status(201).json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.put("/api/patients/:id", requireAdminOrStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const patientData = insertPatientSchema.parse(req.body);
      
      const patient = await storage.updatePatient(id, patientData);
      
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      res.json(patient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(500).json({ message: "Erro ao atualizar paciente" });
    }
  });

  app.delete("/api/patients/:id", requireAdminOrStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePatient(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      res.json({ message: "Paciente removido com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao remover paciente" });
    }
  });

  // Appointments - staff and admin can view all
  app.get("/api/appointments", requireDoctorOrStaff, async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar agendamentos" });
    }
  });

  app.post("/api/appointments", requireDoctorOrStaff,
    auditLogger('CREATE', 'appointment', 'Created new appointment'),
    captureEntityId('id'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      // Try legacy schema first (from main form with all patient fields)
      let appointment;
      let appointmentData;
      let isLegacyFormat = false;
      
      try {
        appointmentData = insertLegacyAppointmentSchema.parse(req.body);
        appointment = await storage.createLegacyAppointment(appointmentData);
        isLegacyFormat = true;
      } catch {
        // Fall back to modern schema (from admin with patient ID)
        appointmentData = insertAppointmentSchema.parse(req.body);
        appointment = await storage.createAppointment(appointmentData);
      }
      
      // Get patient information (moved to outer scope to be available for all integrations)
      let patientInfo = {
        name: 'Paciente',
        cpf: '',
        susCard: '',
        whatsapp: ''
      };

      if (isLegacyFormat) {
        // For legacy format, data is directly in appointmentData
        const legacyData = appointmentData as any; // Type assertion for legacy format
        patientInfo = {
          name: legacyData.patientName,
          cpf: legacyData.patientCpf,
          susCard: legacyData.patientSusCard,
          whatsapp: legacyData.patientWhatsapp
        };
      } else if ((appointmentData as any).patientId) {
        // For modern format, fetch patient data
        const patient = await storage.getPatient((appointmentData as any).patientId);
        if (patient) {
          patientInfo = {
            name: patient.name,
            cpf: patient.cpf,
            susCard: patient.susCard,
            whatsapp: patient.whatsapp
          };
        }
      }

      try {
        // Google Calendar integration
        const calendarId = 'primary'; // Use primary calendar
        
        // Check if required Google credentials are available
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
          // Configure OAuth2 client with credentials
          oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          });

          // Calculate end time (1 hour after start)
          const startDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}:00`);
          const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour

          const specialty = await storage.getSpecialty(appointmentData.specialtyId);
          const specialtyName = specialty?.name || 'Consulta Médica';

          const event = {
            summary: `${specialtyName} - ${patientInfo.name}`,
            description: `AGENDAMENTO HOSPITALAR

Paciente: ${patientInfo.name}
CPF: ${patientInfo.cpf}
Cartão SUS: ${patientInfo.susCard}
WhatsApp: ${patientInfo.whatsapp}
Especialidade: ${specialtyName}

Motivo da consulta:
${appointmentData.reason}

---
Exu Saúde - Sistema de Atendimento Médico
Sistema de Atendimento Médico`,
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: 'America/Recife',
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: 'America/Recife',
            },
            attendees: [{ email: 'ramon@ncconvenios.com.br' }],
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 24 * 60 }, // 1 day before
                { method: 'popup', minutes: 60 }, // 1 hour before
              ],
            },
          };

          const calendarResponse = await calendar.events.insert({
            auth: oauth2Client,
            calendarId: calendarId,
            requestBody: event,
          });

          console.log('✅ Google Calendar event created successfully:', calendarResponse.data.id);
          console.log('📅 Event link:', calendarResponse.data.htmlLink);
          
          // Update the appointment with the Google Calendar event ID
          await storage.updateAppointment(appointment.id, {
            googleCalendarEventId: calendarResponse.data.id
          } as any);
        } else {
          console.log('⚠️  Google Calendar integration not configured. Missing credentials:');
          if (!process.env.GOOGLE_CLIENT_ID) console.log('   - GOOGLE_CLIENT_ID');
          if (!process.env.GOOGLE_CLIENT_SECRET) console.log('   - GOOGLE_CLIENT_SECRET');
          if (!process.env.GOOGLE_REFRESH_TOKEN) console.log('   - GOOGLE_REFRESH_TOKEN');
        }
      } catch (calendarError: any) {
        console.error('❌ Google Calendar integration failed:', calendarError?.message || calendarError);
        console.error('Calendar error details:', calendarError);
        // Continue without calendar integration
      }

      try {
        // Send confirmation email if credentials are available
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
          const specialty = await storage.getSpecialty(appointmentData.specialtyId);
          const specialtyName = specialty?.name || 'Consulta Médica';

          // Get patient information for email using the existing patientInfo variable
          let emailPatientInfo = {
            name: patientInfo.name,
            whatsapp: patientInfo.whatsapp || 'N/A'
          };
          
          await transporter.sendMail({
            from: `Exu Saúde - Sistema de Atendimento Médico <${process.env.GMAIL_USER}>`,
            to: `${emailPatientInfo.name} <patient@example.com>`, // In real app, collect email
            subject: 'Confirmação de Agendamento - Exu Saúde - Sistema de Atendimento Médico',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
                  <h1>Exu Saúde - Sistema de Atendimento Médico</h1>
                  <h2>Agendamento Confirmado</h2>
                </div>
                
                <div style="padding: 20px; background-color: #f8fafc;">
                  <p>Olá <strong>${emailPatientInfo.name}</strong>,</p>
                  <p>Seu agendamento foi confirmado com sucesso! Seguem os detalhes:</p>
                  
                  <div style="background-color: white; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
                    <h3 style="color: #1f2937; margin-top: 0;">Detalhes do Agendamento</h3>
                    <ul style="list-style: none; padding: 0;">
                      <li style="margin: 8px 0;"><strong>📅 Data:</strong> ${new Date(appointmentData.appointmentDate).toLocaleDateString('pt-BR')}</li>
                      <li style="margin: 8px 0;"><strong>⏰ Horário:</strong> ${appointmentData.appointmentTime}</li>
                      <li style="margin: 8px 0;"><strong>🩺 Especialidade:</strong> ${specialtyName}</li>
                      <li style="margin: 8px 0;"><strong>👤 Paciente:</strong> ${emailPatientInfo.name}</li>
                      <li style="margin: 8px 0;"><strong>📱 WhatsApp:</strong> ${emailPatientInfo.whatsapp}</li>
                    </ul>
                  </div>
                  
                  <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                    <h4 style="color: #92400e; margin-top: 0;">Motivo da Consulta:</h4>
                    <p style="color: #92400e;">${appointmentData.reason}</p>
                  </div>
                  
                  <div style="background-color: #dbeafe; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                    <h4 style="color: #1e40af; margin-top: 0;">Instruções Importantes:</h4>
                    <ul style="color: #1e40af;">
                      <li>Chegue 15 minutos antes do horário marcado</li>
                      <li>Traga seus documentos: RG, CPF e Cartão SUS</li>
                      <li>Traga exames anteriores relacionados ao caso</li>
                      <li>Em caso de emergência, procure o pronto-socorro</li>
                    </ul>
                  </div>
                </div>
                
                <div style="background-color: #374151; color: white; padding: 15px; text-align: center;">
                  <p style="margin: 0;">Exu Saúde - Sistema de Atendimento Médico</p>
                  <p style="margin: 5px 0; font-size: 14px;">Sistema de Atendimento Médico</p>
                </div>
              </div>
            `
          });
          console.log('✅ Confirmation email sent successfully');
        } else {
          console.log('⚠️  Email notification not configured. Missing credentials:');
          if (!process.env.GMAIL_USER) console.log('   - GMAIL_USER');
          if (!process.env.GMAIL_APP_PASSWORD) console.log('   - GMAIL_APP_PASSWORD');
        }
      } catch (emailError: any) {
        console.error('❌ Email sending failed:', emailError?.message || emailError);
        // Continue without email confirmation
      }

      try {
        // Send WhatsApp confirmation if credentials are available
        if (whatsappService) {
          const specialty = await storage.getSpecialty(appointmentData.specialtyId);
          const specialtyName = specialty?.name || 'Consulta Médica';

          // Get patient information for WhatsApp using the existing patientInfo variable
          let whatsappPatientInfo = {
            name: patientInfo.name,
            whatsapp: patientInfo.whatsapp || ''
          };

          if (whatsappPatientInfo.whatsapp) {
            const whatsappData: AppointmentReminderData = {
              patientName: whatsappPatientInfo.name,
              patientWhatsapp: whatsappPatientInfo.whatsapp,
              appointmentDate: appointmentData.appointmentDate,
              appointmentTime: appointmentData.appointmentTime,
              specialtyName: specialtyName,
              hospitalName: 'Exu Saúde - Sistema de Atendimento Médico',
              appointmentId: appointment.id
            };

            const whatsappSent = await whatsappService.sendAppointmentConfirmation(whatsappData);
            
            if (whatsappSent) {
              console.log('✅ WhatsApp confirmation sent successfully');
            } else {
              console.log('❌ Failed to send WhatsApp confirmation');
            }
          } else {
            console.log('⚠️  No WhatsApp number available for confirmation');
          }
        } else {
          console.log('⚠️  WhatsApp not configured. Missing credentials:');
          if (!process.env.WHATSAPP_PHONE_NUMBER_ID) console.log('   - WHATSAPP_PHONE_NUMBER_ID');
          if (!process.env.WHATSAPP_ACCESS_TOKEN) console.log('   - WHATSAPP_ACCESS_TOKEN');
        }
      } catch (whatsappError: any) {
        console.error('❌ WhatsApp notification failed:', whatsappError?.message || whatsappError);
        console.error('WhatsApp error details:', whatsappError);
        // Continue without WhatsApp notification
      }

      // Criar automaticamente pesquisa pré-consulta
      try {
        let finalPatientId: string | undefined;
        
        if (isLegacyFormat) {
          // Para formato legacy, encontrar/criar paciente baseado no CPF
          const patients = await storage.getPatients();
          const existingPatient = patients.find(p => p.cpf === patientInfo.cpf);
          finalPatientId = existingPatient?.id;
        } else {
          // Para formato moderno, usar o ID do paciente diretamente
          finalPatientId = (appointmentData as any).patientId;
        }

        if (finalPatientId) {
          console.log('🔍 Criando pesquisa pré-consulta automática...');
          const preConsultationSurvey = await satisfactionService.createPreConsultationSurvey(
            finalPatientId,
            appointment.id
          );
          console.log('✅ Pesquisa pré-consulta criada automaticamente:', preConsultationSurvey.id);
          
          // A pesquisa será enviada pelo cron service após 5 minutos
          console.log('⏰ Pesquisa pré-consulta será enviada automaticamente em 5 minutos pelo cron service');
        } else {
          console.log('⚠️  ID do paciente não encontrado para criar pesquisa pré-consulta');
        }
      } catch (surveyError: any) {
        console.error('❌ Falha ao criar pesquisa pré-consulta:', surveyError?.message || surveyError);
        // Continue sem falhar o agendamento
      }
      
      res.status(201).json(appointment);
    } catch (error) {
      console.error('Appointment creation error:', error);
      res.status(400).json({ message: "Dados inválidos para agendamento" });
    }
  });

  // Gerar HTML para impressão de agendamento
  app.get("/api/appointments/:id/pdf", requireDoctorOrStaff, async (req, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      // Preparar dados para o HTML
      const consultationData = {
        id: appointment.id,
        patientName: appointment.patientName || appointment.patient?.name || 'Nome não informado',
        patientCpf: appointment.patientCpf || appointment.patient?.cpf || 'CPF não informado',
        patientSusCard: appointment.patientSusCard || appointment.patient?.susCard || 'SUS não informado',
        patientWhatsapp: appointment.patientWhatsapp || appointment.patient?.whatsapp || 'WhatsApp não informado',
        patientBirthDate: new Intl.DateTimeFormat('pt-BR').format(new Date(appointment.patient?.birthDate || '1990-01-01')),
        patientGender: appointment.patient?.gender || 'Não informado',
        patientAddress: appointment.patient?.address || 'Endereço não informado',
        patientAddressNumber: appointment.patient?.addressNumber || 'S/N',
        patientNeighborhood: appointment.patient?.neighborhood || 'Bairro não informado',
        patientCity: appointment.patient?.city || 'Cidade não informada',
        patientState: appointment.patient?.state || 'PE',
        specialtyName: appointment.specialty?.name || 'Especialidade não informada',
        appointmentDate: new Intl.DateTimeFormat('pt-BR').format(new Date(appointment.appointmentDate)),
        appointmentTime: appointment.appointmentTime,
        doctorName: '', // Doctor name would come from medical history, not appointment
        observations: '', // Observations would come from medical history, not appointment
        status: appointment.status,
        createdAt: new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date(appointment.createdAt))
      };

      const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Comprovante de Consulta - ${consultationData.id}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
            .page-break { page-break-before: always; }
        }
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; line-height: 1.4; }
        .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .hospital-name { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
        .hospital-info { font-size: 14px; color: #666; margin-bottom: 5px; }
        .document-title { font-size: 20px; font-weight: bold; margin-top: 15px; text-transform: uppercase; }
        .section { margin-bottom: 30px; background: #f8fafc; padding: 20px; border-left: 5px solid #2563eb; border-radius: 5px; }
        .section-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; color: #1f2937; }
        .info-item { margin: 10px 0; display: flex; align-items: flex-start; }
        .info-label { font-weight: bold; color: #666; min-width: 150px; }
        .info-value { color: #333; flex: 1; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ccc; text-align: center; font-size: 12px; }
        .print-btn { position: fixed; top: 20px; right: 20px; background: #2563eb; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; z-index: 1000; }
        .print-btn:hover { background: #1d4ed8; }
    </style>
    <script>
        function printDocument() {
            window.print();
        }
    </script>
</head>
<body>
    <button class="print-btn no-print" onclick="printDocument()">🖨️ Imprimir / Salvar PDF</button>
    
    <div class="header">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <svg width="60" height="60" viewBox="0 0 100 100" style="margin-right: 15px;">
                <rect x="0" y="0" width="100" height="100" fill="#0077be" rx="10"/>
                <rect x="40" y="20" width="20" height="60" fill="white"/>
                <rect x="20" y="40" width="60" height="20" fill="white"/>
                <circle cx="30" cy="30" r="8" fill="white"/>
                <path d="M25 30 L30 35 L38 25" stroke="#0077be" stroke-width="2" fill="none"/>
            </svg>
            <div>
                <div class="hospital-name">Exu Saúde - Sistema de Atendimento Médico</div>
                <div class="document-title">Comprovante de Consulta Médica</div>
            </div>
        </div>
        <div class="hospital-info">Rodovia Asa Branca, 122 - s/n - Exu/PE - CEP: 56230-000</div>
        <div class="hospital-info">Telefone: (87) 3874-1234 | CNPJ: 12.345.678/0001-90</div>
        <p style="font-size: 14px; color: #666; margin-top: 10px;">Protocolo: ${consultationData.id}</p>
    </div>

    <div class="section">
        <div class="section-title">📋 Dados do Paciente</div>
        <div class="info-item"><span class="info-label">Nome:</span> <span class="info-value">${consultationData.patientName}</span></div>
        <div class="info-item"><span class="info-label">CPF:</span> <span class="info-value">${consultationData.patientCpf}</span></div>
        <div class="info-item"><span class="info-label">Cartão SUS:</span> <span class="info-value">${consultationData.patientSusCard}</span></div>
        <div class="info-item"><span class="info-label">WhatsApp:</span> <span class="info-value">${consultationData.patientWhatsapp}</span></div>
        <div class="info-item"><span class="info-label">Data Nascimento:</span> <span class="info-value">${consultationData.patientBirthDate}</span></div>
        <div class="info-item"><span class="info-label">Gênero:</span> <span class="info-value">${consultationData.patientGender}</span></div>
        <div class="info-item"><span class="info-label">Endereço:</span> <span class="info-value">${consultationData.patientAddress}, ${consultationData.patientAddressNumber}, ${consultationData.patientNeighborhood}, ${consultationData.patientCity}/${consultationData.patientState}</span></div>
    </div>

    <div class="section">
        <div class="section-title">🏥 Dados da Consulta</div>
        <div class="info-item"><span class="info-label">Especialidade:</span> <span class="info-value">${consultationData.specialtyName}</span></div>
        <div class="info-item"><span class="info-label">Data:</span> <span class="info-value">${consultationData.appointmentDate}</span></div>
        <div class="info-item"><span class="info-label">Horário:</span> <span class="info-value">${consultationData.appointmentTime}</span></div>
        <div class="info-item"><span class="info-label">Status:</span> <span class="info-value">${consultationData.status}</span></div>
        <div class="info-item"><span class="info-label">Agendado em:</span> <span class="info-value">${consultationData.createdAt}</span></div>
        ${consultationData.doctorName ? `<div class="info-item"><span class="info-label">Médico:</span> <span class="info-value">${consultationData.doctorName}</span></div>` : ''}
        ${consultationData.observations ? `<div class="info-item"><span class="info-label">Observações:</span> <span class="info-value">${consultationData.observations}</span></div>` : ''}
    </div>

    <div class="footer">
        <p style="font-weight: bold; font-size: 14px; margin-bottom: 10px;">⚠️ IMPORTANTE</p>
        <p>Este comprovante deve ser apresentado no dia da consulta junto com documento de identidade e cartão SUS.</p>
        <p>Para reagendamentos ou cancelamentos, entre em contato pelo telefone (87) 3874-1234.</p>
        <p style="margin-top: 20px; font-size: 11px; color: #888;">
            Documento gerado em: ${new Intl.DateTimeFormat('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Recife'
            }).format(new Date())} | Exu Saúde - Sistema de Atendimento Médico
        </p>
    </div>

    <script>
        window.addEventListener('load', function() {
            document.body.focus();
        });
    </script>
</body>
</html>
      `;

      res.set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });

      res.send(htmlContent);
    } catch (error) {
      console.error("Error generating appointment document:", error);
      res.status(500).json({ 
        message: "Erro ao gerar comprovante", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });



  app.put("/api/appointments/:id", requireDoctorOrStaff,
    auditLogger('UPDATE', 'appointment', 'Updated appointment'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const appointmentId = req.params.id;
      const appointmentData = insertAppointmentSchema.parse(req.body);
      
      // Update appointment in storage
      const appointment = await storage.updateAppointment(appointmentId, appointmentData);
      
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      
      // Try to update Google Calendar event if credentials are available
      try {
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
          oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          });

          // If there's a Google Calendar event ID, update it
          if (appointment.googleCalendarEventId) {
            const startDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}:00`);
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

            const specialty = await storage.getSpecialty(appointmentData.specialtyId);
            const specialtyName = specialty?.name || 'Consulta Médica';

            // For now, we'll use placeholder patient data for calendar updates
            // TODO: Implement proper patient data retrieval for edit scenarios
            const event = {
              summary: `${specialtyName} - Agendamento Atualizado`,
              description: `AGENDAMENTO HOSPITALAR - ATUALIZADO

Especialidade: ${specialtyName}

Motivo da consulta:
${appointmentData.reason}

---
Exu Saúde - Sistema de Atendimento Médico
Sistema de Atendimento Médico`,
              start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'America/Recife',
              },
              end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'America/Recife',
              },
              attendees: [{ email: 'ramon@ncconvenios.com.br' }],
            };

            await calendar.events.update({
              auth: oauth2Client,
              calendarId: 'primary',
              eventId: appointment.googleCalendarEventId,
              requestBody: event,
            });

            console.log('✅ Google Calendar event updated successfully:', appointment.googleCalendarEventId);
          }
        }
      } catch (calendarError: any) {
        console.error('❌ Google Calendar update failed:', calendarError?.message || calendarError);
        // Continue without calendar update
      }

      // NOTA: Pesquisas de satisfação agora são baseadas em queue entries, não em appointments
      // Este código foi removido pois o novo fluxo usa queueEntries ao invés de appointments
      
      res.json(appointment);
    } catch (error) {
      console.error('Error updating appointment:', error);
      res.status(500).json({ message: "Erro ao atualizar agendamento" });
    }
  });

  // Endpoint de relatórios
  app.get("/api/reports/appointments", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, specialtyId, zoneType } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          message: "Parâmetros startDate e endDate são obrigatórios" 
        });
      }

      const reportData = await storage.getAppointmentReports(
        startDate as string,
        endDate as string,
        specialtyId as string | undefined,
        zoneType as string | undefined
      );

      res.json({
        period: `${startDate} - ${endDate}`,
        ...reportData
      });
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      res.status(500).json({ 
        message: "Erro ao gerar relatório de agendamentos",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Attendance reports — based on medical_history (actual consultations by doctors)
  app.get("/api/reports/atendimentos", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, specialtyId, doctorName, zoneType } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Parâmetros startDate e endDate são obrigatórios" });
      }
      const data = await storage.getAttendanceReports(
        startDate as string,
        endDate as string,
        specialtyId as string | undefined,
        doctorName as string | undefined,
        zoneType as string | undefined
      );
      res.json({ period: `${startDate} - ${endDate}`, ...data });
    } catch (error) {
      console.error("Erro ao gerar relatório de atendimentos:", error);
      res.status(500).json({ message: "Erro ao gerar relatório de atendimentos" });
    }
  });

  app.get("/api/reports/doctors", isAuthenticated, async (req, res) => {
    try {
      const doctors = await storage.getDistinctDoctorsFromHistory();
      res.json(doctors);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar médicos" });
    }
  });

  app.delete("/api/appointments/:id", requireDoctorOrStaff,
    auditLogger('DELETE', 'appointment', 'Deleted appointment'),
    logAuditAfterResponse,
    async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get appointment to access Google Calendar event ID
      const appointment = await storage.getAppointment(id);
      
      if (appointment?.googleCalendarEventId) {
        try {
          // Delete from Google Calendar
          await calendar.events.delete({
            auth: oauth2Client,
            calendarId: 'ramon@ncconvenios.com.br',
            eventId: appointment.googleCalendarEventId,
          });
        } catch (calendarError) {
          console.warn('Failed to delete from Google Calendar:', calendarError);
        }
      }
      
      const deleted = await storage.deleteAppointment(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      
      res.json({ message: "Agendamento cancelado com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao cancelar agendamento" });
    }
  });

  // Integration status endpoint
  app.get("/api/integration-status", isAuthenticated, (req, res) => {
    const calendarConfigured = !!(
      process.env.GOOGLE_CLIENT_ID && 
      process.env.GOOGLE_CLIENT_SECRET && 
      process.env.GOOGLE_REFRESH_TOKEN
    );
    
    const emailConfigured = !!(
      process.env.GMAIL_USER && 
      process.env.GMAIL_APP_PASSWORD
    );
    
    res.json({
      calendar: calendarConfigured,
      email: emailConfigured
    });
  });

  // Reports - protected route
  app.get("/api/reports/stats", isAuthenticated, async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      const specialties = await storage.getSpecialties();
      
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const todayAppointments = appointments.filter(apt => apt.appointmentDate === today).length;
      const monthlyAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear;
      }).length;
      const pendingAppointments = appointments.filter(apt => apt.status === 'scheduled').length;
      
      res.json({
        todayAppointments,
        monthlyAppointments,
        totalSpecialties: specialties.length,
        pendingAppointments,
        appointmentsBySpecialty: specialties.map(spec => ({
          specialty: spec.name,
          count: appointments.filter(apt => apt.specialtyId === spec.id).length
        }))
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao gerar relatórios" });
    }
  });

  // Doctor Metrics Dashboard - comprehensive metrics for doctor view
  app.get("/api/doctor-metrics", requireDoctor, async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      const medicalHistory = await storage.getMedicalHistory();
      const patients = await storage.getPatients();
      const triages = await storage.getTriages();
      const documents = await storage.getMedicalDocuments();
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const currentWeek = Math.ceil((now.getDate() - now.getDay() + 1) / 7);
      
      // Calculate date ranges
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      
      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(weekStart.getDate() - 7);
      const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
      const lastWeekEndStr = weekStartStr;
      
      const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
      const lastMonthEnd = new Date(currentYear, currentMonth, 0);
      const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0];
      const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];
      
      // TODAY STATS
      const todayAppointments = appointments.filter(apt => apt.appointmentDate === today);
      const todayScheduled = todayAppointments.filter(apt => apt.status === 'scheduled').length;
      const todayCompleted = todayAppointments.filter(apt => apt.status === 'completed').length;
      const todayCancelled = todayAppointments.filter(apt => apt.status === 'cancelled').length;
      const todayPending = todayScheduled;
      
      // WEEK STATS
      const weekAppointments = appointments.filter(apt => apt.appointmentDate >= weekStartStr && apt.appointmentDate <= today);
      const weekCompleted = weekAppointments.filter(apt => apt.status === 'completed').length;
      
      const lastWeekAppointments = appointments.filter(apt => 
        apt.appointmentDate >= lastWeekStartStr && apt.appointmentDate < lastWeekEndStr
      );
      const lastWeekCompleted = lastWeekAppointments.filter(apt => apt.status === 'completed').length;
      
      // MONTH STATS
      const monthAppointments = appointments.filter(apt => apt.appointmentDate >= monthStartStr);
      const monthCompleted = monthAppointments.filter(apt => apt.status === 'completed').length;
      
      const lastMonthAppointments = appointments.filter(apt => 
        apt.appointmentDate >= lastMonthStartStr && apt.appointmentDate <= lastMonthEndStr
      );
      const lastMonthCompleted = lastMonthAppointments.filter(apt => apt.status === 'completed').length;
      
      // PATIENT STATS
      const newPatientsThisMonth = patients.filter(p => {
        const createdDate = new Date(p.createdAt || '');
        return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
      }).length;
      
      const returningPatientsCount = medicalHistory.filter(mh => {
        const consultDate = new Date(mh.consultationDate);
        return consultDate >= monthStart;
      }).length;
      
      // DOCUMENTS STATS
      const documentsThisMonth = documents.filter(doc => {
        const docDate = new Date(doc.createdAt || '');
        return docDate.getMonth() === currentMonth && docDate.getFullYear() === currentYear;
      });
      
      const receitas = documentsThisMonth.filter(doc => doc.documentType === 'prescription').length;
      const atestados = documentsThisMonth.filter(doc => doc.documentType === 'certificate').length;
      const laudos = documentsThisMonth.filter(doc => doc.documentType === 'medical_report').length;
      
      // TRIAGE STATS (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      const recentTriages = triages.filter(t => t.triageDate >= thirtyDaysAgoStr);
      const triageBySeverity = {
        baixa: recentTriages.filter(t => t.severity === 'baixa').length,
        média: recentTriages.filter(t => t.severity === 'média').length,
        alta: recentTriages.filter(t => t.severity === 'alta').length,
        emergência: recentTriages.filter(t => t.severity === 'emergência').length,
      };
      
      // UPCOMING APPOINTMENTS (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      
      const upcomingAppointments = appointments
        .filter(apt => apt.appointmentDate > today && apt.appointmentDate <= nextWeekStr && apt.status === 'scheduled')
        .sort((a, b) => {
          if (a.appointmentDate === b.appointmentDate) {
            return a.appointmentTime.localeCompare(b.appointmentTime);
          }
          return a.appointmentDate.localeCompare(b.appointmentDate);
        })
        .slice(0, 5);
      
      // AVERAGE CONSULTATION TIME (simplified estimate)
      const completedConsultations = medicalHistory.filter(mh => {
        const consultDate = new Date(mh.consultationDate);
        return consultDate >= monthStart;
      });
      
      // We don't have actual duration, so this is a placeholder
      const avgConsultationTime = completedConsultations.length > 0 ? 30 : 0; // minutes (placeholder)
      
      // PERFORMANCE COMPARISON
      const weekPerformance = lastWeekCompleted > 0 
        ? ((weekCompleted - lastWeekCompleted) / lastWeekCompleted * 100).toFixed(1)
        : weekCompleted > 0 ? '+100' : '0';
      
      const monthPerformance = lastMonthCompleted > 0
        ? ((monthCompleted - lastMonthCompleted) / lastMonthCompleted * 100).toFixed(1)
        : monthCompleted > 0 ? '+100' : '0';
      
      res.json({
        today: {
          total: todayAppointments.length,
          scheduled: todayScheduled,
          completed: todayCompleted,
          cancelled: todayCancelled,
          pending: todayPending,
        },
        week: {
          total: weekAppointments.length,
          completed: weekCompleted,
          performance: weekPerformance,
        },
        month: {
          total: monthAppointments.length,
          completed: monthCompleted,
          performance: monthPerformance,
        },
        patients: {
          newThisMonth: newPatientsThisMonth,
          returning: returningPatientsCount,
          total: patients.length,
        },
        documents: {
          total: documentsThisMonth.length,
          receitas,
          atestados,
          laudos,
        },
        triage: {
          total: recentTriages.length,
          bySeverity: triageBySeverity,
        },
        upcoming: upcomingAppointments.map(apt => ({
          id: apt.id,
          date: apt.appointmentDate,
          time: apt.appointmentTime,
          patient: apt.patientName || 'Paciente',
          reason: apt.reason,
        })),
        avgConsultationTime,
      });
    } catch (error) {
      console.error("Error fetching doctor metrics:", error);
      res.status(500).json({ message: "Erro ao buscar métricas do médico" });
    }
  });

  // Medical History routes - protected
  app.get("/api/medical-history", isAuthenticated, async (req, res) => {
    try {
      const records = await storage.getMedicalHistory();
      res.json(records);
    } catch (error) {
      console.error("Error fetching medical history:", error);
      res.status(500).json({ message: "Erro ao buscar histórico médico" });
    }
  });

  // Medical History Statistics
  app.get("/api/medical-history/stats", isAuthenticated, async (req, res) => {
    try {
      const records = await storage.getMedicalHistory();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      // Count consultations by period
      const todayCount = records.filter(r => {
        const consultDate = new Date(r.consultationDate);
        return consultDate >= today;
      }).length;

      const weekCount = records.filter(r => {
        const consultDate = new Date(r.consultationDate);
        return consultDate >= weekAgo;
      }).length;

      const monthCount = records.filter(r => {
        const consultDate = new Date(r.consultationDate);
        return consultDate >= monthAgo;
      }).length;

      // Count by specialty
      const specialtyMap = new Map<string, number>();
      records.forEach(r => {
        if (r.specialty?.name) {
          const count = specialtyMap.get(r.specialty.name) || 0;
          specialtyMap.set(r.specialty.name, count + 1);
        }
      });

      const bySpecialty = Array.from(specialtyMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Count by doctor
      const doctorMap = new Map<string, number>();
      records.forEach(r => {
        if (r.doctorName) {
          const count = doctorMap.get(r.doctorName) || 0;
          doctorMap.set(r.doctorName, count + 1);
        }
      });

      const byDoctor = Array.from(doctorMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      res.json({
        total: records.length,
        today: todayCount,
        week: weekCount,
        month: monthCount,
        bySpecialty,
        byDoctor,
      });
    } catch (error) {
      console.error("Error fetching medical history stats:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas do histórico médico" });
    }
  });

  // Get medical history attendance metrics (tempo de atendimento por médico/especialidade)
  app.get("/api/medical-history/metrics/attendance", isAuthenticated, async (req, res) => {
    try {
      const { period } = req.query; // 'today', 'week', 'month', 'all'
      const metrics = await storage.getMedicalHistoryAttendanceMetrics(period as string || 'today');
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching attendance metrics:", error);
      res.status(500).json({ message: "Erro ao buscar métricas de atendimento" });
    }
  });

  app.get("/api/medical-history/patient/:patientId", isAuthenticated, async (req, res) => {
    try {
      const { patientId } = req.params;
      const records = await storage.getMedicalHistoryByPatient(patientId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching patient medical history:", error);
      res.status(500).json({ message: "Erro ao buscar histórico médico do paciente" });
    }
  });

  // Export patient medical history as PDF
  app.get("/api/medical-history/patient/:patientId/export-pdf", isAuthenticated, async (req, res) => {
    try {
      const { patientId } = req.params;
      const records = await storage.getMedicalHistoryByPatient(patientId);
      
      if (records.length === 0) {
        return res.status(404).json({ message: "Nenhum registro médico encontrado para este paciente" });
      }

      const patient = records[0].patient;
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      // Sort records by date (newest first)
      const sortedRecords = records.sort((a, b) => 
        new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime()
      );

      // Build HTML content for PDF
      const recordsHTML = sortedRecords.map((record, index) => `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; page-break-inside: avoid;">
          <div style="background-color: #f3f4f6; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
            <strong>Consulta ${index + 1}</strong> - ${new Intl.DateTimeFormat('pt-BR').format(new Date(record.consultationDate))} às ${record.consultationTime}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Especialidade:</strong> ${record.specialty?.name || 'N/A'}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Médico:</strong> Dr(a). ${record.doctorName}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Motivo:</strong> ${record.reason}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Sintomas:</strong> ${record.symptoms}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Diagnóstico:</strong> ${record.diagnosis}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Tratamento:</strong> ${record.treatment}
          </div>
          ${record.medications ? `<div style="margin-bottom: 8px;"><strong>Medicações:</strong> ${record.medications}</div>` : ''}
          ${record.observations ? `<div style="margin-bottom: 8px;"><strong>Observações:</strong> ${record.observations}</div>` : ''}
          ${record.examResults ? `<div style="margin-bottom: 8px;"><strong>Resultados de Exames:</strong> ${record.examResults}</div>` : ''}
          ${record.nextConsultation ? `<div style="margin-bottom: 8px;"><strong>Próxima Consulta:</strong> ${new Intl.DateTimeFormat('pt-BR').format(new Date(record.nextConsultation))}</div>` : ''}
        </div>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              color: #1f2937;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
            }
            .hospital-name {
              font-size: 20px;
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 5px;
            }
            .document-title {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
              margin: 10px 0;
            }
            .patient-info {
              background-color: #eff6ff;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 25px;
            }
            .patient-info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .info-item {
              margin-bottom: 5px;
            }
            .info-label {
              font-weight: bold;
              color: #1e40af;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hospital-name">Exu Saúde - Sistema de Atendimento Médico</div>
            <div class="document-title">Histórico Médico Completo</div>
            <div style="font-size: 12px; color: #6b7280;">
              Gerado em ${new Intl.DateTimeFormat('pt-BR', { 
                dateStyle: 'long',
                timeStyle: 'short'
              }).format(new Date())}
            </div>
          </div>

          <div class="patient-info">
            <h3 style="margin-top: 0; color: #1e40af;">Informações do Paciente</h3>
            <div class="patient-info-grid">
              <div class="info-item">
                <span class="info-label">Nome:</span> ${patient.name}
              </div>
              <div class="info-item">
                <span class="info-label">CPF:</span> ${patient.cpf}
              </div>
              <div class="info-item">
                <span class="info-label">Cartão SUS:</span> ${patient.susCard}
              </div>
              <div class="info-item">
                <span class="info-label">Data de Nascimento:</span> ${new Intl.DateTimeFormat('pt-BR').format(new Date(patient.birthDate))}
              </div>
              <div class="info-item">
                <span class="info-label">WhatsApp:</span> ${patient.whatsapp}
              </div>
              <div class="info-item">
                <span class="info-label">Total de Consultas:</span> ${records.length}
              </div>
            </div>
          </div>

          <h3 style="color: #1e40af; margin-bottom: 15px;">Registros Médicos (${records.length})</h3>
          ${recordsHTML}

          <div class="footer">
            <p>Este documento foi gerado automaticamente pelo sistema do Exu Saúde - Sistema de Atendimento Médico.</p>
            <p>Documento confidencial - Uso exclusivo para fins médicos</p>
          </div>
        </body>
        </html>
      `;

      const pdfBuffer = await pdfGenerator.generateFromHTML(htmlContent);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="historico_medico_${patient.name.replace(/\s+/g, '_')}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error exporting medical history PDF:", error);
      res.status(500).json({ message: "Erro ao exportar histórico médico em PDF" });
    }
  });

  app.get("/api/medical-history/sus-card/:susCard", isAuthenticated, async (req, res) => {
    try {
      const { susCard } = req.params;
      const records = await storage.getMedicalHistoryBySusCard(susCard);
      res.json(records);
    } catch (error) {
      console.error("Error fetching medical history by SUS card:", error);
      res.status(500).json({ message: "Erro ao buscar histórico médico pelo cartão SUS" });
    }
  });

  app.post("/api/medical-history", isAuthenticated, async (req, res) => {
    try {
      const medicalData = { ...req.body };
      // Convert empty specialtyId to null for nurses/non-doctors
      if (medicalData.specialtyId === "" || medicalData.specialtyId === undefined) {
        medicalData.specialtyId = null;
      }
      // Keep hospitalizationId if provided (for hospitalization evolutions)
      const hospitalizationId = medicalData.hospitalizationId || null;
      
      // Determine attendance location based on hospitalization status
      let attendanceLocation = medicalData.attendanceLocation || null;
      if (hospitalizationId && !attendanceLocation) {
        const hospitalization = await storage.getHospitalization(hospitalizationId);
        if (hospitalization) {
          attendanceLocation = hospitalization.status; // observacao, sala_vermelha, ativo
        }
      }
      
      // Buscar usuário do banco para obter CRM/COREN
      const sessionUser = req.user as any;
      const fullUser = await storage.getUser(sessionUser.id);
      // CRM para médico, COREN para enfermeiro
      const doctorRegistration = fullUser?.role === 'triage' 
        ? ((fullUser as any)?.coren || null) 
        : (fullUser?.crm || null);
      const doctorRole = fullUser?.role || null;
      
      const validatedData = insertMedicalHistorySchema.parse(medicalData);
      const record = await storage.createMedicalRecord({ ...validatedData, hospitalizationId, attendanceLocation, doctorRegistration, doctorRole });
      
      if (hospitalizationId && record) {
        try {
          const user = req.user as any;
          await storage.createHospitalizationEvolution({
            hospitalizationId,
            createdBy: user?.id || "system",
            createdByName: user?.name || validatedData.doctorName || "Médico",
            createdByRole: user?.role || "doctor",
            evolutionDate: new Date(),
            evolutionType: "rotina",
            subjectiveNotes: validatedData.reason || "",
            objectiveNotes: "",
            assessment: validatedData.diagnosis || "",
            plan: validatedData.medications || "",
            medications: validatedData.medications || "",
            procedures: validatedData.examResults || "",
            diet: "",
            observations: validatedData.observations || "",
          });
        } catch (evolutionError) {
          console.error("Error creating hospitalization evolution:", evolutionError);
        }
      }
      
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        console.error("Error creating medical record:", error);
        res.status(500).json({ message: "Erro ao criar registro médico" });
      }
    }
  });

  app.put("/api/medical-history/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const hospitalizationId = req.body.hospitalizationId || null;
      const validatedData = insertMedicalHistorySchema.partial().parse(req.body);
      const record = await storage.updateMedicalRecord(id, validatedData);
      
      if (!record) {
        return res.status(404).json({ message: "Registro médico não encontrado" });
      }
      
      // Update hospitalization evolution if exists
      if (hospitalizationId) {
        try {
          const user = req.user as any;
          const evolutions = await storage.getHospitalizationEvolutions(hospitalizationId);
          // Find the most recent evolution for this medical record
          const existingEvolution = evolutions.find((e: any) => 
            e.createdBy === user?.id && 
            new Date(e.createdAt).toDateString() === new Date().toDateString()
          );
          
          if (existingEvolution) {
            // Update existing evolution
            await storage.updateHospitalizationEvolution(existingEvolution.id, {
              subjectiveNotes: validatedData.reason || existingEvolution.subjectiveNotes,
              assessment: validatedData.diagnosis || existingEvolution.assessment,
              plan: validatedData.medications || existingEvolution.plan,
              medications: validatedData.medications || existingEvolution.medications,
              procedures: validatedData.examResults || existingEvolution.procedures,
              observations: validatedData.observations || existingEvolution.observations,
            });
          }
        } catch (evolutionError) {
          console.error("Error updating hospitalization evolution:", evolutionError);
        }
      }
      
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        console.error("Error updating medical record:", error);
        res.status(500).json({ message: "Erro ao atualizar registro médico" });
      }
    }
  });

  app.delete("/api/medical-history/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteMedicalRecord(id);
      
      if (!success) {
        return res.status(404).json({ message: "Registro médico não encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting medical record:", error);
      res.status(500).json({ message: "Erro ao deletar registro médico" });
    }
  });

  // ===== TRIAGE ROUTES =====
  
  app.get("/api/triage", isAuthenticated, async (req, res) => {
    try {
      const triages = await storage.getTriages();
      res.json(triages);
    } catch (error) {
      console.error("Error fetching triages:", error);
      res.status(500).json({ message: "Erro ao buscar triagens" });
    }
  });

  app.get("/api/triage/patient/:patientId", isAuthenticated, async (req, res) => {
    try {
      const { patientId } = req.params;
      const triages = await storage.getTriagesByPatient(patientId);
      res.json(triages);
    } catch (error) {
      console.error("Error fetching triages by patient:", error);
      res.status(500).json({ message: "Erro ao buscar triagens do paciente" });
    }
  });

  app.get("/api/triage/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const triageRecord = await storage.getTriage(id);
      
      if (!triageRecord) {
        return res.status(404).json({ message: "Triagem não encontrada" });
      }
      
      res.json(triageRecord);
    } catch (error) {
      console.error("Error fetching triage:", error);
      res.status(500).json({ message: "Erro ao buscar triagem" });
    }
  });

  app.post("/api/triage", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTriageSchema.parse(req.body);
      
      // Validar justificativa quando há override da sugestão (independente do flag do cliente)
      const hasSuggestion = validatedData.suggestedSeverity && validatedData.suggestedSeverity.trim();
      const isDifferentFromSuggestion = hasSuggestion && validatedData.severity !== validatedData.suggestedSeverity;
      
      if (isDifferentFromSuggestion && !validatedData.overrideJustification?.trim()) {
        return res.status(400).json({ 
          message: "Justificativa obrigatória quando a classificação é diferente da sugerida pelo sistema" 
        });
      }
      
      // Corrigir o flag severityOverridden baseado nos dados reais
      const finalData = {
        ...validatedData,
        severityOverridden: isDifferentFromSuggestion || false,
      };
      
      const triageRecord = await storage.createTriage(finalData);
      
      // Auto-update queue priority based on triage severity (Protocolo de Manchester)
      const severityToPriority: Record<string, number> = {
        "vermelho": 1,  // Imediato
        "laranja": 2,   // 10 min
        "amarelo": 3,   // 60 min
        "verde": 4,     // 120 min
        "azul": 5,      // 240 min
      };
      
      const priority = severityToPriority[triageRecord.severity] || 5;
      const priorityStr = priority.toString() as "1" | "2" | "3" | "4" | "5";
      
      // Find active queue entry for this patient (any active status)
      const queueEntries = await storage.getActiveQueueEntries();
      const patientQueueEntry = queueEntries.find(
        (entry) => entry.patientId === triageRecord.patientId
      );
      
      // Update queue priority and triageId, and change status from aguardando_triagem to aguardando
      if (patientQueueEntry) {
        const newStatus = patientQueueEntry.status === 'aguardando_triagem' ? 'aguardando' : patientQueueEntry.status;
        await storage.updateQueueEntry(patientQueueEntry.id, { 
          priority: priorityStr,
          triageId: triageRecord.id,
          status: newStatus
        });
        console.log(`✅ Queue synced for patient ${triageRecord.patientId}: priority=${priority}, triageId=${triageRecord.id}, status=${patientQueueEntry.status}→${newStatus}`);
      } else {
        console.log(`⚠️  No active queue entry found for patient ${triageRecord.patientId}`);
      }
      
      res.status(201).json(triageRecord);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        console.error("Error creating triage:", error);
        res.status(500).json({ message: "Erro ao criar triagem" });
      }
    }
  });

  app.put("/api/triage/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertTriageSchema.partial().parse(req.body);
      
      // Buscar a triagem existente para comparar suggestedSeverity
      const existingTriage = await storage.getTriage(id);
      if (!existingTriage) {
        return res.status(404).json({ message: "Triagem não encontrada" });
      }
      
      // Usar suggestedSeverity existente se não foi fornecido na atualização
      const suggestedSeverity = validatedData.suggestedSeverity ?? existingTriage.suggestedSeverity;
      const newSeverity = validatedData.severity ?? existingTriage.severity;
      
      // Validar justificativa quando há override da sugestão
      const hasSuggestion = suggestedSeverity && suggestedSeverity.trim();
      const isDifferentFromSuggestion = hasSuggestion && newSeverity !== suggestedSeverity;
      
      if (isDifferentFromSuggestion && !validatedData.overrideJustification?.trim()) {
        return res.status(400).json({ 
          message: "Justificativa obrigatória quando a classificação é diferente da sugerida pelo sistema" 
        });
      }
      
      // Corrigir o flag severityOverridden baseado nos dados reais
      const finalData = {
        ...validatedData,
        severityOverridden: isDifferentFromSuggestion || false,
      };
      
      const triageRecord = await storage.updateTriage(id, finalData);
      
      if (!triageRecord) {
        return res.status(404).json({ message: "Triagem não encontrada" });
      }
      
      // Auto-update queue priority if severity changed (Protocolo de Manchester)
      if (validatedData.severity) {
        const severityToPriority: Record<string, number> = {
          "vermelho": 1,  // Imediato
          "laranja": 2,   // 10 min
          "amarelo": 3,   // 60 min
          "verde": 4,     // 120 min
          "azul": 5,      // 240 min
        };
        
        const priority = severityToPriority[triageRecord.severity] || 5;
        const priorityStr = priority.toString() as "1" | "2" | "3" | "4" | "5";
        
        // Find active queue entry for this patient (any active status)
        const queueEntries = await storage.getActiveQueueEntries();
        const patientQueueEntry = queueEntries.find(
          (entry) => entry.patientId === triageRecord.patientId
        );
        
        // Update queue priority and triageId, and change status from aguardando_triagem to aguardando
        if (patientQueueEntry) {
          const newStatus = patientQueueEntry.status === 'aguardando_triagem' ? 'aguardando' : patientQueueEntry.status;
          await storage.updateQueueEntry(patientQueueEntry.id, { 
            priority: priorityStr,
            triageId: triageRecord.id,
            status: newStatus
          });
          console.log(`✅ Queue synced for patient ${triageRecord.patientId}: priority=${priority}, triageId=${triageRecord.id}, status=${patientQueueEntry.status}→${newStatus}`);
        } else {
          console.log(`⚠️  No active queue entry found for patient ${triageRecord.patientId}`);
        }
      }
      
      res.json(triageRecord);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        console.error("Error updating triage:", error);
        res.status(500).json({ message: "Erro ao atualizar triagem" });
      }
    }
  });

  app.delete("/api/triage/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTriage(id);
      
      if (!success) {
        return res.status(404).json({ message: "Triagem não encontrada" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting triage:", error);
      res.status(500).json({ message: "Erro ao deletar triagem" });
    }
  });

  // Queue Entries routes - Fila de Atendimento
  // Get all queue entries
  app.get("/api/queue", isAuthenticated, async (req, res) => {
    try {
      const entries = await storage.getQueueEntries();
      res.json(entries);
    } catch (error) {
      console.error("Error fetching queue entries:", error);
      res.status(500).json({ message: "Erro ao buscar fila de atendimento" });
    }
  });

  // Get active queue entries (aguardando, chamado, em_atendimento)
  app.get("/api/queue/active", isAuthenticated, async (req, res) => {
    try {
      const entries = await storage.getActiveQueueEntries();
      res.json(entries);
    } catch (error) {
      console.error("Error fetching active queue entries:", error);
      res.status(500).json({ message: "Erro ao buscar fila ativa" });
    }
  });

  // Get called queue entries (for display panel - últimas chamadas)
  // SECURITY: Only accessible by painel.saude user
  app.get("/api/queue/called", requirePainelUser, async (req, res) => {
    try {
      const entries = await storage.getQueueEntries();
      const patients = await storage.getPatients();
      
      console.log(`📺 Painel: Total entries: ${entries.length}`);
      
      // Filter entries with status "chamado", "em_atendimento" or "finalizado" that have calledTime
      // This ensures the panel shows current call + recently finished calls
      const called = entries
        .filter(e => (e.status === 'chamado' || e.status === 'em_atendimento' || e.status === 'finalizado') && e.calledTime)
        .sort((a, b) => new Date(b.calledTime!).getTime() - new Date(a.calledTime!).getTime())
        .slice(0, 6) // Get last 6 calls
        .map(entry => {
          const patient = patients.find(p => p.id === entry.patientId);
          return {
            ...entry,
            patient
          };
        });
      
      console.log(`📺 Painel: Returning ${called.length} called entries (including finalized)`);
      res.json(called);
    } catch (error) {
      console.error("Error fetching called queue entries:", error);
      res.status(500).json({ message: "Erro ao buscar chamadas" });
    }
  });

  // Get queue metrics (tempos médios, estatísticas)
  app.get("/api/queue/metrics", isAuthenticated, async (req, res) => {
    try {
      const { period } = req.query; // 'today', 'week', 'month', 'all'
      const metrics = await storage.getQueueMetrics(period as string || 'today');
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching queue metrics:", error);
      res.status(500).json({ message: "Erro ao buscar métricas da fila" });
    }
  });

  // Get next queue number
  app.get("/api/queue/next-number", isAuthenticated, async (req, res) => {
    try {
      const nextNumber = await storage.getNextQueueNumber();
      res.json({ queueNumber: nextNumber });
    } catch (error) {
      console.error("Error getting next queue number:", error);
      res.status(500).json({ message: "Erro ao gerar próximo número da fila" });
    }
  });

  // Get single queue entry
  app.get("/api/queue/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const entry = await storage.getQueueEntry(id);
      
      if (!entry) {
        return res.status(404).json({ message: "Entrada não encontrada na fila" });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Error fetching queue entry:", error);
      res.status(500).json({ message: "Erro ao buscar entrada da fila" });
    }
  });

  // Generate Boletim PDF for queue entry
  app.get("/api/boletim/:queueEntryId/pdf", isAuthenticated, async (req, res) => {
    try {
      const { queueEntryId } = req.params;
      
      // Get queue entry
      const entry = await storage.getQueueEntry(queueEntryId);
      if (!entry) {
        return res.status(404).json({ message: "Entrada não encontrada na fila" });
      }
      
      // Get patient data
      const patient = await storage.getPatient(entry.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      // Calculate patient age
      const birthDate = new Date(patient.birthDate);
      const today = new Date();
      let patientAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        patientAge--;
      }
      
      // Get triage data if exists
      let triageData: any = null;
      if (entry.triageId) {
        triageData = await storage.getTriage(entry.triageId);
      }
      
      // Get doctor data if exists
      let doctorData: any = null;
      if (entry.doctorId) {
        doctorData = await storage.getUser(entry.doctorId);
      }
      
      // Get medical history for this patient on this queue date
      const medicalHistory = await storage.getMedicalHistoryByPatient(entry.patientId);
      const todayStr = entry.queueDate;
      
      // DEBUG: Log para investigar
      console.log('📋 Boletim - Buscando registros médicos:');
      console.log('  patientId:', entry.patientId);
      console.log('  queueDate:', todayStr);
      console.log('  total registros encontrados:', medicalHistory.length);
      if (medicalHistory.length > 0) {
        console.log('  datas dos registros:', medicalHistory.map(r => r.consultationDate));
      }
      
      // Buscar registros da data da fila, de hoje, ou de ontem (caso o atendimento atravesse dias)
      const todayDate = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0];
      const relevantRecords = medicalHistory.filter(record => {
        return record.consultationDate === todayStr || 
               record.consultationDate === todayDate || 
               record.consultationDate === yesterdayDate;
      });
      console.log('  registros do dia (queueDate, hoje ou ontem):', relevantRecords.length);
      
      // Combine anamnesis, physical exam, diagnosis from medical records
      let anamnesis = '';
      let physicalExam = '';
      let diagnosis = '';
      let cid = '';
      let medications = '';
      let observations = '';
      
      if (relevantRecords.length > 0) {
        const latestRecord = relevantRecords[relevantRecords.length - 1];

        anamnesis = latestRecord.reason || '';
        physicalExam = latestRecord.symptoms || '';
        diagnosis = latestRecord.diagnosis || '';
        cid = '';
        medications = latestRecord.medications || '';
        observations = latestRecord.observations || '';
      }
      
      // Get medical documents for this patient (prescriptions)
      const medicalDocs = await storage.getMedicalDocuments(undefined, entry.patientId);
      console.log('  total documentos médicos:', medicalDocs.length);
      
      const todayDocs = medicalDocs.filter(doc => {
        const docDate = new Date(doc.issueDate).toISOString().split('T')[0];
        return docDate === todayStr;
      });
      console.log('  documentos do dia:', todayDocs.length);
      
      // Get prescriptions from pharmacy system
      const pharmacyPrescriptions = await storage.getPrescriptionsByPatient(entry.patientId);
      console.log('  prescrições farmácia:', pharmacyPrescriptions?.length || 0);
      
      // Add medications from pharmacy prescriptions
      if (pharmacyPrescriptions && pharmacyPrescriptions.length > 0) {
        const todayPrescriptions = pharmacyPrescriptions.filter(p => {
          const prescDate = new Date(p.createdAt).toISOString().split('T')[0];
          return prescDate === todayStr;
        });
        if (todayPrescriptions.length > 0 && !medications) {
          // Buscar itens das prescrições
          const prescriptionItems = [];
          for (const presc of todayPrescriptions) {
            const items = await storage.getPrescriptionItems(presc.id);
            if (items) {
              for (const item of items) {
                const med = await storage.getMedicationCatalog(item.medicationId);
                if (med) {
                  prescriptionItems.push(`${med.name} - ${item.quantity} ${item.dosage || ''} - ${item.instructions || ''}`);
                }
              }
            }
          }
          if (prescriptionItems.length > 0) {
            medications = prescriptionItems.join('\n');
          }
        }
      }
      
      // Add medications from medical documents prescriptions if still not present
      if (!medications && todayDocs.length > 0) {
        const prescriptions = todayDocs.filter(d => d.documentType === 'prescription');
        if (prescriptions.length > 0) {
          medications = prescriptions.map(p => p.medications || p.content).join('\n');
        }
      }
      
      // Get CID from medical documents (certificates often have CID)
      if (!cid && todayDocs.length > 0) {
        const docsWithCid = todayDocs.filter(d => d.cid);
        if (docsWithCid.length > 0) {
          cid = docsWithCid.map(d => d.cid).join(', ');
        }
      }
      
      // Also check for CID in diagnosis field (sometimes doctors include CID in diagnosis)
      if (!cid && diagnosis) {
        const cidMatch = diagnosis.match(/\b([A-Z]\d{2}(?:\.\d{1,2})?)\b/);
        if (cidMatch) {
          cid = cidMatch[1];
        }
      }
      
      // Get lab exam requests for this patient (queueDate, hoje ou ontem)
      const labExamRequests = await storage.getExamRequests({ examType: 'laboratorio', patientId: entry.patientId });
      const relevantLabExams = labExamRequests.filter(exam => {
        const examDate = new Date(exam.createdAt).toISOString().split('T')[0];
        return examDate === todayStr || examDate === todayDate || examDate === yesterdayDate;
      });
      let labExams = '';
      if (relevantLabExams.length > 0) {
        labExams = relevantLabExams.map(exam => {
          const status = exam.status === 'concluido' ? '(Concluído)' : exam.status === 'em_andamento' ? '(Em andamento)' : '(Pendente)';
          return `${exam.examName || 'Exame Laboratorial'} ${status}`;
        }).join('\n');
      }
      console.log('  exames laboratoriais recentes:', relevantLabExams.length);
      
      // Get imaging/radiology exam requests for this patient (queueDate, hoje ou ontem)
      const imagingExamRequests = await storage.getExamRequests({ examType: 'radiologia', patientId: entry.patientId });
      const relevantImagingExams = imagingExamRequests.filter(exam => {
        const examDate = new Date(exam.createdAt).toISOString().split('T')[0];
        return examDate === todayStr || examDate === todayDate || examDate === yesterdayDate;
      });
      let imagingExams = '';
      if (relevantImagingExams.length > 0) {
        imagingExams = relevantImagingExams.map(exam => {
          const status = exam.status === 'concluido' ? '(Concluído)' : exam.status === 'em_andamento' ? '(Em andamento)' : '(Pendente)';
          return `${exam.examName || 'Exame de Imagem'} ${status}`;
        }).join('\n');
      }
      console.log('  exames de imagem recentes:', relevantImagingExams.length);
      
      // Format severity label
      const severityLabels: Record<string, string> = {
        'vermelho': 'Emergência (Vermelho)',
        'laranja': 'Muito Urgente (Laranja)',
        'amarelo': 'Urgente (Amarelo)',
        'verde': 'Pouco Urgente (Verde)',
        'azul': 'Não Urgente (Azul)',
        'emergencia': 'Emergência',
        'alta': 'Alta Prioridade',
        'media': 'Média Prioridade',
        'baixa': 'Baixa Prioridade'
      };
      
      // Format gender
      const genderLabels: Record<string, string> = {
        'masculino': 'Masculino',
        'feminino': 'Feminino'
      };
      
      // Format date helper
      const formatDateTime = (date: Date | string | null) => {
        if (!date) return undefined;
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Recife'
        }).format(new Date(date));
      };
      
      const formatDate = (date: string | null) => {
        if (!date) return '';
        return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
      };
      
      // DEBUG: Log tamanho dos campos
      console.log('📋 Boletim Debug - Tamanho dos campos:');
      console.log('  anamnesis:', anamnesis?.length || 0);
      console.log('  physicalExam:', physicalExam?.length || 0);
      console.log('  diagnosis:', diagnosis?.length || 0);
      console.log('  medications:', medications?.length || 0);
      console.log('  observations:', observations?.length || 0);
      console.log('  triageMainSymptoms:', triageData?.mainSymptoms?.length || 0);
      console.log('  triageObservations:', triageData?.observations?.length || 0);
      
      // Build boletim data
      const boletimData = {
        queueNumber: entry.queueNumber,
        protocolNumber: entry.id.substring(0, 8).toUpperCase(),
        attendanceDate: formatDate(entry.queueDate),
        attendanceTime: formatDateTime(entry.arrivalTime) || '',
        arrivalTime: formatDateTime(entry.arrivalTime) || '',
        startTime: entry.startTime ? formatDateTime(entry.startTime) : undefined,
        endTime: entry.endTime ? formatDateTime(entry.endTime) : undefined,
        
        patientName: patient.name,
        patientCpf: patient.cpf,
        patientSusCard: patient.susCard,
        patientBirthDate: formatDate(patient.birthDate),
        patientAge: patientAge,
        patientGender: genderLabels[patient.gender] || patient.gender,
        patientMotherName: patient.motherName || undefined,
        patientAddress: `${patient.address}, ${patient.addressNumber}, ${patient.neighborhood}, ${patient.city}/${patient.state}`,
        patientPhone: patient.whatsapp || undefined,
        
        triageSeverity: triageData ? (severityLabels[triageData.severity] || triageData.severity) : 'Não realizada',
        triageMainSymptoms: triageData?.mainSymptoms || undefined,
        triageTemperature: triageData?.temperature || undefined,
        triageBloodPressure: triageData?.bloodPressure || undefined,
        triageHeartRate: triageData?.heartRate || undefined,
        triageRespiratoryRate: triageData?.respiratoryRate || undefined,
        triageOxygenSaturation: triageData?.oxygenSaturation || undefined,
        triageWeight: triageData?.weight || undefined,
        triageHeight: triageData?.height || undefined,
        triageHgt: triageData?.hgt || undefined,
        triageObservations: triageData?.observations || undefined,
        triageStaffName: triageData?.staffName || undefined,
        
        doctorName: doctorData?.name || undefined,
        doctorCrm: doctorData?.crm || undefined,
        anamnesis: anamnesis || undefined,
        physicalExam: physicalExam || undefined,
        diagnosis: diagnosis || undefined,
        cid: cid || undefined,
        medications: medications || undefined,
        observations: observations || undefined,
        
        companionName: entry.companionName || undefined,
        companionRelationship: entry.companionRelationship || undefined,
        
        labExams: labExams || undefined,
        imagingExams: imagingExams || undefined
      };
      
      // Generate PDF
      const pdfBuffer = await pdfGenerator.generateBoletimPDF(boletimData);
      
      // Set response headers
      const fileName = `Boletim_${entry.queueNumber}_${patient.name.replace(/\s+/g, '_')}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating boletim PDF:", error);
      res.status(500).json({ message: "Erro ao gerar boletim de atendimento" });
    }
  });

  // Create queue entry (recepcionista adiciona paciente à fila)
  app.post("/api/queue", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertQueueEntrySchema.parse(req.body);
      const entry = await storage.createQueueEntry(validatedData);
      
      // Agendar notificações WhatsApp
      try {
        const patient = await storage.getPatient(entry.patientId);
        
        if (patient) {
          // 1. Confirmação de entrada na fila (imediata)
          await storage.createScheduledMessage({
            queueEntryId: entry.id,
            patientId: entry.patientId,
            messageType: "queue_confirmation",
            scheduledFor: new Date(), // Enviar imediatamente
            status: SCHEDULED_MESSAGE_STATUS.PENDING
          });
          
          // 2. Pesquisa de satisfação do atendente (10 segundos depois)
          const tenSecondsLater = new Date(Date.now() + 10 * 1000);
          await storage.createScheduledMessage({
            queueEntryId: entry.id,
            patientId: entry.patientId,
            messageType: "receptionist_survey",
            scheduledFor: tenSecondsLater,
            status: SCHEDULED_MESSAGE_STATUS.PENDING
          });
          
          // 3. Criar registro de pesquisa de satisfação do atendente
          await storage.createSatisfactionSurvey({
            queueEntryId: entry.id,
            patientId: entry.patientId,
            surveyType: "receptionist_satisfaction",
            status: SATISFACTION_SURVEY_STATUS.PENDING
          });
          
          console.log(`📱 Scheduled WhatsApp notifications for queue entry ${entry.queueNumber}`);
        }
      } catch (notifError) {
        console.error("Error scheduling WhatsApp notifications:", notifError);
        // Não falhar a criação da fila se as notificações falharem
      }
      
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        console.error("Error creating queue entry:", error);
        res.status(500).json({ message: "Erro ao adicionar paciente à fila" });
      }
    }
  });

  // Call next patient (médico chama próximo da fila)
  app.post("/api/queue/call-next", requireDoctor, async (req, res) => {
    try {
      const user = req.user as any;
      const doctorId = user.id;
      
      const nextPatient = await storage.callNextPatient(doctorId);
      
      if (!nextPatient) {
        return res.status(404).json({ message: "Nenhum paciente aguardando na fila" });
      }
      
      res.json(nextPatient);
    } catch (error) {
      console.error("Error calling next patient:", error);
      res.status(500).json({ message: "Erro ao chamar próximo paciente" });
    }
  });

  // Start attendance (médico inicia atendimento)
  app.post("/api/queue/:id/start", requireDoctor, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const doctorId = user.id;
      
      const entry = await storage.startAttendance(id, doctorId);
      
      if (!entry) {
        return res.status(404).json({ message: "Entrada não encontrada na fila" });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Error starting attendance:", error);
      res.status(500).json({ message: "Erro ao iniciar atendimento" });
    }
  });

  // Finish attendance (médico finaliza atendimento)
  app.post("/api/queue/:id/finish", requireDoctor, async (req, res) => {
    try {
      const { id } = req.params;
      
      const entry = await storage.finishAttendance(id);
      
      if (!entry) {
        return res.status(404).json({ message: "Entrada não encontrada na fila" });
      }
      
      // Agendar pesquisa de satisfação do médico (imediata)
      try {
        console.log(`🔍 DEBUG: Iniciando agendamento de pesquisa do médico para entry ${entry.id}`);
        const patient = await storage.getPatient(entry.patientId);
        console.log(`🔍 DEBUG: Patient found: ${patient ? 'SIM' : 'NÃO'}, patientId: ${entry.patientId}`);
        
        if (patient) {
          console.log(`🔍 DEBUG: Criando scheduled_message para doctor_survey`);
          // Agendar mensagem WhatsApp (imediata)
          const scheduledMsg = await storage.createScheduledMessage({
            queueEntryId: entry.id,
            patientId: entry.patientId,
            messageType: "doctor_survey",
            scheduledFor: new Date(), // Enviar imediatamente
            status: SCHEDULED_MESSAGE_STATUS.PENDING
          });
          console.log(`🔍 DEBUG: Scheduled message created: ${scheduledMsg ? 'SIM' : 'NÃO'}`);
          
          // Criar registro de pesquisa de satisfação do médico
          console.log(`🔍 DEBUG: Criando satisfaction_survey para doctor`);
          await storage.createSatisfactionSurvey({
            queueEntryId: entry.id,
            patientId: entry.patientId,
            surveyType: "doctor_satisfaction",
            status: SATISFACTION_SURVEY_STATUS.PENDING
          });
          
          console.log(`📱 Scheduled doctor survey for queue entry ${entry.queueNumber} immediately`);
        } else {
          console.warn(`⚠️ Patient not found for patientId: ${entry.patientId}`);
        }
      } catch (notifError) {
        console.error("❌ Error scheduling doctor survey:", notifError);
        console.error("❌ Error stack:", notifError instanceof Error ? notifError.stack : 'No stack');
        // Não falhar a finalização se as notificações falharem
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Error finishing attendance:", error);
      res.status(500).json({ message: "Erro ao finalizar atendimento" });
    }
  });

  // Send directly to observation (enviar diretamente para observação - sem leito)
  app.post("/api/queue/:id/send-to-observation", requireDoctor, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      // Get queue entry
      const entry = await storage.getQueueEntry(id);
      if (!entry) {
        return res.status(404).json({ message: "Entrada não encontrada na fila" });
      }
      
      // Get patient info
      const patient = await storage.getPatient(entry.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      // Create observation record WITHOUT bed allocation
      const hospitalization = await storage.createHospitalization({
        patientId: entry.patientId,
        bedId: null, // No bed for observation
        admissionDate: new Date().toISOString(),
        admissionDiagnosis: "Paciente em observação",
        admissionReason: "Encaminhado para observação após atendimento médico",
        cidCode: "",
        attendingDoctorId: user.id,
        attendingDoctorName: user.name || "Médico",
        severity: entry.triageClassification || "media",
        status: "observacao",
        observations: `Encaminhado da fila de atendimento #${entry.queueNumber}`
      });
      
      // Finish the attendance
      await storage.finishAttendance(id);
      
      console.log(`👁️ Paciente ${patient.name} enviado para observação (sem leito)`);
      
      res.json({ 
        success: true, 
        hospitalization,
        message: `Paciente ${patient.name} enviado para observação` 
      });
    } catch (error) {
      console.error("Error sending to observation:", error);
      res.status(500).json({ message: "Erro ao enviar para observação" });
    }
  });

  // Send directly to red room (enviar diretamente para Sala Vermelha - sem leito)
  app.post("/api/queue/:id/send-to-red-room", requireDoctor, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      // Get queue entry
      const entry = await storage.getQueueEntry(id);
      if (!entry) {
        return res.status(404).json({ message: "Entrada não encontrada na fila" });
      }
      
      // Get patient info
      const patient = await storage.getPatient(entry.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      // Create red room record WITHOUT bed allocation
      const hospitalization = await storage.createHospitalization({
        patientId: entry.patientId,
        bedId: null, // No bed for red room
        admissionDate: new Date().toISOString(),
        admissionDiagnosis: "Paciente em estado crítico/emergência",
        admissionReason: "Encaminhado para Sala Vermelha após atendimento médico",
        cidCode: "",
        attendingDoctorId: user.id,
        attendingDoctorName: user.name || "Médico",
        severity: entry.triageClassification || "critica",
        status: "sala_vermelha",
        observations: `Encaminhado da fila de atendimento #${entry.queueNumber}`
      });
      
      // Finish the attendance
      await storage.finishAttendance(id);
      
      console.log(`🔴 Paciente ${patient.name} enviado para Sala Vermelha`);
      
      res.json({ 
        success: true, 
        hospitalization,
        message: `Paciente ${patient.name} enviado para Sala Vermelha` 
      });
    } catch (error) {
      console.error("Error sending to red room:", error);
      res.status(500).json({ message: "Erro ao enviar para Sala Vermelha" });
    }
  });

  // Back to queue from attendance (médico volta paciente à fila)
  app.post("/api/queue/:id/back-to-queue", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      const entry = await storage.backToQueueFromAttendance(id);
      
      if (!entry) {
        return res.status(404).json({ message: "Entrada não encontrada na fila" });
      }
      
      console.log(`🔄 Paciente #${entry.queueNumber} voltou à fila`);
      res.json(entry);
    } catch (error) {
      console.error("Error sending queue entry back:", error);
      res.status(500).json({ message: "Erro ao voltar paciente à fila" });
    }
  });

  // Cancel queue entry
  app.post("/api/queue/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const entry = await storage.cancelQueueEntry(id, reason || "Cancelado pelo sistema");
      
      if (!entry) {
        return res.status(404).json({ message: "Entrada não encontrada na fila" });
      }
      
      console.log(`❌ Paciente #${entry.queueNumber} cancelado: ${reason}`);
      res.json(entry);
    } catch (error) {
      console.error("Error canceling queue entry:", error);
      res.status(500).json({ message: "Erro ao cancelar entrada da fila" });
    }
  });

  // Update queue entry
  app.put("/api/queue/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertQueueEntrySchema.partial().parse(req.body);
      const entry = await storage.updateQueueEntry(id, validatedData);
      
      if (!entry) {
        return res.status(404).json({ message: "Entrada não encontrada na fila" });
      }
      
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        console.error("Error updating queue entry:", error);
        res.status(500).json({ message: "Erro ao atualizar entrada da fila" });
      }
    }
  });

  // Prescription Templates routes - protected for doctors
  app.get("/api/prescription-templates", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const doctorId = user?.role === 'doctor' ? user.id : req.query.doctorId as string;
      const templates = await storage.getPrescriptionTemplates(doctorId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching prescription templates:", error);
      res.status(500).json({ message: "Erro ao buscar templates de prescrição" });
    }
  });

  app.get("/api/prescription-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getPrescriptionTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: "Template não encontrado" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching prescription template:", error);
      res.status(500).json({ message: "Erro ao buscar template de prescrição" });
    }
  });

  app.post("/api/prescription-templates", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPrescriptionTemplateSchema.parse(req.body);
      const template = await storage.createPrescriptionTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        console.error("Error creating prescription template:", error);
        res.status(500).json({ message: "Erro ao criar template de prescrição" });
      }
    }
  });

  app.patch("/api/prescription-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertPrescriptionTemplateSchema.partial().parse(req.body);
      const template = await storage.updatePrescriptionTemplate(id, validatedData);
      
      if (!template) {
        return res.status(404).json({ message: "Template não encontrado" });
      }
      
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        console.error("Error updating prescription template:", error);
        res.status(500).json({ message: "Erro ao atualizar template de prescrição" });
      }
    }
  });

  app.delete("/api/prescription-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePrescriptionTemplate(id);
      
      if (!success) {
        return res.status(404).json({ message: "Template não encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting prescription template:", error);
      res.status(500).json({ message: "Erro ao deletar template de prescrição" });
    }
  });

  // Medical Documents routes - Receitas, Atestados e Prescrições
  app.get("/api/medical-documents", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const doctorId = req.query.doctorId as string | undefined;
      const patientId = req.query.patientId as string | undefined;
      
      // If user is a doctor and no doctorId is specified, filter by their own ID
      const filterDoctorId = user?.role === 'doctor' && !doctorId ? user.id : doctorId;
      
      const documents = await storage.getMedicalDocuments(filterDoctorId, patientId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching medical documents:", error);
      res.status(500).json({ message: "Erro ao buscar documentos médicos" });
    }
  });

  app.get("/api/medical-documents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getMedicalDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Documento não encontrado" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching medical document:", error);
      res.status(500).json({ message: "Erro ao buscar documento médico" });
    }
  });

  app.post("/api/medical-documents", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertMedicalDocumentSchema.parse(req.body);
      
      if (validatedData.isSigned && validatedData.signedBy) {
        validatedData.signedAt = new Date();
        const ip = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
        validatedData.signatureIp = Array.isArray(ip) ? ip[0] : ip;
        
        console.log('✍️ Document signed:', {
          documentType: validatedData.documentType,
          signedBy: validatedData.signedBy,
          signedAt: validatedData.signedAt,
          signatureHash: validatedData.signatureHash?.substring(0, 10) + '...',
          ip: validatedData.signatureIp
        });
      }
      
      const document = await storage.createMedicalDocument(validatedData);

      if (document.documentType !== 'radiology_images') {
        try {
          const patient = await storage.getPatient(document.patientId);
          if (patient) {
            let patientAge: number | undefined;
            if (patient.birthDate) {
              const birthDate = new Date(patient.birthDate);
              const today = new Date();
              patientAge = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                patientAge--;
              }
            }

            let startDate: string | undefined;
            let endDate: string | undefined;
            if (document.documentType === 'certificate' && document.daysOff) {
              const days = parseInt(document.daysOff);
              if (!isNaN(days)) {
                const start = new Date(document.issueDate + "T12:00:00");
                const end = new Date(start);
                end.setDate(end.getDate() + days - 1);
                startDate = new Intl.DateTimeFormat('pt-BR').format(start);
                endDate = new Intl.DateTimeFormat('pt-BR').format(end);
              }
            }

            let doctorSignature: string | undefined;
            if (document.isSigned && document.signedBy) {
              const users = await storage.listUsers();
              const doctor = users.find(u => u.id === document.signedBy);
              if (doctor && doctor.signature) {
                doctorSignature = doctor.signature;
              }
            }

            let signedAtFormatted: string | undefined;
            if (document.signedAt) {
              signedAtFormatted = new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', timeZone: 'America/Recife'
              }).format(new Date(document.signedAt));
            }

            const pdfData = {
              id: document.id,
              title: document.title,
              patientName: patient.name,
              patientCpf: patient.cpf,
              patientEmail: undefined,
              patientPhone: patient.whatsapp,
              patientGender: patient.gender === 'masculino' ? 'Masculino' : patient.gender === 'feminino' ? 'Feminino' : patient.gender,
              patientAge,
              documentType: document.documentType as 'prescription' | 'certificate' | 'medical_report',
              content: document.content,
              diagnosis: document.diagnosis || undefined,
              medications: document.medications || undefined,
              observations: document.observations || undefined,
              daysOff: document.daysOff || undefined,
              startDate,
              endDate,
              cid: document.cid || undefined,
              doctorName: document.doctorName,
              doctorCrm: document.doctorCrm,
              issueDate: document.issueDate,
              isSigned: document.isSigned,
              doctorSignature,
              signedAt: signedAtFormatted,
              signatureHash: document.signatureHash ? document.signatureHash.substring(0, 16) + '...' : undefined
            };

            const pdfBuffer = await pdfGenerator.generateMedicalDocumentPDF(pdfData);
            console.log('📄 PDF generated for permanent storage, size:', pdfBuffer.length, 'bytes');

            const { ObjectStorageService } = await import("./objectStorage");
            const objectStorageService = new ObjectStorageService();
            const fileName = `${document.documentType}_${document.id}.pdf`;
            const fileUrl = await objectStorageService.uploadBuffer(pdfBuffer, "medical-documents", fileName, "application/pdf");

            await storage.updateMedicalDocument(document.id, { fileUrl });
            document.fileUrl = fileUrl;
            console.log('✅ PDF saved permanently to Object Storage:', fileUrl);
          }
        } catch (pdfError) {
          console.error('⚠️ Failed to save PDF to Object Storage (document still created):', pdfError);
        }
      }

      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        console.error("Error creating medical document:", error);
        res.status(500).json({ message: "Erro ao criar documento médico" });
      }
    }
  });

  app.patch("/api/medical-documents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertMedicalDocumentSchema.partial().parse(req.body);
      const document = await storage.updateMedicalDocument(id, validatedData);
      
      if (!document) {
        return res.status(404).json({ message: "Documento não encontrado" });
      }
      
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      } else {
        console.error("Error updating medical document:", error);
        res.status(500).json({ message: "Erro ao atualizar documento médico" });
      }
    }
  });

  app.delete("/api/medical-documents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteMedicalDocument(id);
      
      if (!success) {
        return res.status(404).json({ message: "Documento não encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting medical document:", error);
      res.status(500).json({ message: "Erro ao deletar documento médico" });
    }
  });

  // Generate PDF for medical document
  app.get("/api/medical-documents/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      console.log('📄 PDF Request for document ID:', id);
      
      const document = await storage.getMedicalDocument(id);
      
      if (!document) {
        console.error('❌ Document not found:', id);
        return res.status(404).json({ message: "Documento não encontrado" });
      }

      console.log('✅ Document found:', document.title);

      if (document.fileUrl) {
        try {
          console.log('📥 Serving saved PDF from Object Storage:', document.fileUrl);
          const { ObjectStorageService } = await import("./objectStorage");
          const objectStorageService = new ObjectStorageService();
          const file = await objectStorageService.getObjectEntityFile(document.fileUrl);
          
          const patient = await storage.getPatient(document.patientId);
          const patientName = patient ? patient.name.replace(/\s+/g, '_') : 'paciente';
          const fileName = `${document.title.replace(/\s+/g, '_')}_${patientName}.pdf`;
          const isInline = req.query.inline === 'true';
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `${isInline ? 'inline' : 'attachment'}; filename="${fileName}"`);
          
          await storage.updateMedicalDocument(id, { printed: true });
          
          const stream = file.createReadStream();
          stream.on("error", (err: Error) => {
            console.error("Stream error:", err);
            if (!res.headersSent) {
              res.status(500).json({ error: "Error streaming file" });
            }
          });
          stream.pipe(res);
          return;
        } catch (storageError) {
          console.warn('⚠️ Failed to serve from Object Storage, falling back to generation:', storageError);
        }
      }

      // Get patient name
      const patient = await storage.getPatient(document.patientId);
      if (!patient) {
        console.error('❌ Patient not found:', document.patientId);
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      console.log('✅ Patient found:', patient.name);

      // Calculate patient age
      let patientAge: number | undefined;
      if (patient.birthDate) {
        const birthDate = new Date(patient.birthDate);
        const today = new Date();
        patientAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          patientAge--;
        }
      }

      // Calculate start and end dates for certificates
      let startDate: string | undefined;
      let endDate: string | undefined;
      if (document.documentType === 'certificate' && document.daysOff) {
        const days = parseInt(document.daysOff);
        if (!isNaN(days)) {
          const start = new Date(document.issueDate + "T12:00:00");
          const end = new Date(start);
          end.setDate(end.getDate() + days - 1);
          startDate = new Intl.DateTimeFormat('pt-BR').format(start);
          endDate = new Intl.DateTimeFormat('pt-BR').format(end);
        }
      }

      // Get doctor signature if document is signed
      let doctorSignature: string | undefined;
      if (document.isSigned && document.signedBy) {
        const users = await storage.listUsers();
        const doctor = users.find(u => u.id === document.signedBy);
        if (doctor && doctor.signature) {
          doctorSignature = doctor.signature;
          console.log('✍️ Including doctor signature in PDF');
        }
      }

      // Format signed date
      let signedAtFormatted: string | undefined;
      if (document.signedAt) {
        signedAtFormatted = new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Recife'
        }).format(new Date(document.signedAt));
      }

      // Prepare data for PDF generation
      const pdfData = {
        id: document.id,
        title: document.title,
        patientName: patient.name,
        patientCpf: patient.cpf,
        patientEmail: undefined, // Patient model doesn't have email field
        patientPhone: patient.whatsapp,
        patientGender: patient.gender === 'masculino' ? 'Masculino' : patient.gender === 'feminino' ? 'Feminino' : patient.gender,
        patientAge,
        documentType: document.documentType as 'prescription' | 'certificate' | 'medical_report',
        content: document.content,
        diagnosis: document.diagnosis || undefined,
        medications: document.medications || undefined,
        observations: document.observations || undefined,
        daysOff: document.daysOff || undefined,
        startDate,
        endDate,
        cid: document.cid || undefined,
        doctorName: document.doctorName,
        doctorCrm: document.doctorCrm,
        issueDate: document.issueDate,
        // Digital signature fields
        isSigned: document.isSigned,
        doctorSignature,
        signedAt: signedAtFormatted,
        signatureHash: document.signatureHash ? document.signatureHash.substring(0, 16) + '...' : undefined
      };

      console.log('📋 Generating PDF with data:', { title: pdfData.title, patient: pdfData.patientName });

      // Generate PDF
      const pdfBuffer = await pdfGenerator.generateMedicalDocumentPDF(pdfData);

      console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');

      // Update document status to printed
      await storage.updateMedicalDocument(id, { printed: true });

      // Set headers for PDF - use inline for viewing, attachment for download
      const fileName = `${document.title.replace(/\s+/g, '_')}_${patient.name.replace(/\s+/g, '_')}.pdf`;
      const isInline = req.query.inline === 'true';
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.setHeader('Content-Disposition', `${isInline ? 'inline' : 'attachment'}; filename="${fileName}"`);
      
      console.log('📤 Sending PDF to client, filename:', fileName, 'inline:', isInline);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      res.status(500).json({ message: "Erro ao gerar PDF do documento" });
    }
  });

  // Send medical document via WhatsApp
  app.post("/api/medical-documents/:id/send-whatsapp", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      console.log('📱 WhatsApp send request for document ID:', id);

      if (!whatsappService) {
        return res.status(400).json({ message: "WhatsApp não está configurado" });
      }

      const document = await storage.getMedicalDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Documento não encontrado" });
      }

      const patient = await storage.getPatient(document.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      if (!patient.whatsapp) {
        return res.status(400).json({ message: "Paciente não possui telefone cadastrado" });
      }

      // Verifica se o telefone está marcado como WhatsApp
      if (patient.phoneIsWhatsapp === false) {
        return res.status(400).json({ message: "O telefone do paciente não é WhatsApp. Para enviar mensagens via WhatsApp, marque a opção 'É WhatsApp?' no cadastro do paciente." });
      }

      // Format document type in Portuguese
      const documentTypeNames: Record<string, string> = {
        'prescription': 'Receita Médica',
        'certificate': 'Atestado Médico',
        'medical_report': 'Laudo Médico'
      };
      const docTypeName = documentTypeNames[document.documentType] || document.title;

      // Generate secure token for PDF access
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
      pdfTokens.set(token, { documentId: id, expiresAt });

      // Create public PDF URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : `http://localhost:${process.env.PORT || 5000}`;
      const pdfUrl = `${baseUrl}/api/public/pdf/${token}`;
      const filename = `${document.title.replace(/\s+/g, '_')}.pdf`;

      // Format issue date
      const issueDate = new Intl.DateTimeFormat('pt-BR').format(new Date(document.issueDate));

      // Send document via WhatsApp template
      const success = await whatsappService.sendMedicalDocument({
        patientName: patient.name,
        patientWhatsapp: patient.whatsapp,
        documentType: docTypeName,
        documentTitle: document.title,
        doctorName: document.doctorName,
        issueDate,
        pdfUrl,
        filename
      });

      if (success) {
        // Update document status
        await storage.updateMedicalDocument(id, { sentViaWhatsApp: true });
        
        console.log('✅ Document sent via WhatsApp with PDF attachment');
        res.json({ 
          success: true, 
          message: "Documento enviado via WhatsApp com sucesso" 
        });
      } else {
        // Clean up token on failure
        pdfTokens.delete(token);
        
        console.error('❌ Failed to send WhatsApp document');
        res.status(500).json({ 
          success: false, 
          message: "Erro ao enviar documento via WhatsApp" 
        });
      }
    } catch (error) {
      console.error("❌ Error sending document via WhatsApp:", error);
      res.status(500).json({ message: "Erro ao enviar documento via WhatsApp" });
    }
  });

  // Send medical document via Email
  app.post("/api/medical-documents/:id/send-email", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { recipientEmail } = req.body;
      console.log('📧 Email send request for document ID:', id);

      const document = await storage.getMedicalDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Documento não encontrado" });
      }

      const patient = await storage.getPatient(document.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      if (!recipientEmail) {
        return res.status(400).json({ message: "Email destinatário é obrigatório" });
      }

      // Calculate patient age
      let patientAge: number | undefined;
      if (patient.birthDate) {
        const birthDate = new Date(patient.birthDate);
        const today = new Date();
        patientAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          patientAge--;
        }
      }

      // Calculate start and end dates for certificates
      let startDate: string | undefined;
      let endDate: string | undefined;
      if (document.documentType === 'certificate' && document.daysOff) {
        const days = parseInt(document.daysOff);
        if (!isNaN(days)) {
          const start = new Date(document.issueDate);
          const end = new Date(start);
          end.setDate(end.getDate() + days - 1);
          startDate = new Intl.DateTimeFormat('pt-BR').format(start);
          endDate = new Intl.DateTimeFormat('pt-BR').format(end);
        }
      }

      // Generate PDF
      const pdfData = {
        id: document.id,
        title: document.title,
        patientName: patient.name,
        patientEmail: undefined, // Patient model doesn't have email field
        patientPhone: patient.whatsapp,
        patientGender: patient.gender === 'masculino' ? 'Masculino' : patient.gender === 'feminino' ? 'Feminino' : patient.gender,
        patientAge,
        documentType: document.documentType as 'prescription' | 'certificate' | 'medical_report',
        content: document.content,
        diagnosis: document.diagnosis || undefined,
        medications: document.medications || undefined,
        observations: document.observations || undefined,
        daysOff: document.daysOff || undefined,
        startDate,
        endDate,
        cid: document.cid || undefined,
        doctorName: document.doctorName,
        doctorCrm: document.doctorCrm,
        issueDate: document.issueDate
      };

      const pdfBuffer = await pdfGenerator.generateMedicalDocumentPDF(pdfData);
      
      // Format document type in Portuguese
      const documentTypeNames: Record<string, string> = {
        'prescription': 'Receita Médica',
        'certificate': 'Atestado Médico',
        'medical_report': 'Laudo Médico'
      };
      const docTypeName = documentTypeNames[document.documentType] || document.title;

      const fileName = `${document.title.replace(/\s+/g, '_')}_${patient.name.replace(/\s+/g, '_')}.pdf`;

      // Send email
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: recipientEmail,
        subject: `${docTypeName} - Exu Saúde - Sistema de Atendimento Médico`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f766e;">Exu Saúde - Sistema de Atendimento Médico</h2>
            <p>Olá <strong>${patient.name}</strong>,</p>
            <p>Segue anexo seu documento médico:</p>
            <ul style="line-height: 1.8;">
              <li><strong>Documento:</strong> ${docTypeName}</li>
              <li><strong>Médico:</strong> Dr(a). ${document.doctorName}</li>
              <li><strong>CRM:</strong> ${document.doctorCrm}</li>
              <li><strong>Data de Emissão:</strong> ${new Intl.DateTimeFormat('pt-BR').format(new Date(document.issueDate))}</li>
            </ul>
            <p>O documento está em anexo no formato PDF.</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              Esta é uma mensagem automática. Por favor, não responda este email.<br>
              Em caso de dúvidas, entre em contato com a recepção do hospital.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      
      console.log('✅ Document sent via email to:', recipientEmail);
      res.json({ 
        success: true, 
        message: "Documento enviado via email com sucesso" 
      });
    } catch (error) {
      console.error("❌ Error sending document via email:", error);
      res.status(500).json({ message: "Erro ao enviar documento via email" });
    }
  });

  // Anamnesis Templates Routes
  
  // Get all anamnesis templates or filter by specialty
  app.get("/api/anamnesis-templates", isAuthenticated, async (req, res) => {
    try {
      const specialtyName = req.query.specialtyName as string | undefined;
      const templates = await storage.getAnamnesisTemplates(specialtyName);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching anamnesis templates:", error);
      res.status(500).json({ message: "Erro ao buscar templates de anamnese" });
    }
  });

  // Get single anamnesis template
  app.get("/api/anamnesis-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getAnamnesisTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: "Template de anamnese não encontrado" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching anamnesis template:", error);
      res.status(500).json({ message: "Erro ao buscar template de anamnese" });
    }
  });

  // Create anamnesis template
  app.post("/api/anamnesis-templates", requireDoctorOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const validatedData = insertAnamnesisTemplateSchema.parse({
        ...req.body,
        createdBy: user.id,
      });
      const template = await storage.createAnamnesisTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating anamnesis template:", error);
      res.status(500).json({ message: "Erro ao criar template de anamnese" });
    }
  });

  // Update anamnesis template
  app.patch("/api/anamnesis-templates/:id", requireDoctorOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertAnamnesisTemplateSchema.partial().parse(req.body);
      const template = await storage.updateAnamnesisTemplate(id, validatedData);
      
      if (!template) {
        return res.status(404).json({ message: "Template de anamnese não encontrado" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error updating anamnesis template:", error);
      res.status(500).json({ message: "Erro ao atualizar template de anamnese" });
    }
  });

  // Delete anamnesis template
  app.delete("/api/anamnesis-templates/:id", requireDoctorOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteAnamnesisTemplate(id);
      
      if (!success) {
        return res.status(404).json({ message: "Template de anamnese não encontrado" });
      }
      
      res.json({ success: true, message: "Template de anamnese excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting anamnesis template:", error);
      res.status(500).json({ message: "Erro ao excluir template de anamnese" });
    }
  });

  // Clinical Protocols Routes
  
  // Get all clinical protocols with optional filters
  app.get("/api/clinical-protocols", isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const protocols = await storage.getClinicalProtocols({ category, search });
      res.json(protocols);
    } catch (error) {
      console.error("Error fetching clinical protocols:", error);
      res.status(500).json({ message: "Erro ao buscar protocolos clínicos" });
    }
  });

  // Get single clinical protocol
  app.get("/api/clinical-protocols/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const protocol = await storage.getClinicalProtocol(id);
      
      if (!protocol) {
        return res.status(404).json({ message: "Protocolo clínico não encontrado" });
      }
      
      res.json(protocol);
    } catch (error) {
      console.error("Error fetching clinical protocol:", error);
      res.status(500).json({ message: "Erro ao buscar protocolo clínico" });
    }
  });

  // Create clinical protocol
  app.post("/api/clinical-protocols", requireDoctorOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const validatedData = insertClinicalProtocolSchema.parse({
        ...req.body,
        createdBy: user.id,
      });
      const protocol = await storage.createClinicalProtocol(validatedData);
      res.status(201).json(protocol);
    } catch (error) {
      console.error("Error creating clinical protocol:", error);
      res.status(500).json({ message: "Erro ao criar protocolo clínico" });
    }
  });

  // Update clinical protocol
  app.patch("/api/clinical-protocols/:id", requireDoctorOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertClinicalProtocolSchema.partial().parse(req.body);
      const protocol = await storage.updateClinicalProtocol(id, validatedData);
      
      if (!protocol) {
        return res.status(404).json({ message: "Protocolo clínico não encontrado" });
      }
      
      res.json(protocol);
    } catch (error) {
      console.error("Error updating clinical protocol:", error);
      res.status(500).json({ message: "Erro ao atualizar protocolo clínico" });
    }
  });

  // Delete clinical protocol
  app.delete("/api/clinical-protocols/:id", requireDoctorOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteClinicalProtocol(id);
      
      if (!success) {
        return res.status(404).json({ message: "Protocolo clínico não encontrado" });
      }
      
      res.json({ success: true, message: "Protocolo clínico excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting clinical protocol:", error);
      res.status(500).json({ message: "Erro ao excluir protocolo clínico" });
    }
  });

  // Seed default clinical protocols
  app.post("/api/clinical-protocols/seed", requireDoctorOrAdmin, async (req, res) => {
    try {
      const { seedClinicalProtocols } = await import("./seeds/clinical-protocols");
      await seedClinicalProtocols();
      res.json({ success: true, message: "Protocolos clínicos padrão adicionados com sucesso" });
    } catch (error) {
      console.error("Error seeding clinical protocols:", error);
      res.status(500).json({ message: "Erro ao adicionar protocolos padrão" });
    }
  });

  // Exam Requests Routes (Radiologia/Laboratório)
  app.get("/api/exam-requests", isAuthenticated, async (req, res) => {
    try {
      const { status, examType, patientId } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (examType) filters.examType = examType as string;
      if (patientId) filters.patientId = patientId as string;
      
      const requests = await storage.getExamRequests(Object.keys(filters).length > 0 ? filters : undefined);
      
      // Incluir dados do paciente para cada exame
      const requestsWithPatient = await Promise.all(
        requests.map(async (exam) => {
          const patient = await storage.getPatient(exam.patientId);
          return {
            ...exam,
            patient: patient ? { id: patient.id, name: patient.name, cpf: patient.cpf, susCard: patient.susCard } : null
          };
        })
      );
      
      res.json(requestsWithPatient);
    } catch (error) {
      console.error("Error fetching exam requests:", error);
      res.status(500).json({ message: "Erro ao buscar solicitações de exames" });
    }
  });

  app.get("/api/exam-requests/pending", isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getPendingExamRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching pending exam requests:", error);
      res.status(500).json({ message: "Erro ao buscar exames pendentes" });
    }
  });

  app.get("/api/exam-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getExamRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Solicitação de exame não encontrada" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching exam request:", error);
      res.status(500).json({ message: "Erro ao buscar solicitação de exame" });
    }
  });

  app.get("/api/exam-requests/patient/:patientId", isAuthenticated, async (req, res) => {
    try {
      const { patientId } = req.params;
      const requests = await storage.getExamRequestsByPatient(patientId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching patient exam requests:", error);
      res.status(500).json({ message: "Erro ao buscar exames do paciente" });
    }
  });

  app.post("/api/exam-requests", requireDoctorOrAdmin, async (req, res) => {
    try {
      const request = await storage.createExamRequest(req.body);
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating exam request:", error);
      res.status(500).json({ message: "Erro ao criar solicitação de exame" });
    }
  });

  app.patch("/api/exam-requests/:id", requireRadiologistaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateExamRequest(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Solicitação de exame não encontrada" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating exam request:", error);
      res.status(500).json({ message: "Erro ao atualizar solicitação de exame" });
    }
  });

  app.post("/api/exam-requests/:id/start", requireRadiologistaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { performingDoctorId, performingDoctorName } = req.body;
      
      if (!performingDoctorId || !performingDoctorName) {
        return res.status(400).json({ message: "ID e nome do profissional são obrigatórios" });
      }
      
      const updated = await storage.startExamRequest(id, performingDoctorId, performingDoctorName);
      if (!updated) {
        return res.status(404).json({ message: "Solicitação de exame não encontrada" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error starting exam request:", error);
      res.status(500).json({ message: "Erro ao iniciar exame" });
    }
  });

  app.post("/api/exam-requests/:id/complete", requireRadiologistaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { result, observations, attachments } = req.body;
      const user = req.user as any;
      
      if (!result) {
        return res.status(400).json({ message: "Resultado do exame é obrigatório" });
      }
      
      const updated = await storage.completeExamRequest(id, result, observations, attachments);
      if (!updated) {
        return res.status(404).json({ message: "Solicitação de exame não encontrada" });
      }
      
      // Create medical document for lab results (always, not just with attachments)
      if (updated.examType === 'laboratorio') {
        try {
          const today = new Date();
          const issueDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
          
          const attachmentList = attachments && Array.isArray(attachments) ? attachments : [];
          
          await storage.createMedicalDocument({
            patientId: updated.patientId,
            doctorId: user.id,
            doctorName: user.name || "Técnico de Laboratório",
            doctorCrm: user.crm || "N/A",
            documentType: "lab_results",
            title: `Resultado de Laboratório - ${updated.examName}`,
            content: JSON.stringify({
              examId: updated.id,
              examName: updated.examName,
              result: result,
              observations: observations,
              attachments: attachmentList,
              attachmentCount: attachmentList.length,
            }),
            observations: attachmentList.length > 0 
              ? `Resultado do exame ${updated.examName} com ${attachmentList.length} anexo(s).`
              : `Resultado do exame ${updated.examName}.`,
            issueDate: issueDate,
            isSigned: false,
            sentViaWhatsApp: false,
            sentViaEmail: false,
            printed: false,
          });
          console.log("✅ Medical document created for lab results:", updated.id);
        } catch (docError) {
          console.error("Error creating medical document for lab results:", docError);
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error completing exam request:", error);
      res.status(500).json({ message: "Erro ao finalizar exame" });
    }
  });

  app.post("/api/exam-requests/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.cancelExamRequest(id);
      if (!updated) {
        return res.status(404).json({ message: "Solicitação de exame não encontrada" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error cancelling exam request:", error);
      res.status(500).json({ message: "Erro ao cancelar exame" });
    }
  });

  app.post("/api/exam-requests/:id/images", requireRadiologistaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { images } = req.body;
      const user = req.user as any;
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ message: "Pelo menos uma imagem é obrigatória" });
      }
      
      const updated = await storage.addExamImages(id, images);
      if (!updated) {
        return res.status(404).json({ message: "Solicitação de exame não encontrada" });
      }
      
      // Create medical document for radiology images to add to patient history
      try {
        const today = new Date();
        const issueDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
        
        await storage.createMedicalDocument({
          patientId: updated.patientId,
          doctorId: user.id,
          doctorName: user.name || "Técnico de Radiologia",
          doctorCrm: user.crm || "N/A",
          documentType: "radiology_images",
          title: `Imagens de Radiologia - ${updated.examName}`,
          content: JSON.stringify({
            examId: updated.id,
            examName: updated.examName,
            images: images,
            imageCount: images.length,
          }),
          observations: `Imagens do exame ${updated.examName} adicionadas ao histórico do paciente.`,
          issueDate: issueDate,
          isSigned: false,
          sentViaWhatsApp: false,
          sentViaEmail: false,
          printed: false,
        });
        console.log("✅ Medical document created for radiology images:", updated.id);
      } catch (docError) {
        console.error("Error creating medical document for images:", docError);
        // Continue even if document creation fails - images are still saved
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error adding exam images:", error);
      res.status(500).json({ message: "Erro ao adicionar imagens" });
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL("xray-images");
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Erro ao obter URL de upload" });
    }
  });

  app.post("/api/objects/upload-file", isAuthenticated, async (req, res, next) => {
    const multer = (await import("multer")).default;
    const storage = multer.memoryStorage();
    const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
    upload.single("file")(req, res, async (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: "Erro no upload do arquivo" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const { ObjectStorageService, objectStorageClient } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const { randomUUID } = await import("crypto");
      
      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      const objectId = randomUUID();
      const fullPath = `${privateObjectDir}/xray-images/${objectId}`;
      
      const pathParts = fullPath.split("/").filter(p => p);
      const bucketName = pathParts[0];
      const objectName = pathParts.slice(1).join("/");
      
      console.log("📤 Server Upload:", { bucketName, objectName, fileSize: req.file.size, mimeType: req.file.mimetype });
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: {
          originalName: req.file.originalname
        }
      });
      
      const objectPath = `/objects/xray-images/${objectId}`;
      console.log("✅ Upload successful:", objectPath);
      
      res.json({ objectPath, success: true });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Erro ao fazer upload do arquivo" });
    }
  });

  app.post("/api/objects/upload-lab-file", isAuthenticated, async (req, res, next) => {
    const multer = (await import("multer")).default;
    const storageMulter = multer.memoryStorage();
    const upload = multer({ storage: storageMulter, limits: { fileSize: 50 * 1024 * 1024 } });
    upload.single("file")(req, res, async (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: "Erro no upload do arquivo" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const { ObjectStorageService, objectStorageClient } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const { randomUUID } = await import("crypto");
      
      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      const objectId = randomUUID();
      const fullPath = `${privateObjectDir}/lab-results/${objectId}`;
      
      const pathParts = fullPath.split("/").filter(p => p);
      const bucketName = pathParts[0];
      const objectName = pathParts.slice(1).join("/");
      
      console.log("📤 Lab Upload:", { bucketName, objectName, fileSize: req.file.size, mimeType: req.file.mimetype });
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: {
          originalName: req.file.originalname
        }
      });
      
      const objectPath = `/objects/lab-results/${objectId}`;
      console.log("✅ Lab Upload successful:", objectPath);
      
      res.json({ objectPath, success: true });
    } catch (error) {
      console.error("Error uploading lab file:", error);
      res.status(500).json({ message: "Erro ao fazer upload do arquivo" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const { ObjectStorageService, ObjectNotFoundError } = await import("./objectStorage");
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof Error && error.name === "ObjectNotFoundError") {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }
      res.status(500).json({ message: "Erro ao servir arquivo" });
    }
  });

  app.delete("/api/exam-requests/:id", requireDoctorOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteExamRequest(id);
      if (!deleted) {
        return res.status(404).json({ message: "Solicitação de exame não encontrada" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting exam request:", error);
      res.status(500).json({ message: "Erro ao excluir solicitação de exame" });
    }
  });

  // WhatsApp Routes
  
  // Check WhatsApp service status
  app.get("/api/whatsapp/status", isAuthenticated, async (req, res) => {
    try {
      const isConfigured = whatsappService !== null;
      res.json({
        configured: isConfigured,
        credentials: {
          phoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
          accessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
          webhookVerifyToken: !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
        }
      });
    } catch (error) {
      console.error("Error checking WhatsApp status:", error);
      res.status(500).json({ message: "Erro ao verificar status do WhatsApp" });
    }
  });

  // Send manual WhatsApp reminder for appointment
  app.post("/api/whatsapp/send-reminder/:appointmentId", isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const { type } = req.body; // 'confirmation', 'reminder', 'today'
      
      if (!whatsappService) {
        return res.status(400).json({ message: "WhatsApp não está configurado" });
      }

      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      const specialty = await storage.getSpecialty(appointment.specialtyId);
      const specialtyName = specialty?.name || 'Consulta Médica';

      // Get patient information
      let patientInfo = {
        name: appointment.patientName || appointment.patient?.name || 'Paciente',
        whatsapp: appointment.patientWhatsapp || appointment.patient?.whatsapp || ''
      };

      if (!patientInfo.whatsapp) {
        return res.status(400).json({ message: "Número de telefone não encontrado para este paciente" });
      }

      // Verifica se o telefone está marcado como WhatsApp
      const phoneIsWhatsapp = appointment.patient?.phoneIsWhatsapp;
      if (phoneIsWhatsapp === false) {
        return res.status(400).json({ message: "O telefone do paciente não é WhatsApp. Para enviar mensagens via WhatsApp, marque a opção 'É WhatsApp?' no cadastro do paciente." });
      }

      const whatsappData: AppointmentReminderData = {
        patientName: patientInfo.name,
        patientWhatsapp: patientInfo.whatsapp,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        specialtyName: specialtyName,
        hospitalName: 'Exu Saúde - Sistema de Atendimento Médico',
        appointmentId: appointment.id
      };

      let success = false;
      let messageType = '';

      switch (type) {
        case 'confirmation':
          success = await whatsappService.sendAppointmentConfirmation(whatsappData);
          messageType = 'confirmação';
          break;
        case 'reminder':
          success = await whatsappService.sendAppointmentReminder(whatsappData);
          messageType = 'lembrete';
          break;
        case 'today':
          success = await whatsappService.sendTodayReminder(whatsappData);
          messageType = 'lembrete do dia';
          break;
        default:
          return res.status(400).json({ message: "Tipo de mensagem inválido" });
      }

      if (success) {
        res.json({ 
          message: `${messageType} enviado com sucesso`,
          sent: true,
          appointmentId: appointmentId,
          patientName: patientInfo.name,
          whatsapp: patientInfo.whatsapp
        });
      } else {
        res.status(500).json({ 
          message: `Falha ao enviar ${messageType}`,
          sent: false 
        });
      }
    } catch (error) {
      console.error("Error sending WhatsApp reminder:", error);
      res.status(500).json({ message: "Erro ao enviar lembrete WhatsApp" });
    }
  });

  // Bulk send reminders for upcoming appointments
  app.post("/api/whatsapp/send-bulk-reminders", isAuthenticated, async (req, res) => {
    try {
      const { type, date } = req.body; // type: 'reminder' | 'today', date: YYYY-MM-DD
      
      if (!whatsappService) {
        return res.status(400).json({ message: "WhatsApp não está configurado" });
      }

      const appointments = await storage.getAppointments();
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // Filter appointments by date and type
      let filteredAppointments = appointments.filter(apt => {
        const aptDate = apt.appointmentDate;
        
        if (type === 'today') {
          return aptDate === targetDate;
        } else if (type === 'reminder') {
          // Send reminder 1 day before
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          return aptDate === tomorrowStr;
        }
        
        return false;
      });

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const appointment of filteredAppointments) {
        try {
          const specialty = await storage.getSpecialty(appointment.specialtyId);
          const specialtyName = specialty?.name || 'Consulta Médica';

          let patientInfo = {
            name: appointment.patientName || appointment.patient?.name || 'Paciente',
            whatsapp: appointment.patientWhatsapp || appointment.patient?.whatsapp || ''
          };

          if (!patientInfo.whatsapp) {
            results.push({
              appointmentId: appointment.id,
              patientName: patientInfo.name,
              success: false,
              error: 'Telefone não encontrado'
            });
            errorCount++;
            continue;
          }

          // Verifica se o telefone está marcado como WhatsApp
          const phoneIsWhatsapp = appointment.patient?.phoneIsWhatsapp;
          if (phoneIsWhatsapp === false) {
            results.push({
              appointmentId: appointment.id,
              patientName: patientInfo.name,
              success: false,
              error: 'Telefone não é WhatsApp'
            });
            errorCount++;
            continue;
          }

          const whatsappData: AppointmentReminderData = {
            patientName: patientInfo.name,
            patientWhatsapp: patientInfo.whatsapp,
            appointmentDate: appointment.appointmentDate,
            appointmentTime: appointment.appointmentTime,
            specialtyName: specialtyName,
            hospitalName: 'Exu Saúde - Sistema de Atendimento Médico',
            appointmentId: appointment.id
          };

          let success = false;
          if (type === 'today') {
            success = await whatsappService.sendTodayReminder(whatsappData);
          } else {
            success = await whatsappService.sendAppointmentReminder(whatsappData);
          }

          results.push({
            appointmentId: appointment.id,
            patientName: patientInfo.name,
            whatsapp: patientInfo.whatsapp,
            success: success
          });

          if (success) {
            successCount++;
          } else {
            errorCount++;
          }

          // Add delay between messages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          results.push({
            appointmentId: appointment.id,
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
          errorCount++;
        }
      }

      res.json({
        message: `Envio em lote concluído: ${successCount} sucessos, ${errorCount} erros`,
        totalProcessed: filteredAppointments.length,
        successCount,
        errorCount,
        results
      });

    } catch (error) {
      console.error("Error sending bulk WhatsApp reminders:", error);
      res.status(500).json({ message: "Erro ao enviar lembretes em lote" });
    }
  });

  // WhatsApp webhook endpoints (for Meta verification)
  // GET endpoint for webhook verification
  app.get("/api/whatsapp/webhook", (req, res) => {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      console.log('🔍 WhatsApp webhook verification attempt:', { mode, token });

      // Check if verification token matches
      const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'hospital_webhook_2025';
      if (mode === 'subscribe' && token === expectedToken) {
        console.log('✅ WhatsApp webhook verified successfully');
        res.status(200).send(challenge);
      } else {
        console.log('❌ WhatsApp webhook verification failed - token mismatch');
        console.log('Expected token:', expectedToken);
        console.log('Received token:', token);
        res.status(403).json({ error: 'Verification failed' });
      }
    } catch (error) {
      console.error('❌ WhatsApp webhook verification error:', error);
      res.status(400).json({ error: 'Webhook verification failed' });
    }
  });

  // POST endpoint for receiving webhook events with signature verification
  app.post("/api/whatsapp/webhook", (req, res) => {
    console.log('🔔 WhatsApp webhook POST received!');
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📦 Body type:', typeof req.body);
    
    try {
      // SECURITY: Verify webhook signature with Meta App Secret
      const signature = req.headers['x-hub-signature-256'] as string;
      const appSecret = process.env.WHATSAPP_APP_SECRET; // Meta App Secret (not access token)
      
      if (!signature) {
        console.log('❌ WhatsApp webhook: Missing signature header');
        return res.status(401).json({ error: 'Missing signature header' });
      }
      
      if (!appSecret) {
        console.log('❌ WhatsApp webhook: App secret not configured');
        return res.status(500).json({ error: 'Webhook verification not configured' });
      }
      
      // Get the raw body as string for signature verification
      const rawBody = JSON.stringify(req.body);
      
      // Calculate expected signature
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');
      
      // Compare signatures - using simple string comparison for now
      // (timing-safe comparison requires same length buffers)
      if (signature !== expectedSignature) {
        console.log('❌ WhatsApp webhook: Invalid signature');
        console.log('Expected:', expectedSignature);
        console.log('Received:', signature);
        console.log('⚠️  Note: In production, Meta will send the correct signature');
        // In development, allow webhook to pass for testing
        // return res.status(401).json({ error: 'Invalid signature' });
      } else {
        console.log('✅ WhatsApp webhook signature verified');
      }
      
      // Use already parsed body
      const body = req.body;
      console.log('📱 WhatsApp webhook received - processing events');
      
      if (body.object === 'whatsapp_business_account') {
        body.entry?.forEach((entry: any) => {
          entry.changes?.forEach((change: any) => {
            if (change.field === 'messages') {
              const value = change.value;
              
              // Handle message status updates
              if (value.statuses) {
                value.statuses.forEach((status: any) => {
                  // SECURITY: Never log recipient IDs (phone numbers) - LGPD compliance
                  const maskedRecipient = status.recipient_id.replace(/\d/g, 'X');
                  console.log(`📊 STATUS da mensagem ${status.id}:`, {
                    recipient: maskedRecipient,
                    status: status.status,
                    timestamp: new Date(status.timestamp * 1000).toLocaleString('pt-BR'),
                    errors: status.errors || 'Nenhum erro'
                  });
                  
                  // Log diferentes tipos de status sem expor dados sensíveis
                  switch(status.status) {
                    case 'sent':
                      console.log(`✅ ENVIADO para destinatário`);
                      break;
                    case 'delivered':
                      console.log(`📨 ENTREGUE para destinatário`);
                      break;
                    case 'read':
                      console.log(`👁️  LIDO por destinatário`);
                      break;
                    case 'failed':
                      console.log(`❌ FALHOU para destinatário:`, status.errors);
                      if (status.errors) {
                        status.errors.forEach((error: any) => {
                          console.log(`   - Código: ${error.code}, Título: ${error.title}`);
                          console.log(`   - Detalhes: ${error.message || error.error_data?.details}`);
                        });
                      }
                      break;
                  }
                });
              }
              
              // Handle incoming messages (if any)
              if (value.messages) {
                value.messages.forEach(async (message: any) => {
                  // SECURITY: Never log phone numbers - LGPD compliance
                  const maskedFrom = message.from.replace(/\d/g, 'X');
                  console.log(`📥 Mensagem recebida de ${maskedFrom}:`, message.text?.body || 'Mídia');
                  
                  // Processar possível resposta de pesquisa de satisfação
                  if (message.text?.body) {
                    const messageBody = message.text.body.trim();
                    
                    // Tentar extrair ID da pesquisa da mensagem anterior ou procurar por pesquisas pendentes
                    try {
                      // Primeiro, tentar encontrar ID da pesquisa na mensagem
                      const surveyIdMatch = messageBody.match(/survey_([a-f0-9-]+)/i);
                      let surveyId = surveyIdMatch ? surveyIdMatch[1] : null;
                      
                      if (!surveyId) {
                        // Se não encontrou ID, procurar pesquisas pendentes para este número
                        const maskedFromSearch = message.from.replace(/\d/g, 'X');
                        console.log(`🔍 Buscando pesquisas pendentes para número: ${maskedFromSearch}`);
                        const surveys = await storage.getSatisfactionSurveys();
                        const phoneNumber = message.from.replace(/\D/g, '');
                        console.log(`🔍 Total surveys found: ${surveys.length}`);
                        
                        const pendingSurvey = surveys.find(survey => {
                          // SECURITY: Never log patient names - LGPD compliance
                          console.log(`🔍 Checking survey ${survey.id}: status=${survey.status}, patientId=${survey.patientId}`);
                          
                          if (survey.status !== SATISFACTION_SURVEY_STATUS.PENDING) {
                            console.log(`❌ Survey ${survey.id} skipped: status=${survey.status}`);
                            return false;
                          }
                          
                          const surveyPhone = survey.patient?.whatsapp?.replace(/\D/g, '');
                          if (!surveyPhone) {
                            console.log(`❌ Survey ${survey.id} skipped: no phone number`);
                            return false;
                          }
                          
                          // Comparar últimos 8 dígitos (número sem DDD e sem 9 inicial)
                          const surveyLast8 = surveyPhone.slice(-8);
                          const messageLast8 = phoneNumber.slice(-8);
                          
                          console.log(`🔍 Comparing phones: survey=${surveyLast8}, message=${messageLast8} (8 digits) - Match: ${surveyLast8 === messageLast8}`);
                          return surveyLast8 === messageLast8;
                        });
                        
                        if (pendingSurvey) {
                          console.log(`✅ Found matching survey: ${pendingSurvey.id}`);
                          surveyId = pendingSurvey.id;
                        } else {
                          // SECURITY: Never log phone numbers
                          console.log(`❌ No matching survey found for provided number`);
                        }
                      }
                      
                      if (surveyId) {
                        console.log(`🔍 Processando resposta de pesquisa: ${surveyId}`);
                        const processed = await satisfactionService.processSurveyResponseFromWhatsApp(
                          `survey_${surveyId}`, 
                          messageBody
                        );
                        
                        if (processed) {
                          console.log(`✅ Resposta de pesquisa processada com sucesso: ${surveyId}`);
                          
                          // Enviar confirmação usando template aprovado pela Meta
                          const confirmationMessage = {
                            messaging_product: 'whatsapp' as const,
                            to: message.from,
                            type: 'template' as const,
                            template: {
                              name: 'obrigado_paciente',
                              language: { code: 'pt_BR' },
                              components: []
                            }
                          };
                          
                          if (whatsappService) {
                            try {
                              await whatsappService.sendMessage(confirmationMessage);
                              console.log(`✅ Mensagem de agradecimento enviada para ${message.from}`);
                            } catch (error) {
                              console.error(`❌ Erro ao enviar mensagem de agradecimento:`, error);
                            }
                          }
                        } else {
                          console.log(`❌ Falha ao processar resposta de pesquisa: ${surveyId}`);
                        }
                      }
                    } catch (error) {
                      console.error("❌ Erro ao processar resposta de pesquisa:", error);
                    }
                  }
                });
              }
            }
          });
        });
      }

      res.status(200).json({ status: 'received' });
    } catch (error) {
      console.error('❌ WhatsApp webhook processing error:', error);
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  });

  // API para testar resposta de pesquisa (ambiente desenvolvimento)
  app.post("/api/whatsapp/test-response", isAuthenticated, async (req, res) => {
    try {
      const { phoneNumber, response } = req.body;
      
      if (!phoneNumber || !response) {
        return res.status(400).json({ message: "phoneNumber e response são obrigatórios" });
      }
      
      console.log(`🧪 TESTE: Simulando resposta "${response}" do número ${phoneNumber}`);
      
      // Simular webhook do WhatsApp
      const webhookData = {
        object: "whatsapp_business_account",
        entry: [{
          id: "test",
          changes: [{
            field: "messages", 
            value: {
              messages: [{
                from: phoneNumber.replace(/\D/g, ''),
                text: {"body": response},
                id: `test_${Date.now()}`
              }]
            }
          }]
        }]
      };
      
      // Processar internamente
      if (webhookData.object === 'whatsapp_business_account') {
        for (const entry of webhookData.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value.messages) {
              for (const message of change.value.messages) {
                console.log(`📥 Simulando mensagem recebida de ${message.from}: ${message.text?.body}`);
                
                if (message.text?.body) {
                  const messageBody = message.text.body.trim();
                  const surveys = await storage.getSatisfactionSurveys();
                  const phoneFromMessage = message.from.replace(/\D/g, '');
                  
                  const pendingSurvey = surveys.find(survey => {
                    if (survey.status !== SATISFACTION_SURVEY_STATUS.PENDING) return false;
                    
                    const surveyPhone = survey.patient?.whatsapp?.replace(/\D/g, '');
                    if (!surveyPhone) return false;
                    
                    const surveyLast9 = surveyPhone.slice(-9);
                    const messageLast9 = phoneFromMessage.slice(-9);
                    
                    console.log(`🔍 Comparing phones: survey=${surveyLast9}, message=${messageLast9}`);
                    return surveyLast9 === messageLast9;
                  });
                  
                  if (pendingSurvey) {
                    console.log(`🔍 Processando resposta de pesquisa: ${pendingSurvey.id}`);
                    const processed = await satisfactionService.processSurveyResponseFromWhatsApp(
                      `survey_${pendingSurvey.id}`, 
                      messageBody
                    );
                    
                    if (processed) {
                      console.log(`✅ Resposta de pesquisa processada com sucesso: ${pendingSurvey.id}`);
                      return res.json({ 
                        success: true, 
                        message: "Resposta processada com sucesso",
                        surveyId: pendingSurvey.id 
                      });
                    } else {
                      return res.status(400).json({ 
                        success: false, 
                        message: "Falha ao processar resposta" 
                      });
                    }
                  } else {
                    return res.status(404).json({ 
                      success: false, 
                      message: "Nenhuma pesquisa pendente encontrada para este número" 
                    });
                  }
                }
              }
            }
          }
        }
      }
      
      res.status(400).json({ success: false, message: "Dados inválidos" });
    } catch (error) {
      console.error('❌ Erro no teste de resposta:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // API para diagnóstico avançado de números WhatsApp
  app.post("/api/whatsapp/test-number", isAuthenticated, async (req, res) => {
    try {
      const { whatsapp, patientName } = req.body;
      
      if (!whatsappService) {
        return res.status(400).json({ message: "WhatsApp não está configurado" });
      }

      if (!whatsapp) {
        return res.status(400).json({ message: "Número de WhatsApp é obrigatório" });
      }

      console.log(`🧪 DIAGNÓSTICO AVANÇADO: ${whatsapp} (${patientName || 'Teste'})`);
      
      const formattedNumber = whatsappService['formatPhoneNumber'](whatsapp);
      
      // 1. Testar com mensagem de template simples
      const testMessage = `🏥 *TESTE - Exu Saúde - Sistema de Atendimento Médico*\n\nOlá ${patientName || 'Paciente'}!\n\nEste é um teste de conectividade.\n\n📱 Se você recebeu esta mensagem, responda com "OK" para confirmar.\n\n_Teste: ${new Date().toLocaleString('pt-BR')}_`;
      
      const success = await whatsappService.sendMessage({
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'text',
        text: { body: testMessage }
      });

      // 2. Aguardar um momento e verificar se há limitações
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 3. Coletar informações diagnósticas
      const diagnosticInfo = {
        originalNumber: whatsapp,
        formattedNumber: formattedNumber,
        timestamp: new Date().toISOString(),
        testType: 'connectivity_test',
        success: success,
        possibleIssues: [] as string[]
      };

      // 4. Analisar possíveis problemas
      if (formattedNumber.length !== 13) {
        diagnosticInfo.possibleIssues.push('Número pode estar com formatação incorreta');
      }
      
      if (!whatsapp.includes('87')) {
        diagnosticInfo.possibleIssues.push('Código de área pode estar incorreto para Pernambuco');
      }
      
      const hasWhatsAppFormat = /(\+55|55)?[\s\-\(\)]*(87)[\s\-\(\)]*9[\d\s\-\(\)]{7,8}/.test(whatsapp);
      if (!hasWhatsAppFormat) {
        diagnosticInfo.possibleIssues.push('Formato não parece ser um número móvel brasileiro');
      }

      res.json({
        success,
        message: success 
          ? `✅ Teste enviado para ${whatsapp}. Aguarde confirmação do paciente.` 
          : `❌ Falha ao enviar teste para ${whatsapp}`,
        diagnostic: diagnosticInfo,
        recommendations: success ? [
          'Aguarde 5-10 minutos para entrega',
          'Peça confirmação direta ao paciente',
          'Verifique se o WhatsApp está ativo no número',
          'Se não receber, considere ligação telefônica'
        ] : [
          'Verifique se o número está correto',
          'Confirme se tem WhatsApp instalado',
          'Teste com formato diferente',
          'Use método alternativo de contato'
        ]
      });

    } catch (error) {
      console.error("❌ Erro no diagnóstico WhatsApp:", error);
      res.status(500).json({ 
        message: "Erro no diagnóstico",
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        diagnostic: {
          success: false,
          error: true,
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  // API para verificar status de entrega de uma mensagem específica
  app.get("/api/whatsapp/message-status/:messageId", isAuthenticated, async (req, res) => {
    try {
      const { messageId } = req.params;
      
      // Esta API não existe no WhatsApp Business, mas podemos simular com base nos webhooks recebidos
      // Por enquanto, retornamos informação básica
      res.json({
        messageId,
        status: 'sent',
        note: 'WhatsApp Business API não fornece status individual de mensagens diretamente. Use webhooks para monitoramento em tempo real.',
        recommendation: 'Peça confirmação direta ao paciente ou aguarde resposta.'
      });
      
    } catch (error) {
      res.status(500).json({ 
        message: "Erro ao verificar status",
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Satisfaction Survey Routes
  app.get("/api/satisfaction-surveys", isAuthenticated, async (req, res) => {
    try {
      const surveys = await storage.getSatisfactionSurveys();
      res.json(surveys);
    } catch (error) {
      console.error('Error getting satisfaction surveys:', error);
      res.status(500).json({ message: "Erro ao buscar pesquisas de satisfação" });
    }
  });

  app.get("/api/satisfaction-surveys/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const survey = await storage.getSatisfactionSurvey(id);
      
      if (!survey) {
        return res.status(404).json({ message: "Pesquisa não encontrada" });
      }
      
      res.json(survey);
    } catch (error) {
      console.error('Error getting satisfaction survey:', error);
      res.status(500).json({ message: "Erro ao buscar pesquisa de satisfação" });
    }
  });

  app.post("/api/satisfaction-surveys", isAuthenticated, async (req, res) => {
    try {
      const surveyData = insertSatisfactionSurveySchema.parse(req.body);
      
      // Criar pesquisa diretamente usando os dados fornecidos
      // A nova estrutura usa queueEntryId e surveyType: "receptionist" | "doctor"
      if (!surveyData.queueEntryId) {
        return res.status(400).json({ message: "ID da entrada na fila é obrigatório" });
      }
      
      const survey = await storage.createSatisfactionSurvey(surveyData);
      
      res.status(201).json(survey);
    } catch (error) {
      console.error('Error creating satisfaction survey:', error);
      res.status(400).json({ message: "Dados inválidos para pesquisa de satisfação" });
    }
  });

  // Admin update (sem completar automaticamente)
  app.put("/api/satisfaction-surveys/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertSatisfactionSurveySchema.partial().parse(req.body);
      
      // Remove campos que não devem ser atualizados via admin
      const { status, respondedAt, ...adminUpdateData } = updateData;
      
      const survey = await storage.updateSatisfactionSurvey(id, adminUpdateData);
      
      if (!survey) {
        return res.status(404).json({ message: "Pesquisa não encontrada" });
      }
      
      res.json(survey);
    } catch (error) {
      console.error('Error updating satisfaction survey:', error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  // Resposta do paciente (completa a pesquisa)
  app.post("/api/satisfaction-surveys/:id/response", async (req, res) => {
    try {
      const { id } = req.params;
      const responseData = insertSatisfactionSurveySchema.partial().parse(req.body);
      
      const survey = await satisfactionService.updateSurveyResponse(id, responseData);
      
      if (!survey) {
        return res.status(404).json({ message: "Pesquisa não encontrada" });
      }
      
      res.json(survey);
    } catch (error) {
      console.error('Error submitting survey response:', error);
      res.status(400).json({ message: "Erro ao enviar resposta da pesquisa" });
    }
  });

  app.delete("/api/satisfaction-surveys/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSatisfactionSurvey(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Pesquisa não encontrada" });
      }
      
      res.json({ message: "Pesquisa removida com sucesso" });
    } catch (error) {
      console.error('Error deleting satisfaction survey:', error);
      res.status(500).json({ message: "Erro ao remover pesquisa" });
    }
  });

  // Send survey via WhatsApp
  app.post("/api/satisfaction-surveys/:id/send", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await satisfactionService.sendSurveyViaWhatsApp(id);
      
      if (!success) {
        return res.status(400).json({ message: "Erro ao enviar pesquisa via WhatsApp" });
      }
      
      res.json({ message: "Pesquisa enviada com sucesso via WhatsApp" });
    } catch (error) {
      console.error('Error sending survey via WhatsApp:', error);
      res.status(500).json({ message: "Erro ao enviar pesquisa via WhatsApp" });
    }
  });

  // Cleanup old surveys (admin only)
  app.post("/api/satisfaction-surveys/cleanup-old", requireAdmin, async (req, res) => {
    try {
      // Busca pesquisas antigas que já foram enviadas mas estão com status pending
      const { db } = await import("./db");
      const { satisfactionSurveys } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      
      const oldSurveys = await db
        .select()
        .from(satisfactionSurveys)
        .where(
          and(
            eq(satisfactionSurveys.status, SATISFACTION_SURVEY_STATUS.PENDING),
            eq(satisfactionSurveys.whatsappMessageSent, true)
          )
        );

      if (oldSurveys.length === 0) {
        return res.json({ 
          message: "Nenhuma pesquisa antiga encontrada",
          count: 0
        });
      }

      // Marca todas como cancelled
      const result = await db
        .update(satisfactionSurveys)
        .set({
          status: SATISFACTION_SURVEY_STATUS.CANCELLED,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(satisfactionSurveys.status, SATISFACTION_SURVEY_STATUS.PENDING),
            eq(satisfactionSurveys.whatsappMessageSent, true)
          )
        );

      console.log(`✅ Cleanup: Marcou ${oldSurveys.length} pesquisas antigas como cancelled`);
      
      res.json({ 
        message: `${oldSurveys.length} pesquisas antigas marcadas como cancelled`,
        count: oldSurveys.length,
        surveys: oldSurveys.map(s => ({ 
          id: s.id, 
          surveyType: s.surveyType,
          createdAt: s.createdAt 
        }))
      });
    } catch (error) {
      console.error('Error cleaning up old surveys:', error);
      res.status(500).json({ message: "Erro ao limpar pesquisas antigas" });
    }
  });

  // Survey Analytics
  app.get("/api/satisfaction-analytics", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await satisfactionService.getSurveyAnalytics(
        startDate as string,
        endDate as string
      );
      res.json(analytics);
    } catch (error) {
      console.error('Error getting survey analytics:', error);
      res.status(500).json({ message: "Erro ao buscar análises de pesquisa" });
    }
  });

  // ============================================
  // PUBLIC SURVEY WEB PAGE ENDPOINTS (NO AUTH)
  // ============================================
  
  // SECURITY: Rate limiter for public survey endpoints (prevent brute-force)
  const publicSurveyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per 15 minutes per IP
    message: { error: "Muitas tentativas. Tente novamente mais tarde." },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
  });
  
  // GET /api/pesquisa/:token - Buscar pesquisa por token (público)
  app.get("/api/pesquisa/:token", publicSurveyLimiter, async (req, res) => {
    try {
      const { token } = req.params;
      
      // Validar formato do token
      const { SurveyTokenService } = await import("./surveyTokenService");
      if (!SurveyTokenService.isValidTokenFormat(token)) {
        return res.status(400).json({ message: "Token inválido" });
      }
      
      // Buscar pesquisa por token
      const { db } = await import("./db");
      const { satisfactionSurveys, patients, queueEntries } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const result = await db.select({
        survey: satisfactionSurveys,
        patient: patients,
        queue: queueEntries
      })
      .from(satisfactionSurveys)
      .leftJoin(patients, eq(satisfactionSurveys.patientId, patients.id))
      .leftJoin(queueEntries, eq(satisfactionSurveys.queueEntryId, queueEntries.id))
      .where(eq(satisfactionSurveys.surveyToken, token))
      .limit(1);
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Pesquisa não encontrada" });
      }
      
      const { survey, patient, queue } = result[0];
      
      // Verificar se já foi respondida
      if (survey.status === SATISFACTION_SURVEY_STATUS.COMPLETED) {
        return res.status(400).json({ 
          message: "Pesquisa já foi respondida",
          alreadyCompleted: true
        });
      }
      
      // Verificar se expirou
      if (survey.expiresAt && new Date() > new Date(survey.expiresAt)) {
        return res.status(400).json({ 
          message: "Pesquisa expirada",
          expired: true
        });
      }
      
      // Retornar dados da pesquisa (sem dados sensíveis do paciente)
      res.json({
        id: survey.id,
        surveyType: survey.surveyType,
        patientName: patient?.name || "Paciente",
        queueNumber: queue?.queueNumber || "N/A",
        createdAt: survey.createdAt,
        expiresAt: survey.expiresAt
      });
    } catch (error) {
      console.error('Error fetching survey by token:', error);
      res.status(500).json({ message: "Erro ao buscar pesquisa" });
    }
  });
  
  // POST /api/pesquisa/:token/responder - Salvar resposta da pesquisa (público)
  app.post("/api/pesquisa/:token/responder", publicSurveyLimiter, async (req, res) => {
    try {
      const { token } = req.params;
      const { rating, feedback } = req.body;
      
      // Validar formato do token
      const { SurveyTokenService } = await import("./surveyTokenService");
      if (!SurveyTokenService.isValidTokenFormat(token)) {
        return res.status(400).json({ message: "Token inválido" });
      }
      
      // Validar rating (deve ser 1-5)
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Avaliação deve ser entre 1 e 5 estrelas" });
      }
      
      // Buscar pesquisa por token
      const { db } = await import("./db");
      const { satisfactionSurveys } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const [survey] = await db.select()
        .from(satisfactionSurveys)
        .where(eq(satisfactionSurveys.surveyToken, token))
        .limit(1);
      
      if (!survey) {
        return res.status(404).json({ message: "Pesquisa não encontrada" });
      }
      
      // Verificar se já foi respondida
      if (survey.status === SATISFACTION_SURVEY_STATUS.COMPLETED) {
        return res.status(400).json({ 
          message: "Pesquisa já foi respondida",
          alreadyCompleted: true
        });
      }
      
      // Verificar se expirou
      if (survey.expiresAt && new Date() > new Date(survey.expiresAt)) {
        return res.status(400).json({ 
          message: "Pesquisa expirada",
          expired: true
        });
      }
      
      // Atualizar pesquisa com a resposta
      const [updatedSurvey] = await db.update(satisfactionSurveys)
        .set({
          rating: rating.toString(),
          feedback: feedback || null,
          respondedAt: new Date(),
          responseMethod: 'web',
          status: SATISFACTION_SURVEY_STATUS.COMPLETED,
          updatedAt: new Date()
        })
        .where(eq(satisfactionSurveys.id, survey.id))
        .returning();
      
      console.log(`✅ Survey ${survey.id} completed via web - Rating: ${rating}/5`);
      
      res.json({ 
        message: "Obrigado pela sua avaliação!",
        success: true
      });
    } catch (error) {
      console.error('Error submitting survey response via token:', error);
      res.status(500).json({ message: "Erro ao enviar resposta" });
    }
  });

  // Security Monitoring Endpoints - Admin only
  app.get('/api/security/events', requireAdmin, auditLogger('READ', 'security_event', 'Consultar eventos de segurança'), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const events = await storage.getSecurityEvents(limit);
      res.json(events);
    } catch (error) {
      console.error('❌ Error fetching security events:', error);
      res.status(500).json({ message: 'Erro ao buscar eventos de segurança' });
    }
  });

  app.get('/api/security/events/unresolved', requireAdmin, async (req, res) => {
    try {
      const events = await storage.getUnresolvedSecurityEvents();
      res.json(events);
    } catch (error) {
      console.error('❌ Error fetching unresolved security events:', error);
      res.status(500).json({ message: 'Erro ao buscar eventos não resolvidos' });
    }
  });

  app.post('/api/security/events/:id/resolve', requireAdmin, auditLogger('UPDATE', 'security_event', 'Resolver evento de segurança'), captureEntityId('id'), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const success = await storage.resolveSecurityEvent(id, user.id);
      
      if (success) {
        res.json({ message: 'Evento de segurança resolvido com sucesso' });
      } else {
        res.status(404).json({ message: 'Evento não encontrado' });
      }
    } catch (error) {
      console.error('❌ Error resolving security event:', error);
      res.status(500).json({ message: 'Erro ao resolver evento de segurança' });
    }
  });

  app.get('/api/security/summary', requireAdmin, async (req, res) => {
    try {
      const summary = await SecurityMonitor.getSecuritySummary();
      res.json(summary);
    } catch (error) {
      console.error('❌ Error getting security summary:', error);
      res.status(500).json({ message: 'Erro ao obter resumo de segurança' });
    }
  });

  app.get('/api/security/login-attempts', requireAdmin, async (req, res) => {
    try {
      const { ipAddress, username, timeWindow } = req.query;
      const timeWindowMinutes = parseInt(timeWindow as string) || 30;
      
      let attempts;
      if (ipAddress) {
        attempts = await storage.getLoginAttemptsByIP(ipAddress as string, timeWindowMinutes);
      } else if (username) {
        attempts = await storage.getLoginAttemptsByUsername(username as string, timeWindowMinutes);
      } else {
        return res.status(400).json({ message: 'IP address or username required' });
      }
      
      res.json(attempts);
    } catch (error) {
      console.error('❌ Error fetching login attempts:', error);
      res.status(500).json({ message: 'Erro ao buscar tentativas de login' });
    }
  });

  app.post('/api/security/maintenance', requireAdmin, async (req, res) => {
    try {
      await SecurityMonitor.performMaintenance();
      res.json({ message: 'Manutenção de segurança executada com sucesso' });
    } catch (error) {
      console.error('❌ Error performing security maintenance:', error);
      res.status(500).json({ message: 'Erro ao executar manutenção de segurança' });
    }
  });

  // LGPD Compliance Endpoints - Admin only
  app.get('/api/lgpd/report', requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate, userId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ 
          message: 'Start date and end date are required' 
        });
      }
      
      const report = await generateLGPDReport(
        startDate as string, 
        endDate as string, 
        userId as string
      );
      
      res.json(report);
    } catch (error) {
      console.error('❌ LGPD report generation error:', error);
      res.status(500).json({ message: 'Erro ao gerar relatório LGPD' });
    }
  });

  app.post('/api/lgpd/privacy-request', requireAdmin, async (req, res) => {
    try {
      const { action, userId, details } = req.body;
      const requestingUser = (req.user as any)?.username;
      
      if (!action || !userId) {
        return res.status(400).json({
          message: 'Action and userId are required'
        });
      }
      
      const result = await handlePrivacyRequest(
        action as PrivacyAction,
        userId,
        requestingUser,
        details
      );
      
      res.json(result);
    } catch (error) {
      console.error('❌ Privacy request error:', error);
      res.status(500).json({ message: 'Erro ao processar solicitação de privacidade' });
    }
  });

  app.get('/api/lgpd/retention-check', requireAdmin, async (req, res) => {
    try {
      const complianceCheck = await checkDataRetentionCompliance();
      res.json(complianceCheck);
    } catch (error) {
      console.error('❌ Data retention check error:', error);
      res.status(500).json({ message: 'Erro ao verificar compliance de retenção de dados' });
    }
  });

  // TESTE: Endpoint temporário para testar envio de documento via WhatsApp (sem autenticação para teste)
  app.post("/api/test/send-document-whatsapp", async (req, res) => {
    try {
      const { documentId, phoneNumber } = req.body;
      
      console.log('🧪 TESTE: Enviando documento via WhatsApp');
      console.log('📄 Document ID:', documentId);
      console.log('📱 Phone:', phoneNumber);

      if (!whatsappService) {
        return res.status(400).json({ message: "WhatsApp não está configurado" });
      }

      if (!documentId || !phoneNumber) {
        return res.status(400).json({ message: "documentId e phoneNumber são obrigatórios" });
      }

      const document = await storage.getMedicalDocument(documentId);
      if (!document) {
        return res.status(404).json({ message: "Documento não encontrado" });
      }

      // Format document type in Portuguese
      const documentTypeNames: Record<string, string> = {
        'prescription': 'Receita Médica',
        'certificate': 'Atestado Médico',
        'medical_report': 'Laudo Médico'
      };
      const docTypeName = documentTypeNames[document.documentType] || document.title;

      // Generate secure token for PDF access
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
      pdfTokens.set(token, { documentId, expiresAt });

      // Create public PDF URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : `http://localhost:${process.env.PORT || 5000}`;
      const pdfUrl = `${baseUrl}/api/public/pdf/${token}`;
      const filename = `${document.title.replace(/\s+/g, '_')}.pdf`;

      // Format issue date
      const issueDate = new Intl.DateTimeFormat('pt-BR').format(new Date(document.issueDate));

      console.log('🔗 PDF URL:', pdfUrl);

      // Send document via WhatsApp template
      const success = await whatsappService.sendMedicalDocument({
        patientName: 'Teste', // Nome de teste
        patientWhatsapp: phoneNumber,
        documentType: docTypeName,
        documentTitle: document.title,
        doctorName: document.doctorName,
        issueDate,
        pdfUrl,
        filename
      });

      if (success) {
        console.log('✅ TESTE: Documento enviado com sucesso');
        res.json({ 
          success: true, 
          message: "Documento de teste enviado via WhatsApp com sucesso",
          pdfUrl 
        });
      } else {
        // Clean up token on failure
        pdfTokens.delete(token);
        
        console.error('❌ TESTE: Falha ao enviar documento');
        res.status(500).json({ 
          success: false, 
          message: "Erro ao enviar documento via WhatsApp" 
        });
      }
    } catch (error) {
      console.error("❌ TESTE: Erro ao enviar documento via WhatsApp:", error);
      res.status(500).json({ message: "Erro ao enviar documento via WhatsApp" });
    }
  });

  // =============================================
  // MÓDULO DE ESTOQUE DE MEDICAMENTOS (FARMÁCIA)
  // =============================================

  // Medications Catalog Routes
  // GET routes: Accessible to doctors (for prescriptions), pharmacy, and admin
  // POST/PATCH/DELETE routes: Restricted to pharmacy and admin only
  app.get("/api/medications", requireAllRoles, async (req, res) => {
    try {
      const medications = await storage.getMedicationsCatalog();
      res.json(medications);
    } catch (error) {
      console.error("Error fetching medications catalog:", error);
      res.status(500).json({ message: "Erro ao buscar catálogo de medicamentos" });
    }
  });

  app.get("/api/medications/search", requireAllRoles, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }
      const medications = await storage.searchMedicationsCatalog(q);
      res.json(medications);
    } catch (error) {
      console.error("Error searching medications:", error);
      res.status(500).json({ message: "Erro ao buscar medicamentos" });
    }
  });

  app.get("/api/medications/:id", requireAllRoles, async (req, res) => {
    try {
      const { id } = req.params;
      const medication = await storage.getMedicationCatalog(id);
      if (!medication) {
        return res.status(404).json({ message: "Medicamento não encontrado" });
      }
      res.json(medication);
    } catch (error) {
      console.error("Error fetching medication:", error);
      res.status(500).json({ message: "Erro ao buscar medicamento" });
    }
  });

  app.post("/api/medications", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const medication = await storage.createMedicationCatalog(req.body);
      res.status(201).json(medication);
    } catch (error) {
      console.error("Error creating medication:", error);
      res.status(500).json({ message: "Erro ao cadastrar medicamento" });
    }
  });

  app.patch("/api/medications/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateMedicationCatalog(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Medicamento não encontrado" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating medication:", error);
      res.status(500).json({ message: "Erro ao atualizar medicamento" });
    }
  });

  app.delete("/api/medications/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteMedicationCatalog(id);
      if (!success) {
        return res.status(404).json({ message: "Medicamento não encontrado" });
      }
      res.json({ success: true, message: "Medicamento desativado com sucesso" });
    } catch (error) {
      console.error("Error deleting medication:", error);
      res.status(500).json({ message: "Erro ao desativar medicamento" });
    }
  });

  // Inventory Batches Routes (Farmácia only)
  app.get("/api/inventory/batches", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const batches = await storage.getInventoryBatches();
      res.json(batches);
    } catch (error) {
      console.error("Error fetching inventory batches:", error);
      res.status(500).json({ message: "Erro ao buscar lotes de estoque" });
    }
  });

  app.get("/api/inventory/batches/low-stock", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const batches = await storage.getLowStockBatches();
      res.json(batches);
    } catch (error) {
      console.error("Error fetching low stock batches:", error);
      res.status(500).json({ message: "Erro ao buscar lotes com estoque baixo" });
    }
  });

  app.get("/api/inventory/batches/expiring", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { days } = req.query;
      const daysAhead = days ? parseInt(days as string) : 30;
      const batches = await storage.getExpiringBatches(daysAhead);
      res.json(batches);
    } catch (error) {
      console.error("Error fetching expiring batches:", error);
      res.status(500).json({ message: "Erro ao buscar lotes próximos do vencimento" });
    }
  });

  app.get("/api/inventory/batches/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const batch = await storage.getInventoryBatch(id);
      if (!batch) {
        return res.status(404).json({ message: "Lote não encontrado" });
      }
      res.json(batch);
    } catch (error) {
      console.error("Error fetching inventory batch:", error);
      res.status(500).json({ message: "Erro ao buscar lote" });
    }
  });

  app.get("/api/inventory/medications/:medicationId/batches", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { medicationId } = req.params;
      const batches = await storage.getInventoryBatchesByMedication(medicationId);
      res.json(batches);
    } catch (error) {
      console.error("Error fetching medication batches:", error);
      res.status(500).json({ message: "Erro ao buscar lotes do medicamento" });
    }
  });

  app.post("/api/inventory/batches", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      // Ensure initialQuantity is set to quantity if not provided
      const batchData = {
        ...req.body,
        initialQuantity: req.body.initialQuantity || req.body.quantity || '0'
      };
      
      const batch = await storage.createInventoryBatch(batchData);
      
      // Create movement record for entry
      await storage.createInventoryMovement({
        batchId: batch.id,
        medicationId: batch.medicationId,
        movementType: 'entrada',
        quantity: batch.quantity || '0',
        previousQuantity: '0',
        newQuantity: batch.quantity || '0',
        referenceType: 'receipt',
        referenceId: batch.id,
        reason: 'Entrada inicial do lote',
        performedBy: (req.user as any)?.id || 'system',
        performedByName: (req.user as any)?.name || 'Sistema'
      });
      
      res.status(201).json(batch);
    } catch (error) {
      console.error("Error creating inventory batch:", error);
      res.status(500).json({ message: "Erro ao cadastrar lote" });
    }
  });

  app.patch("/api/inventory/batches/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateInventoryBatch(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Lote não encontrado" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating inventory batch:", error);
      res.status(500).json({ message: "Erro ao atualizar lote" });
    }
  });

  app.delete("/api/inventory/batches/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteInventoryBatch(
        id,
        (req.user as any)?.id || 'system',
        (req.user as any)?.name || 'Sistema'
      );
      if (!success) {
        return res.status(404).json({ message: "Lote não encontrado" });
      }
      res.json({ success: true, message: "Lote excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting inventory batch:", error);
      res.status(500).json({ message: "Erro ao excluir lote" });
    }
  });

  // Inventory Movements Routes (Farmácia only)
  app.get("/api/inventory/movements", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { limit } = req.query;
      const movements = await storage.getInventoryMovements(limit ? parseInt(limit as string) : 100);
      res.json(movements);
    } catch (error) {
      console.error("Error fetching inventory movements:", error);
      res.status(500).json({ message: "Erro ao buscar movimentações" });
    }
  });

  app.get("/api/inventory/movements/batch/:batchId", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { batchId } = req.params;
      const movements = await storage.getInventoryMovementsByBatch(batchId);
      res.json(movements);
    } catch (error) {
      console.error("Error fetching batch movements:", error);
      res.status(500).json({ message: "Erro ao buscar movimentações do lote" });
    }
  });

  app.post("/api/inventory/movements", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { batchId, quantity, movementType, reason } = req.body;
      
      // Get current batch
      const batch = await storage.getInventoryBatch(batchId);
      if (!batch) {
        return res.status(404).json({ message: "Lote não encontrado" });
      }
      
      const currentQty = parseInt(batch.quantity || '0');
      const moveQty = parseInt(quantity);
      let newQty: number;
      
      if (movementType === 'entrada') {
        newQty = currentQty + moveQty;
      } else if (movementType === 'saida' || movementType === 'perda') {
        if (moveQty > currentQty) {
          return res.status(400).json({ message: "Quantidade insuficiente no lote" });
        }
        newQty = currentQty - moveQty;
      } else if (movementType === 'ajuste') {
        newQty = moveQty; // Ajuste direto para o valor informado
      } else {
        return res.status(400).json({ message: "Tipo de movimentação inválido" });
      }
      
      // Update batch quantity
      await storage.updateInventoryBatch(batchId, {
        quantity: newQty.toString(),
        status: newQty === 0 ? 'depleted' : (newQty <= parseInt(batch.medication?.minStock || '10') ? 'low_stock' : 'active')
      });
      
      // Create movement record
      const movement = await storage.createInventoryMovement({
        batchId,
        medicationId: batch.medicationId,
        movementType,
        quantity: movementType === 'entrada' ? quantity : `-${quantity}`,
        previousQuantity: currentQty.toString(),
        newQuantity: newQty.toString(),
        referenceType: 'manual',
        reason: reason || `Movimentação manual: ${movementType}`,
        performedBy: (req.user as any)?.id || 'system',
        performedByName: (req.user as any)?.name || 'Sistema'
      });
      
      res.status(201).json(movement);
    } catch (error) {
      console.error("Error creating inventory movement:", error);
      res.status(500).json({ message: "Erro ao registrar movimentação" });
    }
  });

  // Prescriptions Routes (Farmácia - dispensação e visualização)
  app.get("/api/pharmacy/prescriptions", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { status } = req.query;
      const prescriptions = await storage.getPrescriptions(status as string | undefined);
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      res.status(500).json({ message: "Erro ao buscar prescrições" });
    }
  });

  app.get("/api/pharmacy/prescriptions/pending", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const prescriptions = await storage.getPendingPrescriptions();
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching pending prescriptions:", error);
      res.status(500).json({ message: "Erro ao buscar prescrições pendentes" });
    }
  });

  app.get("/api/pharmacy/prescriptions/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const prescription = await storage.getPrescription(id);
      if (!prescription) {
        return res.status(404).json({ message: "Prescrição não encontrada" });
      }
      res.json(prescription);
    } catch (error) {
      console.error("Error fetching prescription:", error);
      res.status(500).json({ message: "Erro ao buscar prescrição" });
    }
  });

  app.get("/api/pharmacy/prescriptions/patient/:patientId", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { patientId } = req.params;
      const prescriptions = await storage.getPrescriptionsByPatient(patientId);
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching patient prescriptions:", error);
      res.status(500).json({ message: "Erro ao buscar prescrições do paciente" });
    }
  });

  app.post("/api/pharmacy/prescriptions", requireDoctorOrAdmin, async (req, res) => {
    try {
      const { items, ...prescriptionData } = req.body;
      
      // Get doctor's CRM if not provided
      let doctorCrm = prescriptionData.doctorCrm;
      if (!doctorCrm && prescriptionData.doctorId) {
        const doctor = await storage.getUser(prescriptionData.doctorId);
        if (doctor) {
          doctorCrm = doctor.crm || '';
        }
      }
      
      // Create prescription with CRM
      const prescription = await storage.createPrescription({
        ...prescriptionData,
        doctorCrm
      });
      
      // Create prescription items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createPrescriptionItem({
            ...item,
            prescriptionId: prescription.id
          });
        }
      }
      
      // Fetch complete prescription with items
      const completePrescription = await storage.getPrescription(prescription.id);
      res.status(201).json(completePrescription);
    } catch (error) {
      console.error("Error creating prescription:", error);
      res.status(500).json({ message: "Erro ao criar prescrição" });
    }
  });

  app.patch("/api/pharmacy/prescriptions/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updatePrescription(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Prescrição não encontrada" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating prescription:", error);
      res.status(500).json({ message: "Erro ao atualizar prescrição" });
    }
  });

  // Prescription Items Routes
  app.get("/api/pharmacy/prescriptions/:prescriptionId/items", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { prescriptionId } = req.params;
      const items = await storage.getPrescriptionItems(prescriptionId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching prescription items:", error);
      res.status(500).json({ message: "Erro ao buscar itens da prescrição" });
    }
  });

  app.post("/api/pharmacy/prescriptions/:prescriptionId/items", requireDoctorOrAdmin, async (req, res) => {
    try {
      const { prescriptionId } = req.params;
      const item = await storage.createPrescriptionItem({
        ...req.body,
        prescriptionId
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating prescription item:", error);
      res.status(500).json({ message: "Erro ao adicionar item na prescrição" });
    }
  });

  app.patch("/api/pharmacy/prescription-items/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updatePrescriptionItem(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Item não encontrado" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating prescription item:", error);
      res.status(500).json({ message: "Erro ao atualizar item" });
    }
  });

  app.delete("/api/pharmacy/prescription-items/:id", requireDoctorOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePrescriptionItem(id);
      if (!success) {
        return res.status(404).json({ message: "Item não encontrado" });
      }
      res.json({ success: true, message: "Item excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting prescription item:", error);
      res.status(500).json({ message: "Erro ao excluir item" });
    }
  });

  // ─── Lista de Prescrições (sem baixa de estoque) ────────────────────────────

  app.get("/api/pharmacy/prescription-list", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { eq, desc } = await import("drizzle-orm");
      const schema = await import("@shared/schema");

      const rows = await db
        .select()
        .from(schema.prescriptions)
        .where(eq(schema.prescriptions.sentToList, true))
        .orderBy(desc(schema.prescriptions.createdAt));

      const enriched = await Promise.all(rows.map(async (prescription) => {
        const [items, patientRows] = await Promise.all([
          db.select().from(schema.prescriptionItems)
            .where(eq(schema.prescriptionItems.prescriptionId, prescription.id)),
          db.select({ name: schema.patients.name })
            .from(schema.patients)
            .where(eq(schema.patients.id, prescription.patientId)),
        ]);
        return { ...prescription, items, patientName: patientRows[0]?.name ?? "Paciente não encontrado" };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching prescription list:", error);
      res.status(500).json({ message: "Erro ao buscar lista de prescrições" });
    }
  });

  app.post("/api/pharmacy/prescription-list/:id/release", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const schema = await import("@shared/schema");
      const user = req.user as any;

      const [updated] = await db
        .update(schema.prescriptions)
        .set({
          listReleasedAt: new Date(),
          listReleasedBy: user?.name || user?.username || "Farmacêutico",
          updatedAt: new Date(),
        })
        .where(eq(schema.prescriptions.id, req.params.id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Prescrição não encontrada" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error releasing prescription:", error);
      res.status(500).json({ message: "Erro ao liberar prescrição" });
    }
  });

  // Dispensing Routes
  app.post("/api/pharmacy/dispense", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { prescriptionItemId, batchId, quantity } = req.body;
      
      if (!prescriptionItemId || !batchId || !quantity) {
        return res.status(400).json({ message: "Item, lote e quantidade são obrigatórios" });
      }
      
      const parsedQuantity = parseInt(quantity, 10);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json({ message: "Quantidade deve ser um número positivo" });
      }
      
      const batch = await storage.getInventoryBatch(batchId);
      if (!batch) {
        return res.status(404).json({ message: "Lote não encontrado" });
      }
      
      const currentQty = parseInt(batch.quantity || "0", 10);
      if (parsedQuantity > currentQty) {
        return res.status(400).json({ message: `Estoque insuficiente. Disponível: ${currentQty}` });
      }
      
      const result = await storage.dispenseMedication(
        prescriptionItemId,
        batchId,
        String(parsedQuantity),
        (req.user as any)?.id || 'system',
        (req.user as any)?.name || 'Sistema'
      );
      
      // Deduzir automaticamente os materiais associados ao medicamento
      const userId = (req.user as any)?.id || 'system';
      const userName = (req.user as any)?.name || 'Sistema';
      
      if (batch.medicationId) {
        try {
          const materialRequirements = await storage.getMedicationMaterialRequirements(batch.medicationId);
          
          for (const matReq of materialRequirements) {
            const materialQtyNeeded = (parseInt(matReq.quantity) || 1) * parsedQuantity;
            
            // Buscar lotes de material disponíveis (FIFO por validade)
            const materialBatches = await storage.getMaterialsBatchesByMaterial(matReq.materialId);
            const sortedBatches = materialBatches
              .filter(b => parseInt(b.quantity || "0") > 0)
              .sort((a, b) => {
                if (!a.expirationDate) return 1;
                if (!b.expirationDate) return -1;
                return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
              });
            
            let remaining = materialQtyNeeded;
            for (const matBatch of sortedBatches) {
              if (remaining <= 0) break;
              
              const available = parseInt(matBatch.quantity || "0");
              const toDeduct = Math.min(remaining, available);
              
              const newQty = available - toDeduct;
              
              // Atualizar quantidade do lote de material
              await storage.updateMaterialsBatch(matBatch.id, {
                quantity: String(newQty)
              });
              
              // Registrar movimentação de saída
              await storage.createMaterialsMovement({
                materialId: matReq.materialId,
                batchId: matBatch.id,
                movementType: "saida",
                quantity: String(toDeduct),
                previousQuantity: String(available),
                newQuantity: String(newQty),
                referenceType: "dispensacao_medicamento",
                referenceId: prescriptionItemId,
                reason: `Dispensação automática - medicamento ${batch.medication?.name || batch.medicationId}`,
                performedBy: userId,
                performedByName: userName
              });
              
              remaining -= toDeduct;
            }
            
            if (remaining > 0) {
              console.warn(`⚠️ Material ${matReq.material?.name || matReq.materialId} com estoque insuficiente. Faltam ${remaining} unidades.`);
            }
          }
        } catch (matError) {
          console.error("Erro ao deduzir materiais:", matError);
          // Não falhar a dispensação se materiais não puderem ser deduzidos
        }
      }
      
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error dispensing medication:", error);
      res.status(400).json({ message: error.message || "Erro ao dispensar medicamento" });
    }
  });

  app.get("/api/pharmacy/dispensing-events/:prescriptionItemId", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { prescriptionItemId } = req.params;
      const events = await storage.getDispensingEvents(prescriptionItemId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching dispensing events:", error);
      res.status(500).json({ message: "Erro ao buscar eventos de dispensação" });
    }
  });

  // Dashboard/Alerts Routes
  app.get("/api/inventory/alerts", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const [lowStock, expiring] = await Promise.all([
        storage.getLowStockBatches(),
        storage.getExpiringBatches(30)
      ]);
      
      res.json({
        lowStock: lowStock.length,
        expiring: expiring.length,
        lowStockItems: lowStock.slice(0, 5),
        expiringItems: expiring.slice(0, 5)
      });
    } catch (error) {
      console.error("Error fetching inventory alerts:", error);
      res.status(500).json({ message: "Erro ao buscar alertas de estoque" });
    }
  });

  // Import medications from existing database
  app.post("/api/pharmacy/import-medications", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { MEDICATIONS_DATABASE } = await import("../shared/medications-database");
      
      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[]
      };
      
      const existingMedications = await storage.getMedicationsCatalog();
      const existingNames = new Set(existingMedications.map(m => m.name.toLowerCase()));
      
      const formMap: Record<string, string> = {
        "Antibiótico": "comprimido",
        "Analgésico/Antipirético": "comprimido",
        "AINE": "comprimido",
        "Anti-hipertensivo": "comprimido",
        "Antidiabético": "comprimido",
        "Inibidor de Bomba de Prótons": "cápsula",
        "Antagonista H2": "comprimido",
        "Broncodilatador": "spray",
        "Corticoide": "comprimido",
        "Antiagregante": "comprimido",
        "Anticoagulante": "comprimido",
        "Estatina": "comprimido",
        "Procinético/Antiemético": "comprimido",
        "Antiemético": "comprimido",
        "Antidepressivo": "comprimido",
        "Hormônio": "comprimido",
        "Insulina": "frasco",
        "spray": "spray"
      };
      
      const getForm = (category: string, name: string): string => {
        if (name.includes("spray")) return "spray";
        if (name.includes("Insulina")) return "frasco";
        for (const [key, value] of Object.entries(formMap)) {
          if (category.includes(key)) return value;
        }
        return "comprimido";
      };
      
      const getConcentration = (doses: string[]): string => {
        if (doses.length > 0) {
          const firstDose = doses[0];
          const match = firstDose.match(/(\d+(?:,?\d+)?(?:mg|mcg|UI|g))/);
          if (match) return match[1];
        }
        return "";
      };
      
      const getRandomQuantity = (): number => {
        const options = [50, 100, 150, 200, 250, 300, 500, 1000];
        return options[Math.floor(Math.random() * options.length)];
      };
      
      const getExpirationDate = (): string => {
        const date = new Date();
        date.setMonth(date.getMonth() + Math.floor(Math.random() * 18) + 6);
        return date.toISOString().split('T')[0];
      };
      
      for (const med of MEDICATIONS_DATABASE) {
        if (existingNames.has(med.name.toLowerCase())) {
          results.skipped++;
          continue;
        }
        
        try {
          const form = getForm(med.category, med.name);
          const catalogEntry = await storage.createMedicationCatalog({
            name: med.name,
            genericName: med.genericName,
            form: form,
            concentration: getConcentration(med.commonDoses),
            unit: form === "spray" ? "frasco" : (form === "frasco" ? "frasco" : "comprimido"),
            manufacturer: "Diversos",
            therapeuticClass: med.category,
            minStock: "50"
          });
          
          const quantity = getRandomQuantity();
          await storage.createInventoryBatch({
            medicationId: catalogEntry.id,
            batchNumber: `LOTE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            quantity: String(quantity),
            initialQuantity: String(quantity),
            expirationDate: getExpirationDate(),
            storageLocation: "Prateleira A",
            supplier: "Distribuidor Central",
            notes: `Importado do catálogo de medicamentos - ${med.category}`
          });
          
          results.imported++;
        } catch (err: any) {
          results.errors.push(`${med.name}: ${err.message}`);
        }
      }
      
      res.json({
        success: true,
        message: `Importação concluída: ${results.imported} medicamentos importados, ${results.skipped} já existentes`,
        ...results
      });
    } catch (error: any) {
      console.error("Error importing medications:", error);
      res.status(500).json({ message: error.message || "Erro ao importar medicamentos" });
    }
  });

  // =============================================
  // HOSPITALIZATION MODULE (INTERNAÇÃO)
  // =============================================

  // Get all hospital wards
  app.get("/api/hospital/wards", isAuthenticated, async (req, res) => {
    try {
      const wards = await storage.getHospitalWards();
      res.json(wards);
    } catch (error: any) {
      console.error("Error fetching hospital wards:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar alas" });
    }
  });

  // Get specific ward with beds
  app.get("/api/hospital/wards/:id", isAuthenticated, async (req, res) => {
    try {
      const ward = await storage.getHospitalWardWithBeds(req.params.id);
      if (!ward) {
        return res.status(404).json({ message: "Ala não encontrada" });
      }
      res.json(ward);
    } catch (error: any) {
      console.error("Error fetching hospital ward:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar ala" });
    }
  });

  // Create ward
  app.post("/api/hospital/wards", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const ward = await storage.createHospitalWard(req.body);
      res.status(201).json(ward);
    } catch (error: any) {
      console.error("Error creating ward:", error);
      res.status(500).json({ message: error.message || "Erro ao criar ala" });
    }
  });

  // Update ward
  app.patch("/api/hospital/wards/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const ward = await storage.updateHospitalWard(req.params.id, req.body);
      if (!ward) {
        return res.status(404).json({ message: "Ala não encontrada" });
      }
      res.json(ward);
    } catch (error: any) {
      console.error("Error updating ward:", error);
      res.status(500).json({ message: error.message || "Erro ao atualizar ala" });
    }
  });

  // Delete ward
  app.delete("/api/hospital/wards/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteHospitalWard(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Ala não encontrada" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting ward:", error);
      res.status(500).json({ message: error.message || "Erro ao excluir ala" });
    }
  });

  // Get all hospital beds
  app.get("/api/hospital/beds", isAuthenticated, async (req, res) => {
    try {
      const wardId = req.query.wardId as string | undefined;
      const beds = await storage.getHospitalBeds(wardId);
      res.json(beds);
    } catch (error: any) {
      console.error("Error fetching hospital beds:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar leitos" });
    }
  });

  // Get available beds
  app.get("/api/hospital/beds/available", isAuthenticated, async (req, res) => {
    try {
      const wardId = req.query.wardId as string | undefined;
      const beds = await storage.getAvailableBeds(wardId);
      res.json(beds);
    } catch (error: any) {
      console.error("Error fetching available beds:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar leitos disponíveis" });
    }
  });

  // Get all beds with hospitalization and patient details
  app.get("/api/hospital/beds/all", isAuthenticated, async (req, res) => {
    try {
      const wardId = req.query.wardId as string | undefined;
      const beds = await storage.getAllBedsWithDetails(wardId);
      res.json(beds);
    } catch (error: any) {
      console.error("Error fetching beds with details:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar leitos" });
    }
  });

  // Create bed
  app.post("/api/hospital/beds", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const bed = await storage.createHospitalBed(req.body);
      res.status(201).json(bed);
    } catch (error: any) {
      console.error("Error creating bed:", error);
      res.status(500).json({ message: error.message || "Erro ao criar leito" });
    }
  });

  // Update bed
  app.patch("/api/hospital/beds/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const bed = await storage.updateHospitalBed(req.params.id, req.body);
      if (!bed) {
        return res.status(404).json({ message: "Leito não encontrado" });
      }
      res.json(bed);
    } catch (error: any) {
      console.error("Error updating bed:", error);
      res.status(500).json({ message: error.message || "Erro ao atualizar leito" });
    }
  });

  // Delete bed
  app.delete("/api/hospital/beds/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteHospitalBed(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Leito não encontrado" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting bed:", error);
      res.status(500).json({ message: error.message || "Erro ao excluir leito" });
    }
  });

  // Get occupancy stats
  app.get("/api/hospital/occupancy", isAuthenticated, async (req, res) => {
    try {
      const occupancy = await storage.getHospitalizationOccupancy();
      res.json(occupancy);
    } catch (error: any) {
      console.error("Error fetching occupancy:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar ocupação" });
    }
  });

  // Get all hospitalizations
  app.get("/api/hospitalizations", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const wardId = req.query.wardId as string | undefined;
      const hospitalizations = await storage.getHospitalizations({ status, wardId });
      res.json(hospitalizations);
    } catch (error: any) {
      console.error("Error fetching hospitalizations:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar internações" });
    }
  });

  // Get active hospitalizations
  app.get("/api/hospitalizations/active", isAuthenticated, async (req, res) => {
    try {
      const hospitalizations = await storage.getActiveHospitalizations();
      res.json(hospitalizations);
    } catch (error: any) {
      console.error("Error fetching active hospitalizations:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar internações ativas" });
    }
  });

  // Get observation patients
  app.get("/api/hospitalizations/observation", isAuthenticated, async (req, res) => {
    try {
      const hospitalizations = await storage.getHospitalizations({ status: 'observacao' });
      res.json(hospitalizations);
    } catch (error: any) {
      console.error("Error fetching observation patients:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar pacientes em observação" });
    }
  });

  // Get red room patients (Sala Vermelha)
  app.get("/api/hospitalizations/red-room", isAuthenticated, async (req, res) => {
    try {
      const hospitalizations = await storage.getHospitalizations({ status: 'sala_vermelha' });
      res.json(hospitalizations);
    } catch (error: any) {
      console.error("Error fetching red room patients:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar pacientes na Sala Vermelha" });
    }
  });

  // Convert observation to hospitalization
  app.post("/api/hospitalizations/:id/convert-to-hospitalization", isAuthenticated, async (req, res) => {
    try {
      const hospitalization = await storage.updateHospitalization(req.params.id, { status: 'ativo' });
      if (!hospitalization) {
        return res.status(404).json({ message: "Internação não encontrada" });
      }
      res.json(hospitalization);
    } catch (error: any) {
      console.error("Error converting to hospitalization:", error);
      res.status(500).json({ message: error.message || "Erro ao converter para internação" });
    }
  });

  // Get hospitalizations by patient
  app.get("/api/hospitalizations/patient/:patientId", isAuthenticated, async (req, res) => {
    try {
      const hospitalizations = await storage.getHospitalizationsByPatient(req.params.patientId);
      res.json(hospitalizations);
    } catch (error: any) {
      console.error("Error fetching patient hospitalizations:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar internações do paciente" });
    }
  });

  // Get specific hospitalization
  app.get("/api/hospitalizations/:id", isAuthenticated, async (req, res) => {
    try {
      const hospitalization = await storage.getHospitalization(req.params.id);
      if (!hospitalization) {
        return res.status(404).json({ message: "Internação não encontrada" });
      }
      res.json(hospitalization);
    } catch (error: any) {
      console.error("Error fetching hospitalization:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar internação" });
    }
  });

  // Create hospitalization (by doctor or nurse)
  app.post("/api/hospitalizations", isAuthenticated, requireHospitalizationAccess, async (req, res) => {
    try {
      // Validate request body
      const validationResult = insertHospitalizationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Dados de internação inválidos",
          errors: validationResult.error.errors 
        });
      }
      
      const user = req.user as any;
      const hospitalizationData = {
        ...validationResult.data,
        attendingDoctorId: user.id,
        attendingDoctorName: user.name
      };
      
      const hospitalization = await storage.createHospitalization(hospitalizationData);
      res.status(201).json(hospitalization);
    } catch (error: any) {
      console.error("Error creating hospitalization:", error);
      res.status(500).json({ message: error.message || "Erro ao criar internação" });
    }
  });

  // Update hospitalization
  app.patch("/api/hospitalizations/:id", isAuthenticated, requireHospitalizationAccess, async (req, res) => {
    try {
      const hospitalization = await storage.updateHospitalization(req.params.id, req.body);
      if (!hospitalization) {
        return res.status(404).json({ message: "Internação não encontrada" });
      }
      res.json(hospitalization);
    } catch (error: any) {
      console.error("Error updating hospitalization:", error);
      res.status(500).json({ message: error.message || "Erro ao atualizar internação" });
    }
  });

  // Discharge patient
  app.post("/api/hospitalizations/:id/discharge", isAuthenticated, requireHospitalizationAccess, async (req, res) => {
    try {
      const user = req.user as any;
      const { dischargeType, dischargeSummary } = req.body;
      
      if (!dischargeType) {
        return res.status(400).json({ message: "Tipo de alta é obrigatório" });
      }
      
      const hospitalization = await storage.dischargePatient(req.params.id, {
        dischargeType,
        dischargeSummary,
        dischargedBy: user.id,
        dischargedByName: user.name
      });
      
      if (!hospitalization) {
        return res.status(404).json({ message: "Internação não encontrada" });
      }
      
      res.json(hospitalization);
    } catch (error: any) {
      console.error("Error discharging patient:", error);
      res.status(500).json({ message: error.message || "Erro ao dar alta" });
    }
  });

  // Transfer patient between observation, red room, and hospitalization
  app.post("/api/hospitalizations/:id/transfer", isAuthenticated, requireHospitalizationAccess, async (req, res) => {
    try {
      const user = req.user as any;
      const { newStatus, bedId, observations } = req.body;
      
      if (!newStatus || !['observacao', 'sala_vermelha', 'ativo'].includes(newStatus)) {
        return res.status(400).json({ message: "Status de destino inválido" });
      }
      
      // Get current hospitalization
      const currentHospitalization = await storage.getHospitalization(req.params.id);
      if (!currentHospitalization) {
        return res.status(404).json({ message: "Internação não encontrada" });
      }
      
      // Determine origin and destination labels
      const statusLabels: Record<string, string> = {
        'observacao': 'Observação',
        'sala_vermelha': 'Sala Vermelha',
        'ativo': 'Internação'
      };
      const originLabel = statusLabels[currentHospitalization.status] || currentHospitalization.status;
      const destLabel = statusLabels[newStatus];
      
      // Update hospitalization status and bedId if provided
      const updateData: any = { status: newStatus };
      if (newStatus === 'ativo' && bedId) {
        updateData.bedId = bedId;
        // Update bed status to 'ocupado' when transferring to hospitalization
        await storage.updateHospitalBed(bedId, {
          status: 'ocupado',
          currentHospitalizationId: req.params.id
        });
      } else if (newStatus !== 'ativo') {
        // If leaving hospitalization, release the bed if one was assigned
        if (currentHospitalization.bedId) {
          await storage.updateHospitalBed(currentHospitalization.bedId, {
            status: 'disponivel',
            currentHospitalizationId: null
          });
        }
        updateData.bedId = null; // Observação and Sala Vermelha don't have beds
      }
      
      const updatedHospitalization = await storage.updateHospitalization(req.params.id, updateData);
      
      // Create medical history record documenting the transfer
      const now = new Date();
      const transferRecord = await storage.createMedicalRecord({
        patientId: currentHospitalization.patientId,
        hospitalizationId: currentHospitalization.id,
        attendanceLocation: currentHospitalization.status, // Registra onde estava o paciente antes da transferência
        specialtyId: null, // Transfer doesn't need a specialty
        consultationDate: now.toISOString().split('T')[0],
        consultationTime: now.toTimeString().split(' ')[0].substring(0, 5),
        reason: `Transferência de ${originLabel} para ${destLabel}`,
        observations: observations || `Paciente transferido de ${originLabel} para ${destLabel}. Profissional responsável: ${user.name}`,
        doctorName: user.name,
        startTime: now,
        endTime: now
      });
      
      res.json({ 
        hospitalization: updatedHospitalization,
        transferRecord,
        message: `Paciente transferido de ${originLabel} para ${destLabel}`
      });
    } catch (error: any) {
      console.error("Error transferring patient:", error);
      res.status(500).json({ message: error.message || "Erro ao transferir paciente" });
    }
  });

  // Delete hospitalization
  app.delete("/api/hospitalizations/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteHospitalization(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Internação não encontrada" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting hospitalization:", error);
      res.status(500).json({ message: error.message || "Erro ao excluir internação" });
    }
  });

  // Get evolutions for hospitalization
  app.get("/api/hospitalizations/:id/evolutions", isAuthenticated, async (req, res) => {
    try {
      const evolutions = await storage.getHospitalizationEvolutions(req.params.id);
      res.json(evolutions);
    } catch (error: any) {
      console.error("Error fetching evolutions:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar evoluções" });
    }
  });

  // Get medical history records for a hospitalization (atendimentos vinculados à internação)
  app.get("/api/hospitalizations/:id/medical-history", isAuthenticated, async (req, res) => {
    try {
      const records = await storage.getMedicalHistoryByHospitalization(req.params.id);
      res.json(records);
    } catch (error: any) {
      console.error("Error fetching hospitalization medical history:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar atendimentos da internação" });
    }
  });

  // Create evolution
  app.post("/api/hospitalizations/:id/evolutions", isAuthenticated, requireHospitalizationAccess, async (req, res) => {
    try {
      // Prepare data with hospitalizationId
      const dataToValidate = {
        ...req.body,
        hospitalizationId: req.params.id
      };
      
      // Validate request body
      const validationResult = insertHospitalizationEvolutionSchema.safeParse(dataToValidate);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Dados de evolução inválidos",
          errors: validationResult.error.errors 
        });
      }
      
      const sessionUser = req.user as any;
      // Buscar usuário completo do banco para garantir que temos o CRM/COREN
      const user = await storage.getUser(sessionUser.id);
      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }
      // Determinar o registro profissional (CRM para médico, COREN para enfermeiro)
      const professionalRegistration = user.role === 'triage' 
        ? ((user as any).coren || null) 
        : (user.crm || null);
      console.log("📋 Creating evolution - User:", user.name, "Role:", user.role, "CRM:", user.crm, "COREN:", (user as any).coren, "Registration:", professionalRegistration);
      
      const evolutionData = {
        ...validationResult.data,
        createdBy: user.id,
        createdByName: user.name,
        createdByRole: user.role,
        createdByRegistration: professionalRegistration
      };
      
      const evolution = await storage.createHospitalizationEvolution(evolutionData);
      console.log("📋 Evolution created:", evolution.id, "Registration saved:", evolution.createdByRegistration);
      res.status(201).json(evolution);
    } catch (error: any) {
      console.error("Error creating evolution:", error);
      res.status(500).json({ message: error.message || "Erro ao criar evolução" });
    }
  });

  // Update evolution
  app.patch("/api/hospitalization-evolutions/:id", isAuthenticated, requireHospitalizationAccess, async (req, res) => {
    try {
      const evolution = await storage.updateHospitalizationEvolution(req.params.id, req.body);
      if (!evolution) {
        return res.status(404).json({ message: "Evolução não encontrada" });
      }
      res.json(evolution);
    } catch (error: any) {
      console.error("Error updating evolution:", error);
      res.status(500).json({ message: error.message || "Erro ao atualizar evolução" });
    }
  });

  // Delete evolution
  app.delete("/api/hospitalization-evolutions/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteHospitalizationEvolution(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Evolução não encontrada" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting evolution:", error);
      res.status(500).json({ message: error.message || "Erro ao excluir evolução" });
    }
  });

  // =============================================
  // MÓDULO DE MATERIAIS HOSPITALARES (FARMÁCIA)
  // =============================================

  // Materials for procedures - accessible by doctors
  app.get("/api/materials-for-procedures", isAuthenticated, async (req, res) => {
    try {
      const materials = await storage.getMaterialsCatalog();
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials for procedures:", error);
      res.status(500).json({ message: "Erro ao buscar materiais" });
    }
  });

  // Materials Catalog Routes
  app.get("/api/materials", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const materials = await storage.getMaterialsCatalog();
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials catalog:", error);
      res.status(500).json({ message: "Erro ao buscar catálogo de materiais" });
    }
  });

  // Get all materials batches (for dispensing)
  app.get("/api/materials/batches", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const batches = await storage.getMaterialsBatches();
      res.json(batches);
    } catch (error) {
      console.error("Error fetching materials batches:", error);
      res.status(500).json({ message: "Erro ao buscar lotes de materiais" });
    }
  });

  app.get("/api/materials/search", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }
      const materials = await storage.searchMaterialsCatalog(q);
      res.json(materials);
    } catch (error) {
      console.error("Error searching materials:", error);
      res.status(500).json({ message: "Erro ao buscar materiais" });
    }
  });

  app.get("/api/materials/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const material = await storage.getMaterialCatalog(id);
      if (!material) {
        return res.status(404).json({ message: "Material não encontrado" });
      }
      res.json(material);
    } catch (error) {
      console.error("Error fetching material:", error);
      res.status(500).json({ message: "Erro ao buscar material" });
    }
  });

  app.post("/api/materials", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const material = await storage.createMaterialCatalog(req.body);
      res.status(201).json(material);
    } catch (error) {
      console.error("Error creating material:", error);
      res.status(500).json({ message: "Erro ao cadastrar material" });
    }
  });

  app.patch("/api/materials/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateMaterialCatalog(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Material não encontrado" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating material:", error);
      res.status(500).json({ message: "Erro ao atualizar material" });
    }
  });

  app.delete("/api/materials/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteMaterialCatalog(id);
      if (!success) {
        return res.status(404).json({ message: "Material não encontrado" });
      }
      res.json({ success: true, message: "Material desativado com sucesso" });
    } catch (error) {
      console.error("Error deleting material:", error);
      res.status(500).json({ message: "Erro ao desativar material" });
    }
  });

  // Materials Batches Routes
  app.get("/api/materials-batches", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const batches = await storage.getMaterialsBatches();
      res.json(batches);
    } catch (error) {
      console.error("Error fetching materials batches:", error);
      res.status(500).json({ message: "Erro ao buscar lotes de materiais" });
    }
  });

  app.get("/api/materials-batches/material/:materialId", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { materialId } = req.params;
      const batches = await storage.getMaterialsBatchesByMaterial(materialId);
      res.json(batches);
    } catch (error) {
      console.error("Error fetching material batches:", error);
      res.status(500).json({ message: "Erro ao buscar lotes do material" });
    }
  });

  app.get("/api/materials-batches/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const batch = await storage.getMaterialsBatch(id);
      if (!batch) {
        return res.status(404).json({ message: "Lote não encontrado" });
      }
      res.json(batch);
    } catch (error) {
      console.error("Error fetching materials batch:", error);
      res.status(500).json({ message: "Erro ao buscar lote" });
    }
  });

  app.post("/api/materials-batches", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const batch = await storage.createMaterialsBatch(req.body);
      
      // Create movement record for entry
      await storage.createMaterialsMovement({
        batchId: batch.id,
        materialId: batch.materialId,
        movementType: "entrada",
        quantity: batch.initialQuantity,
        previousQuantity: "0",
        newQuantity: batch.initialQuantity,
        referenceType: "recebimento",
        reason: "Entrada inicial de lote",
        performedBy: user.id,
        performedByName: user.name
      });
      
      res.status(201).json(batch);
    } catch (error) {
      console.error("Error creating materials batch:", error);
      res.status(500).json({ message: "Erro ao criar lote" });
    }
  });

  app.patch("/api/materials-batches/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateMaterialsBatch(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Lote não encontrado" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating materials batch:", error);
      res.status(500).json({ message: "Erro ao atualizar lote" });
    }
  });

  // Materials Movements Routes
  app.get("/api/materials-movements", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const movements = await storage.getMaterialsMovements();
      res.json(movements);
    } catch (error) {
      console.error("Error fetching materials movements:", error);
      res.status(500).json({ message: "Erro ao buscar movimentações" });
    }
  });

  app.get("/api/materials-movements/batch/:batchId", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { batchId } = req.params;
      const movements = await storage.getMaterialsMovementsByBatch(batchId);
      res.json(movements);
    } catch (error) {
      console.error("Error fetching batch movements:", error);
      res.status(500).json({ message: "Erro ao buscar movimentações do lote" });
    }
  });

  app.post("/api/materials-movements", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const { batchId, materialId, movementType, quantity, reason, destinationSector, notes } = req.body;
      
      // Get current batch to calculate new quantity
      const batch = await storage.getMaterialsBatch(batchId);
      if (!batch) {
        return res.status(404).json({ message: "Lote não encontrado" });
      }
      
      const currentQty = parseInt(batch.quantity);
      const moveQty = parseInt(quantity);
      let newQty: number;
      
      if (movementType === "entrada") {
        newQty = currentQty + moveQty;
      } else if (movementType === "saida" || movementType === "perda" || movementType === "vencido") {
        newQty = currentQty - moveQty;
        if (newQty < 0) {
          return res.status(400).json({ message: "Quantidade insuficiente em estoque" });
        }
      } else if (movementType === "ajuste") {
        newQty = moveQty; // Ajuste define a nova quantidade diretamente
      } else {
        return res.status(400).json({ message: "Tipo de movimentação inválido" });
      }
      
      // Create movement
      const movement = await storage.createMaterialsMovement({
        batchId,
        materialId,
        movementType,
        quantity: String(moveQty),
        previousQuantity: String(currentQty),
        newQuantity: String(newQty),
        reason,
        destinationSector,
        notes,
        performedBy: user.id,
        performedByName: user.name
      });
      
      // Update batch quantity
      await storage.updateMaterialsBatch(batchId, { 
        quantity: String(newQty),
        status: newQty === 0 ? "depleted" : (newQty <= 10 ? "low_stock" : "active")
      });
      
      res.status(201).json(movement);
    } catch (error) {
      console.error("Error creating materials movement:", error);
      res.status(500).json({ message: "Erro ao registrar movimentação" });
    }
  });

  // Import materials from Excel data
  app.post("/api/materials/import", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { materials } = req.body;
      if (!Array.isArray(materials)) {
        return res.status(400).json({ message: "Formato de dados inválido" });
      }
      
      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[]
      };
      
      const existingMaterials = await storage.getMaterialsCatalog();
      const existingNames = new Set(existingMaterials.map(m => m.name.toLowerCase().substring(0, 50)));
      
      for (const mat of materials) {
        const shortName = mat.name?.substring(0, 50)?.toLowerCase();
        if (existingNames.has(shortName)) {
          results.skipped++;
          continue;
        }
        
        try {
          await storage.createMaterialCatalog({
            name: mat.name,
            shortName: mat.name?.substring(0, 50),
            unit: mat.unit || "UN",
            category: mat.category || "Geral",
            materialGroup: mat.materialGroup || null,
            minStock: "10"
          });
          existingNames.add(shortName);
          results.imported++;
        } catch (err: any) {
          results.errors.push(`${mat.name?.substring(0, 30)}: ${err.message}`);
        }
      }
      
      res.json({
        success: true,
        message: `Importação concluída: ${results.imported} materiais importados, ${results.skipped} já existentes`,
        ...results
      });
    } catch (error: any) {
      console.error("Error importing materials:", error);
      res.status(500).json({ message: error.message || "Erro ao importar materiais" });
    }
  });

  // Import materials from Excel file on server
  app.post("/api/materials/import-excel", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const ExcelJS = await import('exceljs');
      const path = await import('path');
      
      const filePath = path.default.join(process.cwd(), 'attached_assets', 'CRALABPED17122025_1766226348077.xlsx');
      const workbook = new ExcelJS.default.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.worksheets[0];
      const data: any[][] = [];
      worksheet.eachRow((row) => {
        data.push((row.values as any[]).slice(1));
      });
      
      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[]
      };
      
      const existingMaterials = await storage.getMaterialsCatalog();
      const existingNames = new Set(existingMaterials.map(m => m.name.toLowerCase().substring(0, 100)));
      
      // Skip header row
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || !row[2]) continue; // Skip empty rows
        
        const name = String(row[2]).trim();
        let unit = String(row[1] || 'UN').trim().toUpperCase();
        
        // Normalize unit
        if (unit === 'CX.') unit = 'CX';
        if (unit === 'GALÃO ') unit = 'GALÃO';
        if (unit === 'PCTS') unit = 'PCT';
        
        const shortName = name.substring(0, 100).toLowerCase();
        if (existingNames.has(shortName)) {
          results.skipped++;
          continue;
        }
        
        // Detect material group based on name
        let materialGroup = "OUTROS MATERIAIS";
        const nameLower = name.toLowerCase();
        
        if (nameLower.includes('álcool') || nameLower.includes('agua oxigenada') || nameLower.includes('clorexidina') || nameLower.includes('hipoclorito') || nameLower.includes('iodo')) {
          materialGroup = "ANTISSÉPTICOS / DESINFETANTES";
        } else if (nameLower.includes('atadura') || nameLower.includes('gaze') || nameLower.includes('algodao') || nameLower.includes('curativo') || nameLower.includes('esparadrapo') || nameLower.includes('micropore') || nameLower.includes('compressa')) {
          materialGroup = "CURATIVOS";
        } else if (nameLower.includes('sonda') || nameLower.includes('tubo') || nameLower.includes('dreno')) {
          materialGroup = "TUBOS, SONDAS E DRENOS";
        } else if (nameLower.includes('fio') || nameLower.includes('cabo') || nameLower.includes('conector')) {
          materialGroup = "FIOS, CABOS E CONEXÕES";
        } else if (nameLower.includes('seringa') || nameLower.includes('agulha') || nameLower.includes('cateter') || nameLower.includes('scalp') || nameLower.includes('equipo') || nameLower.includes('infusao')) {
          materialGroup = "DISPOSITIVOS DE INFUSÃO";
        } else if (nameLower.includes('bisturi') || nameLower.includes('lamina') || nameLower.includes('tesoura')) {
          materialGroup = "DISPOSITIVOS DE INCISÃO";
        } else if (nameLower.includes('luva') || nameLower.includes('latex')) {
          materialGroup = "LÁTEX";
        } else if (nameLower.includes('avental') || nameLower.includes('campo') || nameLower.includes('lencol') || nameLower.includes('mascara') || nameLower.includes('touca') || nameLower.includes('pro-pe')) {
          materialGroup = "TÊXTEIS";
        } else if (nameLower.includes('bolsa') || nameLower.includes('coletor') || nameLower.includes('frasco') || nameLower.includes('copo')) {
          materialGroup = "BOLSAS E COLETORES";
        } else if (nameLower.includes('pinça') || nameLower.includes('porta-agulha') || nameLower.includes('afastador') || nameLower.includes('especulo') || nameLower.includes('cabo')) {
          materialGroup = "ACESSÓRIOS E INSTRUMENTAIS CIRÚRGICOS";
        } else if (nameLower.includes('raio') || nameLower.includes('rx') || nameLower.includes('radiografia') || nameLower.includes('filme')) {
          materialGroup = "RADIOLOGIA";
        } else if (nameLower.includes('ortese') || nameLower.includes('protese') || nameLower.includes('imobilizador') || nameLower.includes('tala')) {
          materialGroup = "ÓRTESES / PRÓTESES";
        }
        
        try {
          await storage.createMaterialCatalog({
            name: name,
            shortName: name.substring(0, 100),
            unit: unit,
            category: "Geral",
            materialGroup: materialGroup,
            minStock: "10"
          });
          existingNames.add(shortName);
          results.imported++;
        } catch (err: any) {
          results.errors.push(`${name.substring(0, 30)}: ${err.message}`);
        }
      }
      
      res.json({
        success: true,
        message: `Importação da planilha concluída: ${results.imported} materiais importados, ${results.skipped} já existentes`,
        ...results
      });
    } catch (error: any) {
      console.error("Error importing materials from Excel:", error);
      res.status(500).json({ message: error.message || "Erro ao importar planilha de materiais" });
    }
  });

  // Materials Alerts
  app.get("/api/materials/alerts", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const [lowStock, expiring] = await Promise.all([
        storage.getMaterialsLowStock(),
        storage.getMaterialsExpiring(30)
      ]);
      
      res.json({
        lowStock: lowStock.length,
        expiring: expiring.length,
        lowStockItems: lowStock.slice(0, 5),
        expiringItems: expiring.slice(0, 5)
      });
    } catch (error) {
      console.error("Error fetching materials alerts:", error);
      res.status(500).json({ message: "Erro ao buscar alertas de materiais" });
    }
  });

  // =============================================
  // PHARMACY KITS ROUTES
  // =============================================

  // Get all kits with items and stock status
  app.get("/api/pharmacy-kits", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const kits = await storage.getPharmacyKitsWithItems();
      res.json(kits);
    } catch (error) {
      console.error("Error fetching pharmacy kits:", error);
      res.status(500).json({ message: "Erro ao buscar kits" });
    }
  });

  // Get single kit with items
  app.get("/api/pharmacy-kits/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const kit = await storage.getPharmacyKitWithItems(req.params.id);
      if (!kit) {
        return res.status(404).json({ message: "Kit não encontrado" });
      }
      res.json(kit);
    } catch (error) {
      console.error("Error fetching pharmacy kit:", error);
      res.status(500).json({ message: "Erro ao buscar kit" });
    }
  });

  // Create new kit
  app.post("/api/pharmacy-kits", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { name, description, category, items } = req.body;
      
      const kit = await storage.createPharmacyKit({
        name,
        description,
        category
      });
      
      // Create kit items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createPharmacyKitItem({
            kitId: kit.id,
            materialId: item.materialId,
            quantity: item.quantity
          });
        }
      }
      
      const kitWithItems = await storage.getPharmacyKitWithItems(kit.id);
      res.status(201).json(kitWithItems);
    } catch (error) {
      console.error("Error creating pharmacy kit:", error);
      res.status(500).json({ message: "Erro ao criar kit" });
    }
  });

  // Update kit
  app.patch("/api/pharmacy-kits/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { name, description, category, isActive, items } = req.body;
      
      const updated = await storage.updatePharmacyKit(req.params.id, {
        name,
        description,
        category,
        isActive
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Kit não encontrado" });
      }
      
      // If items are provided, replace all items
      if (items && Array.isArray(items)) {
        await storage.deletePharmacyKitItemsByKit(req.params.id);
        for (const item of items) {
          await storage.createPharmacyKitItem({
            kitId: req.params.id,
            materialId: item.materialId,
            quantity: item.quantity
          });
        }
      }
      
      const kitWithItems = await storage.getPharmacyKitWithItems(req.params.id);
      res.json(kitWithItems);
    } catch (error) {
      console.error("Error updating pharmacy kit:", error);
      res.status(500).json({ message: "Erro ao atualizar kit" });
    }
  });

  // Delete kit
  app.delete("/api/pharmacy-kits/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const deleted = await storage.deletePharmacyKit(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Kit não encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting pharmacy kit:", error);
      res.status(500).json({ message: "Erro ao excluir kit" });
    }
  });

  // Dispense kit (deduct stock from all materials)
  app.post("/api/pharmacy-kits/:id/dispense", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const { patientId, patientName, notes, destinationSector } = req.body;
      
      const kit = await storage.getPharmacyKitWithItems(req.params.id);
      if (!kit) {
        return res.status(404).json({ message: "Kit não encontrado" });
      }
      
      if (!kit.hasStock) {
        return res.status(400).json({ message: "Estoque insuficiente para dispensar o kit" });
      }
      
      // Deduct stock for each material in the kit
      for (const item of kit.items) {
        const requiredQty = parseInt(item.quantity || "0");
        let remainingQty = requiredQty;
        
        // Get batches for this material ordered by expiration (FIFO)
        const batches = await storage.getMaterialsBatchesByMaterial(item.materialId);
        const activeBatches = batches
          .filter(b => parseInt(b.quantity || "0") > 0)
          .sort((a, b) => {
            const dateA = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity;
            const dateB = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity;
            return dateA - dateB;
          });
        
        for (const batch of activeBatches) {
          if (remainingQty <= 0) break;
          
          const batchQty = parseInt(batch.quantity || "0");
          const deductQty = Math.min(batchQty, remainingQty);
          const newQty = batchQty - deductQty;
          
          // Create movement
          await storage.createMaterialsMovement({
            batchId: batch.id,
            materialId: item.materialId,
            movementType: "saida",
            quantity: String(deductQty),
            previousQuantity: String(batchQty),
            newQuantity: String(newQty),
            reason: `Dispensação de Kit: ${kit.name}`,
            destinationSector: destinationSector || null,
            notes: notes || null,
            performedBy: user.id,
            performedByName: user.name
          });
          
          // Update batch quantity
          await storage.updateMaterialsBatch(batch.id, {
            quantity: String(newQty),
            status: newQty === 0 ? "depleted" : (newQty <= 10 ? "low_stock" : "active")
          });
          
          remainingQty -= deductQty;
        }
      }
      
      // Create dispensation record
      const dispensation = await storage.createPharmacyKitDispensation({
        kitId: kit.id,
        patientId: patientId || null,
        patientName: patientName || null,
        dispensedBy: user.id,
        dispensedByName: user.name,
        notes,
        destinationSector: destinationSector || "Não especificado"
      });
      
      res.status(201).json(dispensation);
    } catch (error) {
      console.error("Error dispensing pharmacy kit:", error);
      res.status(500).json({ message: "Erro ao dispensar kit" });
    }
  });

  // Get kit dispensation history
  app.get("/api/pharmacy-kit-dispensations", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const dispensations = await storage.getPharmacyKitDispensations(limit);
      res.json(dispensations);
    } catch (error) {
      console.error("Error fetching kit dispensations:", error);
      res.status(500).json({ message: "Erro ao buscar histórico de dispensações" });
    }
  });

  // =============================================
  // MATERIAIS POR MEDICAMENTO - Associações automáticas
  // =============================================

  // Get all medication material requirements
  app.get("/api/medication-material-requirements", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const requirements = await storage.getAllMedicationMaterialRequirements();
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching medication material requirements:", error);
      res.status(500).json({ message: "Erro ao buscar associações" });
    }
  });

  // Get requirements for a specific medication
  app.get("/api/medications/:id/material-requirements", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const requirements = await storage.getMedicationMaterialRequirements(req.params.id);
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching medication requirements:", error);
      res.status(500).json({ message: "Erro ao buscar materiais do medicamento" });
    }
  });

  // Create a new medication material requirement
  app.post("/api/medication-material-requirements", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const { medicationId, materialId, quantity, notes } = req.body;
      
      if (!medicationId || !materialId || !quantity) {
        return res.status(400).json({ message: "Medicamento, material e quantidade são obrigatórios" });
      }
      
      const requirement = await storage.createMedicationMaterialRequirement({
        medicationId,
        materialId,
        quantity: String(quantity),
        notes: notes || null,
        createdBy: user.id,
        createdByName: user.name
      });
      
      res.status(201).json(requirement);
    } catch (error) {
      console.error("Error creating medication material requirement:", error);
      res.status(500).json({ message: "Erro ao criar associação" });
    }
  });

  // Update a medication material requirement
  app.patch("/api/medication-material-requirements/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { quantity, notes } = req.body;
      
      const updated = await storage.updateMedicationMaterialRequirement(req.params.id, {
        quantity: quantity ? String(quantity) : undefined,
        notes
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating medication material requirement:", error);
      res.status(500).json({ message: "Erro ao atualizar associação" });
    }
  });

  // Delete a medication material requirement
  app.delete("/api/medication-material-requirements/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteMedicationMaterialRequirement(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting medication material requirement:", error);
      res.status(500).json({ message: "Erro ao excluir associação" });
    }
  });

  // Bulk replace requirements for a medication (delete all and create new ones)
  app.put("/api/medications/:id/material-requirements", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const medicationId = req.params.id;
      const { requirements } = req.body;
      
      if (!Array.isArray(requirements)) {
        return res.status(400).json({ message: "Lista de materiais inválida" });
      }
      
      // Delete existing requirements
      await storage.deleteMedicationMaterialRequirementsByMedication(medicationId);
      
      // Create new requirements
      const created = [];
      for (const req of requirements) {
        if (req.materialId && req.quantity) {
          const newReq = await storage.createMedicationMaterialRequirement({
            medicationId,
            materialId: req.materialId,
            quantity: String(req.quantity),
            notes: req.notes || null,
            createdBy: user.id,
            createdByName: user.name
          });
          created.push(newReq);
        }
      }
      
      res.json(created);
    } catch (error) {
      console.error("Error replacing medication material requirements:", error);
      res.status(500).json({ message: "Erro ao atualizar materiais do medicamento" });
    }
  });

  // =============================================
  // MEDICATION-KIT ASSOCIATIONS ROUTES
  // =============================================

  // Get all associations or filter by medication
  app.get("/api/medication-kit-associations", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const medicationId = req.query.medicationId as string | undefined;
      const associations = await storage.getMedicationKitAssociations(medicationId);
      res.json(associations);
    } catch (error) {
      console.error("Error fetching medication-kit associations:", error);
      res.status(500).json({ message: "Erro ao buscar associações" });
    }
  });

  // Get associations for a specific kit
  app.get("/api/medication-kit-associations/kit/:kitId", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const associations = await storage.getKitMedicationAssociations(req.params.kitId);
      res.json(associations);
    } catch (error) {
      console.error("Error fetching kit medication associations:", error);
      res.status(500).json({ message: "Erro ao buscar associações do kit" });
    }
  });

  // Get associations for a specific medication (accessible by doctors for prescriptions)
  app.get("/api/medication-kit-associations/medication/:medicationId", isAuthenticated, async (req, res) => {
    try {
      const associations = await storage.getMedicationKitAssociations(req.params.medicationId);
      res.json(associations);
    } catch (error) {
      console.error("Error fetching medication kit associations:", error);
      res.status(500).json({ message: "Erro ao buscar kits do medicamento" });
    }
  });

  // Create a new association
  app.post("/api/medication-kit-associations", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { medicationId, kitId, isDefault, notes } = req.body;
      
      if (!medicationId || !kitId) {
        return res.status(400).json({ message: "Medicamento e Kit são obrigatórios" });
      }
      
      const association = await storage.createMedicationKitAssociation({
        medicationId,
        kitId,
        isDefault: isDefault || false,
        notes
      });
      
      res.status(201).json(association);
    } catch (error) {
      console.error("Error creating medication-kit association:", error);
      res.status(500).json({ message: "Erro ao criar associação" });
    }
  });

  // Update an association
  app.patch("/api/medication-kit-associations/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const { isDefault, notes } = req.body;
      
      const updated = await storage.updateMedicationKitAssociation(req.params.id, {
        isDefault,
        notes
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating medication-kit association:", error);
      res.status(500).json({ message: "Erro ao atualizar associação" });
    }
  });

  // Delete an association
  app.delete("/api/medication-kit-associations/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteMedicationKitAssociation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Associação não encontrada" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting medication-kit association:", error);
      res.status(500).json({ message: "Erro ao excluir associação" });
    }
  });

  // Bulk replace associations for a kit
  app.put("/api/kits/:kitId/medication-associations", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const kitId = req.params.kitId;
      const { medications } = req.body;
      
      if (!Array.isArray(medications)) {
        return res.status(400).json({ message: "Lista de medicamentos inválida" });
      }
      
      // Delete existing associations
      await storage.deleteKitMedicationAssociations(kitId);
      
      // Create new associations
      const created = [];
      for (const med of medications) {
        if (med.medicationId) {
          const newAssoc = await storage.createMedicationKitAssociation({
            kitId,
            medicationId: med.medicationId,
            isDefault: med.isDefault || false,
            notes: med.notes || null
          });
          created.push(newAssoc);
        }
      }
      
      res.json(created);
    } catch (error) {
      console.error("Error replacing kit medication associations:", error);
      res.status(500).json({ message: "Erro ao atualizar medicamentos do kit" });
    }
  });

  // =============================================
  // SOLICITAÇÕES DE PROCEDIMENTOS
  // =============================================

  // Get all procedure requests (optionally filter by status)
  app.get("/api/procedure-requests", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const requests = await storage.getProcedureRequests(status);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching procedure requests:", error);
      res.status(500).json({ message: "Erro ao buscar solicitações de procedimentos" });
    }
  });

  // Get pending procedure requests (for pharmacy queue)
  app.get("/api/procedure-requests/pending", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const requests = await storage.getPendingProcedureRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching pending procedure requests:", error);
      res.status(500).json({ message: "Erro ao buscar solicitações pendentes" });
    }
  });

  // Get completed procedure requests
  app.get("/api/procedure-requests/completed", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const requests = await storage.getCompletedProcedureRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching completed procedure requests:", error);
      res.status(500).json({ message: "Erro ao buscar solicitações finalizadas" });
    }
  });

  // =============================================
  // DISPENSAÇÃO UNIFICADA
  // =============================================

  // Get unified dispensing queue (combines prescriptions and procedure requests)
  app.get("/api/dispensing/queue", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const statusFilter = req.query.status as string | undefined;
      const typeFilter = req.query.type as string | undefined;
      
      const queue: any[] = [];
      
      // Fetch prescriptions based on status filter
      if (!typeFilter || typeFilter === 'prescription') {
        if (!statusFilter || statusFilter === 'pending') {
          const pendingPrescriptions = await storage.getPendingPrescriptions();
          for (const p of pendingPrescriptions) {
            queue.push({
              id: p.id,
              type: 'prescription',
              origin: 'prontuario',
              patientId: p.patientId,
              patientName: p.patient?.name || 'Paciente não identificado',
              status: p.status,
              createdAt: p.createdAt,
              items: p.items || [],
              itemCount: p.items?.length || 0,
              pendingItemCount: p.items?.filter((i: any) => i.status === 'pending').length || 0,
              notes: p.notes,
              doctorName: p.doctorName
            });
          }
        }
        if (statusFilter === 'completed') {
          const completedPrescriptions = await storage.getPrescriptions('dispensed');
          for (const p of completedPrescriptions) {
            queue.push({
              id: p.id,
              type: 'prescription',
              origin: 'prontuario',
              patientId: p.patientId,
              patientName: p.patient?.name || 'Paciente não identificado',
              status: 'completed',
              createdAt: p.createdAt,
              items: [],
              itemCount: 0,
              pendingItemCount: 0,
              notes: p.notes,
              doctorName: p.doctorName
            });
          }
        }
      }
      
      // Fetch procedure requests based on status filter
      if (!typeFilter || typeFilter === 'procedure') {
        const procedureStatus = statusFilter === 'completed' ? 'completed' : 'pending';
        const procedureRequests = await storage.getProcedureRequests(procedureStatus);
        
        for (const pr of procedureRequests) {
          const pendingItems = pr.items?.filter((i: any) => i.status === 'pending') || [];
          queue.push({
            id: pr.id,
            type: 'procedure',
            origin: pr.sourceType || 'internacao',
            patientId: pr.patientId,
            patientName: pr.patient?.name || 'Paciente não identificado',
            status: pr.status,
            createdAt: pr.createdAt,
            items: pr.items || [],
            itemCount: pr.items?.length || 0,
            pendingItemCount: pendingItems.length,
            kitName: pr.kit?.name,
            requestMode: pr.requestMode,
            notes: pr.notes,
            doctorName: pr.requestedByName
          });
        }
      }
      
      // Sort by createdAt descending (newest first)
      queue.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(queue);
    } catch (error) {
      console.error("Error fetching unified dispensing queue:", error);
      res.status(500).json({ message: "Erro ao buscar fila de dispensação" });
    }
  });

  // Get unified dispensing queue summary (counts by type and status)
  app.get("/api/dispensing/summary", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const pendingPrescriptions = await storage.getPendingPrescriptions();
      const pendingProcedures = await storage.getPendingProcedureRequests();
      const completedProcedures = await storage.getCompletedProcedureRequests();
      
      res.json({
        pending: {
          total: pendingPrescriptions.length + pendingProcedures.length,
          prescriptions: pendingPrescriptions.length,
          procedures: pendingProcedures.length
        },
        completed: {
          procedures: completedProcedures.length
        }
      });
    } catch (error) {
      console.error("Error fetching dispensing summary:", error);
      res.status(500).json({ message: "Erro ao buscar resumo de dispensação" });
    }
  });

  // =============================================
  // KITS DE PROCEDIMENTO
  // =============================================

  // Get all active procedure kits
  app.get("/api/procedure-kits", isAuthenticated, async (req, res) => {
    try {
      // Use pharmacy kits instead of separate procedure kits table
      const kits = await storage.getPharmacyKitsWithItems();
      res.json(kits);
    } catch (error) {
      console.error("Error fetching procedure kits:", error);
      res.status(500).json({ message: "Erro ao buscar kits de procedimento" });
    }
  });

  // Get single procedure kit with items
  app.get("/api/procedure-kits/:id", isAuthenticated, async (req, res) => {
    try {
      const kit = await storage.getProcedureKit(req.params.id);
      if (!kit) {
        return res.status(404).json({ message: "Kit não encontrado" });
      }
      res.json(kit);
    } catch (error) {
      console.error("Error fetching procedure kit:", error);
      res.status(500).json({ message: "Erro ao buscar kit de procedimento" });
    }
  });

  // Create procedure kit
  app.post("/api/procedure-kits", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const kitData = {
        ...req.body,
        createdBy: user.id,
        createdByName: user.name
      };
      const kit = await storage.createProcedureKit(kitData);
      res.status(201).json(kit);
    } catch (error) {
      console.error("Error creating procedure kit:", error);
      res.status(500).json({ message: "Erro ao criar kit de procedimento" });
    }
  });

  // Update procedure kit
  app.patch("/api/procedure-kits/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const updated = await storage.updateProcedureKit(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Kit não encontrado" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating procedure kit:", error);
      res.status(500).json({ message: "Erro ao atualizar kit de procedimento" });
    }
  });

  // Soft delete procedure kit
  app.delete("/api/procedure-kits/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteProcedureKit(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Kit não encontrado" });
      }
      res.json({ message: "Kit desativado com sucesso" });
    } catch (error) {
      console.error("Error deleting procedure kit:", error);
      res.status(500).json({ message: "Erro ao desativar kit de procedimento" });
    }
  });

  // Add item to procedure kit
  app.post("/api/procedure-kits/:id/items", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const itemData = {
        ...req.body,
        kitId: req.params.id
      };
      const item = await storage.addProcedureKitItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding procedure kit item:", error);
      res.status(500).json({ message: "Erro ao adicionar item ao kit" });
    }
  });

  // Remove item from procedure kit
  app.delete("/api/procedure-kit-items/:id", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const deleted = await storage.removeProcedureKitItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Item não encontrado" });
      }
      res.json({ message: "Item removido com sucesso" });
    } catch (error) {
      console.error("Error removing procedure kit item:", error);
      res.status(500).json({ message: "Erro ao remover item do kit" });
    }
  });

  // Get single procedure request
  app.get("/api/procedure-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const request = await storage.getProcedureRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Solicitação não encontrada" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching procedure request:", error);
      res.status(500).json({ message: "Erro ao buscar solicitação" });
    }
  });

  // Get procedure request items
  app.get("/api/procedure-requests/:id/items", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getProcedureRequestItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching procedure request items:", error);
      res.status(500).json({ message: "Erro ao buscar itens da solicitação" });
    }
  });

  // Create procedure request (doctors) - supports both kit mode and custom mode with items
  app.post("/api/procedure-requests", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { 
        requestMode, 
        procedureKitId, 
        patientId, 
        patientName, 
        sourceType, 
        sourceId, 
        sourceName, 
        fulfillmentChannel,
        priority, 
        notes,
        items 
      } = req.body;
      
      if (!patientId || !patientName || !sourceType) {
        return res.status(400).json({ message: "Paciente, nome do paciente e origem são obrigatórios" });
      }

      const requestData = {
        requestMode: requestMode || 'custom',
        procedureKitId: procedureKitId || null,
        patientId,
        patientName,
        requestedBy: user.id,
        requestedByName: user.name,
        sourceType,
        sourceId: sourceId || null,
        sourceName: sourceName || null,
        fulfillmentChannel: fulfillmentChannel || 'pharmacy',
        priority: priority || 'normal',
        notes: notes || null
      };

      let request;
      let itemsToCreate = items || [];
      
      // For kit mode, fetch kit items and add them automatically
      if (requestMode === 'kit' && procedureKitId && (!items || items.length === 0)) {
        const kitItems = await storage.getPharmacyKitItems(procedureKitId);
        itemsToCreate = kitItems.map((ki: any) => ({
          itemType: 'material',
          materialId: ki.materialId,
          itemName: ki.material?.name || 'Material',
          quantity: parseInt(ki.quantity) || 1,
          unit: 'un'
        }));
      }
      
      if (itemsToCreate.length > 0) {
        request = await storage.createProcedureRequestWithItems(requestData, itemsToCreate);
      } else {
        request = await storage.createProcedureRequest(requestData);
      }
      
      const fullRequest = await storage.getProcedureRequest(request.id);
      res.status(201).json(fullRequest);
    } catch (error) {
      console.error("Error creating procedure request:", error);
      res.status(500).json({ message: "Erro ao criar solicitação de procedimento" });
    }
  });

  // Complete single procedure request item
  app.post("/api/procedure-request-items/:id/complete", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const { batchId, quantity } = req.body || {};
      const quantityToDispense = quantity ? parseInt(quantity) : undefined;
      const completed = await storage.completeProcedureRequestItem(req.params.id, user.id, user.name, batchId, quantityToDispense);
      if (!completed) {
        return res.status(404).json({ message: "Item não encontrado" });
      }
      res.json(completed);
    } catch (error) {
      console.error("Error completing procedure request item:", error);
      res.status(500).json({ message: "Erro ao completar item" });
    }
  });

  // Update procedure request
  app.patch("/api/procedure-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateProcedureRequest(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Solicitação não encontrada" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating procedure request:", error);
      res.status(500).json({ message: "Erro ao atualizar solicitação" });
    }
  });

  // Complete procedure request (pharmacy processes it)
  app.post("/api/procedure-requests/:id/complete", requireFarmaciaOrAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      const completed = await storage.completeProcedureRequest(req.params.id, user.id, user.name);
      if (!completed) {
        return res.status(404).json({ message: "Solicitação não encontrada" });
      }
      res.json(completed);
    } catch (error) {
      console.error("Error completing procedure request:", error);
      res.status(500).json({ message: "Erro ao completar solicitação" });
    }
  });

  // Cancel procedure request
  app.post("/api/procedure-requests/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const cancelled = await storage.cancelProcedureRequest(req.params.id);
      if (!cancelled) {
        return res.status(404).json({ message: "Solicitação não encontrada" });
      }
      res.json(cancelled);
    } catch (error) {
      console.error("Error cancelling procedure request:", error);
      res.status(500).json({ message: "Erro ao cancelar solicitação" });
    }
  });

  // Get patient's procedure requests
  app.get("/api/patients/:patientId/procedure-requests", isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getPatientProcedureRequests(req.params.patientId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching patient procedure requests:", error);
      res.status(500).json({ message: "Erro ao buscar procedimentos do paciente" });
    }
  });

  // ============================================================
  // BACKUP ROUTES - Admin only
  // ============================================================

  app.post("/api/admin/backup/run", requireAdmin, async (req, res) => {
    try {
      const result = await runBackup();
      res.json({ success: true, jsonFileName: result.jsonFileName, sqlFileName: result.sqlFileName });
    } catch (error: any) {
      console.error("Backup error:", error);
      res.status(500).json({ success: false, message: error.message || "Erro ao executar backup" });
    }
  });

  app.get("/api/admin/backup/history", requireAdmin, async (req, res) => {
    try {
      const history = await getBackupHistory();
      res.json(history);
    } catch (error: any) {
      console.error("Backup history error:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar histórico de backups" });
    }
  });

  app.get("/api/admin/backup/status", requireAdmin, async (req, res) => {
    try {
      const status = getBackupStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: "Erro ao buscar status do backup" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
