import { useAuth } from "@/hooks/useAuth.tsx";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Stethoscope, LogOut, User, FileText, BarChart3, MessageCircle, Star, Shield, ClipboardList, TrendingUp, TrendingDown, Clock, Activity, AlertCircle, CheckCircle, XCircle, BookOpen, ListOrdered, UserCheck, Pill, Bed, Building2, Database, HardDrive, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import WardManagement from "@/components/ward-management";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AppointmentForm from "@/components/appointment-form";
import AppointmentTable from "@/components/appointment-table";
import GoogleCalendar from "@/components/google-calendar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";
import { APP_VERSION } from "@/lib/version";
import exuBemCuidadaLogo from "@assets/logo exubemcuidada_1762210247656.png";
import secretariaSaudeLogo from "@assets/logo secretaria de saude_1762210247656.png";
import ministerioSaudeLogo from "@assets/Ministério_da_Saúde_1762210247657.png";
import susLogo from "@assets/sus-logo_1762210247657.png";

interface DoctorMetrics {
  today: {
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    pending: number;
  };
  week: {
    total: number;
    completed: number;
    performance: string;
  };
  month: {
    total: number;
    completed: number;
    performance: string;
  };
  patients: {
    newThisMonth: number;
    returning: number;
    total: number;
  };
  documents: {
    total: number;
    receitas: number;
    atestados: number;
    laudos: number;
  };
  triage: {
    total: number;
    bySeverity: {
      baixa: number;
      média: number;
      alta: number;
      emergência: number;
    };
  };
  upcoming: Array<{
    id: string;
    date: string;
    time: string;
    patient: string;
    reason: string;
  }>;
  avgConsultationTime: number;
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch doctor metrics
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery<DoctorMetrics>({
    queryKey: ["/api/doctor-metrics"],
    enabled: (user as any)?.role === 'doctor',
  });

  // Fetch pharmacy inventory alerts (only for pharmacy and admin roles)
  const { data: pharmacyAlerts } = useQuery<{ lowStock: number; expiring: number }>({
    queryKey: ["/api/inventory/alerts"],
    enabled: ['admin', 'farmacia'].includes((user as any)?.role),
  });

  // Fetch backup status (only for admin)
  const { data: backupStatus, refetch: refetchBackupStatus } = useQuery<{
    lastBackupAt: string | null;
    lastBackupFiles: string[];
    lastBackupStatus: 'success' | 'error' | null;
    lastError: string | null;
  }>({
    queryKey: ["/api/admin/backup/status"],
    enabled: (user as any)?.role === 'admin',
    refetchInterval: 30000,
  });

  // Fetch backup history (only for admin)
  const { data: backupHistory, refetch: refetchBackupHistory } = useQuery<Array<{
    baseName: string;
    hasJson: boolean;
    hasSql: boolean;
    jsonSize?: number;
    sqlSize?: number;
    createdAt: string;
  }>>({
    queryKey: ["/api/admin/backup/history"],
    enabled: (user as any)?.role === 'admin',
  });

  const { toast } = useToast();
  const [backupRunning, setBackupRunning] = useState(false);

