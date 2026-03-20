import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { SecurityMonitor } from "./securityMonitoring";
import { logAuthEvent } from "./auditMiddleware";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // SECURITY: Dual password verification for legacy compatibility
  try {
    // First try bcrypt (modern hashes)
    const bcryptResult = await bcrypt.compare(supplied, stored);
    if (bcryptResult) {
      return { isValid: true, needsRehash: false };
    }
    
    // If bcrypt fails, try legacy scrypt format (hash.salt)
    if (stored.includes('.')) {
      const [hash, salt] = stored.split('.');
      const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      const computedHash = buf.toString('hex');
      
      if (timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'))) {
        return { isValid: true, needsRehash: true };
      }
    }
    
    return { isValid: false, needsRehash: false };
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return { isValid: false, needsRehash: false };
  }
}

// RBAC: Role-based authorization middleware  
export function requireRole(allowedRoles: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = req.user as SelectUser;
    const userRole = user.role || 'viewer'; // Default to viewer (least privilege) for users without role
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Access denied. Required role: ' + allowedRoles.join(' or '),
        userRole: userRole 
      });
    }

    next();
  };
}

// Convenience middleware for common role checks
export const requireAdmin = requireRole(['admin']);
export const requireAdminOrStaff = requireRole(['admin', 'staff']);
export const requireAnyRole = requireRole(['admin', 'staff', 'viewer', 'doctor', 'triage', 'farmacia', 'laboratorio', 'diretor', 'radiologista']);

// Doctor-specific middleware
export const requireDoctor = requireRole(['doctor']);
export const requireDoctorOrAdmin = requireRole(['doctor', 'admin', 'diretor']);
export const requireDoctorOrStaff = requireRole(['doctor', 'admin', 'staff', 'triage', 'diretor']);
export const requireAllRoles = requireRole(['admin', 'staff', 'viewer', 'doctor', 'triage', 'farmacia', 'laboratorio', 'diretor', 'radiologista']);

// Director can manage users
export const requireUserManagement = requireRole(['admin', 'diretor']);

// Hospitalization middleware - includes nurses (triage/enfermeiro)
export const requireHospitalizationAccess = requireRole(['doctor', 'admin', 'triage']);

// Pharmacy-specific middleware
export const requireFarmacia = requireRole(['farmacia']);
export const requireFarmaciaOrAdmin = requireRole(['farmacia', 'admin', 'staff']);

// Laboratory-specific middleware
export const requireLaboratorio = requireRole(['laboratorio']);
export const requireLaboratorioOrAdmin = requireRole(['laboratorio', 'admin']);

// Radiology-specific middleware
export const requireRadiologista = requireRole(['radiologista']);
export const requireRadiologistaOrAdmin = requireRole(['radiologista', 'admin']);

// Painel de Chamadas - specific user check
// SECURITY: Uses immutable user ID instead of username to prevent bypass via profile updates
const PAINEL_USER_ID = 'c6f3a02b-6499-4ffb-a905-f6506128ab90'; // ID do usuário painel.saude

export function requirePainelUser(req: any, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = req.user as SelectUser;
  
  if (user.id !== PAINEL_USER_ID) {
    return res.status(403).json({ 
      error: 'Access denied. This area is restricted to the display panel.',
      userId: user.id 
    });
  }

  next();
}

