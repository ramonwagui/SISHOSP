import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, Home, LogOut, Search, Clock, User, Stethoscope, ClipboardPlus, UserCheck, Loader2, AlertTriangle, Bed, Plus, FileText } from "lucide-react";
import type { SelectHospitalization, Patient, SelectHospitalBed } from "@shared/schema";

type ObservationPatient = SelectHospitalization & {
  patient?: Patient;
  bed?: { bedNumber: string; ward?: { name: string } };
  attendingDoctor?: { name: string };
};

type AvailableBed = SelectHospitalBed & {
  ward?: { name: string };
};

export default function ObservacaoPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Apenas médicos e admins podem dar alta
  const canDischarge = user?.role === "doctor" || user?.role === "admin";
  const [bedDialogOpen, setBedDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ObservationPatient | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string>("");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const { data: observationPatients = [], isLoading } = useQuery<ObservationPatient[]>({
    queryKey: ["/api/hospitalizations/observation"],
  });

  const { data: availableBeds = [] } = useQuery<AvailableBed[]>({
    queryKey: ["/api/hospital/beds/available"],
  });

  const { data: medicalHistoryRecords = [], isLoading: loadingMedicalHistory } = useQuery<any[]>({
    queryKey: ["/api/hospitalizations", selectedPatient?.id, "medical-history"],
    enabled: !!selectedPatient?.id && detailsDialogOpen,
  });

  const transferToHospitalizationMutation = useMutation({
    mutationFn: async ({ hospitalizationId, bedId }: { hospitalizationId: string; bedId: string }) => {
      return await apiRequest(`/api/hospitalizations/${hospitalizationId}/transfer`, {
        method: "POST",
        body: { newStatus: "ativo", bedId },
      });
    },
    onSuccess: (data: any) => {
      toast({ title: "Sucesso", description: data.message || "Paciente internado com sucesso!" });
      setBedDialogOpen(false);
      setSelectedPatient(null);
      setSelectedBedId("");
      queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations/observation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/beds/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/beds/all"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const handleConvertToHospitalization = (patient: ObservationPatient) => {
    setSelectedPatient(patient);
    setSelectedBedId("");
    setBedDialogOpen(true);
  };

  const handleOpenDetails = (patient: ObservationPatient) => {
    setSelectedPatient(patient);
    setDetailsDialogOpen(true);
  };

  const handleConfirmHospitalization = () => {
    if (!selectedPatient || !selectedBedId) {
      toast({ title: "Erro", description: "Selecione um leito para internar o paciente", variant: "destructive" });
      return;
    }
    transferToHospitalizationMutation.mutate({
      hospitalizationId: selectedPatient.id,
      bedId: selectedBedId,
    });
  };

  const dischargeFromObservationMutation = useMutation({
    mutationFn: async (hospitalizationId: string) => {
      return await apiRequest(`/api/hospitalizations/${hospitalizationId}/discharge`, {
        method: "POST",
        body: { dischargeType: "alta_medica", dischargeSummary: "Alta da observação" },
      });
    },
    onSuccess: () => {
      toast({ title: "Paciente liberado da observação!" });
      queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations/observation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/beds/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/beds/available"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const transferToRedRoomMutation = useMutation({
    mutationFn: async (hospitalizationId: string) => {
      return await apiRequest(`/api/hospitalizations/${hospitalizationId}/transfer`, {
        method: "POST",
        body: { newStatus: "sala_vermelha" },
      });
    },
    onSuccess: (data: any) => {
      toast({ title: "Sucesso", description: data.message || "Paciente transferido para Sala Vermelha!" });
      queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations/observation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospitalizations/red-room"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const filteredPatients = observationPatients.filter(p => 
    p.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient?.medicalRecordNumber?.includes(searchTerm)
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "baixa": return "bg-green-100 text-green-700";
      case "media": return "bg-yellow-100 text-yellow-700";
      case "alta": return "bg-orange-100 text-orange-700";
      case "critica": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getTimeInObservation = (admissionDate: string | Date) => {
    const admission = new Date(admissionDate);
    const now = new Date();
    const diffMs = now.getTime() - admission.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}min`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
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
              <h1 className="text-3xl font-bold text-purple-900 flex items-center gap-2">
                <Eye className="w-8 h-8" />
                Sala de Observação
              </h1>
              <p className="text-purple-600">Pacientes em observação médica</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setLocation('/sala-vermelha')}
              data-testid="button-sala-vermelha"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Sala Vermelha
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/internacao')}
              data-testid="button-internacao"
            >
              <Stethoscope className="w-4 h-4 mr-2" />
              Internação
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200">Total em Observação</p>
                  <p className="text-4xl font-bold">{observationPatients.length}</p>
                </div>
                <Eye className="w-12 h-12 text-purple-300" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600">Aguardando Decisão</p>
                  <p className="text-4xl font-bold text-purple-700">
                    {observationPatients.filter(p => {
                      const hours = (new Date().getTime() - new Date(p.admissionDate).getTime()) / (1000 * 60 * 60);
                      return hours > 6;
                    }).length}
                  </p>
                </div>
                <Clock className="w-12 h-12 text-purple-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Mais de 6 horas</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600">Críticos</p>
                  <p className="text-4xl font-bold text-red-600">
                    {observationPatients.filter(p => p.severity === "critica" || p.severity === "alta").length}
                  </p>
                </div>
                <User className="w-12 h-12 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Pacientes em Observação
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Eye className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Nenhum paciente em observação</p>
                <p className="text-sm">Pacientes em observação aparecerão aqui</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Ordem</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Prontuário</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Gravidade</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients
                    .sort((a, b) => new Date(a.admissionDate).getTime() - new Date(b.admissionDate).getTime())
                    .map((patient, index) => (
                    <TableRow key={patient.id} data-testid={`row-observation-${patient.id}`} className="cursor-pointer hover:bg-purple-50" onClick={() => handleOpenDetails(patient)}>
                      <TableCell>
                        <Badge className="bg-purple-600 text-white font-bold">
                          #{String(index + 1).padStart(3, '0')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            patient.patient?.gender === "masculino" ? "bg-blue-500" : "bg-pink-500"
                          }`} />
                          <span className="font-medium">{patient.patient?.name || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{patient.patient?.medicalRecordNumber || "-"}</TableCell>
                      <TableCell>{patient.attendingDoctorName || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{getTimeInObservation(patient.admissionDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(patient.severity || "media")}>
                          {patient.severity === "baixa" ? "Baixa" :
                           patient.severity === "media" ? "Média" :
                           patient.severity === "alta" ? "Alta" : "Crítica"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={patient.admissionReason}>
                        {patient.admissionReason}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/prontuario-rapido?hospitalizationId=${patient.id}`)}
                            data-testid={`button-evolve-${patient.id}`}
                          >
                            <ClipboardPlus className="w-4 h-4 mr-1" />
                            Evoluir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 border-red-200"
                            onClick={() => transferToRedRoomMutation.mutate(patient.id)}
                            disabled={transferToRedRoomMutation.isPending}
                            data-testid={`button-sala-vermelha-${patient.id}`}
                          >
                            {transferToRedRoomMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                Sala Vermelha
                              </>
                            )}
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleConvertToHospitalization(patient)}
                            data-testid={`button-internar-${patient.id}`}
                          >
                            <Stethoscope className="w-4 h-4 mr-1" />
                            Internar
                          </Button>
                          {canDischarge && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => dischargeFromObservationMutation.mutate(patient.id)}
                              disabled={dischargeFromObservationMutation.isPending}
                              data-testid={`button-alta-${patient.id}`}
                            >
                              {dischargeFromObservationMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  Alta
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={bedDialogOpen} onOpenChange={setBedDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bed className="w-5 h-5 text-blue-600" />
              Selecionar Leito para Internação
            </DialogTitle>
            <DialogDescription>
              {selectedPatient && (
                <>Paciente: <strong>{selectedPatient.patient?.name}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bed-select">Leito Disponível</Label>
              <Select value={selectedBedId} onValueChange={setSelectedBedId}>
                <SelectTrigger id="bed-select" data-testid="select-bed">
                  <SelectValue placeholder="Selecione um leito..." />
                </SelectTrigger>
                <SelectContent>
                  {availableBeds.length === 0 ? (
                    <SelectItem value="none" disabled>Nenhum leito disponível</SelectItem>
                  ) : (
                    availableBeds.map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>
                        {bed.ward?.name || "Enfermaria"} - Leito {bed.bedNumber}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBedDialogOpen(false)}
              data-testid="button-cancel-hospitalization"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmHospitalization}
              disabled={!selectedBedId || transferToHospitalizationMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-confirm-hospitalization"
            >
              {transferToHospitalizationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Internando...
                </>
              ) : (
                <>
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Confirmar Internação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center text-xl">
              <ClipboardPlus className="w-6 h-6 mr-2 text-purple-600" />
              Registro Clínico
            </DialogTitle>
            {selectedPatient && (
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">{selectedPatient.patient?.name}</p>
                    <p className="text-sm text-gray-600">
                      Prontuário: {selectedPatient.patient?.medicalRecordNumber || "-"}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={getSeverityColor(selectedPatient.severity || "media")}>
                      {selectedPatient.severity === "baixa" ? "Baixa" :
                       selectedPatient.severity === "media" ? "Média" :
                       selectedPatient.severity === "alta" ? "Alta" : "Crítica"}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Admitido em {selectedPatient.admissionDate && format(new Date(selectedPatient.admissionDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                  <strong>Motivo:</strong> {selectedPatient.admissionReason || "-"}
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
                  if (selectedPatient) {
                    setLocation(`/prontuario-rapido?hospitalizationId=${selectedPatient.id}`);
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-add-evolution-dialog"
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
                    <Card key={record.id} className="border-l-4 border-l-purple-500">
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
            <DialogClose asChild>
              <Button variant="default">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
