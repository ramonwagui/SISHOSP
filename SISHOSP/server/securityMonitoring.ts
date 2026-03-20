import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { InsertSecurityEvent, InsertLoginAttempt } from "@shared/schema";
import nodemailer from "nodemailer";

// Security monitoring middleware for detecting suspicious activities
export class SecurityMonitor {
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly RATE_LIMIT_WINDOW = 15; // minutes
  private static readonly ADMIN_HOURS_START = 7; // 7 AM
  private static readonly ADMIN_HOURS_END = 18; // 6 PM
  private static readonly LOCKOUT_DURATION = 30; // minutes
  private static readonly ALERT_THROTTLE_WINDOW = 10; // minutes

  // Track blocked IPs and users
  private static blockedIPs = new Map<string, Date>();
  private static lockedUsers = new Map<string, Date>();
  private static lastAlerts = new Map<string, Date>();

  // Check if IP is currently blocked - uses persistent storage (FAIL-CLOSED)
  static async isIPBlocked(ipAddress: string): Promise<boolean> {
    try {
      return await storage.isIPBlocked(ipAddress);
    } catch (error) {
      console.error('🚨 CRITICAL: Error checking IP block status, denying access for safety:', error);
      // FAIL-CLOSED: If we can't check security status, deny access
      await this.logSecurityEvent('SECURITY_CHECK_FAILURE', 'CRITICAL', { ip: ipAddress } as any, null, `Failed to check IP block status: ${error.message}`);
      return true; // DENY ACCESS when security systems fail
    }
  }

  // Check if user is currently locked - uses persistent storage (FAIL-CLOSED)
  static async isUserLocked(username: string): Promise<boolean> {
    try {
      return await storage.isUserLocked(username);
    } catch (error) {
      console.error('🚨 CRITICAL: Error checking user lock status, denying access for safety:', error);
      // FAIL-CLOSED: If we can't check security status, deny access
      await this.logSecurityEvent('SECURITY_CHECK_FAILURE', 'CRITICAL', { ip: 'unknown' } as any, username, `Failed to check user lock status: ${error.message}`);
      return true; // DENY ACCESS when security systems fail
    }
  }

