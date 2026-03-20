import Handlebars from 'handlebars';
// @ts-ignore
import htmlToPdf from 'html-pdf-node';
import fs from 'fs';
import path from 'path';

export interface ConsultationData {
  id: string;
  patientName: string;
  patientCpf: string;
  patientSusCard: string;
  patientWhatsapp: string;
  patientBirthDate: string;
  patientGender: string;
  patientAddress: string;
  patientAddressNumber: string;
  patientNeighborhood: string;
  patientCity: string;
  patientState: string;
  specialtyName: string;
  appointmentDate: string;
  appointmentTime: string;
  doctorName?: string;
  observations?: string;
  status: string;
  createdAt: string;
}

export interface MedicalDocumentData {
  id: string;
  title: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  patientGender?: string;
  patientAge?: number;
  documentType: 'prescription' | 'certificate' | 'medical_report';
  content: string;
  diagnosis?: string;
  medications?: string;
  observations?: string;
  daysOff?: string;
  startDate?: string;
  endDate?: string;
  cid?: string;
  doctorName: string;
  doctorCrm: string;
  issueDate: string;
  // Digital Signature fields
  isSigned?: boolean;
  doctorSignature?: string; // base64 image
  signedAt?: string;
  signatureHash?: string;
}

export interface BoletimData {
  // Dados do atendimento
  queueNumber: string;
  protocolNumber: string;
  attendanceDate: string;
  attendanceTime: string;
  arrivalTime: string;
  startTime?: string;
  endTime?: string;
  
  // Dados do paciente
  patientName: string;
  patientCpf: string;
  patientSusCard: string;
  patientBirthDate: string;
  patientAge: number;
  patientGender: string;
  patientMotherName?: string;
  patientAddress: string;
  patientPhone?: string;
  
  // Dados da triagem
  triageSeverity?: string;
  triageMainSymptoms?: string;
  triageTemperature?: string;
  triageBloodPressure?: string;
  triageHeartRate?: string;
  triageRespiratoryRate?: string;
  triageOxygenSaturation?: string;
  triageWeight?: string;
  triageHeight?: string;
  triageHgt?: string;
  triageObservations?: string;
  triageStaffName?: string;
  
  // Dados do atendimento médico
  doctorName?: string;
  doctorCrm?: string;
  anamnesis?: string;
  physicalExam?: string;
  diagnosis?: string;
  cid?: string;
  medications?: string;
  observations?: string;
  
  // Exames (opcional)
  labExams?: string;
  imagingExams?: string;
  
  // Acompanhante (opcional)
  companionName?: string;
  companionRelationship?: string;
}

// Função para converter o logo para base64
function getLogoBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), 'attached_assets', 'LOGO-HMJPS_1765285256517.png');
    console.log('🖼️ Loading hospital logo from:', logoPath);
    
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Logo file not found at:', logoPath);
      return '';
    }
    
    const logoBuffer = fs.readFileSync(logoPath);
    const base64String = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    console.log('✅ Logo loaded successfully, base64 length:', base64String.length);
    return base64String;
  } catch (error) {
    console.error('❌ Error loading hospital logo:', error);
    return '';
  }
}

// Funções para carregar as outras logos institucionais
function getExuBemCuidadaLogo(): string {
  try {
    const logoPath = path.join(process.cwd(), 'attached_assets', 'logo exubemcuidada_1762211847001.png');
    console.log('🖼️ Loading Exu Bem Cuidada logo from:', logoPath);
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Exu Bem Cuidada logo not found at:', logoPath);
      return '';
    }
    const logoBuffer = fs.readFileSync(logoPath);
    const base64String = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    console.log('✅ Exu Bem Cuidada logo loaded successfully');
    return base64String;
  } catch (error) {
    console.error('❌ Error loading Exu Bem Cuidada logo:', error);
    return '';
  }
}

function getSecretariaSaudeLogo(): string {
  try {
    const logoPath = path.join(process.cwd(), 'attached_assets', 'logo secretaria de saude_1762211847002.png');
    console.log('🖼️ Loading Secretaria de Saúde logo from:', logoPath);
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Secretaria de Saúde logo not found at:', logoPath);
      return '';
    }
    const logoBuffer = fs.readFileSync(logoPath);
    const base64String = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    console.log('✅ Secretaria de Saúde logo loaded successfully');
    return base64String;
  } catch (error) {
    console.error('❌ Error loading Secretaria de Saúde logo:', error);
    return '';
  }
}

function getMinisterioSaudeLogo(): string {
  try {
    const logoPath = path.join(process.cwd(), 'attached_assets', 'Ministério_da_Saúde_1762211847002.png');
    console.log('🖼️ Loading Ministério da Saúde logo from:', logoPath);
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Ministério da Saúde logo not found at:', logoPath);
      return '';
    }
    const logoBuffer = fs.readFileSync(logoPath);
    const base64String = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    console.log('✅ Ministério da Saúde logo loaded successfully');
    return base64String;
  } catch (error) {
    console.error('❌ Error loading Ministério da Saúde logo:', error);
    return '';
  }
}

