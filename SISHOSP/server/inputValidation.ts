import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Enhanced input sanitization middleware
export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    console.error('❌ Input sanitization error:', error);
    res.status(400).json({ 
      error: 'Invalid input format',
      message: 'Dados de entrada inválidos' 
    });
  }
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  
  // Remove HTML tags and potentially dangerous content
  let sanitized = DOMPurify.sanitize(str, { 
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [] 
  });
  
  // Nota: Não remover caracteres especiais como apóstrofos aqui pois quebra
  // nomes válidos (ex: D'Silva). Proteção SQL injection está nas queries parametrizadas do ORM.
  
  // Remove potential XSS patterns
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+=/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

// Brazilian CPF validation
export const cpfSchema = z.string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve estar no formato 000.000.000-00")
  .refine((cpf) => {
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return false;
    
    // Check for known invalid patterns
    const invalidCPFs = [
      '00000000000', '11111111111', '22222222222', '33333333333',
      '44444444444', '55555555555', '66666666666', '77777777777',
      '88888888888', '99999999999'
    ];
    
    if (invalidCPFs.includes(numbers)) return false;
    
    // Validate CPF algorithm
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbers.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbers.charAt(10))) return false;
    
    return true;
  }, "CPF inválido");

// WhatsApp phone number validation for Brazil
export const whatsappSchema = z.string()
  .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "WhatsApp deve estar no formato (87) 99999-9999")
  .refine((phone) => {
    const numbers = phone.replace(/\D/g, '');
    return numbers.length === 10 || numbers.length === 11; // Support both formats
  }, "Número de WhatsApp inválido");

// SUS card validation (Brazilian health card)
export const susCardSchema = z.string()
  .min(15, "Cartão SUS deve ter 15 dígitos")
  .max(15, "Cartão SUS deve ter 15 dígitos")
  .regex(/^\d{15}$/, "Cartão SUS deve conter apenas números");

// Enhanced password validation
export const passwordSchema = z.string()
  .min(8, "Senha deve ter pelo menos 8 caracteres")
  .max(128, "Senha não pode exceder 128 caracteres")
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    "Senha deve conter ao menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 símbolo");

// Name validation (prevent script injection)
export const nameSchema = z.string()
  .min(2, "Nome deve ter pelo menos 2 caracteres")
  .max(100, "Nome não pode exceder 100 caracteres")
  .regex(/^[A-Za-zÀ-ÿ\u00C0-\u017F\s\-'\.]+$/, "Nome contém caracteres inválidos");

// Email validation
export const emailSchema = z.string()
  .email("Email inválido")
  .max(254, "Email muito longo")
  .toLowerCase();

// Date validation (DD/MM/YYYY or YYYY-MM-DD)
export const dateSchema = z.string()
  .regex(/^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/, "Data deve estar no formato DD/MM/YYYY ou YYYY-MM-DD")
  .refine((date) => {
    const parsedDate = date.includes('/') 
      ? new Date(date.split('/').reverse().join('-'))
      : new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate < new Date();
  }, "Data inválida");

// Generic text content validation (prevent XSS)
export const textContentSchema = z.string()
  .max(5000, "Texto muito longo")
  .refine((text) => {
    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /<script/i, /javascript:/i, /on\w+=/i, /data:text\/html/i,
      /vbscript:/i, /livescript:/i, /expression\(/i, /@import/i
    ];
    return !dangerousPatterns.some(pattern => pattern.test(text));
  }, "Conteúdo de texto contém elementos não permitidos");

// Rate limiting validation - check for rapid successive requests
export function validateRequestFrequency(req: Request, res: Response, next: NextFunction) {
  const userId = (req.user as any)?.id;
  const clientId = userId || req.ip;
  const key = `${clientId}:${req.route?.path || req.path}`;
  
  // This is a simple in-memory store - in production, use Redis
  if (!global.requestTracker) {
    global.requestTracker = new Map();
  }
  
  const now = Date.now();
  const requestHistory = global.requestTracker.get(key) || [];
  
  // Remove requests older than 1 minute
  const recentRequests = requestHistory.filter((timestamp: number) => 
    now - timestamp < 60 * 1000
  );
  
  // Check if too many requests in the last minute
  if (recentRequests.length >= 30) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Muitas solicitações. Aguarde um momento.'
    });
  }
  
  // Add current request
  recentRequests.push(now);
  global.requestTracker.set(key, recentRequests);
  
  next();
}

// Content length validation middleware
export function validateContentLength(maxSize: number = 10 * 1024 * 1024) { // 10MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSize) {
      return res.status(413).json({
        error: 'Payload too large',
        message: 'Dados muito grandes para processamento'
      });
    }
    next();
  };
}

declare global {
  var requestTracker: Map<string, number[]>;
}