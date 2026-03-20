import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  FileText, Search, Plus, Calendar, Clock, User, Stethoscope, Pill, ClipboardList, 
  Eye, Activity, TrendingUp, Users, ChevronDown, ChevronUp, Download, Filter, X,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ArrowLeft, LogOut, Image, TestTube, ImageIcon
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertMedicalHistorySchema, type MedicalHistoryWithDetails, type Patient, type Specialty, EXAM_REQUEST_STATUS } from "@shared/schema";
import { useLocation } from "wouter";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";
import exuBemCuidadaLogo from "@assets/logo exubemcuidada_1762210247656.png";
import secretariaSaudeLogo from "@assets/logo secretaria de saude_1762210247656.png";
import ministerioSaudeLogo from "@assets/Ministério_da_Saúde_1762210247657.png";
import susLogo from "@assets/sus-logo_1762210247657.png";

type SortField = 'consultationDate' | 'patientName' | 'specialtyName' | 'doctorName';
type SortDirection = 'asc' | 'desc';

export default function MedicalHistory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedRecord, setSelectedRecord] = useState<MedicalHistoryWithDetails | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  
  // Advanced filters
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("__ALL__");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("__ALL__");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('consultationDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch statistics
  const { data: stats } = useQuery<{
    total: number;
    today: number;
    week: number;
    month: number;
    bySpecialty: Array<{ name: string; count: number }>;
    byDoctor: Array<{ name: string; count: number }>;
  }>({
    queryKey: ["/api/medical-history/stats"],
  });

  // Fetch all medical history records
  const { data: medicalRecords = [], isLoading } = useQuery<MedicalHistoryWithDetails[]>({
    queryKey: ["/api/medical-history"],
  });

  // Fetch patients and specialties for dropdowns
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: specialties = [] } = useQuery<Specialty[]>({
    queryKey: ["/api/specialties"],
  });

  // Fetch attendance metrics
  const [metricsPeriod, setMetricsPeriod] = useState<string>("today");
  const { data: attendanceMetrics } = useQuery<{
    totalConsultations: number;
    avgDuration: number | null;
    byDoctor: Array<{
      doctorName: string;
      count: number;
      avgDuration: number | null;
      totalTime: number;
    }>;
    bySpecialty: Array<{
      specialtyName: string;
      count: number;
      avgDuration: number | null;
      totalTime: number;
    }>;
  }>({
    queryKey: [`/api/medical-history/metrics/attendance?period=${metricsPeriod}`],
  });

  // Fetch all medical documents (lab results, radiology images, etc.)
  const { data: allMedicalDocuments = [], isLoading: isLoadingDocuments } = useQuery<any[]>({
    queryKey: ["/api/medical-documents"],
  });

  // Filter documents by type
  const labResults = allMedicalDocuments.filter(doc => doc.documentType === "lab_results");
  const radiologyImages = allMedicalDocuments.filter(doc => doc.documentType === "radiology_images");
  
  // State for documents filter
  const [documentsFilter, setDocumentsFilter] = useState<string>("all");
  const [documentsPatientFilter, setDocumentsPatientFilter] = useState<string>("");
  
  // Helper function to filter documents by patient name or CPF
  const matchesPatientFilter = (doc: any) => {
    const searchTerm = documentsPatientFilter.toLowerCase().trim();
    if (!searchTerm) return true;
    
    const patient = patients.find(p => p.id === doc.patientId);
    if (!patient) return false;
    
    const patientName = (patient.name || '').toLowerCase();
    const patientCpf = (patient.cpf || '').replace(/\D/g, '');
    const searchCpf = searchTerm.replace(/\D/g, '');
    
    return patientName.includes(searchTerm) || (searchCpf && patientCpf.includes(searchCpf));
  };

  // Create medical record form
  const createForm = useForm<z.infer<typeof insertMedicalHistorySchema>>({
    resolver: zodResolver(insertMedicalHistorySchema),
    defaultValues: {
      patientId: "",
      specialtyId: "",
      consultationDate: "",
      consultationTime: "",
      reason: "",
      symptoms: "",
      diagnosis: "",
      treatment: "",
      medications: "",
      observations: "",
      examResults: "",
      nextConsultation: "",
      doctorName: "",
    },
  });

  // Create medical record mutation
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertMedicalHistorySchema>) => {
      const res = await apiRequest("/api/medical-history", { method: "POST", body: data });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-history/stats"] });
      createForm.reset();
      toast({
        title: "Registro criado",
        description: "Registro médico criado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao criar registro",
        description: "Erro ao criar registro médico.",
        variant: "destructive",
      });
    },
  });

  const onCreate = (data: z.infer<typeof insertMedicalHistorySchema>) => {
    createMutation.mutate(data);
  };

  const handleViewRecord = (record: MedicalHistoryWithDetails) => {
    setSelectedRecord(record);
    setIsViewDialogOpen(true);
  };

  const handleBackToDashboard = () => {
    setLocation("/");
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

  const formatDate = (dateString: string) => {
    try {
      // Adicionar T12:00:00 para evitar problemas de timezone
      const dateStr = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    return timeString.length === 5 ? timeString : `${timeString}:00`;
  };

  // Get unique doctors list
  const doctorsList = useMemo(() => {
    const doctors = new Set<string>();
    medicalRecords.forEach(r => {
      if (r.doctorName) doctors.add(r.doctorName);
    });
    return Array.from(doctors).sort();
  }, [medicalRecords]);

  // Filter and sort records
  const filteredAndSortedRecords = useMemo(() => {
    let filtered = medicalRecords.filter((record) => {
      // Text search filter
      if (filterQuery.trim()) {
        const query = filterQuery.toLowerCase().trim();
        const patientName = record.patient?.name?.toLowerCase() || "";
        const patientCpf = record.patient?.cpf?.replace(/\D/g, "") || "";
        const patientSus = record.patient?.susCard?.replace(/\D/g, "") || "";
        const searchQuery = query.replace(/\D/g, "");
        
        const matchesSearch = (
          patientName.includes(query) ||
          patientCpf.includes(searchQuery) ||
          patientSus.includes(searchQuery)
        );
        
        if (!matchesSearch) return false;
      }
      
      // Specialty filter
      if (selectedSpecialty && selectedSpecialty !== "__ALL__" && record.specialtyId !== selectedSpecialty) {
        return false;
      }
      
      // Doctor filter
      if (selectedDoctor && selectedDoctor !== "__ALL__" && record.doctorName !== selectedDoctor) {
        return false;
      }
      
      // Date range filter
      if (startDate || endDate) {
        const consultDate = new Date(record.consultationDate);
        if (startDate && consultDate < new Date(startDate)) return false;
        if (endDate && consultDate > new Date(endDate)) return false;
      }
      
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'consultationDate':
          aValue = new Date(a.consultationDate).getTime();
          bValue = new Date(b.consultationDate).getTime();
          break;
        case 'patientName':
          aValue = a.patient?.name || '';
          bValue = b.patient?.name || '';
          break;
        case 'specialtyName':
          aValue = a.specialty?.name || '';
          bValue = b.specialty?.name || '';
          break;
        case 'doctorName':
          aValue = a.doctorName || '';
          bValue = b.doctorName || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [medicalRecords, filterQuery, selectedSpecialty, selectedDoctor, startDate, endDate, sortField, sortDirection]);

  // Group records by patient
  const recordsByPatient = useMemo(() => {
    const grouped = new Map<string, MedicalHistoryWithDetails[]>();
    filteredAndSortedRecords.forEach(record => {
      const patientId = record.patientId;
      if (!grouped.has(patientId)) {
        grouped.set(patientId, []);
      }
      grouped.get(patientId)!.push(record);
    });
    return Array.from(grouped.entries()).map(([patientId, records]) => ({
      patient: records[0].patient!,
      records: records.sort((a, b) => 
        new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime()
      ),
    }));
  }, [filteredAndSortedRecords]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRecords.length / itemsPerPage);
  const paginatedRecords = filteredAndSortedRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-30" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const clearFilters = () => {
    setFilterQuery("");
    setSelectedSpecialty("__ALL__");
    setSelectedDoctor("__ALL__");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    filterQuery,
    selectedSpecialty !== "__ALL__" ? selectedSpecialty : "",
    selectedDoctor !== "__ALL__" ? selectedDoctor : "",
    startDate,
    endDate
  ].filter(Boolean).length;

  const handleExportPDF = async (patientId: string) => {
    try {
      const response = await apiRequest(`/api/medical-history/patient/${patientId}/export-pdf`, {
        method: "GET",
      });
      
      if (!response.ok) throw new Error("Erro ao gerar PDF");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historico_medico_${patientId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "PDF gerado",
        description: "Histórico médico exportado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar PDF",
        description: "Não foi possível gerar o PDF do histórico médico.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando registros médicos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Histórico Médico</h1>
              <p className="text-gray-600">Exu Saúde - Sistema de Atendimento Médico</p>
            </div>
            <div className="flex items-center gap-6">
              <img 
                src={hospitalLogo} 
                alt="Exu Saúde - Sistema de Atendimento Médico" 
                className="h-16 w-auto"
              />
              <img 
                src={exuBemCuidadaLogo} 
                alt="Exu Bem Cuidada" 
                className="h-14 w-auto"
              />
              <img 
                src={secretariaSaudeLogo} 
                alt="Secretaria de Saúde" 
                className="h-14 w-auto"
              />
              <img 
                src={ministerioSaudeLogo} 
                alt="Ministério da Saúde" 
                className="h-12 w-auto"
              />
              <img 
                src={susLogo} 
                alt="SUS" 
                className="h-14 w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleBackToDashboard} variant="outline">
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
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  Total de Consultas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                <p className="text-xs text-gray-500 mt-1">Todos os registros</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Hoje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.today}</div>
                <p className="text-xs text-gray-500 mt-1">Consultas de hoje</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Esta Semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.week}</div>
                <p className="text-xs text-gray-500 mt-1">Últimos 7 dias</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Este Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{stats.month}</div>
                <p className="text-xs text-gray-500 mt-1">Últimos 30 dias</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="by-patient">Por Paciente</TabsTrigger>
            <TabsTrigger value="table">Tabela Completa</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="search">Buscar</TabsTrigger>
            <TabsTrigger value="create">Novo Registro</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By Specialty */}
              {stats && stats.bySpecialty.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Stethoscope className="h-5 w-5 mr-2" />
                      Consultas por Especialidade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.bySpecialty.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">{item.name}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* By Doctor */}
              {stats && stats.byDoctor.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Consultas por Médico
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.byDoctor.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">Dr(a). {item.name}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* By Patient Tab */}
          <TabsContent value="by-patient">
            <Card>
              <CardHeader>
                <CardTitle>Histórico Agrupado por Paciente</CardTitle>
                <CardDescription>
                  Visualize todos os registros médicos organizados por paciente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recordsByPatient.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum registro encontrado</p>
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="space-y-2">
                    {recordsByPatient.map(({ patient, records }) => (
                      <AccordionItem key={patient.id} value={patient.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center space-x-4">
                              <User className="h-5 w-5 text-blue-600" />
                              <div className="text-left">
                                <p className="font-semibold">{patient.name}</p>
                                <p className="text-sm text-gray-500">
                                  CPF: {patient.cpf} | SUS: {patient.susCard}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">{records.length} consultas</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-3">
                            {/* Timeline */}
                            <div className="relative pl-8 space-y-6">
                              {records.map((record, idx) => (
                                <div key={record.id} className="relative">
                                  {/* Timeline dot */}
                                  <div className="absolute -left-8 top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-white"></div>
                                  
                                  {/* Timeline line */}
                                  {idx < records.length - 1 && (
                                    <div className="absolute -left-6 top-5 w-0.5 h-full bg-gray-200"></div>
                                  )}
                                  
                                  {/* Record card */}
                                  <Card className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-3 mb-2">
                                            <Badge variant="outline">
                                              {formatDate(record.consultationDate)}
                                            </Badge>
                                            <Badge variant="secondary">
                                              {record.specialty?.name}
                                            </Badge>
                                          </div>
                                          <h4 className="font-semibold text-gray-900 mb-1">
                                            {record.reason}
                                          </h4>
                                          <p className="text-sm text-gray-600 mb-2">
                                            <strong>Diagnóstico:</strong> {record.diagnosis}
                                          </p>
                                          <p className="text-sm text-gray-600">
                                            Dr(a). {record.doctorName}
                                          </p>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleViewRecord(record)}
                                          data-testid={`button-view-${record.id}`}
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          Ver
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              ))}
                            </div>
                            
                            {/* Export button */}
                            <div className="pt-3 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportPDF(patient.id)}
                                data-testid={`button-export-${patient.id}`}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Exportar Histórico Completo (PDF)
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Table Tab */}
          <TabsContent value="table">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Todos os Registros</span>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar Filtros ({activeFiltersCount})
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  Use os filtros abaixo para refinar sua busca
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-xs text-gray-600">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Nome, CPF, SUS..."
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-filter-text"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">Especialidade</Label>
                    <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                      <SelectTrigger data-testid="select-filter-specialty">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ALL__">Todas</SelectItem>
                        {specialties.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">Médico</Label>
                    <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                      <SelectTrigger data-testid="select-filter-doctor">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ALL__">Todos</SelectItem>
                        {doctorsList.map((doc) => (
                          <SelectItem key={doc} value={doc}>
                            Dr(a). {doc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">Data Início</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      data-testid="input-filter-start-date"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">Data Fim</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      data-testid="input-filter-end-date"
                    />
                  </div>
                </div>

                {/* Results count */}
                <div className="mb-4 flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Mostrando {paginatedRecords.length} de {filteredAndSortedRecords.length} registros
                  </p>
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm text-gray-600">Por página:</Label>
                    <Select 
                      value={itemsPerPage.toString()} 
                      onValueChange={(val) => {
                        setItemsPerPage(Number(val));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20" data-testid="select-items-per-page">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('consultationDate')}
                        >
                          <div className="flex items-center">
                            Data
                            <SortIcon field="consultationDate" />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('patientName')}
                        >
                          <div className="flex items-center">
                            Paciente
                            <SortIcon field="patientName" />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('specialtyName')}
                        >
                          <div className="flex items-center">
                            Especialidade
                            <SortIcon field="specialtyName" />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('doctorName')}
                        >
                          <div className="flex items-center">
                            Médico
                            <SortIcon field="doctorName" />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          Motivo
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600">Nenhum registro encontrado</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatDate(record.consultationDate)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {record.patient?.name}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant="outline">{record.specialty?.name}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              Dr(a). {record.doctorName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {record.reason.length > 40 
                                ? `${record.reason.substring(0, 40)}...` 
                                : record.reason}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewRecord(record)}
                                data-testid={`button-view-table-${record.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-600">
                      Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        data-testid="button-next-page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab - Lab Results and Radiology Images */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos Médicos
                </CardTitle>
                <CardDescription>
                  Resultados de laboratório e imagens de radiologia
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="w-48">
                    <Label className="text-xs text-gray-600">Tipo de Documento</Label>
                    <Select value={documentsFilter} onValueChange={setDocumentsFilter}>
                      <SelectTrigger data-testid="select-documents-type">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="lab_results">Laboratório</SelectItem>
                        <SelectItem value="radiology_images">Radiologia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-64">
                    <Label className="text-xs text-gray-600">Paciente (Nome ou CPF)</Label>
                    <Input 
                      type="text"
                      placeholder="Digite nome ou CPF..."
                      value={documentsPatientFilter}
                      onChange={(e) => setDocumentsPatientFilter(e.target.value)}
                      data-testid="input-documents-patient-search"
                      className="bg-white"
                    />
                  </div>
                </div>

                {isLoadingDocuments ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Carregando documentos...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Lab Results Section */}
                    {(documentsFilter === "all" || documentsFilter === "lab_results") && (
                      <div>
                        <h3 className="text-lg font-semibold text-emerald-700 flex items-center gap-2 mb-4 border-b pb-2">
                          <TestTube className="h-5 w-5" />
                          Resultados de Laboratório ({labResults.filter(matchesPatientFilter).length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {labResults
                            .filter(matchesPatientFilter)
                            .map((doc: any) => {
                              let docContent: any = {};
                              try {
                                docContent = doc.content ? JSON.parse(doc.content) : {};
                              } catch (e) {}
                              const patient = patients.find(p => p.id === doc.patientId);
                              
                              const formatDocDate = (dateValue: any) => {
                                try {
                                  if (!dateValue) return 'N/A';
                                  // Se já está no formato dd/MM/yyyy, retorna diretamente
                                  if (typeof dateValue === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
                                    return dateValue;
                                  }
                                  const date = new Date(dateValue);
                                  if (isNaN(date.getTime())) return 'N/A';
                                  return format(date, "dd/MM/yyyy", { locale: ptBR });
                                } catch {
                                  return 'N/A';
                                }
                              };
                              
                              return (
                                <div 
                                  key={doc.id} 
                                  className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                                  data-testid={`card-lab-result-${doc.id}`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="font-semibold text-emerald-900">{doc.title}</p>
                                      <p className="text-sm text-gray-600">
                                        Paciente: {patient?.name || 'N/A'}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {formatDocDate(doc.issueDate)} • {doc.doctorName}
                                      </p>
                                    </div>
                                    <Badge className="bg-emerald-600">Lab</Badge>
                                  </div>
                                  
                                  {docContent.result && (
                                    <div className="mt-3 p-3 bg-white rounded border border-emerald-200">
                                      <p className="text-xs font-medium text-emerald-800 mb-1">Resultado:</p>
                                      <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-4">{docContent.result}</p>
                                    </div>
                                  )}
                                  
                                  {docContent.attachments && docContent.attachments.length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-xs font-medium text-emerald-700 mb-2">
                                        Anexos ({docContent.attachments.length}):
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {docContent.attachments.map((url: string, idx: number) => (
                                          <a
                                            key={idx}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded hover:bg-emerald-200"
                                            data-testid={`link-lab-attachment-${doc.id}-${idx}`}
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
                          {labResults.filter(matchesPatientFilter).length === 0 && (
                            <p className="text-gray-500 text-sm col-span-2">Nenhum resultado de laboratório encontrado.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Radiology Images Section */}
                    {(documentsFilter === "all" || documentsFilter === "radiology_images") && (
                      <div>
                        <h3 className="text-lg font-semibold text-purple-700 flex items-center gap-2 mb-4 border-b pb-2">
                          <ImageIcon className="h-5 w-5" />
                          Imagens de Radiologia ({radiologyImages.filter(matchesPatientFilter).length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {radiologyImages
                            .filter(matchesPatientFilter)
                            .map((doc: any) => {
                              let docContent: any = {};
                              try {
                                docContent = doc.content ? JSON.parse(doc.content) : {};
                              } catch (e) {}
                              const patient = patients.find(p => p.id === doc.patientId);
                              
                              const formatDocDate = (dateValue: any) => {
                                try {
                                  if (!dateValue) return 'N/A';
                                  // Se já está no formato dd/MM/yyyy, retorna diretamente
                                  if (typeof dateValue === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
                                    return dateValue;
                                  }
                                  const date = new Date(dateValue);
                                  if (isNaN(date.getTime())) return 'N/A';
                                  return format(date, "dd/MM/yyyy", { locale: ptBR });
                                } catch {
                                  return 'N/A';
                                }
                              };
                              
                              return (
                                <div 
                                  key={doc.id} 
                                  className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                                  data-testid={`card-radiology-${doc.id}`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="font-semibold text-purple-900">{doc.title}</p>
                                      <p className="text-sm text-gray-600">
                                        Paciente: {patient?.name || 'N/A'}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {formatDocDate(doc.issueDate)} • {doc.doctorName}
                                      </p>
                                    </div>
                                    <Badge className="bg-purple-600">Radiologia</Badge>
                                  </div>
                                  
                                  {docContent.images && docContent.images.length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-xs font-medium text-purple-700 mb-2">
                                        Imagens ({docContent.images.length}):
                                      </p>
                                      <div className="grid grid-cols-4 gap-2">
                                        {docContent.images.map((imgUrl: string, idx: number) => (
                                          <a
                                            key={idx}
                                            href={imgUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                            data-testid={`link-radiology-image-${doc.id}-${idx}`}
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
                                              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                                                {idx + 1}
                                              </span>
                                            </div>
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          {radiologyImages.filter(matchesPatientFilter).length === 0 && (
                            <p className="text-gray-500 text-sm col-span-2">Nenhuma imagem de radiologia encontrada.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics">
            <div className="space-y-6">
              {/* Period selector */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Métricas de Atendimento
                    </div>
                    <Select value={metricsPeriod} onValueChange={setMetricsPeriod}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Hoje</SelectItem>
                        <SelectItem value="week">Última Semana</SelectItem>
                        <SelectItem value="month">Último Mês</SelectItem>
                        <SelectItem value="all">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardTitle>
                  <CardDescription>
                    Estatísticas de tempo de atendimento por médico e especialidade
                  </CardDescription>
                </CardHeader>
              </Card>

              {attendanceMetrics && (
                <>
                  {/* Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Total de Consultas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-blue-600">
                          {attendanceMetrics.totalConsultations}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          No período selecionado
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Duração Média</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-green-600">
                          {attendanceMetrics.avgDuration 
                            ? `${Math.round(attendanceMetrics.avgDuration)} min`
                            : "N/A"}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          Por consulta
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* By Doctor */}
                  {attendanceMetrics.byDoctor.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Métricas por Médico</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {attendanceMetrics.byDoctor.map((doctor, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-lg">Dr(a). {doctor.doctorName}</h3>
                                <Badge variant="outline">{doctor.count} consultas</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Duração Média:</span>
                                  <span className="ml-2 font-semibold">
                                    {doctor.avgDuration ? `${Math.round(doctor.avgDuration)} min` : "N/A"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Tempo Total:</span>
                                  <span className="ml-2 font-semibold">
                                    {Math.round(doctor.totalTime)} min ({Math.round(doctor.totalTime / 60)}h)
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* By Specialty */}
                  {attendanceMetrics.bySpecialty.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Métricas por Especialidade</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {attendanceMetrics.bySpecialty.map((specialty, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-lg">{specialty.specialtyName}</h3>
                                <Badge variant="outline">{specialty.count} consultas</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Duração Média:</span>
                                  <span className="ml-2 font-semibold">
                                    {specialty.avgDuration ? `${Math.round(specialty.avgDuration)} min` : "N/A"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Tempo Total:</span>
                                  <span className="ml-2 font-semibold">
                                    {Math.round(specialty.totalTime)} min ({Math.round(specialty.totalTime / 60)}h)
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {!attendanceMetrics && (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>Carregando métricas de atendimento...</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Search Tab (legacy SUS card search) */}
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Busca Rápida</span>
                </CardTitle>
                <CardDescription>
                  Use a aba "Tabela Completa" para filtros avançados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    Utilize a aba "Tabela Completa" para filtrar por:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant="secondary">Nome</Badge>
                    <Badge variant="secondary">CPF</Badge>
                    <Badge variant="secondary">Cartão SUS</Badge>
                    <Badge variant="secondary">Especialidade</Badge>
                    <Badge variant="secondary">Médico</Badge>
                    <Badge variant="secondary">Período</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Tab */}
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Novo Registro Médico</span>
                </CardTitle>
                <CardDescription>
                  Adicione um novo registro médico ao histórico do paciente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={createForm.control}
                        name="patientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Paciente</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-patient">
                                  <SelectValue placeholder="Selecione o paciente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {patients.map((patient) => (
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

                      <FormField
                        control={createForm.control}
                        name="specialtyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Especialidade</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-specialty">
                                  <SelectValue placeholder="Selecione a especialidade" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {specialties.map((specialty) => (
                                  <SelectItem key={specialty.id} value={specialty.id}>
                                    {specialty.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="consultationDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data da Consulta</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="consultationTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horário da Consulta</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} data-testid="input-time" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="doctorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Médico Responsável</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Dr(a). Nome do médico" data-testid="input-doctor" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={createForm.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivo da Consulta</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} data-testid="input-reason" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="symptoms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sintomas</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} data-testid="input-symptoms" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="diagnosis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diagnóstico</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} data-testid="input-diagnosis" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="treatment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tratamento</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} data-testid="input-treatment" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="medications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medicações</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="Liste os medicamentos prescritos" data-testid="input-medications" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="observations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} data-testid="input-observations" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="examResults"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resultados de Exames (opcional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} data-testid="input-exam-results" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="nextConsultation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Próxima Consulta (opcional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-next-consultation" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-create"
                    >
                      {createMutation.isPending ? "Salvando..." : "Criar Registro"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Record Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Registro Médico</DialogTitle>
            <DialogDescription>
              Informações completas da consulta médica
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-6">
              {/* Patient Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Informações do Paciente
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-blue-700">Nome:</span>
                    <p className="font-medium">{selectedRecord.patient?.name}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">CPF:</span>
                    <p className="font-medium">{selectedRecord.patient?.cpf}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Cartão SUS:</span>
                    <p className="font-medium">{selectedRecord.patient?.susCard}</p>
                  </div>
                </div>
              </div>

              {/* Consultation Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Data da Consulta</Label>
                  <p className="font-medium flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    {formatDate(selectedRecord.consultationDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Horário</Label>
                  <p className="font-medium flex items-center mt-1">
                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                    {formatTime(selectedRecord.consultationTime)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Especialidade</Label>
                  <p className="font-medium flex items-center mt-1">
                    <Stethoscope className="h-4 w-4 mr-2 text-gray-500" />
                    {selectedRecord.specialty?.name}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Médico</Label>
                  <p className="font-medium flex items-center mt-1">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    Dr(a). {selectedRecord.doctorName}
                  </p>
                </div>
              </div>

              {/* Medical Details */}
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-600">Motivo da Consulta</Label>
                  <p className="mt-1 text-gray-900">{selectedRecord.reason}</p>
                </div>
                
                <div>
                  <Label className="text-gray-600">Sintomas</Label>
                  <p className="mt-1 text-gray-900">{selectedRecord.symptoms}</p>
                </div>
                
                <div>
                  <Label className="text-gray-600">Diagnóstico</Label>
                  <p className="mt-1 text-gray-900">{selectedRecord.diagnosis}</p>
                </div>
                
                <div>
                  <Label className="text-gray-600">Tratamento</Label>
                  <p className="mt-1 text-gray-900">{selectedRecord.treatment}</p>
                </div>
                
                {selectedRecord.medications && (
                  <div>
                    <Label className="text-gray-600 flex items-center">
                      <Pill className="h-4 w-4 mr-2" />
                      Medicações Prescritas
                    </Label>
                    <p className="mt-1 text-gray-900">{selectedRecord.medications}</p>
                  </div>
                )}
                
                {selectedRecord.observations && (
                  <div>
                    <Label className="text-gray-600">Observações</Label>
                    <p className="mt-1 text-gray-900">{selectedRecord.observations}</p>
                  </div>
                )}
                
                {selectedRecord.examResults && (
                  <div>
                    <Label className="text-gray-600">Resultados de Exames (Texto)</Label>
                    <p className="mt-1 text-gray-900">{selectedRecord.examResults}</p>
                  </div>
                )}

                {selectedRecord.examRequests && selectedRecord.examRequests.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <Label className="text-gray-600 flex items-center text-base font-semibold mb-3">
                      <Activity className="h-5 w-5 mr-2 text-blue-600" />
                      Exames Solicitados ({selectedRecord.examRequests.length})
                    </Label>
                    <div className="space-y-3">
                      {selectedRecord.examRequests.map((exam) => (
                        <div 
                          key={exam.id} 
                          className={`border rounded-lg p-3 ${
                            exam.status === EXAM_REQUEST_STATUS.COMPLETED 
                              ? 'bg-green-50 border-green-200' 
                              : exam.status === EXAM_REQUEST_STATUS.IN_PROGRESS 
                                ? 'bg-yellow-50 border-yellow-200' 
                                : exam.status === EXAM_REQUEST_STATUS.CANCELLED
                                  ? 'bg-red-50 border-red-200'
                                  : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-gray-900">{exam.examName}</p>
                              <p className="text-sm text-gray-600">{exam.examType === 'imaging' ? 'Exame de Imagem' : 'Exame Laboratorial'}</p>
                            </div>
                            <Badge 
                              variant={
                                exam.status === EXAM_REQUEST_STATUS.COMPLETED ? 'default' :
                                exam.status === EXAM_REQUEST_STATUS.IN_PROGRESS ? 'secondary' :
                                exam.status === EXAM_REQUEST_STATUS.CANCELLED ? 'destructive' : 'outline'
                              }
                              className={
                                exam.status === EXAM_REQUEST_STATUS.COMPLETED ? 'bg-green-600' :
                                exam.status === EXAM_REQUEST_STATUS.IN_PROGRESS ? 'bg-yellow-600' : ''
                              }
                            >
                              {exam.status === EXAM_REQUEST_STATUS.PENDING && 'Pendente'}
                              {exam.status === EXAM_REQUEST_STATUS.IN_PROGRESS && 'Em Andamento'}
                              {exam.status === EXAM_REQUEST_STATUS.COMPLETED && 'Concluído'}
                              {exam.status === EXAM_REQUEST_STATUS.CANCELLED && 'Cancelado'}
                            </Badge>
                          </div>
                          
                          {exam.clinicalIndication && (
                            <p className="text-sm text-gray-700 mb-2">
                              <span className="font-medium">Indicação:</span> {exam.clinicalIndication}
                            </p>
                          )}
                          
                          {exam.status === EXAM_REQUEST_STATUS.COMPLETED && exam.result && (
                            <div className="mt-3 p-3 bg-white rounded border border-green-300">
                              <p className="text-sm font-medium text-green-800 mb-1">Resultado do Exame:</p>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{exam.result}</p>
                              <div className="mt-2 pt-2 border-t border-green-200 text-xs text-gray-500 space-y-1">
                                {exam.performingDoctorName && (
                                  <p><span className="font-medium">Realizado por:</span> {exam.performingDoctorName}</p>
                                )}
                                {exam.completedAt && (
                                  <p><span className="font-medium">Data:</span> {format(new Date(exam.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {exam.status === EXAM_REQUEST_STATUS.CANCELLED && (
                            <p className="text-sm text-red-700 mt-2">
                              Este exame foi cancelado.
                            </p>
                          )}
                          
                          {/* Images/attachments from exam (radiology images or lab attachments) */}
                          {exam.images && exam.images.length > 0 && (
                            <div className={`mt-3 p-3 rounded border ${
                              exam.examType === 'laboratorio' 
                                ? 'bg-emerald-50 border-emerald-200' 
                                : 'bg-purple-50 border-purple-200'
                            }`}>
                              <p className={`text-sm font-medium mb-2 flex items-center ${
                                exam.examType === 'laboratorio' ? 'text-emerald-800' : 'text-purple-800'
                              }`}>
                                <Image className="h-4 w-4 mr-1" />
                                {exam.examType === 'laboratorio' 
                                  ? `Anexos do Resultado (${exam.images.length})` 
                                  : `Imagens de Radiologia (${exam.images.length})`
                                }
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                {exam.images.map((imgUrl, imgIdx) => (
                                  <a 
                                    key={imgIdx} 
                                    href={imgUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <div className={`relative aspect-square rounded overflow-hidden border transition-colors ${
                                      exam.examType === 'laboratorio' 
                                        ? 'border-emerald-300 hover:border-emerald-500' 
                                        : 'border-purple-300 hover:border-purple-500'
                                    }`}>
                                      <img 
                                        src={imgUrl} 
                                        alt={`${exam.examType === 'laboratorio' ? 'Anexo' : 'Imagem'} ${imgIdx + 1}`}
                                        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                        }}
                                      />
                                      <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[10px] px-1 rounded">
                                        {imgIdx + 1}
                                      </span>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedRecord.nextConsultation && (
                  <div>
                    <Label className="text-gray-600">Próxima Consulta</Label>
                    <p className="mt-1 text-gray-900 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      {formatDate(selectedRecord.nextConsultation)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
