import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTriageSchema, type Triage, type Patient, TRIAGE_COMPLAINTS, ALL_TRIAGE_COMPLAINTS } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ClipboardList, Plus, AlertTriangle, Activity, User, Calendar, Clock, Eye, Heart, 
  Thermometer, Wind, Droplets, Weight, Ruler, ArrowLeft, LogOut, Baby, Syringe, 
  AlertCircle, Car, FileWarning, Stethoscope, Scale, HeartPulse, Edit2, UserPlus, Phone
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";

type TriageFormData = z.infer<typeof insertTriageSchema>;

type SeverityLevel = "vermelho" | "laranja" | "amarelo" | "verde" | "azul";

interface VitalSigns {
  bloodPressure?: string;
  heartRate?: string;
  respiratoryRate?: string;
  oxygenSaturation?: string;
  temperature?: string;
  hgt?: string;
}

interface RiskFactors {
  flagGestante?: boolean;
  flagDiabetes?: boolean;
  flagHipertensao?: boolean;
  flagSuspeitaDengue?: boolean;
  flagSuspeitaTb?: boolean;
  flagAcidenteTransito?: boolean;
}

function calculateRiskClassification(
  vitalSigns: VitalSigns,
  riskFactors: RiskFactors,
  selectedComplaints: string[]
): { severity: SeverityLevel; reasons: string[] } {
  const reasons: string[] = [];
  let severity: SeverityLevel = "azul";

  const parseBP = (bp?: string): { systolic: number; diastolic: number } | null => {
    if (!bp) return null;
    const match = bp.match(/(\d+)[\/x](\d+)/);
    if (match) {
      return { systolic: parseInt(match[1]), diastolic: parseInt(match[2]) };
    }
    return null;
  };

  const toNumber = (val?: string): number | null => {
    if (!val) return null;
    const num = parseFloat(val.replace(',', '.'));
    return isNaN(num) ? null : num;
  };

  const bp = parseBP(vitalSigns.bloodPressure);
  const hr = toNumber(vitalSigns.heartRate);
  const rr = toNumber(vitalSigns.respiratoryRate);
  const spo2 = toNumber(vitalSigns.oxygenSaturation);
  const temp = toNumber(vitalSigns.temperature);
  const hgt = toNumber(vitalSigns.hgt);

  // VERMELHO (Imediato) - Critérios de emergência
  if (spo2 !== null && spo2 < 90) {
    severity = "vermelho";
    reasons.push(`SpO2 crítico: ${spo2}%`);
  }
  if (rr !== null && (rr < 10 || rr > 30)) {
    if (severity !== "vermelho") severity = "vermelho";
    reasons.push(`FR crítica: ${rr} rpm`);
  }
  if (bp !== null && bp.systolic < 90) {
    if (severity !== "vermelho") severity = "vermelho";
    reasons.push(`PA sistólica crítica: ${bp.systolic} mmHg`);
  }
  if (hr !== null && (hr < 40 || hr > 150)) {
    if (severity !== "vermelho") severity = "vermelho";
    reasons.push(`FC crítica: ${hr} bpm`);
  }

  // Queixas críticas que indicam vermelho
  const criticalComplaints = ["PCR", "Convulsão", "Afogamento"];
  for (const complaint of selectedComplaints) {
    if (criticalComplaints.includes(complaint)) {
      if (severity !== "vermelho") severity = "vermelho";
      reasons.push(`Queixa crítica: ${complaint}`);
    }
  }

  // LARANJA (10 min) - Muito urgente
  if (severity !== "vermelho") {
    if (spo2 !== null && spo2 >= 90 && spo2 <= 92) {
      severity = "laranja";
      reasons.push(`SpO2 muito baixo: ${spo2}%`);
    }
    if (temp !== null && temp > 40) {
      if (severity !== "laranja") severity = "laranja";
      reasons.push(`Febre muito alta: ${temp}°C`);
    }
    if (bp !== null && (bp.systolic >= 90 && bp.systolic <= 100 || bp.systolic > 200)) {
      if (severity !== "laranja") severity = "laranja";
      reasons.push(`PA anormal: ${bp.systolic}/${bp.diastolic} mmHg`);
    }
    if (hr !== null && ((hr >= 40 && hr <= 50) || (hr >= 130 && hr <= 150))) {
      if (severity !== "laranja") severity = "laranja";
      reasons.push(`FC muito alterada: ${hr} bpm`);
    }
    if (rr !== null && rr >= 25 && rr <= 30) {
      if (severity !== "laranja") severity = "laranja";
      reasons.push(`FR elevada: ${rr} rpm`);
    }
    if (hgt !== null && (hgt < 50 || hgt > 400)) {
      if (severity !== "laranja") severity = "laranja";
      reasons.push(`Glicemia crítica: ${hgt} mg/dL`);
    }

    // Queixas muito urgentes
    const urgentComplaints = ["Dor torácica", "Dispnéia", "Alterações Neurológicas", "PAF", "PAB", "Queimaduras"];
    for (const complaint of selectedComplaints) {
      if (urgentComplaints.includes(complaint)) {
        if (severity !== "laranja") severity = "laranja";
        reasons.push(`Queixa urgente: ${complaint}`);
      }
    }
  }

  // AMARELO (60 min) - Urgente
  if (severity !== "vermelho" && severity !== "laranja") {
    if (spo2 !== null && spo2 >= 93 && spo2 <= 94) {
      severity = "amarelo";
      reasons.push(`SpO2 limítrofe: ${spo2}%`);
    }
    if (temp !== null && temp >= 38.5 && temp <= 40) {
      if (severity !== "amarelo") severity = "amarelo";
      reasons.push(`Febre alta: ${temp}°C`);
    }
    if (bp !== null && ((bp.systolic >= 100 && bp.systolic <= 110) || (bp.systolic >= 180 && bp.systolic <= 200))) {
      if (severity !== "amarelo") severity = "amarelo";
      reasons.push(`PA alterada: ${bp.systolic}/${bp.diastolic} mmHg`);
    }
    if (hr !== null && hr >= 100 && hr < 130) {
      if (severity !== "amarelo") severity = "amarelo";
      reasons.push(`FC elevada: ${hr} bpm`);
    }
    if (rr !== null && rr >= 20 && rr < 25) {
      if (severity !== "amarelo") severity = "amarelo";
      reasons.push(`FR elevada: ${rr} rpm`);
    }
    if (hgt !== null && ((hgt >= 50 && hgt < 70) || (hgt > 250 && hgt <= 400))) {
      if (severity !== "amarelo") severity = "amarelo";
      reasons.push(`Glicemia alterada: ${hgt} mg/dL`);
    }

    // Queixas moderadas
    const moderateComplaints = ["Dor abdominal", "Cefaleia", "Febre", "Desidratação", "Intoxicação"];
    for (const complaint of selectedComplaints) {
      if (moderateComplaints.some(c => complaint.includes(c))) {
        if (severity !== "amarelo") severity = "amarelo";
        reasons.push(`Queixa moderada: ${complaint}`);
      }
    }
  }

  // VERDE (120 min) - Pouco urgente
  if (severity !== "vermelho" && severity !== "laranja" && severity !== "amarelo") {
    if (temp !== null && temp >= 37.5 && temp < 38.5) {
      severity = "verde";
      reasons.push(`Febre leve: ${temp}°C`);
    }
    if (bp !== null && ((bp.systolic > 140 && bp.systolic < 180) || (bp.systolic > 110 && bp.systolic < 120))) {
      if (severity !== "verde") severity = "verde";
      reasons.push(`PA levemente alterada: ${bp.systolic}/${bp.diastolic} mmHg`);
    }

    // Queixas leves
    const mildComplaints = ["Mal-Estar", "Mialgia", "Dor Ouvido", "Dor Garganta", "Edemas"];
    for (const complaint of selectedComplaints) {
      if (mildComplaints.some(c => complaint.includes(c))) {
        if (severity !== "verde") severity = "verde";
        reasons.push(`Queixa leve: ${complaint}`);
      }
    }
  }

  // Fatores agravantes - aumentam 1 nível de severidade
  let upgradeLevel = false;
  const upgradeReasons: string[] = [];

  if (riskFactors.flagGestante) {
    upgradeLevel = true;
    upgradeReasons.push("Paciente gestante");
  }
  if (riskFactors.flagDiabetes && hgt !== null && (hgt < 100 || hgt > 180)) {
    upgradeLevel = true;
    upgradeReasons.push("Diabético com glicemia alterada");
  }
  if (riskFactors.flagHipertensao && bp !== null && bp.systolic > 160) {
    upgradeLevel = true;
    upgradeReasons.push("Hipertenso com PA elevada");
  }
  if (riskFactors.flagSuspeitaDengue) {
    upgradeLevel = true;
    upgradeReasons.push("Suspeita de Dengue");
  }
  if (riskFactors.flagSuspeitaTb) {
    upgradeLevel = true;
    upgradeReasons.push("Suspeita de Tuberculose");
  }
  if (riskFactors.flagAcidenteTransito) {
    upgradeLevel = true;
    upgradeReasons.push("Acidente de trânsito");
  }

  if (upgradeLevel) {
    reasons.push(...upgradeReasons);
    const levels: SeverityLevel[] = ["azul", "verde", "amarelo", "laranja", "vermelho"];
    const currentIndex = levels.indexOf(severity);
    if (currentIndex < levels.length - 1) {
      severity = levels[currentIndex + 1];
    }
  }

  // Se não há alterações significativas, permanece azul
  if (reasons.length === 0) {
    reasons.push("Sinais vitais dentro da normalidade");
  }

  return { severity, reasons };
}

