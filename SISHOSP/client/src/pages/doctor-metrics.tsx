import { useAuth } from "@/hooks/useAuth.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, LogOut, FileText, Clock, Activity, CheckCircle, XCircle, TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";

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

export default function DoctorMetrics() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch doctor metrics
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery<DoctorMetrics>({
    queryKey: ["/api/doctor-metrics"],
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

  if (isLoadingMetrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img 
                  src={hospitalLogo} 
                  alt="Exu Saúde - Sistema de Atendimento Médico" 
                  className="h-12 w-auto"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Relatórios e Métricas
                  </h1>
                  <p className="text-gray-600">
                    Visão completa do seu desempenho e produtividade
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setLocation('/')}
                  variant="outline"
                  data-testid="button-back-home"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao Início
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

        {/* Visão Completa da Jornada - Métricas do Médico */}
        {!isLoadingMetrics && metrics && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Visão Completa da Jornada</h2>
                <p className="text-gray-600">Acompanhe seu desempenho e produtividade em tempo real</p>
              </div>
              <Badge variant="outline" className="text-sm">
                <Activity className="h-4 w-4 mr-1" />
                Atualizado agora
              </Badge>
            </div>

            {/* Estatísticas do Dia */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Hoje</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold text-gray-900">{metrics.today.total}</div>
                      <Calendar className="h-8 w-8 text-blue-500" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Consultas agendadas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Pendentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold text-blue-600">{metrics.today.pending}</div>
                      <Clock className="h-8 w-8 text-blue-500" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Aguardando atendimento</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Realizadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold text-green-600">{metrics.today.completed}</div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Atendimentos concluídos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Canceladas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold text-red-600">{metrics.today.cancelled}</div>
                      <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Consultas canceladas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Média</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold text-purple-600">{metrics.avgConsultationTime}</div>
                      <Activity className="h-8 w-8 text-purple-500" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Minutos por consulta</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Desempenho e Pacientes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Desempenho Semanal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Semana</span>
                    <Badge variant={parseFloat(metrics.week.performance) >= 0 ? "default" : "destructive"} className="gap-1">
                      {parseFloat(metrics.week.performance) >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {metrics.week.performance}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total</span>
                      <span className="font-semibold">{metrics.week.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Concluídas</span>
                      <span className="font-semibold text-green-600">{metrics.week.completed}</span>
                    </div>
                    <Progress value={(metrics.week.completed / metrics.week.total) * 100 || 0} className="h-2" />
                    <p className="text-xs text-gray-500">Comparado com semana anterior</p>
                  </div>
                </CardContent>
              </Card>

              {/* Desempenho Mensal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Mês</span>
                    <Badge variant={parseFloat(metrics.month.performance) >= 0 ? "default" : "destructive"} className="gap-1">
                      {parseFloat(metrics.month.performance) >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {metrics.month.performance}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total</span>
                      <span className="font-semibold">{metrics.month.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Concluídas</span>
                      <span className="font-semibold text-green-600">{metrics.month.completed}</span>
                    </div>
                    <Progress value={(metrics.month.completed / metrics.month.total) * 100 || 0} className="h-2" />
                    <p className="text-xs text-gray-500">Comparado com mês anterior</p>
                  </div>
                </CardContent>
              </Card>

              {/* Pacientes */}
              <Card>
                <CardHeader>
                  <CardTitle>Pacientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-600">Novos este mês</span>
                      </div>
                      <span className="font-bold text-blue-600">{metrics.patients.newThisMonth}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-600">Retornos</span>
                      </div>
                      <span className="font-bold text-green-600">{metrics.patients.returning}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Total</span>
                      </div>
                      <span className="font-bold">{metrics.patients.total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Documentos e Triagens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Documentos Emitidos */}
              <Card>
                <CardHeader>
                  <CardTitle>Documentos Emitidos (Este Mês)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Receitas</p>
                          <p className="text-xs text-gray-500">Prescrições médicas</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">{metrics.documents.receitas}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <FileText className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Atestados</p>
                          <p className="text-xs text-gray-500">Certificados médicos</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-green-600">{metrics.documents.atestados}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <FileText className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">Laudos</p>
                          <p className="text-xs text-gray-500">Relatórios médicos</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-purple-600">{metrics.documents.laudos}</span>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">Total</span>
                        <span className="text-2xl font-bold">{metrics.documents.total}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Triagens por Gravidade */}
              <Card>
                <CardHeader>
                  <CardTitle>Triagens (Últimos 30 dias)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm">Baixa</span>
                      </div>
                      <span className="font-bold">{metrics.triage.bySeverity.baixa}</span>
                    </div>
                    <Progress value={(metrics.triage.bySeverity.baixa / metrics.triage.total) * 100 || 0} className="h-2 bg-green-100" />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-sm">Média</span>
                      </div>
                      <span className="font-bold">{metrics.triage.bySeverity.média}</span>
                    </div>
                    <Progress value={(metrics.triage.bySeverity.média / metrics.triage.total) * 100 || 0} className="h-2 bg-yellow-100" />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-sm">Alta</span>
                      </div>
                      <span className="font-bold">{metrics.triage.bySeverity.alta}</span>
                    </div>
                    <Progress value={(metrics.triage.bySeverity.alta / metrics.triage.total) * 100 || 0} className="h-2 bg-orange-100" />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm">Emergência</span>
                      </div>
                      <span className="font-bold">{metrics.triage.bySeverity.emergência}</span>
                    </div>
                    <Progress value={(metrics.triage.bySeverity.emergência / metrics.triage.total) * 100 || 0} className="h-2 bg-red-100" />
                    
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">Total</span>
                        <span className="text-xl font-bold">{metrics.triage.total}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Próximas Consultas */}
            {metrics.upcoming.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Próximas Consultas (7 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.upcoming.map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-semibold text-blue-600">{format(new Date(apt.date), "dd", { locale: ptBR })}</span>
                            <span className="text-xs text-gray-500">{format(new Date(apt.date), "MMM", { locale: ptBR })}</span>
                          </div>
                          <div className="h-10 w-px bg-gray-300"></div>
                          <div>
                            <p className="font-medium">{apt.patient}</p>
                            <p className="text-sm text-gray-600">{apt.reason}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {apt.time}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
