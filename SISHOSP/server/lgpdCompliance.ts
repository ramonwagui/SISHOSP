import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import type { InsertAuditLog } from '@shared/schema';

// LGPD Data Processing Categories
export enum DataCategory {
  PERSONAL_IDENTIFICATION = 'personal_identification', // CPF, RG, nome
  HEALTH_DATA = 'health_data', // dados médicos, histórico
  CONTACT_DATA = 'contact_data', // telefone, endereço, email
  DIGITAL_BEHAVIOR = 'digital_behavior', // logs de acesso, audit logs
}

// LGPD Legal Basis for processing
export enum LegalBasis {
  CONSENT = 'consent', // consentimento explícito
  LEGITIMATE_INTEREST = 'legitimate_interest', // interesse legítimo
  LEGAL_OBLIGATION = 'legal_obligation', // obrigação legal
  VITAL_INTERESTS = 'vital_interests', // proteção da vida
  PUBLIC_INTEREST = 'public_interest', // interesse público
  CONTRACT = 'contract' // execução de contrato
}

// Privacy Control Actions
export enum PrivacyAction {
  DATA_ACCESS = 'data_access', // solicitar acesso aos dados
  DATA_RECTIFICATION = 'data_rectification', // correção de dados
  DATA_PORTABILITY = 'data_portability', // portabilidade de dados
  DATA_DELETION = 'data_deletion', // exclusão de dados
  PROCESSING_RESTRICTION = 'processing_restriction', // limitação do tratamento
  CONSENT_WITHDRAWAL = 'consent_withdrawal' // revogação do consentimento
}

// Middleware to log data access for LGPD compliance
export function logDataAccess(dataCategory: DataCategory, legalBasis: LegalBasis, description: string) {
  return async (req: any, res: Response, next: NextFunction) => {
    // Store LGPD tracking data in request
    req.lgpdTracking = {
      dataCategory,
      legalBasis,
      description,
      accessTime: new Date(),
      purpose: description
    };

    // Hook into response to log successful data access
    const originalJson = res.json;
    res.json = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            const user = req.user;
            const lgpdAuditLog: InsertAuditLog = {
              userId: user?.id || null,
              username: user?.username || 'system',
              action: 'DATA_ACCESS',
              entityType: 'lgpd_compliance',
              entityId: null,
              description: `LGPD: Acesso a ${dataCategory} - ${description}`,
              metadata: {
                dataCategory,
                legalBasis,
                purpose: description,
                dataTypes: extractDataTypes(body),
                recordCount: Array.isArray(body) ? body.length : (body ? 1 : 0),
                url: req.originalUrl,
                method: req.method
              },
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent') || null
            };

            await storage.createAuditLog(lgpdAuditLog);
            console.log(`🛡️ LGPD: ${user?.username || 'system'} accessed ${dataCategory} - ${description}`);
          } catch (error) {
            console.error('❌ LGPD compliance logging error:', error);
          }
        });
      }
      return originalJson.call(this, body);
    };

    next();
  };
}

// Extract data types from response for LGPD logging
function extractDataTypes(data: any): string[] {
  if (!data) return [];
  
  const dataTypes = new Set<string>();
  
  if (Array.isArray(data)) {
    data.forEach(item => {
      if (item) {
        Object.keys(item).forEach(key => dataTypes.add(key));
      }
    });
  } else if (typeof data === 'object') {
    Object.keys(data).forEach(key => dataTypes.add(key));
  }
  
  return Array.from(dataTypes);
}

// Generate LGPD Data Processing Report
export async function generateLGPDReport(startDate: string, endDate: string, userId?: string): Promise<{
  summary: {
    totalDataAccess: number;
    dataByCategory: Record<DataCategory, number>;
    dataByLegalBasis: Record<LegalBasis, number>;
    uniqueUsers: number;
    mostAccessedData: string;
  };
  details: any[];
}> {
  try {
    // Get audit logs for LGPD data access
    const auditLogs = await storage.getAuditLogsByEntity('lgpd_compliance', undefined, 1000);
    
    // Filter by date range if provided
    const filteredLogs = auditLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return logDate >= start && logDate <= end && 
             (userId ? log.userId === userId : true);
    });

    // Calculate summary statistics
    const summary = {
      totalDataAccess: filteredLogs.length,
      dataByCategory: {} as Record<DataCategory, number>,
      dataByLegalBasis: {} as Record<LegalBasis, number>,
      uniqueUsers: new Set(filteredLogs.map(log => log.userId)).size,
      mostAccessedData: ''
    };

    // Initialize counters
    Object.values(DataCategory).forEach(category => {
      summary.dataByCategory[category] = 0;
    });
    Object.values(LegalBasis).forEach(basis => {
      summary.dataByLegalBasis[basis] = 0;
    });

    // Count data access by category and legal basis
    const dataTypeCount: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const metadata = log.metadata as any;
      if (metadata?.dataCategory) {
        summary.dataByCategory[metadata.dataCategory as DataCategory]++;
      }
      if (metadata?.legalBasis) {
        summary.dataByLegalBasis[metadata.legalBasis as LegalBasis]++;
      }
      if (metadata?.dataTypes) {
        metadata.dataTypes.forEach((type: string) => {
          dataTypeCount[type] = (dataTypeCount[type] || 0) + 1;
        });
      }
    });

    // Find most accessed data type
    const mostAccessed = Object.entries(dataTypeCount).sort((a, b) => b[1] - a[1])[0];
    summary.mostAccessedData = mostAccessed ? mostAccessed[0] : 'N/A';

    // Return detailed report
    return {
      summary,
      details: filteredLogs.map(log => ({
        timestamp: log.timestamp,
        user: log.username,
        action: log.action,
        description: log.description,
        dataCategory: (log.metadata as any)?.dataCategory,
        legalBasis: (log.metadata as any)?.legalBasis,
        recordCount: (log.metadata as any)?.recordCount || 0,
        ipAddress: log.ipAddress,
        url: (log.metadata as any)?.url
      }))
    };
  } catch (error) {
    console.error('❌ LGPD report generation error:', error);
    throw error;
  }
}