function getSUSLogo(): string {
  try {
    const logoPath = path.join(process.cwd(), 'attached_assets', 'sus-logo_1762211847003.png');
    console.log('🖼️ Loading SUS logo from:', logoPath);
    if (!fs.existsSync(logoPath)) {
      console.error('❌ SUS logo not found at:', logoPath);
      return '';
    }
    const logoBuffer = fs.readFileSync(logoPath);
    const base64String = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    console.log('✅ SUS logo loaded successfully');
    return base64String;
  } catch (error) {
    console.error('❌ Error loading SUS logo:', error);
    return '';
  }
}

// Armazenar logos otimizadas (serão carregadas assincronamente)
let optimizedLogo: string = '';
let optimizedExuBemCuidadaLogo: string = '';
let optimizedSecretariaSaudeLogo: string = '';

// Função para otimizar logo com sharp
async function optimizeLogo(logoPath: string, maxWidth: number = 120): Promise<string> {
  try {
    const sharp = (await import('sharp')).default;
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Logo file not found at:', logoPath);
      return '';
    }
    
    const buffer = await sharp(logoPath)
      .resize(maxWidth, null, { withoutEnlargement: true })
      .png({ compressionLevel: 9, quality: 80 })
      .toBuffer();
    
    const base64String = `data:image/png;base64,${buffer.toString('base64')}`;
    console.log(`✅ Logo optimized: ${logoPath} -> ${base64String.length} bytes`);
    return base64String;
  } catch (error) {
    console.error('❌ Error optimizing logo:', error);
    // Fallback to original
    const logoBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  }
}

// Inicializar logos otimizadas
async function initOptimizedLogos() {
  const logosDir = path.join(process.cwd(), 'attached_assets');
  
  optimizedLogo = await optimizeLogo(path.join(logosDir, 'LOGO-HMJPS_1765285256517.png'), 100);
  optimizedExuBemCuidadaLogo = await optimizeLogo(path.join(logosDir, 'logo exubemcuidada_1762211847001.png'), 80);
  optimizedSecretariaSaudeLogo = await optimizeLogo(path.join(logosDir, 'logo secretaria de saude_1762211847002.png'), 80);
  
  console.log('✅ All logos optimized for PDF generation');
}

// Inicializar logos no carregamento do módulo
initOptimizedLogos().catch(console.error);

const hospitalData = {
  name: "Exu Saúde - Sistema de Atendimento Médico",
  address: "Rodovia Asa Branca, 122 - s/n",
  neighborhood: "Exu",
  city: "Exu",
  state: "PE",
  cep: "56230-000",
  phone: "(87) 3874-1234",
  cnpj: "12.345.678/0001-90",
  logo: getLogoBase64(),
  exuBemCuidadaLogo: getExuBemCuidadaLogo(),
  secretariaSaudeLogo: getSecretariaSaudeLogo(),
  ministerioSaudeLogo: getMinisterioSaudeLogo(),
  susLogo: getSUSLogo(),
  // Versões otimizadas para boletim
  get logoOptimized() { return optimizedLogo; },
  get exuBemCuidadaLogoOptimized() { return optimizedExuBemCuidadaLogo; },
  get secretariaSaudeLogoOptimized() { return optimizedSecretariaSaudeLogo; }
};

const consultationTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Comprovante de Consulta</title>
    <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Lato', Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .hospital-logo { width: 120px; height: auto; margin-bottom: 15px; }
        .hospital-name { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
        .hospital-info { font-size: 12px; color: #666; margin-bottom: 5px; }
        .document-title { font-size: 18px; font-weight: bold; margin-top: 15px; }
        .section { margin-bottom: 25px; background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; }
        .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
        .info-item { margin: 8px 0; }
        .info-label { font-weight: bold; color: #666; display: inline-block; width: 150px; }
        .info-value { color: #333; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; font-size: 11px; }
    </style>
</head>
<body>
    <div class="header">
        {{#if hospital.logo}}
        <img src="{{hospital.logo}}" alt="Logo do Hospital" class="hospital-logo" />
        {{/if}}
        <div class="hospital-name">{{hospital.name}}</div>
        <div class="hospital-info">{{hospital.address}}, {{hospital.neighborhood}} - {{hospital.city}}/{{hospital.state}} - CEP: {{hospital.cep}}</div>
        <div class="hospital-info">Telefone: {{hospital.phone}} | CNPJ: {{hospital.cnpj}}</div>
        <div class="document-title">COMPROVANTE DE CONSULTA MÉDICA</div>
        <p>Protocolo: {{consultation.id}}</p>
    </div>

    <div class="section">
        <div class="section-title">Dados do Paciente</div>
        <div class="info-item"><span class="info-label">Nome:</span> <span class="info-value">{{consultation.patientName}}</span></div>
        <div class="info-item"><span class="info-label">CPF:</span> <span class="info-value">{{consultation.patientCpf}}</span></div>
        <div class="info-item"><span class="info-label">Cartão SUS:</span> <span class="info-value">{{consultation.patientSusCard}}</span></div>
        <div class="info-item"><span class="info-label">WhatsApp:</span> <span class="info-value">{{consultation.patientWhatsapp}}</span></div>
        <div class="info-item"><span class="info-label">Data Nascimento:</span> <span class="info-value">{{consultation.patientBirthDate}}</span></div>
        <div class="info-item"><span class="info-label">Gênero:</span> <span class="info-value">{{consultation.patientGender}}</span></div>
        <div class="info-item"><span class="info-label">Endereço:</span> <span class="info-value">{{consultation.patientAddress}}, {{consultation.patientAddressNumber}}, {{consultation.patientNeighborhood}}, {{consultation.patientCity}}/{{consultation.patientState}}</span></div>
    </div>

    <div class="section">
        <div class="section-title">Dados da Consulta</div>
        <div class="info-item"><span class="info-label">Especialidade:</span> <span class="info-value">{{consultation.specialtyName}}</span></div>
        <div class="info-item"><span class="info-label">Data:</span> <span class="info-value">{{consultation.appointmentDate}}</span></div>
        <div class="info-item"><span class="info-label">Horário:</span> <span class="info-value">{{consultation.appointmentTime}}</span></div>
        <div class="info-item"><span class="info-label">Status:</span> <span class="info-value">{{consultation.status}}</span></div>
        <div class="info-item"><span class="info-label">Agendado em:</span> <span class="info-value">{{consultation.createdAt}}</span></div>
        {{#if consultation.doctorName}}
        <div class="info-item"><span class="info-label">Médico:</span> <span class="info-value">{{consultation.doctorName}}</span></div>
        {{/if}}
        {{#if consultation.observations}}
        <div class="info-item"><span class="info-label">Observações:</span> <span class="info-value">{{consultation.observations}}</span></div>
        {{/if}}
    </div>

    <div class="footer">
        <p><strong>IMPORTANTE:</strong> Este comprovante deve ser apresentado no dia da consulta junto com documento de identidade e cartão SUS.</p>
        <p>Para reagendamentos ou cancelamentos, entre em contato pelo telefone {{hospital.phone}}.</p>
        <p>Documento gerado em: {{currentDate}} | {{hospital.name}}</p>
    </div>
</body>
</html>
`;

const medicalDocumentTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>{{document.title}}</title>
    <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet">
    <style>
        @page { margin: 0.5in; }
        body { 
            font-family: 'Lato', Arial, sans-serif; 
            margin: 0; 
            padding: 15px;
            color: #000;
            line-height: 1.4;
        }
        .document-type-header { 
            text-align: center;
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 20px;
            text-transform: uppercase;
            color: #000;
            border-bottom: 2px solid #0f766e;
            padding-bottom: 10px;
        }
        .content-section { 
            margin-bottom: 15px; 
        }
        .section-title { 
            font-size: 12px; 
            font-weight: bold; 
            margin-bottom: 8px; 
            text-transform: uppercase; 
            color: #0f766e;
            border-bottom: 1px solid #ccc;
            padding-bottom: 3px;
        }
        .patient-info {
            background: #f9f9f9;
            padding: 15px;
            border-left: 3px solid #0f766e;
            margin-bottom: 25px;
        }
        .info-row { 
            margin: 8px 0; 
            font-size: 12px;
        }
        .info-label { 
            font-weight: bold; 
            color: #333; 
        }
        .document-content {
            font-size: 12px;
            line-height: 1.5;
            text-align: justify;
            margin: 15px 0;
            min-height: 100px;
            white-space: pre-wrap;
        }
        .certificate-box {
            background: #fffbeb;
            border: 2px solid #f59e0b;
            padding: 25px;
            margin: 30px 0;
            border-radius: 6px;
        }
        .certificate-content {
            font-size: 13px;
            line-height: 2;
        }
        .certificate-content p {
            margin-bottom: 15px;
        }
        .signature-section {
            margin-top: 180px;
            text-align: center;
        }
        .signature-line {
            border-top: 2px solid #000;
            width: 250px;
            margin: 0 auto 12px;
        }
        .signature-image {
            max-width: 200px;
            max-height: 80px;
            margin: 0 auto 8px;
            display: block;
        }
        .doctor-info {
            font-size: 11px;
            font-weight: bold;
        }
        .signature-details {
            font-size: 9px;
            color: #666;
            margin-top: 8px;
        }
        .digital-signature-badge {
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 9px;
            display: inline-block;
            margin-top: 8px;
            font-weight: bold;
        }
        .institutional-logos {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 25px;
            flex-wrap: wrap;
        }
        .institutional-logos img {
            height: auto;
            object-fit: contain;
        }
        .institutional-logos .logo-hospital {
            max-height: 80px;
        }
        .institutional-logos .logo-partner {
            max-height: 75px;
        }
        .institutional-logos .logo-ministerio {
            max-height: 70px;
        }
        .footer { 
            margin-top: 15px; 
            padding-top: 10px; 
            border-top: 1px solid #ccc; 
            text-align: center; 
            font-size: 9px; 
            color: #666;
        }
        .header-logos {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #0f766e;
            flex-wrap: wrap;
        }
        .header-logos img {
            height: auto;
            object-fit: contain;
        }
        .header-logos .logo-hospital {
            max-height: 60px;
        }
        .header-logos .logo-partner {
            max-height: 50px;
        }
        .header-logos .logo-ministerio {
            max-height: 45px;
        }
        .medications-list {
            background: #f0fdf4;
            padding: 10px;
            border-left: 3px solid #10b981;
            margin: 12px 0;
        }
        .diagnosis-box {
            background: #eff6ff;
            padding: 10px;
            border-left: 3px solid #3b82f6;
            margin: 12px 0;
        }
    </style>
</head>
<body>
    {{#if document.isAtestado}}
    <div class="header-logos">
        {{#if hospital.logo}}
        <img src="{{hospital.logo}}" alt="Logo do Hospital" class="logo-hospital" />
        {{/if}}
        {{#if hospital.exuBemCuidadaLogo}}
        <img src="{{hospital.exuBemCuidadaLogo}}" alt="Exu Bem Cuidada" class="logo-partner" />
        {{/if}}
        {{#if hospital.secretariaSaudeLogo}}
        <img src="{{hospital.secretariaSaudeLogo}}" alt="Secretaria de Saúde" class="logo-partner" />
        {{/if}}
        {{#if hospital.ministerioSaudeLogo}}
        <img src="{{hospital.ministerioSaudeLogo}}" alt="Ministério da Saúde" class="logo-ministerio" />
        {{/if}}
    </div>
    {{/if}}

    <div class="document-type-header">
        {{#if document.isAtestado}}
        ATESTADO MÉDICO
        {{else if document.isPrescription}}
        RECEITUÁRIO
        {{else}}
        {{document.title}}
        {{/if}}
    </div>

    {{#if document.isPrescription}}
    <div class="patient-info" style="display: flex; flex-wrap: wrap; gap: 8px 20px;">
        <div class="info-row"><span class="info-label">Paciente:</span> {{document.patientName}}</div>
        {{#if document.patientPhone}}
        <div class="info-row"><span class="info-label">Telefone:</span> {{document.patientPhone}}</div>
        {{/if}}
        {{#if document.patientGender}}
        <div class="info-row"><span class="info-label">Sexo:</span> {{document.patientGender}}</div>
        {{/if}}
        {{#if document.patientAge}}
        <div class="info-row"><span class="info-label">Idade:</span> {{document.patientAge}} anos</div>
        {{/if}}
        <div class="info-row"><span class="info-label">Data de Emissão:</span> {{document.issueDate}}</div>
    </div>
    {{else if document.isAtestado}}
    <div class="patient-info" style="display: flex; flex-wrap: wrap; gap: 8px 20px;">
        <div class="info-row"><span class="info-label">Paciente:</span> {{document.patientName}}</div>
        {{#if document.patientCpf}}
        <div class="info-row"><span class="info-label">CPF:</span> {{document.patientCpf}}</div>
        {{/if}}
        {{#if document.daysOff}}
        <div class="info-row"><span class="info-label">Dias de Afastamento:</span> {{document.daysOff}} dia(s)</div>
        {{/if}}
    </div>
    {{else}}
    <div class="patient-info">
        <div class="info-row"><span class="info-label">Paciente:</span> {{document.patientName}}</div>
        {{#if document.patientEmail}}
        <div class="info-row"><span class="info-label">Email:</span> {{document.patientEmail}}</div>
        {{/if}}
        {{#if document.patientPhone}}
        <div class="info-row"><span class="info-label">Telefone:</span> {{document.patientPhone}}</div>
        {{/if}}
        {{#if document.patientGender}}
        <div class="info-row"><span class="info-label">Sexo:</span> {{document.patientGender}}</div>
        {{/if}}
        {{#if document.patientAge}}
        <div class="info-row"><span class="info-label">Idade:</span> {{document.patientAge}} anos</div>
        {{/if}}
        <div class="info-row"><span class="info-label">Data de Emissão:</span> {{document.issueDate}}</div>
        {{#if document.startDate}}
        <div class="info-row"><span class="info-label">Data de Início:</span> {{document.startDate}}</div>
        {{/if}}
        {{#if document.endDate}}
        <div class="info-row"><span class="info-label">Data Final:</span> {{document.endDate}}</div>
        {{/if}}
        {{#if document.daysOff}}
        <div class="info-row"><span class="info-label">Número de Dias:</span> {{document.daysOff}}</div>
        {{/if}}
    </div>
    {{/if}}

    {{#unless document.isPrescription}}
    {{#unless document.isAtestado}}
    {{#if document.diagnosis}}
    <div class="diagnosis-box">
        <div class="section-title">Diagnóstico</div>
        <div style="white-space: pre-wrap;">{{document.diagnosis}}</div>
    </div>
    {{/if}}
    {{/unless}}
    {{/unless}}

    {{#if document.isAtestado}}
    <div class="certificate-box">
        <div class="certificate-content">
            {{#if document.content}}
            <p style="white-space: pre-wrap; text-align: justify; line-height: 1.8;">{{document.content}}</p>
            {{/if}}
            {{#if document.diagnosis}}
            <p style="margin-top: 15px;"><strong>Diagnóstico:</strong> {{document.diagnosis}}</p>
            {{/if}}
            {{#if document.cid}}
            <p style="margin-top: 10px;"><strong>CID:</strong> {{document.cid}}</p>
            {{/if}}
        </div>
    </div>
    {{else}}
    {{#unless document.isPrescription}}
    <div class="content-section">
        <div class="document-content">{{document.content}}</div>
    </div>
    {{/unless}}
    {{/if}}

    {{#if document.medications}}
    <div class="medications-list">
        <div class="section-title">{{#if document.isPrescription}}PRESCRIÇÃO{{else}}Medicamentos Prescritos{{/if}}</div>
        <div style="white-space: pre-wrap;">{{document.medications}}</div>
    </div>
    {{/if}}

    {{#unless document.isPrescription}}
    {{#unless document.isAtestado}}
    {{#if document.observations}}
    <div class="content-section">
        <div class="section-title">Observações</div>
        <div style="white-space: pre-wrap;">{{document.observations}}</div>
    </div>
    {{/if}}
    {{/unless}}
    {{/unless}}

    <div class="signature-section">
        {{#if document.isSigned}}
            {{#if document.doctorSignature}}
            <img src="{{document.doctorSignature}}" alt="Assinatura" class="signature-image" />
            {{else}}
            <div class="signature-line"></div>
            {{/if}}
            <div class="doctor-info">{{document.doctorName}}</div>
            <div class="doctor-info">CRM: {{document.doctorCrm}}</div>
            <div class="digital-signature-badge">✓ DOCUMENTO ASSINADO DIGITALMENTE</div>
            <div class="signature-details">
                Assinado em: {{document.signedAt}}<br/>
                Hash de Verificação: {{document.signatureHash}}
            </div>
        {{else}}
            <div class="signature-line"></div>
            <div class="doctor-info">{{document.doctorName}}</div>
            <div class="doctor-info">CRM: {{document.doctorCrm}}</div>
        {{/if}}
        {{#if document.isAtestado}}
        <div style="margin-top: 20px; font-size: 12px; color: #333;">
            Exu - PE, {{currentDate}}
        </div>
        {{/if}}
    </div>

    {{#unless document.isAtestado}}
    <div class="institutional-logos">
        {{#if hospital.exuBemCuidadaLogo}}
        <img src="{{hospital.exuBemCuidadaLogo}}" alt="Exu Bem Cuidada" class="logo-partner" />
        {{/if}}
        {{#if hospital.secretariaSaudeLogo}}
        <img src="{{hospital.secretariaSaudeLogo}}" alt="Secretaria de Saúde" class="logo-partner" />
        {{/if}}
    </div>
    {{/unless}}

    <div class="footer">
        <p>Documento emitido em {{currentDate}}</p>
        <p>{{hospital.name}} - {{hospital.city}}/{{hospital.state}}</p>
    </div>
</body>
</html>
`;

const boletimTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Boletim de Atendimento</title>
    <style>
        @page { 
            margin: 0.3in; 
            size: A4; 
        }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 10px; 
            margin: 0; 
            padding: 10px; 
            padding-bottom: 130px;
            color: #000;
        }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
        .hospital-logo { width: 60px; height: auto; margin-bottom: 5px; }
        .hospital-name { font-size: 14px; font-weight: bold; margin: 3px 0; }
        .document-title { font-size: 12px; font-weight: bold; margin-top: 8px; text-transform: uppercase; border: 1px solid #000; padding: 4px 15px; display: inline-block; }
        .protocol { font-size: 9px; margin-top: 5px; }
        
        .section { margin-bottom: 8px; border: 1px solid #333; }
        .section-header { background: #e0e0e0; padding: 3px 8px; font-weight: bold; font-size: 10px; border-bottom: 1px solid #333; }
        .section-content { padding: 6px 8px; }
        
        .row { display: flex; flex-wrap: wrap; margin-bottom: 3px; }
        .field { margin-right: 15px; margin-bottom: 2px; }
        .field-label { font-weight: bold; }
        .field-value { }
        
        .vital-signs { display: flex; flex-wrap: wrap; gap: 8px; }
        .vital-box { border: 1px solid #666; padding: 3px 6px; text-align: center; min-width: 60px; }
        .vital-label { font-size: 8px; color: #666; }
        .vital-value { font-weight: bold; font-size: 11px; }
        
        .text-area { min-height: 40px; border: 1px solid #ccc; padding: 4px; margin-top: 3px; white-space: pre-wrap; background: #fafafa; }
        .text-area-small { min-height: 25px; }
        
        .two-columns { display: flex; gap: 10px; }
        .column { flex: 1; }
        
        /* Rodapé fixo com assinaturas e logos */
        .page-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            padding: 10px 15px;
        }
        .signature-section { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .signature-box { text-align: center; width: 45%; }
        .signature-line { border-top: 1px solid #000; padding-top: 5px; }
        .footer-logos { border-top: 1px solid #e5e7eb; padding-top: 8px; text-align: center; }
        .logos-row { display: flex; justify-content: center; align-items: center; gap: 20px; margin-bottom: 5px; }
        .logos-row img { max-height: 35px; }
        .footer-text { font-size: 8px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="hospital-name">{{hospital.name}}</div>
        <div style="font-size: 9px;">{{hospital.address}} - {{hospital.city}}/{{hospital.state}} - Tel: {{hospital.phone}}</div>
        <div class="document-title">BOLETIM DE ATENDIMENTO</div>
        <div class="protocol">Protocolo: {{boletim.protocolNumber}} | Senha: {{boletim.queueNumber}} | Data: {{boletim.attendanceDate}}</div>
    </div>

    <div class="section">
        <div class="section-header">IDENTIFICAÇÃO DO PACIENTE</div>
        <div class="section-content">
            <div class="row">
                <div class="field"><span class="field-label">Nome:</span> {{boletim.patientName}}</div>
                <div class="field"><span class="field-label">Idade:</span> {{boletim.patientAge}} anos</div>
                <div class="field"><span class="field-label">Sexo:</span> {{boletim.patientGender}}</div>
            </div>
            <div class="row">
                <div class="field"><span class="field-label">CPF:</span> {{boletim.patientCpf}}</div>
                <div class="field"><span class="field-label">Cartão SUS:</span> {{boletim.patientSusCard}}</div>
                <div class="field"><span class="field-label">Nascimento:</span> {{boletim.patientBirthDate}}</div>
            </div>
            <div class="row">
                <div class="field"><span class="field-label">Endereço:</span> {{boletim.patientAddress}}</div>
                {{#if boletim.patientPhone}}
                <div class="field"><span class="field-label">Telefone:</span> {{boletim.patientPhone}}</div>
                {{/if}}
            </div>
            {{#if boletim.patientMotherName}}
            <div class="row">
                <div class="field"><span class="field-label">Nome da Mãe:</span> {{boletim.patientMotherName}}</div>
            </div>
            {{/if}}
            {{#if boletim.companionName}}
            <div class="row">
                <div class="field"><span class="field-label">Acompanhante:</span> {{boletim.companionName}} ({{boletim.companionRelationship}})</div>
            </div>
            {{/if}}
        </div>
    </div>

    <div class="section">
        <div class="section-header">TRIAGEM / CLASSIFICAÇÃO DE RISCO</div>
        <div class="section-content">
            <div class="row">
                <div class="field"><span class="field-label">Classificação:</span> {{boletim.triageSeverity}}</div>
                {{#if boletim.triageStaffName}}
                <div class="field"><span class="field-label">Enfermeiro(a):</span> {{boletim.triageStaffName}}</div>
                {{/if}}
            </div>
            {{#if boletim.triageMainSymptoms}}
            <div class="row">
                <div class="field"><span class="field-label">Queixa Principal:</span> {{boletim.triageMainSymptoms}}</div>
            </div>
            {{/if}}
            <div style="margin-top: 6px;">
                <span class="field-label">Sinais Vitais:</span>
                <div class="vital-signs" style="margin-top: 4px;">
                    {{#if boletim.triageBloodPressure}}
                    <div class="vital-box"><div class="vital-label">PA</div><div class="vital-value">{{boletim.triageBloodPressure}}</div></div>
                    {{/if}}
                    {{#if boletim.triageTemperature}}
                    <div class="vital-box"><div class="vital-label">Temp</div><div class="vital-value">{{boletim.triageTemperature}}°C</div></div>
                    {{/if}}
                    {{#if boletim.triageHeartRate}}
                    <div class="vital-box"><div class="vital-label">FC</div><div class="vital-value">{{boletim.triageHeartRate}} bpm</div></div>
                    {{/if}}
                    {{#if boletim.triageRespiratoryRate}}
                    <div class="vital-box"><div class="vital-label">FR</div><div class="vital-value">{{boletim.triageRespiratoryRate}} rpm</div></div>
                    {{/if}}
                    {{#if boletim.triageOxygenSaturation}}
                    <div class="vital-box"><div class="vital-label">SpO2</div><div class="vital-value">{{boletim.triageOxygenSaturation}}%</div></div>
                    {{/if}}
                    {{#if boletim.triageWeight}}
                    <div class="vital-box"><div class="vital-label">Peso</div><div class="vital-value">{{boletim.triageWeight}} kg</div></div>
                    {{/if}}
                    {{#if boletim.triageHeight}}
                    <div class="vital-box"><div class="vital-label">Altura</div><div class="vital-value">{{boletim.triageHeight}} cm</div></div>
                    {{/if}}
                    {{#if boletim.triageHgt}}
                    <div class="vital-box"><div class="vital-label">HGT</div><div class="vital-value">{{boletim.triageHgt}} mg/dL</div></div>
                    {{/if}}
                </div>
            </div>
            {{#if boletim.triageObservations}}
            <div style="margin-top: 6px;">
                <span class="field-label">Observações da Triagem:</span>
                <div class="text-area text-area-small">{{boletim.triageObservations}}</div>
            </div>
            {{/if}}
        </div>
    </div>

    <div class="section">
        <div class="section-header">ATENDIMENTO MÉDICO</div>
        <div class="section-content">
            <div class="row">
                {{#if boletim.doctorName}}
                <div class="field"><span class="field-label">Médico:</span> {{boletim.doctorName}}</div>
                {{/if}}
                {{#if boletim.doctorCrm}}
                <div class="field"><span class="field-label">CRM:</span> {{boletim.doctorCrm}}</div>
                {{/if}}
                {{#if boletim.startTime}}
                <div class="field"><span class="field-label">Início:</span> {{boletim.startTime}}</div>
                {{/if}}
                {{#if boletim.endTime}}
                <div class="field"><span class="field-label">Término:</span> {{boletim.endTime}}</div>
                {{/if}}
            </div>
            
            {{#if boletim.anamnesis}}
            <div style="margin-top: 6px;">
                <span class="field-label">Anamnese:</span>
                <div class="text-area">{{boletim.anamnesis}}</div>
            </div>
            {{/if}}
            
            {{#if boletim.physicalExam}}
            <div style="margin-top: 6px;">
                <span class="field-label">Exame Físico:</span>
                <div class="text-area">{{boletim.physicalExam}}</div>
            </div>
            {{/if}}
            
            <div class="two-columns" style="margin-top: 6px;">
                <div class="column">
                    <span class="field-label">Diagnóstico:</span>
                    <div class="text-area text-area-small">{{#if boletim.diagnosis}}{{boletim.diagnosis}}{{else}}-{{/if}}</div>
                </div>
                <div class="column">
                    <span class="field-label">CID:</span>
                    <div class="text-area text-area-small">{{#if boletim.cid}}{{boletim.cid}}{{else}}-{{/if}}</div>
                </div>
            </div>
            
            {{#if boletim.medications}}
            <div style="margin-top: 6px;">
                <span class="field-label">Prescrição / Medicamentos:</span>
                <div class="text-area">{{boletim.medications}}</div>
            </div>
            {{/if}}
            
            {{#if boletim.observations}}
            <div style="margin-top: 6px;">
                <span class="field-label">Observações / Evolução:</span>
                <div class="text-area">{{boletim.observations}}</div>
            </div>
            {{/if}}
        </div>
    </div>

    {{#if boletim.labExams}}
    <div class="section">
        <div class="section-header">EXAMES LABORATORIAIS</div>
        <div class="section-content">
            <div class="text-area">{{boletim.labExams}}</div>
        </div>
    </div>
    {{/if}}

    {{#if boletim.imagingExams}}
    <div class="section">
        <div class="section-header">EXAMES DE IMAGEM</div>
        <div class="section-content">
            <div class="text-area">{{boletim.imagingExams}}</div>
        </div>
    </div>
    {{/if}}

    <!-- Rodapé fixo com assinaturas e logos -->
    <div class="page-footer">
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line">Assinatura do Paciente/Responsável</div>
            </div>
            <div class="signature-box">
                <div class="signature-line">{{#if boletim.doctorName}}{{boletim.doctorName}}{{#if boletim.doctorCrm}} - CRM: {{boletim.doctorCrm}}{{/if}}{{else}}Assinatura e Carimbo do Médico{{/if}}</div>
            </div>
        </div>
        <div class="footer-logos">
            <div class="logos-row">
                {{#if hospital.logo}}
                <img src="{{hospital.logo}}" alt="Logo Hospital" />
                {{/if}}
                {{#if hospital.exuBemCuidadaLogo}}
                <img src="{{hospital.exuBemCuidadaLogo}}" alt="Exu Bem Cuidada" />
                {{/if}}
                {{#if hospital.secretariaSaudeLogo}}
                <img src="{{hospital.secretariaSaudeLogo}}" alt="Secretaria de Saúde" />
                {{/if}}
            </div>
            <div class="footer-text">
                Documento gerado em {{currentDate}} | {{hospital.name}} - {{hospital.city}}/{{hospital.state}}
            </div>
        </div>
    </div>
</body>
</html>
`;

export class PDFGenerator {
  private template: HandlebarsTemplateDelegate;
  private medicalDocumentTemplate: HandlebarsTemplateDelegate;
  private boletimTemplate: HandlebarsTemplateDelegate;

  constructor() {
    // Registrar helper para formatação de data
    Handlebars.registerHelper('formatDate', function(date: Date) {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Recife'
      }).format(date);
    });

    this.template = Handlebars.compile(consultationTemplate);
    this.medicalDocumentTemplate = Handlebars.compile(medicalDocumentTemplate);
    this.boletimTemplate = Handlebars.compile(boletimTemplate);
  }

  async generateConsultationPDF(consultation: ConsultationData): Promise<Buffer> {
    console.log('Starting PDF generation with data:', consultation);
    
    // Formatar dados para o template
    const formattedConsultation = {
      ...consultation,
      patientBirthDate: new Intl.DateTimeFormat('pt-BR').format(new Date(consultation.patientBirthDate)),
      appointmentDate: new Intl.DateTimeFormat('pt-BR').format(new Date(consultation.appointmentDate)),
      createdAt: new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(consultation.createdAt))
    };

    console.log('Formatted consultation data:', formattedConsultation);

    const templateData = {
      hospital: hospitalData,
      consultation: formattedConsultation,
      currentDate: new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Recife'
      }).format(new Date())
    };

    console.log('Template data:', templateData);

    const html = this.template(templateData);
    console.log('Generated HTML length:', html.length);
    console.log('HTML preview:', html.substring(0, 500));

    // Configurações do PDF
    const options = {
      format: 'A4',
      border: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in"
      },
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      waitUntil: 'networkidle0',
      timeout: 30000
    };

    const file = { content: html };
    
    try {
      console.log('Generating PDF with html-pdf-node...');
      const pdfBuffer = await htmlToPdf.generatePdf(file, options);
      console.log('PDF generated successfully, size:', pdfBuffer.length);
      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  async generateMedicalDocumentPDF(document: MedicalDocumentData): Promise<Buffer> {
    console.log('Starting medical document PDF generation:', document.id);
    
    // Formatar dados para o template
    const formattedDocument = {
      ...document,
      issueDate: new Intl.DateTimeFormat('pt-BR').format(new Date(document.issueDate)),
      isAtestado: document.documentType === 'certificate',
      isPrescription: document.documentType === 'prescription'
    };

    const templateData = {
      hospital: hospitalData,
      document: formattedDocument,
      currentDate: new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Recife'
      }).format(new Date())
    };

    const html = this.medicalDocumentTemplate(templateData);
    console.log('Generated medical document HTML length:', html.length);
    console.log('🖼️ Logo in template data:', templateData.hospital.logo ? `Yes (${templateData.hospital.logo.substring(0, 50)}...)` : 'No');
    
    // Verificar se a imagem está no HTML
    if (html.includes('<img src=')) {
      console.log('✅ Image tag found in HTML');
    } else {
      console.log('❌ Image tag NOT found in HTML');
    }

    // Configurações do PDF
    const options = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in"
      },
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      waitUntil: 'networkidle0',
      timeout: 30000
    };

    const file = { content: html };
    
    try {
      console.log('Generating medical document PDF with html-pdf-node...');
      const pdfBuffer = await htmlToPdf.generatePdf(file, options);
      console.log('Medical document PDF generated successfully, size:', pdfBuffer.length);
      return pdfBuffer;
    } catch (error) {
      console.error('Error generating medical document PDF:', error);
      throw error;
    }
  }

  async generateBoletimPDF(boletim: BoletimData): Promise<Buffer> {
    console.log('Starting boletim PDF generation:', boletim.protocolNumber);
    
    // Função para sanitizar campos de texto - remove excesso de linhas em branco
    const sanitizeText = (text: string | undefined): string | undefined => {
      if (!text) return undefined;
      return text
        .trim()
        .replace(/\n{3,}/g, '\n\n')  // Máximo 2 quebras de linha consecutivas
        .replace(/[ \t]+$/gm, '')     // Remove espaços no final das linhas
        .replace(/^\s*\n/gm, '\n');   // Remove linhas só com espaços
    };
    
    // Sanitizar todos os campos de texto do boletim
    const sanitizedBoletim = {
      ...boletim,
      anamnesis: sanitizeText(boletim.anamnesis),
      physicalExam: sanitizeText(boletim.physicalExam),
      diagnosis: sanitizeText(boletim.diagnosis),
      medications: sanitizeText(boletim.medications),
      observations: sanitizeText(boletim.observations),
      triageMainSymptoms: sanitizeText(boletim.triageMainSymptoms),
      triageObservations: sanitizeText(boletim.triageObservations),
      labExams: sanitizeText(boletim.labExams),
      imagingExams: sanitizeText(boletim.imagingExams)
    };
    
    // Usar logos otimizadas para o boletim (muito menores)
    const boletimHospitalData = {
      ...hospitalData,
      logo: optimizedLogo || '',
      exuBemCuidadaLogo: optimizedExuBemCuidadaLogo || '',
      secretariaSaudeLogo: optimizedSecretariaSaudeLogo || '',
    };
    
    const templateData = {
      hospital: boletimHospitalData,
      boletim: sanitizedBoletim,
      currentDate: new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Recife'
      }).format(new Date())
    };

    const html = this.boletimTemplate(templateData);
    console.log('Generated boletim HTML length:', html.length);

    // Usar puppeteer diretamente para evitar bug do html-pdf-node
    try {
      console.log('Generating boletim PDF with puppeteer directly...');
      const puppeteer = (await import('puppeteer')).default;
      
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.3in',
          right: '0.3in',
          bottom: '0.3in',
          left: '0.3in'
        }
      });
      
      await browser.close();
      
      console.log('Boletim PDF generated successfully with puppeteer, size:', pdfBuffer.length);
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('Error generating boletim PDF:', error);
      throw error;
    }
  }
}

export const pdfGenerator = new PDFGenerator();