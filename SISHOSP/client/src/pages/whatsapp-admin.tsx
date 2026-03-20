import { WhatsAppIntegration } from "@/components/whatsapp-integration";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, LogOut } from "lucide-react";

export function WhatsAppAdmin() {
  const [, setLocation] = useLocation();

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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img 
                src="/hospital-logo.png" 
                alt="Hospital Logo" 
                className="h-8 w-8 mr-3"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Exu Saúde - Sistema de Atendimento Médico
                </h1>
                <p className="text-sm text-gray-600">
                  Gerenciamento WhatsApp
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
                className="flex items-center gap-2"
                data-testid="button-back-to-dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Dashboard
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-2"
                data-testid="logout-button"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Integração WhatsApp Business
          </h2>
          <p className="text-gray-600">
            Configure e gerencie o envio de lembretes automáticos via WhatsApp para os pacientes
          </p>
        </div>

        <WhatsAppIntegration />
      </div>
    </div>
  );
}