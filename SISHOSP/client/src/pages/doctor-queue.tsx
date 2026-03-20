import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type QueueEntry, type Patient, insertMedicalDocumentSchema, type SelectMedicalDocument, type Triage } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Phone, Play, CheckCircle, Clock, AlertTriangle, ArrowLeft, UserCheck, FileText, FileCheck, Printer, Send, Mail, Download, PenTool, Activity, UserPlus, LogOut, Bed, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";
import exuBemCuidadaLogo from "@assets/logo exubemcuidada_1762210247656.png";
import secretariaSaudeLogo from "@assets/logo secretaria de saude_1762210247656.png";
import ministerioSaudeLogo from "@assets/Ministério_da_Saúde_1762210247657.png";
import susLogo from "@assets/sus-logo_1762210247657.png";

type MedicalDocumentFormData = z.infer<typeof insertMedicalDocumentSchema>;

// Get current date in Brazil timezone (America/Recife = UTC-3)
function getBrazilDate(): string {
  const now = new Date();
  // Brazil/Recife is UTC-3, so add offset to get local time
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brazilOffset = -3 * 60 * 60000; // -3 hours in milliseconds
  const brazilTime = new Date(utcTime + brazilOffset);
  return format(brazilTime, "yyyy-MM-dd");
}

export default function DoctorQueuePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);
  const [showBackToQueueDialog, setShowBackToQueueDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [documentType, setDocumentType] = useState<"prescription" | "certificate">("prescription");
  const [sendingDocument, setSendingDocument] = useState<SelectMedicalDocument | null>(null);
  const [sendMethod, setSendMethod] = useState<"whatsapp" | "email" | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [elapsedTime, setElapsedTime] = useState<{ [key: string]: number }>({});
  const [cancelReason, setCancelReason] = useState("");
  const [dischargeType, setDischargeType] = useState("");
  const [cidSearch, setCidSearch] = useState("");
  const [showCidResults, setShowCidResults] = useState(false);
  const [selectedCid, setSelectedCid] = useState<{ code: string; description: string } | null>(null);

  // Fetch current user
  const { data: user } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  // Fetch patients for patient details
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch active queue entries
  const { data: queueEntries = [], isLoading: isLoadingQueue } = useQuery<QueueEntry[]>({
    queryKey: ["/api/queue/active"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch all triages
  const { data: triages = [] } = useQuery<Triage[]>({
    queryKey: ["/api/triage"],
    refetchInterval: 5000, // Auto-refresh to sync with queue
  });

  // Fetch all medical documents (only when dialog is open)
  const { data: allDocuments = [] } = useQuery<SelectMedicalDocument[]>({
    queryKey: ["/api/medical-documents"],
    enabled: showDocumentsDialog,
  });

  // Fetch queue metrics
  const { data: queueMetrics } = useQuery<{
    totalPatients: number;
    avgWaitTime: number | null;
    avgAttendanceTime: number | null;
    avgTotalTime: number | null;
    currentlyWaiting: number;
    currentlyInAttendance: number;
  }>({
    queryKey: ["/api/queue/metrics?period=today"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch CID codes for autocomplete
  const { data: cidCodes = [] } = useQuery<{ code: string; description: string }[]>({
    queryKey: [`/api/cid/search?q=${encodeURIComponent(cidSearch)}`],
    enabled: cidSearch.length >= 2,
  });

  // Medical document form
  const documentForm = useForm<MedicalDocumentFormData>({
    resolver: zodResolver(insertMedicalDocumentSchema),
    defaultValues: {
      patientId: "",
      doctorId: user?.id || "",
      doctorName: user?.name || "",
      doctorCrm: user?.crm || "",
      documentType: "prescription",
      title: "",
      content: "",
      diagnosis: "",
      medications: "",
      observations: "",
      daysOff: "",
      cid: "",
      issueDate: getBrazilDate(),
      sentViaWhatsApp: false,
      sentViaEmail: false,
      printed: false,
      isSigned: false,
      signedBy: "",
      signatureHash: "",
      signatureIp: "",
    },
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      documentForm.setValue("doctorId", user.id);
      documentForm.setValue("doctorName", user.name);
      documentForm.setValue("doctorCrm", user.crm || "");
    }
  }, [user, documentForm]);

  // Call next patient mutation
  const callNextMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/queue/call-next", {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data: QueueEntry) => {
      toast({
        title: "Paciente chamado",
        description: `Paciente #${data.queueNumber} foi chamado com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/active"] });
      setSelectedEntry(data);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao chamar paciente",
        description: error.message || "Não foi possível chamar o próximo paciente.",
        variant: "destructive",
      });
    },
  });

  // Start attendance mutation
  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/queue/${id}/start`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Atendimento iniciado",
        description: "Atendimento iniciado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/active"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar atendimento",
        description: error.message || "Não foi possível iniciar o atendimento.",
        variant: "destructive",
      });
    },
  });

  // Finish attendance mutation
  const finishMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/queue/${id}/finish`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Atendimento finalizado",
        description: "Atendimento finalizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/active"] });
      setShowFinishDialog(false);
      setSelectedEntry(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao finalizar atendimento",
        description: error.message || "Não foi possível finalizar o atendimento.",
        variant: "destructive",
      });
    },
  });

  // Back to queue mutation
  const backToQueueMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/queue/${id}/back-to-queue`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Paciente voltou à fila",
        description: "Paciente retornou ao status de aguardando.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/active"] });
      setShowBackToQueueDialog(false);
      setSelectedEntry(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao voltar à fila",
        description: error.message || "Não foi possível voltar o paciente à fila.",
        variant: "destructive",
      });
    },
  });

  // Cancel attendance mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/queue/${id}/cancel`, {
        method: "POST",
        body: { reason: cancelReason || "Cancelado pelo médico" },
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Atendimento cancelado",
        description: "Atendimento foi cancelado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/active"] });
      setShowCancelDialog(false);
      setCancelReason("");
      setSelectedEntry(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cancelar",
        description: error.message || "Não foi possível cancelar o atendimento.",
        variant: "destructive",
      });
    },
  });

  // Create medical document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (data: MedicalDocumentFormData) => {
      const response = await apiRequest("/api/medical-documents", {
        method: "POST",
        body: {
          ...data,
          doctorId: user?.id || "",
          doctorName: user?.name || "",
          doctorCrm: user?.crm || "",
        },
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Documento criado",
        description: "Documento médico criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-documents"] });
      documentForm.reset();
      // Resetar para tab de lista após criação
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar documento",
        description: error.message || "Não foi possível criar o documento.",
        variant: "destructive",
      });
    },
  });

  // Send via WhatsApp mutation
  const sendWhatsAppMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest(`/api/medical-documents/${documentId}/send-whatsapp`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Enviado com sucesso",
        description: "Notificação enviada via WhatsApp para o paciente.",
      });
      setSendingDocument(null);
      setSendMethod(null);
      queryClient.invalidateQueries({ queryKey: ["/api/medical-documents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar a notificação.",
        variant: "destructive",
      });
    },
  });

  // Send via Email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({ documentId, email }: { documentId: string; email: string }) => {
      const response = await apiRequest(`/api/medical-documents/${documentId}/send-email`, {
        method: "POST",
        body: { email },
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Enviado com sucesso",
        description: "Documento enviado via email com sucesso.",
      });
      setSendingDocument(null);
      setSendMethod(null);
      setRecipientEmail("");
      queryClient.invalidateQueries({ queryKey: ["/api/medical-documents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar o email.",
        variant: "destructive",
      });
    },
  });

  const handleCallNext = () => {
    callNextMutation.mutate();
  };

  const handleStartAttendance = (entry: QueueEntry) => {
    startMutation.mutate(entry.id);
    setSelectedEntry(entry);
  };

  const handleFinishAttendance = () => {
    if (selectedEntry) {
      finishMutation.mutate(selectedEntry.id);
    }
  };

  const handleOpenDocuments = (entry: QueueEntry) => {
    const patient = getPatientDetails(entry.patientId);
    if (patient) {
      documentForm.setValue("patientId", patient.id);
      documentForm.setValue("issueDate", getBrazilDate()); // Update date each time dialog opens
      setSelectedEntry(entry);
      setShowDocumentsDialog(true);
    }
  };

  const handleDocumentTypeChange = (type: "prescription" | "certificate") => {
    console.log("Document type changed to:", type);
    setDocumentType(type);
    documentForm.setValue("documentType", type);
    
    // Set default title based on document type
    if (type === "prescription") {
      documentForm.setValue("title", "Receita Médica");
    } else if (type === "certificate") {
      documentForm.setValue("title", "Atestado Médico");
    }
  };

  const onSubmitDocument = async (data: MedicalDocumentFormData) => {
    // Process signature if document is to be signed
    if (data.isSigned && user?.id) {
      data.signedBy = user.id;
      
      // Generate hash of document content for audit trail
      const contentToHash = JSON.stringify({
        content: data.content,
        diagnosis: data.diagnosis,
        medications: data.medications,
        observations: data.observations,
        patientId: data.patientId,
        doctorId: data.doctorId,
        timestamp: new Date().toISOString(),
      });
      
      // Simple hash using SubtleCrypto (available in browsers)
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(contentToHash);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      data.signatureHash = hashHex;
    } else {
      // Ensure signature fields are cleared if not signing
      data.isSigned = false;
      delete (data as any).signedBy;
      delete (data as any).signatureHash;
    }
    
    createDocumentMutation.mutate(data);
  };

  const handlePrintDocument = async (documentId: string) => {
    try {
      window.open(`/api/medical-documents/${documentId}/pdf`, '_blank');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível abrir o documento.",
        variant: "destructive",
      });
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "prescription":
        return "Receita Médica";
      case "certificate":
        return "Atestado Médico";
      case "medical_report":
        return "Relatório Médico";
      default:
        return type;
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case "prescription":
        return <FileText className="h-4 w-4" />;
      case "certificate":
        return <FileCheck className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Filter documents for current patient
  const currentPatientDocuments = allDocuments.filter(doc => 
    selectedEntry && doc.patientId === selectedEntry.patientId
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aguardando":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "chamado":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "em_atendimento":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "aguardando":
        return "Aguardando";
      case "chamado":
        return "Chamado";
      case "em_atendimento":
        return "Em Atendimento";
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    const priorityNum = parseInt(priority);
    switch (priorityNum) {
      case 1:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case 2:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case 3:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case 4:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case 5:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getPriorityLabel = (priority: string) => {
    const priorityNum = parseInt(priority);
    switch (priorityNum) {
      case 1:
        return "Emergência";
      case 2:
        return "Alta";
      case 3:
        return "Média";
      case 4:
        return "Baixa";
      case 5:
        return "Sem Triagem";
      default:
        return "Desconhecida";
    }
  };

  const getPatientName = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient?.name || "Desconhecido";
  };

  const getPatientCPF = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient?.cpf || "";
  };

  const getPatientDetails = (patientId: string) => {
    return patients.find((p) => p.id === patientId);
  };

  // Busca triagem vinculada à entrada da fila
  const getQueueTriage = (triageId: string | null) => {
    if (!triageId) return null;
    return triages.find((t) => t.id === triageId);
  };

  // Retorna o label da gravidade da triagem
  const getTriageSeverityLabel = (severity: string) => {
    switch (severity) {
      case "baixa":
        return "Baixa";
      case "media":
        return "Média";
      case "alta":
        return "Alta";
      case "emergencia":
        return "Emergência";
      default:
        return severity;
    }
  };

  // Retorna a cor da gravidade da triagem
  const getTriageSeverityColor = (severity: string) => {
    switch (severity) {
      case "baixa":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300";
      case "media":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300";
      case "alta":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300";
      case "emergencia":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-300";
    }
  };

  // Retorna as cores do card baseada na triagem (usando estilo inline para garantir aplicação)
  const getTriageCardStyle = (severity: string | undefined) => {
    switch (severity) {
      case "verde":
      case "baixa":
        return { backgroundColor: "#dcfce7", borderColor: "#86efac" }; // verde
      case "amarelo":
      case "media":
        return { backgroundColor: "#fef9c3", borderColor: "#fde047" }; // amarelo
      case "laranja":
      case "alta":
        return { backgroundColor: "#ffedd5", borderColor: "#fdba74" }; // laranja
      case "vermelho":
      case "emergencia":
        return { backgroundColor: "#fee2e2", borderColor: "#fca5a5" }; // vermelho
      case "azul":
        return { backgroundColor: "#dbeafe", borderColor: "#93c5fd" }; // azul
      default:
        return { backgroundColor: "#f3f4f6", borderColor: "#d1d5db" }; // cinza padrão
    }
  };

  // Retorna a cor do número de posição baseada na triagem
  const getTriageNumberStyle = (severity: string | undefined) => {
    switch (severity) {
      case "verde":
      case "baixa":
        return { background: "linear-gradient(to bottom right, #22c55e, #16a34a)" }; // verde
      case "amarelo":
      case "media":
        return { background: "linear-gradient(to bottom right, #eab308, #ca8a04)" }; // amarelo
      case "laranja":
      case "alta":
        return { background: "linear-gradient(to bottom right, #f97316, #ea580c)" }; // laranja
      case "vermelho":
      case "emergencia":
        return { background: "linear-gradient(to bottom right, #ef4444, #dc2626)" }; // vermelho
      case "azul":
        return { background: "linear-gradient(to bottom right, #3b82f6, #2563eb)" }; // azul
      default:
        return { background: "linear-gradient(to bottom right, #6b7280, #4b5563)" }; // cinza padrão
    }
  };

  // Get entries being attended by this doctor
  const myAttendances = queueEntries.filter(
    (e) => e.doctorId === user?.id && (e.status === "chamado" || e.status === "em_atendimento")
  );

  // Get waiting patients (only those who completed triage)
  const waitingPatients = queueEntries.filter((e) => e.status === "aguardando" && e.triageId);

  // Auto-select first attendance when available
  useEffect(() => {
    if (myAttendances.length > 0 && !selectedEntry) {
      setSelectedEntry(myAttendances[0]);
    }
  }, [myAttendances, selectedEntry]);

  // Update elapsed time for active attendances
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const newElapsedTime: { [key: string]: number } = {};
      
      myAttendances.forEach((entry) => {
        if (entry.status === "em_atendimento" && entry.startTime) {
          const startTime = new Date(entry.startTime).getTime();
          const elapsed = Math.floor((now - startTime) / 1000); // in seconds
          newElapsedTime[entry.id] = elapsed;
        }
      });
      
      setElapsedTime(newElapsedTime);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [myAttendances]);

  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
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

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Atendimento Médico - Fila
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Exu Saúde - Sistema de Atendimento Médico
              </p>
            </div>
            <div className="flex items-center gap-6">
              <img src={hospitalLogo} alt="Hospital Logo" className="h-16 w-auto" />
              <img src={exuBemCuidadaLogo} alt="Exu Bem Cuidada" className="h-14 w-auto" />
              <img src={secretariaSaudeLogo} alt="Secretaria de Saúde" className="h-14 w-auto" />
              <img src={ministerioSaudeLogo} alt="Ministério da Saúde" className="h-12 w-auto" />
              <img src={susLogo} alt="SUS" className="h-14 w-auto" />
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        {queueMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  Pacientes Aguardando
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{queueMetrics.currentlyWaiting}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Na fila agora</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <UserCheck className="h-5 w-5 text-green-600 dark:text-green-300" />
                  </div>
                  Em Atendimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{queueMetrics.currentlyInAttendance}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Sendo atendidos</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
                  </div>
                  Tempo Médio de Espera
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {queueMetrics.avgWaitTime 
                    ? `${Math.round(queueMetrics.avgWaitTime)} min` 
                    : "N/A"}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Hoje</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                  </div>
                  Tempo Médio de Atendimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {queueMetrics.avgAttendanceTime 
                    ? `${Math.round(queueMetrics.avgAttendanceTime)} min` 
                    : "N/A"}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Hoje</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Call Next & Waiting List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Call Next Button */}
            <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Chamar Próximo Paciente
                </CardTitle>
                <CardDescription>
                  {waitingPatients.length} paciente(s) aguardando atendimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleCallNext}
                  disabled={callNextMutation.isPending || waitingPatients.length === 0}
                  data-testid="button-call-next"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  {callNextMutation.isPending
                    ? "Chamando..."
                    : waitingPatients.length === 0
                    ? "Nenhum Paciente Aguardando"
                    : "Chamar Próximo Paciente"}
                </Button>
              </CardContent>
            </Card>

            {/* Waiting Queue */}
            <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Fila de Espera
                </CardTitle>
                <CardDescription>
                  Próximos pacientes por ordem de prioridade
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingQueue ? (
                  <div className="text-center py-8 text-gray-500">Carregando...</div>
                ) : waitingPatients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum paciente aguardando
                  </div>
                ) : (
                  <div className="space-y-3">
                    {waitingPatients.slice(0, 5).map((entry, index) => {
                      const triage = getQueueTriage(entry.triageId);
                      const cardStyle = getTriageCardStyle(triage?.severity);
                      const numberStyle = getTriageNumberStyle(triage?.severity);
                      return (
                      <div
                        key={entry.id}
                        className="border-2 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow flex items-center gap-4"
                        style={cardStyle}
                        data-testid={`waiting-entry-${entry.id}`}
                      >
                        <div 
                          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
                          style={numberStyle}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            #{entry.queueNumber} - {getPatientName(entry.patientId)}
                          </div>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {(() => {
                              const triage = getQueueTriage(entry.triageId);
                              if (triage) {
                                return (
                                  <Badge className={getTriageSeverityColor(triage.severity)} variant="outline">
                                    <Activity className="h-3 w-3 mr-1" />
                                    Triagem: {getTriageSeverityLabel(triage.severity)}
                                  </Badge>
                                );
                              } else {
                                return (
                                  <Badge className="bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200" variant="outline">
                                    Sem Triagem
                                  </Badge>
                                );
                              }
                            })()}
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(entry.arrivalTime), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Current Attendance */}
          <div className="space-y-6">
            <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Atendimento Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myAttendances.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4">
                      <UserCheck className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">Nenhum paciente em atendimento</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myAttendances.map((entry) => {
                      const patient = getPatientDetails(entry.patientId);
                      return (
                        <div
                          key={entry.id}
                          className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-700 dark:to-gray-600 border-0 rounded-xl p-6 space-y-4 shadow-md"
                          data-testid={`current-entry-${entry.id}`}
                        >
                          <div className="text-center">
                            <div className="inline-block bg-white dark:bg-gray-800 rounded-full px-6 py-3 shadow-md mb-3">
                              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                                #{entry.queueNumber}
                              </div>
                            </div>
                            {entry.status === "em_atendimento" && elapsedTime[entry.id] !== undefined && (
                              <div className="mt-3 mb-2">
                                <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900 px-4 py-2 rounded-lg shadow-sm">
                                  <Clock className="h-5 w-5 text-green-600 dark:text-green-300 animate-pulse" />
                                  <span className="text-2xl font-bold text-green-600 dark:text-green-300 font-mono">
                                    {formatElapsedTime(elapsedTime[entry.id])}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tempo de atendimento</p>
                              </div>
                            )}
                            <div className="font-bold text-xl text-gray-900 dark:text-gray-100">
                              {getPatientName(entry.patientId)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              CPF: {getPatientCPF(entry.patientId)}
                            </div>
                          </div>

                          <div className="flex justify-center gap-2">
                            <Badge className={getStatusColor(entry.status)}>
                              {getStatusLabel(entry.status)}
                            </Badge>
                            <Badge className={getPriorityColor(entry.priority)}>
                              {getPriorityLabel(entry.priority)}
                            </Badge>
                          </div>

                          {patient && (
                            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 space-y-2 text-sm shadow-sm">
                              <div className="flex justify-between">
                                <strong className="text-gray-700 dark:text-gray-300">Cartão SUS:</strong>
                                <span className="text-gray-900 dark:text-gray-100">{patient.susCard}</span>
                              </div>
                              <div className="flex justify-between">
                                <strong className="text-gray-700 dark:text-gray-300">Telefone:</strong>
                                <span className="text-gray-900 dark:text-gray-100">{patient.whatsapp}</span>
                              </div>
                              <div className="flex justify-between">
                                <strong className="text-gray-700 dark:text-gray-300">Cidade:</strong>
                                <span className="text-gray-900 dark:text-gray-100">{patient.city}</span>
                              </div>
                            </div>
                          )}

                          {entry.observations && (
                            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-sm shadow-sm">
                              <strong className="text-gray-700 dark:text-gray-300">Observações:</strong>
                              <p className="text-gray-900 dark:text-gray-100 mt-2 whitespace-pre-wrap">
                                {entry.observations}
                              </p>
                            </div>
                          )}

                          {entry.companionName && (
                            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 text-sm shadow-sm border border-purple-200 dark:border-purple-700">
                              <div className="flex items-center gap-2 mb-2">
                                <UserPlus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <strong className="text-purple-700 dark:text-purple-300">Acompanhante:</strong>
                              </div>
                              <div className="space-y-1 text-gray-900 dark:text-gray-100">
                                <div><strong className="text-gray-700 dark:text-gray-300">Nome:</strong> {entry.companionName}</div>
                                {entry.companionDocument && (
                                  <div><strong className="text-gray-700 dark:text-gray-300">Documento:</strong> {entry.companionDocument}</div>
                                )}
                                {entry.companionRelationship && (
                                  <div><strong className="text-gray-700 dark:text-gray-300">Parentesco:</strong> {
                                    entry.companionRelationship === 'mae' ? 'Mãe' :
                                    entry.companionRelationship === 'pai' ? 'Pai' :
                                    entry.companionRelationship === 'filho' ? 'Filho(a)' :
                                    entry.companionRelationship === 'conjuge' ? 'Cônjuge' :
                                    entry.companionRelationship === 'irmao' ? 'Irmão(ã)' :
                                    entry.companionRelationship === 'avo' ? 'Avô/Avó' :
                                    entry.companionRelationship === 'neto' ? 'Neto(a)' :
                                    entry.companionRelationship === 'tio' ? 'Tio(a)' :
                                    entry.companionRelationship === 'sobrinho' ? 'Sobrinho(a)' :
                                    entry.companionRelationship === 'cuidador' ? 'Cuidador(a)' :
                                    entry.companionRelationship === 'outro' ? 'Outro' :
                                    entry.companionRelationship
                                  }</div>
                                )}
                                {entry.companionPhone && (
                                  <div><strong className="text-gray-700 dark:text-gray-300">Telefone:</strong> {entry.companionPhone}</div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="space-y-2 pt-2">
                            {entry.status === "chamado" && (
                              <>
                                <Button
                                  className="w-full shadow-md"
                                  size="lg"
                                  onClick={() => handleStartAttendance(entry)}
                                  disabled={startMutation.isPending}
                                  data-testid="button-start-attendance"
                                >
                                  <Play className="mr-2 h-5 w-5" />
                                  {startMutation.isPending ? "Iniciando..." : "Iniciar Atendimento"}
                                </Button>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    className="shadow-md"
                                    size="lg"
                                    variant="outline"
                                    onClick={() => setShowBackToQueueDialog(true)}
                                    disabled={backToQueueMutation.isPending}
                                    data-testid="button-back-to-queue"
                                  >
                                    <ArrowLeft className="mr-2 h-5 w-5" />
                                    Voltar à Fila
                                  </Button>
                                  <Button
                                    className="shadow-md"
                                    size="lg"
                                    variant="destructive"
                                    onClick={() => setShowCancelDialog(true)}
                                    disabled={cancelMutation.isPending}
                                    data-testid="button-cancel-attendance"
                                  >
                                    <AlertTriangle className="mr-2 h-5 w-5" />
                                    Cancelar
                                  </Button>
                                </div>
                              </>
                            )}

                            {entry.status === "em_atendimento" && (
                              <>
                                <Button
                                  className="w-full shadow-md"
                                  size="lg"
                                  variant="outline"
                                  onClick={() => setLocation(`/prontuario-rapido?queueId=${entry.id}`)}
                                  data-testid="button-quick-notes"
                                >
                                  📝 Prontuário Rápido
                                </Button>
                                <Button
                                  className="w-full shadow-md"
                                  size="lg"
                                  variant="outline"
                                  onClick={() => handleOpenDocuments(entry)}
                                  data-testid="button-documents"
                                >
                                  <FileText className="mr-2 h-5 w-5" />
                                  Documentos Médicos
                                </Button>
                                <Button
                                  className="w-full shadow-md"
                                  size="lg"
                                  variant="outline"
                                  onClick={() => window.open(`/api/boletim/${entry.id}/pdf`, '_blank')}
                                  data-testid="button-boletim"
                                >
                                  <Eye className="mr-2 h-5 w-5" />
                                  Boletim de Atendimento
                                </Button>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    className="shadow-md"
                                    size="lg"
                                    variant="outline"
                                    onClick={() => setShowBackToQueueDialog(true)}
                                    disabled={backToQueueMutation.isPending}
                                    data-testid="button-back-to-queue"
                                  >
                                    <ArrowLeft className="mr-2 h-5 w-5" />
                                    Voltar à Fila
                                  </Button>
                                  <Button
                                    className="shadow-md"
                                    size="lg"
                                    variant="destructive"
                                    onClick={() => setShowCancelDialog(true)}
                                    disabled={cancelMutation.isPending}
                                    data-testid="button-cancel-attendance"
                                  >
                                    <AlertTriangle className="mr-2 h-5 w-5" />
                                    Cancelar
                                  </Button>
                                </div>
                                <Button
                                  className="w-full shadow-md"
                                  size="lg"
                                  variant="default"
                                  onClick={() => setShowFinishDialog(true)}
                                  data-testid="button-finish-attendance"
                                >
                                  <CheckCircle className="mr-2 h-5 w-5" />
                                  Finalizar Atendimento
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back to Queue Dialog */}
        <Dialog open={showBackToQueueDialog} onOpenChange={setShowBackToQueueDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Voltar Paciente à Fila?</DialogTitle>
              <DialogDescription>
                O paciente #{selectedEntry?.queueNumber} retornará ao status de aguardando.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                O atendimento será interrompido e o paciente poderá ser chamado novamente.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBackToQueueDialog(false)}>
                Cancelar
              </Button>
              <Button
                variant="default"
                onClick={() => selectedEntry && backToQueueMutation.mutate(selectedEntry.id)}
                disabled={backToQueueMutation.isPending}
              >
                {backToQueueMutation.isPending ? "Voltando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Attendance Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar Atendimento?</DialogTitle>
              <DialogDescription>
                O atendimento do paciente #{selectedEntry?.queueNumber} será cancelado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="cancel-reason">Motivo do cancelamento (opcional)</Label>
                <Textarea
                  id="cancel-reason"
                  placeholder="Digite o motivo do cancelamento..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="mt-2"
                />
              </div>
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠️ O paciente será removido da fila.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedEntry && cancelMutation.mutate(selectedEntry.id)}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Medical Documents Dialog */}
        <Dialog open={showDocumentsDialog} onOpenChange={setShowDocumentsDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos Médicos
              </DialogTitle>
              <DialogDescription>
                Paciente: {selectedEntry && getPatientName(selectedEntry.patientId)}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">Documentos ({currentPatientDocuments.length})</TabsTrigger>
                <TabsTrigger value="create">Criar Novo</TabsTrigger>
              </TabsList>

              {/* Documents List Tab */}
              <TabsContent value="list" className="space-y-4 mt-4">
                {currentPatientDocuments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhum documento criado para este paciente ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {currentPatientDocuments.map((doc) => (
                      <Card key={doc.id} className="shadow-md">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getDocumentTypeIcon(doc.documentType)}
                                <h3 className="font-semibold text-lg">{doc.title}</h3>
                                <Badge variant="outline" className="ml-2">
                                  {getDocumentTypeLabel(doc.documentType)}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                <p><strong>Data:</strong> {format(new Date(doc.issueDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</p>
                                <p><strong>Médico:</strong> {doc.doctorName} - CRM: {doc.doctorCrm}</p>
                                {doc.diagnosis && (
                                  <p><strong>Diagnóstico:</strong> {doc.diagnosis}</p>
                                )}
                              </div>
                              
                              {/* Send status badges */}
                              <div className="flex gap-2 mt-3 flex-wrap">
                                {doc.isSigned && (
                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                    ✍️ Assinado por: {(doc as any).signedByName || 'Médico'}
                                  </Badge>
                                )}
                                {doc.sentViaWhatsApp && (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    ✓ WhatsApp enviado
                                  </Badge>
                                )}
                                {doc.sentViaEmail && (
                                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    ✓ Email enviado
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintDocument(doc.id)}
                                data-testid={`button-print-${doc.id}`}
                              >
                                <Printer className="h-4 w-4 mr-1" />
                                Imprimir
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSendingDocument(doc);
                                  setSendMethod("whatsapp");
                                }}
                                data-testid={`button-whatsapp-${doc.id}`}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                WhatsApp
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSendingDocument(doc);
                                  setSendMethod("email");
                                }}
                                data-testid={`button-email-${doc.id}`}
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                Email
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Create Document Tab */}
              <TabsContent value="create" className="mt-4">
                <Form {...documentForm}>
                  <form onSubmit={documentForm.handleSubmit(onSubmitDocument)} className="space-y-6">
                {/* Document Type Selection */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Tipo de Documento *</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={documentType === "prescription" ? "default" : "outline"}
                      className="h-auto flex-col py-4"
                      onClick={() => handleDocumentTypeChange("prescription")}
                      data-testid="button-type-prescription"
                    >
                      <FileText className="h-8 w-8 mb-2" />
                      <span className="font-semibold">Receita Médica</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Prescrição de medicamentos</span>
                    </Button>
                    <Button
                      type="button"
                      variant={documentType === "certificate" ? "default" : "outline"}
                      className="h-auto flex-col py-4"
                      onClick={() => handleDocumentTypeChange("certificate")}
                      data-testid="button-type-certificate"
                    >
                      <FileCheck className="h-8 w-8 mb-2" />
                      <span className="font-semibold">Atestado Médico</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Afastamento e CID</span>
                    </Button>
                  </div>
                </div>

                {/* Title */}
                <FormField
                  control={documentForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título do Documento *</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Ex: Receita Médica" data-testid="input-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Content */}
                <FormField
                  control={documentForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conteúdo do Documento *</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ""}
                          placeholder="Escreva o conteúdo completo do documento aqui..."
                          rows={8}
                          data-testid="input-content"
                        />
                      </FormControl>
                      <FormDescription>
                        Este é o texto principal que será impresso ou enviado ao paciente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Diagnosis */}
                <FormField
                  control={documentForm.control}
                  name="diagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diagnóstico</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ""}
                          placeholder="Diagnóstico do paciente..."
                          rows={2}
                          data-testid="input-diagnosis"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Medications */}
                {documentType === "prescription" && (
                  <FormField
                    control={documentForm.control}
                    name="medications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medicamentos</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value || ""}
                            placeholder="Liste os medicamentos, dosagens e instruções..."
                            rows={4}
                            data-testid="input-medications"
                          />
                        </FormControl>
                        <FormDescription>
                          Um medicamento por linha
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Days Off and CID for Certificate */}
                {documentType === "certificate" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={documentForm.control}
                        name="daysOff"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dias de Afastamento</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ""}
                                placeholder="Ex: 3"
                                data-testid="input-days-off"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={documentForm.control}
                        name="cid"
                        render={({ field }) => (
                          <FormItem className="relative">
                            <FormLabel>CID-10</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  value={cidSearch}
                                  onChange={(e) => {
                                    setCidSearch(e.target.value);
                                    setShowCidResults(true);
                                    if (!e.target.value) {
                                      setSelectedCid(null);
                                      field.onChange("");
                                    }
                                  }}
                                  onFocus={() => setShowCidResults(true)}
                                  placeholder="Buscar CID..."
                                  data-testid="input-cid"
                                />
                                {showCidResults && cidCodes.length > 0 && (
                                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                    {cidCodes.map((cid) => (
                                      <div
                                        key={cid.code}
                                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                                        onClick={() => {
                                          setSelectedCid(cid);
                                          setCidSearch(`${cid.code} - ${cid.description}`);
                                          field.onChange(`${cid.code} - ${cid.description}`);
                                          setShowCidResults(false);
                                        }}
                                      >
                                        <span className="font-medium text-blue-600">{cid.code}</span>
                                        <span className="ml-2 text-gray-600 dark:text-gray-400">{cid.description}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            {selectedCid && (
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className="bg-green-600">{selectedCid.code}</Badge>
                                <span className="text-xs text-gray-600">{selectedCid.description}</span>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {/* Observations */}
                <FormField
                  control={documentForm.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ""}
                          placeholder="Observações adicionais..."
                          rows={2}
                          data-testid="input-observations"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Digital Signature Section */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <PenTool className="h-5 w-5 text-blue-600" />
                    Assinatura Digital
                  </h3>

                  {user?.signature ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
                          Prévia da sua assinatura:
                        </p>
                        <div className="bg-white p-4 rounded border border-gray-200 flex flex-col items-center">
                          <img
                            src={user.signature}
                            alt="Assinatura"
                            className="max-w-full h-auto"
                            style={{ maxHeight: "80px" }}
                          />
                          <div className="mt-2 text-center">
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            {user.crm && (
                              <p className="text-xs text-gray-600">CRM: {user.crm}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <FormField
                        control={documentForm.control}
                        name="isSigned"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="mt-1"
                                data-testid="checkbox-sign-document"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer">
                                Assinar documento agora
                              </FormLabel>
                              <FormDescription>
                                Ao marcar esta opção, o documento será assinado digitalmente com sua assinatura,
                                nome, CRM e timestamp. Esta ação será registrada no sistema para auditoria.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                        <strong>Você ainda não possui uma assinatura digital cadastrada.</strong>
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                        Configure sua assinatura para poder assinar documentos digitalmente.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('/configuracao-assinatura', '_blank')}
                        data-testid="button-go-to-signature-settings"
                      >
                        <PenTool className="h-4 w-4 mr-2" />
                        Configurar Assinatura
                      </Button>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDocumentsDialog(false)}
                    data-testid="button-cancel-document"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createDocumentMutation.isPending}
                    data-testid="button-submit-document"
                  >
                    {createDocumentMutation.isPending ? "Criando..." : "Criar Documento"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Send via WhatsApp Dialog */}
        <Dialog open={sendMethod === "whatsapp"} onOpenChange={(open) => {
          if (!open) {
            setSendingDocument(null);
            setSendMethod(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Enviar via WhatsApp
              </DialogTitle>
              <DialogDescription>
                Confirme o envio da notificação sobre o documento médico para o WhatsApp do paciente.
              </DialogDescription>
            </DialogHeader>
            {sendingDocument && selectedEntry && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm"><strong>Documento:</strong> {sendingDocument.title}</p>
                  <p className="text-sm"><strong>Paciente:</strong> {getPatientName(selectedEntry.patientId)}</p>
                  <p className="text-sm"><strong>WhatsApp:</strong> {getPatientDetails(selectedEntry.patientId)?.whatsapp}</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Uma notificação será enviada via WhatsApp informando o paciente que o documento está disponível.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSendingDocument(null);
                      setSendMethod(null);
                    }}
                    data-testid="button-cancel-whatsapp"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      if (sendingDocument) {
                        sendWhatsAppMutation.mutate(sendingDocument.id);
                      }
                    }}
                    disabled={sendWhatsAppMutation.isPending}
                    data-testid="button-confirm-whatsapp"
                  >
                    {sendWhatsAppMutation.isPending ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Send via Email Dialog */}
        <Dialog open={sendMethod === "email"} onOpenChange={(open) => {
          if (!open) {
            setSendingDocument(null);
            setSendMethod(null);
            setRecipientEmail("");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Enviar via Email
              </DialogTitle>
              <DialogDescription>
                Informe o endereço de email do destinatário para enviar o documento em PDF.
              </DialogDescription>
            </DialogHeader>
            {sendingDocument && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm"><strong>Documento:</strong> {sendingDocument.title}</p>
                  <p className="text-sm"><strong>Paciente:</strong> {selectedEntry && getPatientName(selectedEntry.patientId)}</p>
                  <p className="text-sm"><strong>Médico:</strong> {sendingDocument.doctorName}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipient-email">Email do Destinatário</Label>
                  <Input
                    id="recipient-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    data-testid="input-recipient-email"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  O documento será enviado em formato PDF como anexo do email.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSendingDocument(null);
                      setSendMethod(null);
                      setRecipientEmail("");
                    }}
                    data-testid="button-cancel-email"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      if (sendingDocument && recipientEmail) {
                        sendEmailMutation.mutate({ 
                          documentId: sendingDocument.id, 
                          email: recipientEmail 
                        });
                      }
                    }}
                    disabled={sendEmailMutation.isPending || !recipientEmail}
                    data-testid="button-confirm-email"
                  >
                    {sendEmailMutation.isPending ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Finish Attendance Dialog */}
        <Dialog open={showFinishDialog} onOpenChange={(open) => {
          setShowFinishDialog(open);
          if (!open) setDischargeType("");
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Finalizar Atendimento</DialogTitle>
              <DialogDescription>
                Paciente: {selectedEntry && getPatientName(selectedEntry.patientId)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="dischargeType">Tipo de Alta *</Label>
                <Select
                  value={dischargeType}
                  onValueChange={setDischargeType}
                >
                  <SelectTrigger data-testid="select-discharge-type">
                    <SelectValue placeholder="Selecione o tipo de alta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="melhorado">Alta Melhorado</SelectItem>
                    <SelectItem value="curado">Alta Curado</SelectItem>
                    <SelectItem value="a_pedido">Alta a Pedido</SelectItem>
                    <SelectItem value="administrativa">Alta Administrativa</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="encaminhamento">Encaminhamento</SelectItem>
                    <SelectItem value="obito">Óbito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4 space-y-3">
                <Button
                  className="w-full justify-start h-auto py-4"
                  variant="outline"
                  onClick={() => {
                    if (!dischargeType) {
                      toast({ title: "Selecione o tipo de alta", variant: "destructive" });
                      return;
                    }
                    handleFinishAttendance();
                  }}
                  disabled={finishMutation.isPending || !dischargeType}
                  data-testid="button-confirm-finish"
                >
                  <CheckCircle className="mr-3 h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">Finalizar Atendimento</p>
                    <p className="text-sm text-gray-500">Encerrar consulta com alta selecionada</p>
                  </div>
                </Button>

                <Button
                  className="w-full justify-start h-auto py-4"
                  variant="outline"
                  onClick={() => {
                    if (selectedEntry && user) {
                      finishMutation.mutate(selectedEntry.id, {
                        onSuccess: () => {
                          const params = new URLSearchParams({
                            patientId: selectedEntry.patientId,
                            doctorId: user.id,
                            doctorName: user.name || '',
                            type: 'internacao'
                          });
                          setLocation(`/internacao?${params.toString()}`);
                        }
                      });
                    }
                  }}
                  disabled={finishMutation.isPending}
                  data-testid="button-finish-and-hospitalize"
                >
                  <Bed className="mr-3 h-5 w-5 text-indigo-600" />
                  <div className="text-left">
                    <p className="font-medium">Enviar para Internação</p>
                    <p className="text-sm text-gray-500">Finalizar e iniciar processo de internação</p>
                  </div>
                </Button>

                <Button
                  className="w-full justify-start h-auto py-4"
                  variant="outline"
                  onClick={async () => {
                    if (selectedEntry) {
                      try {
                        const response = await apiRequest(`/api/queue/${selectedEntry.id}/send-to-observation`, {
                          method: "POST",
                        });
                        toast({
                          title: "Enviado para Observação",
                          description: response.message || "Paciente enviado para observação com sucesso.",
                        });
                        queryClient.invalidateQueries({ queryKey: ["/api/queue/active"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/hospital/beds/available"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/hospital/beds/all"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations"] });
                        setShowFinishDialog(false);
                        setSelectedEntry(null);
                        setLocation("/observacao");
                      } catch (error: any) {
                        toast({
                          title: "Erro",
                          description: error.message || "Não foi possível enviar para observação.",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                  disabled={finishMutation.isPending}
                  data-testid="button-finish-and-observation"
                >
                  <Eye className="mr-3 h-5 w-5 text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium">Enviar para Observação</p>
                    <p className="text-sm text-gray-500">Finalizar e enviar direto para observação</p>
                  </div>
                </Button>

                <Button
                  className="w-full justify-start h-auto py-4 border-red-200 hover:bg-red-50"
                  variant="outline"
                  onClick={async () => {
                    if (selectedEntry) {
                      try {
                        const response = await apiRequest(`/api/queue/${selectedEntry.id}/send-to-red-room`, {
                          method: "POST",
                        });
                        toast({
                          title: "Enviado para Sala Vermelha",
                          description: response.message || "Paciente enviado para Sala Vermelha com sucesso.",
                        });
                        queryClient.invalidateQueries({ queryKey: ["/api/queue/active"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations"] });
                        setShowFinishDialog(false);
                        setSelectedEntry(null);
                        setLocation("/sala-vermelha");
                      } catch (error: any) {
                        toast({
                          title: "Erro",
                          description: error.message || "Não foi possível enviar para Sala Vermelha.",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                  disabled={finishMutation.isPending}
                  data-testid="button-finish-and-red-room"
                >
                  <AlertTriangle className="mr-3 h-5 w-5 text-red-600" />
                  <div className="text-left">
                    <p className="font-medium text-red-700">Enviar para Sala Vermelha</p>
                    <p className="text-sm text-gray-500">Finalizar e enviar para emergência crítica</p>
                  </div>
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowFinishDialog(false);
                  setDischargeType("");
                }}
                data-testid="button-cancel-finish"
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
