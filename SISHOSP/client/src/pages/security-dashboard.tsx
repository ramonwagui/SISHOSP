import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  Activity, 
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Filter,
  LogOut
} from "lucide-react";
import { useLocation } from "wouter";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SecurityEvent {
  id: string;
  eventType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  description: string;
  metadata?: any;
  alertSent: boolean;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

interface SecuritySummary {
  totalEvents: number;
  unresolvedEvents: number;
  criticalEvents: number;
  recentFailedLogins: number;
  topThreats: Array<{
    ip: string;
    count: number;
    severity: string;
    events: SecurityEvent[];
  }>;
}

interface LoginAttempt {
  id: string;
  username?: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  attemptTime: string;
}

// Event type mapping for display
const eventTypeLabels: Record<string, string> = {
  FAILED_LOGIN: "Login Falhado",
  BRUTE_FORCE_ATTACK: "Ataque de Força Bruta",
  MULTIPLE_FAILED_ATTEMPTS: "Múltiplas Tentativas Falhadas",
  ADMIN_ACCESS_AFTER_HOURS: "Acesso Administrativo Fora do Horário",
  SUSPICIOUS_ACCESS: "Acesso Suspeito",
  RATE_LIMITED: "Bloqueado por Rate Limiting"
};

const severityColors: Record<string, string> = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800"
};

const severityIcons: Record<string, any> = {
  LOW: CheckCircle,
  MEDIUM: AlertCircle,
  HIGH: AlertTriangle,
  CRITICAL: XCircle
};

