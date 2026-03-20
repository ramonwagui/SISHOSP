import { Hospital, Calendar, Users, BarChart3, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6">
            <Hospital className="text-white text-3xl h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Exu Saúde - Sistema de Atendimento Médico
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Sistema completo de gerenciamento de agendamentos médicos com integração ao Google Calendar e notificações automáticas.
          </p>
          <Button
            onClick={handleLogin}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold"
            data-testid="login-button"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Acessar Sistema
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-blue-600 h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-800">
                Agendamento Inteligente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                Sistema completo de agendamentos com busca de pacientes existentes e integração automática com Google Calendar.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="text-green-600 h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-800">
                Gestão de Pacientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                Cadastro completo de pacientes com dados persistentes e reutilização em futuros agendamentos.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="text-purple-600 h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-800">
                Relatórios e Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                Dashboard administrativo completo com relatórios de agendamentos e estatísticas em tempo real.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Funcionalidades do Sistema
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-gray-800">Agendamentos Online</h3>
                <p className="text-gray-600 text-sm">Interface intuitiva para agendamento de consultas médicas</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-gray-800">Google Calendar</h3>
                <p className="text-gray-600 text-sm">Sincronização automática com Google Calendar</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-gray-800">Notificações Email</h3>
                <p className="text-gray-600 text-sm">Confirmações automáticas por email</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-gray-800">Gestão de Especialidades</h3>
                <p className="text-gray-600 text-sm">Cadastro e organização de especialidades médicas</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-gray-800">Busca de Pacientes</h3>
                <p className="text-gray-600 text-sm">Localização rápida de pacientes por CPF ou nome</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-gray-800">Relatórios</h3>
                <p className="text-gray-600 text-sm">Estatísticas e relatórios detalhados</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}