export default function TriagePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [selectedTriage, setSelectedTriage] = useState<Triage | null>(null);
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [suggestedSeverity, setSuggestedSeverity] = useState<{ severity: SeverityLevel; reasons: string[] } | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState("");
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  const { data: user } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  useEffect(() => {
    if (user && user.role !== 'triage' && user.role !== 'admin') {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar a área de triagem.",
        variant: "destructive",
      });
      setLocation('/');
    }
  }, [user, setLocation, toast]);

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

  const { data: allPatients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: queueEntries = [] } = useQuery<any[]>({
    queryKey: ["/api/queue/active"],
  });

  const patientsInQueue = allPatients.filter(patient => 
    queueEntries.some(entry => entry.patientId === patient.id)
  );

  const { data: triages = [], isLoading: isLoadingTriages } = useQuery<Triage[]>({
    queryKey: ["/api/triage"],
  });

  const form = useForm<TriageFormData>({
    resolver: zodResolver(insertTriageSchema),
    defaultValues: {
      patientId: "",
      staffId: "",
      staffName: "",
      severity: "verde",
      mainSymptoms: "",
      triageDate: format(new Date(), "yyyy-MM-dd"),
      triageTime: format(new Date(), "HH:mm"),
      temperature: "",
      bloodPressure: "",
      heartRate: "",
      respiratoryRate: "",
      oxygenSaturation: "",
      weight: "",
      height: "",
      hgt: "",
      allergies: "",
      currentMedications: "",
      preExistingConditions: "",
      observations: "",
      recommendedAction: "",
      flagHipertensao: false,
      flagDiabetes: false,
      flagGestante: false,
      flagSuspeitaTb: false,
      flagSuspeitaDengue: false,
      flagAcidenteTransito: false,
      flagNotificacaoCompulsoria: false,
      hasAllergies: false,
      selectedComplaints: "",
    },
  });

  useEffect(() => {
    if (user?.id && user?.name) {
      form.setValue("staffId", user.id);
      form.setValue("staffName", user.name);
    }
  }, [user, form]);

  const watchedFields = form.watch([
    "bloodPressure", "heartRate", "respiratoryRate", "oxygenSaturation", 
    "temperature", "hgt", "flagGestante", "flagDiabetes", "flagHipertensao",
    "flagSuspeitaDengue", "flagSuspeitaTb", "flagAcidenteTransito"
  ]);

  useEffect(() => {
    const [bloodPressure, heartRate, respiratoryRate, oxygenSaturation, temperature, hgt,
      flagGestante, flagDiabetes, flagHipertensao, flagSuspeitaDengue, flagSuspeitaTb, flagAcidenteTransito] = watchedFields;
    
    const hasAnyVitalSign = bloodPressure || heartRate || respiratoryRate || oxygenSaturation || temperature || hgt;
    const hasAnyFlag = flagGestante || flagDiabetes || flagHipertensao || flagSuspeitaDengue || flagSuspeitaTb || flagAcidenteTransito;
    const hasComplaints = selectedComplaints.length > 0;

    if (hasAnyVitalSign || hasAnyFlag || hasComplaints) {
      const result = calculateRiskClassification(
        { 
          bloodPressure: bloodPressure || undefined, 
          heartRate: heartRate || undefined, 
          respiratoryRate: respiratoryRate || undefined, 
          oxygenSaturation: oxygenSaturation || undefined, 
          temperature: temperature || undefined, 
          hgt: hgt || undefined 
        },
        { 
          flagGestante: flagGestante || false, 
          flagDiabetes: flagDiabetes || false, 
          flagHipertensao: flagHipertensao || false, 
          flagSuspeitaDengue: flagSuspeitaDengue || false, 
          flagSuspeitaTb: flagSuspeitaTb || false, 
          flagAcidenteTransito: flagAcidenteTransito || false 
        },
        selectedComplaints
      );
      setSuggestedSeverity(result);
    } else {
      setSuggestedSeverity(null);
    }
  }, [watchedFields, selectedComplaints]);


  const toggleComplaint = (complaint: string) => {
    setSelectedComplaints(prev => {
      const newComplaints = prev.includes(complaint)
        ? prev.filter(c => c !== complaint)
        : [...prev, complaint];
      
      form.setValue("selectedComplaints", JSON.stringify(newComplaints));
      form.setValue("mainSymptoms", newComplaints.join(", ") || "Sem queixas selecionadas");
      return newComplaints;
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: TriageFormData) => {
      const isOverridden = suggestedSeverity && data.severity !== suggestedSeverity.severity;
      
      const response = await apiRequest("/api/triage", {
        method: "POST",
        body: {
          ...data,
          staffId: user?.id || "",
          staffName: user?.name || "",
          selectedComplaints: JSON.stringify(selectedComplaints),
          mainSymptoms: selectedComplaints.length > 0 ? selectedComplaints.join(", ") : data.mainSymptoms,
          suggestedSeverity: suggestedSeverity?.severity || null,
          severityOverridden: isOverridden || false,
          overrideJustification: isOverridden ? overrideJustification : null,
        },
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Triagem registrada",
        description: "Triagem registrada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/triage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/active"] });
      setShowForm(false);
      setSelectedComplaints([]);
      setSuggestedSeverity(null);
      setOverrideJustification("");
      setOverrideConfirmed(false);
      form.reset({
        patientId: "",
        staffId: user?.id || "",
        staffName: user?.name || "",
        severity: "verde",
        mainSymptoms: "",
        triageDate: format(new Date(), "yyyy-MM-dd"),
        triageTime: format(new Date(), "HH:mm"),
        temperature: "",
        bloodPressure: "",
        heartRate: "",
        respiratoryRate: "",
        oxygenSaturation: "",
        weight: "",
        height: "",
        hgt: "",
        allergies: "",
        currentMedications: "",
        preExistingConditions: "",
        observations: "",
        recommendedAction: "",
        flagHipertensao: false,
        flagDiabetes: false,
        flagGestante: false,
        flagSuspeitaTb: false,
        flagSuspeitaDengue: false,
        flagAcidenteTransito: false,
        selectedComplaints: "[]",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar triagem",
        description: error.message || "Não foi possível registrar a triagem.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TriageFormData) => {
    const isOverridden = suggestedSeverity && data.severity !== suggestedSeverity.severity;
    
    if (isOverridden) {
      if (!overrideConfirmed || !overrideJustification.trim()) {
        setShowOverrideModal(true);
        return;
      }
    }
    
    createMutation.mutate(data);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "vermelho":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "laranja":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "amarelo":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "verde":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "azul":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "vermelho":
        return "Vermelho";
      case "laranja":
        return "Laranja";
      case "amarelo":
        return "Amarelo";
      case "verde":
        return "Verde";
      case "azul":
        return "Azul";
      default:
        return severity;
    }
  };

  const getSeverityPriority = (severity: string) => {
    switch (severity) {
      case "vermelho":
        return 5;
      case "laranja":
        return 4;
      case "amarelo":
        return 3;
      case "verde":
        return 2;
      case "azul":
        return 1;
      default:
        return 0;
    }
  };

  const sortedTriages = [...triages].sort((a, b) => {
    return getSeverityPriority(b.severity) - getSeverityPriority(a.severity);
  });

  const watchHasAllergies = form.watch("hasAllergies");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="mb-6 border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setLocation("/")}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-6 w-6" />
                </Button>
                <img src={hospitalLogo} alt="Hospital" className="h-16 w-16 rounded-full bg-white p-1" />
                <div>
                  <CardTitle className="text-2xl font-bold">Módulo de Triagem</CardTitle>
                  <CardDescription className="text-blue-100">
                    Classificação de risco e avaliação inicial
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {user && (
                  <div className="text-right">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-blue-200">Enfermagem</p>
                  </div>
                )}
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  data-testid="button-logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-new-triage"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Triagem
          </Button>
        </div>

        {/* Form for new triage */}
        {showForm && (
          <Card className="mb-6 border-2 border-blue-300 dark:border-blue-700">
            <CardHeader className="bg-blue-50 dark:bg-gray-800">
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Anamnese de Enfermagem
              </CardTitle>
              <CardDescription>Preencha os dados do paciente para triagem</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Patient and Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Paciente *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-patient">
                                <SelectValue placeholder="Selecione o paciente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {patientsInQueue.map((patient) => (
                                <SelectItem key={patient.id} value={patient.id}>
                                  {patient.name} - {patient.cpf}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Companion Info Display */}
                    {(() => {
                      const selectedPatientId = form.watch("patientId");
                      const queueEntry = queueEntries.find((e: any) => e.patientId === selectedPatientId);
                      if (queueEntry?.companionName) {
                        return (
                          <div className="md:col-span-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                            <div className="flex items-center gap-2 mb-2">
                              <UserPlus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              <strong className="text-purple-700 dark:text-purple-300 text-sm">Acompanhante:</strong>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-900 dark:text-gray-100">
                              <div><strong className="text-gray-600">Nome:</strong> {queueEntry.companionName}</div>
                              {queueEntry.companionRelationship && (
                                <div><strong className="text-gray-600">Parentesco:</strong> {
                                  queueEntry.companionRelationship === 'mae' ? 'Mãe' :
                                  queueEntry.companionRelationship === 'pai' ? 'Pai' :
                                  queueEntry.companionRelationship === 'filho' ? 'Filho(a)' :
                                  queueEntry.companionRelationship === 'conjuge' ? 'Cônjuge' :
                                  queueEntry.companionRelationship === 'cuidador' ? 'Cuidador(a)' :
                                  queueEntry.companionRelationship
                                }</div>
                              )}
                              {queueEntry.companionPhone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-gray-500" />
                                  {queueEntry.companionPhone}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <FormField
                      control={form.control}
                      name="triageDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-triage-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="triageTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário *</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-triage-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Condition Flags Section - Modern colored checkboxes */}
                  <div className="border rounded-lg p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900">
                    <Label className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      Condições e Alertas
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
                      <FormField
                        control={form.control}
                        name="flagHipertensao"
                        render={({ field }) => (
                          <label 
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              field.value 
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/30' 
                                : 'border-gray-200 hover:border-red-300 dark:border-gray-700'
                            }`}
                            data-testid="checkbox-hipertensao"
                          >
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                            />
                            <span className={`text-sm font-medium ${field.value ? 'text-red-700 dark:text-red-300' : ''}`}>
                              Hipertensão
                            </span>
                          </label>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="flagDiabetes"
                        render={({ field }) => (
                          <label 
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              field.value 
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' 
                                : 'border-gray-200 hover:border-purple-300 dark:border-gray-700'
                            }`}
                            data-testid="checkbox-diabetes"
                          >
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                            />
                            <span className={`text-sm font-medium ${field.value ? 'text-purple-700 dark:text-purple-300' : ''}`}>
                              Diabetes
                            </span>
                          </label>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="flagGestante"
                        render={({ field }) => (
                          <label 
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              field.value 
                                ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/30' 
                                : 'border-gray-200 hover:border-pink-300 dark:border-gray-700'
                            }`}
                            data-testid="checkbox-gestante"
                          >
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                            />
                            <Baby className="h-4 w-4" />
                            <span className={`text-sm font-medium ${field.value ? 'text-pink-700 dark:text-pink-300' : ''}`}>
                              Gestante
                            </span>
                          </label>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="flagSuspeitaTb"
                        render={({ field }) => (
                          <label 
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              field.value 
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30' 
                                : 'border-gray-200 hover:border-amber-300 dark:border-gray-700'
                            }`}
                            data-testid="checkbox-suspeita-tb"
                          >
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                            />
                            <span className={`text-sm font-medium ${field.value ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                              Susp. TB
                            </span>
                          </label>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="flagSuspeitaDengue"
                        render={({ field }) => (
                          <label 
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              field.value 
                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30' 
                                : 'border-gray-200 hover:border-orange-300 dark:border-gray-700'
                            }`}
                            data-testid="checkbox-suspeita-dengue"
                          >
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                            />
                            <span className={`text-sm font-medium ${field.value ? 'text-orange-700 dark:text-orange-300' : ''}`}>
                              Susp. Dengue
                            </span>
                          </label>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="flagAcidenteTransito"
                        render={({ field }) => (
                          <label 
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              field.value 
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                                : 'border-gray-200 hover:border-blue-300 dark:border-gray-700'
                            }`}
                            data-testid="checkbox-acidente-transito"
                          >
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                            />
                            <Car className="h-4 w-4" />
                            <span className={`text-sm font-medium ${field.value ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                              Acid. Trânsito
                            </span>
                          </label>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="flagNotificacaoCompulsoria"
                        render={({ field }) => (
                          <label 
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              field.value 
                                ? 'border-rose-600 bg-rose-50 dark:bg-rose-900/30' 
                                : 'border-gray-200 hover:border-rose-300 dark:border-gray-700'
                            }`}
                            data-testid="checkbox-notificacao-compulsoria"
                          >
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                            />
                            <FileWarning className="h-4 w-4" />
                            <span className={`text-sm font-medium ${field.value ? 'text-rose-700 dark:text-rose-300' : ''}`}>
                              Notif. Compulsória
                            </span>
                          </label>
                        )}
                      />
                    </div>
                  </div>

                  {/* Allergies Alert Section */}
                  <div className={`border-2 rounded-lg p-4 transition-all ${
                    watchHasAllergies 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-lg font-semibold flex items-center gap-2">
                        <AlertTriangle className={`h-5 w-5 ${watchHasAllergies ? 'text-red-500' : 'text-gray-500'}`} />
                        Alergias
                      </Label>
                      <FormField
                        control={form.control}
                        name="hasAllergies"
                        render={({ field }) => (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              id="has-allergies"
                              className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                              data-testid="checkbox-has-allergies"
                            />
                            <label 
                              htmlFor="has-allergies" 
                              className={`text-sm font-medium cursor-pointer ${
                                field.value ? 'text-red-600 dark:text-red-400' : ''
                              }`}
                            >
                              Paciente tem alergias
                            </label>
                          </div>
                        )}
                      />
                    </div>
                    
                    {watchHasAllergies && (
                      <FormField
                        control={form.control}
                        name="allergies"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value || ""}
                                placeholder="Descreva as alergias do paciente (medicamentos, alimentos, etc.)"
                                className="bg-white dark:bg-gray-900 border-red-300 focus:border-red-500"
                                data-testid="textarea-allergies"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Main Complaints Grid - Clickable checkboxes */}
                  <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                    <Label className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-blue-500" />
                      Queixa Principal
                    </Label>
                    
                    {selectedComplaints.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4 mt-2">
                        {selectedComplaints.map(complaint => (
                          <Badge 
                            key={complaint} 
                            variant="secondary"
                            className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-pointer hover:bg-blue-200"
                            onClick={() => toggleComplaint(complaint)}
                          >
                            {complaint} ✕
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {/* Column 1 - Queixas Gerais */}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Gerais</p>
                        {TRIAGE_COMPLAINTS.gerais.map(complaint => (
                          <label
                            key={complaint}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                              selectedComplaints.includes(complaint)
                                ? 'bg-blue-100 dark:bg-blue-900/50'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Checkbox
                              checked={selectedComplaints.includes(complaint)}
                              onCheckedChange={() => toggleComplaint(complaint)}
                              className="h-4 w-4"
                            />
                            <span className={selectedComplaints.includes(complaint) ? 'font-medium text-blue-700 dark:text-blue-300' : ''}>
                              {complaint}
                            </span>
                          </label>
                        ))}
                      </div>

                      {/* Column 2 - Dores e Respiratórias */}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dores</p>
                        {TRIAGE_COMPLAINTS.doresRespiratorias.map(complaint => (
                          <label
                            key={complaint}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                              selectedComplaints.includes(complaint)
                                ? 'bg-blue-100 dark:bg-blue-900/50'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Checkbox
                              checked={selectedComplaints.includes(complaint)}
                              onCheckedChange={() => toggleComplaint(complaint)}
                              className="h-4 w-4"
                            />
                            <span className={selectedComplaints.includes(complaint) ? 'font-medium text-blue-700 dark:text-blue-300' : ''}>
                              {complaint}
                            </span>
                          </label>
                        ))}
                      </div>

                      {/* Column 3 - Intoxicações */}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Intoxicações</p>
                        {TRIAGE_COMPLAINTS.intoxicacoes.map(complaint => (
                          <label
                            key={complaint}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                              selectedComplaints.includes(complaint)
                                ? 'bg-blue-100 dark:bg-blue-900/50'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Checkbox
                              checked={selectedComplaints.includes(complaint)}
                              onCheckedChange={() => toggleComplaint(complaint)}
                              className="h-4 w-4"
                            />
                            <span className={selectedComplaints.includes(complaint) ? 'font-medium text-blue-700 dark:text-blue-300' : ''}>
                              {complaint}
                            </span>
                          </label>
                        ))}
                      </div>

                      {/* Column 4 - Outros */}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Outros</p>
                        {TRIAGE_COMPLAINTS.outros.map(complaint => (
                          <label
                            key={complaint}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                              selectedComplaints.includes(complaint)
                                ? 'bg-blue-100 dark:bg-blue-900/50'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Checkbox
                              checked={selectedComplaints.includes(complaint)}
                              onCheckedChange={() => toggleComplaint(complaint)}
                              className="h-4 w-4"
                            />
                            <span className={selectedComplaints.includes(complaint) ? 'font-medium text-blue-700 dark:text-blue-300' : ''}>
                              {complaint}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Custom symptom input */}
                    <div className="mt-4 pt-4 border-t">
                      <FormField
                        control={form.control}
                        name="mainSymptoms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações adicionais / Outra queixa</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Descreva sintomas adicionais ou queixas não listadas acima..."
                                className="min-h-[60px]"
                                data-testid="textarea-main-symptoms"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Severity Classification - Protocolo de Manchester */}
                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">Classificação de Risco (Protocolo de Manchester) *</FormLabel>
                        
                        {/* Sugestão automática */}
                        {suggestedSeverity && (
                          <div className={`p-4 rounded-lg border-2 mb-4 ${
                            suggestedSeverity.severity === 'vermelho' ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700' :
                            suggestedSeverity.severity === 'laranja' ? 'bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700' :
                            suggestedSeverity.severity === 'amarelo' ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700' :
                            suggestedSeverity.severity === 'verde' ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700' :
                            'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700'
                          }`}>
                            <div className="flex items-center gap-3 mb-2">
                              <AlertCircle className={`h-5 w-5 ${
                                suggestedSeverity.severity === 'vermelho' ? 'text-red-600' :
                                suggestedSeverity.severity === 'laranja' ? 'text-orange-600' :
                                suggestedSeverity.severity === 'amarelo' ? 'text-yellow-600' :
                                suggestedSeverity.severity === 'verde' ? 'text-green-600' :
                                'text-blue-600'
                              }`} />
                              <span className="font-semibold">Sugestão do Sistema: {getSeverityLabel(suggestedSeverity.severity).toUpperCase()}</span>
                              <Button
                                type="button"
                                size="sm"
                                variant={field.value === suggestedSeverity.severity ? "default" : "outline"}
                                onClick={() => field.onChange(suggestedSeverity.severity)}
                                className="ml-auto"
                              >
                                {field.value === suggestedSeverity.severity ? "Selecionado" : "Usar sugestão"}
                              </Button>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              <span className="font-medium">Critérios detectados:</span>
                              <ul className="list-disc list-inside mt-1 space-y-0.5">
                                {suggestedSeverity.reasons.map((reason, idx) => (
                                  <li key={idx}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                          {[
                            { value: 'vermelho', label: 'Vermelho', desc: 'Imediato', color: 'bg-red-600', border: 'border-red-600', bg: 'bg-red-50' },
                            { value: 'laranja', label: 'Laranja', desc: 'Até 10 min', color: 'bg-orange-500', border: 'border-orange-500', bg: 'bg-orange-50' },
                            { value: 'amarelo', label: 'Amarelo', desc: 'Até 60 min', color: 'bg-yellow-500', border: 'border-yellow-500', bg: 'bg-yellow-50' },
                            { value: 'verde', label: 'Verde', desc: 'Até 120 min', color: 'bg-green-500', border: 'border-green-500', bg: 'bg-green-50' },
                            { value: 'azul', label: 'Azul', desc: 'Até 240 min', color: 'bg-blue-500', border: 'border-blue-500', bg: 'bg-blue-50' },
                          ].map(severity => (
                            <label
                              key={severity.value}
                              className={`relative flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                field.value === severity.value
                                  ? `${severity.border} ${severity.bg} dark:bg-opacity-20`
                                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                              } ${suggestedSeverity?.severity === severity.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                              data-testid={`severity-${severity.value}`}
                            >
                              <input
                                type="radio"
                                className="sr-only"
                                value={severity.value}
                                checked={field.value === severity.value}
                                onChange={() => {
                                  if (suggestedSeverity && severity.value !== suggestedSeverity.severity) {
                                    setShowOverrideModal(true);
                                  }
                                  field.onChange(severity.value);
                                }}
                              />
                              {suggestedSeverity?.severity === severity.value && (
                                <span className="absolute -top-2 -right-2 bg-gray-700 text-white text-xs px-2 py-0.5 rounded-full">
                                  Sugerido
                                </span>
                              )}
                              <div className={`w-6 h-6 rounded-full ${severity.color} mb-2`} />
                              <span className="font-semibold">{severity.label}</span>
                              <span className="text-xs text-gray-500">{severity.desc}</span>
                            </label>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Vital Signs - Enhanced with HGT */}
                  <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
                    <Label className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <HeartPulse className="h-5 w-5 text-rose-500" />
                      Exame Físico / Sinais Vitais
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="bloodPressure"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">PA (mmHg)</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="120/80" className="text-center" data-testid="input-blood-pressure" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hgt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">HGT (mg/dL)</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="100" className="text-center" data-testid="input-hgt" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="temperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Temp. (°C)</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="36.5" className="text-center" data-testid="input-temperature" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Peso (kg)</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="70" className="text-center" data-testid="input-weight" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="oxygenSaturation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">SpO2 (%)</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="98" className="text-center" data-testid="input-oxygen-saturation" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="heartRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">FC (bpm)</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="75" className="text-center" data-testid="input-heart-rate" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="respiratoryRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">FR (rpm)</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="16" className="text-center" data-testid="input-respiratory-rate" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Altura (cm)</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="170" className="text-center" data-testid="input-height" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Clinical Information */}
                  <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                    <Label className="text-lg font-semibold mb-4">Informações Clínicas</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="currentMedications"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Medicações em Uso</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value || ""}
                                placeholder="Liste medicações atuais do paciente"
                                className="min-h-[80px]"
                                data-testid="textarea-current-medications"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="preExistingConditions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condições Pré-Existentes</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value || ""}
                                placeholder="Diabetes, hipertensão, doenças cardíacas, etc."
                                className="min-h-[80px]"
                                data-testid="textarea-pre-existing-conditions"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Observations and Actions */}
                  <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                    <Label className="text-lg font-semibold mb-4">Observações e Conduta</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="observations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações Gerais</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value || ""}
                                placeholder="Observações adicionais sobre o paciente"
                                className="min-h-[80px]"
                                data-testid="textarea-observations"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recommendedAction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ação Recomendada</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value || ""}
                                placeholder="Aguardar consulta, encaminhar para urgência, etc."
                                className="min-h-[80px]"
                                data-testid="textarea-recommended-action"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setSelectedComplaints([]);
                        setSuggestedSeverity(null);
                        setOverrideJustification("");
                        setOverrideConfirmed(false);
                        form.reset({
                          patientId: "",
                          staffId: user?.id || "",
                          staffName: user?.name || "",
                          severity: "verde",
                          mainSymptoms: "",
                          triageDate: format(new Date(), "yyyy-MM-dd"),
                          triageTime: format(new Date(), "HH:mm"),
                          temperature: "",
                          bloodPressure: "",
                          heartRate: "",
                          respiratoryRate: "",
                          oxygenSaturation: "",
                          weight: "",
                          height: "",
                          hgt: "",
                          allergies: "",
                          currentMedications: "",
                          preExistingConditions: "",
                          observations: "",
                          recommendedAction: "",
                          flagHipertensao: false,
                          flagDiabetes: false,
                          flagGestante: false,
                          flagSuspeitaTb: false,
                          flagSuspeitaDengue: false,
                          flagAcidenteTransito: false,
                          selectedComplaints: "[]",
                        });
                      }}
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className={overrideConfirmed ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"}
                      data-testid="button-submit-triage"
                    >
                      {createMutation.isPending ? "Salvando..." : overrideConfirmed ? "Salvar com Alteração" : "Registrar Triagem"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Triages List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Triagens Realizadas
                </CardTitle>
                <CardDescription>
                  {sortedTriages.length} triagem(ns) ordenada(s) por gravidade
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingTriages ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : sortedTriages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma triagem registrada hoje</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10">
                    <TableRow>
                      <TableHead className="w-[50px]">Prioridade</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead className="w-[100px]">Horário</TableHead>
                      <TableHead>Queixa Principal</TableHead>
                      <TableHead className="w-[180px]">Condições</TableHead>
                      <TableHead className="w-[50px]">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTriages.map((triage) => {
                      const patient = allPatients.find(p => p.id === triage.patientId);
                      return (
                        <TableRow
                          key={triage.id}
                          className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            triage.severity === 'vermelho' ? 'border-l-4 border-l-red-500' :
                            triage.severity === 'laranja' ? 'border-l-4 border-l-orange-500' :
                            triage.severity === 'amarelo' ? 'border-l-4 border-l-yellow-500' :
                            triage.severity === 'verde' ? 'border-l-4 border-l-green-500' :
                            'border-l-4 border-l-blue-500'
                          }`}
                          onClick={() => setSelectedTriage(triage)}
                          data-testid={`row-triage-${triage.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge className={`${getSeverityColor(triage.severity)} text-xs`}>
                                {getSeverityLabel(triage.severity)}
                              </Badge>
                              {triage.severityOverridden && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500 text-amber-600 bg-amber-50">
                                  <Edit2 className="h-2.5 w-2.5 mr-0.5" />
                                  ALT
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {patient?.name || 'Paciente não encontrado'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {triage.triageTime}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {triage.mainSymptoms || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {triage.flagHipertensao && <Badge variant="outline" className="text-[10px] px-1 py-0 border-red-500 text-red-600">HAS</Badge>}
                              {triage.flagDiabetes && <Badge variant="outline" className="text-[10px] px-1 py-0 border-purple-500 text-purple-600">DM</Badge>}
                              {triage.flagGestante && <Badge variant="outline" className="text-[10px] px-1 py-0 border-pink-500 text-pink-600">GEST</Badge>}
                              {triage.flagSuspeitaTb && <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500 text-amber-600">TB?</Badge>}
                              {triage.flagSuspeitaDengue && <Badge variant="outline" className="text-[10px] px-1 py-0 border-orange-500 text-orange-600">DEN</Badge>}
                              {triage.hasAllergies && <Badge variant="destructive" className="text-[10px] px-1 py-0">ALR</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" data-testid={`button-view-${triage.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* View Triage Dialog */}
        <Dialog open={!!selectedTriage} onOpenChange={() => setSelectedTriage(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Detalhes da Triagem
              </DialogTitle>
              <DialogDescription>
                Informações completas da triagem realizada
              </DialogDescription>
            </DialogHeader>
            
            {selectedTriage && (
              <div className="space-y-6">
                {/* Patient Info */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-semibold text-lg">
                      {allPatients.find(p => p.id === selectedTriage.patientId)?.name || 'Paciente'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Triagem realizada por {selectedTriage.staffName} em {format(new Date(selectedTriage.triageDate), "dd/MM/yyyy", { locale: ptBR })} às {selectedTriage.triageTime}
                    </p>
                  </div>
                  <Badge className={`text-lg px-4 py-2 ${getSeverityColor(selectedTriage.severity)}`}>
                    {getSeverityLabel(selectedTriage.severity)}
                  </Badge>
                </div>

                {/* Severity Override Alert */}
                {selectedTriage.severityOverridden && (
                  <div className="p-4 bg-amber-50 border-2 border-amber-500 rounded-lg dark:bg-amber-900/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Edit2 className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold text-amber-700 dark:text-amber-400">CLASSIFICAÇÃO ALTERADA PELO ENFERMEIRO</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Sugestão do Sistema</p>
                        <Badge className={`${getSeverityColor(selectedTriage.suggestedSeverity || "")} opacity-60`}>
                          {getSeverityLabel(selectedTriage.suggestedSeverity || "")}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Classificação Final</p>
                        <Badge className={getSeverityColor(selectedTriage.severity)}>
                          {getSeverityLabel(selectedTriage.severity)}
                        </Badge>
                      </div>
                    </div>
                    {selectedTriage.overrideJustification && (
                      <div className="mt-2 pt-2 border-t border-amber-300">
                        <p className="text-xs text-gray-500 mb-1">Justificativa da Alteração</p>
                        <p className="text-amber-800 dark:text-amber-300 italic">"{selectedTriage.overrideJustification}"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Condition Flags */}
                <div className="flex flex-wrap gap-2">
                  {selectedTriage.flagHipertensao && <Badge className="bg-red-100 text-red-800">Hipertensão</Badge>}
                  {selectedTriage.flagDiabetes && <Badge className="bg-purple-100 text-purple-800">Diabetes</Badge>}
                  {selectedTriage.flagGestante && <Badge className="bg-pink-100 text-pink-800">Gestante</Badge>}
                  {selectedTriage.flagSuspeitaTb && <Badge className="bg-amber-100 text-amber-800">Suspeita TB</Badge>}
                  {selectedTriage.flagSuspeitaDengue && <Badge className="bg-orange-100 text-orange-800">Suspeita Dengue</Badge>}
                  {selectedTriage.flagAcidenteTransito && <Badge className="bg-blue-100 text-blue-800">Acidente de Trânsito</Badge>}
                  {selectedTriage.flagNotificacaoCompulsoria && <Badge className="bg-rose-100 text-rose-800">Notificação Compulsória</Badge>}
                </div>

                {/* Allergies Alert */}
                {selectedTriage.hasAllergies && selectedTriage.allergies && (
                  <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg dark:bg-red-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="font-semibold text-red-700 dark:text-red-400">ALERGIAS</span>
                    </div>
                    <p className="text-red-600 dark:text-red-300">{selectedTriage.allergies}</p>
                  </div>
                )}

                {/* Main Symptoms */}
                <div>
                  <Label className="font-semibold">Queixa Principal</Label>
                  <p className="mt-1 text-gray-700 dark:text-gray-300">{selectedTriage.mainSymptoms}</p>
                </div>

                {/* Vital Signs */}
                <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                  {selectedTriage.bloodPressure && (
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <p className="text-xs text-gray-500">PA</p>
                      <p className="font-semibold">{selectedTriage.bloodPressure}</p>
                    </div>
                  )}
                  {selectedTriage.hgt && (
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <p className="text-xs text-gray-500">HGT</p>
                      <p className="font-semibold">{selectedTriage.hgt}</p>
                    </div>
                  )}
                  {selectedTriage.temperature && (
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                      <p className="text-xs text-gray-500">Temp.</p>
                      <p className="font-semibold">{selectedTriage.temperature}°C</p>
                    </div>
                  )}
                  {selectedTriage.weight && (
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <p className="text-xs text-gray-500">Peso</p>
                      <p className="font-semibold">{selectedTriage.weight}kg</p>
                    </div>
                  )}
                  {selectedTriage.oxygenSaturation && (
                    <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
                      <p className="text-xs text-gray-500">SpO2</p>
                      <p className="font-semibold">{selectedTriage.oxygenSaturation}%</p>
                    </div>
                  )}
                  {selectedTriage.heartRate && (
                    <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/30 rounded-lg">
                      <p className="text-xs text-gray-500">FC</p>
                      <p className="font-semibold">{selectedTriage.heartRate}bpm</p>
                    </div>
                  )}
                  {selectedTriage.respiratoryRate && (
                    <div className="text-center p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
                      <p className="text-xs text-gray-500">FR</p>
                      <p className="font-semibold">{selectedTriage.respiratoryRate}rpm</p>
                    </div>
                  )}
                  {selectedTriage.height && (
                    <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                      <p className="text-xs text-gray-500">Altura</p>
                      <p className="font-semibold">{selectedTriage.height}cm</p>
                    </div>
                  )}
                </div>

                {/* Clinical Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTriage.currentMedications && (
                    <div>
                      <Label className="font-semibold">Medicações em Uso</Label>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">{selectedTriage.currentMedications}</p>
                    </div>
                  )}
                  {selectedTriage.preExistingConditions && (
                    <div>
                      <Label className="font-semibold">Condições Pré-Existentes</Label>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">{selectedTriage.preExistingConditions}</p>
                    </div>
                  )}
                </div>

                {/* Observations */}
                {selectedTriage.observations && (
                  <div>
                    <Label className="font-semibold">Observações</Label>
                    <p className="mt-1 text-gray-700 dark:text-gray-300">{selectedTriage.observations}</p>
                  </div>
                )}

                {selectedTriage.recommendedAction && (
                  <div>
                    <Label className="font-semibold">Ação Recomendada</Label>
                    <p className="mt-1 text-gray-700 dark:text-gray-300">{selectedTriage.recommendedAction}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de confirmação de override */}
        <Dialog open={showOverrideModal} onOpenChange={setShowOverrideModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Classificação diferente da sugestão
              </DialogTitle>
              <DialogDescription>
                Você escolheu uma classificação diferente da sugerida pelo sistema. 
                Por favor, informe o motivo da alteração para fins de auditoria.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Sugestão do sistema</p>
                  <Badge className={getSeverityColor(suggestedSeverity?.severity || "")}>
                    {getSeverityLabel(suggestedSeverity?.severity || "")}
                  </Badge>
                </div>
                <span className="text-2xl">→</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Sua escolha</p>
                  <Badge className={getSeverityColor(form.getValues("severity"))}>
                    {getSeverityLabel(form.getValues("severity"))}
                  </Badge>
                </div>
              </div>

              <div>
                <Label htmlFor="override-justification" className="font-semibold">
                  Justificativa da alteração *
                </Label>
                <Textarea
                  id="override-justification"
                  value={overrideJustification}
                  onChange={(e) => setOverrideJustification(e.target.value)}
                  placeholder="Descreva o motivo da alteração da classificação..."
                  className="mt-2 min-h-[100px]"
                  data-testid="textarea-override-justification"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (suggestedSeverity) {
                    form.setValue("severity", suggestedSeverity.severity);
                  }
                  setOverrideJustification("");
                  setOverrideConfirmed(false);
                  setShowOverrideModal(false);
                }}
              >
                Usar sugestão
              </Button>
              <Button
                onClick={() => {
                  if (!overrideJustification.trim()) {
                    toast({
                      title: "Justificativa obrigatória",
                      description: "Por favor, informe o motivo da alteração.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setOverrideConfirmed(true);
                  setShowOverrideModal(false);
                  toast({
                    title: "Alteração confirmada",
                    description: "Clique em 'Salvar Triagem' para registrar.",
                  });
                }}
                disabled={!overrideJustification.trim()}
              >
                Confirmar alteração
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
