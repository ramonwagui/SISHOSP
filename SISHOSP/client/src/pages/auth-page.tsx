import { useEffect } from "react";
import { useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth.tsx";
import { Shield, Users, MessageCircle, FileText, Timer, BarChart3 } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";
import exuBemCuidadaLogo from "@assets/logo exubemcuidada_1762209281517.png";
import secretariaSaudeLogo from "@assets/logo secretaria de saude_1762209281518.png";

const loginSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const features = [
  { icon: Shield, title: "Sistema Seguro", desc: "Acesso protegido com autenticação para garantir a segurança dos dados." },
  { icon: Users, title: "Gestão Completa", desc: "Gerencie pacientes, especialidades e atendimentos em uma plataforma integrada." },
  { icon: MessageCircle, title: "Notificações por WhatsApp", desc: "Lembretes automáticos para evitar faltas e manter o paciente informado." },
  { icon: FileText, title: "Histórico Médico Digital", desc: "Acesso rápido ao histórico de consultas, exames e prescrições médicas." },
  { icon: Timer, title: "Redução de Tempo de Espera", desc: "Organização otimizada de filas e atendimento para evitar aglomerações." },
  { icon: BarChart3, title: "Relatórios e Estatísticas", desc: "Dados sobre atendimentos, taxa de comparecimento e produtividade dos profissionais." },
];

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, loginMutation } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.id === 'c6f3a02b-6499-4ffb-a905-f6506128ab90') {
        setLocation("/painel-chamadas");
      } else if (user.role === 'farmacia') {
        setLocation("/farmacia");
      } else if (user.role === 'radiologista' || user.medicalSpecialty?.toLowerCase() === 'radiologia') {
        setLocation("/radiologia");
      } else if (user.role === 'laboratorio') {
        setLocation("/laboratorio");
      } else {
        setLocation("/");
      }
    }
  }, [user, isLoading, setLocation]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onLogin = (data: LoginFormData) => {
    loginMutation.mutate(data, {
      onSuccess: (user) => {
        const isExemptFromPasswordChange = user.role === 'admin' || user.username === 'admin' || user.username === 'admin.reserva';
        if (user.mustChangePassword && !isExemptFromPasswordChange) {
          setLocation("/trocar-senha");
          return;
        }
        if (user.id === 'c6f3a02b-6499-4ffb-a905-f6506128ab90') {
          setLocation("/painel-chamadas");
        } else if (user.role === 'farmacia') {
          setLocation("/farmacia");
        } else if (user.role === 'diretor') {
          setLocation("/admin/users");
        } else if (user.role === 'radiologista' || user.medicalSpecialty?.toLowerCase() === 'radiologia') {
          setLocation("/radiologia");
        } else if (user.role === 'laboratorio') {
          setLocation("/laboratorio");
        } else {
          setLocation("/");
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">

      {/* Painel esquerdo — funcionalidades */}
      <div className="login-left-panel hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12">
        <div className="text-white">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Exu Saúde</h1>
            <p className="text-blue-100 mt-1">Sistema de Atendimento Médico</p>
          </div>

          <div className="space-y-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start space-x-4">
                <Icon className="h-8 w-8 text-blue-200 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold mb-1">{title}</h3>
                  <p className="text-blue-100">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">

          {/* Logos */}
          <div className="text-center mb-8">
            <img
              src={hospitalLogo}
              alt="HMJPS"
              className="h-32 w-auto mx-auto mb-6"
            />
            <div className="flex items-center justify-center gap-8 mb-6">
              <img src={exuBemCuidadaLogo} alt="Exu Bem Cuidada" className="h-20 w-auto" />
              <img src={secretariaSaudeLogo} alt="Secretaria de Saúde" className="h-20 w-auto" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700">Exu Saúde - Sistema de Atendimento Médico</h2>
          </div>

          {/* Card de login */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">Bem-vindo</CardTitle>
              <CardDescription>Acesse o sistema de atendimento médico</CardDescription>
              <div className="flex justify-center pt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                  {APP_VERSION}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">

                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Nome de usuário"
                            data-testid="input-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Senha"
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Entrando..." : "Entrar"}
                  </Button>

                  <div className="text-center">
                    <a
                      href="/esqueci-senha"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      data-testid="link-forgot-password"
                    >
                      Esqueci minha senha
                    </a>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
