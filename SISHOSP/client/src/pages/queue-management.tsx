import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertQueueEntrySchema, type QueueEntry, type Patient, type Triage } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Plus, Clock, AlertTriangle, CheckCircle, XCircle, Calendar, User, ArrowLeft, Activity, UserPlus, Phone, LogOut } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";

type QueueFormData = z.infer<typeof insertQueueEntrySchema>;

export default function QueueManagementPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [cancelEntry, setCancelEntry] = useState<QueueEntry | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);

  // Fetch patients
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch active queue entries
  const { data: queueEntries = [], isLoading: isLoadingQueue } = useQuery<QueueEntry[]>({
    queryKey: ["/api/queue/active"],
    refetchInterval: 10000, // Auto-refresh every 10 seconds to update wait times
  });

  // Fetch ALL queue entries (to count finished ones)
  const { data: allQueueEntries = [] } = useQuery<QueueEntry[]>({
    queryKey: ["/api/queue"],
  });

  // Fetch all triages
  const { data: triages = [] } = useQuery<Triage[]>({
    queryKey: ["/api/triage"],
    refetchInterval: 10000, // Auto-refresh to sync with queue
  });

  // Fetch next queue number
  const { data: nextNumberData } = useQuery<{ queueNumber: string }>({
    queryKey: ["/api/queue/next-number"],
  });

  const form = useForm<QueueFormData>({
    resolver: zodResolver(insertQueueEntrySchema),
    defaultValues: {
      patientId: "",
      status: "aguardando",
      priority: "5",
      observations: "",
      companionName: "",
      companionDocument: "",
      companionRelationship: "",
      companionPhone: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: QueueFormData) => {
      const response = await apiRequest("/api/queue", {
        method: "POST",
        body: data,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Paciente adicionado",
        description: "Paciente adicionado à fila com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/next-number"] });
      setShowForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar paciente",
        description: error.message || "Não foi possível adicionar o paciente à fila.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await apiRequest(`/api/queue/${id}/cancel`, {
        method: "POST",
        body: { reason },
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Entrada cancelada",
        description: "Entrada da fila cancelada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/active"] });
      setCancelEntry(null);
      setCancelReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cancelar",
        description: error.message || "Não foi possível cancelar a entrada.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: QueueFormData) => {
    createMutation.mutate(data);
  };

  const handleCancel = () => {
    if (cancelEntry && cancelReason.trim()) {
      cancelMutation.mutate({
        id: cancelEntry.id,
        reason: cancelReason,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aguardando":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "chamado":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "em_atendimento":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "finalizado":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "cancelado":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
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
      case "finalizado":
        return "Finalizado";
      case "cancelado":
        return "Cancelado";
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

  // Calcula tempo de espera em tempo real (em minutos)
  const getWaitingTime = (arrivalTime: Date | string, calledTime?: Date | string | null) => {
    const arrival = new Date(arrivalTime);
    const end = calledTime ? new Date(calledTime) : new Date();
    const diffMs = end.getTime() - arrival.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins;
  };

  // Formata tempo em texto legível
  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  // Calcula estatísticas incluindo finalizados do dia (backend já filtra por hoje)
  const todayFinished = allQueueEntries.filter((e) => e.status === "finalizado").length;

  const stats = {
    aguardando: queueEntries.filter((e) => e.status === "aguardando").length,
    chamado: queueEntries.filter((e) => e.status === "chamado").length,
    emAtendimento: queueEntries.filter((e) => e.status === "em_atendimento").length,
    finalizado: todayFinished,
    total: queueEntries.length,
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

          <div className="flex items-center gap-4 mb-4">
            <img src={hospitalLogo} alt="Hospital Logo" className="h-16 w-16" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Fila de Atendimento
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Exu Saúde - Sistema de Atendimento Médico
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                Aguardando
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.aguardando}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Na fila agora</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
                </div>
                Chamados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.chamado}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Aguardando médico</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <User className="h-5 w-5 text-green-600 dark:text-green-300" />
                </div>
                Em Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.emAtendimento}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Com médico</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                </div>
                Finalizados Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.finalizado}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Atendimentos concluídos</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </div>
                Total Ativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Na fila agora</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8">
          <Card className="shadow-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Fila Ativa
                  </CardTitle>
                  <CardDescription>
                    Pacientes aguardando atendimento
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowForm(true)}
                  data-testid="button-add-to-queue"
                  className="shadow-md"
                  size="lg"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Paciente
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingQueue ? (
                <div className="text-center py-8 text-gray-500">Carregando fila...</div>
              ) : queueEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum paciente na fila no momento
                </div>
              ) : (
                <div className="space-y-4">
                  {queueEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow"
                      data-testid={`queue-entry-${entry.id}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                              #{entry.queueNumber}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate">
                                {getPatientName(entry.patientId)}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                CPF: {getPatientCPF(entry.patientId)}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge className={getStatusColor(entry.status)}>
                              {getStatusLabel(entry.status)}
                            </Badge>
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
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <span>
                                Chegada: <strong>{format(new Date(entry.arrivalTime), "HH:mm", { locale: ptBR })}</strong>
                              </span>
                            </div>
                            {entry.calledTime && (
                              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                <span>
                                  Chamado: <strong>{format(new Date(entry.calledTime), "HH:mm", { locale: ptBR })}</strong>
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Tempo de espera em tempo real */}
                          {entry.status === "aguardando" && (
                            <div className="mt-3">
                              <Badge variant="outline" className={`text-sm font-semibold
                                ${getWaitingTime(entry.arrivalTime) < 30 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300' : ''}
                                ${getWaitingTime(entry.arrivalTime) >= 30 && getWaitingTime(entry.arrivalTime) < 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300' : ''}
                                ${getWaitingTime(entry.arrivalTime) >= 60 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300' : ''}
                              `}>
                                ⏱️ Aguardando: {formatWaitTime(getWaitingTime(entry.arrivalTime))}
                              </Badge>
                            </div>
                          )}

                          {entry.observations && (
                            <div className="mt-3 bg-white dark:bg-gray-600 rounded-lg p-3 text-sm">
                              <strong className="text-gray-700 dark:text-gray-300">Observações:</strong>
                              <p className="text-gray-900 dark:text-gray-100 mt-1">{entry.observations}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          {entry.status === "aguardando" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setCancelEntry(entry)}
                              data-testid={`button-cancel-${entry.id}`}
                              className="shadow-md"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add to Queue Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Paciente à Fila</DialogTitle>
              <DialogDescription>
                Próximo número da fila: <strong>#{nextNumberData?.queueNumber || "001"}</strong>
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => {
                    const selectedPatient = patients.find(p => p.id === field.value);
                    const filteredPatients = patients.filter(patient => {
                      if (!patientSearch.trim()) return true;
                      const searchTerm = patientSearch.toLowerCase().trim();
                      const patientName = (patient.name || '').toLowerCase();
                      const patientCpf = (patient.cpf || '').replace(/\D/g, '');
                      const searchCpf = searchTerm.replace(/\D/g, '');
                      const nameMatch = patientName.includes(searchTerm);
                      const cpfMatch = searchCpf.length > 0 && patientCpf.includes(searchCpf);
                      return nameMatch || cpfMatch;
                    });
                    
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Paciente *</FormLabel>
                        <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={patientPopoverOpen}
                                className="w-full justify-between font-normal"
                                data-testid="select-patient"
                              >
                                {selectedPatient 
                                  ? `${selectedPatient.name} - CPF: ${selectedPatient.cpf}`
                                  : "Digite nome ou CPF para buscar..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <div className="p-2 border-b">
                              <Input
                                placeholder="Buscar por nome ou CPF..."
                                value={patientSearch}
                                onChange={(e) => setPatientSearch(e.target.value)}
                                data-testid="input-patient-search"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                              {filteredPatients.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  Nenhum paciente encontrado.
                                </div>
                              ) : (
                                filteredPatients.slice(0, 50).map((patient) => (
                                  <div
                                    key={patient.id}
                                    className={`flex items-center px-3 py-2 cursor-pointer hover:bg-accent ${
                                      field.value === patient.id ? "bg-accent" : ""
                                    }`}
                                    onClick={() => {
                                      field.onChange(patient.id);
                                      setPatientPopoverOpen(false);
                                      setPatientSearch("");
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        field.value === patient.id ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {patient.name} - CPF: {patient.cpf}
                                  </div>
                                ))
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Seção de Acompanhante */}
                <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-purple-800 dark:text-purple-300">Acompanhante (opcional)</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="companionName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Nome do Acompanhante</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nome completo"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-companion-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companionDocument"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">CPF ou RG</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Documento de identificação"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-companion-document"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companionRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Grau de Parentesco</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-companion-relationship">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mae">Mãe</SelectItem>
                              <SelectItem value="pai">Pai</SelectItem>
                              <SelectItem value="filho">Filho(a)</SelectItem>
                              <SelectItem value="conjuge">Cônjuge</SelectItem>
                              <SelectItem value="irmao">Irmão(ã)</SelectItem>
                              <SelectItem value="avo">Avô/Avó</SelectItem>
                              <SelectItem value="neto">Neto(a)</SelectItem>
                              <SelectItem value="tio">Tio(a)</SelectItem>
                              <SelectItem value="sobrinho">Sobrinho(a)</SelectItem>
                              <SelectItem value="cuidador">Cuidador(a)</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companionPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Telefone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-companion-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações sobre o paciente ou motivo da consulta..."
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-observations"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    data-testid="button-cancel-form"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-queue"
                  >
                    {createMutation.isPending ? "Adicionando..." : "Adicionar à Fila"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Cancel Dialog */}
        <Dialog open={!!cancelEntry} onOpenChange={() => setCancelEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar Entrada da Fila</DialogTitle>
              <DialogDescription>
                Informe o motivo do cancelamento para o paciente{" "}
                {cancelEntry && getPatientName(cancelEntry.patientId)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="cancelReason">Motivo do Cancelamento *</Label>
                <Select
                  value={cancelReason}
                  onValueChange={setCancelReason}
                >
                  <SelectTrigger className="mt-2" data-testid="select-cancel-reason">
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solicitado pelo paciente">Solicitado pelo paciente</SelectItem>
                    <SelectItem value="Solicitado pelo Médico">Solicitado pelo Médico</SelectItem>
                    <SelectItem value="Paciente não compareceu">Paciente não compareceu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCancelEntry(null);
                  setCancelReason("");
                }}
                data-testid="button-cancel-dialog"
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={!cancelReason || cancelMutation.isPending}
                data-testid="button-confirm-cancel"
              >
                {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
