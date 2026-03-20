import crypto from 'crypto';

/**
 * Serviço para gerar e validar tokens únicos para pesquisas de satisfação
 */
export class SurveyTokenService {
  /**
   * Gera um token único seguro para uma pesquisa
   * Formato: base64url de 32 bytes randomizados
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Gera URL completa da pesquisa
   * @param token Token único da pesquisa
   * @param baseUrl URL base do sistema (opcional, usa variável de ambiente)
   * IMPORTANTE: Usa process.env.REPL_URL para consistência com EmailService
   */
  static generateSurveyUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || process.env.REPL_URL || 'http://localhost:5000';
    return `${base}/pesquisa/${token}`;
  }

  /**
   * Valida se um token tem o formato correto
   */
  static isValidTokenFormat(token: string): boolean {
    // Token deve ter exatamente 43 caracteres (32 bytes em base64url)
    return /^[A-Za-z0-9_-]{43}$/.test(token);
  }
}
