import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório")
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: data,
      });
      
      setShowSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar email de recuperação");
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img 
              src={hospitalLogo} 
              alt="Exu Saúde - Sistema de Atendimento Médico" 
              className="h-20 w-auto mx-auto mb-4"
            />
            <h2 className="text-lg font-semibold text-gray-700">Exu Saúde - Sistema de Atendimento Médico</h2>
            <p className="text-sm text-gray-500">Sistema de Atendimento Médico</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Email Enviado!
              </CardTitle>
              <CardDescription>
                Instruções de recuperação foram enviadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Se o email informado estiver cadastrado em nosso sistema, você receberá instruções para redefinir sua senha em alguns minutos.
                </AlertDescription>
              </Alert>
              
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Próximos passos:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Verifique sua caixa de entrada</li>
                  <li>Clique no link recebido por email</li>
                  <li>O link expira em 15 minutos</li>
                  <li>Se não receber, verifique a pasta de spam</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => setLocation("/auth")}
                  variant="outline"
                  className="w-full"
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Login
                </Button>
                
                <Button
                  onClick={() => {
                    setShowSuccess(false);
                    form.reset();
                  }}
                  variant="ghost"
                  className="w-full"
                  data-testid="button-send-again"
                >
                  Enviar Novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={hospitalLogo} 
            alt="Exu Saúde - Sistema de Atendimento Médico" 
            className="h-20 w-auto mx-auto mb-4"
          />
          <h2 className="text-lg font-semibold text-gray-700">Exu Saúde - Sistema de Atendimento Médico</h2>
          <p className="text-sm text-gray-500">Sistema de Atendimento Médico</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-gray-900">
              Esqueci Minha Senha
            </CardTitle>
            <CardDescription>
              Digite seu email para receber instruções de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Digite seu email cadastrado"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-send-email"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar Instruções
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/auth")}
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Login
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}