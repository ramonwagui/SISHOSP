import { useState, useEffect } from "react";
import { Calendar, Mail, CheckCircle, AlertCircle, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface IntegrationStatusProps {
  className?: string;
}

export default function IntegrationStatus({ className }: IntegrationStatusProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState({
    calendar: false,
    email: false
  });

  useEffect(() => {
    // Check integration status
    fetch('/api/integration-status')
      .then(res => res.json())
      .then(data => setIntegrationStatus(data))
      .catch(() => {}); // Ignore errors - will show as not configured
  }, []);

  return (
    <Card className={`border-blue-200 bg-blue-50 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-blue-100 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-blue-900 flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Status das Integrações
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-700">
                {isOpen ? "Ocultar" : "Ver Detalhes"}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Google Calendar Status */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Google Calendar</p>
                    <p className="text-sm text-gray-600">Agendamentos automáticos no calendário</p>
                  </div>
                </div>
                {integrationStatus.calendar ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Configurado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Configuração Pendente
                  </Badge>
                )}
              </div>

              {/* Email Status */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Notificações por Email</p>
                    <p className="text-sm text-gray-600">Confirmações automáticas aos pacientes</p>
                  </div>
                </div>
                {integrationStatus.email ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Configurado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Configuração Pendente
                  </Badge>
                )}
              </div>

              {/* Configuration Instructions */}
              <div className="mt-4 p-4 bg-blue-100 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Como Configurar:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Configure as credenciais do Google Calendar e Gmail nas variáveis de ambiente</li>
                  <li>Consulte o arquivo <code className="bg-blue-200 px-1 rounded">SETUP_GOOGLE_CALENDAR.md</code> para instruções detalhadas</li>
                  <li>Após a configuração, os agendamentos aparecerão automaticamente no calendário</li>
                  <li>Emails de confirmação serão enviados automaticamente aos pacientes</li>
                </ol>
              </div>

              <div className="mt-4 p-4 bg-green-100 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2 flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Funcionalidades Ativas:
                </h4>
                <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                  <li>Sistema de agendamentos funcionando perfeitamente</li>
                  <li>Gerenciamento de especialidades médicas</li>
                  <li>Dashboard administrativo completo</li>
                  <li>Relatórios e estatísticas</li>
                  <li>Validação de dados brasileiros (CPF, SUS, telefone)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}