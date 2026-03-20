import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  MessageSquare, 
  Star, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send,
  Eye,
  BarChart3,
  Filter,
  Plus,
  User,
  ArrowLeft,
  LogOut
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import type { SatisfactionSurvey, Patient, Appointment } from "@/../../shared/schema";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";

interface SurveyAnalytics {
  totalSurveys?: number;
  responseRate?: number;
  averageRating?: number;
  averageNPS?: number;
}

interface SurveyWithPatient extends SatisfactionSurvey {
  patient?: Patient;
}

// Schema para criação de nova pesquisa
const createSurveySchema = z.object({
  patientId: z.string().min(1, "Selecione um paciente"),
  surveyType: z.enum(["pre_consultation", "post_consultation"], {
    required_error: "Selecione o tipo de pesquisa"
  }),
  appointmentId: z.string().optional(),
  notes: z.string().optional()
});

type CreateSurveyForm = z.infer<typeof createSurveySchema>;

export default function SatisfactionSurveysPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyWithPatient | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    surveyType: "all",
    dateRange: "all"
  });

  // Formulário para criação de pesquisa
  const form = useForm<CreateSurveyForm>({
    resolver: zodResolver(createSurveySchema),
    defaultValues: {
      patientId: "",
      surveyType: "pre_consultation",
      appointmentId: "",
      notes: ""
    }
  });

  // Buscar pesquisas de satisfação
  const { data: surveys = [], isLoading } = useQuery<SurveyWithPatient[]>({
    queryKey: ["/api/satisfaction-surveys"],
  });

  // Buscar analytics
  const { data: analytics = {} } = useQuery<SurveyAnalytics>({
    queryKey: ["/api/satisfaction-analytics"],
  });

  // Buscar pacientes para seleção
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Buscar agendamentos do paciente selecionado
  const selectedPatientId = form.watch("patientId");
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", "patient", selectedPatientId],
    enabled: !!selectedPatientId,
  });

  // Mutation para enviar pesquisa via WhatsApp
  const sendWhatsAppMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      return apiRequest(`/api/satisfaction-surveys/${surveyId}/send`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Pesquisa enviada",
        description: "A pesquisa foi enviada via WhatsApp com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/satisfaction-surveys"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a pesquisa via WhatsApp.",
        variant: "destructive",
      });
    },
  });

  // Mutation para criar nova pesquisa
  const createSurveyMutation = useMutation({
    mutationFn: async (data: CreateSurveyForm) => {
      return apiRequest("/api/satisfaction-surveys", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Pesquisa criada",
        description: "A pesquisa foi criada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/satisfaction-surveys"] });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a pesquisa.",
        variant: "destructive",
      });
    },
  });

  // Função para submeter o formulário de criação
  const onSubmitCreateSurvey = (data: CreateSurveyForm) => {
    createSurveyMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      completed: "default",
      expired: "destructive",
    } as const;

    const labels = {
      pending: "Pendente",
      completed: "Concluída",
      expired: "Expirada",
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getSurveyTypeBadge = (type: string) => {
    const labels = {
      pre_consultation: "Pré-consulta",
      post_consultation: "Pós-consulta",
    };

    return (
      <Badge variant="outline">
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  const filteredSurveys = surveys.filter((survey: SurveyWithPatient) => {
    if (filters.status !== "all" && survey.status !== filters.status) return false;
    if (filters.surveyType !== "all" && survey.surveyType !== filters.surveyType) return false;
    return true;
  });

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="p-2 h-auto"
            data-testid="button-back-loading"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={hospitalLogo} alt="Exu Saúde - Sistema de Atendimento Médico" className="h-12 w-auto" />
          <div>
            <h1 className="text-3xl font-bold">Pesquisas de Satisfação</h1>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="p-2 h-auto"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={hospitalLogo} alt="Exu Saúde - Sistema de Atendimento Médico" className="h-12 w-auto" />
          <div>
            <h1 className="text-3xl font-bold">Pesquisas de Satisfação</h1>
            <p className="text-muted-foreground">
              Exu Saúde - Sistema de Atendimento Médico
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700" data-testid="button-create-survey">
              <Plus className="h-4 w-4 mr-2" />
              Nova Pesquisa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Nova Pesquisa de Satisfação</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitCreateSurvey)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paciente</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-patient">
                            <SelectValue placeholder="Selecione um paciente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span>{patient.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  ({patient.cpf})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="surveyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Pesquisa</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-survey-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pre_consultation">
                            Pré-consulta (Avaliação do atendimento)
                          </SelectItem>
                          <SelectItem value="post_consultation">
                            Pós-consulta (Avaliação da consulta médica)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("surveyType") === "post_consultation" && selectedPatientId && (
                  <FormField
                    control={form.control}
                    name="appointmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agendamento (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-appointment">
                              <SelectValue placeholder="Selecione um agendamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {appointments.map((appointment) => (
                              <SelectItem key={appointment.id} value={appointment.id}>
                                <div className="flex flex-col">
                                  <span>{format(new Date(appointment.appointmentDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {appointment.appointmentTime} - {(appointment as any).specialty?.name || 'Consulta'}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Observações adicionais sobre a pesquisa..."
                          className="resize-none"
                          {...field}
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={createSurveyMutation.isPending}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSurveyMutation.isPending}
                    data-testid="button-submit-survey"
                  >
                    {createSurveyMutation.isPending ? "Criando..." : "Criar Pesquisa"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
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

      <Tabs defaultValue="surveys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="surveys" data-testid="tab-surveys">
            <MessageSquare className="h-4 w-4 mr-2" />
            Pesquisas
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="surveys" className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                    <SelectTrigger data-testid="filter-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="expired">Expirada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo</label>
                  <Select value={filters.surveyType} onValueChange={(value) => setFilters({...filters, surveyType: value})}>
                    <SelectTrigger data-testid="filter-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pre_consultation">Pré-consulta</SelectItem>
                      <SelectItem value="post_consultation">Pós-consulta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Pesquisas */}
          <div className="grid gap-4">
            {filteredSurveys.map((survey: SurveyWithPatient) => (
              <Card key={survey.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{survey.patient?.name || "Nome não disponível"}</h3>
                        {getStatusBadge(survey.status)}
                        {getSurveyTypeBadge(survey.surveyType)}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(survey.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        {survey.sentAt && (
                          <span className="flex items-center">
                            <Send className="h-4 w-4 mr-1" />
                            Enviada: {format(survey.sentAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        {survey.completedAt && (
                          <span className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Concluída: {format(survey.completedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>

                      {/* Exibir avaliações se existirem */}
                      {survey.status === "completed" && (
                        <div className="space-y-2">
                          {survey.surveyType === "pre_consultation" && (survey.attendanceRating || survey.generalRating) && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">Avaliação:</span>
                              <div className="flex">
                                {renderStars(parseInt(survey.attendanceRating || survey.generalRating || "0"))}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                ({survey.attendanceRating || survey.generalRating}/5)
                              </span>
                            </div>
                          )}
                          
                          {survey.surveyType === "post_consultation" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              {survey.doctorRating && (
                                <div>
                                  <span className="font-medium">Médico:</span>
                                  <div className="flex items-center space-x-1">
                                    <div className="flex">
                                      {renderStars(parseInt(survey.doctorRating))}
                                    </div>
                                    <span className="text-muted-foreground">({survey.doctorRating}/5)</span>
                                  </div>
                                </div>
                              )}
                              {survey.treatmentRating && (
                                <div>
                                  <span className="font-medium">Tratamento:</span>
                                  <div className="flex items-center space-x-1">
                                    <div className="flex">
                                      {renderStars(parseInt(survey.treatmentRating))}
                                    </div>
                                    <span className="text-muted-foreground">({survey.treatmentRating}/5)</span>
                                  </div>
                                </div>
                              )}
                              {survey.facilitiesRating && (
                                <div>
                                  <span className="font-medium">Instalações:</span>
                                  <div className="flex items-center space-x-1">
                                    <div className="flex">
                                      {renderStars(parseInt(survey.facilitiesRating))}
                                    </div>
                                    <span className="text-muted-foreground">({survey.facilitiesRating}/5)</span>
                                  </div>
                                </div>
                              )}
                              {survey.recommendationScore && (
                                <div className="md:col-span-3">
                                  <span className="font-medium">NPS:</span>
                                  <span className="ml-2 text-muted-foreground">
                                    {survey.recommendationScore}/10 - 
                                    {parseInt(survey.recommendationScore) >= 9 ? " Promotor" : 
                                     parseInt(survey.recommendationScore) >= 7 ? " Neutro" : " Detrator"}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {(survey.generalComments || survey.doctorComments || survey.attendanceComments) && (
                            <div className="text-sm">
                              <span className="font-medium">Comentários:</span>
                              <p className="text-muted-foreground mt-1 italic">
                                "{survey.generalComments || survey.doctorComments || survey.attendanceComments}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2">
                      {survey.status === "pending" && !survey.whatsappMessageSent && (
                        <Button
                          size="sm"
                          onClick={() => sendWhatsAppMutation.mutate(survey.id)}
                          disabled={sendWhatsAppMutation.isPending}
                          data-testid={`button-send-${survey.id}`}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Enviar via WhatsApp
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSurvey(survey)}
                        data-testid={`button-view-${survey.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredSurveys.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma pesquisa encontrada</h3>
                  <p className="text-muted-foreground">
                    Não há pesquisas de satisfação com os filtros selecionados.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total de Pesquisas</p>
                      <p className="text-2xl font-bold" data-testid="total-surveys">{analytics.totalSurveys || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Taxa de Resposta</p>
                      <p className="text-2xl font-bold" data-testid="response-rate">
                        {analytics.responseRate ? `${analytics.responseRate.toFixed(1)}%` : "0%"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Star className="h-8 w-8 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Satisfação Média</p>
                      <p className="text-2xl font-bold" data-testid="average-satisfaction">
                        {analytics.averageRating ? analytics.averageRating.toFixed(1) : "0"}/5
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">NPS Médio</p>
                      <p className="text-2xl font-bold" data-testid="average-nps">
                        {analytics.averageNPS ? analytics.averageNPS.toFixed(1) : "0"}/10
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes da Pesquisa */}
      <Dialog open={!!selectedSurvey} onOpenChange={() => setSelectedSurvey(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Pesquisa</DialogTitle>
          </DialogHeader>
          
          {selectedSurvey && (
            <div className="space-y-4">
              {/* Informações do Paciente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Paciente</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSurvey.patient?.name || "Nome não disponível"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">CPF</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSurvey.patient?.cpf || "CPF não disponível"}
                  </p>
                </div>
              </div>

              {/* Informações da Pesquisa */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tipo</label>
                  <div className="mt-1">
                    {getSurveyTypeBadge(selectedSurvey.surveyType)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedSurvey.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Data de Criação</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSurvey.createdAt 
                      ? format(new Date(selectedSurvey.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : "Data não disponível"
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">WhatsApp Enviado</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSurvey.whatsappMessageSent ? "✅ Sim" : "❌ Não"}
                  </p>
                </div>
              </div>

              {/* Respostas da Pesquisa */}
              {selectedSurvey.status === "completed" && (
                <div>
                  <label className="text-sm font-medium">Respostas</label>
                  <div className="mt-2 space-y-3 p-4 bg-muted/50 rounded-lg">
                    {/* Avaliação Geral */}
                    {(selectedSurvey as any).generalRating && (
                      <div>
                        <p className="text-sm font-medium">Avaliação Geral</p>
                        <div className="flex items-center space-x-1 mt-1">
                          {renderStars(parseInt((selectedSurvey as any).generalRating))}
                          <span className="ml-2 text-sm">({(selectedSurvey as any).generalRating}/5)</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Avaliação de Atendimento (pré-consulta) */}
                    {(selectedSurvey as any).attendanceRating && (
                      <div>
                        <p className="text-sm font-medium">Avaliação do Atendimento</p>
                        <div className="flex items-center space-x-1 mt-1">
                          {renderStars(parseInt((selectedSurvey as any).attendanceRating))}
                          <span className="ml-2 text-sm">({(selectedSurvey as any).attendanceRating}/5)</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Avaliação do Médico (pós-consulta) */}
                    {(selectedSurvey as any).doctorRating && (
                      <div>
                        <p className="text-sm font-medium">Avaliação do Médico</p>
                        <div className="flex items-center space-x-1 mt-1">
                          {renderStars(parseInt((selectedSurvey as any).doctorRating))}
                          <span className="ml-2 text-sm">({(selectedSurvey as any).doctorRating}/5)</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Avaliação do Tratamento */}
                    {(selectedSurvey as any).treatmentRating && (
                      <div>
                        <p className="text-sm font-medium">Avaliação do Tratamento</p>
                        <div className="flex items-center space-x-1 mt-1">
                          {renderStars(parseInt((selectedSurvey as any).treatmentRating))}
                          <span className="ml-2 text-sm">({(selectedSurvey as any).treatmentRating}/5)</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Avaliação das Instalações */}
                    {(selectedSurvey as any).facilitiesRating && (
                      <div>
                        <p className="text-sm font-medium">Avaliação das Instalações</p>
                        <div className="flex items-center space-x-1 mt-1">
                          {renderStars(parseInt((selectedSurvey as any).facilitiesRating))}
                          <span className="ml-2 text-sm">({(selectedSurvey as any).facilitiesRating}/5)</span>
                        </div>
                      </div>
                    )}
                    
                    {/* NPS Score */}
                    {(selectedSurvey as any).recommendationScore && (
                      <div>
                        <p className="text-sm font-medium">NPS Score (Recomendação)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(selectedSurvey as any).recommendationScore}/10 - {
                            parseInt((selectedSurvey as any).recommendationScore) >= 9 ? "Promotor" : 
                            parseInt((selectedSurvey as any).recommendationScore) >= 7 ? "Neutro" : "Detrator"
                          }
                        </p>
                      </div>
                    )}
                    
                    {/* Comentários Gerais */}
                    {(selectedSurvey as any).generalComments && (
                      <div>
                        <p className="text-sm font-medium">Comentários Gerais</p>
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          "{(selectedSurvey as any).generalComments}"
                        </p>
                      </div>
                    )}
                    
                    {/* Comentários de Atendimento */}
                    {(selectedSurvey as any).attendanceComments && (
                      <div>
                        <p className="text-sm font-medium">Comentários do Atendimento</p>
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          "{(selectedSurvey as any).attendanceComments}"
                        </p>
                      </div>
                    )}
                    
                    {/* Comentários do Médico */}
                    {(selectedSurvey as any).doctorComments && (
                      <div>
                        <p className="text-sm font-medium">Comentários sobre o Médico</p>
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          "{(selectedSurvey as any).doctorComments}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mensagem se não há respostas */}
              {selectedSurvey.status !== "completed" && (
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Esta pesquisa ainda não foi respondida pelo paciente.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}