import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { type AppointmentWithDetails } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, ArrowLeft, LogOut, Filter, CheckCircle, XCircle, RefreshCw, Stethoscope } from "lucide-react";
import AppointmentTable from "@/components/appointment-table";
import { formatDate, formatTime } from "@/lib/utils";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";

export default function AdminAppointments() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [filterDate, setFilterDate] = useState("");
  const [viewMode, setViewMode] = useState<"today" | "all">("today");

  const { data: appointments = [], isLoading } = useQuery<AppointmentWithDetails[]>({
    queryKey: ["/api/appointments"],
  });

  // Filtrar agendamentos baseado no modo de visualização e data
  const filteredAppointments = appointments.filter(appointment => {
    const appointmentDate = appointment.appointmentDate;
    const today = new Date().toISOString().split('T')[0];
    
    // Se está no modo "hoje", mostrar apenas agendamentos de hoje
    if (viewMode === "today") {
      return appointmentDate === today;
    }
    
    // Se há filtro de data, aplicar
    if (filterDate) {
      return appointmentDate === filterDate;
    }
    
    return true;
  });

  // Função para comparar especialidades de forma flexível
  const matchSpecialty = (appointmentSpecialty: string, userSpecialty: string): boolean => {
    if (appointmentSpecialty === userSpecialty) return true;
    
    // Mapeamento de especialidades flexível para variações comuns
    const specialtyMappings: Record<string, string[]> = {
      'Cardiologia': ['Cardiologista', 'Cardiologia'],
      'Dermatologia': ['Dermatologista', 'Dermatologia'],
      'Neurologia': ['Neurologista', 'Neurologia'],
      'Ortopedia': ['Ortopedista', 'Ortopedia'],
      'Pediatria': ['Pediatra', 'Pediatria'],
      'Psiquiatria': ['Psiquiatra', 'Psiquiatria'],
      'Urologia': ['Urologista', 'Urologia'],
      'Ginecologia': ['Ginecologista', 'Ginecologia'],
      'Endocrinologia': ['Endocrinologista', 'Endocrinologia']
    };
    
    // Verifica se há correspondência em qualquer direção
    for (const [baseSpecialty, variations] of Object.entries(specialtyMappings)) {
      if (variations.includes(appointmentSpecialty) && variations.includes(userSpecialty)) {
        return true;
      }
    }
    
    return false;
  };

  // Filtrar por médico se for um usuário médico
  const userFilteredAppointments = user?.role === 'doctor' 
    ? filteredAppointments.filter(appointment => 
        appointment.specialty?.name && user.medicalSpecialty &&
        matchSpecialty(appointment.specialty.name, user.medicalSpecialty)
      )
    : filteredAppointments;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      scheduled: "bg-blue-100 text-blue-800",
      rescheduled: "bg-yellow-100 text-yellow-800", 
      cancelled: "bg-red-100 text-red-800",
      completed: "bg-green-100 text-green-800"
    };
    
    const statusLabels = {
      scheduled: "Agendado",
      rescheduled: "Reagendado",
      cancelled: "Cancelado", 
      completed: "Realizado"
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.scheduled}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Badge>
    );
  };

  const todayAppointments = appointments.filter(apt => 
    apt.appointmentDate === new Date().toISOString().split('T')[0]
  ).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments}</div>
              <p className="text-xs text-muted-foreground">
                Consultas marcadas para hoje
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Exibidos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userFilteredAppointments.length}</div>
              <p className="text-xs text-muted-foreground">
                {viewMode === "today" ? "Agendamentos hoje" : "Total de agendamentos"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modo de Visualização</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-x-2">
                <Button
                  variant={viewMode === "today" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("today")}
                  data-testid="button-view-today"
                >
                  Hoje
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                  data-testid="button-view-all"
                >
                  Todos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        {viewMode === "all" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>
                Filtre os agendamentos por data específica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <Input
                    type="date"
                    placeholder="Data do agendamento"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    data-testid="input-filter-date"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setFilterDate("")}
                  data-testid="button-clear-filter"
                >
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Agendamentos */}
        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === "today" 
                ? `Agendamentos de Hoje (${userFilteredAppointments.length})`
                : `Agendamentos (${userFilteredAppointments.length})`}
            </CardTitle>
            <CardDescription>
              {user?.role === 'doctor' 
                ? `Exibindo agendamentos da especialidade: ${user.medicalSpecialty}`
                : "Gerencie os agendamentos do hospital"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userFilteredAppointments.length === 0 ? (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum agendamento encontrado
                </h3>
                <p className="text-gray-600">
                  {viewMode === "today" 
                    ? "Não há agendamentos para hoje."
                    : "Não há agendamentos que correspondam aos filtros selecionados."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Especialidade</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Motivo</TableHead>
                      {user?.role === 'doctor' && <TableHead className="text-center">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userFilteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">
                          {appointment.patient?.name || appointment.patientName || "Paciente"}
                        </TableCell>
                        <TableCell>{appointment.specialty?.name || "Não informado"}</TableCell>
                        <TableCell>{formatDate(appointment.appointmentDate)}</TableCell>
                        <TableCell>{formatTime(appointment.appointmentTime)}</TableCell>
                        <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {appointment.reason}
                        </TableCell>
                        {user?.role === 'doctor' && (
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                              onClick={() => setLocation(`/prontuario-rapido?appointmentId=${appointment.id}`)}
                              data-testid={`button-attend-${appointment.id}`}
                            >
                              <Stethoscope className="mr-2 h-4 w-4" />
                              Atender Agora
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Componente de Tabela Completa (para funcionalidades avançadas) */}
        {user?.role !== 'viewer' && user?.role !== 'doctor' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Gerenciamento Avançado</CardTitle>
              <CardDescription>
                Funcionalidades completas para gerenciar agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentTable />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}