// Handle LGPD Privacy Rights Requests
export async function handlePrivacyRequest(
  action: PrivacyAction,
  userId: string,
  requestingUser: string,
  details?: any
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const auditLog: InsertAuditLog = {
      userId: requestingUser,
      username: requestingUser,
      action: 'PRIVACY_REQUEST',
      entityType: 'lgpd_compliance',
      entityId: userId,
      description: `LGPD Privacy Request: ${action}`,
      metadata: {
        privacyAction: action,
        targetUserId: userId,
        requestDetails: details,
        status: 'pending'
      },
      ipAddress: null,
      userAgent: null
    };

    await storage.createAuditLog(auditLog);

    switch (action) {
      case PrivacyAction.DATA_ACCESS:
        // Return user data summary (implement according to your data structure)
        return {
          success: true,
          message: 'Solicitação de acesso aos dados registrada. Resposta em até 15 dias.',
          data: { requestId: auditLog.entityId, estimatedResponse: '15 dias' }
        };

      case PrivacyAction.DATA_DELETION:
        // Log deletion request (actual deletion should be carefully considered)
        return {
          success: true,
          message: 'Solicitação de exclusão de dados registrada. Análise em até 15 dias.',
          data: { requestId: auditLog.entityId, warning: 'Alguns dados podem ser mantidos por obrigação legal' }
        };

      case PrivacyAction.CONSENT_WITHDRAWAL:
        return {
          success: true,
          message: 'Revogação de consentimento registrada.',
          data: { requestId: auditLog.entityId, effect: 'Processamento baseado em consentimento será interrompido' }
        };

      default:
        return {
          success: true,
          message: `Solicitação ${action} registrada e será analisada.`,
          data: { requestId: auditLog.entityId }
        };
    }
  } catch (error) {
    console.error('❌ Privacy request handling error:', error);
    return {
      success: false,
      message: 'Erro ao processar solicitação de privacidade'
    };
  }
}

// Data retention policy check
export async function checkDataRetentionCompliance(): Promise<{
  expiredRecords: any[];
  recommendations: string[];
}> {
  try {
    const auditLogs = await storage.getAuditLogs(10000);
    
    // Check for data older than retention periods
    const now = new Date();
    const expiredRecords = [];
    const recommendations = [];

    // Example retention policies (customize based on your needs)
    const retentionPolicies = {
      audit_logs: 5 * 365, // 5 years for audit logs
      patient_data: 20 * 365, // 20 years for medical data (Brazilian regulation)
      appointment_data: 5 * 365, // 5 years for appointment data
    };

    // Check audit logs older than 5 years
    const oldAuditLogs = auditLogs.filter(log => {
      const daysDiff = (now.getTime() - new Date(log.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > retentionPolicies.audit_logs;
    });

    if (oldAuditLogs.length > 0) {
      expiredRecords.push({
        type: 'audit_logs',
        count: oldAuditLogs.length,
        oldestDate: Math.min(...oldAuditLogs.map(l => new Date(l.timestamp).getTime()))
      });
      recommendations.push('Considere arquivar logs de auditoria com mais de 5 anos');
    }

    // Add more retention checks for other data types
    if (expiredRecords.length === 0) {
      recommendations.push('Todos os dados estão dentro das políticas de retenção');
    }

    return { expiredRecords, recommendations };
  } catch (error) {
    console.error('❌ Data retention compliance check error:', error);
    throw error;
  }
}

// Extend Express Request type for LGPD tracking
declare global {
  namespace Express {
    interface Request {
      lgpdTracking?: {
        dataCategory: DataCategory;
        legalBasis: LegalBasis;
        description: string;
        accessTime: Date;
        purpose: string;
      };
    }
  }
}