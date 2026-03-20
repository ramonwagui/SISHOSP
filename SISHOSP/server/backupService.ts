import { db } from './db';
import { desc } from 'drizzle-orm';
import { getUncachableGoogleDriveClient } from './googleDrive';
import { EmailService } from './emailService';
import * as schema from '@shared/schema';

const BACKUP_FOLDER_NAME = 'Exu Saúde - Backups';
const MAX_BACKUP_SETS = 30; // Keep last 30 backup sets (each set = .json + .sql)

interface BackupStatus {
  lastBackupAt: Date | null;
  lastBackupFiles: string[];
  lastBackupStatus: 'success' | 'error' | null;
  lastError: string | null;
}

const backupStatus: BackupStatus = {
  lastBackupAt: null,
  lastBackupFiles: [],
  lastBackupStatus: null,
  lastError: null,
};

// ─── Google Drive helpers ────────────────────────────────────────────────────

async function getOrCreateBackupFolder(drive: any): Promise<string> {
  const search = await drive.files.list({
    q: `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });
  if (search.data.files?.length > 0) return search.data.files[0].id;

  const folder = await drive.files.create({
    requestBody: { name: BACKUP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  return folder.data.id;
}

async function uploadFileToDrive(
  drive: any,
  folderId: string,
  fileName: string,
  content: string,
  mimeType: string
): Promise<string> {
  const { Readable } = await import('stream');
  const stream = Readable.from([content]);
  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId], mimeType },
    media: { mimeType, body: stream },
    fields: 'id',
  });
  return res.data.id!;
}

async function deleteOldBackups(drive: any, folderId: string): Promise<void> {
  const list = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, createdTime)',
    orderBy: 'createdTime asc',
    pageSize: 1000,
  });

  const files: any[] = list.data.files || [];

  // Group by base name (without extension) to count sets
  const sets = new Map<string, any[]>();
  for (const f of files) {
    const base = f.name.replace(/\.(json|sql)$/, '');
    if (!sets.has(base)) sets.set(base, []);
    sets.get(base)!.push(f);
  }

  const setKeys = Array.from(sets.keys()).sort();
  if (setKeys.length > MAX_BACKUP_SETS) {
    const toDelete = setKeys.slice(0, setKeys.length - MAX_BACKUP_SETS);
    const filesToDelete = toDelete.flatMap(k => sets.get(k)!);
    await Promise.all(filesToDelete.map((f: any) => drive.files.delete({ fileId: f.id })));
    console.log(`🗑️ Backup: removed ${toDelete.length} old backup set(s)`);
  }
}

// ─── Data collection — ALL business tables ───────────────────────────────────

async function collectBackupData(): Promise<Record<string, any[]>> {
  const results = await Promise.all([
    // Core entities
    db.select().from(schema.specialties),
    db.select().from(schema.patients),
    db.select().from(schema.appointments),
    db.select().from(schema.medicalHistory),
    db.select().from(schema.triage),
    db.select().from(schema.queueEntries),

    // Templates & protocols
    db.select().from(schema.anamnesisTemplates),
    db.select().from(schema.clinicalProtocols),
    db.select().from(schema.prescriptionTemplates),

    // Users (no password hashes)
    db.select({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      isActive: schema.users.isActive,
      createdAt: schema.users.createdAt,
    }).from(schema.users),

    // Messaging & surveys
    db.select().from(schema.scheduledMessages),
    db.select().from(schema.satisfactionSurveys),

    // Lab exams
    db.select().from(schema.examRequests),

    // Medical documents
    db.select().from(schema.medicalDocuments),

    // CID codes
    db.select().from(schema.cidCodes),

    // Pharmacy
    db.select().from(schema.medicationsCatalog),
    db.select().from(schema.inventoryBatches),
    db.select().from(schema.inventoryMovements),
    db.select().from(schema.prescriptions),
    db.select().from(schema.prescriptionItems),
    db.select().from(schema.dispensingEvents),
    db.select().from(schema.pharmacyKits),
    db.select().from(schema.pharmacyKitItems),
    db.select().from(schema.pharmacyKitDispensations),

    // Hospitalization
    db.select().from(schema.hospitalWards),
    db.select().from(schema.hospitalBeds),
    db.select().from(schema.hospitalizations),
    db.select().from(schema.hospitalizationEvolutions),

    // Materials / Almoxarifado
    db.select().from(schema.materialsCatalog),
    db.select().from(schema.materialsBatches),
    db.select().from(schema.materialsMovements),

    // Procedure requests
    db.select().from(schema.medicationMaterialRequirements),
    db.select().from(schema.procedureKits),
    db.select().from(schema.procedureKitItems),
    db.select().from(schema.procedureRequests),
    db.select().from(schema.procedureRequestItems),

    // Audit logs — last 5 000 rows to cap size
    db.select().from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.timestamp))
      .limit(5000),
  ]);

  const keys = [
    'specialties', 'patients', 'appointments', 'medical_history', 'triage', 'queue_entries',
    'anamnesis_templates', 'clinical_protocols', 'prescription_templates',
    'users',
    'scheduled_messages', 'satisfaction_surveys',
    'exam_requests',
    'medical_documents',
    'cid_codes',
    'medications_catalog', 'inventory_batches', 'inventory_movements',
    'prescriptions', 'prescription_items', 'dispensing_events',
    'pharmacy_kits', 'pharmacy_kit_items', 'pharmacy_kit_dispensations',
    'hospital_wards', 'hospital_beds', 'hospitalizations', 'hospitalization_evolutions',
    'materials_catalog', 'materials_batches', 'materials_movements',
    'medication_material_requirements',
    'procedure_kits', 'procedure_kit_items', 'procedure_requests', 'procedure_request_items',
    'audit_logs',
  ];

  return Object.fromEntries(keys.map((k, i) => [k, results[i]]));
}

// ─── SQL generation ──────────────────────────────────────────────────────────

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (Array.isArray(val)) {
    // PostgreSQL array literal
    const inner = val.map(v => {
      if (v === null) return 'NULL';
      if (typeof v === 'string') return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      return String(v);
    }).join(',');
    return `'{${inner}}'`;
  }
  if (typeof val === 'object') {
    // JSONB
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  // String
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateSqlContent(data: Record<string, any[]>, backupDate: Date): string {
  const lines: string[] = [];

  lines.push('-- =============================================================');
  lines.push('-- Exu Saúde - Sistema de Atendimento Médico');
  lines.push(`-- Backup gerado em: ${backupDate.toLocaleString('pt-BR')}`);
  lines.push(`-- Total de tabelas: ${Object.keys(data).length}`);
  lines.push(`-- Total de registros: ${Object.values(data).reduce((s, a) => s + a.length, 0)}`);
  lines.push('-- =============================================================');
  lines.push('');
  lines.push('-- ATENÇÃO: Para restaurar, execute em um banco PostgreSQL limpo.');
  lines.push('-- As senhas dos usuários NÃO estão incluídas neste backup.');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  for (const [tableName, rows] of Object.entries(data)) {
    if (!rows || rows.length === 0) {
      lines.push(`-- Tabela ${tableName}: sem registros`);
      lines.push('');
      continue;
    }

    lines.push(`-- ─── ${tableName} (${rows.length} registros) ────────────────`);

    const columns = Object.keys(rows[0]);
    const colList = columns.map(c => `"${c}"`).join(', ');

    for (const row of rows) {
      const values = columns.map(c => escapeSqlValue(row[c])).join(', ');
      lines.push(`INSERT INTO "${tableName}" (${colList}) VALUES (${values}) ON CONFLICT DO NOTHING;`);
    }

    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('');
  lines.push('-- Backup concluído.');

  return lines.join('\n');
}

// ─── Main backup function ─────────────────────────────────────────────────────

export async function runBackup(): Promise<{ jsonFileName: string; sqlFileName: string }> {
  console.log('🔄 Starting full database backup to Google Drive...');

  try {
    const drive = await getUncachableGoogleDriveClient();
    const folderId = await getOrCreateBackupFolder(drive);

    console.log('📊 Collecting data from all tables...');
    const data = await collectBackupData();

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const baseName = `backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}h${pad(now.getMinutes())}`;
    const jsonFileName = `${baseName}.json`;
    const sqlFileName = `${baseName}.sql`;

    const totalRecords = Object.values(data).reduce((s, a) => s + a.length, 0);

    // Build JSON payload
    const jsonContent = JSON.stringify({
      backupDate: now.toISOString(),
      system: 'Exu Saúde - Sistema de Atendimento Médico',
      version: '2.0',
      tables: Object.keys(data),
      recordCounts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
      data,
    }, null, 2);

    // Build SQL payload
    const sqlContent = generateSqlContent(data, now);

    console.log(`📤 Uploading JSON backup (${(jsonContent.length / 1024).toFixed(0)} KB)...`);
    await uploadFileToDrive(drive, folderId, jsonFileName, jsonContent, 'application/json');

    console.log(`📤 Uploading SQL backup (${(sqlContent.length / 1024).toFixed(0)} KB)...`);
    await uploadFileToDrive(drive, folderId, sqlFileName, sqlContent, 'application/sql');

    await deleteOldBackups(drive, folderId);

    backupStatus.lastBackupAt = now;
    backupStatus.lastBackupFiles = [jsonFileName, sqlFileName];
    backupStatus.lastBackupStatus = 'success';
    backupStatus.lastError = null;

    console.log(`✅ Backup completed: ${jsonFileName} + ${sqlFileName} (${totalRecords} records across ${Object.keys(data).length} tables)`);

    EmailService.sendBackupSuccessEmail({
      jsonFileName,
      sqlFileName,
      totalRecords,
      totalTables: Object.keys(data).length,
      backupAt: now,
    }).catch(err => console.error('❌ Could not send backup success email:', err));

    return { jsonFileName, sqlFileName };
  } catch (error: any) {
    const attemptedAt = new Date();
    backupStatus.lastBackupAt = attemptedAt;
    backupStatus.lastBackupStatus = 'error';
    backupStatus.lastError = error.message || 'Unknown error';
    console.error('❌ Backup failed:', error.message);

    EmailService.sendBackupFailureEmail({
      errorMessage: error.message || 'Unknown error',
      attemptedAt,
    }).catch(err => console.error('❌ Could not send backup failure email:', err));

    throw error;
  }
}

// ─── History & status ─────────────────────────────────────────────────────────

export interface BackupHistoryEntry {
  baseName: string;
  hasJson: boolean;
  hasSql: boolean;
  jsonId?: string;
  sqlId?: string;
  jsonSize?: number;
  sqlSize?: number;
  createdAt: string;
}

export async function getBackupHistory(): Promise<BackupHistoryEntry[]> {
  const drive = await getUncachableGoogleDriveClient();

  const search = await drive.files.list({
    q: `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });
  if (!search.data.files?.length) return [];

  const folderId = search.data.files[0].id;
  const list = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, size, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 100,
  });

  const files: any[] = list.data.files || [];
  const sets = new Map<string, BackupHistoryEntry>();

  for (const f of files) {
    const isJson = f.name.endsWith('.json');
    const isSql = f.name.endsWith('.sql');
    if (!isJson && !isSql) continue;

    const base = f.name.replace(/\.(json|sql)$/, '');
    if (!sets.has(base)) {
      sets.set(base, {
        baseName: base,
        hasJson: false,
        hasSql: false,
        createdAt: f.createdTime,
      });
    }
    const entry = sets.get(base)!;
    if (isJson) {
      entry.hasJson = true;
      entry.jsonId = f.id;
      entry.jsonSize = f.size ? parseInt(f.size) : undefined;
    } else {
      entry.hasSql = true;
      entry.sqlId = f.id;
      entry.sqlSize = f.size ? parseInt(f.size) : undefined;
    }
  }

  return Array.from(sets.values()).slice(0, 30);
}

export function getBackupStatus() {
  return { ...backupStatus };
}

// ─── Daily scheduler ──────────────────────────────────────────────────────────

export async function scheduleDailyBackup(): Promise<void> {
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date();
    next.setHours(2, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();
    console.log(`📅 Next automatic backup scheduled for: ${next.toLocaleString('pt-BR')}`);

    setTimeout(async () => {
      try {
        await runBackup();
      } catch (err) {
        console.error('❌ Scheduled backup failed:', err);
      }
      scheduleNext();
    }, delay);
  };

  // Check if today's backup was missed (e.g. server restarted after 02:00)
  const now = new Date();
  const todayStr = (() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  })();

  if (now.getHours() >= 2) {
    try {
      const history = await getBackupHistory();
      const hasBackupToday = history.some(entry => entry.baseName.startsWith(todayStr));
      if (!hasBackupToday) {
        console.log('⚠️  No backup found for today. Running missed backup now...');
        runBackup().catch(err => console.error('❌ Catch-up backup failed:', err));
      } else {
        console.log(`✅ Backup for today already exists (${history[0].baseName}). Skipping catch-up.`);
      }
    } catch (err) {
      console.error('❌ Could not check backup history on startup:', err);
    }
  }

  scheduleNext();
}
