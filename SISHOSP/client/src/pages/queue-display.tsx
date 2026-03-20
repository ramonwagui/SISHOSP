import { useQuery } from "@tanstack/react-query";
import { type QueueEntry, type Patient } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, AlertTriangle, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";

export default function QueueDisplayPage() {
  // Fetch patients for names
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Fetch active queue entries with auto-refresh
  const { data: queueEntries = [], isLoading } = useQuery<QueueEntry[]>({
    queryKey: ["/api/queue/active"],
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const getPatientName = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient?.name || "Aguarde...";
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "bg-red-500 text-white";
      case 2:
        return "bg-orange-500 text-white";
      case 3:
        return "bg-yellow-500 text-white";
      case 4:
        return "bg-green-500 text-white";
      case 5:
        return "bg-gray-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return "EMERGÊNCIA";
      case 2:
        return "ALTA";
      case 3:
        return "MÉDIA";
      case 4:
        return "BAIXA";
      case 5:
        return "NORMAL";
      default:
        return "NORMAL";
    }
  };

  // Get current patient being called
  const currentlyCalledPatients = queueEntries.filter(
    (e) => e.status === "chamado" || e.status === "em_atendimento"
  );

  // Get waiting patients
  const waitingPatients = queueEntries.filter((e) => e.status === "aguardando");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-6 mb-6">
            <img src={hospitalLogo} alt="Hospital Logo" className="h-24 w-24" />
            <div>
              <h1 className="text-5xl font-bold mb-2">
                Painel de Atendimento
              </h1>
              <p className="text-2xl text-blue-100">
                Exu Saúde - Sistema de Atendimento Médico
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-xl text-blue-100">
            <Clock className="h-6 w-6" />
            <span>{format(new Date(), "HH:mm:ss", { locale: ptBR })}</span>
            <span className="mx-4">|</span>
            <span>{format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-3xl py-20">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Currently Being Called */}
            <div>
              <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-3xl font-bold flex items-center gap-3 text-white">
                    <AlertTriangle className="h-8 w-8 text-yellow-300" />
                    SENDO CHAMADO AGORA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentlyCalledPatients.length === 0 ? (
                    <div className="text-center py-16 text-2xl text-blue-100">
                      Nenhum paciente sendo chamado no momento
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {currentlyCalledPatients.map((entry) => (
                        <div
                          key={entry.id}
                          className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-xl p-8 shadow-2xl animate-pulse"
                          data-testid={`called-entry-${entry.id}`}
                        >
                          <div className="text-center">
                            <div className="text-7xl font-black mb-4">
                              #{entry.queueNumber}
                            </div>
                            <div className="text-4xl font-bold mb-4">
                              {getPatientName(entry.patientId)}
                            </div>
                            <Badge
                              className={`${getPriorityColor(entry.priority)} text-xl px-6 py-2`}
                            >
                              {getPriorityLabel(entry.priority)}
                            </Badge>
                            <div className="mt-6 text-xl font-semibold">
                              {entry.status === "chamado" 
                                ? "DIRIJA-SE AO CONSULTÓRIO" 
                                : "EM ATENDIMENTO"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Waiting Queue */}
            <div>
              <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-3xl font-bold flex items-center gap-3 text-white">
                    <Users className="h-8 w-8 text-blue-300" />
                    AGUARDANDO ({waitingPatients.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {waitingPatients.length === 0 ? (
                    <div className="text-center py-16 text-2xl text-blue-100">
                      Nenhum paciente aguardando
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {waitingPatients.slice(0, 10).map((entry, index) => (
                        <div
                          key={entry.id}
                          className="bg-white/20 backdrop-blur rounded-lg p-4 flex items-center gap-4 hover:bg-white/30 transition-colors"
                          data-testid={`waiting-entry-${entry.id}`}
                        >
                          <div className="text-4xl font-bold text-blue-200 min-w-[60px]">
                            {index + 1}º
                          </div>
                          <div className="flex-1">
                            <div className="text-2xl font-bold">
                              #{entry.queueNumber}
                            </div>
                            <div className="text-xl">
                              {getPatientName(entry.patientId)}
                            </div>
                          </div>
                          <Badge
                            className={`${getPriorityColor(entry.priority)} text-lg px-4 py-2`}
                          >
                            {getPriorityLabel(entry.priority)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 text-center text-blue-100">
          <div className="flex items-center justify-center gap-2 text-xl">
            <Activity className="h-6 w-6" />
            <span>Atualização automática a cada 3 segundos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
