import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { cronService } from "./cronService";
import { schedulerService } from "./scheduler-service";
import { SecurityMonitor } from "./securityMonitoring";
import { scheduleDailyBackup } from "./backupService";

const app = express();

// SECURITY: Trust proxy for correct IP detection behind load balancers/reverse proxies
// MUST be set before any middleware that uses req.ip (rate limiting, security checks)
app.set('trust proxy', 1);

// SECURITY: Initialize security monitoring system (singleton)
SecurityMonitor.initialize();

// SECURITY: Configure Helmet for security headers with environment-aware CSP
const isProduction = process.env.NODE_ENV === 'production';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", ...(isProduction ? [] : ["'unsafe-inline'"]), "https:", "data:"],
      scriptSrc: ["'self'", ...(isProduction ? [] : ["'unsafe-inline'", "'unsafe-eval'"])], // Unsafe only in dev for Vite
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...(isProduction ? [] : ["ws:", "wss:"])], // WebSocket only in dev for Vite HMR
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'self'"], // Allow PDF objects
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"], // Allow same-origin frames for PDF viewer
      frameAncestors: ["'self'"] // Allow embedding in same-origin iframes
    },
  },
  crossOriginEmbedderPolicy: false, // Required for certain integrations
  frameguard: { action: 'sameorigin' }, // Allow same-origin iframes
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// SECURITY: Rate limiting for all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    error: "Muitas solicitações desta IP. Tente novamente em 15 minutos.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// SECURITY: Stricter rate limiting for authentication and webhooks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit auth attempts
  message: {
    error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Allow more webhook requests
  message: {
    error: "Rate limit exceeded for webhooks",
    retryAfter: "1 minute"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// SECURITY: Rate limiting for public survey endpoints (prevent brute-force token enumeration)
const publicSurveyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Allow 20 survey requests per 15 minutes per IP
  message: {
    error: "Muitas tentativas de acesso à pesquisa. Por favor, tente novamente mais tarde."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests, only failed attempts
});

// SECURITY: Apply rate limiting to all routes
if (process.env.NODE_ENV === 'production') {
  app.use(generalLimiter);
}

// SECURITY: Stricter rate limiting for authentication routes
if (process.env.NODE_ENV === 'production') {
  app.use("/api/auth", authLimiter);
}

// SECURITY: Rate limiting for WhatsApp webhook routes
app.use("/api/whatsapp", webhookLimiter);

// SECURITY: Additional production headers
app.use((req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent clickjacking - allow same origin for PDF viewer
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Prevent referrer information leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Feature Policy for enhanced security
  res.setHeader('Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), accelerometer=(), gyroscope=()');

  // Cache control for sensitive pages
  if (req.path.startsWith('/api/') || req.path.includes('admin')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
});

// DIAGNOSTIC: Log all webhook requests BEFORE any processing
app.use("/api/whatsapp/webhook", (req: Request, res: Response, next: NextFunction) => {
  console.log('🌐 INCOMING REQUEST to /api/whatsapp/webhook');
  console.log('   Method:', req.method);
  console.log('   Headers:', Object.keys(req.headers).join(', '));
  console.log('   IP:', req.ip);
  next();
});

// SECURITY: WhatsApp webhook needs raw body for signature verification
// Must be BEFORE express.json() to preserve original body
app.use("/api/whatsapp/webhook", express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Skip logging for frequent health checks to reduce noise
      const isHealthCheck = (path === "/api" || path === "/api/health") && req.method === "HEAD";
      const isSlowHealthCheck = isHealthCheck && duration > 10;

      // Only log health checks if they're slow (potential issues)
      if (!isHealthCheck || isSlowHealthCheck) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (isSlowHealthCheck) {
          logLine += " [SLOW HEALTH CHECK]";
        }
        // ⚠️ SECURITY: Never log API response content - may contain sensitive patient data
        // Only log basic request/response metadata for security compliance

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    }
  });

  next();
});

(async () => {
  try {
    // Add health check routes (but not on root path to preserve web interface)
    app.get("/health", (req, res) => {
      res.status(200).json({
        status: "healthy",
        service: "Medical Appointment System",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    app.get("/api/health", (req, res) => {
      res.status(200).json({
        status: "healthy",
        service: "Medical Appointment System API",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Initialize server and routes
    const server = await registerRoutes(app);

    // Global error handler with circuit breaker
    let errorCount = 0;
    let lastErrorReset = Date.now();
    const ERROR_THRESHOLD = 10;
    const RESET_INTERVAL = 60000; // 1 minute

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      // Reset error count if enough time has passed
      if (Date.now() - lastErrorReset > RESET_INTERVAL) {
        errorCount = 0;
        lastErrorReset = Date.now();
      }

      errorCount++;

      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Enhanced error logging with context
      console.error(`[ERROR ${errorCount}/${ERROR_THRESHOLD}] ${status}: ${message}`, {
        path: _req.path,
        method: _req.method,
        userAgent: _req.get('User-Agent'),
        stack: err.stack?.split('\n').slice(0, 3).join('\n')
      });

      // Circuit breaker: if too many errors, add delay
      if (errorCount >= ERROR_THRESHOLD) {
        console.warn(`⚠️ Circuit breaker activated - high error rate detected`);
        setTimeout(() => {
          res.status(status).json({
            message,
            note: "Sistema em modo de recuperação"
          });
        }, 1000);
      } else {
        res.status(status).json({ message });
      }
    });

    // Setup Vite in development or serve static files in production
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      try {
        serveStatic(app);
        console.log('✅ Static files configured for production');
      } catch (error) {
        console.error('❌ Failed to configure static files:', error);
        // Continue without static files if build doesn't exist
        console.log('⚠️  Continuing without static file serving');
      }
    }

    // Server configuration for production deployment
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = "0.0.0.0";

    // Start server with proper error handling
    await new Promise<void>((resolve, reject) => {
      const serverInstance = server.listen(port, host, (err?: Error) => {
        if (err) {
          console.error(`Failed to start server on ${host}:${port}`, err);
          reject(err);
        } else {
          log(`serving on port ${port}`);
          console.log(`✅ Server successfully started at http://${host}:${port}`);
          console.log(`🏥 Exu Saúde - Sistema de Atendimento Médico - Sistema de Atendimento Médico`);

          // Initialize cron service for automatic WhatsApp reminders after server is ready
          cronService.startCronJob();
          const cronStatus = cronService.getStatus();
          console.log(`📱 WhatsApp Cron Status:`, cronStatus);

          // Initialize scheduler service for WhatsApp notifications (queue confirmations and surveys)
          schedulerService.start();
          console.log(`📅 WhatsApp Scheduler Service: ${schedulerService.isRunning() ? 'Running' : 'Not Running'}`);

          // Initialize daily backup to Google Drive (runs at 02:00 AM every day)
          scheduleDailyBackup().catch(err => console.error('❌ Backup scheduler init error:', err));
          console.log(`💾 Daily backup to Google Drive scheduled (02:00 AM)`);

          resolve();
        }
      });

      // Handle server errors
      serverInstance.on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });

      // Graceful shutdown handling
      process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully');
        cronService.stopCronJob();
        schedulerService.stop();
        serverInstance.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('SIGINT received, shutting down gracefully');
        cronService.stopCronJob();
        schedulerService.stop();
        serverInstance.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
})();
