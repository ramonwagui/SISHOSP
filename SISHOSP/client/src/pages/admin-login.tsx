import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, ArrowLeft } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logoHmjps from "@assets/LOGO-HMJPS_1765285256517.png";

const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (data.username === "admin" && data.password === "admin123") {
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo ao painel administrativo!",
      });
      sessionStorage.setItem("isAdminLoggedIn", "true");
      setLocation("/admin/dashboard");
    } else {
      toast({
        title: "Erro de autenticação",
        description: "Usuário ou senha incorretos",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a1628]">

      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M30 0 L60 15 L60 45 L30 60 L0 45 L0 15 Z' fill='none' stroke='%2300bcd4' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d2240] to-[#0a3322] opacity-90" />

      <div className="absolute top-[-120px] left-[-120px] w-96 h-96 rounded-full bg-cyan-500 opacity-[0.06] blur-3xl" />
      <div className="absolute bottom-[-100px] right-[-100px] w-80 h-80 rounded-full bg-emerald-500 opacity-[0.07] blur-3xl" />

      <div className="relative z-10 w-full max-w-sm mx-4">

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          <div className="bg-gradient-to-r from-[#0d2240] to-[#0a3322] px-8 pt-8 pb-7 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg mb-4 ring-4 ring-white/20">
              <img
                src={logoHmjps}
                alt="Logo HMJPS"
                className="w-20 h-20 object-contain rounded-full"
              />
            </div>
            <h1 className="text-white text-lg font-bold text-center leading-tight">
              Exu Saúde
            </h1>
            <p className="text-cyan-300 text-xs font-medium mt-1 tracking-widest uppercase">
              Área Administrativa
            </p>
          </div>

          <div className="px-8 py-7">
            <p className="text-slate-500 text-sm text-center mb-6">
              Informe suas credenciais para continuar
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Usuário"
                            className="pl-10 h-11 bg-slate-50 border-slate-200 focus:border-cyan-500 focus:ring-cyan-500 rounded-xl text-slate-700 placeholder:text-slate-400"
                            data-testid="input-username"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            type="password"
                            placeholder="Senha"
                            className="pl-10 h-11 bg-slate-50 border-slate-200 focus:border-cyan-500 focus:ring-cyan-500 rounded-xl text-slate-700 placeholder:text-slate-400"
                            data-testid="input-password"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 mt-2 bg-gradient-to-r from-[#0d2240] to-[#0a3d22] hover:from-[#112d54] hover:to-[#0d4f2b] text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Entrando...
                    </span>
                  ) : "Entrar"}
                </Button>
              </form>
            </Form>

            <p className="text-xs text-slate-400 text-center mt-5">
              Credenciais de teste: <span className="font-medium text-slate-500">admin / admin123</span>
            </p>
          </div>
        </div>

        <div className="mt-5 text-center">
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-cyan-300 text-sm transition-colors duration-200"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao agendamento
          </button>
        </div>
      </div>
    </div>
  );
}