  const runBackupMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/backup/run", { method: "POST" }),
    onMutate: () => setBackupRunning(true),
    onSuccess: (data: any) => {
      setBackupRunning(false);
      toast({
        title: "Backup concluído!",
        description: `JSON + SQL salvos no Google Drive: ${data?.jsonFileName || ''}`
      });
      refetchBackupStatus();
      refetchBackupHistory();
    },
    onError: (error: any) => {
      setBackupRunning(false);
      toast({ title: "Erro no backup", description: error?.message || "Falha ao executar backup", variant: "destructive" });
    },
  });

  // Função para determinar quais abas são visíveis por role
  const getVisibleTabs = (userRole: string | undefined) => {
    if (!userRole) return [];
    
    switch (userRole) {
      case 'admin':
        // Admin tem acesso a todas as funcionalidades
        return ['booking', 'appointments', 'calendar', 'patients', 'medical-history', 'reports', 'satisfaction', 'whatsapp', 'users', 'security', 'beds'];
      
      case 'staff':
        // Staff tem acesso à maioria das funcionalidades, exceto gestão de usuários e segurança
        return ['booking', 'appointments', 'calendar', 'patients', 'medical-history', 'reports', 'satisfaction', 'whatsapp'];
      
      case 'doctor':
        // Médicos têm acesso apenas a pacientes e histórico médico (sem agendamentos)
        return ['patients', 'medical-history'];
      
      case 'viewer':
        // Viewers têm acesso apenas de visualização
        return ['appointments', 'calendar', 'reports'];
      
      case 'triage':
        // Profissionais de triagem têm acesso exclusivo ao módulo de triagem
        return [];
      
      case 'farmacia':
        // Profissionais de farmácia têm acesso exclusivo ao módulo de farmácia
        return [];
      
      case 'laboratorio':
        // Profissionais de laboratório têm acesso exclusivo ao módulo de laboratório
        return [];
      
      case 'radiologista':
        // Profissionais de radiologia têm acesso exclusivo ao módulo de radiologia
        return [];
      
      case 'diretor':
        // Diretor tem acesso ao gerenciamento de usuários e relatórios de atendimentos
        return ['users', 'reports'];
      
      default:
        return [];
    }
  };

  const userRole = (user as any)?.role; // Sem fallback - roles não definidos devem mostrar acesso restrito
  const visibleTabs = getVisibleTabs(userRole);
  const defaultTab = visibleTabs.length > 0 ? visibleTabs[0] : 'appointments';

  // Redirecionar automaticamente usuários de farmácia, laboratório e radiologia para suas áreas
  // Enfermeiros (triage) agora têm acesso à home para ver triagem e internação
  useEffect(() => {
    if (userRole === 'farmacia') {
      setLocation('/farmacia');
    } else if (userRole === 'laboratorio') {
      setLocation('/laboratorio');
    } else if (userRole === 'radiologista') {
      setLocation('/radiologia');
    }
  }, [userRole, setLocation]);

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
        // Redirecionar para a página de auth
        window.location.href = data.redirect || "/auth";
      } else {
        // Em caso de erro, redirecionar para auth mesmo assim
        window.location.href = "/auth";
      }
    } catch (error) {
      console.error('Erro no logout:', error);
      // Em caso de erro na requisição, redirecionar para auth
      window.location.href = "/auth";
    }
  };

  const handleViewAllPatients = () => {
    setLocation("/admin/patients");
  };

  const handleViewMedicalHistory = () => {
    setLocation("/admin/medical-history");
  };

  const handleViewReports = () => {
    setLocation("/admin/reports");
  };

  const handleViewWhatsApp = () => {
    setLocation("/admin/whatsapp");
  };

  const handleViewSatisfaction = () => {
    setLocation("/admin/satisfaction");
  };

  const handleViewUsers = () => {
    setLocation("/admin/users");
  };

  const handleViewSecurity = () => {
    setLocation("/admin/security");
  };

  const handleViewTriage = () => {
    setLocation("/triagem");
  };

  // Renderizar dashboard específico baseado no role
  const renderDashboard = () => {
    // Dashboard específico para enfermeiros - mostra triagem e internação
    if (userRole === 'triage') {
      return renderNurseDashboard();
    }

    if (visibleTabs.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 mb-4">Você não tem permissões para acessar este sistema.</p>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Sair e Solicitar Acesso
          </Button>
        </div>
      );
    }

    // Dashboard específico para médicos
    if (userRole === 'doctor') {
      return renderDoctorDashboard();
    }
    
    // Dashboard para outros roles (admin, staff, viewer)
    return renderStandardDashboard();
  };

  // Dashboard para enfermeiros - acesso a triagem e internação
  const renderNurseDashboard = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Área do Enfermeiro</h2>
        <p className="text-gray-600 mb-6">Selecione o módulo que deseja acessar:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Módulo de Triagem */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <Activity className="h-10 w-10 text-orange-600" />
              <h3 className="text-xl font-semibold text-gray-900 ml-3">Triagem</h3>
            </div>
            <p className="text-gray-600 mb-6">Realizar triagem de pacientes, classificação de risco e sinais vitais</p>
            <Button 
              onClick={() => setLocation('/triagem')}
              className="w-full bg-orange-600 hover:bg-orange-700"
              data-testid="button-triage"
            >
              <Activity className="mr-2 h-4 w-4" />
              Acessar Triagem
            </Button>
          </div>

          {/* Módulo de Internação */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border border-indigo-200 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <Bed className="h-10 w-10 text-indigo-600" />
              <h3 className="text-xl font-semibold text-gray-900 ml-3">Internação</h3>
            </div>
            <p className="text-gray-600 mb-6">Gerenciar internações, leitos e evoluções de pacientes</p>
            <Button 
              onClick={() => setLocation('/internacao')}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              data-testid="button-internacao"
            >
              <Bed className="mr-2 h-4 w-4" />
              Acessar Internação
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              {/* Logo Principal + Info */}
              <div className="flex items-center gap-4">
                <img 
                  src={hospitalLogo} 
                  alt="HMJPS" 
                  className="h-16 w-auto"
                />
                <div className="border-l border-gray-300 pl-4">
                  <h1 className="text-lg font-bold text-gray-900">
                    Bem-vindo, {userRole === 'doctor' ? 'Dr(a). ' : ''}{(user as any)?.name || (user as any)?.username || 'Usuário'}!
                  </h1>
                  <p className="text-xs text-gray-600 flex items-center gap-2">
                    {userRole === 'doctor' ? 'Portal Médico' : 'Sistema de Atendimento Médico'} - Exu Saúde
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200">
                      {APP_VERSION}
                    </span>
                  </p>
                  {userRole === 'doctor' && (user as any)?.medicalSpecialty && (user as any)?.crm && (
                    <p className="text-xs text-blue-600">
                      <Stethoscope className="inline h-3 w-3 mr-1" />
                      {(user as any)?.medicalSpecialty} • CRM: {(user as any)?.crm}
                    </p>
                  )}
                </div>
              </div>
              {/* Logos Parceiros */}
              <div className="hidden md:flex items-center gap-4">
                <img src={exuBemCuidadaLogo} alt="Exu Bem Cuidada" className="h-12 w-auto" />
                <img src={secretariaSaudeLogo} alt="Secretaria de Saúde" className="h-12 w-auto" />
                <img src={ministerioSaudeLogo} alt="Ministério da Saúde" className="h-10 w-auto" />
                <img src={susLogo} alt="SUS" className="h-12 w-auto" />
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-600 hover:bg-red-50"
                data-testid="logout-button"
              >
                <LogOut className="mr-1 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        {renderDashboard()}
      </div>
    </div>
  );

  // Dashboard específico para médicos
  function renderDoctorDashboard() {
    return (
      <div className="space-y-8">
        {/* Cards em Destaque - Grid de 2 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Atendimento - Fila */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-8 border border-emerald-700 shadow-lg">
            <div className="flex items-center justify-between text-white">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <UserCheck className="h-10 w-10 mr-3" />
                  <h2 className="text-3xl font-bold">Atendimento - Fila</h2>
                </div>
                <p className="text-emerald-100 mb-6 text-lg">
                  Chame e atenda pacientes da fila de espera walk-in. Visualize triagem, preencha prontuários e gere documentos.
                </p>
                <Button 
                  className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold px-6 py-3 text-lg"
                  onClick={() => setLocation('/fila-medico')}
                  data-testid="button-doctor-queue-main"
                >
                  <UserCheck className="mr-2 h-5 w-5" />
                  Atender Fila
                </Button>
              </div>
            </div>
          </div>

          {/* Internação */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-8 border border-indigo-700 shadow-lg">
            <div className="flex items-center justify-between text-white">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <Bed className="h-10 w-10 mr-3" />
                  <h2 className="text-3xl font-bold">Internação</h2>
                </div>
                <p className="text-indigo-100 mb-6 text-lg">
                  Gerenciamento de internações hospitalares, controle de leitos e registro de evoluções diárias dos pacientes.
                </p>
                <Button 
                  className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold px-6 py-3 text-lg"
                  onClick={() => setLocation('/internacao')}
                  data-testid="button-internacao-main"
                >
                  <Bed className="mr-2 h-5 w-5" />
                  Acessar Internação
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas de Farmácia - apenas para admin */}
        {userRole === 'admin' && pharmacyAlerts && (pharmacyAlerts.lowStock > 0 || pharmacyAlerts.expiring > 0) && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg shadow-sm" data-testid="alert-pharmacy">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-800">Atenção - Estoque de Medicamentos</h3>
                  <p className="text-sm text-amber-700">
                    {pharmacyAlerts.lowStock > 0 && (
                      <span className="mr-4">
                        <Badge variant="outline" className="border-amber-500 text-amber-700 mr-1">
                          {pharmacyAlerts.lowStock}
                        </Badge>
                        medicamento(s) com estoque baixo
                      </span>
                    )}
                    {pharmacyAlerts.expiring > 0 && (
                      <span>
                        <Badge variant="outline" className="border-orange-500 text-orange-700 mr-1">
                          {pharmacyAlerts.expiring}
                        </Badge>
                        medicamento(s) próximo(s) do vencimento
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline"
                className="border-amber-500 text-amber-700 hover:bg-amber-100"
                onClick={() => setLocation('/farmacia')}
                data-testid="button-pharmacy-alert"
              >
                <Pill className="h-4 w-4 mr-2" />
                Ver Farmácia
              </Button>
            </div>
          </div>
        )}

        {/* Grid de Cards de Navegação Rápida */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Consultas de Hoje - não disponível para médicos */}
          {userRole !== 'doctor' && (
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <Calendar className="h-10 w-10 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900 ml-3">Consultas de Hoje</h3>
              </div>
              <p className="text-gray-600 mb-6">Visualize e gerencie suas consultas agendadas para hoje</p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => setLocation('/admin/appointments')}
                data-testid="button-view-today-schedule"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Ver Agenda do Dia
              </Button>
            </div>
          )}

          {/* Prontuário Rápido - não disponível para médicos */}
          {userRole !== 'doctor' && (
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <Stethoscope className="h-10 w-10 text-amber-600" />
                <h3 className="text-xl font-semibold text-gray-900 ml-3">Prontuário Rápido</h3>
              </div>
              <p className="text-gray-600 mb-6">Registre atendimentos de forma rápida e prática</p>
              <Button 
                className="w-full bg-amber-600 hover:bg-amber-700"
                onClick={() => setLocation('/prontuario-rapido')}
                data-testid="button-quick-notes"
              >
                <Stethoscope className="mr-2 h-4 w-4" />
                Atendimento Rápido
              </Button>
            </div>
          )}

          {/* Meus Pacientes */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <Users className="h-10 w-10 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-900 ml-3">Meus Pacientes</h3>
            </div>
            <p className="text-gray-600 mb-6">Acesse o histórico completo dos seus pacientes</p>
            <Button 
              onClick={handleViewAllPatients}
              className="w-full bg-green-600 hover:bg-green-700"
              data-testid="button-my-patients"
            >
              <Users className="mr-2 h-4 w-4" />
              Gerenciar Pacientes
            </Button>
          </div>

          {/* Histórico Médico - não disponível para médicos */}
          {userRole !== 'doctor' && (
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <FileText className="h-10 w-10 text-purple-600" />
                <h3 className="text-xl font-semibold text-gray-900 ml-3">Histórico Médico</h3>
              </div>
              <p className="text-gray-600 mb-6">Consulte registros e prontuários médicos</p>
              <Button 
                onClick={handleViewMedicalHistory}
                className="w-full bg-purple-600 hover:bg-purple-700"
                data-testid="button-medical-history"
              >
                <FileText className="mr-2 h-4 w-4" />
                Acessar Prontuários
              </Button>
            </div>
          )}

          {/* Documentos Médicos */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <FileText className="h-10 w-10 text-teal-600" />
              <h3 className="text-xl font-semibold text-gray-900 ml-3">Documentos Médicos</h3>
            </div>
            <p className="text-gray-600 mb-6">Crie e gerencie receitas, atestados e relatórios médicos</p>
            <Button 
              onClick={() => setLocation('/documentos-medicos')}
              className="w-full bg-teal-600 hover:bg-teal-700"
              data-testid="button-medical-documents"
            >
              <FileText className="mr-2 h-4 w-4" />
              Gerenciar Documentos
            </Button>
          </div>

          {/* Suporte à Decisão - não disponível para médicos */}
          {userRole !== 'doctor' && (
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <BarChart3 className="h-10 w-10 text-indigo-600" />
                <h3 className="text-xl font-semibold text-gray-900 ml-3">Suporte à Decisão</h3>
              </div>
              <p className="text-gray-600 mb-6">CID-10, protocolos clínicos, calculadoras médicas e verificação de interações</p>
              <Button 
                onClick={() => setLocation('/suporte-clinico')}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                data-testid="button-clinical-support"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Acessar Ferramentas
              </Button>
            </div>
          )}

          {/* Templates de Anamnese - não disponível para médicos */}
          {userRole !== 'doctor' && (
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <ClipboardList className="h-10 w-10 text-teal-600" />
                <h3 className="text-xl font-semibold text-gray-900 ml-3">Templates de Anamnese</h3>
              </div>
              <p className="text-gray-600 mb-6">Crie e personalize templates de anamnese por especialidade</p>
              <Button 
                onClick={() => setLocation('/admin/anamnesis-templates')}
                className="w-full bg-teal-600 hover:bg-teal-700"
                data-testid="button-anamnesis-templates"
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Gerenciar Templates
              </Button>
            </div>
          )}

          {/* Biblioteca de Protocolos Clínicos - não disponível para médicos */}
          {userRole !== 'doctor' && (
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <BookOpen className="h-10 w-10 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900 ml-3">Protocolos Clínicos</h3>
              </div>
              <p className="text-gray-600 mb-6">Biblioteca de protocolos e diretrizes médicas padronizadas</p>
              <Button 
                onClick={() => setLocation('/admin/clinical-protocols')}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-clinical-protocols"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Acessar Biblioteca
              </Button>
            </div>
          )}


          {/* Farmácia - Estoque de Medicamentos - apenas para admin */}
          {userRole === 'admin' && (
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <Pill className="h-10 w-10 text-rose-600" />
                <h3 className="text-xl font-semibold text-gray-900 ml-3">Farmácia</h3>
              </div>
              <p className="text-gray-600 mb-6">Gerencie estoque de medicamentos, lotes e dispensação</p>
              <Button 
                onClick={() => setLocation('/farmacia')}
                className="w-full bg-rose-600 hover:bg-rose-700"
                data-testid="button-pharmacy"
              >
                <Pill className="mr-2 h-4 w-4" />
                Acessar Farmácia
              </Button>
            </div>
          )}

        </div>

        {/* Interface de Abas para Médicos - Simplificada */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <Tabs defaultValue={defaultTab} className="w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <TabsList className="grid w-full max-w-full" style={{gridTemplateColumns: `repeat(${Math.min(visibleTabs.length, 5)}, minmax(0, 1fr))`}}>
                {visibleTabs.includes('booking') && (
                  <TabsTrigger value="booking" data-testid="tab-booking">
                    <Calendar className="mr-2 h-4 w-4" />
                    Agendar
                  </TabsTrigger>
                )}
                {visibleTabs.includes('appointments') && (
                  <TabsTrigger value="appointments" data-testid="tab-appointments">
                    <Calendar className="mr-2 h-4 w-4" />
                    Agendamentos
                  </TabsTrigger>
                )}
                {visibleTabs.includes('calendar') && (
                  <TabsTrigger value="calendar" data-testid="tab-calendar">
                    <Calendar className="mr-2 h-4 w-4" />
                    Calendário
                  </TabsTrigger>
                )}
                {visibleTabs.includes('patients') && (
                  <TabsTrigger value="patients" data-testid="tab-patients">
                    <Users className="mr-2 h-4 w-4" />
                    Pacientes
                  </TabsTrigger>
                )}
                {visibleTabs.includes('medical-history') && (
                  <TabsTrigger value="medical-history" data-testid="tab-medical-history">
                    <FileText className="mr-2 h-4 w-4" />
                    Histórico Médico
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
            
            <div className="p-6">
              {renderMedicalTabContent()}
            </div>
          </Tabs>
        </div>
      </div>
    );
  }

  // Renderizar conteúdo das abas médicas
  function renderMedicalTabContent() {
    return (
      <>
        {visibleTabs.includes('booking') && (
        <TabsContent value="booking" className="mt-0">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Novo Agendamento
              </h2>
              <p className="text-gray-600 mb-6">
                Agende uma nova consulta médica. O sistema buscará automaticamente dados de pacientes existentes.
              </p>
            </div>
            <AppointmentForm />
          </div>
        </TabsContent>
        )}

        {visibleTabs.includes('appointments') && (
        <TabsContent value="appointments" className="mt-0">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Gerenciar Agendamentos
              </h2>
              <p className="text-gray-600 mb-6">
                Visualize, edite e gerencie todos os agendamentos do hospital.
              </p>
            </div>
            <AppointmentTable />
          </div>
        </TabsContent>
        )}

        {visibleTabs.includes('calendar') && (
        <TabsContent value="calendar" className="mt-0">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Calendário Google - Exu Saúde - Sistema de Atendimento Médico
              </h2>
              <p className="text-gray-600 mb-6">
                Visualize todos os agendamentos do hospital em tempo real no Google Calendar.
              </p>
            </div>
            <GoogleCalendar />
          </div>
        </TabsContent>
        )}

        {visibleTabs.includes('patients') && (
        <TabsContent value="patients" className="mt-0">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Meus Pacientes
                </h2>
                <p className="text-gray-600 mb-6">
                  Visualize e gerencie informações dos seus pacientes cadastrados.
                </p>
              </div>
              <Button 
                onClick={handleViewAllPatients}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-view-all-patients"
              >
                <Users className="mr-2 h-4 w-4" />
                Ver Todos os Pacientes
              </Button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Clique no botão acima para acessar a página completa de gerenciamento de pacientes</p>
            </div>
          </div>
        </TabsContent>
        )}

        {visibleTabs.includes('medical-history') && (
        <TabsContent value="medical-history" className="mt-0">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Histórico Médico
                </h2>
                <p className="text-gray-600 mb-6">
                  Gerencie registros médicos e histórico completo dos pacientes.
                </p>
              </div>
              <Button 
                onClick={handleViewMedicalHistory}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-view-medical-history"
              >
                <FileText className="mr-2 h-4 w-4" />
                Gerenciar Histórico Médico
              </Button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Clique no botão acima para acessar a página completa de gerenciamento do histórico médico</p>
            </div>
          </div>
        </TabsContent>
        )}
      </>
    );
  }

  // Dashboard padrão para admin, staff, viewer
  function renderStandardDashboard() {
    return (
      <div className="space-y-8">
        {/* Cards de Ações Rápidas para Funcionários (Staff) */}
        {userRole === 'staff' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
              <div className="flex items-center mb-4">
                <Users className="h-8 w-8 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 ml-3">Pacientes</h3>
              </div>
              <p className="text-gray-600 mb-4">Acesse e gerencie informações dos pacientes</p>
              <Button 
                onClick={handleViewAllPatients}
                className="w-full bg-purple-600 hover:bg-purple-700"
                data-testid="button-patients-quick"
              >
                <Users className="mr-2 h-4 w-4" />
                Gerenciar Pacientes
              </Button>
            </div>

            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <div className="flex items-center mb-4">
                <ListOrdered className="h-8 w-8 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900 ml-3">Fila de Atendimento</h3>
              </div>
              <p className="text-gray-600 mb-4">Gerencie a fila de pacientes walk-in</p>
              <Button 
                onClick={() => setLocation('/gestao-fila')}
                className="w-full bg-orange-600 hover:bg-orange-700"
                data-testid="button-queue-management"
              >
                <ListOrdered className="mr-2 h-4 w-4" />
                Gerenciar Fila
              </Button>
            </div>
          </div>
        )}

        {/* Painel de Backup Google Drive - apenas para admin */}
        {userRole === 'admin' && (
          <div className="bg-white rounded-lg p-6 border border-indigo-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <HardDrive className="h-8 w-8 text-indigo-600" />
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">Backup do Sistema</h3>
                  <p className="text-sm text-gray-500">Backup automático diário às 02:00 — Google Drive</p>
                </div>
              </div>
              <Button
                onClick={() => runBackupMutation.mutate()}
                disabled={backupRunning || runBackupMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {backupRunning || runBackupMutation.isPending ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Executando...</>
                ) : (
                  <><Database className="mr-2 h-4 w-4" />Fazer Backup Agora</>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-600 mb-1">Último Backup desta Sessão</p>
                {backupStatus?.lastBackupAt ? (
                  <div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {backupStatus.lastBackupFiles?.map((f) => (
                        <span key={f} className={`text-xs px-1.5 py-0.5 rounded font-mono ${f.endsWith('.json') ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {f.endsWith('.json') ? 'JSON' : 'SQL'}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{new Date(backupStatus.lastBackupAt).toLocaleString('pt-BR')}</p>
                    <Badge className={`mt-1 text-xs ${backupStatus.lastBackupStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {backupStatus.lastBackupStatus === 'success' ? 'Sucesso' : 'Erro'}
                    </Badge>
                    {backupStatus.lastError && (
                      <p className="text-xs text-red-600 mt-1">{backupStatus.lastError}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Nenhum backup nesta sessão</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-600 mb-2">Histórico no Google Drive</p>
                {backupHistory && backupHistory.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {backupHistory.slice(0, 6).map((entry) => (
                      <div key={entry.baseName} className="text-xs border-b border-gray-100 pb-1 last:border-0">
                        <p className="font-mono text-gray-700 truncate">{entry.baseName}</p>
                        <div className="flex gap-2 mt-0.5">
                          {entry.hasJson && (
                            <span className="text-blue-700">
                              JSON {entry.jsonSize ? `${(entry.jsonSize / 1024).toFixed(0)} KB` : ''}
                            </span>
                          )}
                          {entry.hasSql && (
                            <span className="text-emerald-700">
                              SQL {entry.sqlSize ? `${(entry.sqlSize / 1024).toFixed(0)} KB` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {backupHistory.length > 6 && <p className="text-xs text-gray-400">+{backupHistory.length - 6} anteriores</p>}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Nenhum backup no Drive ainda</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Interface de Abas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <Tabs defaultValue={defaultTab} className="w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <TabsList className="grid w-full max-w-full" style={{gridTemplateColumns: `repeat(${Math.min(visibleTabs.length, 10)}, minmax(0, 1fr))`}}>
                {visibleTabs.includes('booking') && (
                  <TabsTrigger value="booking" data-testid="tab-booking">
                    <Calendar className="mr-2 h-4 w-4" />
                    Agendar
                  </TabsTrigger>
                )}
                {visibleTabs.includes('appointments') && (
                  <TabsTrigger value="appointments" data-testid="tab-appointments">
                    <Calendar className="mr-2 h-4 w-4" />
                    Agendamentos
                  </TabsTrigger>
                )}
                {visibleTabs.includes('calendar') && (
                  <TabsTrigger value="calendar" data-testid="tab-calendar">
                    <Calendar className="mr-2 h-4 w-4" />
                    Calendário
                  </TabsTrigger>
                )}
                {visibleTabs.includes('patients') && (
                  <TabsTrigger value="patients" data-testid="tab-patients">
                    <Users className="mr-2 h-4 w-4" />
                    Pacientes
                  </TabsTrigger>
                )}
                {visibleTabs.includes('medical-history') && (
                  <TabsTrigger value="medical-history" data-testid="tab-medical-history">
                    <FileText className="mr-2 h-4 w-4" />
                    Histórico Médico
                  </TabsTrigger>
                )}
                {visibleTabs.includes('reports') && (
                  <TabsTrigger value="reports" data-testid="tab-reports">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Relatórios
                  </TabsTrigger>
                )}
                {visibleTabs.includes('satisfaction') && (
                  <TabsTrigger value="satisfaction" data-testid="tab-satisfaction">
                    <Star className="mr-2 h-4 w-4" />
                    Pesquisas
                  </TabsTrigger>
                )}
                {visibleTabs.includes('whatsapp') && (
                  <TabsTrigger value="whatsapp" data-testid="tab-whatsapp">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </TabsTrigger>
                )}
                {visibleTabs.includes('users') && (
                  <TabsTrigger value="users" data-testid="tab-users">
                    <User className="mr-2 h-4 w-4" />
                    Usuários
                  </TabsTrigger>
                )}
                {visibleTabs.includes('security') && (
                  <TabsTrigger value="security" data-testid="tab-security">
                    <Shield className="mr-2 h-4 w-4" />
                    Segurança
                  </TabsTrigger>
                )}
                {visibleTabs.includes('beds') && (
                  <TabsTrigger value="beds" data-testid="tab-beds">
                    <Building2 className="mr-2 h-4 w-4" />
                    Leitos
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="p-6">
              {visibleTabs.includes('booking') && (
              <TabsContent value="booking" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Novo Agendamento
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Agende uma nova consulta médica. O sistema buscará automaticamente dados de pacientes existentes.
                    </p>
                  </div>
                  <AppointmentForm />
                </div>
              </TabsContent>
              )}

              {visibleTabs.includes('appointments') && (
              <TabsContent value="appointments" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Gerenciar Agendamentos
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Visualize, edite e gerencie todos os agendamentos do hospital.
                    </p>
                  </div>
                  <AppointmentTable />
                </div>
              </TabsContent>
              )}

              {visibleTabs.includes('calendar') && (
              <TabsContent value="calendar" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Calendário Google - Hospital Regional Fernando Bezerra
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Visualize todos os agendamentos do hospital em tempo real no Google Calendar.
                    </p>
                  </div>
                  <GoogleCalendar />
                </div>
              </TabsContent>
              )}

              {visibleTabs.includes('patients') && (
              <TabsContent value="patients" className="mt-0">
                <div className="space-y-6">
                  {userRole === 'doctor' ? (
                    // Versão simplificada para médicos
                    <div>
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            Meus Pacientes
                          </h2>
                          <p className="text-gray-600 mb-6">
                            Consulte informações dos pacientes da sua especialidade: {(user as any)?.medicalSpecialty}.
                          </p>
                        </div>
                        <Button 
                          onClick={handleViewAllPatients}
                          className="bg-blue-600 hover:bg-blue-700"
                          data-testid="button-view-my-patients"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Ver Meus Pacientes
                        </Button>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>Acesse informações dos pacientes que passaram por consultas na especialidade de {(user as any)?.medicalSpecialty}</p>
                      </div>
                    </div>
                  ) : (
                    // Versão completa para admin/staff
                    <div>
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            Gerenciar Pacientes
                          </h2>
                          <p className="text-gray-600 mb-6">
                            Visualize e gerencie informações de todos os pacientes cadastrados no sistema.
                          </p>
                        </div>
                        <Button 
                          onClick={handleViewAllPatients}
                          className="bg-blue-600 hover:bg-blue-700"
                          data-testid="button-view-all-patients"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Ver Todos os Pacientes
                        </Button>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>Clique no botão acima para acessar a página completa de gerenciamento de pacientes</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              )}

              {visibleTabs.includes('medical-history') && (
              <TabsContent value="medical-history" className="mt-0">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Histórico Médico
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Gerencie registros médicos e histórico completo dos pacientes do hospital.
                      </p>
                    </div>
                    <Button 
                      onClick={handleViewMedicalHistory}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="button-view-medical-history"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Gerenciar Histórico Médico
                    </Button>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Clique no botão acima para acessar a página completa de gerenciamento do histórico médico</p>
                  </div>
                </div>
              </TabsContent>
              )}

              {visibleTabs.includes('reports') && (
              <TabsContent value="reports" className="mt-0">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Relatórios e Análises
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Visualize relatórios detalhados de agendamentos por período, especialidade e zona geográfica.
                      </p>
                    </div>
                    <Button 
                      onClick={handleViewReports}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="button-view-reports"
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Acessar Relatórios
                    </Button>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Clique no botão acima para acessar a página completa de relatórios e análises</p>
                  </div>
                </div>
              </TabsContent>
              )}

              {visibleTabs.includes('satisfaction') && (
              <TabsContent value="satisfaction" className="mt-0">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Pesquisas de Satisfação
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Gerencie pesquisas de satisfação enviadas via WhatsApp para avaliar atendimento e consultas médicas.
                      </p>
                    </div>
                    <Button 
                      onClick={handleViewSatisfaction}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-view-satisfaction"
                    >
                      <Star className="mr-2 h-4 w-4" />
                      Gerenciar Pesquisas
                    </Button>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                    <Star className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Clique no botão acima para acessar a página completa de pesquisas de satisfação</p>
                    <div className="mt-4 text-sm text-gray-400">
                      <p>• Pesquisas pré-consulta (avaliação do atendimento)</p>
                      <p>• Pesquisas pós-consulta (avaliação da consulta médica)</p>
                      <p>• Envio automático via WhatsApp</p>
                      <p>• Relatórios e analytics de satisfação</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              )}

              {visibleTabs.includes('whatsapp') && (
              <TabsContent value="whatsapp" className="mt-0">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Integração WhatsApp Business
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Configure e gerencie o envio de lembretes automáticos via WhatsApp para os pacientes.
                      </p>
                    </div>
                    <Button 
                      onClick={handleViewWhatsApp}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-view-whatsapp"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Acessar WhatsApp
                    </Button>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Clique no botão acima para acessar a página completa de gerenciamento do WhatsApp</p>
                    <div className="mt-4 text-sm text-gray-400">
                      <p>• Envio automático de confirmações</p>
                      <p>• Lembretes 24h antes da consulta</p>
                      <p>• Lembretes no dia da consulta</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              )}

              {visibleTabs.includes('users') && (
              <TabsContent value="users" className="mt-0">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Gerenciamento de Usuários
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Gerencie usuários do sistema, permissões e configurações de acesso.
                      </p>
                    </div>
                    <Button 
                      onClick={handleViewUsers}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-view-users"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Gerenciar Usuários
                    </Button>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Clique no botão acima para acessar a página completa de gerenciamento de usuários</p>
                    <div className="mt-4 text-sm text-gray-400">
                      <p>• Criar e editar usuários do sistema</p>
                      <p>• Gerenciar permissões (Admin, Funcionário, Visualizador)</p>
                      <p>• Alterar senhas e configurações de acesso</p>
                      <p>• Controle de segurança e auditoria</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              )}

              {visibleTabs.includes('security') && (
              <TabsContent value="security" className="mt-0">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Dashboard de Segurança
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Monitore eventos de segurança, tentativas de login e ameaças do sistema.
                      </p>
                    </div>
                    <Button 
                      onClick={handleViewSecurity}
                      className="bg-red-600 hover:bg-red-700"
                      data-testid="button-view-security"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Acessar Dashboard
                    </Button>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Clique no botão acima para acessar o dashboard completo de monitoramento de segurança</p>
                    <div className="mt-4 text-sm text-gray-400">
                      <p>• Detecção de tentativas de login suspeitas</p>
                      <p>• Alertas em tempo real para eventos críticos</p>
                      <p>• Análise de ameaças por IP</p>
                      <p>• Rate limiting e proteção contra ataques</p>
                      <p>• Auditoria completa de atividades</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              )}

              {visibleTabs.includes('beds') && (
              <TabsContent value="beds" className="mt-0">
                <WardManagement />
              </TabsContent>
              )}

            </div>
          </Tabs>
        </div>
      </div>
    );
  }
}