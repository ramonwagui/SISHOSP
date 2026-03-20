export interface CID10 {
  code: string;
  description: string;
  category: string;
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'leve' | 'moderada' | 'grave';
  description: string;
  management: string;
}

export interface ClinicalProtocol {
  id: string;
  name: string;
  specialty: string;
  condition: string;
  symptoms: string[];
  diagnosis: string;
  treatment: string;
  medications: string;
  followUp: string;
  redFlags: string[];
}

export const CID10_DATABASE: CID10[] = [
  { code: "A00", description: "Cólera", category: "Doenças infecciosas e parasitárias" },
  { code: "A01", description: "Febres tifóide e paratifóide", category: "Doenças infecciosas e parasitárias" },
  { code: "A02", description: "Outras infecções por Salmonella", category: "Doenças infecciosas e parasitárias" },
  { code: "A04", description: "Outras infecções intestinais bacterianas", category: "Doenças infecciosas e parasitárias" },
  { code: "A08", description: "Infecções intestinais virais e outras", category: "Doenças infecciosas e parasitárias" },
  { code: "A09", description: "Diarréia e gastroenterite de origem infecciosa presumível", category: "Doenças infecciosas e parasitárias" },
  { code: "A15", description: "Tuberculose respiratória com confirmação bacteriológica e histológica", category: "Doenças infecciosas e parasitárias" },
  { code: "A16", description: "Tuberculose das vias respiratórias sem confirmação bacteriológica ou histológica", category: "Doenças infecciosas e parasitárias" },
  { code: "A90", description: "Dengue (dengue clássico)", category: "Doenças infecciosas e parasitárias" },
  { code: "A91", description: "Febre hemorrágica devida ao vírus do dengue", category: "Doenças infecciosas e parasitárias" },
  { code: "A92.8", description: "Outras febres virais especificadas transmitidas por mosquitos (Zika vírus)", category: "Doenças infecciosas e parasitárias" },
  { code: "B01", description: "Varicela", category: "Doenças infecciosas e parasitárias" },
  { code: "B05", description: "Sarampo", category: "Doenças infecciosas e parasitárias" },
  { code: "B06", description: "Rubéola", category: "Doenças infecciosas e parasitárias" },
  { code: "B20", description: "Doença pelo vírus da imunodeficiência humana (HIV)", category: "Doenças infecciosas e parasitárias" },
  { code: "B24", description: "Doença pelo vírus da imunodeficiência humana (HIV) não especificada", category: "Doenças infecciosas e parasitárias" },
  { code: "B34.2", description: "Infecção por coronavírus de localização não especificada (COVID-19)", category: "Doenças infecciosas e parasitárias" },
  { code: "B50", description: "Malária por Plasmodium falciparum", category: "Doenças infecciosas e parasitárias" },
  { code: "B51", description: "Malária por Plasmodium vivax", category: "Doenças infecciosas e parasitárias" },
  { code: "B54", description: "Malária não especificada", category: "Doenças infecciosas e parasitárias" },
  { code: "C50", description: "Neoplasia maligna da mama", category: "Neoplasias" },
  { code: "C53", description: "Neoplasia maligna do colo do útero", category: "Neoplasias" },
  { code: "C61", description: "Neoplasia maligna da próstata", category: "Neoplasias" },
  { code: "C67", description: "Neoplasia maligna da bexiga", category: "Neoplasias" },
  { code: "C78", description: "Neoplasia maligna secundária dos órgãos respiratórios e digestivos", category: "Neoplasias" },
  { code: "C79", description: "Neoplasia maligna secundária de outras localizações", category: "Neoplasias" },
  { code: "D50", description: "Anemia por deficiência de ferro", category: "Doenças do sangue" },
  { code: "D51", description: "Anemia por deficiência de vitamina B12", category: "Doenças do sangue" },
  { code: "D52", description: "Anemia por deficiência de folato", category: "Doenças do sangue" },
  { code: "D64", description: "Outras anemias", category: "Doenças do sangue" },
  { code: "E10", description: "Diabetes mellitus tipo 1", category: "Doenças endócrinas" },
  { code: "E11", description: "Diabetes mellitus tipo 2", category: "Doenças endócrinas" },
  { code: "E14", description: "Diabetes mellitus não especificado", category: "Doenças endócrinas" },
  { code: "E66", description: "Obesidade", category: "Doenças endócrinas" },
  { code: "E78", description: "Distúrbios do metabolismo de lipoproteínas e outras lipidemias", category: "Doenças endócrinas" },
  { code: "E86", description: "Depleção de volume", category: "Doenças endócrinas" },
  { code: "F10", description: "Transtornos mentais e comportamentais devidos ao uso de álcool", category: "Transtornos mentais" },
  { code: "F11", description: "Transtornos mentais e comportamentais devidos ao uso de opiáceos", category: "Transtornos mentais" },
  { code: "F32", description: "Episódios depressivos", category: "Transtornos mentais" },
  { code: "F33", description: "Transtorno depressivo recorrente", category: "Transtornos mentais" },
  { code: "F41", description: "Outros transtornos ansiosos", category: "Transtornos mentais" },
  { code: "F43", description: "Reações ao stress grave e transtornos de adaptação", category: "Transtornos mentais" },
  { code: "G40", description: "Epilepsia", category: "Doenças do sistema nervoso" },
  { code: "G43", description: "Enxaqueca", category: "Doenças do sistema nervoso" },
  { code: "G44", description: "Outras síndromes de algias cefálicas", category: "Doenças do sistema nervoso" },
  { code: "G47.0", description: "Distúrbios do início e da manutenção do sono (insônia)", category: "Doenças do sistema nervoso" },
  { code: "H10", description: "Conjuntivite", category: "Doenças do olho" },
  { code: "H66", description: "Otite média supurativa e as não especificadas", category: "Doenças do ouvido" },
  { code: "I10", description: "Hipertensão essencial (primária)", category: "Doenças do aparelho circulatório" },
  { code: "I11", description: "Doença cardíaca hipertensiva", category: "Doenças do aparelho circulatório" },
  { code: "I20", description: "Angina pectoris", category: "Doenças do aparelho circulatório" },
  { code: "I21", description: "Infarto agudo do miocárdio", category: "Doenças do aparelho circulatório" },
  { code: "I25", description: "Doença isquêmica crônica do coração", category: "Doenças do aparelho circulatório" },
  { code: "I48", description: "Flutter e fibrilação atrial", category: "Doenças do aparelho circulatório" },
  { code: "I50", description: "Insuficiência cardíaca", category: "Doenças do aparelho circulatório" },
  { code: "I63", description: "Infarto cerebral", category: "Doenças do aparelho circulatório" },
  { code: "I64", description: "Acidente vascular cerebral, não especificado como hemorrágico ou isquêmico", category: "Doenças do aparelho circulatório" },
  { code: "I80", description: "Flebite e tromboflebite", category: "Doenças do aparelho circulatório" },
  { code: "I83", description: "Varizes dos membros inferiores", category: "Doenças do aparelho circulatório" },
  { code: "J00", description: "Nasofaringite aguda (resfriado comum)", category: "Doenças do aparelho respiratório" },
  { code: "J01", description: "Sinusite aguda", category: "Doenças do aparelho respiratório" },
  { code: "J02", description: "Faringite aguda", category: "Doenças do aparelho respiratório" },
  { code: "J03", description: "Amigdalite aguda", category: "Doenças do aparelho respiratório" },
  { code: "J06", description: "Infecções agudas das vias aéreas superiores de localizações múltiplas e não especificadas", category: "Doenças do aparelho respiratório" },
  { code: "J11", description: "Influenza (gripe) devida a vírus não identificado", category: "Doenças do aparelho respiratório" },
  { code: "J18", description: "Pneumonia por microorganismo não especificado", category: "Doenças do aparelho respiratório" },
  { code: "J20", description: "Bronquite aguda", category: "Doenças do aparelho respiratório" },
  { code: "J40", description: "Bronquite não especificada como aguda ou crônica", category: "Doenças do aparelho respiratório" },
  { code: "J44", description: "Outras doenças pulmonares obstrutivas crônicas (DPOC)", category: "Doenças do aparelho respiratório" },
  { code: "J45", description: "Asma", category: "Doenças do aparelho respiratório" },
  { code: "K21", description: "Doença de refluxo gastroesofágico", category: "Doenças do aparelho digestivo" },
  { code: "K25", description: "Úlcera gástrica", category: "Doenças do aparelho digestivo" },
  { code: "K29", description: "Gastrite e duodenite", category: "Doenças do aparelho digestivo" },
  { code: "K30", description: "Dispepsia", category: "Doenças do aparelho digestivo" },
  { code: "K35", description: "Apendicite aguda", category: "Doenças do aparelho digestivo" },
  { code: "K40", description: "Hérnia inguinal", category: "Doenças do aparelho digestivo" },
  { code: "K44", description: "Hérnia diafragmática", category: "Doenças do aparelho digestivo" },
  { code: "K50", description: "Doença de Crohn (enterite regional)", category: "Doenças do aparelho digestivo" },
  { code: "K51", description: "Colite ulcerativa", category: "Doenças do aparelho digestivo" },
  { code: "K58", description: "Síndrome do cólon irritável", category: "Doenças do aparelho digestivo" },
  { code: "K80", description: "Colelitíase (cálculo biliar)", category: "Doenças do aparelho digestivo" },
  { code: "K81", description: "Colecistite", category: "Doenças do aparelho digestivo" },
  { code: "L20", description: "Dermatite atópica", category: "Doenças da pele" },
  { code: "L30", description: "Outras dermatites", category: "Doenças da pele" },
  { code: "L50", description: "Urticária", category: "Doenças da pele" },
  { code: "L70", description: "Acne", category: "Doenças da pele" },
  { code: "M06", description: "Outras artrites reumatóides", category: "Doenças do sistema osteomuscular" },
  { code: "M10", description: "Gota", category: "Doenças do sistema osteomuscular" },
  { code: "M15", description: "Poliartrose", category: "Doenças do sistema osteomuscular" },
  { code: "M16", description: "Coxartrose (artrose do quadril)", category: "Doenças do sistema osteomuscular" },
  { code: "M17", description: "Gonartrose (artrose do joelho)", category: "Doenças do sistema osteomuscular" },
  { code: "M25", description: "Outros transtornos articulares não classificados em outra parte", category: "Doenças do sistema osteomuscular" },
  { code: "M54", description: "Dorsalgia (dor nas costas)", category: "Doenças do sistema osteomuscular" },
  { code: "M79", description: "Outros transtornos dos tecidos moles, não classificados em outra parte", category: "Doenças do sistema osteomuscular" },
  { code: "M81", description: "Osteoporose sem fratura patológica", category: "Doenças do sistema osteomuscular" },
  { code: "N18", description: "Doença renal crônica", category: "Doenças do aparelho geniturinário" },
  { code: "N20", description: "Cálculo do rim e do ureter", category: "Doenças do aparelho geniturinário" },
  { code: "N30", description: "Cistite", category: "Doenças do aparelho geniturinário" },
  { code: "N39", description: "Outros transtornos do trato urinário", category: "Doenças do aparelho geniturinário" },
  { code: "N40", description: "Hiperplasia da próstata", category: "Doenças do aparelho geniturinário" },
  { code: "N70", description: "Salpingite e ooforite", category: "Doenças do aparelho geniturinário" },
  { code: "N76", description: "Outras afecções inflamatórias da vagina e da vulva", category: "Doenças do aparelho geniturinário" },
  { code: "N94", description: "Dor e outras afecções associadas com os órgãos genitais femininos e com o ciclo menstrual", category: "Doenças do aparelho geniturinário" },
  { code: "O00", description: "Gravidez ectópica", category: "Gravidez, parto e puerpério" },
  { code: "O10", description: "Hipertensão pré-existente complicando a gravidez, o parto e o puerpério", category: "Gravidez, parto e puerpério" },
  { code: "O11", description: "Distúrbio hipertensivo pré-existente com proteinúria superposta", category: "Gravidez, parto e puerpério" },
  { code: "O13", description: "Hipertensão gestacional (induzida pela gravidez) sem proteinúria significativa", category: "Gravidez, parto e puerpério" },
  { code: "O14", description: "Hipertensão gestacional (induzida pela gravidez) com proteinúria significativa (pré-eclâmpsia)", category: "Gravidez, parto e puerpério" },
  { code: "O24", description: "Diabetes mellitus na gravidez", category: "Gravidez, parto e puerpério" },
  { code: "O80", description: "Parto único espontâneo", category: "Gravidez, parto e puerpério" },
  { code: "R05", description: "Tosse", category: "Sintomas e sinais" },
  { code: "R06", description: "Anormalidades da respiração", category: "Sintomas e sinais" },
  { code: "R07", description: "Dor de garganta e no peito", category: "Sintomas e sinais" },
  { code: "R10", description: "Dor abdominal e pélvica", category: "Sintomas e sinais" },
  { code: "R11", description: "Náusea e vômitos", category: "Sintomas e sinais" },
  { code: "R19", description: "Outros sintomas e sinais relativos ao aparelho digestivo e ao abdome", category: "Sintomas e sinais" },
  { code: "R50", description: "Febre de origem desconhecida e de outras origens", category: "Sintomas e sinais" },
  { code: "R51", description: "Cefaléia", category: "Sintomas e sinais" },
  { code: "R52", description: "Dor não classificada em outra parte", category: "Sintomas e sinais" },
  { code: "R63", description: "Sintomas e sinais relativos à ingestão de alimentos e líquidos", category: "Sintomas e sinais" },
  { code: "S06", description: "Traumatismo intracraniano", category: "Lesões e envenenamento" },
  { code: "S52", description: "Fratura do antebraço", category: "Lesões e envenenamento" },
  { code: "S72", description: "Fratura do fêmur", category: "Lesões e envenenamento" },
  { code: "S82", description: "Fratura da perna, incluindo tornozelo", category: "Lesões e envenenamento" },
  { code: "T14", description: "Traumatismo de região não especificada do corpo", category: "Lesões e envenenamento" },
  { code: "T78", description: "Efeitos adversos não classificados em outra parte", category: "Lesões e envenenamento" },
  { code: "Z00", description: "Exame geral e investigação de pessoas sem queixas ou diagnóstico relatado", category: "Fatores que influenciam o estado de saúde" },
  { code: "Z01", description: "Outros exames e investigações especiais de pessoas sem queixas ou diagnóstico relatado", category: "Fatores que influenciam o estado de saúde" },
  { code: "Z23", description: "Necessidade de imunização contra doença bacteriana única", category: "Fatores que influenciam o estado de saúde" },
  { code: "Z30", description: "Anticoncepção", category: "Fatores que influenciam o estado de saúde" },
  { code: "Z34", description: "Supervisão de gravidez normal", category: "Fatores que influenciam o estado de saúde" },
];

