export interface Medication {
  name: string;
  genericName: string;
  category: string;
  commonDoses: string[];
  indications: string[];
  contraindications: string[];
  sideEffects: string[];
  pregnancyCategory?: string;
  pediatricUse?: string;
}

export const MEDICATIONS_DATABASE: Medication[] = [
  // ANALGÉSICOS E ANTIPIRÉTICOS
  {
    name: "Paracetamol",
    genericName: "Paracetamol",
    category: "Analgésico/Antipirético",
    commonDoses: [
      "500mg VO 6/6h",
      "750mg VO 6/6h",
      "1g VO 6/6h (máx 4g/dia)"
    ],
    indications: ["Dor leve a moderada", "Febre"],
    contraindications: ["Hepatopatia grave", "Hipersensibilidade"],
    sideEffects: ["Hepatotoxicidade (doses altas)", "Rash cutâneo"],
    pregnancyCategory: "B",
    pediatricUse: "10-15mg/kg/dose 6/6h"
  },
  {
    name: "Dipirona",
    genericName: "Metamizol",
    category: "Analgésico/Antipirético",
    commonDoses: [
      "500mg VO 6/6h",
      "1g VO 6/6h",
      "1g IV 8/8h"
    ],
    indications: ["Dor moderada", "Febre", "Cólica"],
    contraindications: ["Agranulocitose prévia", "Deficiência G6PD"],
    sideEffects: ["Agranulocitose (raro)", "Hipotensão"],
    pregnancyCategory: "C"
  },
  {
    name: "Ibuprofeno",
    genericName: "Ibuprofeno",
    category: "AINE",
    commonDoses: [
      "400mg VO 8/8h",
      "600mg VO 8/8h (após refeição)"
    ],
    indications: ["Dor", "Inflamação", "Febre"],
    contraindications: ["Úlcera péptica ativa", "Insuficiência renal grave"],
    sideEffects: ["Dispepsia", "Sangramento GI", "Nefrotoxicidade"],
    pregnancyCategory: "C (D no 3º trimestre)"
  },

  // ANTIBIÓTICOS
  {
    name: "Amoxicilina",
    genericName: "Amoxicilina",
    category: "Antibiótico - Penicilina",
    commonDoses: [
      "500mg VO 8/8h por 7-10 dias",
      "875mg VO 12/12h por 7-10 dias",
      "50mg/kg/dia dividido 8/8h (pediátrico)"
    ],
    indications: ["Infecções respiratórias", "Sinusite", "Otite", "ITU"],
    contraindications: ["Alergia a penicilinas"],
    sideEffects: ["Diarreia", "Rash", "Candidíase"],
    pregnancyCategory: "B"
  },
  {
    name: "Amoxicilina + Clavulanato",
    genericName: "Amoxicilina + Ácido Clavulânico",
    category: "Antibiótico - Penicilina + Inibidor β-lactamase",
    commonDoses: [
      "500/125mg VO 8/8h por 7 dias",
      "875/125mg VO 12/12h por 7 dias"
    ],
    indications: ["Sinusite bacteriana", "Pneumonia", "Mordeduras"],
    contraindications: ["Alergia a penicilinas", "Hepatopatia prévia pelo clavulanato"],
    sideEffects: ["Diarreia", "Hepatotoxicidade"],
    pregnancyCategory: "B"
  },
  {
    name: "Azitromicina",
    genericName: "Azitromicina",
    category: "Antibiótico - Macrolídeo",
    commonDoses: [
      "500mg VO 1x/dia por 3 dias",
      "500mg D1, depois 250mg D2-D5"
    ],
    indications: ["Pneumonia atípica", "Sinusite", "Faringite"],
    contraindications: ["Prolongamento QT"],
    sideEffects: ["Diarreia", "Náusea", "Arritmia"],
    pregnancyCategory: "B"
  },
  {
    name: "Cefalexina",
    genericName: "Cefalexina",
    category: "Antibiótico - Cefalosporina 1ª geração",
    commonDoses: [
      "500mg VO 6/6h por 7-10 dias",
      "25-50mg/kg/dia dividido 6/6h (pediátrico)"
    ],
    indications: ["ITU", "Celulite", "Piodermite"],
    contraindications: ["Alergia a cefalosporinas"],
    sideEffects: ["Diarreia", "Reação alérgica"],
    pregnancyCategory: "B"
  },
  {
    name: "Ciprofloxacino",
    genericName: "Ciprofloxacino",
    category: "Antibiótico - Quinolona",
    commonDoses: [
      "500mg VO 12/12h por 7-14 dias",
      "400mg IV 12/12h"
    ],
    indications: ["ITU", "Pielonefrite", "Prostatite", "Diarreia bacteriana"],
    contraindications: ["< 18 anos", "Gestantes", "Tendinopatia prévia"],
    sideEffects: ["Tendinite", "Ruptura de tendão", "Fotossensibilidade"],
    pregnancyCategory: "C"
  },
  {
    name: "Nitrofurantoína",
    genericName: "Nitrofurantoína",
    category: "Antibiótico - Nitrofurano",
    commonDoses: [
      "100mg VO 6/6h por 5-7 dias"
    ],
    indications: ["Cistite aguda não complicada"],
    contraindications: ["ClCr < 60", "Gestação termo", "G6PD"],
    sideEffects: ["Náusea", "Fibrose pulmonar (uso prolongado)"],
    pregnancyCategory: "B (contraindicado no termo)"
  },

  // ANTI-HIPERTENSIVOS
  {
    name: "Losartana",
    genericName: "Losartana Potássica",
    category: "Anti-hipertensivo - BRA",
    commonDoses: [
      "50mg VO 1x/dia (jejum)",
      "100mg VO 1x/dia"
    ],
    indications: ["Hipertensão", "Nefropatia diabética", "ICC"],
    contraindications: ["Gestação", "Estenose bilateral de artéria renal"],
    sideEffects: ["Hipercalemia", "Tontura", "Tosse (raro)"],
    pregnancyCategory: "D"
  },
  {
    name: "Enalapril",
    genericName: "Enalapril",
    category: "Anti-hipertensivo - IECA",
    commonDoses: [
      "10mg VO 2x/dia",
      "20mg VO 2x/dia"
    ],
    indications: ["Hipertensão", "ICC", "Pós-IAM"],
    contraindications: ["Gestação", "Angioedema prévio", "Estenose bilateral"],
    sideEffects: ["Tosse seca", "Hipercalemia", "Angioedema"],
    pregnancyCategory: "D"
  },
  {
    name: "Anlodipino",
    genericName: "Anlodipino (Besilato)",
    category: "Anti-hipertensivo - BCC",
    commonDoses: [
      "5mg VO 1x/dia",
      "10mg VO 1x/dia"
    ],
    indications: ["Hipertensão", "Angina"],
    contraindications: ["ICC descompensada", "Choque cardiogênico"],
    sideEffects: ["Edema maleolar", "Cefaleia", "Rubor facial"],
    pregnancyCategory: "C"
  },
  {
    name: "Hidroclorotiazida",
    genericName: "Hidroclorotiazida",
    category: "Anti-hipertensivo - Diurético tiazídico",
    commonDoses: [
      "12,5mg VO 1x/dia (manhã)",
      "25mg VO 1x/dia (manhã)"
    ],
    indications: ["Hipertensão", "Edema"],
    contraindications: ["Anúria", "Hipercalcemia"],
    sideEffects: ["Hipocalemia", "Hiperuricemia", "Hiperglicemia"],
    pregnancyCategory: "B"
  },
  {
    name: "Atenolol",
    genericName: "Atenolol",
    category: "Anti-hipertensivo - Betabloqueador",
    commonDoses: [
      "25mg VO 1x/dia",
      "50mg VO 1x/dia",
      "100mg VO 1x/dia"
    ],
    indications: ["Hipertensão", "Angina", "Pós-IAM"],
    contraindications: ["Asma", "Bloqueio AV", "Bradicardia"],
    sideEffects: ["Bradicardia", "Broncoespasmo", "Fadiga"],
    pregnancyCategory: "D"
  },

  // ANTIDIABÉTICOS
  {
    name: "Metformina",
    genericName: "Metformina (Cloridrato)",
    category: "Antidiabético - Biguanida",
    commonDoses: [
      "500mg VO 2x/dia (refeições)",
      "850mg VO 2-3x/dia (refeições)",
      "1000mg VO 2x/dia"
    ],
    indications: ["Diabetes tipo 2", "SOP"],
    contraindications: ["ClCr < 30", "Acidose", "ICC descompensada"],
    sideEffects: ["Diarreia", "Náusea", "Acidose láctica (raro)"],
    pregnancyCategory: "B"
  },
  {
    name: "Glibenclamida",
    genericName: "Glibenclamida",
    category: "Antidiabético - Sulfonilureia",
    commonDoses: [
      "5mg VO 1-2x/dia (antes refeição)",
      "10mg VO 1-2x/dia"
    ],
    indications: ["Diabetes tipo 2"],
    contraindications: ["Diabetes tipo 1", "Gravidez", "IRC grave"],
    sideEffects: ["Hipoglicemia", "Ganho de peso"],
    pregnancyCategory: "C"
  },
  {
    name: "Insulina NPH",
    genericName: "Insulina NPH (Humana)",
    category: "Antidiabético - Insulina",
    commonDoses: [
      "10-20 UI SC ao deitar",
      "0,3-0,5 UI/kg/dia dividido 2x"
    ],
    indications: ["Diabetes tipo 1 e 2"],
    contraindications: ["Hipoglicemia"],
    sideEffects: ["Hipoglicemia", "Lipodistrofia"],
    pregnancyCategory: "B"
  },

  // GASTROPROTETORES
  {
    name: "Omeprazol",
    genericName: "Omeprazol",
    category: "Inibidor de Bomba de Prótons",
    commonDoses: [
      "20mg VO 1x/dia (jejum)",
      "40mg VO 1x/dia"
    ],
    indications: ["DRGE", "Úlcera péptica", "Dispepsia"],
    contraindications: ["Hipersensibilidade"],
    sideEffects: ["Cefaleia", "Diarreia", "Deficiência B12 (longo prazo)"],
    pregnancyCategory: "C"
  },
  {
    name: "Ranitidina",
    genericName: "Ranitidina (Cloridrato)",
    category: "Antagonista H2",
    commonDoses: [
      "150mg VO 2x/dia",
      "300mg VO ao deitar"
    ],
    indications: ["DRGE", "Úlcera péptica"],
    contraindications: ["Hipersensibilidade"],
    sideEffects: ["Cefaleia", "Tontura"],
    pregnancyCategory: "B"
  },

  // BRONCODILATADORES E CORTICOIDES
  {
    name: "Salbutamol (spray)",
    genericName: "Salbutamol (Sulfato)",
    category: "Broncodilatador - β2 agonista",
    commonDoses: [
      "2 jatos (100mcg/jato) 4-6x/dia",
      "4-8 jatos a cada 20min (crise)"
    ],
    indications: ["Asma", "DPOC", "Broncoespasmo"],
    contraindications: ["Taquiarritmia não controlada"],
    sideEffects: ["Tremor", "Taquicardia", "Hipocalemia"],
    pregnancyCategory: "C"
  },
  {
    name: "Budesonida (spray)",
    genericName: "Budesonida",
    category: "Corticoide inalatório",
    commonDoses: [
      "200mcg: 2 jatos 2x/dia",
      "400mcg: 1-2 jatos 2x/dia"
    ],
    indications: ["Asma persistente", "DPOC"],
    contraindications: ["Tuberculose ativa"],
    sideEffects: ["Candidíase oral", "Rouquidão"],
    pregnancyCategory: "B"
  },
  {
    name: "Prednisolona",
    genericName: "Prednisolona",
    category: "Corticoide sistêmico",
    commonDoses: [
      "20-40mg VO 1x/dia (manhã) 5-7 dias",
      "1mg/kg/dia (crise asma)",
      "1-2mg/kg/dia (pediátrico)"
    ],
    indications: ["Crise asmática", "Exacerbação DPOC", "Alergia grave"],
    contraindications: ["Infecções sistêmicas não tratadas"],
    sideEffects: ["Hiperglicemia", "HAS", "Osteoporose"],
    pregnancyCategory: "C"
  },

  // ANTICOAGULANTES E ANTIPLAQUETÁRIOS
  {
    name: "AAS (Ácido Acetilsalicílico)",
    genericName: "Ácido Acetilsalicílico",
    category: "Antiagregante plaquetário",
    commonDoses: [
      "100mg VO 1x/dia",
      "200mg VO 1x/dia"
    ],
    indications: ["Prevenção cardiovascular", "Pós-IAM", "AVC"],
    contraindications: ["Úlcera ativa", "Hemofilia", "Dengue"],
    sideEffects: ["Sangramento GI", "Broncoespasmo"],
    pregnancyCategory: "D (3º trimestre)"
  },
  {
    name: "Varfarina",
    genericName: "Varfarina Sódica",
    category: "Anticoagulante oral",
    commonDoses: [
      "5mg VO 1x/dia (titular conforme INR)",
      "Alvo INR 2-3 (maioria) ou 2,5-3,5 (válvula mecânica)"
    ],
    indications: ["FA", "TVP/TEP", "Prótese valvar"],
    contraindications: ["Gravidez", "Sangramento ativo", "HAS não controlada"],
    sideEffects: ["Sangramento", "Necrose cutânea"],
    pregnancyCategory: "X"
  },

  // ESTATINAS
  {
    name: "Sinvastatina",
    genericName: "Sinvastatina",
    category: "Hipolipemiante - Estatina",
    commonDoses: [
      "20mg VO 1x/dia (noite)",
      "40mg VO 1x/dia (noite)",
      "Máx 80mg (alto risco miopatia)"
    ],
    indications: ["Hipercolesterolemia", "Prevenção cardiovascular"],
    contraindications: ["Hepatopatia ativa", "Gravidez"],
    sideEffects: ["Mialgia", "Elevação TGO/TGP", "Rabdomiólise (raro)"],
    pregnancyCategory: "X"
  },
  {
    name: "Atorvastatina",
    genericName: "Atorvastatina Cálcica",
    category: "Hipolipemiante - Estatina",
    commonDoses: [
      "10mg VO 1x/dia",
      "20mg VO 1x/dia",
      "40-80mg VO 1x/dia (alto risco)"
    ],
    indications: ["Hipercolesterolemia", "Prevenção cardiovascular"],
    contraindications: ["Hepatopatia ativa", "Gravidez"],
    sideEffects: ["Mialgia", "Hepatotoxicidade"],
    pregnancyCategory: "X"
  },

  // ANTIULCEROSOS E ANTIEMÉTICOS
  {
    name: "Bromoprida",
    genericName: "Bromoprida (Cloridrato)",
    category: "Procinético/Antiemético",
    commonDoses: [
      "10mg VO 3x/dia (antes refeições)",
      "10mg IV/IM 8/8h"
    ],
    indications: ["Náuseas", "Vômitos", "Refluxo"],
    contraindications: ["Obstrução GI", "Feocromocitoma"],
    sideEffects: ["Sonolência", "Sintomas extrapiramidais"],
    pregnancyCategory: "C"
  },
  {
    name: "Ondansetrona",
    genericName: "Ondansetrona (Cloridrato)",
    category: "Antiemético - Antagonista 5-HT3",
    commonDoses: [
      "4-8mg VO 8/8h",
      "4mg IV lento"
    ],
    indications: ["Náuseas/vômitos (quimio, pós-op)"],
    contraindications: ["Prolongamento QT"],
    sideEffects: ["Cefaleia", "Constipação", "Prolongamento QT"],
    pregnancyCategory: "B"
  },

  // ANSIOLÍTICOS E ANTIDEPRESSIVOS
  {
    name: "Fluoxetina",
    genericName: "Fluoxetina (Cloridrato)",
    category: "Antidepressivo - ISRS",
    commonDoses: [
      "20mg VO 1x/dia (manhã)",
      "40-60mg VO 1x/dia"
    ],
    indications: ["Depressão", "TOC", "Bulimia"],
    contraindications: ["IMAO (últimos 14 dias)", "Mania"],
    sideEffects: ["Náusea", "Insônia", "Disfunção sexual"],
    pregnancyCategory: "C"
  },
  {
    name: "Sertralina",
    genericName: "Sertralina (Cloridrato)",
    category: "Antidepressivo - ISRS",
    commonDoses: [
      "50mg VO 1x/dia (manhã)",
      "100-200mg VO 1x/dia"
    ],
    indications: ["Depressão", "TAG", "TOC", "TEPT"],
    contraindications: ["IMAO", "Pimozida"],
    sideEffects: ["Náusea", "Diarreia", "Insônia"],
    pregnancyCategory: "C"
  },

  // OUTROS
  {
    name: "Levotiroxina",
    genericName: "Levotiroxina Sódica",
    category: "Hormônio tireoidiano",
    commonDoses: [
      "25-50mcg VO 1x/dia (jejum)",
      "75-100mcg VO 1x/dia",
      "1,6mcg/kg/dia"
    ],
    indications: ["Hipotireoidismo"],
    contraindications: ["Tireotoxicose", "IAM recente"],
    sideEffects: ["Palpitações", "Tremor", "Insônia (superdose)"],
    pregnancyCategory: "A"
  },
  {
    name: "Dexametasona",
    genericName: "Dexametasona",
    category: "Corticoide sistêmico",
    commonDoses: [
      "4mg VO/IV 6/6h (edema cerebral)",
      "0,15mg/kg/dose (croup)"
    ],
    indications: ["Edema cerebral", "Náusea quimio", "Croup"],
    contraindications: ["Infecções sistêmicas"],
    sideEffects: ["Hiperglicemia", "Imunossupressão"],
    pregnancyCategory: "C"
  }
];

