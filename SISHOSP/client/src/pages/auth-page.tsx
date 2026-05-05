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
    <div className="ag-anim-fade-scale min-h-screen bg-slate-50 flex">

      {/* Painel esquerdo — funcionalidades */}
      <div className="login-left-panel hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 ag-hero-primary shadow-[20px_0_40px_rgba(0,0,0,0.1)] z-10">
        <div className="text-white relative z-10">
          <div className="mb-10 text-center">
            <div className="ag-icon-wrap bg-white/20 backdrop-blur-md mx-auto mb-6 h-20 w-20 rounded-2xl shadow-lg">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Exu Saúde</h1>
            <p className="text-blue-100 mt-2 font-medium">Sistema de Atendimento Médico</p>
          </div>

          <div className="space-y-6 max-w-md mx-auto">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start space-x-4 bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 hover:bg-white/20 transition-all">
                <Icon className="h-7 w-7 text-white/90 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold mb-1 text-white">{title}</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">{desc}</p>
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
          <div className="ag-card p-8 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo</h2>
              <p className="text-gray-500 text-sm mb-4">Acesse o sistema de atendimento médico</p>
              <div className="flex justify-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                  {APP_VERSION}
                </span>
              </div>
            </div>

            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">

                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nome de usuário"
                          className="h-12 bg-white/50 border-gray-200 focus:ring-blue-500 transition-all rounded-xl"
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
                          className="h-12 bg-white/50 border-gray-200 focus:ring-blue-500 transition-all rounded-xl"
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 ag-btn-glow bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white border-0 transition-all font-medium rounded-xl"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>

                <div className="text-center pt-2">
                  <a
                    href="/esqueci-senha"
                    className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    data-testid="link-forgot-password"
                  >
                    Esqueci minha senha
                  </a>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