export const DRUG_INTERACTIONS: DrugInteraction[] = [
  {
    drug1: "Varfarina",
    drug2: "AAS (Ácido Acetilsalicílico)",
    severity: "grave",
    description: "Risco aumentado de sangramento devido ao efeito anticoagulante somado à inibição plaquetária.",
    management: "Considerar alternativas ao AAS. Se necessário usar, monitorar INR com mais frequência e avaliar sinais de sangramento."
  },
  {
    drug1: "Varfarina",
    drug2: "Anti-inflamatórios (AINEs)",
    severity: "grave",
    description: "Risco significativamente aumentado de sangramento gastrointestinal e outros eventos hemorrágicos.",
    management: "Evitar uso concomitante. Considerar paracetamol como alternativa analgésica. Se indispensável, monitorar INR rigorosamente."
  },
  {
    drug1: "Inibidores da ECA (Captopril, Enalapril)",
    drug2: "Espironolactona",
    severity: "moderada",
    description: "Risco de hipercalemia devido ao efeito poupador de potássio de ambos os medicamentos.",
    management: "Monitorar níveis séricos de potássio regularmente. Orientar dieta pobre em potássio."
  },
  {
    drug1: "Metformina",
    drug2: "Contraste iodado",
    severity: "grave",
    description: "Risco de acidose láctica, especialmente em pacientes com função renal comprometida.",
    management: "Suspender metformina 48h antes do exame com contraste e retomar apenas após 48h se função renal normal."
  },
  {
    drug1: "Digoxina",
    drug2: "Amiodarona",
    severity: "grave",
    description: "Aumento dos níveis séricos de digoxina, podendo causar toxicidade digitálica.",
    management: "Reduzir dose de digoxina em 50% ao iniciar amiodarona. Monitorar níveis séricos e sinais de toxicidade."
  },
  {
    drug1: "Lítio",
    drug2: "Diuréticos tiazídicos",
    severity: "grave",
    description: "Redução da excreção renal de lítio, aumentando risco de toxicidade.",
    management: "Monitorar litemia com mais frequência. Considerar diurético de alça como alternativa."
  },
  {
    drug1: "Fluconazol",
    drug2: "Sinvastatina",
    severity: "grave",
    description: "Aumento significativo dos níveis de estatina, elevando risco de rabdomiólise.",
    management: "Evitar uso concomitante. Considerar pravastatina ou rosuvastatina como alternativas mais seguras."
  },
  {
    drug1: "Ciprofloxacino",
    drug2: "Teofilina",
    severity: "moderada",
    description: "Aumento dos níveis séricos de teofilina, podendo causar toxicidade.",
    management: "Reduzir dose de teofilina. Monitorar níveis séricos e sinais de toxicidade (náusea, tremores, taquicardia)."
  },
  {
    drug1: "Omeprazol",
    drug2: "Clopidogrel",
    severity: "moderada",
    description: "Redução da ativação do clopidogrel, diminuindo sua eficácia antiagregante.",
    management: "Preferir pantoprazol como inibidor de bomba de prótons. Separar administração em 12 horas se uso concomitante indispensável."
  },
  {
    drug1: "IMAOs (Inibidores da Monoamina Oxidase)",
    drug2: "ISRSs (Inibidores Seletivos de Recaptação de Serotonina)",
    severity: "grave",
    description: "Risco de síndrome serotoninérgica, potencialmente fatal.",
    management: "Aguardar 14 dias após suspensão de IMAO antes de iniciar ISRS. Contraindicação absoluta de uso concomitante."
  },
  {
    drug1: "Anlodipino",
    drug2: "Sinvastatina",
    severity: "moderada",
    description: "Aumento dos níveis de sinvastatina, elevando risco de miopatia.",
    management: "Limitar dose de sinvastatina a 20mg/dia. Monitorar CK e sintomas musculares."
  },
  {
    drug1: "Carbamazepina",
    drug2: "Anticoncepcionais orais",
    severity: "moderada",
    description: "Redução da eficácia contraceptiva por indução enzimática.",
    management: "Orientar método contraceptivo adicional ou alternativo. Considerar DIU ou contraceptivo com dose mais alta."
  },
  {
    drug1: "Levotiroxina",
    drug2: "Sulfato ferroso",
    severity: "leve",
    description: "Redução da absorção de levotiroxina.",
    management: "Separar administração em pelo menos 4 horas. Tomar levotiroxina em jejum."
  },
  {
    drug1: "Atenolol",
    drug2: "Verapamil",
    severity: "grave",
    description: "Bradicardia severa e bloqueio AV devido ao efeito cronotrópico negativo de ambos.",
    management: "Evitar uso concomitante. Monitorar frequência cardíaca e ECG se uso indispensável."
  },
  {
    drug1: "Glibenclamida",
    drug2: "Ciprofloxacino",
    severity: "moderada",
    description: "Risco de hipoglicemia por redução do metabolismo da sulfonilureia.",
    management: "Monitorar glicemia com mais frequência. Orientar paciente sobre sinais de hipoglicemia."
  },
];

