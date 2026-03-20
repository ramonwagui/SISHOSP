import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { QueueEntry, Patient, User } from "@shared/schema";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";

type QueueEntryWithPatient = QueueEntry & {
  patient: Patient;
};

export default function PainelChamadas() {
  const [, setLocation] = useLocation();
  const [currentCall, setCurrentCall] = useState<QueueEntryWithPatient | null>(null);
  const [previousCalls, setPreviousCalls] = useState<QueueEntryWithPatient[]>([]);
  const [isNewCall, setIsNewCall] = useState(false);

  // Verificar se o usuário tem permissão para acessar este painel
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Proteção: apenas usuário painel.saude pode acessar (verificação por ID imutável)
  const PAINEL_USER_ID = 'c6f3a02b-6499-4ffb-a905-f6506128ab90';
  
  useEffect(() => {
    if (!userLoading && user && user.id !== PAINEL_USER_ID) {
      setLocation('/');
    }
  }, [user, userLoading, setLocation]);

  // Se não for painel.saude, mostrar mensagem de acesso negado
  if (!userLoading && user && user.id !== PAINEL_USER_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/20">
        <Card className="p-12 max-w-2xl text-center">
          <AlertTriangle className="h-24 w-24 text-red-600 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-red-900 dark:text-red-100 mb-4">
            Acesso Negado
          </h1>
          <p className="text-xl text-red-700 dark:text-red-300">
            Esta área é restrita ao painel de chamadas.
          </p>
        </Card>
      </div>
    );
  }

  // Buscar últimas chamadas (status "chamado" e "em_atendimento")
  const { data: calledEntries } = useQuery<QueueEntryWithPatient[]>({
    queryKey: ["/api/queue/called"],
    refetchInterval: 3000, // Auto-refresh a cada 3 segundos
  });

  useEffect(() => {
    if (calledEntries && calledEntries.length > 0) {
      // Separar chamadas ativas (chamado/em_atendimento) das finalizadas
      const activeCalls = calledEntries.filter(e => 
        e.status === 'chamado' || e.status === 'em_atendimento'
      ).sort((a, b) => 
        new Date(b.calledTime || 0).getTime() - new Date(a.calledTime || 0).getTime()
      );
      
      const finishedCalls = calledEntries.filter(e => 
        e.status === 'finalizado'
      ).sort((a, b) => 
        new Date(b.calledTime || 0).getTime() - new Date(a.calledTime || 0).getTime()
      );
      
      // A chamada atual é a primeira ativa (se houver)
      const latest = activeCalls[0] || null;
      
      // Histórico: demais chamadas ativas + finalizadas (até 5 no total)
      const otherActive = activeCalls.slice(1);
      const history = [...otherActive, ...finishedCalls].slice(0, 5);
      
      // Verificar se é uma nova chamada
      if (currentCall?.id !== latest?.id) {
        setIsNewCall(true);
        setTimeout(() => setIsNewCall(false), 3000);
      }
      
      setCurrentCall(latest);
      setPreviousCalls(history);
    } else {
      // Se não há chamadas, limpar o painel
      setCurrentCall(null);
      setPreviousCalls([]);
    }
  }, [calledEntries]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <img src={hospitalLogo} alt="Hospital Logo" className="h-24 w-auto" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Exu Saúde - Sistema de Atendimento Médico
        </h1>
        <p className="text-2xl text-gray-600 dark:text-gray-300">
          Painel de Chamadas - Fila de Atendimento
        </p>
      </div>

      {/* Chamada Atual */}
      {currentCall ? (
        <Card 
          className={`mb-8 p-12 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 border-4 border-blue-500 shadow-2xl transition-all duration-500 ${
            isNewCall ? 'animate-pulse scale-105' : 'scale-100'
          }`}
          data-testid="current-call-card"
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <Stethoscope className="h-16 w-16 text-white animate-pulse" />
              <h2 className="text-5xl font-bold text-white">
                {currentCall.status === 'em_atendimento' ? 'EM ATENDIMENTO' : 'CHAMANDO AGORA'}
              </h2>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-6">
              <div className="flex items-center justify-center gap-6 mb-4">
                <Badge 
                  variant="outline" 
                  className="text-6xl font-bold px-8 py-4 bg-blue-600 text-white border-blue-700"
                  data-testid={`badge-queue-number-${currentCall.queueNumber}`}
                >
                  SENHA {currentCall.queueNumber.toString().padStart(3, '0')}
                </Badge>
                {currentCall.status === 'em_atendimento' && (
                  <Badge 
                    className="text-3xl font-bold px-6 py-3 bg-green-600 text-white border-green-700"
                    data-testid="badge-in-attendance"
                  >
                    ✅ EM ATENDIMENTO
                  </Badge>
                )}
              </div>
              
              <h3 
                className="text-6xl font-bold text-gray-900 dark:text-white mb-4"
                data-testid={`text-patient-name-${currentCall.patient.name}`}
              >
                {currentCall.patient.name}
              </h3>
              
              {currentCall.calledTime && (
                <div className="flex items-center justify-center gap-2 text-2xl text-gray-600 dark:text-gray-400">
                  <Clock className="h-8 w-8" />
                  <span data-testid="text-called-time">
                    Chamado às {format(new Date(currentCall.calledTime), "HH:mm:ss", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
            
            {currentCall.priority && (
              <Badge 
                variant="destructive" 
                className="text-2xl px-6 py-2"
                data-testid="badge-priority"
              >
                {currentCall.priority === '1' && '🚨 EMERGÊNCIA'}
                {currentCall.priority === '2' && '⚠️ ALTA PRIORIDADE'}
                {currentCall.priority === '3' && '⚡ MÉDIA PRIORIDADE'}
                {currentCall.priority === '4' && '📋 BAIXA PRIORIDADE'}
              </Badge>
            )}
          </div>
        </Card>
      ) : (
        <Card className="mb-8 p-12 bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-500 dark:text-gray-400">
              Aguardando próxima chamada...
            </h2>
          </div>
        </Card>
      )}

      {/* Histórico das Últimas Chamadas */}
      {previousCalls.length > 0 && (
        <div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Últimas Chamadas
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {previousCalls.map((entry, index) => (
              <Card 
                key={entry.id} 
                className="p-6 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 opacity-80 hover:opacity-100 transition-opacity"
                data-testid={`history-card-${index}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge 
                      variant="outline" 
                      className="text-3xl font-bold px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                      data-testid={`badge-history-number-${entry.queueNumber}`}
                    >
                      {entry.queueNumber.toString().padStart(3, '0')}
                    </Badge>
                    <span 
                      className="text-3xl font-medium text-gray-900 dark:text-white"
                      data-testid={`text-history-name-${entry.patient.name}`}
                    >
                      {entry.patient.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {entry.priority && (
                      <Badge 
                        variant="secondary" 
                        className="text-xl px-4 py-1"
                        data-testid="badge-history-priority"
                      >
                        {entry.priority === '1' && '🚨'}
                        {entry.priority === '2' && '⚠️'}
                        {entry.priority === '3' && '⚡'}
                        {entry.priority === '4' && '📋'}
                      </Badge>
                    )}
                    
                    {entry.calledTime && (
                      <div className="flex items-center gap-2 text-xl text-gray-600 dark:text-gray-400">
                        <Clock className="h-5 w-5" />
                        <span data-testid="text-history-time">
                          {format(new Date(entry.calledTime), "HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    
                    <Badge 
                      className="text-xl px-4 py-1"
                      variant={
                        entry.status === 'em_atendimento' ? 'default' : 
                        entry.status === 'chamado' ? 'outline' : 
                        'secondary'
                      }
                      data-testid="badge-history-status"
                    >
                      {entry.status === 'em_atendimento' && '👨‍⚕️ Em Atendimento'}
                      {entry.status === 'chamado' && '📢 Chamado'}
                      {entry.status === 'finalizado' && '✅ Atendido'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Rodapé com data/hora */}
      <div className="mt-12 text-center">
        <p className="text-2xl text-gray-600 dark:text-gray-400">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy - HH:mm:ss", { locale: ptBR })}
        </p>
      </div>
    </div>
  );
}