export function searchMedications(query: string): Medication[] {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  return MEDICATIONS_DATABASE.filter(med => 
    med.name.toLowerCase().includes(lowerQuery) ||
    med.genericName.toLowerCase().includes(lowerQuery) ||
    med.category.toLowerCase().includes(lowerQuery)
  ).slice(0, 15);
}

export function getMedicationsByCategory(category: string): Medication[] {
  return MEDICATIONS_DATABASE.filter(med => 
    med.category.toLowerCase().includes(category.toLowerCase())
  );
}

export function getMedicationsByIndication(indication: string): Medication[] {
  const lowerIndication = indication.toLowerCase();
  return MEDICATIONS_DATABASE.filter(med =>
    med.indications.some(ind => ind.toLowerCase().includes(lowerIndication))
  );
}

// Mapeamento de CID-10 para medicamentos sugeridos
export const CID_TO_MEDICATIONS: Record<string, string[]> = {
  "I10": ["Losartana", "Enalapril", "Anlodipino", "Hidroclorotiazida", "Atenolol"],
  "E11": ["Metformina", "Glibenclamida", "Insulina NPH"],
  "J45": ["Salbutamol (spray)", "Budesonida (spray)", "Prednisolona"],
  "J00": ["Paracetamol", "Dipirona"],
  "J01": ["Amoxicilina", "Azitromicina"],
  "J02": ["Paracetamol", "Amoxicilina"],
  "J03": ["Amoxicilina", "Azitromicina", "Paracetamol"],
  "J06": ["Paracetamol", "Dipirona"],
  "J18": ["Amoxicilina + Clavulanato", "Azitromicina"],
  "N30": ["Nitrofurantoína", "Ciprofloxacino"],
  "K21": ["Omeprazol", "Ranitidina"],
  "K29": ["Omeprazol"],
  "F32": ["Fluoxetina", "Sertralina"],
  "F33": ["Sertralina", "Fluoxetina"],
  "F41": ["Sertralina"],
  "E03": ["Levotiroxina"],
  "A09": ["Bromoprida", "Ondansetrona"],
  "R11": ["Bromoprida", "Ondansetrona"],
  "E78": ["Sinvastatina", "Atorvastatina"],
};

export function suggestMedicationsByCID(cidCode: string): Medication[] {
  const medicationNames = CID_TO_MEDICATIONS[cidCode] || [];
  return medicationNames
    .map(name => MEDICATIONS_DATABASE.find(med => med.name === name))
    .filter((med): med is Medication => med !== undefined);
}