export default function SecurityDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [resolvedFilter, setResolvedFilter] = useState<string>("all");

  // Fetch security summary
  const { data: summary, isLoading: summaryLoading } = useQuery<SecuritySummary>({
    queryKey: ["/api/security/summary"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch security events
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery<SecurityEvent[]>({
    queryKey: ["/api/security/events"],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Fetch unresolved events
  const { data: unresolvedEvents = [] } = useQuery<SecurityEvent[]>({
    queryKey: ["/api/security/events/unresolved"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Resolve security event mutation
  const resolveEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return await apiRequest(`/api/security/events/${eventId}/resolve`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Evento resolvido com sucesso!",
        description: "O evento de segurança foi marcado como resolvido.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/security/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/security/events/unresolved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/security/summary"] });
      setSelectedEvent(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao resolver evento",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  // Security maintenance mutation
  const maintenanceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/security/maintenance", {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Manutenção executada com sucesso!",
        description: "Dados antigos de segurança foram limpos.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na manutenção",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  // Filter events based on selected filters
  const filteredEvents = events.filter(event => {
    if (severityFilter !== "all" && event.severity !== severityFilter) return false;
    if (eventTypeFilter !== "all" && event.eventType !== eventTypeFilter) return false;
    if (resolvedFilter === "resolved" && !event.resolved) return false;
    if (resolvedFilter === "unresolved" && event.resolved) return false;
    return true;
  });

  // Get unique event types for filter
  const uniqueEventTypes = Array.from(new Set(events.map(event => event.eventType)));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getSeverityIcon = (severity: string) => {
    const IconComponent = severityIcons[severity];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setLocation('/home')}
                className="flex items-center space-x-2"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </Button>
              <div className="flex items-center space-x-3">
                <img src={hospitalLogo} alt="Hospital Logo" className="h-10 w-10" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900" data-testid="text-title">
                    Dashboard de Segurança
                  </h1>
                  <p className="text-sm text-gray-600">Exu Saúde - Sistema de Atendimento Médico</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  refetchEvents();
                  queryClient.invalidateQueries({ queryKey: ["/api/security/summary"] });
                }}
                className="flex items-center space-x-2"
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Atualizar</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => maintenanceMutation.mutate()}
                disabled={maintenanceMutation.isPending}
                className="flex items-center space-x-2"
                data-testid="button-maintenance"
              >
                <Activity className="h-4 w-4" />
                <span>Manutenção</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50 flex items-center space-x-2"
                data-testid="logout-button"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Security Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-events">
                {summaryLoading ? "..." : summary?.totalEvents || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eventos Não Resolvidos</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-unresolved-events">
                {summaryLoading ? "..." : summary?.unresolvedEvents || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eventos Críticos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-critical-events">
                {summaryLoading ? "..." : summary?.criticalEvents || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Falhas de Login (24h)</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-failed-logins">
                {summaryLoading ? "..." : summary?.recentFailedLogins || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="events" className="space-y-4">
          <TabsList>
            <TabsTrigger value="events">Eventos de Segurança</TabsTrigger>
            <TabsTrigger value="threats">Principais Ameaças</TabsTrigger>
            <TabsTrigger value="unresolved">Eventos Não Resolvidos</TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Filtros</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium">Severidade</label>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="LOW">Baixa</SelectItem>
                      <SelectItem value="MEDIUM">Média</SelectItem>
                      <SelectItem value="HIGH">Alta</SelectItem>
                      <SelectItem value="CRITICAL">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium">Tipo de Evento</label>
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {uniqueEventTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {eventTypeLabels[type] || type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="resolved">Resolvidos</SelectItem>
                      <SelectItem value="unresolved">Não Resolvidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Events Table */}
            <Card>
              <CardHeader>
                <CardTitle>Eventos de Segurança ({filteredEvents.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="text-center py-8">Carregando eventos...</div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Nenhum evento encontrado</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Severidade</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEvents.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              <Badge className={severityColors[event.severity]} data-testid={`badge-severity-${event.id}`}>
                                <div className="flex items-center space-x-1">
                                  {getSeverityIcon(event.severity)}
                                  <span>{event.severity}</span>
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-event-type-${event.id}`}>
                              {eventTypeLabels[event.eventType] || event.eventType}
                            </TableCell>
                            <TableCell data-testid={`text-username-${event.id}`}>
                              {event.username || "-"}
                            </TableCell>
                            <TableCell data-testid={`text-ip-${event.id}`}>
                              {event.ipAddress || "-"}
                            </TableCell>
                            <TableCell className="max-w-xs truncate" data-testid={`text-description-${event.id}`}>
                              {event.description}
                            </TableCell>
                            <TableCell data-testid={`text-date-${event.id}`}>
                              {formatDate(event.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={event.resolved ? "default" : "destructive"} data-testid={`badge-status-${event.id}`}>
                                {event.resolved ? "Resolvido" : "Pendente"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedEvent(event)}
                                      data-testid={`button-view-${event.id}`}
                                    >
                                      Visualizar
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                      <DialogTitle>Detalhes do Evento de Segurança</DialogTitle>
                                    </DialogHeader>
                                    {selectedEvent && (
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <label className="font-medium">Tipo:</label>
                                            <p>{eventTypeLabels[selectedEvent.eventType] || selectedEvent.eventType}</p>
                                          </div>
                                          <div>
                                            <label className="font-medium">Severidade:</label>
                                            <Badge className={severityColors[selectedEvent.severity]}>
                                              {selectedEvent.severity}
                                            </Badge>
                                          </div>
                                          <div>
                                            <label className="font-medium">Usuário:</label>
                                            <p>{selectedEvent.username || "-"}</p>
                                          </div>
                                          <div>
                                            <label className="font-medium">IP:</label>
                                            <p>{selectedEvent.ipAddress || "-"}</p>
                                          </div>
                                          <div>
                                            <label className="font-medium">Data/Hora:</label>
                                            <p>{formatDate(selectedEvent.createdAt)}</p>
                                          </div>
                                          <div>
                                            <label className="font-medium">Status:</label>
                                            <Badge variant={selectedEvent.resolved ? "default" : "destructive"}>
                                              {selectedEvent.resolved ? "Resolvido" : "Pendente"}
                                            </Badge>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="font-medium">Descrição:</label>
                                          <p className="mt-1">{selectedEvent.description}</p>
                                        </div>
                                        {selectedEvent.userAgent && (
                                          <div>
                                            <label className="font-medium">User Agent:</label>
                                            <p className="mt-1 text-sm font-mono break-all">{selectedEvent.userAgent}</p>
                                          </div>
                                        )}
                                        {selectedEvent.metadata && (
                                          <div>
                                            <label className="font-medium">Metadados:</label>
                                            <pre className="mt-1 text-sm bg-gray-100 p-3 rounded overflow-auto">
                                              {JSON.stringify(selectedEvent.metadata, null, 2)}
                                            </pre>
                                          </div>
                                        )}
                                        {!selectedEvent.resolved && (
                                          <div className="flex justify-end">
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button 
                                                  variant="default"
                                                  disabled={resolveEventMutation.isPending}
                                                  data-testid="button-resolve-event"
                                                >
                                                  Marcar como Resolvido
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Confirmar Resolução</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Tem certeza que deseja marcar este evento como resolvido? 
                                                    Esta ação não pode ser desfeita.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                  <AlertDialogAction 
                                                    onClick={() => resolveEventMutation.mutate(selectedEvent.id)}
                                                    disabled={resolveEventMutation.isPending}
                                                  >
                                                    {resolveEventMutation.isPending ? "Resolvendo..." : "Resolver"}
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                                
                                {!event.resolved && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={resolveEventMutation.isPending}
                                        data-testid={`button-resolve-${event.id}`}
                                      >
                                        Resolver
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Resolução</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja marcar este evento como resolvido?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => resolveEventMutation.mutate(event.id)}
                                          disabled={resolveEventMutation.isPending}
                                        >
                                          {resolveEventMutation.isPending ? "Resolvendo..." : "Resolver"}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Threats Tab */}
          <TabsContent value="threats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Principais Ameaças por IP</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <div className="text-center py-8">Carregando ameaças...</div>
                ) : !summary?.topThreats || summary.topThreats.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Nenhuma ameaça detectada</div>
                ) : (
                  <div className="space-y-4">
                    {summary.topThreats.map((threat, index) => (
                      <Card key={threat.ip} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">#{index + 1} IP: {threat.ip}</h3>
                              <Badge className={severityColors[threat.severity]}>
                                {threat.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {threat.count} eventos registrados
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-red-600">{threat.count}</p>
                            <p className="text-sm text-gray-500">eventos</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unresolved Events Tab */}
          <TabsContent value="unresolved" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span>Eventos Não Resolvidos ({unresolvedEvents.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unresolvedEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Todos os eventos foram resolvidos!
                    </h3>
                    <p className="text-gray-500">
                      Não há eventos de segurança pendentes no momento.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {unresolvedEvents.map((event) => (
                      <Card key={event.id} className="p-4 border-l-4 border-l-yellow-400">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Badge className={severityColors[event.severity]}>
                                <div className="flex items-center space-x-1">
                                  {getSeverityIcon(event.severity)}
                                  <span>{event.severity}</span>
                                </div>
                              </Badge>
                              <h3 className="font-medium">
                                {eventTypeLabels[event.eventType] || event.eventType}
                              </h3>
                            </div>
                            <p className="text-sm text-gray-600">{event.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              {event.username && <span>Usuário: {event.username}</span>}
                              {event.ipAddress && <span>IP: {event.ipAddress}</span>}
                              <span>Data: {formatDate(event.createdAt)}</span>
                            </div>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={resolveEventMutation.isPending}
                                data-testid={`button-resolve-unresolved-${event.id}`}
                              >
                                Resolver
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Resolução</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja marcar este evento como resolvido?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => resolveEventMutation.mutate(event.id)}
                                  disabled={resolveEventMutation.isPending}
                                >
                                  {resolveEventMutation.isPending ? "Resolvendo..." : "Resolver"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}