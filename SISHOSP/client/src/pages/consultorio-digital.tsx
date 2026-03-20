import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  insertMedicalHistorySchema,
  insertMedicalDocumentSchema,
  type Patient, 
  type Specialty, 
  type Appointment,
  type SelectPrescriptionTemplate,
  type MedicalHistory,
  type Triage
} from "@shared/schema";
import { SmartDiagnosisInput, SmartMedicationInput } from "@/components/smart-prescription";
import type { CID10 } from "@/../../shared/clinical-support";
import { 
  Stethoscope, 
  User, 
  Clock, 
  AlertCircle, 
  FileText, 
  Save, 
  CheckCircle,
  Activity,
  History,
  FileEdit,
  Loader2,
  Phone,
  Calendar,
  MapPin,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Weight,
  Ruler,
  AlertTriangle,
  Pill,
  ClipboardList,
  Zap,
  X,
  ArrowLeft,
  LogOut
} from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";

type QuickNoteFormData = z.infer<typeof insertMedicalHistorySchema>;

interface AppointmentWithPatient extends Appointment {
  patient?: Patient;
  specialty?: Specialty;
  triage?: Triage;
}

export default function ConsultorioDigital() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeAppointment, setActiveAppointment] = useState<AppointmentWithPatient | null>(null);
  const [activeTab, setActiveTab] = useState("triagem");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRecordIdRef = useRef<string | null>(null);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [documentType, setDocumentType] = useState<"prescription" | "certificate" | "medical_report">("prescription");
  const [selectedCID, setSelectedCID] = useState<CID10 | null>(null);
  const [medicationsList, setMedicationsList] = useState<string[]>([]);
  const [showPatientDocuments, setShowPatientDocuments] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false); // Modo somente leitura para consultas finalizadas
  
  // Timer states for consultation tracking
  const [consultationStartTime, setConsultationStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch appointments for today
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Fetch all patients
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch all specialties
  const { data: specialties = [] } = useQuery<Specialty[]>({
    queryKey: ["/api/specialties"],
  });

  // Fetch prescription templates
  const { data: templates = [] } = useQuery<SelectPrescriptionTemplate[]>({
    queryKey: ["/api/prescription-templates"],
    enabled: user?.role === "doctor",
  });

  // Fetch anamnesis templates for active specialty
  const { data: anamnesisTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/anamnesis-templates", activeAppointment?.specialty?.name],
    queryFn: async () => {
      const specialtyName = activeAppointment?.specialty?.name;
      const url = specialtyName 
        ? `/api/anamnesis-templates?specialtyName=${encodeURIComponent(specialtyName)}`
        : '/api/anamnesis-templates';
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
    enabled: !!activeAppointment?.specialty?.name,
  });

  // Fetch triage data for active patient
  const { data: triageData = [] } = useQuery<Triage[]>({
    queryKey: ["/api/triage/patient", activeAppointment?.patientId],
    enabled: !!activeAppointment?.patientId,
  });

  // Fetch medical history for active patient
  const { data: medicalHistoryData = [] } = useQuery<MedicalHistory[]>({
    queryKey: ["/api/medical-history/patient", activeAppointment?.patientId],
    enabled: !!activeAppointment?.patientId,
  });

  // Fetch medical documents for active patient
  const { data: allDocuments = [] } = useQuery<any[]>({
    queryKey: ["/api/medical-documents"],
  });

  // Get today's appointments and recent completed ones for viewing
  const todayAppointments: AppointmentWithPatient[] = appointments
    .filter(apt => {
      const today = format(new Date(), "yyyy-MM-dd");
      const sevenDaysAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
      
      // Show today's appointments OR completed appointments from last 7 days
      return (
        apt.appointmentDate === today || 
        (apt.status === "completed" && apt.appointmentDate >= sevenDaysAgo)
      );
    })
    .map(apt => ({
      ...apt,
      patient: patients.find(p => p.id === apt.patientId),
      specialty: specialties.find(s => s.id === apt.specialtyId),
    }))
    .sort((a, b) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const aIsToday = a.appointmentDate === today;
      const bIsToday = b.appointmentDate === today;
      
      // Today's appointments first
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;
      
      // Within same day, scheduled before completed
      if (aIsToday && bIsToday) {
        if (a.status === "completed" && b.status !== "completed") return 1;
        if (a.status !== "completed" && b.status === "completed") return -1;
      }
      
      // Sort by date (most recent first) and then by time
      if (a.appointmentDate !== b.appointmentDate) {
        return b.appointmentDate.localeCompare(a.appointmentDate);
      }
      return a.appointmentTime.localeCompare(b.appointmentTime);
    });

  // Get active patient
  const activePatient = activeAppointment?.patient;
  const latestTriage = triageData.length > 0 ? triageData[0] : null;

  // Filter documents for active patient
  const patientDocuments = activePatient 
    ? allDocuments.filter(doc => doc.patientId === activePatient.id)
    : [];

  // Calculate time statistics
  const calculateTimeStats = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const todayRecords = medicalHistoryData.filter(
      record => record.consultationDate === today && record.durationMinutes
    );

    const totalMinutes = todayRecords.reduce((sum, record) => {
      return sum + (parseInt(record.durationMinutes || "0") || 0);
    }, 0);

    const avgMinutes = todayRecords.length > 0 ? Math.floor(totalMinutes / todayRecords.length) : 0;

    // Calculate by specialty if data exists
    const bySpecialty: Record<string, { total: number; count: number; name: string }> = {};
    todayRecords.forEach(record => {
      const specialty = specialties.find(s => s.id === record.specialtyId);
      const specialtyName = specialty?.name || "Não especificado";
      
      if (!bySpecialty[specialtyName]) {
        bySpecialty[specialtyName] = { total: 0, count: 0, name: specialtyName };
      }
      
      bySpecialty[specialtyName].total += parseInt(record.durationMinutes || "0") || 0;
      bySpecialty[specialtyName].count += 1;
    });

    const specialtyStats = Object.values(bySpecialty).map(stat => ({
      name: stat.name,
      avgMinutes: Math.floor(stat.total / stat.count),
      count: stat.count,
    }));

    return {
      totalMinutes,
      consultationCount: todayRecords.length,
      avgMinutes,
      specialtyStats,
    };
  };

  const timeStats = calculateTimeStats();

  // Timer for consultation - starts when appointment is selected
  useEffect(() => {
    if (activeAppointment) {
      // Start timer
      const startTime = new Date();
      setConsultationStartTime(startTime);
      setElapsedSeconds(0);
      
      // Update elapsed time every second
      timerIntervalRef.current = setInterval(() => {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedSeconds(diffInSeconds);
      }, 1000);
    } else {
      // Clear timer when no appointment selected
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setConsultationStartTime(null);
      setElapsedSeconds(0);
    }

    // Cleanup on unmount or appointment change
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeAppointment?.id]);

  // Form for medical record
  const form = useForm<QuickNoteFormData>({
    resolver: zodResolver(insertMedicalHistorySchema),
    defaultValues: {
      patientId: "",
      specialtyId: "",
      appointmentId: "",
      consultationDate: format(new Date(), "yyyy-MM-dd"),
      consultationTime: format(new Date(), "HH:mm"),
      reason: "",
      symptoms: "",
      diagnosis: "",
      treatment: "",
      medications: "",
      observations: "",
      examResults: "",
      nextConsultation: "",
      doctorName: user?.name || "",
    },
  });

  // Form for medical documents
  const documentForm = useForm({
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
      issueDate: format(new Date(), "yyyy-MM-dd"),
      sentViaWhatsApp: false,
      sentViaEmail: false,
      printed: false,
    },
  });

  // Update form when appointment changes
  useEffect(() => {
    if (activeAppointment && activePatient) {
      form.setValue("patientId", activePatient.id);
      form.setValue("specialtyId", activeAppointment.specialtyId);
      form.setValue("appointmentId", activeAppointment.id);
      form.setValue("consultationDate", activeAppointment.appointmentDate);
      form.setValue("consultationTime", activeAppointment.appointmentTime);
      form.setValue("reason", activeAppointment.reason);
      
      // Pre-fill symptoms from triage if available
      if (latestTriage?.mainSymptoms) {
        form.setValue("symptoms", latestTriage.mainSymptoms);
      }
    }
  }, [activeAppointment, activePatient, latestTriage, form]);

  // Auto-save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: QuickNoteFormData) => {
      const recordId = currentRecordIdRef.current;
      
      if (recordId) {
        const res = await apiRequest(`/api/medical-history/${recordId}`, {
          method: "PUT",
          body: data,
        });
        return res;
      } else {
        const res = await apiRequest("/api/medical-history", {
          method: "POST",
          body: data,
        });
        return res;
      }
    },
    onSuccess: (data) => {
      if (!currentRecordIdRef.current && data?.id) {
        setCurrentRecordId(data.id);
        currentRecordIdRef.current = data.id;
      }
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/medical-history"] });
      
      if (!isAutoSaving) {
        toast({
          title: "Salvo com sucesso",
          description: "Prontuário salvo com sucesso.",
        });
      }
    },
    onError: (error: any) => {
      // Only show error toast for manual saves, not auto-saves
      if (!isAutoSaving) {
        toast({
          title: "Erro ao salvar",
          description: error.message || "Não foi possível salvar o prontuário.",
          variant: "destructive",
        });
      }
    },
  });

  // Auto-save handler
  const handleAutoSave = () => {
    const formData = form.getValues();
    const requiredFields = ["patientId", "specialtyId", "consultationDate", "consultationTime", "reason", "doctorName"];
    const allRequiredFilled = requiredFields.every(field => {
      const value = formData[field as keyof QuickNoteFormData];
      return value !== undefined && value !== null && value !== "";
    });

    if (allRequiredFilled) {
      setIsAutoSaving(true);
      
      // Add time tracking data - convert dates to ISO strings for API
      const dataWithTime = {
        ...formData,
        startTime: consultationStartTime?.toISOString(),
        endTime: new Date().toISOString(),
        durationMinutes: Math.floor(elapsedSeconds / 60).toString(),
      } as any;
      
      saveMutation.mutate(dataWithTime);
      setTimeout(() => setIsAutoSaving(false), 500);
    }
  };

  // Watch form changes for auto-save
  useEffect(() => {
    const subscription = form.watch(() => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(handleAutoSave, 10000);
    });

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [form.watch]);

  // Manual save
  const handleManualSave = () => {
    const formData = form.getValues();
    
    // Add time tracking data - convert dates to ISO strings for API
    const dataWithTime = {
      ...formData,
      startTime: consultationStartTime?.toISOString(),
      endTime: new Date().toISOString(),
      durationMinutes: Math.floor(elapsedSeconds / 60).toString(),
    } as any;
    
    setIsSaving(true);
    saveMutation.mutate(dataWithTime);
    setTimeout(() => setIsSaving(false), 500);
  };

  // Start appointment
  const handleStartAppointment = (appointment: AppointmentWithPatient) => {
    setActiveAppointment(appointment);
    setActiveTab("triagem");
    
    // Check if appointment is completed (view-only mode)
    const isCompleted = appointment.status === "completed";
    setIsViewOnly(isCompleted);
    
    setCurrentRecordId(null);
    currentRecordIdRef.current = null;
    form.reset({
      patientId: "",
      specialtyId: "",
      appointmentId: "",
      consultationDate: format(new Date(), "yyyy-MM-dd"),
      consultationTime: format(new Date(), "HH:mm"),
      reason: "",
      symptoms: "",
      diagnosis: "",
      treatment: "",
      medications: "",
      observations: "",
      examResults: "",
      nextConsultation: "",
      doctorName: user?.name || "",
    });
  };

  // Helper functions for timer
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimeAlertColor = (totalSeconds: number): { bg: string; text: string; border: string; label: string } => {
    const minutes = totalSeconds / 60;
    
    if (minutes < 15) {
      return { 
        bg: 'bg-green-50 dark:bg-green-950', 
        text: 'text-green-700 dark:text-green-300', 
        border: 'border-green-200 dark:border-green-800',
        label: 'Rápida'
      };
    } else if (minutes < 30) {
      return { 
        bg: 'bg-yellow-50 dark:bg-yellow-950', 
        text: 'text-yellow-700 dark:text-yellow-300', 
        border: 'border-yellow-200 dark:border-yellow-800',
        label: 'Normal'
      };
    } else {
      return { 
        bg: 'bg-red-50 dark:bg-red-950', 
        text: 'text-red-700 dark:text-red-300', 
        border: 'border-red-200 dark:border-red-800',
        label: 'Longa'
      };
    }
  };

  // Finish appointment
  const handleFinishAppointment = () => {
    setShowFinishDialog(true);
  };

  const confirmFinishAppointment = () => {
    // Update appointment status to completed
    apiRequest(`/api/appointments/${activeAppointment?.id}`, {
      method: "PUT",
      body: {
        ...activeAppointment,
        status: "completed",
      },
    }).then(() => {
      toast({
        title: "Consulta finalizada",
        description: "Consulta finalizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setActiveAppointment(null);
      setShowFinishDialog(false);
      setCurrentRecordId(null);
      currentRecordIdRef.current = null;
    });
  };

  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/medical-documents", {
        method: "POST",
        body: {
          ...data,
          doctorId: user?.id || "",
          doctorName: user?.name || "",
          doctorCrm: user?.crm || "",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Documento criado",
        description: "Documento médico criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-documents"] });
      setShowDocumentDialog(false);
      documentForm.reset();
      setSelectedCID(null);
      setMedicationsList([]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar documento",
        description: error.message || "Não foi possível criar o documento.",
        variant: "destructive",
      });
    },
  });

  // Handle document type selection
  const handleOpenDocumentDialog = (type: "prescription" | "certificate" | "medical_report") => {
    setDocumentType(type);
    setShowDocumentDialog(true);
    
    // Set document title based on type
    let title = "";
    switch (type) {
      case "prescription":
        title = "Receita Médica";
        break;
      case "certificate":
        title = "Atestado Médico";
        break;
      case "medical_report":
        title = "Relatório Médico";
        break;
    }
    
    // Pre-fill with active patient data
    if (activePatient) {
      documentForm.setValue("patientId", activePatient.id);
      documentForm.setValue("title", title);
      documentForm.setValue("documentType", type);
      
      // Pre-fill diagnosis from current form if available
      const currentDiagnosis = form.getValues("diagnosis");
      const currentMedications = form.getValues("medications");
      
      if (currentDiagnosis) {
        documentForm.setValue("diagnosis", currentDiagnosis);
      }
      if (currentMedications) {
        documentForm.setValue("medications", currentMedications);
        setMedicationsList(currentMedications.split("\n").filter(Boolean));
      }
    }
  };

  // Submit document form
  const onSubmitDocument = (data: any) => {
    createDocumentMutation.mutate(data);
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

  // Get severity badge color
  const getSeverityColor = (severity: string) => {
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

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "scheduled":
        return "Aguardando";
      case "completed":
        return "Finalizado";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={hospitalLogo} alt="Hospital Logo" className="h-12 w-12" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Stethoscope className="h-6 w-6 text-blue-600" />
                  Consultório Digital
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Exu Saúde - Sistema de Atendimento Médico
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/')}
                className="gap-2"
                data-testid="button-voltar"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-600 hover:bg-red-50"
                data-testid="logout-button"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
              {lastSaved && (
                <span className="text-sm text-slate-500">
                  Último salvamento: {format(lastSaved, "HH:mm:ss")}
                </span>
              )}
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Dr(a). {user?.name}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-6 h-[calc(100vh-120px)]">
        {/* LEFT PANEL - Fila de Atendimento */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Fila do Dia
                <Badge variant="secondary" className="ml-auto">{todayAppointments.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-240px)]">
                {isLoadingAppointments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : todayAppointments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma consulta agendada para hoje</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayAppointments.map((apt) => {
                      const isActive = activeAppointment?.id === apt.id;
                      const isCompleted = apt.status === "completed";
                      const today = format(new Date(), "yyyy-MM-dd");
                      const isFromToday = apt.appointmentDate === today;
                      
                      return (
                        <button
                          key={apt.id}
                          onClick={() => handleStartAppointment(apt)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            isActive
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                              : isCompleted
                              ? "border-slate-200 bg-slate-100 dark:bg-slate-800 opacity-60 cursor-not-allowed"
                              : "border-slate-200 hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                          }`}
                          data-testid={`appointment-${apt.id}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="font-semibold text-sm">{apt.appointmentTime}</span>
                              {!isFromToday && (
                                <span className="text-xs text-slate-500">
                                  {format(new Date(apt.appointmentDate), "dd/MM", { locale: ptBR })}
                                </span>
                              )}
                            </div>
                            <Badge className={getStatusColor(apt.status || "scheduled")} variant="secondary">
                              {getStatusLabel(apt.status || "scheduled")}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm mb-1">{apt.patient?.name || "Paciente não encontrado"}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{apt.specialty?.name}</p>
                          {!isFromToday && isCompleted && (
                            <p className="text-xs text-slate-500 mt-1 italic">Finalizada anteriormente</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* CENTER PANEL - Working Area */}
        <div className="lg:col-span-6">
          {!activeAppointment ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Stethoscope className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold mb-2 text-slate-700 dark:text-slate-300">
                  Selecione um paciente
                </h3>
                <p className="text-slate-500">
                  Escolha uma consulta da fila ao lado para iniciar o atendimento
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {isViewOnly ? "Visualizando Atendimento" : "Atendimento em Andamento"}
                    {isViewOnly && (
                      <Badge variant="secondary" className="ml-2">
                        Somente Leitura
                      </Badge>
                    )}
                  </CardTitle>
                  {!isViewOnly && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManualSave}
                        disabled={isSaving}
                        data-testid="button-save-prontuario"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleFinishAppointment}
                        data-testid="button-finish-appointment"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Finalizar Consulta
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="triagem" data-testid="tab-triagem">
                      <Activity className="h-4 w-4 mr-1" />
                      Triagem
                    </TabsTrigger>
                    <TabsTrigger value="prontuario" data-testid="tab-prontuario">
                      <FileEdit className="h-4 w-4 mr-1" />
                      Prontuário
                    </TabsTrigger>
                    <TabsTrigger value="historico" data-testid="tab-historico">
                      <History className="h-4 w-4 mr-1" />
                      Histórico
                    </TabsTrigger>
                    <TabsTrigger value="documentos" data-testid="tab-documentos">
                      <FileText className="h-4 w-4 mr-1" />
                      Documentos
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-hidden mt-4">
                    {/* TRIAGEM TAB */}
                    <TabsContent value="triagem" className="h-full m-0">
                      <ScrollArea className="h-full pr-4">
                        {latestTriage ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                              <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Triagem realizada em</p>
                                <p className="font-semibold">
                                  {format(new Date(latestTriage.triageDate), "dd/MM/yyyy", { locale: ptBR })} às {latestTriage.triageTime}
                                </p>
                              </div>
                              <Badge className={getSeverityColor(latestTriage.severity)} variant="outline">
                                {latestTriage.severity.toUpperCase()}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              {latestTriage.temperature && (
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Thermometer className="h-4 w-4 text-red-500" />
                                    <span className="text-xs text-slate-600 dark:text-slate-400">Temperatura</span>
                                  </div>
                                  <p className="font-semibold">{latestTriage.temperature}°C</p>
                                </div>
                              )}
                              {latestTriage.bloodPressure && (
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Heart className="h-4 w-4 text-red-500" />
                                    <span className="text-xs text-slate-600 dark:text-slate-400">Pressão Arterial</span>
                                  </div>
                                  <p className="font-semibold">{latestTriage.bloodPressure} mmHg</p>
                                </div>
                              )}
                              {latestTriage.heartRate && (
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Activity className="h-4 w-4 text-blue-500" />
                                    <span className="text-xs text-slate-600 dark:text-slate-400">Freq. Cardíaca</span>
                                  </div>
                                  <p className="font-semibold">{latestTriage.heartRate} bpm</p>
                                </div>
                              )}
                              {latestTriage.respiratoryRate && (
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Wind className="h-4 w-4 text-cyan-500" />
                                    <span className="text-xs text-slate-600 dark:text-slate-400">Freq. Respiratória</span>
                                  </div>
                                  <p className="font-semibold">{latestTriage.respiratoryRate} rpm</p>
                                </div>
                              )}
                              {latestTriage.oxygenSaturation && (
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Droplets className="h-4 w-4 text-blue-500" />
                                    <span className="text-xs text-slate-600 dark:text-slate-400">Saturação O2</span>
                                  </div>
                                  <p className="font-semibold">{latestTriage.oxygenSaturation}%</p>
                                </div>
                              )}
                              {latestTriage.weight && (
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Weight className="h-4 w-4 text-purple-500" />
                                    <span className="text-xs text-slate-600 dark:text-slate-400">Peso</span>
                                  </div>
                                  <p className="font-semibold">{latestTriage.weight} kg</p>
                                </div>
                              )}
                              {latestTriage.height && (
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Ruler className="h-4 w-4 text-purple-500" />
                                    <span className="text-xs text-slate-600 dark:text-slate-400">Altura</span>
                                  </div>
                                  <p className="font-semibold">{latestTriage.height} cm</p>
                                </div>
                              )}
                            </div>

                            <Separator />

                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                  <ClipboardList className="h-4 w-4" />
                                  Sintomas Principais
                                </label>
                                <p className="mt-1 text-sm bg-white dark:bg-slate-800 p-3 rounded-lg border">
                                  {latestTriage.mainSymptoms}
                                </p>
                              </div>

                              {latestTriage.allergies && (
                                <div>
                                  <label className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Alergias
                                  </label>
                                  <p className="mt-1 text-sm bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
                                    {latestTriage.allergies}
                                  </p>
                                </div>
                              )}

                              {latestTriage.currentMedications && (
                                <div>
                                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Pill className="h-4 w-4" />
                                    Medicações em Uso
                                  </label>
                                  <p className="mt-1 text-sm bg-white dark:bg-slate-800 p-3 rounded-lg border">
                                    {latestTriage.currentMedications}
                                  </p>
                                </div>
                              )}

                              {latestTriage.preExistingConditions && (
                                <div>
                                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Condições Pré-existentes
                                  </label>
                                  <p className="mt-1 text-sm bg-white dark:bg-slate-800 p-3 rounded-lg border">
                                    {latestTriage.preExistingConditions}
                                  </p>
                                </div>
                              )}

                              {latestTriage.observations && (
                                <div>
                                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Observações
                                  </label>
                                  <p className="mt-1 text-sm bg-white dark:bg-slate-800 p-3 rounded-lg border">
                                    {latestTriage.observations}
                                  </p>
                                </div>
                              )}

                              {latestTriage.recommendedAction && (
                                <div>
                                  <label className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                    Ação Recomendada
                                  </label>
                                  <p className="mt-1 text-sm bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                    {latestTriage.recommendedAction}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Activity className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p className="text-slate-500">Nenhuma triagem registrada para este paciente</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    {/* PRONTUARIO TAB */}
                    <TabsContent value="prontuario" className="h-full m-0">
                      <ScrollArea className="h-full pr-4">
                        {/* Anamnesis Template Selector */}
                        {anamnesisTemplates.length > 0 && !isViewOnly && (
                          <Card className="mb-4 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center gap-2 text-teal-700 dark:text-teal-300">
                                <ClipboardList className="h-4 w-4" />
                                Templates de Anamnese
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Select 
                                onValueChange={(templateId) => {
                                  const template = anamnesisTemplates.find(t => t.id === templateId);
                                  if (template) {
                                    // Apply template to form
                                    template.sections.forEach((section: any) => {
                                      section.fields.forEach((field: any) => {
                                        if (field.id === 'symptoms' || field.id === 'diagnosis' || 
                                            field.id === 'treatment' || field.id === 'medications' || 
                                            field.id === 'observations' || field.id === 'examResults') {
                                          form.setValue(field.id, field.placeholder || '');
                                        }
                                      });
                                    });
                                    toast({
                                      title: "Template aplicado",
                                      description: `Template "${template.name}" foi aplicado ao formulário`,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-full bg-white dark:bg-slate-800" data-testid="select-anamnesis-template">
                                  <SelectValue placeholder="Selecione um template de anamnese..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {anamnesisTemplates.map((template) => (
                                    <SelectItem key={template.id} value={template.id} data-testid={`template-option-${template.id}`}>
                                      <div className="flex items-center gap-2">
                                        {template.isDefault && <Badge variant="outline" className="text-xs">Padrão</Badge>}
                                        <span>{template.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {anamnesisTemplates.length > 0 && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                  {anamnesisTemplates.length} template{anamnesisTemplates.length > 1 ? 's' : ''} disponível{anamnesisTemplates.length > 1 ? 'eis' : ''} para {activeAppointment?.specialty?.name}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* Timer Display */}
                        {consultationStartTime && (
                          <Card className={`mb-4 border-2 ${getTimeAlertColor(elapsedSeconds).border} ${getTimeAlertColor(elapsedSeconds).bg}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Clock className={`h-6 w-6 ${getTimeAlertColor(elapsedSeconds).text}`} />
                                  <div>
                                    <p className={`text-2xl font-bold font-mono ${getTimeAlertColor(elapsedSeconds).text}`}>
                                      {formatTime(elapsedSeconds)}
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                      Tempo de consulta
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant={
                                    elapsedSeconds / 60 < 15 ? "default" :
                                    elapsedSeconds / 60 < 30 ? "secondary" : "destructive"
                                  } className="text-sm">
                                    {getTimeAlertColor(elapsedSeconds).label}
                                  </Badge>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {Math.floor(elapsedSeconds / 60)} minutos
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <Form {...form}>
                          <form className="space-y-4">
                            <FormField
                              control={form.control}
                              name="reason"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Motivo da Consulta *</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Ex: Consulta de rotina" data-testid="input-reason" disabled={isViewOnly} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="symptoms"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Sintomas</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} value={field.value ?? ''} rows={3} placeholder="Descreva os sintomas apresentados" data-testid="textarea-symptoms" disabled={isViewOnly} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="diagnosis"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Diagnóstico</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} value={field.value ?? ''} rows={3} placeholder="Diagnóstico médico" data-testid="textarea-diagnosis" disabled={isViewOnly} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="treatment"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tratamento</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} value={field.value ?? ''} rows={3} placeholder="Tratamento prescrito" data-testid="textarea-treatment" disabled={isViewOnly} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="medications"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Medicamentos</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} value={field.value ?? ''} rows={4} placeholder="Liste os medicamentos prescritos" data-testid="textarea-medications" disabled={isViewOnly} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {templates.length > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Templates:</span>
                                {templates.map((template) => (
                                  <Button
                                    key={template.id}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (template.diagnosis) form.setValue("diagnosis", template.diagnosis);
                                      if (template.treatment) form.setValue("treatment", template.treatment);
                                      if (template.medications) form.setValue("medications", template.medications);
                                      if (template.observations) form.setValue("observations", template.observations);
                                    }}
                                    data-testid={`button-template-${template.id}`}
                                  >
                                    <Zap className="h-3 w-3 mr-1" />
                                    {template.templateName}
                                  </Button>
                                ))}
                              </div>
                            )}

                            <FormField
                              control={form.control}
                              name="observations"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Observações</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} value={field.value ?? ''} rows={3} placeholder="Observações gerais" data-testid="textarea-observations" disabled={isViewOnly} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="examResults"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Resultados de Exames</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} value={field.value ?? ''} rows={3} placeholder="Resultados de exames realizados" data-testid="textarea-exam-results" disabled={isViewOnly} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="nextConsultation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Próxima Consulta</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value ?? ''} placeholder="Ex: Retorno em 30 dias" data-testid="input-next-consultation" disabled={isViewOnly} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </form>
                        </Form>
                      </ScrollArea>
                    </TabsContent>

                    {/* HISTORICO TAB */}
                    <TabsContent value="historico" className="h-full m-0">
                      <ScrollArea className="h-full pr-4">
                        {medicalHistoryData.length > 0 ? (
                          <div className="space-y-3">
                            {medicalHistoryData.map((record) => (
                              <Card key={record.id} className="border-l-4 border-l-blue-500">
                                <CardHeader className="pb-2">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold">
                                          {format(new Date(record.consultationDate), "dd/MM/yyyy", { locale: ptBR })} às {record.consultationTime}
                                        </p>
                                        {record.attendanceLocation === "sala_vermelha" && (
                                          <Badge className="bg-red-600 hover:bg-red-700 text-white text-xs">
                                            Sala Vermelha
                                          </Badge>
                                        )}
                                        {record.attendanceLocation === "observacao" && (
                                          <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                                            Observação
                                          </Badge>
                                        )}
                                        {(record.attendanceLocation === "ativo" || record.attendanceLocation === "internacao") && (
                                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                                            Internação
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Dr(a). {record.doctorName}
                                      </p>
                                    </div>
                                    {/* Time Duration Badge */}
                                    {record.durationMinutes && (
                                      <div className="text-right">
                                        <Badge 
                                          variant={
                                            parseInt(record.durationMinutes) < 15 ? "default" :
                                            parseInt(record.durationMinutes) < 30 ? "secondary" : "destructive"
                                          }
                                          className="flex items-center gap-1"
                                        >
                                          <Clock className="h-3 w-3" />
                                          {record.durationMinutes} min
                                        </Badge>
                                        <p className="text-xs text-slate-500 mt-1">
                                          {getTimeAlertColor(parseInt(record.durationMinutes) * 60).label}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                  <div>
                                    <span className="font-semibold">Motivo:</span> {record.reason}
                                  </div>
                                  {record.diagnosis && (
                                    <div>
                                      <span className="font-semibold">Diagnóstico:</span> {record.diagnosis}
                                    </div>
                                  )}
                                  {record.treatment && (
                                    <div>
                                      <span className="font-semibold">Tratamento:</span> {record.treatment}
                                    </div>
                                  )}
                                  {record.medications && (
                                    <div>
                                      <span className="font-semibold">Medicamentos:</span> {record.medications}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <History className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p className="text-slate-500">Nenhum histórico médico para este paciente</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    {/* DOCUMENTOS TAB */}
                    <TabsContent value="documentos" className="h-full m-0">
                      <ScrollArea className="h-full pr-4">
                        <div className="space-y-3">
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Gere documentos médicos para este paciente:
                          </p>
                          <Button
                            variant="outline"
                            className="w-full justify-start h-auto p-4"
                            onClick={() => handleOpenDocumentDialog("prescription")}
                            data-testid="button-create-receita"
                            disabled={isViewOnly}
                          >
                            <div className="flex items-start gap-3">
                              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                              <div className="text-left">
                                <p className="font-semibold">Receita Médica</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  Prescrição de medicamentos
                                </p>
                              </div>
                            </div>
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full justify-start h-auto p-4"
                            onClick={() => handleOpenDocumentDialog("certificate")}
                            data-testid="button-create-atestado"
                            disabled={isViewOnly}
                          >
                            <div className="flex items-start gap-3">
                              <FileText className="h-5 w-5 text-green-600 mt-0.5" />
                              <div className="text-left">
                                <p className="font-semibold">Atestado Médico</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  Declaração de comparecimento ou afastamento
                                </p>
                              </div>
                            </div>
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full justify-start h-auto p-4"
                            onClick={() => handleOpenDocumentDialog("medical_report")}
                            data-testid="button-create-laudo"
                            disabled={isViewOnly}
                          >
                            <div className="flex items-start gap-3">
                              <FileText className="h-5 w-5 text-purple-600 mt-0.5" />
                              <div className="text-left">
                                <p className="font-semibold">Laudo Médico</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  Relatório técnico especializado
                                </p>
                              </div>
                            </div>
                          </Button>

                          {/* Time Statistics Card */}
                          <div className="mt-6">
                            <Separator className="mb-4" />
                            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              Estatísticas de Tempo (Hoje)
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-3">
                              {/* Overall Stats */}
                              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                                <CardContent className="p-4">
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium">Consultas realizadas</span>
                                      <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                        {timeStats.consultationCount}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium">Tempo total</span>
                                      <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                        {Math.floor(timeStats.totalMinutes / 60)}h {timeStats.totalMinutes % 60}min
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium">Tempo médio</span>
                                      <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                        {timeStats.avgMinutes} min
                                      </span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Specialty Breakdown */}
                              {timeStats.specialtyStats.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-semibold">
                                    Por Especialidade:
                                  </p>
                                  <div className="space-y-2">
                                    {timeStats.specialtyStats.map((stat, index) => (
                                      <div
                                        key={index}
                                        className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm"
                                      >
                                        <span className="font-medium">{stat.name}</span>
                                        <div className="text-right">
                                          <span className="font-bold text-slate-700 dark:text-slate-300">
                                            {stat.avgMinutes} min
                                          </span>
                                          <span className="text-xs text-slate-500 ml-2">
                                            ({stat.count} consulta{stat.count > 1 ? 's' : ''})
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {timeStats.consultationCount === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">
                                  Nenhuma consulta finalizada hoje ainda
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT PANEL - Patient Info */}
        <div className="lg:col-span-3">
          {!activePatient ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-8">
                <User className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-500">Informações do paciente aparecerão aqui</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados do Paciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-240px)]">
                  <div className="space-y-4">
                    {/* Patient Basic Info */}
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg">{activePatient.name}</h3>
                      <div className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
                        <p><span className="font-semibold">CPF:</span> {activePatient.cpf}</p>
                        <p><span className="font-semibold">SUS:</span> {activePatient.susCard}</p>
                        <p><span className="font-semibold">Sexo:</span> {activePatient.gender === "masculino" ? "Masculino" : "Feminino"}</p>
                        <p><span className="font-semibold">Nascimento:</span> {format(new Date(activePatient.birthDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Contact */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Contato
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{activePatient.whatsapp}</p>
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Endereço
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {activePatient.address}, {activePatient.addressNumber}
                        <br />
                        {activePatient.neighborhood} - {activePatient.city}/{activePatient.state}
                        <br />
                        Zona: {activePatient.zoneType === "urbana" ? "Urbana" : "Rural"}
                      </p>
                    </div>

                    <Separator />

                    {/* Allergies Alert */}
                    {latestTriage?.allergies && (
                      <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-red-800 dark:text-red-200">⚠️ ALERGIAS</p>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{latestTriage.allergies}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Current Medications */}
                    {latestTriage?.currentMedications && (
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                          <Pill className="h-4 w-4" />
                          Medicações em Uso
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                          {latestTriage.currentMedications}
                        </p>
                      </div>
                    )}

                    {/* Pre-existing Conditions */}
                    {latestTriage?.preExistingConditions && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Condições Pré-existentes</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                          {latestTriage.preExistingConditions}
                        </p>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Ações Rápidas</h4>
                      <div className="space-y-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setActiveTab("prontuario")}
                          data-testid="button-quick-prontuario"
                        >
                          <FileEdit className="h-4 w-4 mr-2" />
                          Ir para Prontuário
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setActiveTab("documentos")}
                          data-testid="button-quick-documentos"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Gerar Documento
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setActiveTab("historico")}
                          data-testid="button-quick-historico"
                        >
                          <History className="h-4 w-4 mr-2" />
                          Ver Histórico
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setShowPatientDocuments(true)}
                          disabled={!activePatient}
                          data-testid="button-quick-view-documents"
                        >
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Ver Documentos ({patientDocuments.length})
                        </Button>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Finish Appointment Dialog */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Consulta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja finalizar esta consulta? O prontuário será salvo automaticamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinishDialog(false)} data-testid="button-cancel-finish">
              Cancelar
            </Button>
            <Button onClick={confirmFinishAppointment} data-testid="button-confirm-finish">
              <CheckCircle className="h-4 w-4 mr-1" />
              Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Creation Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {documentType === "prescription" && "Criar Receita Médica"}
              {documentType === "certificate" && "Criar Atestado Médico"}
              {documentType === "medical_report" && "Criar Relatório Médico"}
            </DialogTitle>
            <DialogDescription>
              {activePatient ? `Paciente: ${activePatient.name}` : "Selecione um paciente"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...documentForm}>
            <form onSubmit={documentForm.handleSubmit(onSubmitDocument)} className="space-y-4 py-4">
              {/* Diagnosis with Smart CID-10 Search */}
              <FormField
                control={documentForm.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">
                      Diagnóstico {documentType === "prescription" && "(com busca CID-10)"}
                    </FormLabel>
                    <FormControl>
                      <SmartDiagnosisInput
                        value={field.value || ""}
                        onChange={(value, cid) => {
                          field.onChange(value);
                          if (cid) {
                            setSelectedCID(cid);
                            if (documentType === "certificate") {
                              documentForm.setValue("cid", cid.code);
                            }
                          }
                        }}
                        onCIDSelected={(cid) => setSelectedCID(cid)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Medications with Smart Input (only for prescriptions) */}
              {documentType === "prescription" && (
                <FormField
                  control={documentForm.control}
                  name="medications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Medicamentos (com verificação de interações)</FormLabel>
                      <FormControl>
                        <SmartMedicationInput
                          medications={medicationsList}
                          onMedicationsChange={(meds) => {
                            setMedicationsList(meds);
                            field.onChange(meds.join("\n"));
                          }}
                          selectedCID={selectedCID}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Certificate-specific fields */}
              {documentType === "certificate" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={documentForm.control}
                    name="daysOff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dias de Afastamento</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Ex: 3 dias" data-testid="input-days-off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={documentForm.control}
                    name="cid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código CID</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Ex: J00" data-testid="input-cid" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Content field */}
              <FormField
                control={documentForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo do Documento</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Escreva o conteúdo completo do documento..."
                        rows={8}
                        className="font-mono"
                        data-testid="input-document-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Observations */}
              <FormField
                control={documentForm.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Adicionais</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Observações gerais..."
                        rows={3}
                        data-testid="input-document-observations"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDocumentDialog(false);
                    documentForm.reset();
                    setSelectedCID(null);
                    setMedicationsList([]);
                  }}
                  data-testid="button-cancel-document"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createDocumentMutation.isPending}
                  data-testid="button-save-document"
                >
                  {createDocumentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Criar Documento
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Patient Documents List Dialog */}
      <Dialog open={showPatientDocuments} onOpenChange={setShowPatientDocuments}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Documentos Médicos
            </DialogTitle>
            <DialogDescription>
              {activePatient && `Documentos do paciente: ${activePatient.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {patientDocuments.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600 dark:text-slate-400">
                  Nenhum documento encontrado para este paciente.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {patientDocuments.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className={`h-5 w-5 ${
                              doc.type === "prescription" ? "text-blue-600" :
                              doc.type === "certificate" ? "text-green-600" :
                              "text-purple-600"
                            }`} />
                            <h4 className="font-semibold">
                              {doc.type === "prescription" && "Receita Médica"}
                              {doc.type === "certificate" && "Atestado Médico"}
                              {doc.type === "medical_report" && "Relatório Médico"}
                            </h4>
                            <Badge variant={doc.status === "draft" ? "secondary" : "default"}>
                              {doc.status === "draft" ? "Rascunho" : "Finalizado"}
                            </Badge>
                          </div>
                          
                          {doc.diagnosis && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              <span className="font-medium">Diagnóstico:</span> {doc.diagnosis}
                            </p>
                          )}

                          {doc.type === "certificate" && doc.daysOff && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              <span className="font-medium">Afastamento:</span> {doc.daysOff}
                            </p>
                          )}

                          <p className="text-xs text-slate-500">
                            Criado em {format(new Date(doc.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              window.open(`/api/medical-documents/${doc.id}/pdf`, "_blank");
                            }}
                            data-testid={`button-view-pdf-${doc.id}`}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Ver PDF
                          </Button>
                        </div>
                      </div>

                      {doc.content && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                            {doc.content}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              onClick={() => setShowPatientDocuments(false)}
              data-testid="button-close-documents-list"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
