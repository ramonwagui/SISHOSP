import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type AppointmentWithDetails } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, formatTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Filter, Calendar, FileText, MessageCircle } from "lucide-react";
import EditAppointmentDialog from "./edit-appointment-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AppointmentTable() {
  const [filterDate, setFilterDate] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery<AppointmentWithDetails[]>({
    queryKey: ["/api/appointments"],
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/appointments/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({
        title: "Agendamento cancelado",
        description: "O agendamento foi cancelado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cancelar agendamento",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async ({ appointmentId, type }: { appointmentId: string; type: string }) => {
      return apiRequest(`/api/whatsapp/send-reminder/${appointmentId}`, { method: 'POST', body: { type } });
    },
    onSuccess: (data: any) => {
      toast({
        title: "WhatsApp enviado",
        description: data.message || "Lembrete enviado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar WhatsApp",
        description: error.message || "Não foi possível enviar o lembrete.",
        variant: "destructive",
      });
    },
  });

  const filteredAppointments = appointments.filter((appointment) => {
    if (!filterDate) return true;
    return appointment.appointmentDate === filterDate;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "scheduled":
        return "default";
      case "rescheduled":
        return "secondary";
      case "completed":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusBadgeClassName = (status: string) => {
    switch (status) {
      case "scheduled":
        return "badge-scheduled";
      case "rescheduled":
        return "badge-rescheduled";
      case "completed":
        return "badge-completed";
      case "cancelled":
        return "badge-cancelled";
      default:
        return "badge-scheduled";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "scheduled":
        return "Agendado";
      case "rescheduled":
        return "Reagendado";
      case "completed":
        return "Realizado";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  const openPrintableDocument = (appointmentId: string) => {
    try {
      // Abre o comprovante em nova janela para impressão
      const url = `/api/appointments/${appointmentId}/pdf`;
      const newWindow = window.open(url, '_blank', 'width=800,height=600');
      
      if (!newWindow) {
        toast({
          title: "Bloqueador de popup",
          description: "Por favor, permita popups e tente novamente.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Comprovante aberto",
        description: "Use o botão de imprimir na nova janela para salvar como PDF.",
      });
    } catch (error) {
      toast({
        title: "Erro ao abrir comprovante",
        description: "Não foi possível abrir o documento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h3 className="text-xl font-semibold text-gray-900">Agendamentos</h3>
        <div className="flex space-x-3">
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            data-testid="input-filter-date"
          />
          <Button
            variant="outline"
            onClick={() => setFilterDate("")}
            className="bg-blue-600 text-white hover:bg-blue-700"
            data-testid="button-clear-filter"
          >
            <Filter className="mr-2 h-4 w-4" />
            Limpar Filtro
          </Button>
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento encontrado</h3>
          <p className="text-gray-500">
            {filterDate ? "Não há agendamentos para a data selecionada." : "Ainda não há agendamentos cadastrados."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left font-semibold text-gray-600">Paciente</TableHead>
                <TableHead className="text-left font-semibold text-gray-600">CPF</TableHead>
                <TableHead className="text-left font-semibold text-gray-600">Especialidade</TableHead>
                <TableHead className="text-left font-semibold text-gray-600">Data/Hora</TableHead>
                <TableHead className="text-left font-semibold text-gray-600">WhatsApp</TableHead>
                <TableHead className="text-left font-semibold text-gray-600">Status</TableHead>
                <TableHead className="text-left font-semibold text-gray-600">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.map((appointment) => (
                <TableRow key={appointment.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium text-gray-900" data-testid={`appointment-name-${appointment.id}`}>
                        {appointment.patient?.name || appointment.patientName || 'Paciente não identificado'}
                      </div>
                      <div className="text-sm text-gray-500" title={appointment.reason}>
                        {appointment.reason.length > 50
                          ? `${appointment.reason.substring(0, 50)}...`
                          : appointment.reason}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-900" data-testid={`appointment-cpf-${appointment.id}`}>
                    {appointment.patient?.cpf || appointment.patientCpf || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-800"
                      data-testid={`appointment-specialty-${appointment.id}`}
                    >
                      {appointment.specialty?.name || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-900">
                    <div data-testid={`appointment-date-${appointment.id}`}>
                      {formatDate(appointment.appointmentDate)}
                    </div>
                    <div className="text-gray-500" data-testid={`appointment-time-${appointment.id}`}>
                      {formatTime(appointment.appointmentTime)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-900" data-testid={`appointment-whatsapp-${appointment.id}`}>
                    {appointment.patient?.whatsapp || appointment.patientWhatsapp || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusBadgeVariant(appointment.status)}
                      className={getStatusBadgeClassName(appointment.status)}
                      data-testid={`appointment-status-${appointment.id}`}
                    >
                      {getStatusLabel(appointment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <EditAppointmentDialog appointment={appointment} />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPrintableDocument(appointment.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        data-testid={`button-download-pdf-${appointment.id}`}
                        title="Abrir comprovante para impressão"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sendWhatsAppMutation.mutate({ appointmentId: appointment.id, type: 'confirmation' })}
                        disabled={sendWhatsAppMutation.isPending || !(appointment.patient?.whatsapp || appointment.patientWhatsapp)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        data-testid={`button-whatsapp-${appointment.id}`}
                        title={!(appointment.patient?.whatsapp || appointment.patientWhatsapp) ? "WhatsApp não disponível" : "Enviar confirmação por WhatsApp"}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-${appointment.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja cancelar o agendamento de {appointment.patientName}? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-${appointment.id}`}>
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteAppointmentMutation.mutate(appointment.id)}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid={`button-confirm-delete-${appointment.id}`}
                            >
                              Confirmar Cancelamento
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