export const CLINICAL_PROTOCOLS: ClinicalProtocol[] = [
  {
    id: "hipertensao",
    name: "Protocolo de Hipertensão Arterial",
    specialty: "Cardiologia / Clínica Médica",
    condition: "Hipertensão Arterial Sistêmica (HAS)",
    symptoms: [
      "Pressão arterial ≥ 140/90 mmHg",
      "Cefaleia occipital",
      "Tontura",
      "Zumbido",
      "Visão turva",
      "Assintomático (maioria dos casos)"
    ],
    diagnosis: "Hipertensão Arterial Sistêmica - CID I10",
    treatment: `MUDANÇAS DE ESTILO DE VIDA (todos os pacientes):
- Redução de sódio (< 5g/dia)
- Dieta DASH (rica em frutas, vegetais, grãos integrais)
- Atividade física regular (150min/semana)
- Redução de peso (IMC < 25)
- Cessação do tabagismo
- Moderação no consumo de álcool

TRATAMENTO FARMACOLÓGICO:
Estágio 1 (140-159/90-99 mmHg) + baixo risco:
- Iniciar monoterapia: IECA ou BRA ou BCC ou diurético tiazídico

Estágio 1 + alto risco ou Estágio 2 (≥160/100):
- Iniciar terapia combinada: IECA/BRA + BCC ou diurético

Esquema sugerido:
1ª linha: Losartana 50mg 1x/dia OU Enalapril 10mg 2x/dia
2ª linha: Adicionar Anlodipino 5mg 1x/dia
3ª linha: Adicionar Hidroclorotiazida 25mg 1x/dia`,
    medications: `- Losartana 50-100mg 1x/dia (jejum)
- Enalapril 10-20mg 2x/dia
- Anlodipino 5-10mg 1x/dia
- Hidroclorotiazida 12,5-25mg 1x/dia (manhã)
- Atenolol 25-100mg 1x/dia (se indicado)`,
    followUp: `- Retorno em 30 dias para avaliar resposta
- MAPA ou MRPA se PA limítrofe
- Avaliação de lesão de órgão-alvo (ECG, fundoscopia, creatinina, proteinúria)
- Estratificação de risco cardiovascular
- Avaliar adesão e efeitos adversos
- Meta: PA < 140/90 mmHg (< 130/80 em diabéticos/DRC)`,
    redFlags: [
      "PA ≥ 180/120 mmHg (emergência hipertensiva)",
      "Dor torácica",
      "Dispneia aguda",
      "Alteração do nível de consciência",
      "Déficit neurológico focal",
      "Edema agudo de pulmão"
    ]
  },
  {
    id: "diabetes",
    name: "Protocolo de Diabetes Mellitus Tipo 2",
    specialty: "Endocrinologia / Clínica Médica",
    condition: "Diabetes Mellitus Tipo 2",
    symptoms: [
      "Poliúria",
      "Polidipsia",
      "Polifagia",
      "Perda de peso inexplicada",
      "Fadiga",
      "Visão turva",
      "Infecções recorrentes",
      "Cicatrização lenta"
    ],
    diagnosis: "Diabetes Mellitus tipo 2 - CID E11",
    treatment: `MUDANÇAS DE ESTILO DE VIDA (base do tratamento):
- Dieta com redução de carboidratos simples
- Atividade física regular (150min/semana)
- Redução de peso (meta 5-10%)
- Automonitorização glicêmica

TRATAMENTO FARMACOLÓGICO:

HbA1c 6,5-7,5%:
- Metformina 500-850mg 2-3x/dia (titular gradualmente)

HbA1c 7,5-9%:
- Metformina + 2º agente:
  * Glibenclamida 5mg 1-2x/dia OU
  * Glicazida 30-60mg 1-2x/dia OU
  * Sitagliptina 100mg 1x/dia (se disponível)

HbA1c > 9% ou glicemia > 300mg/dL:
- Metformina + Insulina basal (NPH ou glargina)
- Insulina NPH: iniciar 10UI ao deitar, titular 2UI a cada 3 dias até meta

INSULINOTERAPIA:
NPH: 0,3-0,5 UI/kg/dia inicial
Ajuste conforme glicemia de jejum (meta 80-130mg/dL)`,
    medications: `- Metformina 500-850mg 2-3x/dia (com refeições)
- Glibenclamida 5mg 1-2x/dia (antes das refeições)
- Glicazida MR 30-120mg 1x/dia
- Insulina NPH 10-40UI SC ao deitar
- Sitagliptina 100mg 1x/dia (se TFG > 50)`,
    followUp: `- Retorno mensal até controle adequado
- HbA1c trimestral (meta < 7%)
- Glicemia de jejum e pós-prandial
- Avaliação de complicações:
  * Fundo de olho anual
  * Microalbuminúria anual
  * Exame dos pés trimestral
  * Perfil lipídico anual
- Vacinação (influenza, pneumococo)`,
    redFlags: [
      "Glicemia > 600mg/dL",
      "Cetoacidose (hálito cetônico, respiração de Kussmaul)",
      "Alteração do nível de consciência",
      "Desidratação grave",
      "Hipoglicemia grave (< 50mg/dL)",
      "Infecções graves",
      "Úlceras com sinais de infecção"
    ]
  },
  {
    id: "asma",
    name: "Protocolo de Asma",
    specialty: "Pneumologia / Clínica Médica",
    condition: "Asma",
    symptoms: [
      "Dispneia",
      "Sibilância",
      "Tosse (principalmente noturna)",
      "Opressão torácica",
      "Sintomas desencadeados por exercício, ar frio, alérgenos",
      "Variabilidade dos sintomas"
    ],
    diagnosis: "Asma - CID J45",
    treatment: `CLASSIFICAÇÃO E TRATAMENTO:

ASMA INTERMITENTE:
- β2-agonista de curta ação sob demanda (Salbutamol spray)

ASMA PERSISTENTE LEVE:
- Corticoide inalatório baixa dose
- Budesonida 200-400mcg/dia OU
- Beclometasona 200-500mcg/dia

ASMA PERSISTENTE MODERADA:
- CI dose moderada + β2-LA
- Budesonida 400-800mcg/dia + Formoterol OU
- Beclometasona + Formoterol (associação fixa)

ASMA PERSISTENTE GRAVE:
- CI alta dose + β2-LA
- Budesonida > 800mcg/dia + Formoterol
- Considerar tiotrópio, anti-IgE se refratária

CRISE AGUDA:
- Salbutamol spray 4-8 jatos (espaçador) a cada 20min
- Prednisolona 40-60mg VO OU
- Hidrocortisona 200mg IV se grave`,
    medications: `- Salbutamol spray 100mcg: 2 jatos 4-6x/dia (crise)
- Budesonida spray 200mcg: 2 jatos 2x/dia
- Formoterol + Budesonida: 1-2 jatos 2x/dia
- Prednisolona 20-40mg/dia (crise - 5-7 dias)
- Montelucaste 10mg 1x/dia (adjuvante)`,
    followUp: `- Retorno 7-14 dias após crise
- Avaliação trimestral em asma controlada
- Espirometria anual
- Técnica inalatória a cada consulta
- Peak flow domiciliar se grave
- Plano de ação escrito
- Meta: asma controlada (sem sintomas, sem limitação, sem uso de resgate)`,
    redFlags: [
      "Saturação < 92%",
      "Incapacidade de falar frases completas",
      "FC > 120bpm",
      "FR > 30irpm",
      "Uso de musculatura acessória",
      "Confusão mental",
      "Cianose"
    ]
  },
  {
    id: "itu",
    name: "Protocolo de Infecção do Trato Urinário",
    specialty: "Urologia / Clínica Médica",
    condition: "Infecção do Trato Urinário (ITU)",
    symptoms: [
      "Disúria",
      "Polaciúria",
      "Urgência miccional",
      "Dor suprapúbica",
      "Hematúria",
      "Urina turva/fétida",
      "Febre (pielonefrite)",
      "Dor lombar (pielonefrite)"
    ],
    diagnosis: `Cistite aguda não complicada - CID N30.0
Pielonefrite aguda - CID N10
ITU recorrente - CID N39.0`,
    treatment: `CISTITE AGUDA NÃO COMPLICADA (mulher):
Nitrofurantoína 100mg 6/6h por 5 dias OU
Fosfomicina 3g dose única OU
Norfloxacino 400mg 12/12h por 3 dias

CISTITE EM GESTANTE:
Nitrofurantoína 100mg 6/6h por 7 dias OU
Cefalexina 500mg 6/6h por 7 dias
(evitar quinolonas e sulfa no 3º trimestre)

ITU EM HOMEM:
Considerar complicada
Ciprofloxacino 500mg 12/12h por 7-10 dias
Investigar próstata e trato urinário

PIELONEFRITE:
Ambulatorial:
Ciprofloxacino 500mg 12/12h por 7-14 dias OU
Levofloxacino 750mg 1x/dia por 5 dias

Hospitalar (sepse, vômitos):
Ceftriaxona 1-2g IV 1x/dia +
Gentamicina 240mg IV 1x/dia (se grave)`,
    medications: `- Nitrofurantoína 100mg 6/6h
- Fosfomicina 3g sachê dose única
- Norfloxacino 400mg 12/12h
- Ciprofloxacino 500mg 12/12h
- Cefalexina 500mg 6/6h
- Sulfametoxazol + Trimetoprima 800/160mg 12/12h`,
    followUp: `- Urocultura pré-tratamento se pielonefrite
- Retorno em 48-72h se sem melhora
- Urocultura pós-tratamento se:
  * Gestante
  * Pielonefrite
  * ITU recorrente
  * Sintomas persistentes
- Investigar se > 2 episódios/6 meses ou > 3/ano
- USG de vias urinárias se ITU recorrente em homens`,
    redFlags: [
      "Sepse (hipotensão, taquicardia, confusão)",
      "Anúria/oligúria",
      "Vômitos incoercíveis",
      "Dor intensa não controlada",
      "Imunocomprometido",
      "Suspeita de obstrução",
      "Gestante com febre"
    ]
  },
  {
    id: "dengue",
    name: "Protocolo de Dengue",
    specialty: "Infectologia / Clínica Médica",
    condition: "Dengue",
    symptoms: [
      "Febre alta de início súbito",
      "Cefaleia intensa",
      "Dor retro-orbitária",
      "Mialgia intensa",
      "Artralgia",
      "Prostração",
      "Exantema",
      "Prova do laço positiva"
    ],
    diagnosis: "Dengue - CID A90 / Dengue grave - CID A91",
    treatment: `GRUPO A (ambulatorial):
- Hidratação oral vigorosa (60-80ml/kg/dia)
- Paracetamol 500mg 6/6h (máx 4g/dia)
- Repouso
- Retorno imediato se sinais de alarme

GRUPO B (hidratação supervisionada):
- Soro oral + observação 2-4h
- Reavaliação laboratorial
- Considerar internação se não melhorar

GRUPO C (internação):
- Sinal de alarme presente
- Hidratação IV: SF 0,9% 10ml/kg em 1h
- Reavaliar: se melhorar → 5-7ml/kg/h por 2-4h
- Monitorar hematócrito, plaquetas, sinais vitais

GRUPO D (emergência):
- Dengue grave/choque
- Expansão rápida: SF 0,9% 20ml/kg em 15-20min
- UTI, drogas vasoativas se necessário`,
    medications: `PERMITIDOS:
- Paracetamol 500-750mg 6/6h

CONTRAINDICADOS:
- AAS (risco de sangramento)
- Anti-inflamatórios (AINEs)
- IM (risco de hematoma)`,
    followUp: `SINAIS DE ALARME (retorno imediato):
- Dor abdominal intensa
- Vômitos persistentes
- Sangramento de mucosas
- Letargia/irritabilidade
- Hepatomegalia > 2cm
- Acúmulo de líquidos (ascite, derrame)
- Queda abrupta de plaquetas
- Aumento do hematócrito

FASE CRÍTICA: 3º-7º dia
- Retorno diário até fase de recuperação
- Hemograma diário
- Alta se afebril + plaquetas em elevação + estável`,
    redFlags: [
      "Choque (PA sistólica < 90mmHg, pulso fino)",
      "Sangramento grave",
      "Disfunção orgânica (ALT/AST > 1000)",
      "Derrame pleural/ascite volumoso",
      "Alteração da consciência",
      "Plaquetas < 20.000",
      "Hemoconcentração Ht > 20% do basal"
    ]
  }
];

