import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, logout } from "@/lib/auth";
import { Calendar, Stethoscope, BarChart3, LogOut, User, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppointmentTable from "@/components/appointment-table";
import SpecialtyManagement from "@/components/specialty-management";
import PatientManagement from "@/components/patient-management";
import ReportsTab from "@/components/reports-tab";
import IntegrationStatus from "@/components/integration-status";

interface DashboardStats {
  todayAppointments: number;
  monthlyAppointments: number;
  totalSpecialties: number;
  pendingAppointments: number;
  appointmentsBySpecialty: Array<{
    specialty: string;
    count: number;
  }>;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    if (!user) {
      setLocation("/admin/login");
    }
  }, [user, setLocation]);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/reports/stats"],
  });

  const handleLogout = () => {
    logout();
    setUser(null);
    setLocation("/admin/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Painel Administrativo</h2>
              <p className="text-gray-600">Gerencie agendamentos e especialidades</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Integration Status */}
        <IntegrationStatus className="mb-6" />
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="text-blue-600 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Agendamentos Hoje</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-today-appointments">
                    {stats?.todayAppointments || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="text-green-600 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Este Mês</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-monthly-appointments">
                    {stats?.monthlyAppointments || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Stethoscope className="text-purple-600 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Especialidades</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-specialties">
                    {stats?.totalSpecialties || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="text-orange-600 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Pendentes</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-pending-appointments">
                    {stats?.pendingAppointments || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Card>
          <Tabs defaultValue="appointments" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="appointments" data-testid="tab-appointments">
                  <Calendar className="mr-2 h-4 w-4" />
                  Agendamentos
                </TabsTrigger>
                <TabsTrigger value="patients" data-testid="tab-patients">
                  <User className="mr-2 h-4 w-4" />
                  Pacientes
                </TabsTrigger>
                <TabsTrigger value="specialties" data-testid="tab-specialties">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Especialidades
                </TabsTrigger>
                <TabsTrigger value="reports" data-testid="tab-reports">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Relatórios
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="appointments" className="mt-0">
                <AppointmentTable />
              </TabsContent>

              <TabsContent value="patients" className="mt-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Gerenciamento de Pacientes</h3>
                    <Button 
                      onClick={() => window.location.href = '/admin/patients'}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Ver Todos os Pacientes
                    </Button>
                  </div>
                  <p className="text-gray-600">
                    Acesse a área completa de gerenciamento de pacientes para visualizar, 
                    cadastrar, editar e excluir registros de pacientes.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="specialties" className="mt-0">
                <SpecialtyManagement />
              </TabsContent>

              <TabsContent value="reports" className="mt-0">
                <ReportsTab stats={stats} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
