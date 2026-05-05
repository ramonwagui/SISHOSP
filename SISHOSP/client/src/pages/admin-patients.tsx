import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Patient } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCPF } from "@/lib/utils";
import { Plus, Search, Edit, Trash2, User, Phone, MapPin, ArrowLeft, FileText, Calendar, Baby, Accessibility, LogOut, Eye } from "lucide-react";
import { useLocation } from "wouter";

interface AuthUser {
  id: string;
  name: string;
  role: string;
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PatientForm from "@/components/patient-form";

export default function AdminPatients() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isNewPatientDialogOpen, setIsNewPatientDialogOpen] = useState(false);
  const [isNewRNDialogOpen, setIsNewRNDialogOpen] = useState(false);
  const [isNewPcDDialogOpen, setIsNewPcDDialogOpen] = useState(false);

  // Fetch current user
  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/user"],
  });

  // Check if user can edit/delete patients (only staff and admin)
  const canEditPatients = user?.role === 'admin' || user?.role === 'staff';

  // Fetch patients
  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: string) => {
      return await apiRequest(`/api/patients/${patientId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Paciente excluído com sucesso!",
        description: "O paciente foi removido do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir paciente",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  // Filter patients based on search term
  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf.includes(searchTerm) ||
      patient.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsEditDialogOpen(true);
  };

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsViewDialogOpen(true);
  };

  const handleDeletePatient = (patientId: string) => {
    deletePatientMutation.mutate(patientId);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setSelectedPatient(null);
  };

  const handleNewPatientSuccess = () => {
    setIsNewPatientDialogOpen(false);
  };

  const handleNewRNSuccess = () => {
    setIsNewRNDialogOpen(false);
  };

  const handleNewPcDSuccess = () => {
    setIsNewPcDDialogOpen(false);
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gerenciamento de Pacientes</h1>
          <p className="text-gray-500">Visualize e gerencie todos os pacientes cadastrados no sistema.</p>
        </div>
      </div>
      
      <Card className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
          <CardTitle className="text-xl font-semibold">
            <div className="flex items-center gap-3">
              Pacientes Cadastrados
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                {patients.length} total
              </span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          {/* Search and Add Patient */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, CPF ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-patients"
              />
            </div>
            
            <div className="flex gap-2">
              <Dialog open={isNewPatientDialogOpen} onOpenChange={setIsNewPatientDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700" data-testid="button-add-patient">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Paciente
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
                  </DialogHeader>
                  <PatientForm onSuccess={handleNewPatientSuccess} />
                </DialogContent>
              </Dialog>

              <Dialog open={isNewRNDialogOpen} onOpenChange={setIsNewRNDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-teal-600 hover:bg-teal-700" data-testid="button-add-newborn">
                    <Baby className="h-4 w-4 mr-2" />
                    Novo RN
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <PatientForm 
                    formMode="newbornOnly"
                    onSuccess={handleNewRNSuccess} 
                    submitLabel="Cadastrar Recém-Nascido"
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={isNewPcDDialogOpen} onOpenChange={setIsNewPcDDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700" data-testid="button-add-pcd">
                    <Accessibility className="h-4 w-4 mr-2" />
                    Novo PcD
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <PatientForm 
                    formMode="pcdOnly"
                    onSuccess={handleNewPcDSuccess} 
                    submitLabel="Cadastrar Pessoa com Deficiência"
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Patients Table */}
          {!searchTerm ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Pesquise um paciente
              </h3>
              <p className="text-gray-500">
                Digite o nome, CPF ou cidade no campo de busca acima para encontrar pacientes.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center py-8">
              <p className="text-gray-500">Carregando pacientes...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum paciente encontrado
              </h3>
              <p className="text-gray-500">
                Tente uma busca diferente ou cadastre um novo paciente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prontuário</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Zona</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => {
                    const birthDate = new Date(patient.birthDate);
                    const age = new Date().getFullYear() - birthDate.getFullYear();
                    
                    const createdAtDate = patient.createdAt ? new Date(patient.createdAt) : null;
                    const formattedCreatedAt = createdAtDate 
                      ? createdAtDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '-';
                    
                    return (
                      <TableRow key={patient.id} data-testid={`row-patient-${patient.id}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span className="text-blue-600 font-semibold">
                              {patient.medicalRecordNumber || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {patient.isNewborn ? (
                              <Baby className="h-4 w-4 text-teal-500" />
                            ) : patient.isPcd ? (
                              <Accessibility className="h-4 w-4 text-purple-500" />
                            ) : (
                              <User className="h-4 w-4 text-gray-400" />
                            )}
                            <span>{patient.name}</span>
                            {patient.isNewborn && (
                              <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100 text-xs">RN</Badge>
                            )}
                            {patient.isPcd && (
                              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">PcD</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatCPF(patient.cpf)}</TableCell>
                        <TableCell>{age} anos</TableCell>
                        <TableCell>
                          <Badge variant={patient.gender === "masculino" ? "default" : "secondary"}>
                            {patient.gender === "masculino" ? "M" : "F"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {patient.whatsapp}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            {patient.city}, {patient.state}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={patient.zoneType === "urbana" ? "default" : "outline"}>
                            {patient.zoneType === "urbana" ? "Urbana" : "Rural"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            {formattedCreatedAt}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEditPatients ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditPatient(patient)}
                                  data-testid={`button-edit-patient-${patient.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                      data-testid={`button-delete-patient-${patient.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir paciente</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir o paciente <strong>{patient.name}</strong>?
                                        Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeletePatient(patient.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewPatient(patient)}
                                data-testid={`button-view-patient-${patient.id}`}
                                title="Visualizar paciente"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <PatientForm
              initialData={selectedPatient as any}
              onSuccess={handleEditSuccess}
              submitLabel="Atualizar Paciente"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Patient Dialog (Read-only) */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Dados do Paciente
            </DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Nome Completo</p>
                  <p className="text-sm font-semibold">{selectedPatient.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">CPF</p>
                  <p className="text-sm font-semibold">{formatCPF(selectedPatient.cpf)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Data de Nascimento</p>
                  <p className="text-sm font-semibold">{selectedPatient.birthDate}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Gênero</p>
                  <p className="text-sm font-semibold">{selectedPatient.gender === "masculino" ? "Masculino" : "Feminino"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">WhatsApp</p>
                  <p className="text-sm font-semibold">{selectedPatient.whatsapp}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Nome da Mãe</p>
                  <p className="text-sm font-semibold">{selectedPatient.motherName || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Cartão SUS</p>
                  <p className="text-sm font-semibold">{selectedPatient.susCard || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Prontuário</p>
                  <p className="text-sm font-semibold">{selectedPatient.medicalRecordNumber || "-"}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-2">Endereço</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Logradouro</p>
                    <p className="text-sm font-semibold">{selectedPatient.address}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Número</p>
                    <p className="text-sm font-semibold">{selectedPatient.addressNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Bairro</p>
                    <p className="text-sm font-semibold">{selectedPatient.neighborhood}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Cidade/UF</p>
                    <p className="text-sm font-semibold">{selectedPatient.city}, {selectedPatient.state}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Zona</p>
                    <p className="text-sm font-semibold">{selectedPatient.zoneType === "urbana" ? "Urbana" : "Rural"}</p>
                  </div>
                </div>
              </div>

              {selectedPatient.isNewborn && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-pink-700 mb-2 flex items-center gap-2">
                    <Baby className="h-4 w-4" /> Dados do Recém-Nascido
                  </h4>
                  <div className="grid grid-cols-2 gap-4 bg-pink-50 p-3 rounded-lg">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Peso ao Nascer</p>
                      <p className="text-sm font-semibold">{selectedPatient.birthWeight ? `${selectedPatient.birthWeight}kg` : "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Prematuro</p>
                      <p className="text-sm font-semibold">{selectedPatient.isPremature ? "Sim" : "Não"}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedPatient.isPcd && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-purple-700 mb-2 flex items-center gap-2">
                    <Accessibility className="h-4 w-4" /> Pessoa com Deficiência
                  </h4>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Tipo de Deficiência</p>
                      <p className="text-sm font-semibold">{selectedPatient.disabilityType || "-"}</p>
                    </div>
                    {selectedPatient.pcdObservation && (
                      <div className="space-y-1 mt-2">
                        <p className="text-sm font-medium text-gray-500">Observações</p>
                        <p className="text-sm font-semibold">{selectedPatient.pcdObservation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}