export interface MedicalCalculator {
  id: string;
  name: string;
  category: string;
  description: string;
  inputs: {
    name: string;
    label: string;
    type: 'number' | 'select';
    unit?: string;
    options?: { value: string; label: string }[];
    min?: number;
    max?: number;
  }[];
  calculate: (inputs: Record<string, number | string>) => {
    result: string | number;
    interpretation: string;
    category?: string;
  };
}

export const MEDICAL_CALCULATORS: MedicalCalculator[] = [
  {
    id: 'imc',
    name: 'IMC (Índice de Massa Corporal)',
    category: 'Antropometria',
    description: 'Calcula o IMC e classifica o estado nutricional',
    inputs: [
      { name: 'weight', label: 'Peso', type: 'number', unit: 'kg', min: 1, max: 300 },
      { name: 'height', label: 'Altura', type: 'number', unit: 'm', min: 0.5, max: 2.5 }
    ],
    calculate: (inputs) => {
      const weight = Number(inputs.weight);
      const height = Number(inputs.height);
      const imc = weight / (height * height);
      
      let category = '';
      let interpretation = '';
      
      if (imc < 18.5) {
        category = 'Baixo peso';
        interpretation = 'IMC abaixo do normal. Considerar avaliação nutricional.';
      } else if (imc < 25) {
        category = 'Peso normal';
        interpretation = 'IMC dentro da faixa de normalidade.';
      } else if (imc < 30) {
        category = 'Sobrepeso';
        interpretation = 'IMC acima do normal. Orientar mudanças de estilo de vida.';
      } else if (imc < 35) {
        category = 'Obesidade grau I';
        interpretation = 'Obesidade leve. Indicado acompanhamento nutricional e atividade física.';
      } else if (imc < 40) {
        category = 'Obesidade grau II';
        interpretation = 'Obesidade moderada. Indicado acompanhamento multidisciplinar.';
      } else {
        category = 'Obesidade grau III';
        interpretation = 'Obesidade mórbida. Considerar tratamento intensivo e cirurgia bariátrica.';
      }
      
      return {
        result: imc.toFixed(1),
        interpretation,
        category
      };
    }
  },
  {
    id: 'pediatric-dose',
    name: 'Dosagem Pediátrica',
    category: 'Pediatria',
    description: 'Calcula dose de medicamento baseado no peso (mg/kg/dia)',
    inputs: [
      { name: 'weight', label: 'Peso da criança', type: 'number', unit: 'kg', min: 0.5, max: 100 },
      { name: 'dose', label: 'Dose por kg', type: 'number', unit: 'mg/kg/dia', min: 0.1, max: 500 },
      { 
        name: 'frequency', 
        label: 'Frequência', 
        type: 'select',
        options: [
          { value: '1', label: '1x ao dia' },
          { value: '2', label: '2x ao dia (12/12h)' },
          { value: '3', label: '3x ao dia (8/8h)' },
          { value: '4', label: '4x ao dia (6/6h)' }
        ]
      }
    ],
    calculate: (inputs) => {
      const weight = Number(inputs.weight);
      const dosePerKg = Number(inputs.dose);
      const frequency = Number(inputs.frequency);
      
      const totalDaily = weight * dosePerKg;
      const perDose = totalDaily / frequency;
      
      let frequencyText = '';
      switch(frequency) {
        case 1: frequencyText = '1x ao dia'; break;
        case 2: frequencyText = '2x ao dia (12/12h)'; break;
        case 3: frequencyText = '3x ao dia (8/8h)'; break;
        case 4: frequencyText = '4x ao dia (6/6h)'; break;
      }
      
      return {
        result: perDose.toFixed(1),
        interpretation: `Dose total diária: ${totalDaily.toFixed(1)}mg\nDose por administração: ${perDose.toFixed(1)}mg ${frequencyText}\n\n⚠️ Sempre verificar dose máxima do medicamento e ajustar se necessário.`
      };
    }
  },
  {
    id: 'clearance',
    name: 'Clearance de Creatinina (Cockcroft-Gault)',
    category: 'Nefrologia',
    description: 'Estima a função renal e ajuda no ajuste de doses',
    inputs: [
      { name: 'age', label: 'Idade', type: 'number', unit: 'anos', min: 18, max: 120 },
      { name: 'weight', label: 'Peso', type: 'number', unit: 'kg', min: 30, max: 200 },
      { name: 'creatinine', label: 'Creatinina sérica', type: 'number', unit: 'mg/dL', min: 0.3, max: 15 },
      {
        name: 'gender',
        label: 'Sexo',
        type: 'select',
        options: [
          { value: 'M', label: 'Masculino' },
          { value: 'F', label: 'Feminino' }
        ]
      }
    ],
    calculate: (inputs) => {
      const age = Number(inputs.age);
      const weight = Number(inputs.weight);
      const creatinine = Number(inputs.creatinine);
      const gender = inputs.gender;
      
      let clcr = ((140 - age) * weight) / (72 * creatinine);
      if (gender === 'F') clcr *= 0.85;
      
      let category = '';
      let interpretation = '';
      
      if (clcr >= 90) {
        category = 'Normal';
        interpretation = 'Função renal normal. Sem necessidade de ajuste de dose.';
      } else if (clcr >= 60) {
        category = 'DRC estágio 2 (leve)';
        interpretation = 'Função renal levemente reduzida. Considerar ajuste de doses em alguns medicamentos.';
      } else if (clcr >= 30) {
        category = 'DRC estágio 3 (moderada)';
        interpretation = 'Função renal moderadamente reduzida. Ajustar doses de medicamentos nefrotóxicos.';
      } else if (clcr >= 15) {
        category = 'DRC estágio 4 (grave)';
        interpretation = 'Função renal severamente reduzida. Ajuste rigoroso de doses. Considerar encaminhamento ao nefrologista.';
      } else {
        category = 'DRC estágio 5 (terminal)';
        interpretation = 'Insuficiência renal terminal. Encaminhar urgentemente ao nefrologista. Considerar diálise.';
      }
      
      return {
        result: clcr.toFixed(1),
        interpretation,
        category
      };
    }
  },
  {
    id: 'chads-vasc',
    name: 'CHA₂DS₂-VASc Score',
    category: 'Cardiologia',
    description: 'Avalia risco de AVC em pacientes com fibrilação atrial',
    inputs: [
      { name: 'age', label: 'Idade', type: 'number', unit: 'anos', min: 18, max: 120 },
      {
        name: 'gender',
        label: 'Sexo',
        type: 'select',
        options: [
          { value: 'M', label: 'Masculino' },
          { value: 'F', label: 'Feminino' }
        ]
      },
      {
        name: 'chf',
        label: 'Insuficiência cardíaca',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '1', label: 'Sim' }
        ]
      },
      {
        name: 'hypertension',
        label: 'Hipertensão',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '1', label: 'Sim' }
        ]
      },
      {
        name: 'stroke',
        label: 'AVC/AIT prévio',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '2', label: 'Sim' }
        ]
      },
      {
        name: 'vascular',
        label: 'Doença vascular',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '1', label: 'Sim' }
        ]
      },
      {
        name: 'diabetes',
        label: 'Diabetes',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '1', label: 'Sim' }
        ]
      }
    ],
    calculate: (inputs) => {
      let score = 0;
      
      const age = Number(inputs.age);
      if (age >= 75) score += 2;
      else if (age >= 65) score += 1;
      
      if (inputs.gender === 'F') score += 1;
      
      score += Number(inputs.chf);
      score += Number(inputs.hypertension);
      score += Number(inputs.stroke);
      score += Number(inputs.vascular);
      score += Number(inputs.diabetes);
      
      let interpretation = '';
      let recommendation = '';
      
      if (score === 0) {
        interpretation = 'Risco muito baixo de AVC (0% ao ano)';
        recommendation = 'Não requer anticoagulação. Considerar AAS.';
      } else if (score === 1) {
        interpretation = 'Risco baixo de AVC (1,3% ao ano)';
        recommendation = 'Considerar anticoagulação oral (varfarina ou NOAC).';
      } else if (score === 2) {
        interpretation = 'Risco moderado de AVC (2,2% ao ano)';
        recommendation = 'Anticoagulação oral recomendada (NOAC preferível).';
      } else {
        interpretation = `Risco alto de AVC (${(score * 2).toFixed(1)}% ao ano)`;
        recommendation = 'Anticoagulação oral fortemente recomendada (NOAC preferível). Avaliar risco de sangramento (HAS-BLED).';
      }
      
      return {
        result: score,
        interpretation: `${interpretation}\n\n${recommendation}`
      };
    }
  },
  {
    id: 'wells-dvt',
    name: 'Wells Score (TVP)',
    category: 'Angiologia',
    description: 'Avalia probabilidade de trombose venosa profunda',
    inputs: [
      {
        name: 'cancer',
        label: 'Câncer ativo',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '1', label: 'Sim' }
        ]
      },
      {
        name: 'paralysis',
        label: 'Paralisia/imobilização recente',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '1', label: 'Sim' }
        ]
      },
      {
        name: 'bedridden',
        label: 'Acamado > 3 dias ou cirurgia < 12 sem',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '1', label: 'Sim' }
        ]
      },
      {
        name: 'tenderness',
        label: 'Sensibilidade ao longo das veias profundas',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '1', label: 'Sim' }
        ]
      },
      {
        name: 'swelling',
        label: 'Edema de toda a perna',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '1', label: 'Sim' }
        ]
      },
      {
        name: 'calf',
        label: 'Panturrilha > 3cm que lado contralateral',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '1', label: 'Sim' }
        ]
      },
      {
        name: 'pitting',
        label: 'Edema com cacifo',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '1', label: 'Sim' }
        ]
      },
      {
        name: 'collateral',
        label: 'Veias superficiais colaterais',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '1', label: 'Sim' }
        ]
      },
      {
        name: 'previous',
        label: 'TVP prévia documentada',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '1', label: 'Sim' }
        ]
      },
      {
        name: 'alternative',
        label: 'Diagnóstico alternativo mais provável',
        type: 'select',
        options: [
          { value: '0', label: 'Não' },
          { value: '-2', label: 'Sim' }
        ]
      }
    ],
    calculate: (inputs) => {
      const score = 
        Number(inputs.cancer) +
        Number(inputs.paralysis) +
        Number(inputs.bedridden) +
        Number(inputs.tenderness) +
        Number(inputs.swelling) +
        Number(inputs.calf) +
        Number(inputs.pitting) +
        Number(inputs.collateral) +
        Number(inputs.previous) +
        Number(inputs.alternative);
      
      let category = '';
      let interpretation = '';
      
      if (score <= 0) {
        category = 'Baixa probabilidade';
        interpretation = 'Probabilidade de TVP: 5%\n\nConduta:\n- Dosagem de D-dímero\n- Se D-dímero negativo: TVP improvável\n- Se D-dímero positivo: realizar USG Doppler';
      } else if (score <= 2) {
        category = 'Probabilidade moderada';
        interpretation = 'Probabilidade de TVP: 17%\n\nConduta:\n- Dosagem de D-dímero\n- Considerar USG Doppler mesmo se D-dímero negativo\n- Se alta suspeita clínica: USG Doppler direto';
      } else {
        category = 'Alta probabilidade';
        interpretation = 'Probabilidade de TVP: 53%\n\nConduta:\n- Realizar USG Doppler imediatamente\n- Considerar anticoagulação empírica enquanto aguarda exame\n- D-dímero não altera conduta';
      }
      
      return {
        result: score,
        interpretation,
        category
      };
    }
  }
];

