import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { InsertAuditLog } from "@shared/schema";

// Extend Express Request to include audit data
declare global {
  namespace Express {
    interface Request {
      auditData?: {
        action: string;
        entityType: string;
        entityId?: string;
        description: string;
        metadata?: any;
      };
    }
  }
}

export function auditLogger(action: string, entityType: string, description: string) {
  return (req: any, res: Response, next: NextFunction) => {
    // Store audit data in request for later logging
    req.auditData = {
      action,
      entityType,
      description,
      metadata: {}
    };
    next();
  };
}

export function logAuditAfterResponse(req: any, res: Response, next: NextFunction) {
  // Hook into response end to log after successful operations
  const originalJson = res.json;
  
  res.json = function(body: any) {
    // Only log if request was successful and audit data exists
    if (req.auditData && res.statusCode >= 200 && res.statusCode < 400) {
      setImmediate(async () => {
        try {
          const user = req.user;
          const auditLog: InsertAuditLog = {
            userId: user?.id || null,
            username: user?.username || 'anonymous',
            action: req.auditData.action,
            entityType: req.auditData.entityType,
            entityId: req.auditData.entityId || null,
            description: req.auditData.description,
            metadata: {
              ...req.auditData.metadata,
              requestBody: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
              responseStatus: res.statusCode,
              url: req.originalUrl,
              method: req.method
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent') || null
          };
          
          await storage.createAuditLog(auditLog);
          console.log(`🔍 Audit: ${auditLog.username} ${auditLog.action} ${auditLog.entityType} - ${auditLog.description}`);
        } catch (error) {
          console.error('❌ Failed to create audit log:', error);
        }
      });
    }
    
    return originalJson.call(this, body);
  };
  
  next();
}

// Middleware for authentication events
export async function logAuthEvent(
  action: 'LOGIN' | 'LOGOUT' | 'ACCESS_DENIED',
  req: any,
  userId?: string,
  username?: string,
  details?: string
) {
  try {
    const auditLog: InsertAuditLog = {
      userId: userId || null,
      username: username || 'anonymous',
      action,
      entityType: 'auth',
      entityId: userId || null,
      description: details || `User ${action.toLowerCase()}`,
      metadata: {
        url: req.originalUrl,
        method: req.method,
        userRole: req.user?.role
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || null
    };
    
    await storage.createAuditLog(auditLog);
    console.log(`🔐 Auth Audit: ${username || 'anonymous'} ${action} - ${details || action}`);
  } catch (error) {
    console.error('❌ Failed to log auth event:', error);
  }
}

// Middleware for capturing entity ID from response
export function captureEntityId(entityIdPath: string) {
  return (req: any, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    
    res.json = function(body: any) {
      if (req.auditData && body) {
        // Extract entity ID from response body using the provided path
        const pathParts = entityIdPath.split('.');
        let entityId = body;
        for (const part of pathParts) {
          entityId = entityId?.[part];
        }
        req.auditData.entityId = entityId;
      }
      return originalJson.call(this, body);
    };
    
    next();
  };
}