  // Block IP address - creates persistent lockout
  static async blockIP(ipAddress: string, reason?: string): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + this.LOCKOUT_DURATION * 60 * 1000);
      await storage.createSecurityLockout({
        type: 'IP',
        identifier: ipAddress,
        lockedAt: new Date(),
        expiresAt,
        reason: reason || 'Automatic IP block due to suspicious activity',
        active: true
      });
      console.log(`🚫 IP blocked for ${this.LOCKOUT_DURATION} minutes: ${ipAddress}`);
    } catch (error) {
      console.error('❌ Error blocking IP:', error);
    }
  }

  // Lock user account - creates persistent lockout
  static async lockUser(username: string, reason?: string): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + this.LOCKOUT_DURATION * 60 * 1000);
      await storage.createSecurityLockout({
        type: 'USER',
        identifier: username,
        lockedAt: new Date(),
        expiresAt,
        reason: reason || 'Automatic user lock due to failed login attempts',
        active: true
      });
      console.log(`🔒 User locked for ${this.LOCKOUT_DURATION} minutes: ${username}`);
    } catch (error) {
      console.error('❌ Error locking user:', error);
    }
  }

  // Cleanup expired lockouts periodically
  static async cleanupExpiredLockouts(): Promise<void> {
    try {
      await storage.cleanupExpiredLockouts();
      console.log('🧹 Cleaned up expired security lockouts');
    } catch (error) {
      console.error('❌ Error cleaning up expired lockouts:', error);
    }
  }

  private static initialized = false;

  // Initialize security monitoring with periodic cleanup (singleton)
  static initialize(): void {
    if (this.initialized) {
      console.log('🔐 Security monitoring already initialized, skipping...');
      return;
    }

    try {
      // Run cleanup every 10 minutes
      setInterval(async () => {
        await this.cleanupExpiredLockouts();
      }, 10 * 60 * 1000);
      
      // Run initial cleanup (async, but don't wait)
      this.cleanupExpiredLockouts().catch(console.error);
      
      this.initialized = true;
      console.log('🔐 Security monitoring initialized with periodic cleanup');
    } catch (error) {
      console.error('❌ Failed to initialize security monitoring:', error);
    }
  }

  // Check if alert should be throttled
  static shouldThrottleAlert(eventType: string, identifier: string): boolean {
    const alertKey = `${eventType}:${identifier}`;
    const lastAlert = this.lastAlerts.get(alertKey);
    
    if (!lastAlert) {
      this.lastAlerts.set(alertKey, new Date());
      return false;
    }
    
    const throttleExpiry = new Date(lastAlert.getTime() + this.ALERT_THROTTLE_WINDOW * 60 * 1000);
    if (new Date() > throttleExpiry) {
      this.lastAlerts.set(alertKey, new Date());
      return false;
    }
    
    return true;
  }

  // Track login attempts and detect patterns
  static async trackLoginAttempt(
    req: Request, 
    username: string, 
    success: boolean,
    additionalMetadata: any = {}
  ): Promise<void> {
    try {
      const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || null;

      // Record login attempt
      await storage.createLoginAttempt({
        username: username || null,
        ipAddress,
        userAgent,
        success
      });

      if (!success) {
        await this.handleFailedLogin(req, username, ipAddress, userAgent, additionalMetadata);
      } else {
        await this.handleSuccessfulLogin(req, username, ipAddress, userAgent, additionalMetadata);
      }
    } catch (error) {
      console.error('❌ Error tracking login attempt:', error);
    }
  }

  // Handle failed login attempts and detect brute force attacks
  private static async handleFailedLogin(
    req: Request,
    username: string,
    ipAddress: string,
    userAgent: string | null,
    metadata: any
  ): Promise<void> {
    // Count recent failed attempts from this IP
    const failedAttempts = await storage.getFailedLoginAttemptsInWindow(ipAddress, this.RATE_LIMIT_WINDOW);
    
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let eventType = 'FAILED_LOGIN';
    let description = `Tentativa de login falhada para usuário: ${username}`;

    // Escalate severity based on failed attempt count
    if (failedAttempts >= this.MAX_FAILED_ATTEMPTS * 2) {
      severity = 'CRITICAL';
      eventType = 'BRUTE_FORCE_ATTACK';
      description = `ATAQUE DE FORÇA BRUTA DETECTADO: ${failedAttempts} tentativas falhas do IP ${ipAddress}`;
    } else if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      severity = 'HIGH';
      eventType = 'MULTIPLE_FAILED_ATTEMPTS';
      description = `Múltiplas tentativas de login falhadas: ${failedAttempts} tentativas do IP ${ipAddress}`;
    } else if (failedAttempts >= 3) {
      severity = 'MEDIUM';
      description = `${failedAttempts} tentativas de login falhadas consecutivas do IP ${ipAddress}`;
    }

    // Apply active protections for high-risk scenarios
    if (failedAttempts >= this.MAX_FAILED_ATTEMPTS * 2) {
      // Block IP for brute force attacks
      await this.blockIP(ipAddress, `Brute force attack detected: ${failedAttempts} failed attempts`);
      // Lock user account
      if (username) {
        await this.lockUser(username, `Multiple failed login attempts: ${failedAttempts}`);
      }
    } else if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      // Lock user account for multiple attempts
      if (username) {
        await this.lockUser(username, `Failed login attempts threshold reached: ${failedAttempts}`);
      }
    }

    // Create security event
    const securityEvent: InsertSecurityEvent = {
      eventType,
      severity,
      username,
      ipAddress,
      userAgent,
      description,
      metadata: {
        ...metadata,
        failedAttempts,
        timeWindow: this.RATE_LIMIT_WINDOW,
        url: req.originalUrl,
        method: req.method,
        ipBlocked: await this.isIPBlocked(ipAddress),
        userLocked: username ? await this.isUserLocked(username) : false
      },
      alertSent: false,
      resolved: false
    };

    const event = await storage.createSecurityEvent(securityEvent);

    // Send immediate alerts for high-severity events (with throttling)
    if ((severity === 'HIGH' || severity === 'CRITICAL') && 
        !this.shouldThrottleAlert(eventType, ipAddress)) {
      await this.sendSecurityAlert(event, req);
    }

    console.log(`🚨 Security Event [${severity}]: ${description}`);
  }

  // Handle successful logins and detect anomalies
  private static async handleSuccessfulLogin(
    req: Request,
    username: string,
    ipAddress: string,
    userAgent: string | null,
    metadata: any
  ): Promise<void> {
    const now = new Date();
    const hour = now.getHours();
    
    // Check for after-hours admin access
    const isAfterHours = hour < this.ADMIN_HOURS_START || hour > this.ADMIN_HOURS_END;
    const isWeekend = now.getDay() === 0 || now.getDay() === 6; // Sunday = 0, Saturday = 6
    
    if (isAfterHours || isWeekend) {
      const securityEvent: InsertSecurityEvent = {
        eventType: 'ADMIN_ACCESS_AFTER_HOURS',
        severity: 'MEDIUM',
        username,
        ipAddress,
        userAgent,
        description: `Acesso administrativo fora do horário comercial: ${username} às ${now.toLocaleString('pt-BR')}`,
        metadata: {
          ...metadata,
          loginTime: now.toISOString(),
          isAfterHours,
          isWeekend,
          hour,
          url: req.originalUrl
        },
        alertSent: false,
        resolved: false
      };

      await storage.createSecurityEvent(securityEvent);
      console.log(`⚠️ After-hours access: ${username} logged in at ${now.toLocaleString('pt-BR')}`);
    }

    // Check for potential account takeover (unusual IP for this user)
    const recentAttempts = await storage.getLoginAttemptsByUsername(username, 60 * 24); // Last 24 hours
    const knownIPs = new Set(recentAttempts.map(attempt => attempt.ipAddress));
    
    if (knownIPs.size > 1 && !knownIPs.has(ipAddress)) {
      const securityEvent: InsertSecurityEvent = {
        eventType: 'SUSPICIOUS_ACCESS',
        severity: 'MEDIUM',
        username,
        ipAddress,
        userAgent,
        description: `Acesso de IP não usual para ${username}: ${ipAddress}`,
        metadata: {
          ...metadata,
          knownIPs: Array.from(knownIPs),
          newIP: ipAddress,
          url: req.originalUrl
        },
        alertSent: false,
        resolved: false
      };

      await storage.createSecurityEvent(securityEvent);
      console.log(`🔍 Suspicious access: ${username} from new IP ${ipAddress}`);
    }
  }

  // Rate limiting middleware - DESABILITADO conforme solicitação do usuário
  static rateLimitMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Bloqueio por tentativas de login desabilitado
      next();
    };
  }

  // Send security alert emails
  private static async sendSecurityAlert(event: any, req?: Request): Promise<void> {
    try {
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('⚠️ Gmail credentials not configured - security alert not sent');
        return;
      }

      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });

      const alertEmail = {
        from: process.env.GMAIL_USER,
        to: 'ramonwagui@gmail.com', // Admin email
        subject: `🚨 Alerta de Segurança - ${event.severity} - Exu Saúde - Sistema de Atendimento Médico`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #dc2626; margin-bottom: 20px;">
              🚨 Alerta de Segurança - Sistema de Atendimento Médico
            </h2>
            
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="color: #dc2626; margin: 0 0 10px 0;">Evento de Segurança Detectado</h3>
              <p style="margin: 0;"><strong>Tipo:</strong> ${event.eventType}</p>
              <p style="margin: 0;"><strong>Severidade:</strong> ${event.severity}</p>
              <p style="margin: 0;"><strong>Data/Hora:</strong> ${new Date(event.createdAt).toLocaleString('pt-BR')}</p>
            </div>

            <div style="margin-bottom: 20px;">
              <h4>Detalhes do Evento:</h4>
              <p><strong>Descrição:</strong> ${event.description}</p>
              ${event.username ? `<p><strong>Usuário:</strong> ${event.username}</p>` : ''}
              ${event.ipAddress ? `<p><strong>IP:</strong> ${event.ipAddress}</p>` : ''}
              ${event.userAgent ? `<p><strong>User Agent:</strong> ${event.userAgent}</p>` : ''}
            </div>

            ${event.metadata ? `
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <h4>Informações Adicionais:</h4>
                <pre style="white-space: pre-wrap; font-size: 12px;">${JSON.stringify(event.metadata, null, 2)}</pre>
              </div>
            ` : ''}

            <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px;">
              <h4 style="color: #1d4ed8; margin: 0 0 10px 0;">Ações Recomendadas:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                ${event.severity === 'CRITICAL' ? `
                  <li>Investigar imediatamente a atividade suspeita</li>
                  <li>Considerar bloquear temporariamente o IP: ${event.ipAddress}</li>
                  <li>Verificar logs de auditoria para atividades relacionadas</li>
                ` : ''}
                ${event.severity === 'HIGH' ? `
                  <li>Monitorar a atividade do IP: ${event.ipAddress}</li>
                  <li>Verificar se há padrões de tentativas de acesso</li>
                ` : ''}
                <li>Acessar o dashboard de segurança para mais detalhes</li>
                <li>Marcar o evento como resolvido após investigação</li>
              </ul>
            </div>

            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
              <p>Este é um alerta automático do sistema de monitoramento de segurança.</p>
              <p>Exu Saúde - Sistema de Atendimento Médico - Sistema de Atendimento Médico</p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(alertEmail);
      await storage.markSecurityEventAlertSent(event.id);
      
      console.log(`📧 Security alert sent for event: ${event.eventType} (${event.severity})`);
    } catch (error) {
      console.error('❌ Failed to send security alert:', error);
    }
  }

  // Clean up old data
  static async performMaintenance(): Promise<void> {
    try {
      await storage.cleanupOldLoginAttempts(30); // Keep 30 days
      console.log('✅ Security monitoring maintenance completed');
    } catch (error) {
      console.error('❌ Security monitoring maintenance failed:', error);
    }
  }

  // Get security summary for dashboard
  static async getSecuritySummary(): Promise<{
    totalEvents: number;
    unresolvedEvents: number;
    criticalEvents: number;
    recentFailedLogins: number;
    topThreats: any[];
  }> {
    try {
      const [allEvents, unresolvedEvents] = await Promise.all([
        storage.getSecurityEvents(1000),
        storage.getUnresolvedSecurityEvents()
      ]);

      const criticalEvents = allEvents.filter(event => event.severity === 'CRITICAL').length;
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentFailedLogins = allEvents.filter(event => 
        event.eventType === 'FAILED_LOGIN' && 
        new Date(event.createdAt) >= last24Hours
      ).length;

      // Group by IP for top threats
      const threatsByIP = new Map();
      allEvents.forEach(event => {
        if (event.ipAddress) {
          const existing = threatsByIP.get(event.ipAddress) || { count: 0, severity: 'LOW', events: [] };
          existing.count++;
          existing.events.push(event);
          if (event.severity === 'CRITICAL') existing.severity = 'CRITICAL';
          else if (event.severity === 'HIGH' && existing.severity !== 'CRITICAL') existing.severity = 'HIGH';
          else if (event.severity === 'MEDIUM' && existing.severity === 'LOW') existing.severity = 'MEDIUM';
          threatsByIP.set(event.ipAddress, existing);
        }
      });

      const topThreats = Array.from(threatsByIP.entries())
        .map(([ip, data]) => ({ ip, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalEvents: allEvents.length,
        unresolvedEvents: unresolvedEvents.length,
        criticalEvents,
        recentFailedLogins,
        topThreats
      };
    } catch (error) {
      console.error('❌ Failed to get security summary:', error);
      return {
        totalEvents: 0,
        unresolvedEvents: 0,
        criticalEvents: 0,
        recentFailedLogins: 0,
        topThreats: []
      };
    }
  }
}