export function searchCID10(query: string): CID10[] {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  return CID10_DATABASE.filter(cid => 
    cid.code.toLowerCase().includes(lowerQuery) ||
    cid.description.toLowerCase().includes(lowerQuery)
  ).slice(0, 20);
}

export function checkDrugInteractions(medications: string[]): DrugInteraction[] {
  if (medications.length < 2) return [];
  
  const interactions: DrugInteraction[] = [];
  const medLower = medications.map(m => m.toLowerCase().trim());
  
  for (const interaction of DRUG_INTERACTIONS) {
    const drug1Lower = interaction.drug1.toLowerCase();
    const drug2Lower = interaction.drug2.toLowerCase();
    
    const hasDrug1 = medLower.some(m => 
      m.includes(drug1Lower) || drug1Lower.includes(m)
    );
    const hasDrug2 = medLower.some(m => 
      m.includes(drug2Lower) || drug2Lower.includes(m)
    );
    
    if (hasDrug1 && hasDrug2) {
      interactions.push(interaction);
    }
  }
  
  return interactions;
}

export function getProtocolsBySpecialty(specialty: string): ClinicalProtocol[] {
  return CLINICAL_PROTOCOLS.filter(protocol =>
    protocol.specialty.toLowerCase().includes(specialty.toLowerCase())
  );
}

export function searchProtocols(query: string): ClinicalProtocol[] {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  return CLINICAL_PROTOCOLS.filter(protocol =>
    protocol.name.toLowerCase().includes(lowerQuery) ||
    protocol.condition.toLowerCase().includes(lowerQuery) ||
    protocol.specialty.toLowerCase().includes(lowerQuery)
  );
}
