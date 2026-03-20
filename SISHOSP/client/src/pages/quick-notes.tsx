import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { insertMedicalHistorySchema, type Patient, type Specialty, type Triage, type SelectMedicationsCatalog, type SelectHospitalizationEvolution, type MedicationKitAssociationWithDetails } from "@shared/schema";
import { Activity, Heart, Thermometer, Wind, Droplets } from "lucide-react";
import { Save, FileText, Loader2, ArrowLeft, Stethoscope, Pill, Search, Scan, X, Printer, Send, FileCheck, Mail, MessageCircle, ChevronDown, ChevronRight, ClipboardList, FileSignature, History, Eye, Download, LogOut, TestTube, ImageIcon, Scissors, Package, AlertCircle, CheckCircle2, Clock, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const formSchema = z.object({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  specialtyId: z.string().min(1, "Especialidade é obrigatória"),
  consultationDate: z.string(),
  consultationTime: z.string(),
  doctorName: z.string(),
  anamnese: z.string().min(1, "Anamnese é obrigatória"),
  cid: z.string().optional(),
  cidDescription: z.string().optional(),
  prescricao: z.string().optional(),
  medicacoesReceita: z.string().optional(),
  atestadoTexto: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type ExameItem = { id: string; name: string };
type ExameCategoria = { id: string; name: string; exames: ExameItem[] };
type ExameTipo = { id: string; name: string; icon: string; categorias: ExameCategoria[] };

const EXAMES_DATABASE: ExameTipo[] = [
  {
    id: "imagem",
    name: "Exames de Imagem",
    icon: "🔬",
    categorias: [
      {
        id: "raio_x",
        name: "Raio-X",
        exames: [
          { id: "rx_mao", name: "Mão AP/PR/OBL" },
          { id: "rx_punho", name: "Punho AP/PR/OBL" },
          { id: "rx_antebraco", name: "Antebraço AP/PF" },
          { id: "rx_cotovelo", name: "Cotovelo AP/PF" },
          { id: "rx_braco", name: "Braço AP/PF" },
          { id: "rx_ombro", name: "Ombro/Escápula AP/PF" },
          { id: "rx_clavicula", name: "Clavícula AP/PF" },
          { id: "rx_cranio", name: "Crânio AP/PF" },
          { id: "rx_face", name: "Face AP/PA/PF" },
          { id: "rx_seiosface", name: "Seios da Face FN/MN" },
          { id: "rx_cavum", name: "Cavum" },
          { id: "rx_torax", name: "Tórax AP/PA/PF" },
          { id: "rx_abdomen", name: "Abdomen AP/PF" },
          { id: "rx_costelas", name: "Costelas" },
          { id: "rx_femur", name: "Fêmur AP/PF" },
          { id: "rx_joelho", name: "Joelho AP/PF/Axial" },
          { id: "rx_perna", name: "Perna AP/PF" },
          { id: "rx_tornozelo", name: "Tornozelo AP/PF" },
          { id: "rx_pe", name: "Pé AP/PF/OBL" },
          { id: "rx_calcaneo", name: "Calcâneo PF/Axial" },
          { id: "rx_cervical", name: "Coluna Cervical AP/PF" },
          { id: "rx_toracica", name: "Coluna Torácica AP/PF" },
          { id: "rx_lombar", name: "Coluna Lombar AP/PF" },
          { id: "rx_lombosacra", name: "Coluna Lombo-Sacra AP/PF" },
          { id: "rx_bacia", name: "Bacia AP/PA" },
          { id: "rx_quadril", name: "Quadril AP/PA" },
        ]
      },
      {
        id: "ultrassom",
        name: "Ultrassonografia",
        exames: [
          { id: "usg_abdomen_total", name: "Abdomen Total" },
          { id: "usg_abdomen_superior", name: "Abdomen Superior" },
          { id: "usg_pelvica", name: "Pélvica" },
          { id: "usg_transvaginal", name: "Transvaginal" },
          { id: "usg_tireoide", name: "Tireoide" },
          { id: "usg_mamas", name: "Mamas" },
          { id: "usg_prostata", name: "Próstata" },
          { id: "usg_rins", name: "Rins e Vias Urinárias" },
        ]
      }
    ]
  },
  {
    id: "laboratorio",
    name: "Exames Laboratoriais",
    icon: "🧪",
    categorias: [
      {
        id: "glicemia",
        name: "Glicemia",
        exames: [
          { id: "lab_glicemia_jejum", name: "Glicemia de Jejum (8-10h)" },
          { id: "lab_gpp", name: "GPP - Pós Prandial" },
        ]
      },
      {
        id: "lipidograma",
        name: "Perfil Lipídico",
        exames: [
          { id: "lab_triglicerides", name: "Triglicerídeos" },
          { id: "lab_colesterol_fracoes", name: "Colesterol Total e Frações" },
        ]
      },
      {
        id: "funcao_renal",
        name: "Função Renal",
        exames: [
          { id: "lab_ureia", name: "Ureia" },
          { id: "lab_creatinina", name: "Creatinina" },
          { id: "lab_acido_urico", name: "Ácido Úrico" },
        ]
      },
      {
        id: "funcao_hepatica",
        name: "Função Hepática",
        exames: [
          { id: "lab_tgo", name: "TGO/AST" },
          { id: "lab_tgp", name: "TGP/ALT" },
          { id: "lab_gama_gt", name: "Gama GT" },
          { id: "lab_fosfatase", name: "Fosfatase Alcalina" },
          { id: "lab_bilirrubinas", name: "Bilirrubina Total e Frações" },
        ]
      },
      {
        id: "proteinas",
        name: "Proteínas e Enzimas",
        exames: [
          { id: "lab_proteinas", name: "Proteínas Totais" },
          { id: "lab_amilase", name: "Amilase" },
          { id: "lab_albumina", name: "Albumina" },
          { id: "lab_ldh", name: "Desidrogenase Láctica (LDH)" },
        ]
      },
      {
        id: "minerais",
        name: "Minerais",
        exames: [
          { id: "lab_calcio", name: "Cálcio" },
          { id: "lab_ferro", name: "Ferro" },
        ]
      },
      {
        id: "cardiaco",
        name: "Marcadores Cardíacos",
        exames: [
          { id: "lab_troponina", name: "Troponina I (Qualitativo)" },
          { id: "lab_ck_total", name: "CK-Total" },
          { id: "lab_ck_mb", name: "CK-MB" },
        ]
      },
      {
        id: "inflamatorios",
        name: "Marcadores Inflamatórios",
        exames: [
          { id: "lab_pcr", name: "Proteína C Reativa (PCR)" },
          { id: "lab_fator_reumatoide", name: "Fator Reumatóide (FR)" },
          { id: "lab_aslo", name: "Antiestreptolisina O (ASLO)" },
        ]
      },
      {
        id: "hematologia",
        name: "Hematologia",
        exames: [
          { id: "lab_hemograma", name: "Hemograma" },
          { id: "lab_vhs", name: "VHS" },
          { id: "lab_tipagem", name: "ABO - Tipagem Sanguínea" },
        ]
      },
      {
        id: "gravidez",
        name: "Gravidez",
        exames: [
          { id: "lab_beta_hcg", name: "Beta HCG (Qualitativo)" },
        ]
      },
      {
        id: "testes_rapidos",
        name: "Testes Rápidos",
        exames: [
          { id: "lab_dengue_ns1", name: "Dengue NS1 (Teste Rápido)" },
          { id: "lab_hbsag_rapido", name: "HBsAg (Teste Rápido)" },
          { id: "lab_hcv_rapido", name: "HCV (Teste Rápido)" },
          { id: "lab_hiv_rapido", name: "HIV (Teste Rápido)" },
          { id: "lab_sifilis_rapido", name: "Sífilis (Teste Rápido)" },
          { id: "lab_hanseniase", name: "Teste Rápido para Hanseníase" },
        ]
      },
      {
        id: "sorologias",
        name: "Sorologias",
        exames: [
          { id: "lab_vdrl", name: "VDRL" },
        ]
      },
      {
        id: "urina",
        name: "Urina",
        exames: [
          { id: "lab_sumario_urina", name: "Sumário de Urina (1ª da manhã)" },
        ]
      },
      {
        id: "fezes",
        name: "Fezes",
        exames: [
          { id: "lab_parasitologico", name: "Parasitológico de Fezes" },
          { id: "lab_sangue_oculto", name: "Pesquisa de Sangue Oculto nas Fezes" },
        ]
      },
      {
        id: "microbiologia",
        name: "Microbiologia",
        exames: [
          { id: "lab_baciloscopia", name: "Baciloscopia" },
        ]
      },
      {
        id: "citopatologia",
        name: "Citopatologia",
        exames: [
          { id: "lab_citopatologico", name: "Análises de Exames Citopatológicos" },
        ]
      }
    ]
  }
];

type CidCode = { code: string; description: string };

const VIAS_ADMINISTRACAO = [
  { sigla: "VO", nome: "Via Oral" },
  { sigla: "EV", nome: "Endovenosa" },
  { sigla: "IM", nome: "Intramuscular" },
  { sigla: "SC", nome: "Subcutânea" },
  { sigla: "SL", nome: "Sublingual" },
  { sigla: "TD", nome: "Transdérmica" },
  { sigla: "TP", nome: "Tópica" },
  { sigla: "RT", nome: "Retal" },
  { sigla: "VG", nome: "Vaginal" },
  { sigla: "INA", nome: "Inalatória" },
  { sigla: "NA", nome: "Nasal" },
  { sigla: "OFT", nome: "Oftálmica" },
  { sigla: "OL", nome: "Otológica" },
  { sigla: "ID", nome: "Intradérmica" },
  { sigla: "IA", nome: "Intra-arterial" },
  { sigla: "IT", nome: "Intratecal" },
  { sigla: "IO", nome: "Intraóssea" },
  { sigla: "IP", nome: "Intra-peritoneal" },
  { sigla: "IL", nome: "Intralesional" },
  { sigla: "GT", nome: "Gastrostomia" },
  { sigla: "JT", nome: "Jejunostomia" },
  { sigla: "NE", nome: "Nasoentérica" },
  { sigla: "NG", nome: "Nasogástrica" },
  { sigla: "PT", nome: "Percutânea" },
  { sigla: "PD", nome: "Peridural" },
];

const FREQUENCIAS = [
  { id: "1h", nome: "1 em 1 hora" },
  { id: "2h", nome: "2 em 2 horas" },
  { id: "4h", nome: "4 em 4 horas" },
  { id: "6h", nome: "6 em 6 horas" },
  { id: "8h", nome: "8 em 8 horas" },
  { id: "12h", nome: "12 em 12 horas" },
  { id: "1xdia", nome: "Uma vez ao dia" },
  { id: "3xdia", nome: "Três vezes ao dia" },
  { id: "continuo", nome: "Contínuo" },
  { id: "sn", nome: "Se necessário" },
  { id: "1fase", nome: "1 Fase" },
  { id: "2fases", nome: "2 Fases" },
  { id: "3fases", nome: "3 Fases" },
];

const INSTRUCOES = [
  { id: "jejum", nome: "Em jejum" },
  { id: "cafe", nome: "Após o café" },
  { id: "almoco", nome: "Após almoço" },
  { id: "jantar", nome: "Após o jantar" },
  { id: "refeicoes", nome: "Após às refeições" },
  { id: "durante_refeicoes", nome: "Durante as refeições" },
  { id: "antes_refeicoes", nome: "Antes das refeições" },
  { id: "manha", nome: "Pela manhã" },
  { id: "dormir", nome: "Antes de dormir" },
  { id: "momento", nome: "No momento" },
  { id: "hemodialise", nome: "Após Hemodiálise" },
  { id: "pressao", nome: "Após aferir pressão" },
  { id: "criterio", nome: "A critério médico" },
];

const MEDICAMENTOS_LISTA = [
  { name: "ACEBROFILINA XAROPE ADULTO", doses: ["50MG/05ML"] },
  { name: "ACEBROFILINA XAROPE INFANTIL", doses: ["25MG/05ML"] },
  { name: "ACETILCISTEINA XAROPE ADULTO", doses: ["40MG"] },
  { name: "ACETILCISTEINA XAROPE INFANTIL", doses: ["20MG"] },
  { name: "ACIDO ACETILSALICILICO", doses: ["100 MG"] },
  { name: "ACIDO ASCORBICO", doses: ["100 MG"] },
  { name: "ACIDO FOLICO", doses: ["0,2 MG", "05 MG"] },
  { name: "ACIDO TRANEXAMICO", doses: ["50 MG", "250MG"] },
  { name: "ACIDO VALPROICO", doses: ["250 MG", "500 MG"] },
  { name: "ADRENALINA", doses: ["01 MG"] },
  { name: "ÁGUA PARA INJEÇÃO", doses: ["10 ML", "500 ML"] },
  { name: "ALBENDAZOL", doses: ["400MG"] },
  { name: "ALBENDAZOL SUSP. ORAL", doses: ["10 ML"] },
  { name: "ALPRAZOLAM", doses: ["0,5 MG", "1,0 MG", "2,0 MG"] },
  { name: "AMBROXOL ADULTO", doses: [] },
  { name: "AMBROXOL INFANTIL", doses: [] },
  { name: "AMINOFILINA", doses: ["24 MG"] },
  { name: "AMIODARONA", doses: ["50 MG"] },
  { name: "AMITRIPTILINA", doses: ["25 MG", "75 MG"] },
  { name: "AMOXICILINA", doses: ["500 MG"] },
  { name: "AMOXICILINA SUSP. ORAL", doses: ["60 ML"] },
  { name: "AMOXICILINA+CLAVULANATO", doses: ["50MG", "500MG"] },
  { name: "AMPICILINA", doses: ["01 G"] },
  { name: "ATENOLOL", doses: ["25MG", "50MG"] },
  { name: "ATROPINA", doses: ["0,25 MG"] },
  { name: "AZITROMICINA", doses: ["500MG", "600MG", "900MG"] },
  { name: "BENZOILMETRONIDAZOL SUSP. ORAL", doses: ["80ML"] },
  { name: "BICARBONATO DE SODIO", doses: ["10%"] },
  { name: "BIPERIDENO", doses: ["02 MG", "04 MG"] },
  { name: "BROMAZEPAM", doses: ["03 MG", "06 MG"] },
  { name: "BROMETO DE IPRATROPIO", doses: ["20ML"] },
  { name: "BROMOPRIDA", doses: ["05 MG"] },
  { name: "BROMOPRIDA GOTAS", doses: [] },
  { name: "BUTILBROMETO DE ESCOPOLAMINA", doses: ["20 MG"] },
  { name: "BUTILBROMETO DE ESCOPOLAMINA + DIPIRONA", doses: ["4 MG"] },
  { name: "CAPTOPRIL", doses: ["25 MG", "50 MG"] },
  { name: "CARBAMAZEPINA", doses: ["200 MG", "400 MG"] },
  { name: "CARBAMAZEPINA LIQUIDO", doses: [] },
  { name: "CARBONATO DE CALCIO", doses: ["500MG"] },
  { name: "CARBONATO DE LÍTIO", doses: ["300 MG", "450 MG"] },
  { name: "CEFALEXINA", doses: ["500 MG"] },
  { name: "CEFALEXINA SUSPENSÃO ORAL", doses: ["250MG/05ML"] },
  { name: "CEFALOTINA", doses: ["01 G"] },
  { name: "CEFEPIMA", doses: ["01 G", "02 G"] },
  { name: "CEFTRIAXONA", doses: ["500 MG", "01 G"] },
  { name: "CETOPROFENO", doses: ["01 G"] },
  { name: "CIMETIDINA INJ.", doses: [] },
  { name: "CIPROFLOXACINO", doses: ["200 MG", "400 MG", "500 MG"] },
  { name: "CITALOPRAM", doses: ["10 MG", "20 MG"] },
  { name: "CITRATO DE FENTANILA", doses: ["50 MCG", "78 MCG"] },
  { name: "CLINDAMICINA", doses: ["600 MG"] },
  { name: "CLONAZEPAM", doses: ["0,5 MG", "2,0 MG"] },
  { name: "CLONAZEPAM SOL. ORAL", doses: ["20 ML"] },
  { name: "CLOPIDROGREL", doses: ["75MG"] },
  { name: "CLORETO DE SUXAMETÔNIO", doses: ["100 MG", "500 MG"] },
  { name: "CLORPROMAZINA", doses: ["25 MG", "100 MG"] },
  { name: "CLORPROMAZINA INJETÁVEL", doses: [] },
  { name: "CLORPROMAZINA SOL. ORAL", doses: ["4%"] },
  { name: "COMPLEXO B", doses: ["02 ML"] },
  { name: "DESLANOSIDEO", doses: ["0,2 MG"] },
  { name: "DEXAMETASONA CREME", doses: [] },
  { name: "DEXAMETASONA", doses: ["02 MG", "04 MG"] },
  { name: "DEXCLORFENIRAMINA", doses: ["2MG"] },
  { name: "DIAZEPAM", doses: ["05 MG", "10 MG"] },
  { name: "DIAZEPAM INJETÁVEL", doses: [] },
  { name: "DICLOFENACO", doses: ["25 MG"] },
  { name: "DIPIRONA", doses: ["500 MG"] },
  { name: "DIPIRONA SOL. ORAL", doses: ["10 ML"] },
  { name: "DOBUTAMINA", doses: ["250 MG"] },
  { name: "DOPAMINA", doses: ["50 MG"] },
  { name: "DULOXETINA", doses: ["30 MG", "60 MG"] },
  { name: "ENALAPRIL", doses: ["05MG", "10MG", "20MG"] },
  { name: "ENOXAPARINA", doses: ["20 MG", "40 MG", "60 MG"] },
  { name: "ERITROMICINA SUSP. ORAL", doses: ["60ML"] },
  { name: "ESCITALOPRAM", doses: ["10 MG", "15 MG", "20 MG"] },
  { name: "ETOMIDATO", doses: ["20 MG"] },
  { name: "FENITOINA", doses: ["100 MG"] },
  { name: "FENITOINA INJETÁVEL", doses: [] },
  { name: "FENOBARBITAL", doses: ["100 MG"] },
  { name: "FENOBARBITAL SOL. ORAL", doses: ["20 ML"] },
  { name: "FITOMENADIONA", doses: ["10MG"] },
  { name: "FLUCONAZOL", doses: ["150MG"] },
  { name: "FLUMAZENIL", doses: ["0,5 MG"] },
  { name: "FLUOXETINA", doses: ["20 MG"] },
  { name: "FUROSEMIDA", doses: ["40 MG"] },
  { name: "GENTAMICINA", doses: ["20 MG", "40 MG", "80 MG"] },
  { name: "GENTAMICINA COLÍRIO", doses: [] },
  { name: "GLIBENCLAMIDA", doses: ["05MG"] },
  { name: "GLICOSE", doses: ["25%", "50%"] },
  { name: "HALOPERIDOL", doses: ["01 MG", "05 MG"] },
  { name: "HALOPERIDOL INJETÁVEL", doses: [] },
  { name: "HALOPERIDOL SOL. ORAL", doses: ["02 MG"] },
  { name: "HEPARINA SODICA", doses: ["5.000 UI"] },
  { name: "HIDRALAZINA", doses: ["20 MG", "50MG"] },
  { name: "HIDROCLOROTIAZIDA", doses: ["25 MG"] },
  { name: "HIDROCORTISONA", doses: ["100 MG", "500 MG"] },
  { name: "IBUPROFENO", doses: ["300MG", "600MG"] },
  { name: "IBUPROFENO GOTAS", doses: [] },
  { name: "INSULINA NPH", doses: ["100 UI"] },
  { name: "INSULINA REGULAR", doses: ["100 UI"] },
  { name: "ISOSSORBIDA", doses: ["05 MG", "10 MG"] },
  { name: "IVERMECTINA", doses: ["6MG"] },
  { name: "KETAMINA", doses: ["500 MG"] },
  { name: "LEVOMEPROMAZINA", doses: ["25 MG", "100 MG"] },
  { name: "LEVOMEPROMAZINA SOL. ORAL", doses: ["04%"] },
  { name: "LIDOCAÍNA GEL", doses: ["30G"] },
  { name: "LIDOCAÍNA S/VASO", doses: ["1%", "2%"] },
  { name: "LORATADINA", doses: ["10MG"] },
  { name: "LORAZEPAM", doses: ["02 MG"] },
  { name: "LOSARTANA", doses: ["50MG"] },
  { name: "MANITOL", doses: ["20%"] },
  { name: "MEBENDAZOL", doses: ["100MG"] },
  { name: "MEBENDAZOL SUSP. ORAL", doses: ["30ML"] },
  { name: "METFORMINA", doses: ["500MG", "850MG"] },
  { name: "METILDOPA", doses: ["250MG", "500MG"] },
  { name: "METOCLOPRAMIDA", doses: ["10 MG"] },
  { name: "METOCLOPRAMIDA GOTAS", doses: [] },
  { name: "METOPROLOL", doses: ["100MG"] },
  { name: "METRONIDAZOL", doses: ["250MG", "400MG"] },
  { name: "METRONIDAZOL GEL VAGINAL", doses: [] },
  { name: "MIDAZOLAM", doses: ["05 MG", "15 MG", "50 MG"] },
  { name: "MICONAZOL CREME DERMATOLÓGICO", doses: [] },
  { name: "MORFINA", doses: ["01 MG", "10 MG"] },
  { name: "NALOXONA", doses: ["0,4 MG"] },
  { name: "NEOMICINA + BACITRACINA POMADA", doses: [] },
  { name: "NIFEDIPINO", doses: ["10MG", "20MG"] },
  { name: "NIMESULIDA", doses: ["100MG"] },
  { name: "NISTATINA CREME VAGINAL", doses: [] },
  { name: "NISTATINA SUSP. ORAL", doses: ["50 ML"] },
  { name: "NITRATO DE MICONAZOL CREME VAGINAL", doses: [] },
  { name: "NOREPINEFRINA", doses: ["02 MG"] },
  { name: "OCITOCINA", doses: ["5000 UI"] },
  { name: "ÓLEO MINERAL", doses: [] },
  { name: "OMEPRAZOL", doses: ["20 MG", "40 MG"] },
  { name: "ONDANSETRONA", doses: ["2 MG", "4 MG"] },
  { name: "OXACILINA", doses: ["500 MG"] },
  { name: "PANTOPRAZOL", doses: ["40 MG"] },
  { name: "PARACETAMOL", doses: ["500 MG", "750 MG"] },
  { name: "PARACETAMOL SOL. ORAL", doses: ["10 ML"] },
  { name: "PAROXETINA", doses: ["10 MG", "20 MG"] },
  { name: "PENICILINA BENZATINA", doses: ["600.000 UI", "1.200.000 UI"] },
  { name: "PENICILINA CRISTALINA", doses: ["5.000.000 UI"] },
  { name: "PENICILINA PROCAINA", doses: ["400.000 UI"] },
  { name: "PERICIAZINA", doses: ["1%", "4%"] },
  { name: "PETIDINA INJETÁVEL", doses: ["01 ML"] },
  { name: "PIPERACILINA + TAZOBACTAM", doses: ["4 G"] },
  { name: "PIRACETAM", doses: ["200 MG"] },
  { name: "PREDNISOLONA SUSP. ORAL", doses: ["03 MG"] },
  { name: "PREDNISONA", doses: ["05MG", "20MG"] },
  { name: "PREGABALINA", doses: ["75MG", "150MG"] },
  { name: "PROMETAZINA", doses: ["25 MG", "50 MG"] },
  { name: "PROPOFOL", doses: ["200 MG"] },
  { name: "PROPRANOLOL", doses: ["40 MG"] },
  { name: "QUETIAPINA", doses: ["25 MG", "100 MG", "200 MG"] },
  { name: "RANITIDINA", doses: ["150 MG"] },
  { name: "RISPERIDONA", doses: ["01 MG", "02 MG", "03 MG"] },
  { name: "RISPERIDONA LIQUIDO", doses: [] },
  { name: "ROCURÔNIO", doses: ["50 MG"] },
  { name: "SALBUTAMOL SPRAY", doses: ["100 MCG"] },
  { name: "SECNIDAZOL", doses: ["1000MG"] },
  { name: "SERTRALINA", doses: ["25 MG", "50 MG"] },
  { name: "SIMETICONA GOTAS", doses: [] },
  { name: "SINVASTATINA", doses: ["20MG", "40MG"] },
  { name: "SORO FISIOLOGICO", doses: ["0,9%"] },
  { name: "SORO GLICOFISIOLOGICO", doses: ["500 ML"] },
  { name: "SORO GLICOSADO", doses: ["5%"] },
  { name: "SORO RINGER COM LACTATO", doses: ["500 ML"] },
  { name: "SORO RINGER SIMPLES", doses: ["500 ML"] },
  { name: "SULFADIAZINA DE PRATA", doses: ["30G", "400G"] },
  { name: "SULFAMETOXAZOL + TRIMETOPRIMA", doses: ["400 MG"] },
  { name: "SULFAMETOXAZOL + TRIMETOPRIMA SUSP. ORAL", doses: ["50ML"] },
  { name: "SULFATO DE MAGNESIO", doses: ["50%"] },
  { name: "SULFATO FERROSO", doses: ["40 MG"] },
  { name: "TENOXICAM", doses: ["20 MG", "40 MG"] },
  { name: "TIAMINA", doses: ["300MG"] },
  { name: "TRAMADOL", doses: ["50MG"] },
  { name: "TRAMADOL INJETÁVEL", doses: [] },
  { name: "VALPROATO DE SÓDIO", doses: ["100 ML"] },
  { name: "VANCOMICINA", doses: ["500 MG"] },
  { name: "VENLAFAXINA", doses: ["75MG"] },
  { name: "VITAMINA C", doses: ["200MG", "500MG"] },
];

interface PrescricaoItem {
  id: string;
  medicamento: string;
  dose: string;
  via: string;
  frequencia: string;
  instrucao: string;
  duracao: string;
  kitId?: string;
  kitName?: string;
}

interface ProcedimentoItem {
  id: string;
  itemType: "medication" | "material";
  medicationId?: string;
  materialId?: string;
  itemName: string;
  quantity: string;
  unit: string;
  instructions: string;
}

function ProcedimentoSection({
  patientId,
  patientName,
  sourceType,
  sourceId,
  sourceName,
  onBack,
  onNext,
}: {
  patientId: string;
  patientName: string;
  sourceType: string;
  sourceId?: string;
  sourceName: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [requestMode, setRequestMode] = useState<"kit" | "custom">("kit");
  const [selectedKitId, setSelectedKitId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [customItems, setCustomItems] = useState<ProcedimentoItem[]>([]);
  const [searchMedication, setSearchMedication] = useState("");
  const [searchMaterial, setSearchMaterial] = useState("");
  const [showMedicationSearch, setShowMedicationSearch] = useState(false);
  const [showMaterialSearch, setShowMaterialSearch] = useState(false);

  const { data: procedureKits = [], isLoading: isLoadingKits } = useQuery<any[]>({
    queryKey: ["/api/procedure-kits"],
  });

  const { data: medications = [] } = useQuery<any[]>({
    queryKey: ["/api/medications"],
  });

  const { data: materials = [] } = useQuery<any[]>({
    queryKey: ["/api/materials-for-procedures"],
  });

  const { data: patientProcedures = [] } = useQuery<any[]>({
    queryKey: ["/api/patients", patientId, "procedure-requests"],
    enabled: !!patientId,
  });

  const filteredMedications = medications.filter((m: any) =>
    m.name?.toLowerCase().includes(searchMedication.toLowerCase()) ||
    m.genericName?.toLowerCase().includes(searchMedication.toLowerCase())
  ).slice(0, 10);

  const filteredMaterials = materials.filter((m: any) =>
    m.name?.toLowerCase().includes(searchMaterial.toLowerCase()) ||
    m.code?.toLowerCase().includes(searchMaterial.toLowerCase())
  ).slice(0, 10);

  const createProcedureMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/procedure-requests", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Procedimento solicitado",
        description: requestMode === "kit" 
          ? "A solicitação foi enviada para processamento."
          : "Os itens foram enviados para a farmácia/almoxarifado.",
      });
      setSelectedKitId("");
      setNotes("");
      setPriority("normal");
      setCustomItems([]);
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "procedure-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível solicitar o procedimento.",
        variant: "destructive",
      });
    },
  });

  const addMedication = (med: any) => {
    const newItem: ProcedimentoItem = {
      id: crypto.randomUUID(),
      itemType: "medication",
      medicationId: med.id,
      itemName: med.name + (med.concentration ? ` ${med.concentration}` : ""),
      quantity: "1",
      unit: med.form || "unidade",
      instructions: "",
    };
    setCustomItems([...customItems, newItem]);
    setSearchMedication("");
    setShowMedicationSearch(false);
  };

  const addMaterial = (mat: any) => {
    const newItem: ProcedimentoItem = {
      id: crypto.randomUUID(),
      itemType: "material",
      materialId: mat.id,
      itemName: mat.name,
      quantity: "1",
      unit: mat.unit || "unidade",
      instructions: "",
    };
    setCustomItems([...customItems, newItem]);
    setSearchMaterial("");
    setShowMaterialSearch(false);
  };

  const removeItem = (id: string) => {
    setCustomItems(customItems.filter((item) => item.id !== id));
  };

  const updateItemQuantity = (id: string, quantity: string) => {
    setCustomItems(customItems.map((item) =>
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const updateItemInstructions = (id: string, instructions: string) => {
    setCustomItems(customItems.map((item) =>
      item.id === id ? { ...item, instructions } : item
    ));
  };

  const determineFulfillmentChannel = (): string => {
    if (requestMode === "kit") {
      const kit = procedureKits.find((k: any) => k.id === selectedKitId);
      if (kit?.items) {
        const hasMeds = kit.items.some((i: any) => i.itemType === "medication");
        const hasMats = kit.items.some((i: any) => i.itemType === "material");
        if (hasMeds && hasMats) return "mixed";
        if (hasMeds) return "pharmacy";
        return "materials";
      }
      return "pharmacy";
    }
    const hasMeds = customItems.some((i) => i.itemType === "medication");
    const hasMats = customItems.some((i) => i.itemType === "material");
    if (hasMeds && hasMats) return "mixed";
    if (hasMeds) return "pharmacy";
    return "materials";
  };

  const handleSubmit = () => {
    if (!patientId) {
      toast({
        title: "Paciente não selecionado",
        description: "Selecione um paciente antes de solicitar procedimentos.",
        variant: "destructive",
      });
      return;
    }

    if (requestMode === "kit" && !selectedKitId) {
      toast({
        title: "Selecione um kit",
        description: "Escolha um kit de procedimento antes de solicitar.",
        variant: "destructive",
      });
      return;
    }

    if (requestMode === "custom" && customItems.length === 0) {
      toast({
        title: "Adicione itens",
        description: "Adicione ao menos um medicamento ou material.",
        variant: "destructive",
      });
      return;
    }

    const fulfillmentChannel = determineFulfillmentChannel();
    const requestData: any = {
      patientId,
      patientName,
      sourceType,
      sourceId: sourceId || null,
      sourceName,
      priority,
      notes: notes || null,
      requestMode,
      fulfillmentChannel,
    };

    if (requestMode === "kit") {
      requestData.procedureKitId = selectedKitId;
    } else {
      requestData.items = customItems.map((item) => ({
        itemType: item.itemType,
        medicationId: item.medicationId || null,
        materialId: item.materialId || null,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        instructions: item.instructions || null,
      }));
    }

    createProcedureMutation.mutate(requestData);
  };

  const selectedKit = procedureKits.find((k: any) => k.id === selectedKitId);
  const hasMedicationItems = customItems.some((i) => i.itemType === "medication");
  const hasMaterialItems = customItems.some((i) => i.itemType === "material");

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-t-lg py-3">
        <CardTitle className="flex items-center text-lg">
          <Scissors className="h-5 w-5 mr-2" />
          Solicitação de Procedimento
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {!patientId ? (
          <div className="flex items-center gap-2 p-4 bg-amber-50 text-amber-800 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span>Selecione um paciente para solicitar procedimentos.</span>
          </div>
        ) : (
          <>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <Button
                type="button"
                variant={requestMode === "kit" ? "default" : "ghost"}
                className={`flex-1 ${requestMode === "kit" ? "bg-teal-600 hover:bg-teal-700" : ""}`}
                onClick={() => setRequestMode("kit")}
                data-testid="button-modo-kit"
              >
                <Package className="h-4 w-4 mr-2" />
                Kit Pronto
              </Button>
              <Button
                type="button"
                variant={requestMode === "custom" ? "default" : "ghost"}
                className={`flex-1 ${requestMode === "custom" ? "bg-teal-600 hover:bg-teal-700" : ""}`}
                onClick={() => setRequestMode("custom")}
                data-testid="button-modo-personalizado"
              >
                <Plus className="h-4 w-4 mr-2" />
                Personalizado
              </Button>
            </div>

            {requestMode === "kit" ? (
              <>
                <div className="space-y-2">
                  <Label>Selecione o Kit de Procedimento</Label>
                  {isLoadingKits ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando kits...
                    </div>
                  ) : procedureKits.length === 0 ? (
                    <div className="p-4 bg-gray-50 rounded-lg text-gray-600">
                      Nenhum kit de procedimento cadastrado.
                    </div>
                  ) : (
                    <Select value={selectedKitId} onValueChange={setSelectedKitId}>
                      <SelectTrigger data-testid="select-kit-procedimento">
                        <SelectValue placeholder="Escolha um kit..." />
                      </SelectTrigger>
                      <SelectContent>
                        {procedureKits.map((kit: any) => (
                          <SelectItem key={kit.id} value={kit.id}>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-teal-600" />
                              <span>{kit.name}</span>
                              {kit.category && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {kit.category}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedKit && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-teal-600" />
                      <span className="font-medium text-teal-800">{selectedKit.name}</span>
                      {selectedKit.category && (
                        <Badge variant="outline" className="text-xs">{selectedKit.category}</Badge>
                      )}
                    </div>
                    {selectedKit.description && (
                      <p className="text-sm text-teal-700">{selectedKit.description}</p>
                    )}
                    {selectedKit.items && selectedKit.items.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-teal-700">
                          Materiais do kit ({selectedKit.items.length}):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedKit.items.map((item: any) => (
                            <Badge
                              key={item.id}
                              variant="secondary"
                              className="text-xs bg-orange-100 text-orange-800"
                            >
                              🔧 {item.material?.name || "Material"} ({item.quantity})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <span className="text-blue-600">💊</span> Medicamentos
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Buscar medicamento..."
                        value={searchMedication}
                        onChange={(e) => {
                          setSearchMedication(e.target.value);
                          setShowMedicationSearch(true);
                        }}
                        onFocus={() => setShowMedicationSearch(true)}
                        data-testid="input-buscar-medicamento"
                      />
                      {showMedicationSearch && searchMedication && filteredMedications.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredMedications.map((med: any) => (
                            <button
                              key={med.id}
                              type="button"
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 text-sm"
                              onClick={() => addMedication(med)}
                            >
                              <div className="font-medium">{med.name}</div>
                              {med.concentration && (
                                <div className="text-xs text-gray-500">{med.concentration}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <span className="text-orange-600">🔧</span> Materiais
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Buscar material..."
                        value={searchMaterial}
                        onChange={(e) => {
                          setSearchMaterial(e.target.value);
                          setShowMaterialSearch(true);
                        }}
                        onFocus={() => setShowMaterialSearch(true)}
                        data-testid="input-buscar-material"
                      />
                      {showMaterialSearch && searchMaterial && filteredMaterials.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredMaterials.map((mat: any) => (
                            <button
                              key={mat.id}
                              type="button"
                              className="w-full px-3 py-2 text-left hover:bg-orange-50 text-sm"
                              onClick={() => addMaterial(mat)}
                            >
                              <div className="font-medium">{mat.name}</div>
                              {mat.code && (
                                <div className="text-xs text-gray-500">Código: {mat.code}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {customItems.length > 0 && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Itens selecionados ({customItems.length}):
                    </p>
                    <div className="space-y-2">
                      {customItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-2 rounded-lg border ${
                            item.itemType === "medication"
                              ? "bg-blue-50 border-blue-200"
                              : "bg-orange-50 border-orange-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{item.itemType === "medication" ? "💊" : "🔧"}</span>
                              <span className="font-medium text-sm">{item.itemName}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              onClick={() => removeItem(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Input
                              type="number"
                              min="1"
                              className="w-20 h-8 text-sm"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                              placeholder="Qtd"
                            />
                            <span className="text-sm text-gray-500 self-center">{item.unit}</span>
                            <Input
                              className="flex-1 h-8 text-sm"
                              value={item.instructions}
                              onChange={(e) => updateItemInstructions(item.id, e.target.value)}
                              placeholder="Instruções (opcional)"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {(hasMedicationItems || hasMaterialItems) && (
                      <div className="flex gap-2 pt-2 border-t">
                        {hasMedicationItems && (
                          <Badge className="bg-blue-500">→ Farmácia</Badge>
                        )}
                        {hasMaterialItems && (
                          <Badge className="bg-orange-500">→ Almoxarifado</Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-prioridade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instruções especiais..."
                className="min-h-[60px]"
                data-testid="input-observacoes-procedimento"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={
                (requestMode === "kit" && !selectedKitId) ||
                (requestMode === "custom" && customItems.length === 0) ||
                createProcedureMutation.isPending
              }
              className="w-full bg-teal-600 hover:bg-teal-700"
              data-testid="button-solicitar-procedimento"
            >
              {createProcedureMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Solicitando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Solicitar Procedimento
                </>
              )}
            </Button>

            {patientProcedures.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Procedimentos solicitados ({patientProcedures.length}):
                </p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {patientProcedures.map((proc: any) => (
                    <div
                      key={proc.id}
                      className={`p-2 rounded-lg border ${
                        proc.status === "completed"
                          ? "bg-green-50 border-green-200"
                          : proc.status === "cancelled"
                          ? "bg-gray-50 border-gray-200"
                          : "bg-teal-50 border-teal-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-teal-600" />
                          <span className="font-medium text-sm">
                            {proc.requestMode === "kit"
                              ? proc.kit?.name || "Kit"
                              : `Personalizado (${proc.items?.length || 0} itens)`}
                          </span>
                          {proc.fulfillmentChannel && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                proc.fulfillmentChannel === "pharmacy"
                                  ? "text-blue-600 border-blue-300"
                                  : proc.fulfillmentChannel === "materials"
                                  ? "text-orange-600 border-orange-300"
                                  : "text-purple-600 border-purple-300"
                              }`}
                            >
                              {proc.fulfillmentChannel === "pharmacy"
                                ? "Farmácia"
                                : proc.fulfillmentChannel === "materials"
                                ? "Almoxarifado"
                                : "Misto"}
                            </Badge>
                          )}
                        </div>
                        <Badge
                          className={
                            proc.status === "completed"
                              ? "bg-green-500"
                              : proc.status === "cancelled"
                              ? "bg-gray-500"
                              : proc.status === "in_progress"
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          }
                        >
                          {proc.status === "completed"
                            ? "Concluído"
                            : proc.status === "cancelled"
                            ? "Cancelado"
                            : proc.status === "in_progress"
                            ? "Em Andamento"
                            : "Pendente"}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {proc.createdAt && format(new Date(proc.createdAt), "dd/MM/yyyy HH:mm")}
                        {proc.priority !== "normal" && (
                          <Badge
                            variant="outline"
                            className={`ml-2 ${
                              proc.priority === "urgent"
                                ? "text-red-600 border-red-300"
                                : proc.priority === "high"
                                ? "text-orange-600 border-orange-300"
                                : "text-green-600 border-green-300"
                            }`}
                          >
                            {proc.priority === "urgent"
                              ? "Urgente"
                              : proc.priority === "high"
                              ? "Alta"
                              : "Baixa"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button type="button" variant="outline" onClick={onBack}>
            <ChevronDown className="h-4 w-4 mr-2 rotate-90" />
            Voltar: Prescrição
          </Button>
          <Button
            type="button"
            onClick={onNext}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Próximo: Exames
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function QuickNotes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRecordIdRef = useRef<string | null>(null);
  
  const [cidSearch, setCidSearch] = useState("");
  const [debouncedCidSearch, setDebouncedCidSearch] = useState("");
  const [showCidResults, setShowCidResults] = useState(false);
  const [selectedCid, setSelectedCid] = useState<{ code: string; description: string } | null>(null);
  const [selectedExames, setSelectedExames] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCidSearch(cidSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [cidSearch]);
  
  const { data: cidResults = [], isLoading: isLoadingCid } = useQuery<CidCode[]>({
    queryKey: ["/api/cid/search", debouncedCidSearch],
    queryFn: async () => {
      if (debouncedCidSearch.length < 2) return [];
      const res = await fetch(`/api/cid/search?q=${encodeURIComponent(debouncedCidSearch)}&limit=20`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: debouncedCidSearch.length >= 2,
  });
  
  const getExameById = (id: string): ExameItem | null => {
    for (const tipo of EXAMES_DATABASE) {
      for (const categoria of tipo.categorias) {
        const exame = categoria.exames.find(e => e.id === id);
        if (exame) return exame;
      }
    }
    return null;
  };
  
  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  
  const [generatedReceita, setGeneratedReceita] = useState<any>(null);
  const [isGeneratingReceita, setIsGeneratingReceita] = useState(false);
  const [generatedAtestado, setGeneratedAtestado] = useState<any>(null);
  const [isGeneratingAtestado, setIsGeneratingAtestado] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedEvolution, setSelectedEvolution] = useState<SelectHospitalizationEvolution | null>(null);
  const [showSendAtestadoDialog, setShowSendAtestadoDialog] = useState(false);
  const [atestadoDias, setAtestadoDias] = useState<string>("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  
  const [prescricaoItens, setPrescricaoItens] = useState<PrescricaoItem[]>([]);
  const [medSearch, setMedSearch] = useState("");
  const [showMedResults, setShowMedResults] = useState(false);
  const [selectedMed, setSelectedMed] = useState<{ name: string; doses: string[] } | null>(null);
  const [currentDose, setCurrentDose] = useState("");
  const [currentVia, setCurrentVia] = useState("");
  const [currentFrequencia, setCurrentFrequencia] = useState("");
  const [currentInstrucao, setCurrentInstrucao] = useState("");
  const [currentDuracao, setCurrentDuracao] = useState("");
  
  const [activeSection, setActiveSection] = useState<"anamnese" | "prescricao" | "procedimento" | "exames" | "receituario" | "atestado" | "historico">("anamnese");

  const urlParams = new URLSearchParams(searchParams);
  const appointmentId = urlParams.get("appointmentId");
  const queueId = urlParams.get("queueId");
  const hospitalizationId = urlParams.get("hospitalizationId");

  const { data: queueEntry } = useQuery<any>({
    queryKey: ["/api/queue", queueId],
    enabled: !!queueId,
  });

  const { data: hospitalization } = useQuery<any>({
    queryKey: ["/api/hospitalizations", hospitalizationId],
    enabled: !!hospitalizationId,
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: specialties = [] } = useQuery<Specialty[]>({
    queryKey: ["/api/specialties"],
  });

  // Buscar medicamentos do catálogo da farmácia
  const { data: pharmacyMedications = [] } = useQuery<SelectMedicationsCatalog[]>({
    queryKey: ["/api/medications"],
  });

  // Tipo unificado para medicamentos (farmácia + lista estática)
  type MedicationItem = {
    name: string;
    doses: string[];
    pharmacyId?: string;
    genericName?: string;
  };

  // Transformar medicamentos da farmácia para o formato esperado pelo autocomplete
  const medicationsFromPharmacy: MedicationItem[] = pharmacyMedications.map(med => ({
    name: `${med.name}${med.form ? ` (${med.form})` : ''}`,
    doses: med.concentration ? [med.concentration] : [],
    pharmacyId: med.id,
    genericName: med.genericName || '',
  }));

  // Combinar medicamentos da farmácia com a lista estática (farmácia tem prioridade)
  const combinedMedications: MedicationItem[] = [
    ...medicationsFromPharmacy,
    ...MEDICAMENTOS_LISTA.filter(staticMed => 
      !medicationsFromPharmacy.some(pharmMed => 
        pharmMed.name.toLowerCase().includes(staticMed.name.toLowerCase())
      )
    )
  ];

  const patientIdFromQueue = queueEntry?.patientId || hospitalization?.patientId;
  
  const { data: triageData } = useQuery<Triage[]>({
    queryKey: ["/api/triage/patient", patientIdFromQueue],
    enabled: !!patientIdFromQueue,
  });
  
  const latestTriage = triageData && triageData.length > 0 
    ? triageData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

  // Buscar evoluções da internação para exibir no menu lateral
  const { data: hospitalizationEvolutions = [] } = useQuery<SelectHospitalizationEvolution[]>({
    queryKey: ["/api/hospitalizations", hospitalizationId, "evolutions"],
    queryFn: async () => {
      const response = await fetch(`/api/hospitalizations/${hospitalizationId}/evolutions`);
      if (!response.ok) throw new Error("Erro ao buscar evoluções");
      return response.json();
    },
    enabled: !!hospitalizationId,
  });

  // Verificar se é enfermeiro em contexto de internação
  const isNurseInHospitalization = hospitalizationId && (user?.role === "triage" || user?.role === "nurse");

  // Determinar contexto de origem para procedimentos (exclusivo para internação, observação, sala vermelha)
  const procedureSourceType = hospitalizationId 
    ? "hospitalization" 
    : queueEntry?.serviceType === "observacao" || queueEntry?.attendanceLocation === "observacao"
    ? "observation"
    : queueEntry?.serviceType === "sala_vermelha" || queueEntry?.attendanceLocation === "sala_vermelha"
    ? "red_room"
    : null;
  
  const procedureSourceName = procedureSourceType === "hospitalization" 
    ? `Internação - ${hospitalization?.ward?.name || "Leito " + (hospitalization?.bed?.bedNumber || "")}`
    : procedureSourceType === "observation"
    ? "Sala de Observação"
    : procedureSourceType === "red_room"
    ? "Sala Vermelha"
    : "";
  
  // Procedimentos só são permitidos em internação, observação ou sala vermelha
  const showProcedureMenu = procedureSourceType !== null;

  const { data: patientDocuments = [], isLoading: isLoadingDocuments } = useQuery<any[]>({
    queryKey: ["/api/medical-documents", { patientId: patientIdFromQueue }],
    queryFn: async () => {
      const response = await fetch(`/api/medical-documents?patientId=${patientIdFromQueue}`);
      if (!response.ok) throw new Error("Erro ao buscar documentos");
      return response.json();
    },
    enabled: !!patientIdFromQueue && activeSection === "historico",
  });

  const { data: patientMedicalHistory = [], isLoading: isLoadingHistory } = useQuery<any[]>({
    queryKey: ["/api/medical-history/patient", patientIdFromQueue],
    enabled: !!patientIdFromQueue && activeSection === "historico",
  });

  const patientPrescriptions = patientDocuments.filter(doc => doc.documentType === "prescription");
  const patientCertificates = patientDocuments.filter(doc => doc.documentType === "certificate");
  const patientExamResults = patientDocuments.filter(doc => doc.documentType === "exam_result");
  const patientLabResults = patientDocuments.filter(doc => doc.documentType === "lab_results");
  const patientRadiologyImages = patientDocuments.filter(doc => doc.documentType === "radiology_images");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: "",
      specialtyId: "",
      consultationDate: format(new Date(), "yyyy-MM-dd"),
      consultationTime: format(new Date(), "HH:mm"),
      doctorName: user?.name || "",
      anamnese: "",
      cid: "",
      cidDescription: "",
      prescricao: "",
      medicacoesReceita: "",
      atestadoTexto: "",
    },
  });

  useEffect(() => {
    if (queueEntry && patients.length > 0 && specialties.length > 0) {
      const patient = patients.find(p => p.id === queueEntry.patientId);
      if (patient) {
        form.setValue("patientId", patient.id);
      }
      
      if (user?.medicalSpecialty) {
        let doctorSpecialty = specialties.find(s => s.name === user.medicalSpecialty);
        if (!doctorSpecialty) {
          const normalizedSpecialty = user.medicalSpecialty.replace(/ista$/i, 'ia');
          doctorSpecialty = specialties.find(s => s.name === normalizedSpecialty);
        }
        if (!doctorSpecialty) {
          const searchTerm = user.medicalSpecialty.toLowerCase().replace(/ista$/i, '');
          doctorSpecialty = specialties.find(s => 
            s.name.toLowerCase().startsWith(searchTerm)
          );
        }
        if (doctorSpecialty) {
          form.setValue("specialtyId", doctorSpecialty.id);
        }
      }
      
      form.setValue("consultationDate", format(new Date(), "yyyy-MM-dd"));
      form.setValue("consultationTime", format(new Date(), "HH:mm"));
    }
  }, [queueEntry, patients, specialties, user, form]);

  useEffect(() => {
    if (hospitalization && patients.length > 0 && specialties.length > 0) {
      const patient = patients.find(p => p.id === hospitalization.patientId);
      if (patient) {
        form.setValue("patientId", patient.id);
      }
      
      if (user?.medicalSpecialty) {
        let doctorSpecialty = specialties.find(s => s.name === user.medicalSpecialty);
        if (!doctorSpecialty) {
          const normalizedSpecialty = user.medicalSpecialty.replace(/ista$/i, 'ia');
          doctorSpecialty = specialties.find(s => s.name === normalizedSpecialty);
        }
        if (!doctorSpecialty) {
          const searchTerm = user.medicalSpecialty.toLowerCase().replace(/ista$/i, '');
          doctorSpecialty = specialties.find(s => 
            s.name.toLowerCase().startsWith(searchTerm)
          );
        }
        if (doctorSpecialty) {
          form.setValue("specialtyId", doctorSpecialty.id);
        }
      }
      
      form.setValue("consultationDate", format(new Date(), "yyyy-MM-dd"));
      form.setValue("consultationTime", format(new Date(), "HH:mm"));
    }
  }, [hospitalization, patients, specialties, user, form]);

  useEffect(() => {
    if (user?.name) {
      form.setValue("doctorName", user.name);
    }
  }, [user, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const recordId = currentRecordIdRef.current;
      
      const now = new Date();
      const payload: any = {
        patientId: data.patientId,
        specialtyId: data.specialtyId,
        consultationDate: data.consultationDate,
        consultationTime: format(now, "HH:mm:ss"),
        startTime: now.toISOString(),
        doctorName: data.doctorName,
        reason: data.anamnese,
        diagnosis: selectedCid ? `${selectedCid.code} - ${selectedCid.description}` : data.cid || "",
        medications: data.prescricao || "",
        symptoms: "",
        treatment: "",
        observations: "",
        examResults: selectedExames.length > 0 
          ? selectedExames.map(id => getExameById(id)?.name).filter(Boolean).join(", ")
          : "",
        nextConsultation: "",
      };
      
      if (appointmentId) {
        payload.appointmentId = appointmentId;
      }
      if (queueId) {
        payload.queueId = queueId;
      }
      if (hospitalizationId) {
        payload.hospitalizationId = hospitalizationId;
      }
      
      if (recordId) {
        const res = await apiRequest(`/api/medical-history/${recordId}`, {
          method: "PUT",
          body: payload,
        });
        return res;
      } else {
        const res = await apiRequest("/api/medical-history", {
          method: "POST",
          body: payload,
        });
        return res;
      }
    },
    onSuccess: async (data) => {
      if (!currentRecordIdRef.current && data?.id) {
        setCurrentRecordId(data.id);
        currentRecordIdRef.current = data.id;
      }
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/medical-history"] });
      // Invalidate hospitalization medical history cache for real-time updates
      if (hospitalizationId) {
        queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations", hospitalizationId, "medical-history"] });
      }
      
      if (!isAutoSaving && selectedExames.length > 0 && user?.id && data?.id) {
        const formData = form.getValues();
        const now = new Date();
        const requestDate = format(now, "yyyy-MM-dd");
        const requestTime = format(now, "HH:mm");
        
        for (const exameId of selectedExames) {
          const exame = getExameById(exameId);
          if (exame) {
            const tipo = EXAMES_DATABASE.find(t => 
              t.categorias.some(c => c.exames.some(e => e.id === exameId))
            );
            const categoria = tipo?.categorias.find(c => c.exames.some(e => e.id === exameId));
            
            try {
              await apiRequest("/api/exam-requests", {
                method: "POST",
                body: {
                  patientId: formData.patientId,
                  medicalHistoryId: data.id,
                  queueEntryId: queueId || null,
                  requestingDoctorId: user.id,
                  requestingDoctorName: user.name || formData.doctorName,
                  examType: tipo?.id || "laboratorio",
                  examCategory: categoria?.id || "outros",
                  examName: exame.name,
                  examCode: exameId,
                  priority: "normal",
                  clinicalIndication: selectedCid ? `${selectedCid.code} - ${selectedCid.description}` : "",
                  requestDate,
                  requestTime,
                }
              });
            } catch (err) {
              console.error("Erro ao criar solicitação de exame:", err);
            }
          }
        }
        queryClient.invalidateQueries({ queryKey: ["/api/exam-requests"] });
      }
      
      if (!isAutoSaving) {
        toast({
          title: "Salvo com sucesso",
          description: selectedExames.length > 0 
            ? `Consulta salva e ${selectedExames.length} solicitação(ões) de exame(s) criada(s).`
            : "Consulta salva com sucesso.",
        });
        
        if (queueId) {
          setTimeout(() => {
            setLocation("/fila-medico");
          }, 500);
        }
      }
    },
    onError: (error: any) => {
      if (!isAutoSaving) {
        toast({
          title: "Erro ao salvar",
          description: error?.message || "Não foi possível salvar.",
          variant: "destructive",
        });
      }
    },
    onSettled: () => {
      setIsSaving(false);
      setIsAutoSaving(false);
    },
  });

  const generateReceitaMutation = useMutation({
    mutationFn: async () => {
      const data = form.getValues();
      const patient = patients.find(p => p.id === data.patientId);
      
      if (!patient) throw new Error("Paciente não encontrado");
      if (!data.medicacoesReceita) throw new Error("Preencha as medicações antes de gerar a receita");
      if (!user?.id) throw new Error("Usuário não autenticado");
      if (!user?.crm) throw new Error("CRM do médico não cadastrado");
      
      const diagnosis = selectedCid ? `${selectedCid.code} - ${selectedCid.description}` : "";
      
      const formattedContent = [
        `RECEITA MÉDICA`,
        ``,
        `Paciente: ${patient.name}`,
        `CPF: ${patient.cpf}`,
        `Data: ${format(new Date(), "dd/MM/yyyy")}`,
        ``,
        diagnosis ? `Diagnóstico: ${diagnosis}` : "",
        ``,
        `PRESCRIÇÃO:`,
        ``,
        data.medicacoesReceita,
        ``,
        `---`,
        `${user.name}`,
        `CRM: ${user.crm}`,
      ].filter(Boolean).join("\n");
      
      const documentData = {
        patientId: data.patientId,
        doctorId: user.id,
        doctorName: user.name || data.doctorName,
        doctorCrm: user.crm,
        documentType: "prescription" as const,
        title: "Receita Médica",
        content: formattedContent,
        diagnosis: diagnosis,
        medications: data.medicacoesReceita,
        observations: "",
        cid: selectedCid?.code || "",
        issueDate: format(new Date(), "yyyy-MM-dd"),
        sentViaWhatsApp: false,
        sentViaEmail: false,
        printed: false,
        isSigned: false,
      };
      
      const response = await apiRequest("/api/medical-documents", {
        method: "POST",
        body: documentData,
      });
      
      if (prescricaoItens.length > 0) {
        try {
          // Determinar origem da prescrição
          let sourceType = "outpatient";
          let sourceId = "";
          let sourceName = "Ambulatório";
          if (hospitalizationId && hospitalization) {
            sourceType = "hospitalization";
            sourceId = hospitalizationId;
            sourceName = `Internação - ${hospitalization.ward?.name || "Leito " + hospitalization.bed?.bedNumber}`;
          } else if (queueId && queueEntry) {
            if (queueEntry.serviceType === "observacao" || queueEntry.attendanceLocation === "observacao") {
              sourceType = "observation";
              sourceName = "Sala de Observação";
            } else if (queueEntry.serviceType === "sala_vermelha" || queueEntry.attendanceLocation === "sala_vermelha") {
              sourceType = "red_room";
              sourceName = "Sala Vermelha";
            } else {
              sourceType = "queue";
              sourceName = "Atendimento Fila";
            }
            sourceId = queueId;
          } else if (appointmentId) {
            sourceType = "appointment";
            sourceId = appointmentId;
            sourceName = "Consulta Agendada";
          }
          
          const prescriptionData = {
            medicalDocumentId: response.id,
            patientId: data.patientId,
            doctorId: user.id,
            doctorName: user.name || data.doctorName,
            prescriptionDate: format(new Date(), "yyyy-MM-dd"),
            status: "pending",
            notes: diagnosis || "",
            sourceType,
            sourceId,
            sourceName,
          };
          
          const pharmacyPrescription = await apiRequest("/api/pharmacy/prescriptions", {
            method: "POST",
            body: prescriptionData,
          });
          
          for (const item of prescricaoItens) {
            await apiRequest(`/api/pharmacy/prescriptions/${pharmacyPrescription.id}/items`, {
              method: "POST",
              body: {
                medicationName: item.medicamento,
                dosage: item.dose || "",
                frequency: item.frequencia || "",
                duration: item.duracao || "",
                instructions: [item.via, item.instrucao].filter(Boolean).join(" - ") || "",
                quantityPrescribed: "1",
                status: "pending",
                kitId: item.kitId || null,
                kitName: item.kitName || null,
              },
            });
          }
          
          console.log("✅ Prescrição enviada para farmácia:", pharmacyPrescription.id);
        } catch (pharmacyError) {
          console.error("⚠️ Erro ao criar prescrição na farmácia:", pharmacyError);
        }
      }
      
      return response;
    },
    onSuccess: (data) => {
      setGeneratedReceita(data);
      queryClient.invalidateQueries({ queryKey: ["/api/medical-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions"] });
      const hasPharmacyItems = prescricaoItens.length > 0;
      toast({
        title: "Receita gerada",
        description: hasPharmacyItems 
          ? "Receita criada e enviada para dispensação na farmácia." 
          : "Receita médica criada com sucesso. Agora você pode imprimir ou enviar.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar receita",
        description: error?.message || "Não foi possível gerar a receita.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGeneratingReceita(false);
    },
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return await apiRequest(`/api/medical-documents/${documentId}/send-whatsapp`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Enviado via WhatsApp",
        description: "Receita enviada ao paciente via WhatsApp.",
      });
      setShowSendDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar via WhatsApp",
        description: error?.message || "Não foi possível enviar.",
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ documentId, email }: { documentId: string; email: string }) => {
      return await apiRequest(`/api/medical-documents/${documentId}/send-email`, {
        method: "POST",
        body: { recipientEmail: email },
      });
    },
    onSuccess: () => {
      toast({
        title: "Enviado via Email",
        description: "Receita enviada para o email informado.",
      });
      setShowSendDialog(false);
      setRecipientEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar via Email",
        description: error?.message || "Não foi possível enviar.",
        variant: "destructive",
      });
    },
  });

  // Mutation para enviar prescrição diretamente para a farmácia (medicamentos internos do hospital)
  const [isSendingToPharmacy, setIsSendingToPharmacy] = useState(false);
  const [isSendingToList, setIsSendingToList] = useState(false);
  
  const sendToPharmacyMutation = useMutation({
    mutationFn: async () => {
      const data = form.getValues();
      const patient = patients.find(p => p.id === data.patientId);
      
      if (!patient) throw new Error("Paciente não encontrado");
      if (prescricaoItens.length === 0) throw new Error("Adicione pelo menos um medicamento");
      if (!user?.id) throw new Error("Usuário não autenticado");
      
      const diagnosis = selectedCid ? `${selectedCid.code} - ${selectedCid.description}` : "";
      
      // Determinar origem da prescrição
      let sourceType = "outpatient";
      let sourceId = "";
      let sourceName = "Ambulatório";
      if (hospitalizationId && hospitalization) {
        sourceType = "hospitalization";
        sourceId = hospitalizationId;
        sourceName = `Internação - ${hospitalization.ward?.name || "Leito " + hospitalization.bed?.bedNumber}`;
      } else if (queueId && queueEntry) {
        if (queueEntry.serviceType === "observacao" || queueEntry.attendanceLocation === "observacao") {
          sourceType = "observation";
          sourceName = "Sala de Observação";
        } else if (queueEntry.serviceType === "sala_vermelha" || queueEntry.attendanceLocation === "sala_vermelha") {
          sourceType = "red_room";
          sourceName = "Sala Vermelha";
        } else {
          sourceType = "queue";
          sourceName = "Atendimento Fila";
        }
        sourceId = queueId;
      } else if (appointmentId) {
        sourceType = "appointment";
        sourceId = appointmentId;
        sourceName = "Consulta Agendada";
      }
      
      // Criar prescrição na farmácia
      const prescriptionData = {
        patientId: data.patientId,
        doctorId: user.id,
        doctorName: user.name || data.doctorName,
        prescriptionDate: format(new Date(), "yyyy-MM-dd"),
        status: "pending",
        notes: diagnosis || data.anamnese?.substring(0, 200) || "",
        sourceType,
        sourceId,
        sourceName,
      };
      
      const pharmacyPrescription = await apiRequest("/api/pharmacy/prescriptions", {
        method: "POST",
        body: prescriptionData,
      });
      
      // Criar itens da prescrição
      for (const item of prescricaoItens) {
        await apiRequest(`/api/pharmacy/prescriptions/${pharmacyPrescription.id}/items`, {
          method: "POST",
          body: {
            medicationName: item.medicamento,
            dosage: item.dose || "",
            frequency: item.frequencia || "",
            duration: item.duracao || "",
            instructions: [item.via, item.instrucao].filter(Boolean).join(" - ") || "",
            quantityPrescribed: "1",
            status: "pending",
            kitId: item.kitId || null,
            kitName: item.kitName || null,
          },
        });
      }
      
      return pharmacyPrescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescriptions"] });
      toast({
        title: "Enviado para Farmácia",
        description: `${prescricaoItens.length} medicamento(s) enviado(s) para dispensação na farmácia do hospital.`,
      });
      // Limpar lista após envio (manter texto da prescrição para salvar no prontuário)
      setPrescricaoItens([]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar para farmácia",
        description: error?.message || "Não foi possível enviar a prescrição.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSendingToPharmacy(false);
    },
  });

  const handleSendToPharmacy = () => {
    const data = form.getValues();
    if (prescricaoItens.length === 0) {
      toast({
        title: "Nenhum medicamento",
        description: "Adicione pelo menos um medicamento à prescrição.",
        variant: "destructive",
      });
      return;
    }
    if (!data.patientId) {
      toast({
        title: "Paciente não selecionado",
        description: "É necessário ter um paciente selecionado.",
        variant: "destructive",
      });
      return;
    }
    setIsSendingToPharmacy(true);
    sendToPharmacyMutation.mutate();
  };

  const sendToListMutation = useMutation({
    mutationFn: async () => {
      const data = form.getValues();
      const patient = patients.find(p => p.id === data.patientId);
      if (!patient) throw new Error("Paciente não encontrado");
      if (prescricaoItens.length === 0) throw new Error("Adicione pelo menos um medicamento");
      if (!user?.id) throw new Error("Usuário não autenticado");

      const diagnosis = selectedCid ? `${selectedCid.code} - ${selectedCid.description}` : "";

      let sourceType = "outpatient";
      let sourceId = "";
      let sourceName = "Ambulatório";
      if (hospitalizationId && hospitalization) {
        sourceType = "hospitalization";
        sourceId = hospitalizationId;
        sourceName = `Internação - ${hospitalization.ward?.name || "Leito " + hospitalization.bed?.bedNumber}`;
      } else if (queueId && queueEntry) {
        if (queueEntry.serviceType === "observacao" || queueEntry.attendanceLocation === "observacao") {
          sourceType = "observation";
          sourceName = "Sala de Observação";
        } else if (queueEntry.serviceType === "sala_vermelha" || queueEntry.attendanceLocation === "sala_vermelha") {
          sourceType = "red_room";
          sourceName = "Sala Vermelha";
        } else {
          sourceType = "queue";
          sourceName = "Atendimento Fila";
        }
        sourceId = queueId;
      } else if (appointmentId) {
        sourceType = "appointment";
        sourceId = appointmentId;
        sourceName = "Consulta Agendada";
      }

      const prescriptionData = {
        patientId: data.patientId,
        doctorId: user.id,
        doctorName: user.name || data.doctorName,
        prescriptionDate: format(new Date(), "yyyy-MM-dd"),
        status: "pending",
        notes: diagnosis || data.anamnese?.substring(0, 200) || "",
        sourceType,
        sourceId,
        sourceName,
        sentToList: true,
      };

      const prescription = await apiRequest("/api/pharmacy/prescriptions", {
        method: "POST",
        body: prescriptionData,
      });

      for (const item of prescricaoItens) {
        await apiRequest(`/api/pharmacy/prescriptions/${prescription.id}/items`, {
          method: "POST",
          body: {
            medicationName: item.medicamento,
            dosage: item.dose || "",
            frequency: item.frequencia || "",
            duration: item.duracao || "",
            instructions: [item.via, item.instrucao].filter(Boolean).join(" - ") || "",
            quantityPrescribed: "1",
            status: "pending",
            kitId: item.kitId || null,
            kitName: item.kitName || null,
          },
        });
      }

      return prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/prescription-list"] });
      toast({
        title: "Enviado para Lista",
        description: `${prescricaoItens.length} medicamento(s) adicionado(s) à lista de prescrições da farmácia.`,
      });
      setPrescricaoItens([]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar para lista",
        description: error?.message || "Não foi possível enviar a prescrição.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSendingToList(false);
    },
  });

  const handleSendToList = () => {
    const data = form.getValues();
    if (prescricaoItens.length === 0) {
      toast({
        title: "Nenhum medicamento",
        description: "Adicione pelo menos um medicamento à prescrição.",
        variant: "destructive",
      });
      return;
    }
    if (!data.patientId) {
      toast({
        title: "Paciente não selecionado",
        description: "É necessário ter um paciente selecionado.",
        variant: "destructive",
      });
      return;
    }
    setIsSendingToList(true);
    sendToListMutation.mutate();
  };

  const handleGenerateReceita = () => {
    const data = form.getValues();
    if (!data.medicacoesReceita) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha as medicações antes de gerar a receita.",
        variant: "destructive",
      });
      return;
    }
    if (!data.patientId) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione um paciente.",
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingReceita(true);
    generateReceitaMutation.mutate();
  };

  const handlePrintReceita = () => {
    if (!generatedReceita?.id) {
      toast({
        title: "Gere a receita primeiro",
        description: "Clique em 'Gerar Receita' antes de imprimir.",
        variant: "destructive",
      });
      return;
    }
    window.open(`/api/medical-documents/${generatedReceita.id}/pdf`, '_blank');
  };

  const generateAtestadoMutation = useMutation({
    mutationFn: async () => {
      const data = form.getValues();
      const patient = patients.find(p => p.id === data.patientId);
      
      if (!patient) throw new Error("Paciente não encontrado");
      if (!data.atestadoTexto) throw new Error("Preencha o texto do atestado");
      if (!user?.id) throw new Error("Usuário não autenticado");
      if (!user?.crm) throw new Error("CRM do médico não cadastrado");
      
      const diagnosis = selectedCid ? `${selectedCid.code} - ${selectedCid.description}` : "";
      
      const documentData = {
        patientId: data.patientId,
        doctorId: user.id,
        doctorName: user.name || data.doctorName,
        doctorCrm: user.crm,
        documentType: "certificate" as const,
        title: "Atestado Médico",
        content: data.atestadoTexto,
        diagnosis: diagnosis,
        medications: "",
        observations: data.atestadoTexto,
        cid: selectedCid?.code || "",
        issueDate: format(new Date(), "yyyy-MM-dd"),
        sentViaWhatsApp: false,
        sentViaEmail: false,
        printed: false,
        isSigned: false,
      };
      
      const response = await apiRequest("/api/medical-documents", {
        method: "POST",
        body: documentData,
      });
      
      return response;
    },
    onSuccess: (data) => {
      setGeneratedAtestado(data);
      queryClient.invalidateQueries({ queryKey: ["/api/medical-documents"] });
      toast({
        title: "Atestado gerado",
        description: "Atestado médico criado com sucesso. Agora você pode imprimir ou enviar.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar atestado",
        description: error?.message || "Não foi possível gerar o atestado.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGeneratingAtestado(false);
    },
  });

  const handleGenerateAtestado = () => {
    const data = form.getValues();
    if (!data.atestadoTexto) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha o texto do atestado antes de gerar.",
        variant: "destructive",
      });
      return;
    }
    if (!data.patientId) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione um paciente.",
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingAtestado(true);
    generateAtestadoMutation.mutate();
  };

  const handlePrintAtestado = () => {
    if (!generatedAtestado?.id) {
      toast({
        title: "Gere o atestado primeiro",
        description: "Clique em 'Gerar Atestado' antes de imprimir.",
        variant: "destructive",
      });
      return;
    }
    window.open(`/api/medical-documents/${generatedAtestado.id}/pdf`, '_blank');
  };

  const handleViewDocument = (doc: any) => {
    setViewingDocument(doc);
    setShowDocumentViewer(true);
  };

  const handleDownloadDocument = (doc: any) => {
    window.open(`/api/medical-documents/${doc.id}/pdf`, '_blank');
  };

  const isFormValid = (data: FormData) => {
    return data.patientId && data.specialtyId && data.anamnese && data.doctorName;
  };

  useEffect(() => {
    const subscription = form.watch((formData) => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      if (isFormValid(formData as FormData) && !isSaving) {
        autoSaveTimeoutRef.current = setTimeout(() => {
          setIsAutoSaving(true);
          setIsSaving(true);
          saveMutation.mutate(formData as FormData);
        }, 10000);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [form, isSaving]);

  const handleManualSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    const data = form.getValues();
    
    if (!data.patientId) {
      toast({
        title: "Campo obrigatório",
        description: "Paciente não selecionado.",
        variant: "destructive",
      });
      return;
    }
    if (!data.anamnese) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha a anamnese.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    saveMutation.mutate(data);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [form]);

  const filteredCids = cidResults;

  const handleSelectCid = (cid: { code: string; description: string }) => {
    setSelectedCid(cid);
    setCidSearch(`${cid.code} - ${cid.description}`);
    form.setValue("cid", cid.code);
    form.setValue("cidDescription", cid.description);
    setShowCidResults(false);
  };

  const selectedPatient = patients.find(p => p.id === form.watch("patientId"));

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", { 
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.redirect || "/auth";
      } else {
        window.location.href = "/auth";
      }
    } catch (error) {
      console.error('Erro no logout:', error);
      window.location.href = "/auth";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            onClick={() => setLocation(hospitalizationId ? "/internacao" : queueId ? "/fila-medico" : "/")}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {hospitalizationId ? "Voltar para Internação" : "Voltar para Fila"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation('/observacao')}
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
            data-testid="button-observacao"
          >
            <Eye className="mr-2 h-4 w-4" />
            Observação
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation('/internacao')}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
            data-testid="button-internacao"
          >
            <Stethoscope className="mr-2 h-4 w-4" />
            Internação
          </Button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {hospitalizationId 
                  ? (user?.role === "triage" || user?.role === "nurse" ? "Evolução Enfermagem" : "Evolução Médica") 
                  : "Consulta Rápida"}
              </h1>
              <p className="text-sm text-gray-600">
                {lastSaved ? `Salvo às ${format(lastSaved, "HH:mm:ss")}` : "Não salvo ainda"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {isSaving && (
              <Badge variant="secondary" className="flex items-center space-x-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Salvando...</span>
              </Badge>
            )}
            <Button
              onClick={handleManualSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar (Ctrl+S)
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50"
              data-testid="logout-button"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {selectedPatient && (
          <Card className="mb-4 bg-blue-600 text-white">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm opacity-80">Paciente</p>
                  <p className="text-xl font-bold">{selectedPatient.name}</p>
                  <p className="text-sm opacity-80">
                    {selectedPatient.birthDate ? `${Math.floor((new Date().getTime() - new Date(selectedPatient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} anos` : "Idade não informada"} 
                    {" • "}
                    {selectedPatient.gender === "masculino" ? "Masculino" : selectedPatient.gender === "feminino" ? "Feminino" : "Não informado"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Form {...form}>
          <div className="flex gap-4">
            {/* Menu Lateral */}
            <aside className="w-48 shrink-0">
              <Card className="shadow-lg sticky top-4">
                <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg py-3">
                  <CardTitle className="text-sm font-semibold">Menu</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <nav className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setActiveSection("anamnese")}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeSection === "anamnese"
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      data-testid="button-nav-anamnese"
                    >
                      <Stethoscope className="h-4 w-4" />
                      {hospitalizationId ? "Evolução" : "Anamnese"}
                    </button>
                    {!isNurseInHospitalization && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveSection("prescricao")}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            activeSection === "prescricao"
                              ? "bg-purple-600 text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          data-testid="button-nav-prescricao"
                        >
                          <Pill className="h-4 w-4" />
                          Prescrição
                        </button>
                        {showProcedureMenu && (
                          <button
                            type="button"
                            onClick={() => setActiveSection("procedimento")}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              activeSection === "procedimento"
                                ? "bg-teal-600 text-white"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                            data-testid="button-nav-procedimento"
                          >
                            <Scissors className="h-4 w-4" />
                            Procedimento
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveSection("exames")}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            activeSection === "exames"
                              ? "bg-orange-600 text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          data-testid="button-nav-exames"
                        >
                          <Scan className="h-4 w-4" />
                          Exames
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSection("atestado")}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            activeSection === "atestado"
                              ? "bg-indigo-600 text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          data-testid="button-nav-atestado"
                        >
                          <FileText className="h-4 w-4" />
                          Atestado
                        </button>
                        <div className="border-t my-2"></div>
                        <button
                          type="button"
                          onClick={() => setActiveSection("historico")}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            activeSection === "historico"
                              ? "bg-slate-700 text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          data-testid="button-nav-historico"
                        >
                          <History className="h-4 w-4" />
                          Histórico
                        </button>
                      </>
                    )}
                    
                    {/* Lista de Evoluções da Internação */}
                    {hospitalizationId && hospitalizationEvolutions.length > 0 && (
                      <>
                        <div className="border-t my-2"></div>
                        <p className="text-xs font-semibold text-gray-500 px-3 py-1">Evoluções Registradas</p>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {hospitalizationEvolutions.map((evolution) => (
                            <button 
                              key={evolution.id}
                              type="button"
                              onClick={() => setSelectedEvolution(evolution)}
                              className="w-full px-3 py-2 text-xs bg-gray-50 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <Badge 
                                  className={`text-xs ${
                                    evolution.createdByRole === 'doctor' ? 'bg-blue-500' : 'bg-green-500'
                                  }`}
                                >
                                  {evolution.createdByRole === 'doctor' ? 'Médico' : 'Enfermagem'}
                                </Badge>
                                <span className="text-gray-400">
                                  {format(new Date(evolution.evolutionDate), "dd/MM HH:mm")}
                                </span>
                              </div>
                              <p className="text-gray-600 truncate">
                                {evolution.createdByName}
                              </p>
                              {evolution.subjectiveNotes && (
                                <p className="text-gray-500 truncate mt-1">
                                  {evolution.subjectiveNotes.substring(0, 50)}...
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </nav>
                </CardContent>
              </Card>
            </aside>

            {/* Área de Conteúdo */}
            <section className="flex-1 space-y-4">
              {/* Card de Triagem - visível apenas para médicos (não para enfermeiros em internação) */}
              {latestTriage && !isNurseInHospitalization && (
                <Card className="shadow-lg border-l-4 border-l-amber-500">
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100 py-3">
                    <CardTitle className="flex items-center text-base text-amber-800">
                      <Activity className="h-5 w-5 mr-2" />
                      Dados da Triagem
                      <Badge 
                        className={`ml-auto ${
                          latestTriage.severity === 'emergencia' ? 'bg-red-600' :
                          latestTriage.severity === 'alta' ? 'bg-orange-500' :
                          latestTriage.severity === 'media' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                      >
                        {latestTriage.severity === 'emergencia' ? 'Emergência' :
                         latestTriage.severity === 'alta' ? 'Alta' :
                         latestTriage.severity === 'media' ? 'Média' : 'Baixa'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 pb-3">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      {latestTriage.temperature && (
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                          <Thermometer className="h-4 w-4 text-red-500" />
                          <div>
                            <p className="text-xs text-gray-500">Temp.</p>
                            <p className="font-semibold">{latestTriage.temperature}°C</p>
                          </div>
                        </div>
                      )}
                      {latestTriage.bloodPressure && (
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                          <Activity className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-xs text-gray-500">PA</p>
                            <p className="font-semibold">{latestTriage.bloodPressure}</p>
                          </div>
                        </div>
                      )}
                      {latestTriage.heartRate && (
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                          <Heart className="h-4 w-4 text-pink-500" />
                          <div>
                            <p className="text-xs text-gray-500">FC</p>
                            <p className="font-semibold">{latestTriage.heartRate} bpm</p>
                          </div>
                        </div>
                      )}
                      {latestTriage.respiratoryRate && (
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                          <Wind className="h-4 w-4 text-cyan-500" />
                          <div>
                            <p className="text-xs text-gray-500">FR</p>
                            <p className="font-semibold">{latestTriage.respiratoryRate} rpm</p>
                          </div>
                        </div>
                      )}
                      {latestTriage.oxygenSaturation && (
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                          <Droplets className="h-4 w-4 text-indigo-500" />
                          <div>
                            <p className="text-xs text-gray-500">SpO2</p>
                            <p className="font-semibold">{latestTriage.oxygenSaturation}%</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {latestTriage.mainSymptoms && (
                      <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                        <p className="text-xs font-medium text-amber-800 mb-1">Queixa Principal:</p>
                        <p className="text-sm text-amber-900">{latestTriage.mainSymptoms}</p>
                      </div>
                    )}
                    {(latestTriage.allergies || latestTriage.currentMedications || latestTriage.preExistingConditions) && (
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        {latestTriage.allergies && (
                          <div className="p-2 bg-red-50 rounded">
                            <span className="font-medium text-red-700">Alergias:</span> {latestTriage.allergies}
                          </div>
                        )}
                        {latestTriage.currentMedications && (
                          <div className="p-2 bg-blue-50 rounded">
                            <span className="font-medium text-blue-700">Medicações:</span> {latestTriage.currentMedications}
                          </div>
                        )}
                        {latestTriage.preExistingConditions && (
                          <div className="p-2 bg-purple-50 rounded">
                            <span className="font-medium text-purple-700">Condições:</span> {latestTriage.preExistingConditions}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Seção Anamnese + CID-10 */}
              {activeSection === "anamnese" && (
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg py-3">
                    <CardTitle className="flex items-center text-lg">
                      <Stethoscope className="h-5 w-5 mr-2" />
                      {hospitalizationId ? "Evolução" : "Anamnese e Diagnóstico"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-6">
                    {/* História Clínica */}
                    <FormField
                      control={form.control}
                      name="anamnese"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">
                            História Clínica *
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Descreva a história clínica, queixa principal, antecedentes pessoais e familiares, histórico de doenças, alergias, medicamentos em uso..."
                              className="min-h-[200px] text-sm resize-y"
                              data-testid="textarea-anamnese"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* CID-10 dentro da Anamnese - apenas para médicos */}
                    {!isNurseInHospitalization && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <ClipboardList className="h-5 w-5 text-green-600" />
                          <h3 className="text-sm font-semibold text-gray-800">CID-10 - Diagnóstico</h3>
                        </div>
                        
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              value={cidSearch}
                              onChange={(e) => {
                                setCidSearch(e.target.value);
                                setShowCidResults(true);
                                if (!e.target.value) {
                                  setSelectedCid(null);
                                }
                              }}
                              onFocus={() => setShowCidResults(true)}
                              placeholder="Digite o código ou descrição (ex: J11, gripe, diabetes...)"
                              className="pl-10 h-10"
                              data-testid="input-cid"
                            />
                          </div>
                          
                          {showCidResults && cidSearch.length >= 2 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                              {isLoadingCid ? (
                                <div className="px-4 py-3 text-center text-gray-500 flex items-center justify-center">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Buscando...
                                </div>
                              ) : filteredCids.length > 0 ? (
                                filteredCids.map((cid) => (
                                  <button
                                    key={cid.code}
                                    type="button"
                                    onClick={() => handleSelectCid(cid)}
                                    className="w-full px-4 py-2 text-left hover:bg-green-50 flex items-center space-x-3 border-b last:border-b-0"
                                  >
                                    <Badge variant="outline" className="font-mono text-sm">{cid.code}</Badge>
                                    <span className="text-sm">{cid.description}</span>
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-center text-gray-500">
                                  Nenhum CID encontrado para "{cidSearch}"
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {selectedCid && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-600 font-medium mb-2">CID Selecionado:</p>
                            <div className="flex items-center gap-3">
                              <Badge className="bg-green-600 text-base px-3 py-1">{selectedCid.code}</Badge>
                              <span className="text-sm text-green-800">{selectedCid.description}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCid(null);
                                  setCidSearch("");
                                  form.setValue("cid", "");
                                  form.setValue("cidDescription", "");
                                }}
                                className="ml-auto text-red-500 hover:text-red-700"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!isNurseInHospitalization && (
                      <div className="flex justify-end pt-4">
                        <Button
                          type="button"
                          onClick={() => setActiveSection("prescricao")}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Próximo: Prescrição
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Seção Prescrição */}
              {activeSection === "prescricao" && (
                <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg py-2">
                <CardTitle className="flex items-center text-base">
                  <Pill className="h-4 w-4 mr-2" />
                  2. PRESCRIÇÃO
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="space-y-3">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                      <div className="relative col-span-2">
                        <label className="text-xs font-medium text-gray-600 block mb-1">Medicamento</label>
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                          <Input
                            value={medSearch}
                            onChange={(e) => {
                              setMedSearch(e.target.value);
                              setShowMedResults(true);
                              if (!e.target.value) {
                                setSelectedMed(null);
                                setCurrentDose("");
                              }
                            }}
                            onFocus={() => setShowMedResults(true)}
                            placeholder="Buscar..."
                            className="pl-7 h-8 text-sm"
                            data-testid="input-medicamento"
                          />
                        </div>
                        {showMedResults && medSearch.length >= 1 && (
                          <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                            {combinedMedications.filter(m => 
                              m.name.toLowerCase().includes(medSearch.toLowerCase()) ||
                              ('genericName' in m && m.genericName?.toLowerCase().includes(medSearch.toLowerCase()))
                            ).slice(0, 15).map((med, index) => (
                              <button
                                key={`${med.name}-${index}`}
                                type="button"
                                onClick={() => {
                                  setSelectedMed(med);
                                  setMedSearch(med.name);
                                  setShowMedResults(false);
                                  setCurrentDose(med.doses[0] || "");
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-purple-50 text-xs border-b border-gray-100 last:border-b-0"
                                data-testid={`medication-option-${index}`}
                              >
                                <span className="font-medium">{med.name}</span>
                                {med.pharmacyId && (
                                  <span className="ml-2 text-green-600 text-[10px] font-semibold" data-testid="pharmacy-indicator">✓ Estoque</span>
                                )}
                                {med.genericName && (
                                  <span className="block text-gray-500 text-[10px]">{med.genericName}</span>
                                )}
                              </button>
                            ))}
                            {combinedMedications.filter(m => 
                              m.name.toLowerCase().includes(medSearch.toLowerCase())
                            ).length === 0 && (
                              <div className="px-3 py-2 text-xs text-gray-500">
                                Nenhum medicamento encontrado
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Dose</label>
                        {selectedMed ? (
                          <select
                            value={currentDose}
                            onChange={(e) => setCurrentDose(e.target.value)}
                            className="w-full h-8 px-2 rounded-md border border-gray-300 bg-white text-xs"
                            data-testid="select-dose"
                          >
                            <option value="">Sel...</option>
                            {selectedMed.doses.map((dose) => (
                              <option key={dose} value={dose}>{dose}</option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            value={currentDose}
                            onChange={(e) => setCurrentDose(e.target.value)}
                            placeholder="500mg"
                            className="h-8 text-xs"
                            data-testid="input-dose"
                          />
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Via</label>
                        <select
                          value={currentVia}
                          onChange={(e) => setCurrentVia(e.target.value)}
                          className="w-full h-8 px-2 rounded-md border border-gray-300 bg-white text-xs"
                          data-testid="select-via"
                        >
                          <option value="">Sel...</option>
                          {VIAS_ADMINISTRACAO.map((via) => (
                            <option key={via.sigla} value={via.sigla}>{via.sigla}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Frequência</label>
                        <select
                          value={currentFrequencia}
                          onChange={(e) => setCurrentFrequencia(e.target.value)}
                          className="w-full h-8 px-2 rounded-md border border-gray-300 bg-white text-xs"
                          data-testid="select-frequencia"
                        >
                          <option value="">Sel...</option>
                          {FREQUENCIAS.map((freq) => (
                            <option key={freq.id} value={freq.nome}>{freq.nome}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Instrução</label>
                        <select
                          value={currentInstrucao}
                          onChange={(e) => setCurrentInstrucao(e.target.value)}
                          className="w-full h-8 px-2 rounded-md border border-gray-300 bg-white text-xs"
                          data-testid="select-instrucao"
                        >
                          <option value="">Sel...</option>
                          {INSTRUCOES.map((inst) => (
                            <option key={inst.id} value={inst.nome}>{inst.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-gray-600 block mb-1">Duração</label>
                        <Input
                          value={currentDuracao}
                          onChange={(e) => setCurrentDuracao(e.target.value)}
                          placeholder="Ex: 7 dias"
                          className="h-8 text-xs"
                          data-testid="input-duracao"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (!medSearch) {
                            toast({
                              title: "Campo obrigatório",
                              description: "Selecione ou digite um medicamento.",
                              variant: "destructive",
                            });
                            return;
                          }
                          const newItem: PrescricaoItem = {
                            id: Date.now().toString(),
                            medicamento: medSearch,
                            dose: currentDose,
                            via: currentVia,
                            frequencia: currentFrequencia,
                            instrucao: currentInstrucao,
                            duracao: currentDuracao,
                          };
                          setPrescricaoItens(prev => [...prev, newItem]);
                          
                          const prescricaoText = [...prescricaoItens, newItem]
                            .map((item, idx) => {
                              let line = `${idx + 1}. ${item.medicamento}`;
                              if (item.dose) line += ` ${item.dose}`;
                              if (item.via) line += ` (${item.via})`;
                              if (item.frequencia) line += ` - ${item.frequencia}`;
                              if (item.instrucao) line += ` ${item.instrucao}`;
                              if (item.duracao) line += ` por ${item.duracao}`;
                              return line;
                            })
                            .join("\n");
                          form.setValue("prescricao", prescricaoText);
                          
                          setMedSearch("");
                          setSelectedMed(null);
                          setCurrentDose("");
                          setCurrentVia("");
                          setCurrentFrequencia("");
                          setCurrentInstrucao("");
                          setCurrentDuracao("");
                        }}
                        className="mt-5 bg-purple-600 hover:bg-purple-700 h-8"
                        data-testid="button-add-medicamento"
                      >
                        <Pill className="h-3 w-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  {prescricaoItens.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-purple-100 px-3 py-1.5 font-semibold text-purple-800 text-xs flex items-center justify-between">
                        <span>Medicamentos ({prescricaoItens.length})</span>
                      </div>
                      <div className="divide-y max-h-32 overflow-auto">
                        {prescricaoItens.map((item, idx) => (
                          <div key={item.id} className="px-2 py-1.5 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex-1 flex items-center gap-1 flex-wrap">
                              <Badge className="bg-purple-600 h-5 text-xs">{idx + 1}</Badge>
                              <span className="font-medium text-xs">{item.medicamento}</span>
                              {item.dose && <Badge variant="outline" className="h-5 text-xs">{item.dose}</Badge>}
                              {item.via && <Badge variant="secondary" className="h-5 text-xs">{item.via}</Badge>}
                              <span className="text-xs text-gray-500">
                                {[item.frequencia, item.instrucao].filter(Boolean).join(" • ")}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newItens = prescricaoItens.filter(i => i.id !== item.id);
                                setPrescricaoItens(newItens);
                                const prescricaoText = newItens
                                  .map((i, ix) => {
                                    let line = `${ix + 1}. ${i.medicamento}`;
                                    if (i.dose) line += ` ${i.dose}`;
                                    if (i.via) line += ` (${i.via})`;
                                    if (i.frequencia) line += ` - ${i.frequencia}`;
                                    if (i.instrucao) line += ` ${i.instrucao}`;
                                    if (i.duracao) line += ` por ${i.duracao}`;
                                    if (i.kitName) line += ` [Kit: ${i.kitName}]`;
                                    return line;
                                  })
                                  .join("\n");
                                form.setValue("prescricao", prescricaoText);
                              }}
                              className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                              data-testid={`button-remove-med-${idx}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="prescricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-500">Texto (editável)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Medicamentos aparecerão aqui..."
                            className="min-h-[60px] text-xs resize-y font-mono bg-gray-50"
                            data-testid="textarea-prescricao"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Botões para enviar prescrição */}
                  {prescricaoItens.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            Medicamentos para Farmácia do Hospital
                          </p>
                          <p className="text-xs text-green-600">
                            {prescricaoItens.length} medicamento(s) para retirada na farmácia interna
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={handleSendToPharmacy}
                            disabled={true}
                            className="bg-green-600 hover:bg-green-700 opacity-50 cursor-not-allowed"
                            data-testid="button-send-to-pharmacy"
                          >
                            {isSendingToPharmacy ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Enviar para Farmácia
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            onClick={handleSendToList}
                            disabled={isSendingToList}
                            className="bg-blue-600 hover:bg-blue-700"
                            data-testid="button-send-to-list"
                          >
                            {isSendingToList ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <ClipboardList className="h-4 w-4 mr-2" />
                                Enviar para Lista
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveSection("anamnese")}
                  >
                    <ChevronDown className="h-4 w-4 mr-2 rotate-90" />
                    Voltar: {hospitalizationId ? "Evolução" : "Anamnese"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveSection("exames")}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Próximo: Exames
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
              )}

              {/* Seção Procedimento */}
              {activeSection === "procedimento" && patientIdFromQueue && (
                <ProcedimentoSection
                  patientId={patientIdFromQueue}
                  patientName={queueEntry?.patient?.name || hospitalization?.patient?.name || ""}
                  sourceType={procedureSourceType || "queue"}
                  sourceId={hospitalizationId || queueId || undefined}
                  sourceName={procedureSourceName || "Atendimento"}
                  onBack={() => setActiveSection("prescricao")}
                  onNext={() => setActiveSection("exames")}
                />
              )}

              {/* Seção Exames */}
              {activeSection === "exames" && (
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg py-3">
                    <CardTitle className="flex items-center text-lg">
                      <Scan className="h-5 w-5 mr-2" />
                      Solicitação de Exames
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                  {selectedExames.length > 0 && (
                    <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-xs font-medium text-orange-800 mb-1">
                        Selecionados ({selectedExames.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedExames.map(id => {
                          const exame = getExameById(id);
                          return exame ? (
                            <Badge 
                              key={id} 
                              variant="secondary" 
                              className="flex items-center gap-1 bg-orange-100 text-orange-800 text-xs py-0"
                            >
                              {exame.name}
                              <button
                                type="button"
                                onClick={() => setSelectedExames(prev => prev.filter(e => e !== id))}
                                className="ml-1 hover:bg-orange-200 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {EXAMES_DATABASE.map(tipo => (
                      <div key={tipo.id} className="border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleCategory(tipo.id)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <span className="flex items-center gap-2 font-medium text-sm">
                            <span>{tipo.icon}</span>
                            {tipo.name}
                          </span>
                          {openCategories[tipo.id] ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                        
                        {openCategories[tipo.id] && (
                          <div className="p-2 bg-white space-y-2">
                            {tipo.categorias.map(categoria => (
                              <div key={categoria.id} className="border rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => toggleCategory(`${tipo.id}_${categoria.id}`)}
                                  className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                  <span className="text-xs font-medium text-gray-700">{categoria.name}</span>
                                  <div className="flex items-center gap-1">
                                    {categoria.exames.filter(e => selectedExames.includes(e.id)).length > 0 && (
                                      <Badge className="bg-orange-500 h-4 text-xs px-1">
                                        {categoria.exames.filter(e => selectedExames.includes(e.id)).length}
                                      </Badge>
                                    )}
                                    {openCategories[`${tipo.id}_${categoria.id}`] ? (
                                      <ChevronDown className="h-3 w-3 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 text-gray-400" />
                                    )}
                                  </div>
                                </button>
                                
                                {openCategories[`${tipo.id}_${categoria.id}`] && (
                                  <div className="px-2 py-1.5 bg-white grid grid-cols-2 gap-1">
                                    {categoria.exames.map(exame => (
                                      <div key={exame.id} className="flex items-center space-x-1.5">
                                        <Checkbox
                                          id={exame.id}
                                          checked={selectedExames.includes(exame.id)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setSelectedExames(prev => [...prev, exame.id]);
                                            } else {
                                              setSelectedExames(prev => prev.filter(e => e !== exame.id));
                                            }
                                          }}
                                          className="h-3 w-3"
                                          data-testid={`checkbox-${exame.id}`}
                                        />
                                        <label
                                          htmlFor={exame.id}
                                          className="text-xs cursor-pointer hover:text-orange-600 truncate"
                                        >
                                          {exame.name}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveSection("prescricao")}
                      >
                        <ChevronDown className="h-4 w-4 mr-2 rotate-90" />
                        Voltar: Prescrição
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setActiveSection(hospitalizationId ? "atestado" : "receituario")}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        Próximo: {hospitalizationId ? "Atestado" : "Receituário"}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Seção Receituário - apenas para consultas, não para internação */}
              {activeSection === "receituario" && !hospitalizationId && (
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-t-lg py-3">
                    <CardTitle className="flex items-center text-lg">
                      <FileSignature className="h-5 w-5 mr-2" />
                      Receituário Médico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {/* Campo de Medicações - Texto Livre */}
                      <FormField
                        control={form.control}
                        name="medicacoesReceita"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold flex items-center gap-2">
                              <Pill className="h-4 w-4 text-teal-600" />
                              Medicações
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value || ""}
                                placeholder="Digite as medicações que deseja prescrever...

Exemplo:
1. Dipirona 500mg - Tomar 1 comprimido de 6/6 horas em caso de dor ou febre
2. Amoxicilina 500mg - Tomar 1 comprimido de 8/8 horas por 7 dias
3. Omeprazol 20mg - Tomar 1 comprimido em jejum por 30 dias"
                                className="min-h-[200px] text-sm resize-y"
                                data-testid="textarea-medicacoes-receita"
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500 mt-1">
                              Digite livremente as medicações. Este texto será usado para gerar a receita médica.
                            </p>
                          </FormItem>
                        )}
                      />

                      {/* Botões de Ação */}
                      <div className="border-t pt-4">
                        {generatedReceita ? (
                          <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <FileCheck className="h-5 w-5 text-teal-600" />
                                <span className="font-semibold text-teal-800">Receita Gerada</span>
                              </div>
                              <Badge className="bg-teal-600">ID: {generatedReceita.id.slice(0, 8)}...</Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-4">
                              <Button
                                onClick={handlePrintReceita}
                                className="bg-teal-600 hover:bg-teal-700"
                                data-testid="button-print-receita"
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                Imprimir Receita
                              </Button>
                              
                              <Button
                                onClick={() => setShowSendDialog(true)}
                                variant="outline"
                                className="border-teal-600 text-teal-600 hover:bg-teal-50"
                                data-testid="button-send-receita"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Enviar ao Paciente
                              </Button>
                              
                              <Button
                                onClick={handleGenerateReceita}
                                variant="ghost"
                                className="text-teal-600"
                                disabled={isGeneratingReceita}
                              >
                                {isGeneratingReceita ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : null}
                                Gerar Nova
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            onClick={handleGenerateReceita}
                            className="w-full bg-teal-600 hover:bg-teal-700"
                            disabled={isGeneratingReceita || !form.watch("medicacoesReceita")}
                            data-testid="button-generate-receita"
                          >
                            {isGeneratingReceita ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              <>
                                <FileCheck className="h-4 w-4 mr-2" />
                                Gerar Receita Médica
                              </>
                            )}
                          </Button>
                        )}
                        
                        {!form.watch("medicacoesReceita") && (
                          <p className="text-sm text-amber-600 flex items-center mt-3">
                            <span className="mr-1">⚠️</span>
                            Digite as medicações acima para poder gerar a receita.
                          </p>
                        )}
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setActiveSection("exames")}
                        >
                          <ChevronDown className="h-4 w-4 mr-2 rotate-90" />
                          Voltar: Exames
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setActiveSection("atestado")}
                          className="bg-teal-600 hover:bg-teal-700"
                        >
                          Próximo: Atestado
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Seção Atestado Médico */}
              {activeSection === "atestado" && (
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-lg py-3">
                    <CardTitle className="flex items-center text-lg">
                      <FileText className="h-5 w-5 mr-2" />
                      Atestado Médico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {/* CID Herdado */}
                      {(form.watch("cid") || form.watch("cidDescription")) && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-800">CID-10 (herdado da anamnese):</p>
                          <p className="text-sm text-green-700">
                            {form.watch("cid")} - {form.watch("cidDescription")}
                          </p>
                        </div>
                      )}

                      {/* Campo de Dias de Afastamento */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center gap-2">
                          <FileText className="h-4 w-4 text-indigo-600" />
                          Quantidade de Dias de Afastamento
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={atestadoDias}
                          onChange={(e) => {
                            setAtestadoDias(e.target.value);
                            const dias = parseInt(e.target.value) || 0;
                            const diasExtenso = dias === 1 ? "um" : dias === 2 ? "dois" : dias === 3 ? "três" : dias === 4 ? "quatro" : dias === 5 ? "cinco" : dias === 6 ? "seis" : dias === 7 ? "sete" : dias === 8 ? "oito" : dias === 9 ? "nove" : dias === 10 ? "dez" : String(dias);
                            const cidCode = selectedCid?.code || form.watch("cid");
                            const textoAtestado = `Atesto para os devidos fins que o(a) paciente acima identificado(a) esteve sob meus cuidados médicos nesta data, necessitando de afastamento de suas atividades laborais por ${dias.toString().padStart(2, '0')} (${diasExtenso}) dia${dias > 1 ? 's' : ''}, a partir desta data.${cidCode ? `\n\nCID-10: ${cidCode}` : ""}`;
                            form.setValue("atestadoTexto", textoAtestado);
                          }}
                          placeholder="Ex: 3"
                          className="w-32"
                          data-testid="input-atestado-dias"
                        />
                        <p className="text-xs text-gray-500">
                          Informe a quantidade de dias e o texto será gerado automaticamente.
                        </p>
                      </div>

                      {/* Campo de Texto do Atestado (somente leitura/preview) */}
                      <FormField
                        control={form.control}
                        name="atestadoTexto"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold flex items-center gap-2">
                              <FileText className="h-4 w-4 text-indigo-600" />
                              Prévia do Atestado
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value || ""}
                                placeholder="Informe a quantidade de dias acima para gerar o texto do atestado automaticamente."
                                className="min-h-[120px] text-sm resize-y bg-gray-50"
                                data-testid="textarea-atestado"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Botões de Ação */}
                      <div className="border-t pt-4">
                        {generatedAtestado ? (
                          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <FileCheck className="h-5 w-5 text-indigo-600" />
                                <span className="font-semibold text-indigo-800">Atestado Gerado</span>
                              </div>
                              <Badge className="bg-indigo-600">ID: {generatedAtestado.id.slice(0, 8)}...</Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-4">
                              <Button
                                onClick={handlePrintAtestado}
                                className="bg-indigo-600 hover:bg-indigo-700"
                                data-testid="button-print-atestado"
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                Imprimir Atestado
                              </Button>
                              
                              <Button
                                onClick={() => setShowSendAtestadoDialog(true)}
                                variant="outline"
                                className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                                data-testid="button-send-atestado"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Enviar ao Paciente
                              </Button>
                              
                              <Button
                                onClick={handleGenerateAtestado}
                                variant="ghost"
                                className="text-indigo-600"
                                disabled={isGeneratingAtestado}
                              >
                                {isGeneratingAtestado ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : null}
                                Gerar Novo
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            onClick={handleGenerateAtestado}
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                            disabled={isGeneratingAtestado || !form.watch("atestadoTexto")}
                            data-testid="button-generate-atestado"
                          >
                            {isGeneratingAtestado ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              <>
                                <FileCheck className="h-4 w-4 mr-2" />
                                Gerar Atestado Médico
                              </>
                            )}
                          </Button>
                        )}
                        
                        {!form.watch("atestadoTexto") && (
                          <p className="text-sm text-amber-600 flex items-center mt-3">
                            <span className="mr-1">⚠️</span>
                            Digite o texto do atestado acima para poder gerar.
                          </p>
                        )}
                      </div>

                      <div className="flex justify-start pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setActiveSection(hospitalizationId ? "exames" : "receituario")}
                        >
                          <ChevronDown className="h-4 w-4 mr-2 rotate-90" />
                          Voltar: {hospitalizationId ? "Exames" : "Receituário"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Seção Histórico */}
              {activeSection === "historico" && (
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-t-lg py-3">
                    <CardTitle className="flex items-center text-lg">
                      <History className="h-5 w-5 mr-2" />
                      Histórico do Paciente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {(isLoadingDocuments || isLoadingHistory) ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                        <span className="ml-2 text-gray-500">Carregando histórico...</span>
                      </div>
                    ) : !patientIdFromQueue ? (
                      <div className="text-center py-8 text-gray-500">
                        <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Selecione um paciente para ver o histórico.</p>
                      </div>
                    ) : (patientDocuments.length === 0 && patientMedicalHistory.length === 0) ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Nenhum registro encontrado para este paciente.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Anamneses e Diagnósticos */}
                        {patientMedicalHistory.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2 mb-3 border-b pb-2">
                              <Stethoscope className="h-4 w-4" />
                              Anamneses e Diagnósticos ({patientMedicalHistory.length})
                            </h3>
                            <div className="space-y-2">
                              {patientMedicalHistory.map((record: any) => (
                                <div 
                                  key={record.id} 
                                  className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="text-xs text-gray-500">
                                        {format(new Date(record.consultationDate), "dd/MM/yyyy")} às {record.consultationTime} • Dr(a). {record.doctorName}
                                      </p>
                                      {record.specialty && (
                                        <Badge variant="outline" className="mt-1 text-xs">
                                          {typeof record.specialty === 'object' ? record.specialty.name : record.specialty}
                                        </Badge>
                                      )}
                                    </div>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                          title="Visualizar registro completo"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                          <DialogTitle className="flex items-center gap-2 text-blue-700">
                                            <Stethoscope className="h-5 w-5" />
                                            Registro Médico - {format(new Date(record.consultationDate), "dd/MM/yyyy")}
                                          </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 mt-4">
                                          <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                              <p className="font-semibold text-gray-600">Data/Hora:</p>
                                              <p>{format(new Date(record.consultationDate), "dd/MM/yyyy")} às {record.consultationTime}</p>
                                            </div>
                                            <div>
                                              <p className="font-semibold text-gray-600">Médico(a):</p>
                                              <p>Dr(a). {record.doctorName}</p>
                                            </div>
                                            {record.specialty && (
                                              <div>
                                                <p className="font-semibold text-gray-600">Especialidade:</p>
                                                <p>{typeof record.specialty === 'object' ? record.specialty.name : record.specialty}</p>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {record.anamnese && (
                                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                              <p className="font-semibold text-blue-800 mb-2">Anamnese:</p>
                                              <p className="text-gray-700 whitespace-pre-wrap">{record.anamnese}</p>
                                            </div>
                                          )}
                                          
                                          {record.cid && (
                                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                              <p className="font-semibold text-green-800 mb-2">Diagnóstico (CID):</p>
                                              <p className="text-gray-700">{record.cid} {record.cidDescription && `- ${record.cidDescription}`}</p>
                                            </div>
                                          )}
                                          
                                          {record.prescricao && (
                                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                              <p className="font-semibold text-purple-800 mb-2">Prescrição:</p>
                                              <p className="text-gray-700 whitespace-pre-wrap">{record.prescricao}</p>
                                            </div>
                                          )}
                                          
                                          {record.observations && (
                                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                              <p className="font-semibold text-gray-700 mb-2">Observações:</p>
                                              <p className="text-gray-700 whitespace-pre-wrap">{record.observations}</p>
                                            </div>
                                          )}
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                  
                                  {record.anamnese && (
                                    <div className="mt-2">
                                      <p className="text-xs font-semibold text-blue-800">Anamnese:</p>
                                      <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{record.anamnese}</p>
                                    </div>
                                  )}
                                  
                                  {record.cid && (
                                    <div className="mt-2 p-2 bg-white rounded border border-blue-100">
                                      <p className="text-xs font-semibold text-blue-800">Diagnóstico (CID):</p>
                                      <p className="text-sm text-gray-700">{record.cid} {record.cidDescription && `- ${record.cidDescription}`}</p>
                                    </div>
                                  )}
                                  
                                  {record.prescricao && (
                                    <div className="mt-2">
                                      <p className="text-xs font-semibold text-blue-800">Prescrição:</p>
                                      <p className="text-sm text-gray-700 line-clamp-2 whitespace-pre-wrap">{record.prescricao}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Receitas */}
                        {patientPrescriptions.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-teal-700 flex items-center gap-2 mb-3 border-b pb-2">
                              <FileSignature className="h-4 w-4" />
                              Receitas ({patientPrescriptions.length})
                            </h3>
                            <div className="space-y-2">
                              {patientPrescriptions.map((doc: any) => (
                                <div 
                                  key={doc.id} 
                                  className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{doc.title}</p>
                                    <p className="text-xs text-gray-500">
                                      {format(new Date(doc.issueDate), "dd/MM/yyyy")} • Dr(a). {doc.doctorName}
                                    </p>
                                    {doc.medications && (
                                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">{doc.medications}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleViewDocument(doc)}
                                      className="text-teal-600 hover:text-teal-800"
                                      title="Visualizar"
                                      data-testid={`button-view-prescription-${doc.id}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDownloadDocument(doc)}
                                      className="text-teal-600 hover:text-teal-800"
                                      title="Baixar"
                                      data-testid={`button-download-prescription-${doc.id}`}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Atestados */}
                        {patientCertificates.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-indigo-700 flex items-center gap-2 mb-3 border-b pb-2">
                              <FileText className="h-4 w-4" />
                              Atestados ({patientCertificates.length})
                            </h3>
                            <div className="space-y-2">
                              {patientCertificates.map((doc: any) => (
                                <div 
                                  key={doc.id} 
                                  className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{doc.title}</p>
                                    <p className="text-xs text-gray-500">
                                      {format(new Date(doc.issueDate), "dd/MM/yyyy")} • Dr(a). {doc.doctorName}
                                    </p>
                                    {doc.observations && (
                                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">{doc.observations}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleViewDocument(doc)}
                                      className="text-indigo-600 hover:text-indigo-800"
                                      title="Visualizar"
                                      data-testid={`button-view-certificate-${doc.id}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDownloadDocument(doc)}
                                      className="text-indigo-600 hover:text-indigo-800"
                                      title="Baixar"
                                      data-testid={`button-download-certificate-${doc.id}`}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resultados de Exames */}
                        {patientExamResults.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2 mb-3 border-b pb-2">
                              <Scan className="h-4 w-4" />
                              Resultados de Exames ({patientExamResults.length})
                            </h3>
                            <div className="space-y-2">
                              {patientExamResults.map((doc: any) => (
                                <div 
                                  key={doc.id} 
                                  className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{doc.title}</p>
                                    <p className="text-xs text-gray-500">
                                      {format(new Date(doc.issueDate), "dd/MM/yyyy")}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleViewDocument(doc)}
                                      className="text-orange-600 hover:text-orange-800"
                                      title="Visualizar"
                                      data-testid={`button-view-exam-${doc.id}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDownloadDocument(doc)}
                                      className="text-orange-600 hover:text-orange-800"
                                      title="Baixar"
                                      data-testid={`button-download-exam-${doc.id}`}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resultados de Laboratório */}
                        {patientLabResults.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2 mb-3 border-b pb-2">
                              <TestTube className="h-4 w-4" />
                              Resultados de Laboratório ({patientLabResults.length})
                            </h3>
                            <div className="space-y-2">
                              {patientLabResults.map((doc: any) => {
                                let docContent: any = {};
                                try {
                                  docContent = doc.content ? JSON.parse(doc.content) : {};
                                } catch (e) {}
                                
                                return (
                                  <div 
                                    key={doc.id} 
                                    className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{doc.title}</p>
                                        <p className="text-xs text-gray-500">
                                          {format(new Date(doc.issueDate), "dd/MM/yyyy")} • {doc.doctorName}
                                        </p>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleViewDocument(doc)}
                                          className="text-emerald-600 hover:text-emerald-800"
                                          title="Visualizar"
                                          data-testid={`button-view-lab-${doc.id}`}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {docContent.result && (
                                      <div className="mt-2 p-2 bg-white rounded border border-emerald-200">
                                        <p className="text-xs font-medium text-emerald-800 mb-1">Resultado:</p>
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{docContent.result}</p>
                                      </div>
                                    )}
                                    
                                    {docContent.attachments && docContent.attachments.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-xs font-medium text-emerald-700 mb-1">
                                          Anexos ({docContent.attachments.length}):
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {docContent.attachments.map((url: string, idx: number) => (
                                            <a
                                              key={idx}
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded hover:bg-emerald-200"
                                            >
                                              <Download className="h-3 w-3" />
                                              Anexo {idx + 1}
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Imagens de Radiologia */}
                        {patientRadiologyImages.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-purple-700 flex items-center gap-2 mb-3 border-b pb-2">
                              <ImageIcon className="h-4 w-4" />
                              Imagens de Radiologia ({patientRadiologyImages.length})
                            </h3>
                            <div className="space-y-2">
                              {patientRadiologyImages.map((doc: any) => {
                                let docContent: any = {};
                                try {
                                  docContent = doc.content ? JSON.parse(doc.content) : {};
                                } catch (e) {}
                                
                                return (
                                  <div 
                                    key={doc.id} 
                                    className="p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{doc.title}</p>
                                        <p className="text-xs text-gray-500">
                                          {format(new Date(doc.issueDate), "dd/MM/yyyy")} • {doc.doctorName}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {docContent.images && docContent.images.length > 0 && (
                                      <div className="grid grid-cols-4 gap-2">
                                        {docContent.images.map((imgUrl: string, idx: number) => (
                                          <a
                                            key={idx}
                                            href={imgUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                          >
                                            <div className="relative aspect-square rounded overflow-hidden border border-purple-300 hover:border-purple-500">
                                              <img
                                                src={imgUrl}
                                                alt={`Imagem ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                  const target = e.target as HTMLImageElement;
                                                  target.style.display = 'none';
                                                }}
                                              />
                                              <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[10px] px-1 rounded">
                                                {idx + 1}
                                              </span>
                                            </div>
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </section>
          </div>
        </Form>

        <div className="mt-6 text-center text-sm text-gray-500 pb-4">
          <p>Auto-salvamento ativo (10s) • Atalho: <kbd className="px-2 py-1 bg-gray-200 rounded">Ctrl+S</kbd> para salvar</p>
        </div>
      </div>

      {/* Dialog para visualizar evolução completa */}
      <Dialog open={!!selectedEvolution} onOpenChange={(open) => !open && setSelectedEvolution(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Badge 
                className={`${
                  selectedEvolution?.createdByRole === 'doctor' ? 'bg-blue-500' : 'bg-green-500'
                }`}
              >
                {selectedEvolution?.createdByRole === 'doctor' ? 'Evolução Médica' : 'Evolução Enfermagem'}
              </Badge>
              {selectedEvolution && format(new Date(selectedEvolution.evolutionDate), "dd/MM/yyyy 'às' HH:mm")}
            </DialogTitle>
            <DialogDescription>
              Registrado por: {selectedEvolution?.createdByName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvolution && (
            <div className="space-y-4 pt-4">
              {selectedEvolution.subjectiveNotes && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Subjetivo (Queixas)
                  </h4>
                  <p className="text-sm text-blue-900 whitespace-pre-wrap">{selectedEvolution.subjectiveNotes}</p>
                </div>
              )}
              
              {selectedEvolution.objectiveNotes && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Objetivo (Exame Físico)
                  </h4>
                  <p className="text-sm text-green-900 whitespace-pre-wrap">{selectedEvolution.objectiveNotes}</p>
                </div>
              )}
              
              {selectedEvolution.assessment && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Avaliação
                  </h4>
                  <p className="text-sm text-yellow-900 whitespace-pre-wrap">{selectedEvolution.assessment}</p>
                </div>
              )}
              
              {selectedEvolution.medications && (
                <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                  <h4 className="font-semibold text-pink-800 mb-2 flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Prescrição
                  </h4>
                  <p className="text-sm text-pink-900 whitespace-pre-wrap">{selectedEvolution.medications}</p>
                </div>
              )}
              
              {selectedEvolution.procedures && (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                    <Scan className="h-4 w-4" />
                    Solicitação de Exames
                  </h4>
                  <p className="text-sm text-orange-900 whitespace-pre-wrap">{selectedEvolution.procedures}</p>
                </div>
              )}
              
              {(() => {
                if (!selectedEvolution.vitalSigns) return null;
                const vs = selectedEvolution.vitalSigns as { pressao?: string; temperatura?: string; fc?: string; fr?: string; saturacao?: string };
                if (typeof vs !== 'object') return null;
                const hasVitals = vs.pressao || vs.temperatura || vs.fc || vs.fr || vs.saturacao;
                if (!hasVitals) return null;
                return (
                  <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                    <h4 className="font-semibold text-cyan-800 mb-2 flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Sinais Vitais
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm text-cyan-900">
                      {vs.pressao && (
                        <div className="bg-white p-2 rounded"><strong>PA:</strong> {vs.pressao}</div>
                      )}
                      {vs.temperatura && (
                        <div className="bg-white p-2 rounded"><strong>Temp:</strong> {vs.temperatura}°C</div>
                      )}
                      {vs.fc && (
                        <div className="bg-white p-2 rounded"><strong>FC:</strong> {vs.fc} bpm</div>
                      )}
                      {vs.fr && (
                        <div className="bg-white p-2 rounded"><strong>FR:</strong> {vs.fr} rpm</div>
                      )}
                      {vs.saturacao && (
                        <div className="bg-white p-2 rounded"><strong>SpO2:</strong> {vs.saturacao}%</div>
                      )}
                    </div>
                  </div>
                );
              })()}
              
              {selectedEvolution.diet && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-800 mb-2">Dieta</h4>
                  <p className="text-sm text-amber-900">{selectedEvolution.diet}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Receita ao Paciente</DialogTitle>
            <DialogDescription>
              Escolha como deseja enviar a receita médica para o paciente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <Button
              onClick={() => generatedReceita && sendWhatsAppMutation.mutate(generatedReceita.id)}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={sendWhatsAppMutation.isPending}
              data-testid="button-send-whatsapp"
            >
              {sendWhatsAppMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4 mr-2" />
              )}
              Enviar via WhatsApp
            </Button>
            
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email do paciente"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                data-testid="input-email-receita"
              />
              <Button
                onClick={() => generatedReceita && sendEmailMutation.mutate({ 
                  documentId: generatedReceita.id, 
                  email: recipientEmail 
                })}
                className="w-full"
                variant="outline"
                disabled={sendEmailMutation.isPending || !recipientEmail}
                data-testid="button-send-email"
              >
                {sendEmailMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Enviar via Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSendAtestadoDialog} onOpenChange={setShowSendAtestadoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Atestado ao Paciente</DialogTitle>
            <DialogDescription>
              Escolha como deseja enviar o atestado médico para o paciente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <Button
              onClick={() => generatedAtestado && sendWhatsAppMutation.mutate(generatedAtestado.id)}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={sendWhatsAppMutation.isPending}
              data-testid="button-send-atestado-whatsapp"
            >
              {sendWhatsAppMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4 mr-2" />
              )}
              Enviar via WhatsApp
            </Button>
            
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email do paciente"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                data-testid="input-email-atestado"
              />
              <Button
                onClick={() => generatedAtestado && sendEmailMutation.mutate({ 
                  documentId: generatedAtestado.id, 
                  email: recipientEmail 
                })}
                className="w-full"
                variant="outline"
                disabled={sendEmailMutation.isPending || !recipientEmail}
                data-testid="button-send-atestado-email"
              >
                {sendEmailMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Enviar via Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização de Documento */}
      <Dialog open={showDocumentViewer} onOpenChange={setShowDocumentViewer}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{viewingDocument?.title}</DialogTitle>
                <DialogDescription>
                  {viewingDocument && format(new Date(viewingDocument.issueDate), "dd/MM/yyyy")} • Dr(a). {viewingDocument?.doctorName}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => viewingDocument && handleDownloadDocument(viewingDocument)}
                  data-testid="button-download-viewer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDocumentViewer(false)}
                  data-testid="button-close-viewer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {viewingDocument && (
              <iframe
                src={`/api/medical-documents/${viewingDocument.id}/pdf?inline=true`}
                className="w-full h-full border-0"
                title="Visualização do Documento"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
