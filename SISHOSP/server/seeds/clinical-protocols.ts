import { storage } from "../storage";

export const defaultClinicalProtocols = [
  // EMERGÊNCIAS
  {
    title: "Protocolo de Atendimento ao Infarto Agudo do Miocárdio (IAM)",
    category: "Emergência",
    condition: "Infarto Agudo do Miocárdio",
    description: "Protocolo de atendimento emergencial para pacientes com suspeita de IAM",
    sections: [
      {
        title: "Reconhecimento Inicial",
        content: "- Dor torácica súbita, opressiva, irradiando para braço esquerdo, mandíbula ou epigástrio\n- Sudorese fria, náuseas, vômitos, dispneia\n- ECG: supradesnivelamento de ST em duas derivações contíguas\n- Biomarcadores: troponina, CK-MB elevados"
      },
      {
        title: "Condutas Imediatas",
        content: "1. Chamar equipe de emergência\n2. Monitorização cardíaca contínua\n3. Oxigenoterapia se SpO2 < 90%\n4. Acesso venoso periférico calibroso\n5. AAS 200-300mg VO (mastigar)\n6. Clopidogrel 300mg VO\n7. Morfina 2-4mg IV para analgesia\n8. Nitroglicerina sublingual (se PA sistólica > 90mmHg)"
      },
      {
        title: "Estratificação e Reperfusão",
        content: "- IAM com supradesnivelamento de ST: reperfusão em até 120 minutos\n- Primeira escolha: angioplastia primária (porta-balão < 90min)\n- Alternativa: fibrinolítico (estreptoquinase, tenecteplase) se ICP indisponível\n- Contraindicações à fibrinólise: AVC prévio, cirurgia recente, sangramento ativo"
      },
      {
        title: "Medicações de Manutenção",
        content: "- Betabloqueador: metoprolol 25-50mg 12/12h\n- IECA: captopril 6,25-12,5mg 8/8h ou enalapril 2,5-5mg 12/12h\n- Estatina: atorvastatina 40-80mg/dia\n- Antiagregação dupla: AAS + clopidogrel/ticagrelor por 12 meses"
      }
    ],
    tags: ["emergência", "cardiologia", "iam", "infarto", "reperfusão"],
    source: "Diretriz da Sociedade Brasileira de Cardiologia",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },
  {
    title: "Protocolo de Crise Hipertensiva",
    category: "Emergência",
    condition: "Crise Hipertensiva",
    description: "Manejo de urgência e emergência hipertensiva",
    sections: [
      {
        title: "Classificação",
        content: "URGÊNCIA HIPERTENSIVA:\n- PA ≥ 180/120 mmHg SEM lesão de órgão-alvo\n- Reduzir PA em 24-48h\n\nEMERGÊNCIA HIPERTENSIVA:\n- PA ≥ 180/120 mmHg COM lesão de órgão-alvo\n- Reduzir PA em minutos a horas (máximo 25% na primeira hora)"
      },
      {
        title: "Identificação de Lesão de Órgão-Alvo",
        content: "- Encefalopatia hipertensiva\n- AVC isquêmico ou hemorrágico\n- Síndrome coronariana aguda\n- Edema agudo de pulmão\n- Dissecção de aorta\n- Eclâmpsia/pré-eclâmpsia grave\n- Insuficiência renal aguda"
      },
      {
        title: "Tratamento - Urgência Hipertensiva",
        content: "VIA ORAL (ambulatorial ou observação):\n- Captopril 25mg sublingual\n- Anlodipino 5-10mg VO\n- Clonidina 0,1-0,2mg VO\n- Propranolol 40mg VO\n\nReavaliação em 1-2 horas e ajuste conforme resposta"
      },
      {
        title: "Tratamento - Emergência Hipertensiva",
        content: "VIA ENDOVENOSA (UTI/emergência):\n- Nitroprussiato de sódio: 0,25-10 mcg/kg/min IV\n- Nitroglicerina: 5-100 mcg/min IV (IAM, edema pulmonar)\n- Esmolol: 500 mcg/kg bolus + 50-300 mcg/kg/min (dissecção aorta)\n- Furosemida: 20-40mg IV (edema pulmonar)\n- Hidralazina: 10-20mg IV (pré-eclâmpsia)\n\nMonitorização contínua de PA, FC, ECG"
      }
    ],
    tags: ["emergência", "hipertensão", "crise hipertensiva", "cardiologia"],
    source: "Diretriz Brasileira de Hipertensão Arterial",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },
  {
    title: "Protocolo de Asma Aguda / Crise Asmática",
    category: "Emergência",
    condition: "Crise Asmática",
    description: "Atendimento emergencial de exacerbação aguda de asma",
    sections: [
      {
        title: "Avaliação da Gravidade",
        content: "LEVE/MODERADA:\n- SpO2 > 90%\n- FR < 25 irpm\n- FC < 110 bpm\n- Consegue falar frases completas\n\nGRAVE:\n- SpO2 < 90%\n- FR > 25 irpm\n- FC > 110 bpm\n- Fala apenas palavras\n- Tiragem intercostal\n\nMUITO GRAVE (ameaça à vida):\n- SpO2 < 85%\n- Cianose, confusão mental\n- Tórax silencioso\n- Bradicardia, hipotensão"
      },
      {
        title: "Tratamento Inicial",
        content: "1. Oxigenoterapia: manter SpO2 ≥ 90-92%\n2. Broncodilatador de curta ação (SABA):\n   - Fenoterol 5 gotas + soro fisiológico 3ml (nebulização)\n   - ou Salbutamol 2,5-5mg nebulização\n   - Repetir a cada 20 minutos (até 3 doses)\n\n3. Corticosteróide sistêmico:\n   - Prednisona 40-60mg VO\n   - ou Hidrocortisona 200mg IV\n   - ou Metilprednisolona 125mg IV"
      },
      {
        title: "Terapia Adjuvante",
        content: "Se crise grave ou sem melhora:\n- Brometo de ipratrópio: 20 gotas nebulização (associar ao SABA)\n- Sulfato de magnésio: 2g IV em 20 min (broncodilatação adicional)\n- Considerar aminofilina IV (sob monitorização)\n\nSinais de falência respiratória → IOT + ventilação mecânica"
      },
      {
        title: "Critérios de Alta e Internação",
        content: "ALTA (após observação 1-2h):\n- Melhora clínica sustentada\n- SpO2 > 92% em ar ambiente\n- PFE > 70% do previsto\n- Prescrever: broncodilatador + corticoide oral 5-7 dias\n\nINTERNAÇÃO:\n- Crise grave/refratária\n- SpO2 < 90% persistente\n- Comorbidades (cardiopatia, DPOC)\n- Condições sociais desfavoráveis"
      }
    ],
    tags: ["emergência", "pneumologia", "asma", "broncoespasmo", "dispneia"],
    source: "GINA 2024 - Global Initiative for Asthma",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },
  {
    title: "Protocolo de Acidente Vascular Cerebral (AVC) Agudo",
    category: "Emergência",
    condition: "AVC Isquêmico",
    description: "Protocolo de atendimento emergencial para AVC agudo",
    sections: [
      {
        title: "Reconhecimento - Escala SAMU",
        content: "SINAL DE ALERTA (usar escala SAMU):\n- Sorriso: desvio de rima labial\n- Abraço: fraqueza em membros\n- Música: dificuldade de fala\n- Urgência: tempo é cérebro!\n\nTEMPO DE EVOLUÇÃO:\n< 4,5h: janela para trombólise\n< 6h: janela estendida (casos selecionados)\n< 24h: possível trombectomia mecânica"
      },
      {
        title: "Avaliação Inicial",
        content: "TRIAGEM IMEDIATA:\n1. ABC - estabilização hemodinâmica\n2. Glicemia capilar (corrigir hipo/hiperglicemia)\n3. TC crânio SEM contraste (excluir hemorragia)\n4. Escala NIHSS (gravidade do déficit)\n5. Tempo de início dos sintomas (testemunhado)\n\nDIAGNÓSTICO DIFERENCIAL:\n- Hemorragia intracraniana\n- Enxaqueca com aura\n- Crise convulsiva com paralisia de Todd\n- Hipoglicemia"
      },
      {
        title: "Trombólise com rtPA",
        content: "INDICAÇÕES:\n- AVC isquêmico < 4,5h\n- TC sem sangramento\n- NIHSS ≥ 4 e < 25\n- Idade 18-80 anos (relativo)\n\nCONTRAINDICAÇÕES:\n- TC com hemorragia\n- Cirurgia/trauma recente (< 14 dias)\n- PA > 185/110 mmHg (refratária)\n- Glicemia < 50 ou > 400 mg/dL\n- Uso de anticoagulante (INR > 1,7)\n\nDOSE: Alteplase 0,9 mg/kg IV\n- 10% em bolus (1 minuto)\n- 90% em infusão (60 minutos)"
      },
      {
        title: "Manejo Pós-Trombólise",
        content: "MONITORIZAÇÃO INTENSIVA (24h):\n- PA: manter < 180/105 mmHg\n- Exame neurológico: a cada 1h (primeiras 6h)\n- TC controle: 24h pós-trombólise\n- Sinais de sangramento: cefaleia súbita, rebaixamento\n\nANTIAGREGAÇÃO:\n- Aguardar 24h após trombólise\n- AAS 300mg/dia (primeiras 48h)\n- Depois AAS 100mg/dia indefinidamente\n- Considerar dupla antiagregação (AAS + clopidogrel) primeiros 21 dias"
      }
    ],
    tags: ["emergência", "neurologia", "avc", "trombólise", "isquemia cerebral"],
    source: "Diretrizes da Academia Brasileira de Neurologia",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },
  {
    title: "Protocolo de Choque Séptico",
    category: "Emergência",
    condition: "Sepse e Choque Séptico",
    description: "Manejo inicial da sepse e choque séptico",
    sections: [
      {
        title: "Critérios Diagnósticos",
        content: "SEPSE (SOFA ≥ 2):\n- Infecção confirmada ou suspeita\n+ Disfunção orgânica aguda\n\nCHOQUE SÉPTICO:\n- Sepse + Hipotensão refratária a volume\n- PAM < 65 mmHg apesar de ressuscitação\n- Lactato > 2 mmol/L\n- Necessidade de vasopressor"
      },
      {
        title: "Pacote de 1 Hora (Bundle Sepse)",
        content: "1. COLHER CULTURAS antes de antibiótico\n   - Hemoculturas (2 pares)\n   - Urocultura, culturas de focos\n\n2. ANTIBIÓTICO de amplo espectro IV\n   - Iniciar em até 1 hora\n\n3. RESSUSCITAÇÃO VOLÊMICA\n   - 30ml/kg de cristaloide IV (primeira hora)\n   - Ringer lactato ou SF 0,9%\n\n4. MENSURAR LACTATO\n   - Se > 2 mmol/L: ressuscitação agressiva"
      },
      {
        title: "Antibioticoterapia Empírica",
        content: "FOCO URINÁRIO:\n- Ceftriaxona 2g IV 12/12h\n\nFOCO PULMONAR:\n- Ceftriaxona 2g IV + Azitromicina 500mg IV\n\nFOCO ABDOMINAL:\n- Piperacilina-tazobactam 4,5g IV 6/6h\n- ou Meropenem 1g IV 8/8h\n\nFOCO DESCONHECIDO:\n- Piperacilina-tazobactam 4,5g IV 6/6h\n- + Vancomicina 15-20mg/kg IV 12/12h"
      },
      {
        title: "Suporte Hemodinâmico",
        content: "VASOPRESSOR DE ESCOLHA:\n- Noradrenalina 0,05-2 mcg/kg/min IV\n- Alvo: PAM ≥ 65 mmHg\n\nALTERNATIVAS:\n- Vasopressina 0,03-0,04 U/min (poupador)\n- Adrenalina (se refratário)\n\nCORTICOIDE:\n- Hidrocortisona 200mg/dia IV\n- Se choque refratário a volume + vasopressor"
      }
    ],
    tags: ["emergência", "sepse", "choque séptico", "uti", "antibiótico"],
    source: "Surviving Sepsis Campaign 2024",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },
  {
    title: "Protocolo de Anafilaxia",
    category: "Emergência",
    condition: "Reação Anafilática",
    description: "Atendimento emergencial de anafilaxia",
    sections: [
      {
        title: "Reconhecimento",
        content: "CRITÉRIOS DE ANAFILAXIA:\n1. Início agudo (minutos a horas) de sintomas cutâneos + respiratórios ou cardiovasculares\n2. Dois ou mais: pele, respiratório, cardiovascular, gastrointestinal\n3. Hipotensão após exposição a alérgeno conhecido\n\nSINTOMAS:\n- Urticária, angioedema, prurido\n- Broncoespasmo, estridor, dispneia\n- Hipotensão, síncope, choque\n- Náuseas, vômitos, dor abdominal"
      },
      {
        title: "Tratamento Imediato",
        content: "1. ADRENALINA IM (primeira linha)\n   - Adultos: 0,3-0,5 mg (0,3-0,5ml da solução 1:1000)\n   - Crianças: 0,01 mg/kg (máx 0,3mg)\n   - Local: vasto lateral da coxa\n   - Repetir a cada 5-15 min se necessário\n\n2. Posicionar paciente DEITADO com MMII elevados\n\n3. Oxigênio 100% sob máscara\n\n4. Acesso venoso + expansão volêmica\n   - SF 0,9% 1-2L rápido (adultos)\n   - 20ml/kg (crianças)"
      },
      {
        title: "Terapia Adjuvante",
        content: "ANTI-HISTAMÍNICO:\n- Prometazina 25-50mg IM/IV lento\n- ou Difenidramina 25-50mg IM/IV\n\nCORTICOIDE:\n- Metilprednisolona 1-2mg/kg IV\n- ou Hidrocortisona 200mg IV\n\nBRONCODILATADOR (se broncoespasmo):\n- Salbutamol nebulização contínua\n\nGLUCAGON (se em uso de betabloqueador):\n- 1-2mg IV/IM a cada 5 min"
      },
      {
        title: "Observação e Alta",
        content: "OBSERVAÇÃO:\n- Mínimo 4-6 horas após sintomas controlados\n- Até 24h se reação bifásica (10-20% dos casos)\n\nALTA:\n- Prescrever adrenalina autoinjetável\n- Orientar: identificar e evitar gatilho\n- Encaminhar para alergologista\n- Pulseira de identificação médica"
      }
    ],
    tags: ["emergência", "anafilaxia", "alergia", "adrenalina", "choque"],
    source: "Diretrizes AAAI/ACAAI",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },

  // CARDIOLOGIA
  {
    title: "Protocolo de Insuficiência Cardíaca Descompensada",
    category: "Cardiologia",
    condition: "Insuficiência Cardíaca",
    description: "Manejo da insuficiência cardíaca aguda descompensada",
    sections: [
      {
        title: "Classificação Clínica",
        content: "PERFIL HEMODINÂMICO:\n- QUENTE E SECO: bem compensado\n- QUENTE E ÚMIDO: congestão sem hipoperfusão (mais comum)\n- FRIO E ÚMIDO: congestão + hipoperfusão (choque cardiogênico)\n- FRIO E SECO: hipoperfusão sem congestão\n\nSINAIS DE CONGESTÃO:\n- Dispneia, ortopneia, DPN\n- Turgência jugular, edema MMII\n- Estertores pulmonares\n\nSINAIS DE HIPOPERFUSÃO:\n- Extremidades frias, cianose\n- Rebaixamento, oligúria\n- Lactato elevado"
      },
      {
        title: "Tratamento Inicial",
        content: "1. OXIGENOTERAPIA:\n   - Manter SpO2 > 90%\n   - CPAP/VNI se insuficiência respiratória\n\n2. DIURÉTICO IV:\n   - Furosemida 20-80mg IV em bolus\n   - Dobrar dose se já usa oral\n   - Infusão contínua se refratário (5-40mg/h)\n\n3. VASODILATADOR (se PA sistólica > 110 mmHg):\n   - Nitroglicerina 5-200 mcg/min IV\n   - ou Nitroprussiato 0,3-5 mcg/kg/min IV\n\n4. RESTRIÇÃO HÍDRICA:\n   - < 1500 ml/dia\n   - Dieta hipossódica"
      },
      {
        title: "Terapia Avançada",
        content: "SE CHOQUE CARDIOGÊNICO:\n- Dobutamina 2-20 mcg/kg/min (inotrópico)\n- Noradrenalina se PA muito baixa\n- Considerar balão intra-aórtico\n\nSE EDEMA AGUDO DE PULMÃO:\n- Morfina 2-4mg IV (reduz pré-carga)\n- CPAP 10 cmH2O\n- Furosemida dose alta IV\n\nSE REFRATÁRIO:\n- Ultrafiltração\n- Transplante cardíaco"
      },
      {
        title: "Tratamento Crônico (após compensar)",
        content: "MEDICAÇÕES DE BASE:\n- IECA ou BRA: enalapril, losartana\n- Betabloqueador: carvedilol, bisoprolol\n- Espironolactona (se FE < 35%)\n- iSGLT2: dapagliflozina, empagliflozina\n\nMONITORIZAÇÃO:\n- Peso diário\n- Balanço hídrico\n- Eletrólitos (K, Na, Cr)\n- Ecocardiograma de controle"
      }
    ],
    tags: ["cardiologia", "insuficiência cardíaca", "edema pulmonar", "dispneia"],
    source: "Diretriz Brasileira de Insuficiência Cardíaca",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },
  {
    title: "Protocolo de Fibrilação Atrial Aguda",
    category: "Cardiologia",
    condition: "Fibrilação Atrial",
    description: "Manejo da fibrilação atrial de início recente",
    sections: [
      {
        title: "Classificação e Avaliação",
        content: "TIPOS:\n- Primeiro episódio\n- Paroxística (< 7 dias, autolimitada)\n- Persistente (> 7 dias)\n- Permanente (aceita)\n\nAVALIAÇÃO INICIAL:\n- ECG 12 derivações\n- Tempo de início dos sintomas\n- Sinais de instabilidade hemodinâmica\n- Fatores precipitantes: IAM, TEP, hipertireoidismo, álcool"
      },
      {
        title: "Controle de Frequência",
        content: "META: FC 80-110 bpm em repouso\n\nBETABLOQUEADOR (primeira escolha):\n- Metoprolol 2,5-5mg IV lento (bolus)\n- ou Atenolol 25-50mg VO\n\nBLOQUEADOR DE CANAL DE CÁLCIO:\n- Diltiazem 0,25 mg/kg IV (se CI a betabloqueador)\n- ou Verapamil 5-10mg IV lento\n\nDIGOXINA (se IC ou sedentário):\n- Dose de ataque: 0,5mg IV\n- Manutenção: 0,125-0,25mg/dia VO"
      },
      {
        title: "Reversão ao Ritmo Sinusal",
        content: "CARDIOVERSÃO ELÉTRICA (instabilidade):\n- Choque sincronizado 100-200J bifásico\n- Sob sedação consciente\n\nCARDIOVERSÃO QUÍMICA (estável, < 48h):\n- Propafenona 600mg VO (dose única)\n- ou Amiodarona 5mg/kg IV em 1h + manutenção\n\nSE > 48h OU TEMPO INCERTO:\n- Anticoagular 3 semanas antes\n- ou ETE para excluir trombo\n- Anticoagular 4 semanas após cardioversão"
      },
      {
        title: "Anticoagulação",
        content: "ESCORE CHA2DS2-VASc (risco de AVC):\n- IC/FE < 40%: 1 ponto\n- HAS: 1 ponto\n- Idade ≥ 75 anos: 2 pontos\n- Diabetes: 1 ponto\n- AVC prévio: 2 pontos\n- Doença vascular: 1 ponto\n- Idade 65-74: 1 ponto\n- Sexo feminino: 1 ponto\n\nANTICOAGULAÇÃO:\n- ≥ 2 pontos (homens) ou ≥ 3 (mulheres): anticoagular\n- DOACs: apixabana, rivaroxabana, dabigatrana\n- ou Varfarina (INR 2-3)"
      }
    ],
    tags: ["cardiologia", "arritmia", "fibrilação atrial", "cardioversão"],
    source: "Diretriz Brasileira de Fibrilação Atrial",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },

  // NEUROLOGIA
  {
    title: "Protocolo de Cefaleia na Emergência",
    category: "Neurologia",
    condition: "Cefaleia",
    description: "Avaliação e manejo de cefaleia aguda",
    sections: [
      {
        title: "Sinais de Alarme (Red Flags)",
        content: "INVESTIGAR URGENTE SE:\n- Cefaleia súbita, intensa ('pior da vida')\n- Associada a déficit neurológico focal\n- Alteração do nível de consciência\n- Febre + rigidez de nuca\n- Início após 50 anos\n- Piora progressiva ou mudança de padrão\n- Desencadeada por tosse, exercício, Valsalva\n- Papiledema ao fundo de olho"
      },
      {
        title: "Diagnóstico Diferencial",
        content: "CAUSAS GRAVES:\n- Hemorragia subaracnóidea (TC urgente)\n- Meningite/encefalite (punção lombar)\n- AVC/AIT (TC + RM)\n- Tumor cerebral, abscesso\n- Trombose venosa cerebral\n- Hipertensão intracraniana\n- Arterite temporal (> 50 anos)\n\nCAUSAS BENIGNAS:\n- Enxaqueca\n- Cefaleia tensional\n- Cefaleia em salvas"
      },
      {
        title: "Tratamento de Enxaqueca Aguda",
        content: "TRIPTANOS (primeira linha):\n- Sumatriptano 50-100mg VO\n- ou Sumatriptano 6mg SC\n- ou Naratriptano 2,5mg VO\n- Contraindicado: cardiopatia, HAS não controlada\n\nANALGÉSICOS:\n- Dipirona 1g IV lento\n- Paracetamol 1g VO\n- AINE: cetoprofeno 100mg IM/IV\n\nANTIEMÉTICO:\n- Metoclopramida 10mg IV\n- ou Bromoprida 10mg IM/IV"
      },
      {
        title: "Tratamento de Cefaleia Tensional",
        content: "AGUDA:\n- Paracetamol 1g VO\n- ou Dipirona 1g VO/IV\n- ou AINE (ibuprofeno, cetoprofeno)\n\nPREVENÇÃO (crônica):\n- Amitriptilina 25-75mg/dia\n- Relaxamento muscular\n- Fisioterapia\n- Gerenciamento de estresse\n\nEVITAR:\n- Uso excessivo de analgésicos (> 10 dias/mês)\n- Risco de cefaleia por abuso medicamentoso"
      }
    ],
    tags: ["neurologia", "cefaleia", "enxaqueca", "dor de cabeça"],
    source: "Sociedade Brasileira de Cefaleia",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },
  {
    title: "Protocolo de Crise Convulsiva",
    category: "Neurologia",
    condition: "Convulsão / Estado de Mal Epiléptico",
    description: "Manejo de crise convulsiva aguda e estado de mal epiléptico",
    sections: [
      {
        title: "Primeira Crise Convulsiva - Avaliação",
        content: "INVESTIGAÇÃO INICIAL:\n- Glicemia capilar (hipoglicemia)\n- Eletrólitos (Na, Ca, Mg)\n- TC crânio (se primeira crise no adulto)\n- Toxicológico (se suspeita)\n- EEG (após estabilização)\n\nCAUSAS SECUNDÁRIAS:\n- Hipoglicemia, hiponatremia\n- AVC, TCE, tumor cerebral\n- Infecção SNC (meningite, encefalite)\n- Abstinência (álcool, benzodiazepínico)\n- Intoxicação (cocaína, anfetaminas)"
      },
      {
        title: "Tratamento da Crise Aguda",
        content: "MEDIDAS GERAIS:\n1. Proteger vias aéreas (decúbito lateral)\n2. Oxigênio sob máscara\n3. Acesso venoso\n4. Glicose se hipoglicemia\n\nANTICONVULSIVANTE DE ESCOLHA:\n- Diazepam 10mg IV lento (2-5 min)\n- ou Midazolam 10mg IM\n- Repetir após 5-10 min se persistir\n\nSE REFRATÁRIO (> 5 min):\n- Fenitoína 20mg/kg IV (máx 50mg/min)\n- ou Ácido valproico 20-40mg/kg IV"
      },
      {
        title: "Estado de Mal Epiléptico",
        content: "DEFINIÇÃO:\n- Convulsão > 5 minutos\n- ou ≥ 2 crises sem recuperação entre elas\n\nTRATAMENTO ESCALONADO:\n1. Diazepam 10mg IV (repetir 1x)\n2. Fenitoína 20mg/kg IV em SF 100ml (30 min)\n3. Fenobarbital 20mg/kg IV (se falha)\n4. MIDAZOLAM ou PROPOFOL contínuo (UTI)\n5. Intubação + ventilação mecânica\n\nMONITORIZAÇÃO:\n- ECG (arritmias com fenitoína)\n- PA (hipotensão com propofol)\n- EEG contínuo (se disponível)"
      },
      {
        title: "Prevenção Secundária",
        content: "INICIAR ANTICONVULSIVANTE SE:\n- Segunda crise espontânea\n- Primeira crise com lesão estrutural\n- EEG anormal\n- Estado de mal epiléptico\n\nOPÇÕES DE MANUTENÇÃO:\n- Fenitoína 300mg/dia VO\n- Ácido valproico 500-2000mg/dia VO\n- Carbamazepina 400-1200mg/dia VO\n- Levetiracetam 1000-3000mg/dia VO\n\nENCAMINHAMENTO:\n- Neurologista para ajuste\n- Orientar: evitar álcool, privação de sono\n- Restrição de dirigir veículos"
      }
    ],
    tags: ["neurologia", "convulsão", "epilepsia", "estado de mal epiléptico"],
    source: "Liga Brasileira de Epilepsia",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },
  {
    title: "Protocolo de Meningite Bacteriana",
    category: "Neurologia",
    condition: "Meningite",
    description: "Diagnóstico e tratamento de meningite bacteriana aguda",
    sections: [
      {
        title: "Reconhecimento Clínico",
        content: "TRÍADE CLÁSSICA (nem sempre presente):\n- Febre\n- Cefaleia intensa\n- Rigidez de nuca\n\nOUTROS SINAIS:\n- Alteração do nível de consciência\n- Fotofobia, fonofobia\n- Náuseas e vômitos\n- Petéquias/púrpuras (meningococo)\n- Kernig e Brudzinski positivos\n\nGRUPOS DE RISCO:\n- Imunossuprimidos, esplenectomizados\n- Extremos de idade (< 1 ano, > 60 anos)"
      },
      {
        title: "Investigação Diagnóstica",
        content: "PUNÇÃO LOMBAR (urgente):\n- Análise do LCR: celularidade, bioquímica, bacterioscopia, cultura\n- MENINGITE BACTERIANA:\n  • Aspecto turvo/purulento\n  • Leucócitos > 1000/mm³ (neutrófilos)\n  • Proteínas > 100 mg/dL\n  • Glicose < 40 mg/dL (< 2/3 da glicemia)\n\nCONTRAINDICAÇÕES À PL:\n- Sinais de hipertensão intracraniana\n- Lesão expansiva (TC mostrar)\n- Coagulopatia grave\n\nFazer TC antes se: coma, déficit focal, papiledema, imunossupressão"
      },
      {
        title: "Antibioticoterapia Empírica",
        content: "INICIAR IMEDIATAMENTE (não aguardar PL):\n\nADULTO IMUNOCOMPETENTE:\n- Ceftriaxona 2g IV 12/12h\n+ Vancomicina 15-20mg/kg IV 8-12h\n\nIDOSO (> 50 anos) OU IMUNOSSUPRIMIDO:\n- Ceftriaxona + Vancomicina\n+ Ampicilina 2g IV 4/4h (Listeria)\n\nNEONATO:\n- Ampicilina + Gentamicina\n- ou Ampicilina + Cefotaxima\n\nDEXAMETASONA:\n- 10mg IV 15-20 min ANTES do antibiótico\n- Repetir 6/6h por 4 dias\n- Reduz sequelas neurológicas"
      },
      {
        title: "Manejo e Complicações",
        content: "MEDIDAS DE SUPORTE:\n- Hidratação adequada (evitar sobrecarga)\n- Controle de febre e dor\n- Isolamento respiratório (primeiras 24h)\n- Profilaxia de contatos (rifampicina)\n\nCOMPLICAÇÕES:\n- Hidrocefalia\n- Abscesso cerebral\n- Trombose venosa\n- Sequelas: surdez, déficit cognitivo\n\nNOTIFICAÇÃO:\n- Meningite bacteriana é de notificação compulsória imediata\n- Preencher ficha SINAN"
      }
    ],
    tags: ["neurologia", "infectologia", "meningite", "antibiótico", "punção lombar"],
    source: "Protocolo Clínico e Diretrizes Terapêuticas - Ministério da Saúde",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },

  // ENDOCRINOLOGIA
  {
    title: "Protocolo de Diabetes Mellitus - Manejo Ambulatorial",
    category: "Endocrinologia",
    condition: "Diabetes Mellitus",
    description: "Protocolo para manejo ambulatorial de pacientes diabéticos",
    sections: [
      {
        title: "Classificação e Diagnóstico",
        content: "CRITÉRIOS DIAGNÓSTICOS:\n- Glicemia de jejum ≥ 126 mg/dL (em 2 ocasiões)\n- HbA1c ≥ 6,5%\n- Glicemia 2h pós-sobrecarga ≥ 200 mg/dL\n- Glicemia casual ≥ 200 mg/dL + sintomas\n\nTIPOS:\n- DM1: destruição autoimune células beta\n- DM2: resistência insulínica + deficiência relativa\n- DM gestacional\n- Outros tipos específicos"
      },
      {
        title: "Metas Terapêuticas",
        content: "CONTROLE GLICÊMICO:\n- HbA1c < 7% (maioria dos adultos)\n- HbA1c < 8% (idosos frágeis, comorbidades)\n- Glicemia jejum: 80-130 mg/dL\n- Glicemia pós-prandial: < 180 mg/dL\n\nOUTRAS METAS:\n- PA < 140/90 mmHg (< 130/80 se jovem)\n- LDL < 70 mg/dL (alto risco CV)\n- Peso: redução 5-10% se sobrepeso"
      },
      {
        title: "Tratamento - DM2 Inicial",
        content: "1ª LINHA - Metformina:\n- Iniciar 500-850mg/dia com refeição\n- Titular até 2000-2550mg/dia (dividir doses)\n- Efeitos: reduz gliconeogênese hepática\n- Contraindicações: TFG < 30, hepatopatia grave\n\nModificações de estilo de vida:\n- Dieta hipocalórica (redução 500kcal/dia)\n- Exercício aeróbico 150min/semana\n- Suspensão do tabagismo"
      },
      {
        title: "Tratamento - Terapia Combinada",
        content: "Se HbA1c > 7% após 3 meses de metformina:\n\nPaciente com DCV ou alto risco:\n- Adicionar: iSGLT2 ou agonista GLP-1\n\nPaciente sem DCV:\n- iDPP4 (sitagliptina, vildagliptina)\n- Sulfonilureia (glibenclamida, gliclazida)\n- iSGLT2 (dapagliflozina, empagliflozina)\n- Agonista GLP-1 (liraglutida, semaglutida)\n\nInsulina basal se HbA1c > 10% ou glicemia > 300 mg/dL"
      }
    ],
    tags: ["endocrinologia", "diabetes", "dm2", "hiperglicemia", "metformina"],
    source: "Diretrizes SBD 2024",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },
  {
    title: "Protocolo de Cetoacidose Diabética",
    category: "Endocrinologia",
    condition: "Cetoacidose Diabética",
    description: "Manejo emergencial da cetoacidose diabética",
    sections: [
      {
        title: "Critérios Diagnósticos",
        content: "TRÍADE DA CAD:\n1. Hiperglicemia (> 250 mg/dL)\n2. Acidose metabólica (pH < 7,3, HCO3 < 18)\n3. Cetonemia/cetonúria\n\nCLASSIFICAÇÃO DE GRAVIDADE:\nLEVE: pH 7,25-7,30\nMODERADA: pH 7,0-7,24\nGRAVE: pH < 7,0\n\nSINTOMAS:\n- Poliúria, polidipsia, desidratação\n- Náuseas, vômitos, dor abdominal\n- Respiração de Kussmaul\n- Hálito cetônico\n- Alteração da consciência"
      },
      {
        title: "Reposição Volêmica",
        content: "FASE 1 - EXPANSÃO INICIAL:\n- SF 0,9% 1-2L na primeira hora\n- Meta: restaurar perfusão periférica\n\nFASE 2 - MANUTENÇÃO (após primeira hora):\nSe Na normal ou alto:\n- SF 0,45% 250-500 ml/h\n\nSe Na baixo:\n- SF 0,9% 250-500 ml/h\n\nQuando glicemia < 250 mg/dL:\n- Trocar para SG 5% + SF 0,45%\n- Meta: glicemia 150-200 mg/dL"
      },
      {
        title: "Insulinoterapia",
        content: "INSULINA REGULAR IV:\n1. Bolus: 0,1 U/kg IV\n2. Infusão contínua: 0,1 U/kg/h\n   - Diluir 50U em 250ml SF (1U = 5ml)\n   - Velocidade: peso(kg) x 0,5 = ml/h\n\nAJUSTE:\n- Se glicemia não cair 50-70 mg/dL/h → dobrar infusão\n- Quando glicemia < 250 mg/dL → reduzir para 0,05 U/kg/h\n- Manter infusão até resolução da acidose\n\nRESOLUÇÃO:\n- Glicemia < 200 mg/dL\n- pH > 7,3\n- HCO3 > 18 mEq/L"
      },
      {
        title: "Reposição de Eletrólitos",
        content: "POTÁSSIO:\n- Se K < 3,3 → repor ANTES de insulina (arritmia)\n- Se K 3,3-5,0 → adicionar 20-30 mEq/L na solução\n- Se K > 5,0 → aguardar e monitorar\n- Meta: manter K entre 4-5 mEq/L\n\nFOSFATO (se < 1 mg/dL):\n- Fosfato de potássio 20-30 mEq/L\n\nBICARBONATO (controverso):\n- Considerar apenas se pH < 6,9\n- NaHCO3 100 mEq em 400ml (2h)\n- Risco de hipocalemia e edema cerebral"
      }
    ],
    tags: ["endocrinologia", "emergência", "cetoacidose", "diabetes", "insulina"],
    source: "ADA - American Diabetes Association",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },

  // GASTROENTEROLOGIA
  {
    title: "Protocolo de Hemorragia Digestiva Alta",
    category: "Gastroenterologia",
    condition: "Hemorragia Digestiva Alta",
    description: "Manejo inicial da hemorragia digestiva alta não-varicosa",
    sections: [
      {
        title: "Reconhecimento e Estratificação",
        content: "MANIFESTAÇÕES:\n- Hematêmese (vômito com sangue)\n- Melena (fezes enegrecidas)\n- Hematoquezia (sangue vivo - HDA volumosa)\n\nESCORE DE GLASGOW-BLATCHFORD (risco):\n- Ureia, Hb, PA sistólica, FC\n- Melena, síncope, doença hepática, cardíaca\n- 0 pontos: alta precoce possível\n- ≥ 6 pontos: alto risco, intervenção provável\n\nCAUSAS:\n- Úlcera péptica (50%)\n- Varizes esofágicas (20%)\n- Gastrite/duodenite erosiva\n- Síndrome de Mallory-Weiss"
      },
      {
        title: "Ressuscitação Inicial",
        content: "MEDIDAS IMEDIATAS:\n1. 2 acessos venosos calibrosos (14-16G)\n2. Colher: hemograma, coagulograma, função renal, tipagem\n3. Monitorização: PA, FC, diurese\n4. O2 se instabilidade\n5. SNG (controversa, considerar se hematêmese maciça)\n\nREPOSIÇÃO VOLÊMICA:\n- Cristaloide (SF ou Ringer) 1-2L rápido\n- Meta: PAM > 65 mmHg, FC < 100 bpm\n\nHEMOTRANSFUSÃO:\n- Estratégia restritiva: Hb < 7 g/dL (alvo 7-9)\n- Liberal se: isquemia miocárdica ativa, Hb < 8"
      },
      {
        title: "Tratamento Medicamentoso",
        content: "INIBIDOR DE BOMBA DE PRÓTONS:\n- Omeprazol 80mg IV bolus\n- Seguido de 8mg/h em infusão contínua (72h)\n- ou Pantoprazol 80mg IV + 8mg/h\n\nPRÓ-CINÉTICO (reduz necessidade de EDA 2ª):\n- Eritromicina 250mg IV 30-60 min antes da EDA\n- Melhora visualização (clearance de coágulos)\n\nÁCIDO TRANEXÂMICO (controverso):\n- 1g IV 8/8h\n- Evidência limitada em HDA\n\nEVITAR:\n- Vasoconstritores (terlipressina) em HDA não-varicosa"
      },
      {
        title: "Endoscopia e Tratamento Definitivo",
        content: "TIMING DA EDA:\n- Urgente (< 12h): instabilidade hemodinâmica\n- Precoce (< 24h): alto risco (Glasgow ≥ 12)\n- Eletiva (24-48h): baixo risco\n\nTERAPIA ENDOSCÓPICA:\n- Injeção de adrenalina 1:10.000\n- + Hemostasia térmica (eletrocoagulação)\n- ou + Hemostasia mecânica (clipes)\n- Terapia dupla superior a monoterapia\n\nFALHA ENDOSCÓPICA:\n- Re-endoscopia em 24h\n- Embolização por radiologia intervencionista\n- Cirurgia (última opção)"
      }
    ],
    tags: ["gastroenterologia", "hemorragia digestiva", "endoscopia", "hematêmese"],
    source: "Diretriz SOBED de Hemorragia Digestiva",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },
  {
    title: "Protocolo de Pancreatite Aguda",
    category: "Gastroenterologia",
    condition: "Pancreatite Aguda",
    description: "Diagnóstico e manejo da pancreatite aguda",
    sections: [
      {
        title: "Critérios Diagnósticos",
        content: "NECESSÁRIO 2 DE 3 CRITÉRIOS:\n1. Dor abdominal característica\n   - Súbita, epigástrica, em barra\n   - Irradia para dorso\n   \n2. Amilase ou lipase > 3x o normal\n   - Lipase mais específica\n   \n3. TC com alterações compatíveis\n\nETIOLOGIA:\n- Biliar (40%): colelitíase\n- Alcoólica (30%)\n- Hipertrigliceridemia (> 1000 mg/dL)\n- CPRE, medicamentos, trauma"
      },
      {
        title: "Estratificação de Gravidade",
        content: "CRITÉRIOS DE ATLANTA REVISADOS:\n\nLEVE:\n- Sem falência orgânica\n- Sem complicações locais/sistêmicas\n- Resolução em < 1 semana\n\nMODERADA:\n- Falência orgânica transitória (< 48h)\n- ou Complicações locais\n\nGRAVE:\n- Falência orgânica persistente (> 48h)\n- Mortalidade 20-30%\n\nESCORES PROGNÓSTICOS:\n- APACHE II > 8: grave\n- Ranson ≥ 3: maior mortalidade\n- PCR > 150 mg/L em 48h: necrose"
      },
      {
        title: "Tratamento Inicial",
        content: "MEDIDAS GERAIS:\n1. JEJUM inicial\n2. HIDRATAÇÃO VIGOROSA\n   - Ringer lactato 250-500 ml/h\n   - Meta: diurese > 0,5 ml/kg/h\n   - Reduz necrose pancreática\n\n3. ANALGESIA\n   - Dipirona 1g IV 6/6h\n   - Morfina (evitar meperidina)\n\n4. ANTIEMÉTICO\n   - Metoclopramida, ondansetrona\n\nNÃO USAR:\n- Antibiótico profilático (exceto se necrose infectada)\n- Inibidor de bomba (sem benefício comprovado)"
      },
      {
        title: "Nutrição e Complicações",
        content: "REINTRODUÇÃO ALIMENTAR:\n- Iniciar dieta VO quando dor melhorar\n- Iniciar com líquidos → dieta leve\n- Se intolerância: nutrição enteral (preferir a parenteral)\n- SNE pós-pilórica se necessário\n\nCOMPLICAÇÕES:\n- Necrose pancreática\n  • Antibiótico se infectada (imipenem, meropenem)\n  • Necrosectomia se refratária\n  \n- Pseudocisto\n  • Drenagem se sintomático (> 6 semanas)\n  \n- Abscesso\n  • Drenagem percutânea + ATB\n\nPANCREATITE BILIAR:\n- CPRE urgente (< 24h) se colangite\n- Colecistectomia na mesma internação (após melhora)"
      }
    ],
    tags: ["gastroenterologia", "pancreatite", "dor abdominal", "amilase"],
    source: "Diretriz Internacional de Pancreatite Aguda",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },

  // PNEUMOLOGIA
  {
    title: "Protocolo de Pneumonia Adquirida na Comunidade (PAC)",
    category: "Pneumologia",
    condition: "Pneumonia Comunitária",
    description: "Diagnóstico e tratamento de pneumonia adquirida na comunidade",
    sections: [
      {
        title: "Diagnóstico Clínico",
        content: "CRITÉRIOS CLÍNICOS:\n- Tosse + pelo menos 1 sintoma respiratório (dispneia, dor torácica, expectoração)\n- Febre ou hipotermia\n- Estertores crepitantes à ausculta\n\nEXAMES COMPLEMENTARES:\n- Raio-X tórax: infiltrado pulmonar novo\n- Hemograma: leucocitose com desvio\n- PCR elevada\n- Saturação O2 (gasometria se grave)"
      },
      {
        title: "Estratificação de Gravidade - CURB-65",
        content: "ESCALA CURB-65 (1 ponto cada):\n- Confusão mental\n- Ureia > 50 mg/dL\n- Respiração (FR ≥ 30 irpm)\n- Blood pressure (PA < 90/60 mmHg)\n- 65 anos ou mais\n\nINTERPRETAÇÃO:\n0-1 ponto: ambulatorial\n2 pontos: considerar internação\n≥ 3 pontos: internação hospitalar (UTI se ≥ 4)"
      },
      {
        title: "Tratamento Ambulatorial",
        content: "SEM COMORBIDADES:\n- Amoxicilina 1g VO 8/8h (7-10 dias)\n- ou Azitromicina 500mg VO 1x/dia (5 dias)\n\nCOM COMORBIDADES (DPOC, DM, cardiopatia):\n- Amoxicilina-clavulanato 875/125mg VO 12/12h\n- + Azitromicina 500mg VO 1x/dia\n- Duração: 7-10 dias\n\nReavaliação em 48-72h"
      },
      {
        title: "Tratamento Hospitalar",
        content: "ENFERMARIA:\n- Ceftriaxona 1-2g IV 1x/dia\n- + Azitromicina 500mg IV 1x/dia\n\nUTI / PAC GRAVE:\n- Ceftriaxona 2g IV 12/12h\n- + Azitromicina 500mg IV 1x/dia\n\nSE RISCO PSEUDOMONAS:\n- Piperacilina-tazobactam 4,5g IV 6/6h\n- ou Cefepime 2g IV 8/8h\n- + Levofloxacino 750mg IV 1x/dia\n\nDuração: 7-10 dias (5-7 se boa evolução)"
      }
    ],
    tags: ["pneumologia", "pneumonia", "infecção respiratória", "antibiótico"],
    source: "Diretrizes Brasileiras de Pneumonia",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },
  {
    title: "Protocolo de DPOC Exacerbada",
    category: "Pneumologia",
    condition: "DPOC Exacerbado",
    description: "Manejo da exacerbação aguda de DPOC",
    sections: [
      {
        title: "Definição e Classificação",
        content: "EXACERBAÇÃO DE DPOC:\n- Piora aguda dos sintomas respiratórios\n- Além da variação diária normal\n- Necessita mudança terapêutica\n\nGRAVIDADE:\nLEVE: aumento de broncodilatador\nMODERADA: + antibiótico e/ou corticoide\nGRAVE: hospitalização ou emergência\n\nFATORES PRECIPITANTES:\n- Infecção viral (50%)\n- Infecção bacteriana (40%)\n- Poluição, embolia pulmonar"
      },
      {
        title: "Tratamento - Broncodilatadores",
        content: "BETA-2 AGONISTA DE CURTA AÇÃO:\n- Fenoterol 10 gotas nebulização 4/4-6/6h\n- ou Salbutamol 2,5-5mg nebulização 4/4-6/6h\n\nANTICOLINÉRGICO:\n- Brometo de ipratrópio 20-40 gotas nebulização\n- Associar ao beta-2 (efeito sinérgico)\n\nESPAÇADOR com MDI:\n- Alternativa à nebulização\n- 4-6 puffs (100 mcg cada) a cada 15-30 min\n\nNÃO usar metilxantinas (aminofilina) rotineiramente"
      },
      {
        title: "Corticoide e Antibiótico",
        content: "CORTICOSTERÓIDE SISTÊMICO:\n- Prednisona 40mg VO 1x/dia (5-7 dias)\n- ou Metilprednisolona 125mg IV 6/6h (se grave)\n- Não prolongar > 14 dias\n\nANTIBIÓTICO (se 2 de 3 critérios):\n1. Aumento da dispneia\n2. Aumento do volume do escarro\n3. Escarro purulento\n\nEscolha:\n- Amoxicilina-clavulanato 875/125mg VO 12/12h\n- ou Azitromicina 500mg VO 1x/dia\n- ou Levofloxacino 750mg VO 1x/dia\n- Duração: 5-7 dias"
      },
      {
        title: "Suporte Ventilatório",
        content: "OXIGENOTERAPIA:\n- Meta: SpO2 88-92% (evitar hiperoxia)\n- Titular O2 com gasometria\n\nVENTILAÇÃO NÃO-INVASIVA (VNI):\nIndicações:\n- Acidose respiratória (pH < 7,35)\n- Hipercapnia (pCO2 > 45 mmHg)\n- FR > 25 irpm\n- Uso de musculatura acessória\n\nBIPAP:\n- IPAP 12-20 cmH2O\n- EPAP 4-8 cmH2O\n- Reduz mortalidade e intubação\n\nIOT (se falha VNI):\n- Rebaixamento do sensório\n- Parada respiratória\n- Instabilidade hemodinâmica"
      }
    ],
    tags: ["pneumologia", "dpoc", "broncodilatador", "dispneia", "vni"],
    source: "GOLD - Global Initiative for COPD",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },

  // INFECTOLOGIA
  {
    title: "Protocolo de Dengue",
    category: "Infectologia",
    condition: "Dengue",
    description: "Classificação e manejo dos casos de dengue",
    sections: [
      {
        title: "Classificação de Risco",
        content: "GRUPO A (sem sinais de alarme):\n- Febre + 2 critérios: cefaleia, mialgia, prostração, exantema\n- Prova do laço negativa\n- Sem comorbidades\n- Manejo ambulatorial\n\nGRUPO B (sinais de alarme):\n- Dor abdominal intensa\n- Vômitos persistentes\n- Sangramento de mucosas\n- Letargia, irritabilidade\n- Hepatomegalia > 2cm\n- Queda de plaquetas + ↑ hematócrito\n- Hidratação venosa\n\nGRUPO C (dengue grave):\n- Choque (hipotensão, perfusão ↓)\n- Sangramento grave\n- Disfunção orgânica\n- UTI"
      },
      {
        title: "Manejo Grupo A (Ambulatorial)",
        content: "HIDRATAÇÃO ORAL:\n- 60 ml/kg/dia para manutenção\n- + 50 ml/kg para perdas (4-6 horas)\n- Oferecer: água, soro caseiro, água de coco, sucos\n\nANALGESIA:\n- Dipirona ou Paracetamol\n- EVITAR: AAS, AINE (risco de sangramento)\n\nORIENTAÇÕES:\n- Repouso\n- Sinais de alarme\n- Retorno em 24-48h ou se piora\n\nEXAMES (se disponível):\n- Hemograma diário até 48h após defervescência"
      },
      {
        title: "Manejo Grupo B (Internação)",
        content: "FASE DE EXPANSÃO:\n1. SF 0,9% ou Ringer 10 ml/kg em 1-2 horas\n2. Reavaliar: se melhora → manutenção\n3. Se não melhora → repetir até 3x\n4. Persistência → tratar como Grupo C\n\nFASE DE MANUTENÇÃO:\n- Reduzir gradualmente volume IV\n- 25 ml/kg até próximas 6h\n- Depois 25 ml/kg nas 18h seguintes\n\nMONITORIZAÇÃO:\n- Hemograma 12/12h\n- Hematócrito, plaquetas\n- Sinais vitais 2/2h\n- Diurese\n\nALTA:\n- 48h sem febre\n- Hematócrito estável\n- Plaquetas em ascensão\n- Ausência sinais de alarme"
      },
      {
        title: "Manejo Grupo C (UTI)",
        content: "CHOQUE COMPENSADO:\n1. SF 0,9% ou Ringer 20 ml/kg em 20 min\n2. Reavaliar: melhorou?\n   - Sim → reduzir para 10 ml/kg/h (2h)\n   - Não → repetir bolus (até 3x)\n3. Se refratário → expansor plasmático\n\nCHOQUE HIPOTENSIVO:\n- Expansão 20 ml/kg em 15 min\n- Repetir até 3x\n- Coloide se necessário (albumina)\n- Vasopressor se refratário (noradrenalina)\n\nSANGRAMENTO GRAVE:\n- Hemotransfusão (manter Hb > 10 g/dL)\n- Plasma fresco (coagulopatia)\n- Plaquetas se < 10.000 + sangramento ativo\n\nCRITÉRIOS DE MELHORA:\n- Diurese > 1 ml/kg/h\n- Redução hematócrito\n- Estabilização hemodinâmica"
      }
    ],
    tags: ["infectologia", "dengue", "arbovirose", "choque", "hidratação"],
    source: "Protocolo Ministério da Saúde - Dengue",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },
  {
    title: "Protocolo de Infecção do Trato Urinário (ITU)",
    category: "Infectologia",
    condition: "Infecção Urinária",
    description: "Diagnóstico e tratamento de ITU não-complicada e complicada",
    sections: [
      {
        title: "Classificação",
        content: "ITU NÃO-COMPLICADA:\n- Cistite aguda em mulher saudável\n- Sem anormalidades estruturais/funcionais\n\nITU COMPLICADA:\n- Homens, gestantes, crianças\n- Anormalidade trato urinário\n- Imunossupressão\n- Cateter vesical, instrumentação\n\nPIELONEFRITE:\n- Febre, calafrios\n- Dor lombar (Giordano +)\n- Náuseas, vômitos\n\nDIAGNÓSTICO:\n- EAS: leucocitúria, nitrito, bacteriúria\n- Urocultura: ≥ 100.000 UFC/ml (≥ 1000 se sintomático)"
      },
      {
        title: "Tratamento - Cistite Não-Complicada",
        content: "PRIMEIRA ESCOLHA:\n- Nitrofurantoína 100mg VO 6/6h (5 dias)\n- ou Fosfomicina 3g VO dose única\n\nALTERNATIVAS:\n- Sulfametoxazol-trimetoprim 800/160mg VO 12/12h (3 dias)\n  • Evitar se resistência local > 20%\n- Cefalexina 500mg VO 6/6h (5-7 dias)\n\nEVITAR:\n- Fluoroquinolonas (reservar para casos graves)\n- Amoxicilina (alta resistência)\n\nHIDRATAÇÃO:\n- Ingerir 2-3L água/dia\n- Urinar frequentemente"
      },
      {
        title: "Tratamento - Pielonefrite",
        content: "AMBULATORIAL (sem sinais de gravidade):\n- Ciprofloxacino 500mg VO 12/12h (7 dias)\n- ou Levofloxacino 750mg VO 1x/dia (5 dias)\n- ou Ceftriaxona 1g IM dose única + quinolona VO\n\nHOSPITALAR:\n- Ceftriaxona 1-2g IV 1x/dia\n- ou Ciprofloxacino 400mg IV 12/12h\n- Duração: 10-14 dias total\n\nSE SEPSE GRAVE:\n- Piperacilina-tazobactam 4,5g IV 6/6h\n- ou Meropenem 1g IV 8/8h\n- Ajustar após cultura"
      },
      {
        title: "ITU em Situações Especiais",
        content: "GESTANTE (bacteriúria assintomática tratar!):\n- Cefalexina 500mg VO 6/6h (7 dias)\n- ou Nitrofurantoína 100mg VO 6/6h (evitar no 3º tri)\n- ou Amoxicilina-clavulanato\n\nHOMENS:\n- Sempre considerar prostatite\n- Duração: 7-14 dias (cistite) ou 4-6 semanas (prostatite)\n- Fluoroquinolona preferível\n\nCATETER VESICAL:\n- Trocar cateter antes de iniciar ATB\n- Duração: 7-14 dias\n- Cultura após 48-72h de ATB\n\nRECORRÊNCIA:\n- > 2 episódios/ano: investigar\n- Profilaxia: nitrofurantoína 50-100mg/dia"
      }
    ],
    tags: ["infectologia", "itu", "infecção urinária", "cistite", "pielonefrite"],
    source: "Diretrizes IDSA de Infecção Urinária",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },

  // PEDIATRIA
  {
    title: "Protocolo de Bronquiolite Viral Aguda",
    category: "Pediatria",
    condition: "Bronquiolite",
    description: "Manejo da bronquiolite viral em lactentes",
    sections: [
      {
        title: "Definição e Reconhecimento",
        content: "BRONQUIOLITE:\n- Primeiro episódio de sibilância\n- Em criança < 2 anos (pico 2-6 meses)\n- Precedido por quadro viral (coriza, tosse)\n\nAGENTE: Vírus Sincicial Respiratório (VSR) 70%\n\nCLÍNICA:\n- Taquipneia, tiragem intercostal\n- Sibilância, crepitações difusas\n- Recusa alimentar\n- Irritabilidade, gemência"
      },
      {
        title: "Avaliação de Gravidade",
        content: "SINAIS DE GRAVIDADE:\n- Idade < 3 meses\n- Prematuridade, cardiopatia, doença pulmonar\n- SpO2 < 90-92%\n- FR > 70 irpm\n- Apneia\n- Desidratação, recusa alimentar\n- Tiragem importante, gemência\n\nINDICAÇÕES DE INTERNAÇÃO:\n- SpO2 < 92% em ar ambiente\n- FR > 60-70 irpm persistente\n- Desconforto respiratório moderado/grave\n- Ingesta < 50% habitual\n- Apneia\n- Condições sociais desfavoráveis"
      },
      {
        title: "Tratamento",
        content: "MEDIDAS DE SUPORTE (base do tratamento):\n1. OXIGENOTERAPIA\n   - Manter SpO2 > 90-92%\n   - Cânula nasal de baixo fluxo\n   - Cateter nasal de alto fluxo (se disponível)\n\n2. HIDRATAÇÃO\n   - VO/SNE se tolerando\n   - IV se ingesta < 50%\n   - Manutenção: 80-100 ml/kg/dia\n\n3. ASPIRAÇÃO NASAL\n   - SF 0,9% + aspiração delicada\n   - Antes das refeições\n\n4. POSIÇÃO\n   - Decúbito elevado 30°\n\nNÃO USAR rotineiramente:\n- Broncodilatador (sem evidência)\n- Corticoide (não altera evolução)\n- Antibiótico (viral!)"
      },
      {
        title: "Critérios de Alta",
        content: "ALTA QUANDO:\n- SpO2 > 92% em ar ambiente (> 6h)\n- FR < 60 irpm\n- Ausência de desconforto respiratório\n- Aceitação VO adequada\n- Família orientada, condições de retorno\n\nORIENTAÇÕES:\n- Sinais de piora respiratória\n- Hidratação adequada\n- Lavar nariz com SF antes de mamar\n- Evitar aglomerações, tabagismo\n- Retorno se: piora, recusa alimentar, cianose\n\nPREVENÇÃO:\n- Palivizumabe (anticorpo anti-VSR)\n- Apenas prematuros extremos, cardiopatas"
      }
    ],
    tags: ["pediatria", "bronquiolite", "lactente", "vsr", "sibilância"],
    source: "Sociedade Brasileira de Pediatria",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },
  {
    title: "Protocolo de Desidratação em Pediatria",
    category: "Pediatria",
    condition: "Desidratação Infantil",
    description: "Avaliação e tratamento de desidratação aguda em crianças",
    sections: [
      {
        title: "Classificação da Desidratação",
        content: "GRAU DE DESIDRATAÇÃO:\n\nLEVE (3-5% peso):\n- Sede aumentada\n- Mucosas úmidas\n- Lágrimas presentes\n- Diurese normal/levemente diminuída\n- Fontanela normotensa\n\nMODERADA (6-9% peso):\n- Sede intensa\n- Mucosas secas\n- Olhos encovados\n- Fontanela deprimida\n- Oligúria, pele menos elástica\n\nGRAVE (≥ 10% peso):\n- Letargia, coma\n- Mucosas muito secas\n- Ausência de lágrimas\n- Extremidades frias\n- Enchimento capilar > 3 seg\n- Anúria, choque"
      },
      {
        title: "Plano A - Desidratação Leve (Ambulatorial)",
        content: "TERAPIA DE REIDRATAÇÃO ORAL (TRO):\n- Solução de reidratação oral (SRO)\n- Volume: 50-100 ml/kg em 4-6 horas\n- Oferecer pequenos volumes frequentes\n  • Lactente: 5ml de 2/2 min (colher/seringa)\n  • Maior: goles livres\n\nMANUTENÇÃO:\n- < 10 kg: 100 ml/kg/dia\n- 10-20 kg: 1000 ml + 50 ml/kg acima de 10kg\n- > 20 kg: 1500 ml + 20 ml/kg acima de 20kg\n\nREPOSIÇÃO DE PERDAS:\n- 10 ml/kg após cada evacuação líquida\n- 2 ml/kg após cada vômito\n\nALIMENTAÇÃO:\n- Manter aleitamento materno\n- Retornar dieta habitual precocemente"
      },
      {
        title: "Plano B - Desidratação Moderada (Observação)",
        content: "TRO SUPERVISIONADA:\n- SRO 75 ml/kg em 4 horas\n- Na unidade de saúde\n- Observar tolerância\n\nSE VÔMITOS PERSISTENTES:\n- SRO em pequenos volumes (5 ml a cada 2 min)\n- Considerar sonda nasogástrica\n- Volume igual ao VO\n\nRESPOSTA ADEQUADA:\n- Melhora da hidratação\n- Aceita VO\n- Diurese presente\n→ Alta com Plano A\n\nSE PIORA:\n- Vômitos incoercíveis\n- Distensão abdominal\n- Piora do estado geral\n→ Plano C (IV)"
      },
      {
        title: "Plano C - Desidratação Grave (IV)",
        content: "FASE RÁPIDA (EXPANSÃO):\n- SF 0,9% ou Ringer Lactato\n- LACTENTE: 20 ml/kg em 30 min (repetir até 3x)\n- MAIOR: 30 ml/kg em 30 min\n\nReavaliação:\n- Melhorou → Plano B\n- Não melhorou → repetir expansão\n- Choque persistente → UTI, vasopressor\n\nMANUTENÇÃO + REPOSIÇÃO:\n- Após expansão\n- Déficit estimado + manutenção 24h\n- Distribuir nas próximas 24h\n- 50% em 8h, 50% em 16h\n\nELETRÓLITOS:\n- K+ 20 mEq/L após diurese\n- Monitorar Na, K, glicemia"
      }
    ],
    tags: ["pediatria", "desidratação", "diarreia", "tro", "hidratação"],
    source: "Protocolo Ministério da Saúde - Diarreia",
    version: "2024.1",
    isDefault: true,
    isActive: true
  },

  // OBSTETRÍCIA
  {
    title: "Protocolo de Pré-Eclâmpsia e Eclâmpsia",
    category: "Obstetrícia",
    condition: "Pré-Eclâmpsia",
    description: "Diagnóstico e manejo da pré-eclâmpsia e eclâmpsia",
    sections: [
      {
        title: "Diagnóstico e Classificação",
        content: "PRÉ-ECLÂMPSIA:\n- Após 20 semanas gestação\n- PA ≥ 140/90 mmHg (2 medidas, 4h intervalo)\n+ Proteinúria ≥ 300 mg/24h\n  ou relação ptn/creat > 0,3\n  ou fita reagente ≥ 1+\n\nPRÉ-ECLÂMPSIA GRAVE:\n- PA ≥ 160/110 mmHg\n- ou Disfunção orgânica:\n  • Plaquetas < 100.000\n  • Creatinina > 1,1 mg/dL\n  • Transaminases > 2x normal\n  • Cefaleia, alterações visuais\n  • Dor epigástrica\n  • Edema pulmonar\n\nECLÂMPSIA:\n- Pré-eclâmpsia + convulsão tônico-clônica"
      },
      {
        title: "Manejo Inicial - Pré-Eclâmpsia",
        content: "MONITORIZAÇÃO:\n- PA de 4/4h\n- Proteinúria 24h\n- Hemograma, função renal, TGO/TGP, LDH\n- Cardiotocografia (vitalidade fetal)\n\nPRÉ-ECLÂMPSIA SEM GRAVIDADE:\n- < 37 semanas: expectante com vigilância\n- ≥ 37 semanas: resolução (parto)\n- Repouso relativo\n- Metildopa 500mg-2g/dia (anti-hipertensivo)\n\nPRÉ-ECLÂMPSIA GRAVE:\n- Hospitalização\n- Sulfato de magnésio (profilaxia convulsão)\n- Anti-hipertensivo se PA ≥ 160/110\n- Parto: após estabilização materna"
      },
      {
        title: "Sulfato de Magnésio",
        content: "INDICAÇÕES:\n- Pré-eclâmpsia grave (profilaxia)\n- Eclâmpsia (tratamento)\n\nDOSE DE ATAQUE:\n- 4-6g IV em 15-20 min (diluir em 100ml SG5%)\n\nDOSE DE MANUTENÇÃO:\n- 1-2g/h em infusão contínua\n- Manter por 24h após parto ou última convulsão\n\nMONITORIZAÇÃO:\n- Reflexo patelar (abolição = intoxicação)\n- Diurese > 25 ml/h\n- FR > 12 irpm\n- Magnesemia 4-7 mEq/L\n\nANTÍDOTO (intoxicação):\n- Gluconato de cálcio 10% 10ml IV lento"
      },
      {
        title: "Controle Pressórico e Parto",
        content: "ANTI-HIPERTENSIVO (PA ≥ 160/110):\n- Hidralazina 5mg IV (bolus)\n  • Repetir 5-10mg a cada 20 min\n  • Máx 20mg\n- ou Nifedipina 10mg VO\n  • Repetir 10-20mg após 30 min\n- ou Metildopa 500mg VO 8/8h\n\nMETA: PA 140-150 / 90-100 mmHg\n\nINDICAÇÕES DE PARTO:\n- Qualquer idade gestacional:\n  • Eclâmpsia\n  • Edema pulmonar\n  • CIVD, HELLP\n  • Descolamento prematuro placenta\n  • Sofrimento fetal\n\n- ≥ 34 semanas: pré-eclâmpsia grave\n- ≥ 37 semanas: qualquer pré-eclâmpsia\n\nVIA DE PARTO: preferir vaginal (cesárea se indicação obstétrica)"
      }
    ],
    tags: ["obstetrícia", "pré-eclâmpsia", "eclâmpsia", "hipertensão", "gestação"],
    source: "Protocolo Febrasgo - Pré-Eclâmpsia",
    version: "2024.1",
    isDefault: true,
    isActive: true
  }
];

export async function seedClinicalProtocols() {
  console.log("🌱 Seeding clinical protocols...");
  
  try {
    for (const protocol of defaultClinicalProtocols) {
      await storage.createClinicalProtocol(protocol);
      console.log(`✅ Created protocol: ${protocol.title}`);
    }
    
    console.log(`✅ ${defaultClinicalProtocols.length} clinical protocols seeded successfully!`);
  } catch (error) {
    console.error("❌ Error seeding clinical protocols:", error);
    throw error;
  }
}
