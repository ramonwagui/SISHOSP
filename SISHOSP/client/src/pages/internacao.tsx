import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bed,
  Building2,
  Plus, 
  Search, 
  User,
  Calendar,
  Clock,
  Stethoscope,
  FileText,
  ClipboardPlus,
  LogOut,
  Activity,
  Heart,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Edit,
  MoreHorizontal,
  Loader2,
  Home
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { SelectHospitalWard, SelectHospitalBed, SelectHospitalization, SelectHospitalizationEvolution, Patient } from "@shared/schema";
import { BED_STATUS_LABELS } from "@shared/schema";

type HospitalBedWithWard = SelectHospitalBed & { ward?: SelectHospitalWard };
type BedWithDetails = SelectHospitalBed & { 
  ward?: SelectHospitalWard; 
  hospitalization?: SelectHospitalization & { patient?: Patient } 
};
type HospitalizationWithDetails = SelectHospitalization & {
  patient?: Patient;
  bed?: HospitalBedWithWard;
  attendingDoctor?: { name: string };
  evolutions?: SelectHospitalizationEvolution[];
};

type OccupancyStats = {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  byWard: Array<{
    wardId: string;
    wardName: string;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    occupancyRate: number;
  }>;
};

export default function Internacao() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Apenas médicos e admins podem dar alta
  const canDischarge = user?.role === "doctor" || user?.role === "admin";
  const [activeWardTab, setActiveWardTab] = useState<string>("all");
  const [selectedHospitalization, setSelectedHospitalization] = useState<HospitalizationWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDischargeOpen, setIsDischargeOpen] = useState(false);
  const [isEvolutionOpen, setIsEvolutionOpen] = useState(false);
  const [isNewHospitalizationOpen, setIsNewHospitalizationOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [mainView, setMainView] = useState<"hospitalizations" | "beds">("hospitalizations");
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>("all");
  const [bedStatusFilter, setBedStatusFilter] = useState<string>("all");
  const [selectedBedFilter, setSelectedBedFilter] = useState<string>("all");

  const [dischargeData, setDischargeData] = useState({
    dischargeType: "",
    dischargeSummary: ""
  });

  const [evolutionData, setEvolutionData] = useState({
    evolutionType: "rotina",
    subjectiveNotes: "",
    objectiveNotes: "",
    assessment: "",
    plan: "",
    medications: "",
    procedures: "",
    diet: "",
    observations: ""
  });

  const [newHospitalization, setNewHospitalization] = useState({
    patientId: "",
    bedId: "",
    attendingDoctorId: "",
    attendingDoctorName: "",
    admissionDiagnosis: "",
    admissionReason: "",
    cidCode: "",
    severity: "media",
    estimatedDischargeDate: "",
    observations: "",
    hospitalizationType: "ativo" as "ativo" | "observacao"
  });

  // CID search states
  const [cidSearch, setCidSearch] = useState("");
  const [debouncedCidSearch, setDebouncedCidSearch] = useState("");
  const [showCidResults, setShowCidResults] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCidSearch(cidSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [cidSearch]);

  const { data: cidResults = [], isLoading: loadingCid } = useQuery<Array<{ code: string; description: string }>>({
    queryKey: ["/api/cid/search", debouncedCidSearch],
    queryFn: async () => {
      if (debouncedCidSearch.length < 2) return [];
      const res = await fetch(`/api/cid/search?q=${encodeURIComponent(debouncedCidSearch)}&limit=20`);
      return res.json();
    },
    enabled: debouncedCidSearch.length >= 2,
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const patientIdFromUrl = urlParams.get('patientId');
    const doctorIdFromUrl = urlParams.get('doctorId');
    const doctorNameFromUrl = urlParams.get('doctorName');
    const typeFromUrl = urlParams.get('type');
    
    if (patientIdFromUrl) {
      setNewHospitalization(prev => ({ 
        ...prev, 
        patientId: patientIdFromUrl,
        attendingDoctorId: doctorIdFromUrl || "",
        attendingDoctorName: doctorNameFromUrl || "",
        hospitalizationType: typeFromUrl === 'observacao' ? 'observacao' : 'ativo'
      }));
      setIsNewHospitalizationOpen(true);
      window.history.replaceState({}, '', '/internacao');
    }
  }, []);

  const { data: occupancy, isLoading: loadingOccupancy } = useQuery<OccupancyStats>({
    queryKey: ["/api/hospital/occupancy"],
  });

  const { data: wards = [] } = useQuery<SelectHospitalWard[]>({
    queryKey: ["/api/hospital/wards"],
  });

  const { data: availableBeds = [] } = useQuery<HospitalBedWithWard[]>({
    queryKey: ["/api/hospital/beds/available"],
  });

  const { data: allBedsWithDetails = [], isLoading: loadingBeds } = useQuery<BedWithDetails[]>({
    queryKey: ["/api/hospital/beds/all"],
  });

  const { data: hospitalizations = [], isLoading: loadingHospitalizations } = useQuery<HospitalizationWithDetails[]>({
    queryKey: ["/api/hospitalizations"],
  });

  const activeHospitalizations = hospitalizations.filter(h => h.status === "ativo");

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: doctors = [] } = useQuery<any[]>({
    queryKey: ["/api/doctors"],
  });

  const { data: medicalHistoryRecords = [], isLoading: loadingMedicalHistory } = useQuery<any[]>({
    queryKey: ["/api/hospitalizations", selectedHospitalization?.id, "medical-history"],
    enabled: !!selectedHospitalization?.id && isFollowUpOpen,
  });

  const createHospitalizationMutation = useMutation({
    mutationFn: async (data: typeof newHospitalization) => {
      const payload = {
        patientId: data.patientId,
        bedId: data.bedId,
        attendingDoctorId: data.attendingDoctorId,
        attendingDoctorName: data.attendingDoctorName,
        admissionDiagnosis: data.admissionDiagnosis,
        admissionReason: data.admissionReason,
        cidCode: data.cidCode,
        severity: data.severity,
        observations: data.observations,
        status: data.hospitalizationType,
        estimatedDischargeDate: data.estimatedDischargeDate ? new Date(data.estimatedDischargeDate).toISOString() : null
      };
      return await apiRequest("/api/hospitalizations", {
        method: "POST",
        body: payload,
      });
    },
    onSuccess: () => {
      const message = newHospitalization.hospitalizationType === "observacao" 
        ? "Paciente registrado em observação!" 
        : "Internação registrada com sucesso!";
      toast({ title: message });
      queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations/observation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/beds/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/beds/all"] });
      setIsNewHospitalizationOpen(false);
      setNewHospitalization({
        patientId: "",
        bedId: "",
        attendingDoctorId: "",
        attendingDoctorName: "",
        admissionDiagnosis: "",
        admissionReason: "",
        cidCode: "",
        severity: "media",
        estimatedDischargeDate: "",
        observations: "",
        hospitalizationType: "ativo"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao registrar internação", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const dischargeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof dischargeData }) => {
      return await apiRequest(`/api/hospitalizations/${id}/discharge`, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({ title: "Alta hospitalar registrada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/beds/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/beds/all"] });
      setIsDischargeOpen(false);
      setSelectedHospitalization(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao registrar alta", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const createEvolutionMutation = useMutation({
    mutationFn: async ({ hospitalizationId, data }: { hospitalizationId: string; data: typeof evolutionData }) => {
      return await apiRequest(`/api/hospitalizations/${hospitalizationId}/evolutions`, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({ title: "Evolução registrada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations"] });
      setIsEvolutionOpen(false);
      setEvolutionData({
        evolutionType: "rotina",
        subjectiveNotes: "",
        objectiveNotes: "",
        assessment: "",
        plan: "",
        medications: "",
        procedures: "",
        diet: "",
        observations: ""
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao registrar evolução", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const filteredHospitalizations = activeHospitalizations.filter(h => {
    const matchesSearch = !searchTerm || 
      h.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.admissionDiagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.bed?.ward?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWard = activeWardTab === "all" || h.bed?.ward?.id === activeWardTab;
    
    return matchesSearch && matchesWard;
  });

  const getHospitalizationCountByWard = (wardId: string) => {
    return activeHospitalizations.filter(h => h.bed?.ward?.id === wardId).length;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "baixa": return "bg-green-100 text-green-800";
      case "media": return "bg-yellow-100 text-yellow-800";
      case "alta": return "bg-orange-100 text-orange-800";
      case "critica": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "baixa": return "Baixa";
      case "media": return "Média";
      case "alta": return "Alta";
      case "critica": return "Crítica";
      default: return severity;
    }
  };

  const getBedStatusColor = (status: string) => {
    switch (status) {
      case "disponivel": return "bg-green-500";
      case "ocupado": return "bg-yellow-500";
      case "pre_alta": return "bg-blue-500";
      case "bloqueado": return "bg-red-500";
      case "manutencao": return "bg-gray-500";
      case "reservado": return "bg-purple-500";
      case "em_liberacao": return "bg-cyan-500";
      default: return "bg-gray-400";
    }
  };

  const bedsInSelectedWard = allBedsWithDetails.filter(bed => 
    selectedWardFilter === "all" || bed.wardId === selectedWardFilter
  );

  const filteredBeds = allBedsWithDetails.filter(bed => {
    const matchesWard = selectedWardFilter === "all" || bed.wardId === selectedWardFilter;
    const matchesStatus = bedStatusFilter === "all" || bed.status === bedStatusFilter;
    const matchesBed = selectedBedFilter === "all" || bed.id === selectedBedFilter;
    return matchesWard && matchesStatus && matchesBed;
  });

  const bedStats = {
    total: allBedsWithDetails.length,
    ocupados: allBedsWithDetails.filter(b => b.status === "ocupado").length,
    livres: allBedsWithDetails.filter(b => b.status === "disponivel").length,
    preAlta: allBedsWithDetails.filter(b => b.status === "pre_alta").length,
    bloqueados: allBedsWithDetails.filter(b => b.status === "bloqueado").length,
    emLiberacao: allBedsWithDetails.filter(b => b.status === "em_liberacao").length,
    masculino: allBedsWithDetails.filter(b => b.status === "ocupado" && b.hospitalization?.patient?.gender === "masculino").length,
    feminino: allBedsWithDetails.filter(b => b.status === "ocupado" && b.hospitalization?.patient?.gender === "feminino").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation('/')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Internação Hospitalar</h1>
              <p className="text-gray-500">Gerenciamento de pacientes internados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsNewHospitalizationOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-new-hospitalization"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Internação
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/observacao')}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
              data-testid="button-observacao"
            >
              <Eye className="w-4 h-4 mr-2" />
              Observação
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/sala-vermelha')}
              className="border-red-300 text-red-700 hover:bg-red-50"
              data-testid="button-sala-vermelha"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Sala Vermelha
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/')}
              data-testid="button-home"
            >
              <Home className="w-4 h-4 mr-2" />
              Início
            </Button>
            <Button
              variant="destructive"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mainView === "hospitalizations" ? "default" : "outline"}
            onClick={() => setMainView("hospitalizations")}
            data-testid="button-view-hospitalizations"
          >
            <User className="w-4 h-4 mr-2" />
            Pacientes Internados
          </Button>
          <Button
            variant={mainView === "beds" ? "default" : "outline"}
            onClick={() => setMainView("beds")}
            data-testid="button-view-beds"
          >
            <Bed className="w-4 h-4 mr-2" />
            Painel de Leitos
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Leitos Totais</p>
                  <p className="text-2xl font-bold">{occupancy?.totalBeds || 0}</p>
                </div>
                <Bed className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ocupados</p>
                  <p className="text-2xl font-bold text-orange-600">{occupancy?.occupiedBeds || 0}</p>
                </div>
                <User className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Disponíveis</p>
                  <p className="text-2xl font-bold text-green-600">{occupancy?.availableBeds || 0}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Taxa de Ocupação</p>
                  <p className="text-2xl font-bold">{occupancy?.occupancyRate || 0}%</p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
              <Progress 
                value={occupancy?.occupancyRate || 0} 
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* Beds Panel View */}
        {mainView === "beds" && (
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="flex items-center">
                  <Bed className="w-5 h-5 mr-2" />
                  Painel de Disponibilidade de Leitos
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Select value={selectedWardFilter} onValueChange={(value) => {
                    setSelectedWardFilter(value);
                    setSelectedBedFilter("all");
                  }}>
                    <SelectTrigger className="w-[180px]" data-testid="select-ward-filter">
                      <SelectValue placeholder="Filtrar por Unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Unidades</SelectItem>
                      {wards.map((ward) => (
                        <SelectItem key={ward.id} value={ward.id}>
                          {ward.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedWardFilter !== "all" && (
                    <Select value={selectedBedFilter} onValueChange={setSelectedBedFilter}>
                      <SelectTrigger className="w-[280px]" data-testid="select-bed-filter">
                        <SelectValue placeholder="Selecionar Leito" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Leitos</SelectItem>
                        {bedsInSelectedWard.map((bed) => (
                          <SelectItem key={bed.id} value={bed.id}>
                            Leito {bed.bedNumber} - {bed.hospitalization?.patient?.name || "Livre"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={bedStatusFilter} onValueChange={setBedStatusFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="disponivel">Livre</SelectItem>
                      <SelectItem value="ocupado">Ocupado</SelectItem>
                      <SelectItem value="pre_alta">Pré-Alta</SelectItem>
                      <SelectItem value="bloqueado">Bloqueado</SelectItem>
                      <SelectItem value="em_liberacao">Em Liberação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Livre ({bedStats.livres})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm">Ocupado ({bedStats.ocupados})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm">Pré-Alta ({bedStats.preAlta})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">Bloqueado ({bedStats.bloqueados})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                  <span className="text-sm">Em Liberação ({bedStats.emLiberacao})</span>
                </div>
                <div className="border-l border-gray-300 h-4 mx-2"></div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span className="text-sm">Leito Masculino ({bedStats.masculino})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                  <span className="text-sm">Leito Feminino ({bedStats.feminino})</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBeds ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredBeds.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum leito encontrado com os filtros selecionados
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Leito</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data Internação</TableHead>
                        <TableHead>Prontuário</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBeds.map((bed) => (
                        <TableRow 
                          key={bed.id} 
                          className={bed.hospitalization ? "cursor-pointer hover:bg-gray-50" : ""}
                          onClick={() => {
                            if (bed.hospitalization) {
                              const hosp = hospitalizations.find(h => h.id === bed.hospitalization?.id);
                              if (hosp) {
                                setSelectedHospitalization(hosp);
                                setIsFollowUpOpen(true);
                              }
                            }
                          }}
                          data-testid={`row-bed-${bed.id}`}
                        >
                          <TableCell className="font-medium">{bed.ward?.name || "-"}</TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600">
                              {bed.bedNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${getBedStatusColor(bed.status)}`}></div>
                              <span className="text-sm">{BED_STATUS_LABELS[bed.status] || bed.status}</span>
                              {bed.status === "ocupado" && bed.hospitalization?.patient?.gender && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  bed.hospitalization.patient.gender === "masculino" 
                                    ? "bg-blue-100 text-blue-700" 
                                    : "bg-pink-100 text-pink-700"
                                }`}>
                                  {bed.hospitalization.patient.gender === "masculino" ? "♂ Masc" : "♀ Fem"}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {bed.hospitalization?.admissionDate 
                              ? format(new Date(bed.hospitalization.admissionDate), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            {bed.hospitalization?.patient?.medicalRecordNumber || "-"}
                          </TableCell>
                          <TableCell>
                            {bed.hospitalization?.patient?.name || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {bed.hospitalization && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/prontuario-rapido?hospitalizationId=${bed.hospitalization?.id}`);
                                }}
                                data-testid={`button-evolve-${bed.id}`}
                              >
                                <ClipboardPlus className="w-4 h-4 mr-1" />
                                Evoluir
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Hospitalizations View */}
        {mainView === "hospitalizations" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Ocupação por Ala
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {occupancy?.byWard.map((ward) => (
                    <div key={ward.wardId} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{ward.wardName}</span>
                        <span className="text-xs text-gray-500">
                          {ward.occupiedBeds}/{ward.totalBeds}
                        </span>
                      </div>
                      <Progress value={ward.occupancyRate} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Pacientes Internados</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar paciente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                      data-testid="input-search-hospitalizations"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeWardTab} onValueChange={setActiveWardTab}>
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  <TabsTrigger value="all" data-testid="tab-all-wards">
                    Todos ({activeHospitalizations.length})
                  </TabsTrigger>
                  {wards.map((ward) => (
                    <TabsTrigger key={ward.id} value={ward.id} data-testid={`tab-ward-${ward.id}`}>
                      {ward.name} ({getHospitalizationCountByWard(ward.id)})
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={activeWardTab}>
                  {loadingHospitalizations ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : filteredHospitalizations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma internação encontrada
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {filteredHospitalizations.map((h) => (
                          <Card 
                            key={h.id} 
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => {
                              setSelectedHospitalization(h);
                              setIsFollowUpOpen(true);
                            }}
                            data-testid={`card-hospitalization-${h.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <h3 className="font-semibold">{h.patient?.name || "Paciente"}</h3>
                                    <Badge className={getSeverityColor(h.severity || "media")}>
                                      {getSeverityLabel(h.severity || "media")}
                                    </Badge>
                                    {h.status === "alta" && (
                                      <Badge variant="outline" className="bg-green-50 text-green-700">
                                        Alta
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{h.admissionDiagnosis}</p>
                                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                    <span className="flex items-center">
                                      <Building2 className="w-3 h-3 mr-1" />
                                      {h.bed?.ward?.name} - Leito {h.bed?.bedNumber}
                                    </span>
                                    <span className="flex items-center">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      {h.admissionDate && format(new Date(h.admissionDate), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                    <span className="flex items-center">
                                      <Stethoscope className="w-3 h-3 mr-1" />
                                      Dr(a). {h.attendingDoctorName}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  {h.status === "ativo" && (
                                    <>
                                      <Button 
                                        variant="default" 
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLocation(`/prontuario-rapido?hospitalizationId=${h.id}`);
                                        }}
                                        data-testid={`button-evolution-${h.id}`}
                                      >
                                        <FileText className="w-4 h-4 mr-1" />
                                        Evolução
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedHospitalization(h);
                                          setIsFollowUpOpen(true);
                                        }}
                                        data-testid={`button-clinical-record-${h.id}`}
                                      >
                                        <ClipboardPlus className="w-4 h-4 mr-1" />
                                        Registro Clínico
                                      </Button>
                                    </>
                                  )}
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedHospitalization(h);
                                      setIsDetailsOpen(true);
                                    }}
                                    data-testid={`button-details-${h.id}`}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Detalhes
                                  </Button>
                                  {h.status === "ativo" && canDischarge && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedHospitalization(h);
                                        setIsDischargeOpen(true);
                                      }}
                                      data-testid={`button-discharge-${h.id}`}
                                    >
                                      <LogOut className="w-4 h-4 mr-1" />
                                      Alta
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Detalhes da Internação
              </DialogTitle>
            </DialogHeader>
            
            {selectedHospitalization && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Paciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-semibold">{selectedHospitalization.patient?.name}</p>
                      <p className="text-sm text-gray-500">
                        CPF: {selectedHospitalization.patient?.cpf}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Localização</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-semibold">{selectedHospitalization.bed?.ward?.name}</p>
                      <p className="text-sm text-gray-500">
                        Leito: {selectedHospitalization.bed?.bedNumber}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Informações Clínicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Diagnóstico de Admissão</Label>
                        <p className="font-medium">{selectedHospitalization.admissionDiagnosis}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Motivo da Internação</Label>
                        <p className="font-medium">{selectedHospitalization.admissionReason}</p>
                      </div>
                      {selectedHospitalization.cidCode && (
                        <div>
                          <Label className="text-xs text-gray-500">CID</Label>
                          <p className="font-medium">{selectedHospitalization.cidCode}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs text-gray-500">Gravidade</Label>
                        <Badge className={getSeverityColor(selectedHospitalization.severity || "media")}>
                          {getSeverityLabel(selectedHospitalization.severity || "media")}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label className="text-xs text-gray-500">Data de Admissão</Label>
                        <p className="font-medium">
                          {selectedHospitalization.admissionDate && 
                            format(new Date(selectedHospitalization.admissionDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Médico Responsável</Label>
                        <p className="font-medium">Dr(a). {selectedHospitalization.attendingDoctorName}</p>
                      </div>
                    </div>
                    {selectedHospitalization.observations && (
                      <div className="mt-4">
                        <Label className="text-xs text-gray-500">Observações</Label>
                        <p className="text-sm">{selectedHospitalization.observations}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedHospitalization.evolutions && selectedHospitalization.evolutions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>Evoluções</span>
                        <Badge>{selectedHospitalization.evolutions.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-3">
                          {selectedHospitalization.evolutions.map((evolution) => (
                            <div key={evolution.id} className="border-l-2 border-blue-500 pl-3 py-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-xs text-gray-500">
                                    {evolution.evolutionDate && format(new Date(evolution.evolutionDate), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                    {" - "}
                                    {evolution.createdByName}
                                    {(evolution as any).createdByRegistration && (
                                      <span className="font-medium"> ({evolution.createdByRole === "doctor" ? "CRM" : "COREN"}: {(evolution as any).createdByRegistration})</span>
                                    )}
                                    {!(evolution as any).createdByRegistration && ` (${evolution.createdByRole})`}
                                  </p>
                                  <Badge variant="outline" className="mt-1">
                                    {evolution.evolutionType === "rotina" ? "Rotina" : 
                                     evolution.evolutionType === "intercorrencia" ? "Intercorrência" : 
                                     evolution.evolutionType}
                                  </Badge>
                                </div>
                              </div>
                              {evolution.subjectiveNotes && (
                                <div className="mt-2">
                                  <Label className="text-xs text-gray-500">S (Subjetivo)</Label>
                                  <p className="text-sm">{evolution.subjectiveNotes}</p>
                                </div>
                              )}
                              {evolution.objectiveNotes && (
                                <div className="mt-1">
                                  <Label className="text-xs text-gray-500">O (Objetivo)</Label>
                                  <p className="text-sm">{evolution.objectiveNotes}</p>
                                </div>
                              )}
                              {evolution.assessment && (
                                <div className="mt-1">
                                  <Label className="text-xs text-gray-500">A (Avaliação)</Label>
                                  <p className="text-sm">{evolution.assessment}</p>
                                </div>
                              )}
                              {evolution.plan && (
                                <div className="mt-1">
                                  <Label className="text-xs text-gray-500">P (Plano)</Label>
                                  <p className="text-sm">{evolution.plan}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {selectedHospitalization.status === "ativo" && (
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setIsDetailsOpen(false);
                        setIsEvolutionOpen(true);
                      }}
                      data-testid="button-add-evolution"
                    >
                      <ClipboardPlus className="w-4 h-4 mr-2" />
                      Adicionar Evolução
                    </Button>
                    {canDischarge && (
                      <Button 
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setIsDetailsOpen(false);
                          setIsDischargeOpen(true);
                        }}
                        data-testid="button-discharge"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Dar Alta
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isDischargeOpen} onOpenChange={setIsDischargeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alta Hospitalar</DialogTitle>
              <DialogDescription>
                Registrar alta para {selectedHospitalization?.patient?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dischargeType">Tipo de Alta *</Label>
                <Select
                  value={dischargeData.dischargeType}
                  onValueChange={(value) => setDischargeData({ ...dischargeData, dischargeType: value })}
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
                    <SelectItem value="evasao">Evasão</SelectItem>
                    <SelectItem value="obito">Óbito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dischargeSummary">Resumo de Alta</Label>
                <Textarea
                  id="dischargeSummary"
                  value={dischargeData.dischargeSummary}
                  onChange={(e) => setDischargeData({ ...dischargeData, dischargeSummary: e.target.value })}
                  placeholder="Descreva o resumo da internação e orientações de alta..."
                  rows={5}
                  data-testid="textarea-discharge-summary"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button 
                onClick={() => {
                  if (!dischargeData.dischargeType) {
                    toast({ title: "Selecione o tipo de alta", variant: "destructive" });
                    return;
                  }
                  if (selectedHospitalization) {
                    dischargeMutation.mutate({ id: selectedHospitalization.id, data: dischargeData });
                  }
                }}
                disabled={dischargeMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-confirm-discharge"
              >
                {dischargeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar Alta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEvolutionOpen} onOpenChange={setIsEvolutionOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Evolução</DialogTitle>
              <DialogDescription>
                Registrar evolução para {selectedHospitalization?.patient?.name}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 p-1">
                <div>
                  <Label htmlFor="evolutionType">Tipo de Evolução</Label>
                  <Select
                    value={evolutionData.evolutionType}
                    onValueChange={(value) => setEvolutionData({ ...evolutionData, evolutionType: value })}
                  >
                    <SelectTrigger data-testid="select-evolution-type">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rotina">Rotina</SelectItem>
                      <SelectItem value="intercorrencia">Intercorrência</SelectItem>
                      <SelectItem value="procedimento">Procedimento</SelectItem>
                      <SelectItem value="visita">Visita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="subjectiveNotes">S - Subjetivo</Label>
                    <Textarea
                      id="subjectiveNotes"
                      value={evolutionData.subjectiveNotes}
                      onChange={(e) => setEvolutionData({ ...evolutionData, subjectiveNotes: e.target.value })}
                      placeholder="Queixas do paciente..."
                      rows={3}
                      data-testid="textarea-subjective"
                    />
                  </div>
                  <div>
                    <Label htmlFor="objectiveNotes">O - Objetivo</Label>
                    <Textarea
                      id="objectiveNotes"
                      value={evolutionData.objectiveNotes}
                      onChange={(e) => setEvolutionData({ ...evolutionData, objectiveNotes: e.target.value })}
                      placeholder="Exame físico, sinais vitais..."
                      rows={3}
                      data-testid="textarea-objective"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="assessment">A - Avaliação</Label>
                    <Textarea
                      id="assessment"
                      value={evolutionData.assessment}
                      onChange={(e) => setEvolutionData({ ...evolutionData, assessment: e.target.value })}
                      placeholder="Avaliação clínica..."
                      rows={3}
                      data-testid="textarea-assessment"
                    />
                  </div>
                  <div>
                    <Label htmlFor="plan">P - Plano</Label>
                    <Textarea
                      id="plan"
                      value={evolutionData.plan}
                      onChange={(e) => setEvolutionData({ ...evolutionData, plan: e.target.value })}
                      placeholder="Plano terapêutico..."
                      rows={3}
                      data-testid="textarea-plan"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="medications">Medicações</Label>
                    <Textarea
                      id="medications"
                      value={evolutionData.medications}
                      onChange={(e) => setEvolutionData({ ...evolutionData, medications: e.target.value })}
                      placeholder="Medicações prescritas..."
                      rows={2}
                      data-testid="textarea-medications"
                    />
                  </div>
                  <div>
                    <Label htmlFor="procedures">Procedimentos</Label>
                    <Textarea
                      id="procedures"
                      value={evolutionData.procedures}
                      onChange={(e) => setEvolutionData({ ...evolutionData, procedures: e.target.value })}
                      placeholder="Procedimentos realizados..."
                      rows={2}
                      data-testid="textarea-procedures"
                    />
                  </div>
                  <div>
                    <Label htmlFor="diet">Dieta</Label>
                    <Textarea
                      id="diet"
                      value={evolutionData.diet}
                      onChange={(e) => setEvolutionData({ ...evolutionData, diet: e.target.value })}
                      placeholder="Orientações de dieta..."
                      rows={2}
                      data-testid="textarea-diet"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="observations">Observações Gerais</Label>
                  <Textarea
                    id="observations"
                    value={evolutionData.observations}
                    onChange={(e) => setEvolutionData({ ...evolutionData, observations: e.target.value })}
                    placeholder="Outras observações..."
                    rows={2}
                    data-testid="textarea-evolution-observations"
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button 
                onClick={() => {
                  if (selectedHospitalization) {
                    createEvolutionMutation.mutate({ 
                      hospitalizationId: selectedHospitalization.id, 
                      data: evolutionData 
                    });
                  }
                }}
                disabled={createEvolutionMutation.isPending}
                data-testid="button-save-evolution"
              >
                {createEvolutionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Evolução
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isNewHospitalizationOpen} onOpenChange={setIsNewHospitalizationOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {newHospitalization.hospitalizationType === "observacao" ? "Nova Observação" : "Nova Internação"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados para registrar {newHospitalization.hospitalizationType === "observacao" ? "uma observação" : "uma internação"}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 p-1">
                <div>
                  <Label>Tipo *</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant={newHospitalization.hospitalizationType === "ativo" ? "default" : "outline"}
                      onClick={() => setNewHospitalization({ ...newHospitalization, hospitalizationType: "ativo" })}
                      className={newHospitalization.hospitalizationType === "ativo" ? "bg-blue-600 hover:bg-blue-700" : ""}
                      data-testid="button-type-internacao"
                    >
                      <Stethoscope className="w-4 h-4 mr-2" />
                      Internação
                    </Button>
                    <Button
                      type="button"
                      variant={newHospitalization.hospitalizationType === "observacao" ? "default" : "outline"}
                      onClick={() => setNewHospitalization({ ...newHospitalization, hospitalizationType: "observacao" })}
                      className={newHospitalization.hospitalizationType === "observacao" ? "bg-purple-600 hover:bg-purple-700" : ""}
                      data-testid="button-type-observacao"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Observação
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="patientId">Paciente *</Label>
                  <Select
                    value={newHospitalization.patientId}
                    onValueChange={(value) => setNewHospitalization({ ...newHospitalization, patientId: value })}
                  >
                    <SelectTrigger data-testid="select-patient">
                      <SelectValue placeholder="Selecione o paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name} - {patient.cpf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bedId">Leito *</Label>
                  <Select
                    value={newHospitalization.bedId}
                    onValueChange={(value) => setNewHospitalization({ ...newHospitalization, bedId: value })}
                  >
                    <SelectTrigger data-testid="select-bed">
                      <SelectValue placeholder="Selecione o leito" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBeds.map((bed) => (
                        <SelectItem key={bed.id} value={bed.id}>
                          {bed.ward?.name} - Leito {bed.bedNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="attendingDoctor">Médico Responsável *</Label>
                  <Select
                    value={newHospitalization.attendingDoctorId}
                    onValueChange={(value) => {
                      const doctor = doctors.find((d: any) => d.id === value);
                      setNewHospitalization({ 
                        ...newHospitalization, 
                        attendingDoctorId: value,
                        attendingDoctorName: doctor?.name || ""
                      });
                    }}
                  >
                    <SelectTrigger data-testid="select-attending-doctor">
                      <SelectValue placeholder="Selecione o médico responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor: any) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name} {doctor.crm ? `- CRM: ${doctor.crm}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="admissionDiagnosis">Diagnóstico de Admissão *</Label>
                  <Textarea
                    id="admissionDiagnosis"
                    value={newHospitalization.admissionDiagnosis}
                    onChange={(e) => setNewHospitalization({ ...newHospitalization, admissionDiagnosis: e.target.value })}
                    placeholder="Descreva o diagnóstico..."
                    rows={2}
                    data-testid="textarea-admission-diagnosis"
                  />
                </div>

                <div>
                  <Label htmlFor="admissionReason">Motivo da Internação *</Label>
                  <Textarea
                    id="admissionReason"
                    value={newHospitalization.admissionReason}
                    onChange={(e) => setNewHospitalization({ ...newHospitalization, admissionReason: e.target.value })}
                    placeholder="Descreva o motivo..."
                    rows={2}
                    data-testid="textarea-admission-reason"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Label htmlFor="cidCode">Código CID</Label>
                    {newHospitalization.cidCode ? (
                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                        <span className="text-sm text-green-700 flex-1">{newHospitalization.cidCode}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          onClick={() => {
                            setNewHospitalization({ ...newHospitalization, cidCode: "" });
                            setCidSearch("");
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Input
                          id="cidCode"
                          value={cidSearch}
                          onChange={(e) => {
                            setCidSearch(e.target.value);
                            setShowCidResults(true);
                          }}
                          onFocus={() => setShowCidResults(true)}
                          placeholder="Digite código ou descrição..."
                          data-testid="input-cid-code"
                          autoComplete="off"
                        />
                        {showCidResults && cidSearch.length >= 2 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {loadingCid ? (
                              <div className="p-2 text-sm text-gray-500">Buscando...</div>
                            ) : cidResults.length > 0 ? (
                              cidResults.map((cid) => (
                                <div
                                  key={cid.code}
                                  className="p-2 text-sm hover:bg-blue-50 cursor-pointer border-b last:border-0"
                                  onClick={() => {
                                    setNewHospitalization({ 
                                      ...newHospitalization, 
                                      cidCode: `${cid.code} - ${cid.description}` 
                                    });
                                    setCidSearch("");
                                    setShowCidResults(false);
                                  }}
                                >
                                  <span className="font-semibold text-blue-600">{cid.code}</span>
                                  <span className="text-gray-600 ml-2">{cid.description}</span>
                                </div>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-gray-500">
                                Nenhum CID encontrado para "{cidSearch}"
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="severity">Gravidade</Label>
                    <Select
                      value={newHospitalization.severity}
                      onValueChange={(value) => setNewHospitalization({ ...newHospitalization, severity: value })}
                    >
                      <SelectTrigger data-testid="select-severity">
                        <SelectValue placeholder="Selecione a gravidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="critica">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="estimatedDischargeDate">Previsão de Alta</Label>
                  <Input
                    id="estimatedDischargeDate"
                    type="date"
                    value={newHospitalization.estimatedDischargeDate}
                    onChange={(e) => setNewHospitalization({ ...newHospitalization, estimatedDischargeDate: e.target.value })}
                    data-testid="input-estimated-discharge"
                  />
                </div>

                <div>
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    value={newHospitalization.observations}
                    onChange={(e) => setNewHospitalization({ ...newHospitalization, observations: e.target.value })}
                    placeholder="Observações adicionais..."
                    rows={2}
                    data-testid="textarea-hospitalization-observations"
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button 
                onClick={() => {
                  if (!newHospitalization.patientId || !newHospitalization.bedId || 
                      !newHospitalization.admissionDiagnosis || !newHospitalization.admissionReason) {
                    toast({ 
                      title: "Preencha todos os campos obrigatórios", 
                      variant: "destructive" 
                    });
                    return;
                  }
                  createHospitalizationMutation.mutate(newHospitalization);
                }}
                disabled={createHospitalizationMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-confirm-hospitalization"
              >
                {createHospitalizationMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Registrar Internação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Registro Clínico */}
        <Dialog open={isFollowUpOpen} onOpenChange={setIsFollowUpOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="flex items-center text-xl">
                <ClipboardPlus className="w-6 h-6 mr-2 text-blue-600" />
                Registro Clínico
              </DialogTitle>
              {selectedHospitalization && (
                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">{selectedHospitalization.patient?.name}</p>
                      <p className="text-sm text-gray-600">
                        {selectedHospitalization.bed?.ward?.name} - Leito {selectedHospitalization.bed?.bedNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getSeverityColor(selectedHospitalization.severity || "media")}>
                        {getSeverityLabel(selectedHospitalization.severity || "media")}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Internado em {selectedHospitalization.admissionDate && format(new Date(selectedHospitalization.admissionDate), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                    <strong>Diagnóstico:</strong> {selectedHospitalization.admissionDiagnosis}
                  </p>
                </div>
              )}
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto py-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Histórico de Atendimentos
                </h3>
                <Button
                  onClick={() => {
                    if (selectedHospitalization) {
                      setLocation(`/prontuario-rapido?hospitalizationId=${selectedHospitalization.id}`);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-add-evolution"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nova Evolução
                </Button>
              </div>

              {loadingMedicalHistory ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : medicalHistoryRecords.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 mb-2">Nenhum atendimento registrado ainda</p>
                  <p className="text-sm text-gray-400">Clique em "Nova Evolução" para registrar o primeiro atendimento</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {medicalHistoryRecords
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((record) => (
                      <Card key={record.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2 flex-wrap gap-1">
                              <Badge variant="outline" className={
                                (record as any).doctorRole === 'triage'
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }>
                                {(record as any).doctorRole === 'triage' ? "Enfermeiro" : "Médico"}
                              </Badge>
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
                              <span className="font-medium">
                                {record.doctorName}
                                {record.doctorRegistration && (
                                  <span className="text-gray-500 text-xs ml-1">
                                    ({(record as any).doctorRole === 'triage' ? 'COREN' : 'CRM'}: {record.doctorRegistration})
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-700">
                                {record.consultationDate && format(new Date(record.consultationDate), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                              <p className="text-xs text-gray-500">
                                {record.startTime ? format(new Date(record.startTime), "HH:mm:ss", { locale: ptBR }) : record.consultationTime}
                              </p>
                            </div>
                          </div>
                          
                          <Badge variant="secondary" className="mb-2">
                            {record.specialty?.name || "Enfermagem"}
                          </Badge>

                          <div className="space-y-2 mt-3 text-sm">
                            {record.reason && (
                              <div>
                                <span className="font-medium text-gray-600">Anamnese:</span>
                                <p className="text-gray-800 ml-2">{record.reason}</p>
                              </div>
                            )}
                            {record.diagnosis && (
                              <div>
                                <span className="font-medium text-gray-600">Diagnóstico:</span>
                                <p className="text-gray-800 ml-2">{record.diagnosis}</p>
                              </div>
                            )}
                            {record.medications && (
                              <div>
                                <span className="font-medium text-gray-600">Medicações:</span>
                                <p className="text-gray-800 ml-2">{record.medications}</p>
                              </div>
                            )}
                            {record.examResults && (
                              <div>
                                <span className="font-medium text-gray-600">Exames:</span>
                                <p className="text-gray-800 ml-2">{record.examResults}</p>
                              </div>
                            )}
                            {record.observations && (
                              <div>
                                <span className="font-medium text-gray-600">Observações:</span>
                                <p className="text-gray-800 ml-2">{record.observations}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedHospitalization(selectedHospitalization);
                  setIsDetailsOpen(true);
                  setIsFollowUpOpen(false);
                }}
              >
                <Eye className="w-4 h-4 mr-1" />
                Ver Detalhes
              </Button>
              {selectedHospitalization?.status === "ativo" && canDischarge && (
                <Button 
                  variant="outline"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  onClick={() => {
                    setIsDischargeOpen(true);
                    setIsFollowUpOpen(false);
                  }}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Dar Alta
                </Button>
              )}
              <DialogClose asChild>
                <Button variant="default">Fechar</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
