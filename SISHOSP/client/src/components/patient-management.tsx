import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Patient } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, Search, Users, Phone, MapPin, IdCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function PatientManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/patients/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({
        title: "Paciente removido",
        description: "O paciente foi removido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover paciente",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const filteredPatients = patients.filter((patient) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      patient.name.toLowerCase().includes(search) ||
      patient.cpf.includes(search) ||
      patient.city.toLowerCase().includes(search) ||
      patient.whatsapp.includes(search)
    );
  });

  const getGenderLabel = (gender: string) => {
    return gender === "masculino" ? "M" : "F";
  };

  const getZoneLabel = (zoneType: string) => {
    return zoneType === "urbana" ? "Urbana" : "Rural";
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando pacientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Users className="mr-2 h-6 w-6 text-blue-600" />
            Gerenciamento de Pacientes
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {patients.length} paciente{patients.length !== 1 ? 's' : ''} cadastrado{patients.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, CPF, cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              data-testid="input-search-patients"
            />
          </div>
          
          <Button
            onClick={() => window.location.href = '/patient-registration'}
            className="bg-green-600 text-white hover:bg-green-700 flex items-center"
            data-testid="button-add-patient"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Paciente
          </Button>
        </div>
      </div>

      {filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? "Tente ajustar os termos de busca." 
                : "Comece cadastrando o primeiro paciente do sistema."
              }
            </p>
            {!searchTerm && (
              <Button
                onClick={() => window.location.href = '/patient-registration'}
                className="bg-blue-600 text-white hover:bg-blue-700"
                data-testid="button-add-first-patient"
              >
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeiro Paciente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-left font-semibold text-gray-700">Paciente</TableHead>
                <TableHead className="text-left font-semibold text-gray-700">Documentos</TableHead>
                <TableHead className="text-left font-semibold text-gray-700">Contato</TableHead>
                <TableHead className="text-left font-semibold text-gray-700">Endereço</TableHead>
                <TableHead className="text-left font-semibold text-gray-700">Dados</TableHead>
                <TableHead className="text-center font-semibold text-gray-700">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow key={patient.id} className="hover:bg-gray-50 border-b border-gray-200">
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium text-gray-900" data-testid={`patient-name-${patient.id}`}>
                        {patient.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {calculateAge(patient.birthDate)} anos • {getGenderLabel(patient.gender)}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center text-gray-900" data-testid={`patient-cpf-${patient.id}`}>
                        <IdCard className="mr-1 h-3 w-3 text-gray-400" />
                        {patient.cpf}
                      </div>
                      <div className="text-gray-600" data-testid={`patient-rg-${patient.id}`}>
                        RG: {patient.rg}
                      </div>
                      <div className="text-gray-600" data-testid={`patient-sus-${patient.id}`}>
                        SUS: {patient.susCard}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center text-sm text-gray-900" data-testid={`patient-whatsapp-${patient.id}`}>
                      <Phone className="mr-1 h-3 w-3 text-green-600" />
                      {patient.whatsapp}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center text-gray-900" data-testid={`patient-address-${patient.id}`}>
                        <MapPin className="mr-1 h-3 w-3 text-blue-600" />
                        {patient.address}, {patient.addressNumber}
                      </div>
                      <div className="text-gray-600" data-testid={`patient-neighborhood-${patient.id}`}>
                        {patient.neighborhood} • {patient.city}/{patient.state}
                      </div>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        data-testid={`patient-zone-${patient.id}`}
                      >
                        {getZoneLabel(patient.zoneType)}
                      </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-600" data-testid={`patient-birth-${patient.id}`}>
                      {formatDate(patient.birthDate)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        data-testid={`button-edit-patient-${patient.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-patient-${patient.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Paciente</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover {patient.name} do sistema? 
                              Esta ação não pode ser desfeita e todos os agendamentos associados serão perdidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-patient-${patient.id}`}>
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePatientMutation.mutate(patient.id)}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid={`button-confirm-delete-patient-${patient.id}`}
                            >
                              Confirmar Remoção
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}