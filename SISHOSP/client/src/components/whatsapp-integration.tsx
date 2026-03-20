import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, Send, Users, Calendar, CheckCircle, XCircle, AlertTriangle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";

interface WhatsAppStatus {
  configured: boolean;
  credentials: {
    phoneNumberId: boolean;
    accessToken: boolean;
    webhookVerifyToken: boolean;
  };
}

interface BulkReminderRequest {
  type: "reminder" | "today";
  date?: string;
}

interface ReminderResult {
  appointmentId: string;
  patientName: string;
  whatsapp?: string;
  success: boolean;
  error?: string;
}

interface BulkReminderResponse {
  message: string;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  results: ReminderResult[];
}

export function WhatsAppIntegration() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderType, setReminderType] = useState<"reminder" | "today">("reminder");
  const [lastBulkResult, setLastBulkResult] = useState<BulkReminderResponse | null>(null);
  const [testNumber, setTestNumber] = useState("");
  const [testName, setTestName] = useState("");

  // Query WhatsApp status
  const { data: whatsappStatus, isLoading: statusLoading, error: statusError } = useQuery<WhatsAppStatus>({
    queryKey: ['/api/whatsapp/status'],
    retry: 2
  });

  // Send manual reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async ({ appointmentId, type }: { appointmentId: string; type: string }) => {
      return await apiRequest(`/api/whatsapp/send-reminder/${appointmentId}`, {
        method: 'POST',
        body: { type }
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sucesso",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar lembrete",
        variant: "destructive",
      });
    },
  });

  // Send bulk reminders mutation
  const sendBulkRemindersMutation = useMutation({
    mutationFn: async (request: BulkReminderRequest): Promise<BulkReminderResponse> => {
      return await apiRequest('/api/whatsapp/send-bulk-reminders', {
        method: 'POST',
        body: request
      });
    },
    onSuccess: (data: BulkReminderResponse) => {
      setLastBulkResult(data);
      toast({
        title: "Envio Concluído",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar lembretes em lote",
        variant: "destructive",
      });
    },
  });

  // Test specific number mutation
  const testNumberMutation = useMutation({
    mutationFn: async ({ whatsapp, patientName }: { whatsapp: string; patientName: string }) => {
      return await apiRequest('/api/whatsapp/test-number', {
        method: 'POST',
        body: { whatsapp, patientName }
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: data.success ? "Teste Enviado" : "Teste Falhou",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
      
      // Mostrar recomendações se disponíveis
      if (data.recommendations && data.recommendations.length > 0) {
        setTimeout(() => {
          toast({
            title: "Recomendações",
            description: data.recommendations.slice(0, 2).join('. '),
            duration: 8000
          });
        }, 2000);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro no Teste",
        description: error.message || "Erro ao testar número",
        variant: "destructive",
      });
    },
  });

  const handleSendBulkReminders = () => {
    const request: BulkReminderRequest = {
      type: reminderType,
      date: selectedDate
    };
    sendBulkRemindersMutation.mutate(request);
  };

  if (statusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Integração WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (statusError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Integração WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar status do WhatsApp. Verifique a conexão.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Status da Integração WhatsApp
          </CardTitle>
          <CardDescription>
            Configure as credenciais do WhatsApp Business API para enviar lembretes automáticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status da Configuração</span>
              <Badge variant={whatsappStatus?.configured ? "default" : "destructive"}>
                {whatsappStatus?.configured ? "Configurado" : "Não Configurado"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                {whatsappStatus?.credentials.phoneNumberId ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">Phone Number ID</span>
              </div>
              <div className="flex items-center gap-2">
                {whatsappStatus?.credentials.accessToken ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">Access Token</span>
              </div>
              <div className="flex items-center gap-2">
                {whatsappStatus?.credentials.webhookVerifyToken ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">Webhook Token (Opcional)</span>
              </div>
            </div>

            {!whatsappStatus?.configured && (
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Para configurar o WhatsApp Business API, adicione as seguintes variáveis de ambiente:
                  <ul className="mt-2 list-disc list-inside text-sm">
                    <li><code>WHATSAPP_PHONE_NUMBER_ID</code></li>
                    <li><code>WHATSAPP_ACCESS_TOKEN</code></li>
                    <li><code>WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> (opcional)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Reminders Card */}
      {whatsappStatus?.configured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lembretes em Lote
            </CardTitle>
            <CardDescription>
              Envie lembretes de WhatsApp para múltiplos pacientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reminder-type">Tipo de Lembrete</Label>
                  <Select value={reminderType} onValueChange={(value: "reminder" | "today") => setReminderType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reminder">Lembrete (1 dia antes)</SelectItem>
                      <SelectItem value="today">Lembrete do dia (consultas hoje)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="selected-date">Data de Referência</Label>
                  <Input
                    id="selected-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSendBulkReminders}
                  disabled={sendBulkRemindersMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendBulkRemindersMutation.isPending ? "Enviando..." : "Enviar Lembretes"}
                </Button>

                {reminderType === "reminder" && (
                  <p className="text-sm text-gray-600 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Enviará para consultas agendadas para amanhã
                  </p>
                )}

                {reminderType === "today" && (
                  <p className="text-sm text-gray-600 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Enviará para consultas de hoje
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Card */}
      {lastBulkResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Último Resultado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{lastBulkResult.totalProcessed}</div>
                  <div className="text-sm text-gray-600">Total Processados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{lastBulkResult.successCount}</div>
                  <div className="text-sm text-gray-600">Sucessos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{lastBulkResult.errorCount}</div>
                  <div className="text-sm text-gray-600">Erros</div>
                </div>
              </div>

              {lastBulkResult.results.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Detalhes dos Envios:</h4>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {lastBulkResult.results.map((result, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-2 rounded text-sm ${
                          result.success
                            ? "bg-green-50 text-green-800"
                            : "bg-red-50 text-red-800"
                        }`}
                      >
                        <span>{result.patientName}</span>
                        <div className="flex items-center gap-2">
                          {result.whatsapp && <span className="text-xs">{result.whatsapp}</span>}
                          {result.success ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Number Card */}
      {whatsappStatus?.configured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Teste de Número Individual
            </CardTitle>
            <CardDescription>
              Teste se um número específico recebe mensagens do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-number">Número WhatsApp</Label>
                  <Input
                    id="test-number"
                    type="text"
                    placeholder="(87) 99999-9999"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test-name">Nome do Paciente</Label>
                  <Input
                    id="test-name"
                    type="text"
                    placeholder="Nome para teste"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                  />
                </div>
              </div>
              
              <Button
                onClick={() => testNumberMutation.mutate({ whatsapp: testNumber, patientName: testName })}
                disabled={testNumberMutation.isPending || !testNumber || !testName}
                className="w-full"
              >
                {testNumberMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando Teste...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Mensagem de Teste
                  </>
                )}
              </Button>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Diagnóstico Avançado:</strong> O teste envia uma mensagem e analisa possíveis problemas.
                  <br /><strong>✅ Conta WhatsApp:</strong> CONNECTED com rating GREEN (excelente qualidade)
                  <br /><strong>⚠️  Problema identificado:</strong> Algumas mensagens não chegam mesmo com API funcionando
                  <br /><strong>💡 Solução:</strong> Use este teste e confirme manualmente com pacientes
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}