export function setupAuth(app: Express) {
  const PostgresSessionStore = connectPg(session);
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  const sessionSettings: session.SessionOptions = {
    name: 'exusaude_session',
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: 'sessions',
    }),
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      passReqToCallback: true
    }, async (req: any, username, password, done) => {
      try {
        console.log(`🔍 Login attempt for username: ${username}`);
        
        const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
        
        // PRE-AUTH SECURITY CHECKS - Block before any credential verification
        const isIPBlocked = await SecurityMonitor.isIPBlocked(ipAddress);
        const isUserLocked = username ? await SecurityMonitor.isUserLocked(username) : false;
        
        if (isIPBlocked) {
          console.log(`🚫 Blocked IP attempting login: ${ipAddress}`);
          await logAuthEvent('ACCESS_DENIED', req, undefined, username, 'IP address blocked');
          return done(null, false);
        }
        
        if (isUserLocked) {
          console.log(`🔒 Locked user attempting login: ${username}`);
          await logAuthEvent('ACCESS_DENIED', req, undefined, username, 'User account locked');
          return done(null, false);
        }
        
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`❌ User not found: ${username}`);
          // Track failed login attempt - user not found
          await SecurityMonitor.trackLoginAttempt(req, username, false, { reason: 'USER_NOT_FOUND' });
          await logAuthEvent('ACCESS_DENIED', req, undefined, username, 'User not found');
          return done(null, false);
        }
        
        console.log(`✅ User found: ${username}, checking password...`);
        const passwordCheck = await comparePasswords(password, user.password);
        
        if (!passwordCheck.isValid) {
          console.log(`❌ Invalid password for user: ${username}`);
          
          // Track failed login attempt - invalid password
          await SecurityMonitor.trackLoginAttempt(req, username, false, { 
            reason: 'INVALID_PASSWORD',
            userId: user.id 
          });
          await logAuthEvent('ACCESS_DENIED', req, user.id, username, 'Invalid password');
          return done(null, false);
        }
        
        console.log(`✅ Login successful for user: ${username}`);
        
        // Track successful login
        await SecurityMonitor.trackLoginAttempt(req, username, true, { 
          userId: user.id,
          userRole: user.role 
        });
        await logAuthEvent('LOGIN', req, user.id, username, 'Successful login');
        
        // SECURITY: Rehash legacy passwords to bcrypt on successful login
        if (passwordCheck.needsRehash) {
          try {
            const newHash = await bcrypt.hash(password, 12);
            // Update user password in storage (if supported)
            if ('updateUser' in storage && typeof storage.updateUser === 'function') {
              await (storage as any).updateUser(user.id, { password: newHash });
            }
            console.log('✅ Legacy password rehashed to bcrypt for user:', username);
          } catch (rehashError) {
            console.error('Failed to rehash legacy password:', rehashError);
            // Continue login even if rehash fails
          }
        }
        
        return done(null, user);
      } catch (error) {
        console.error('❌ Login error:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        console.log('❌ User not found during deserialization:', id);
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error('❌ Error deserializing user:', error);
      done(error);
    }
  });

  // Registration disabled - admin only system

  // Apply rate limiting to login route
  app.post("/api/login", 
    SecurityMonitor.rateLimitMiddleware(),
    (req, res, next) => {
      passport.authenticate("local", (err: any, user: any) => {
        if (err || !user) {
          return res.status(401).json({ message: "Credenciais inválidas" });
        }
        
        // SECURITY: Regenerate session ID to prevent session fixation attacks
        // and ensure each login creates an independent session
        req.session.regenerate((regenerateErr) => {
          if (regenerateErr) {
            console.error('❌ Session regenerate error:', regenerateErr);
            return next(regenerateErr);
          }
          
          req.login(user, (err) => {
            if (err) {
              console.error('❌ req.login error:', err);
              return next(err);
            }
            
            // Salvar a sessão explicitamente após o login
            req.session.save((err) => {
              if (err) {
                console.error('❌ Session save error:', err);
                return next(err);
              }
              
              console.log(`🔐 New session created for user: ${user.username}, sessionID: ${req.sessionID}`);
              
              // Responder apenas após a sessão estar salva
              res.status(200).json({
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                crm: user.crm,
                medicalSpecialty: user.medicalSpecialty,
                profilePhotoUrl: user.profilePhotoUrl,
                mustChangePassword: user.mustChangePassword,
              });
            });
          });
        });
      })(req, res, next);
    }
  );

  app.post("/api/logout", async (req, res, next) => {
    try {
      const user = req.user;
      
      // Log logout event
      if (user) {
        await logAuthEvent('LOGOUT', req, user.id, user.username, 'User logout');
      }
      
      req.logout((err) => {
        if (err) return next(err);
        // Destruir a sessão completamente
        req.session.destroy((err) => {
          if (err) return next(err);
          res.clearCookie('connect.sid');
          res.status(200).json({ success: true, redirect: '/auth' });
        });
      });
    } catch (error) {
      console.error('❌ Logout error:', error);
      next(error);
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role, // Incluir role para controle de acesso no frontend
      crm: user.crm,
      medicalSpecialty: user.medicalSpecialty,
      profilePhotoUrl: user.profilePhotoUrl,
      signature: user.signature, // Incluir assinatura digital para uso em documentos
      mustChangePassword: user.mustChangePassword, // Flag para forçar troca de senha no primeiro login
    });
  });

  // Endpoint para troca obrigatória de senha no primeiro login
  app.post("/api/auth/force-change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const user = req.user!;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres" });
    }
    
    try {
      // Buscar usuário com senha do banco
      const dbUser = await storage.getUser(user.id);
      if (!dbUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Verificar senha atual
      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare(currentPassword, dbUser.password);
      if (!isValid) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      // Verificar se a nova senha é diferente da atual
      const isSamePassword = await bcrypt.compare(newPassword, dbUser.password);
      if (isSamePassword) {
        return res.status(400).json({ message: "A nova senha deve ser diferente da senha atual" });
      }
      
      // Atualizar senha e desmarcar flag
      // Nota: não hashear aqui - updateUser já faz o hash automaticamente
      await storage.updateUser(user.id, { 
        password: newPassword,
        mustChangePassword: false 
      });
      
      // Atualizar sessão
      req.user!.mustChangePassword = false;
      
      res.json({ success: true, message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ message: "Erro ao alterar senha" });
    }
  });
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Não autorizado" });
}