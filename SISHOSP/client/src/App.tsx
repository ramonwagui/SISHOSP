import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import AdminPatients from "@/pages/admin-patients";
import AdminAppointments from "@/pages/admin-appointments";
import MedicalHistory from "@/pages/medical-history";
import QuickNotes from "@/pages/quick-notes";
import TriagePage from "@/pages/triage";
import QueueManagement from "@/pages/queue-management";
import DoctorQueue from "@/pages/doctor-queue";
import QueueDisplay from "@/pages/queue-display";
import MedicalDocuments from "@/pages/medical-documents";
import ConsultorioDigital from "@/pages/consultorio-digital";
import ClinicalSupport from "@/pages/clinical-support";
import DoctorMetrics from "@/pages/doctor-metrics";
import Reports from "@/pages/reports";
import { WhatsAppAdmin } from "@/pages/whatsapp-admin";
import SatisfactionSurveys from "@/pages/satisfaction-surveys";
import UserManagement from "@/pages/user-management";
import SecurityDashboard from "@/pages/security-dashboard";
import AnamnesisTemplates from "@/pages/anamnesis-templates";
import ClinicalProtocols from "@/pages/clinical-protocols";
import SignatureSettings from "@/pages/signature-settings";
import PainelChamadas from "@/pages/painel-chamadas";
import Radiologia from "@/pages/radiologia";
import Laboratorio from "@/pages/laboratorio";
import PesquisaSatisfacao from "@/pages/pesquisa-satisfacao";
import PharmacyInventory from "@/pages/pharmacy-inventory";
import PharmacyLowStock from "@/pages/pharmacy-low-stock";
import PharmacyExpiring from "@/pages/pharmacy-expiring";
import Internacao from "@/pages/internacao";
import Observacao from "@/pages/observacao";
import SalaVermelha from "@/pages/sala-vermelha";
import ForceChangePassword from "@/pages/force-change-password";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/useAuth.tsx";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/admin/patients" component={AdminPatients} />
      <ProtectedRoute path="/admin/appointments" component={AdminAppointments} />
      <ProtectedRoute path="/admin/medical-history" component={MedicalHistory} />
      <ProtectedRoute path="/prontuario-rapido" component={QuickNotes} />
      <ProtectedRoute path="/triagem" component={TriagePage} />
      <ProtectedRoute path="/gestao-fila" component={QueueManagement} />
      <ProtectedRoute path="/fila-medico" component={DoctorQueue} />
      <ProtectedRoute path="/documentos-medicos" component={MedicalDocuments} />
      <ProtectedRoute path="/consultorio-digital" component={ConsultorioDigital} />
      <ProtectedRoute path="/suporte-clinico" component={ClinicalSupport} />
      <ProtectedRoute path="/metricas-medico" component={DoctorMetrics} />
      <ProtectedRoute path="/admin/reports" component={Reports} />
      <ProtectedRoute path="/admin/whatsapp" component={WhatsAppAdmin} />
      <ProtectedRoute path="/admin/satisfaction" component={SatisfactionSurveys} />
      <ProtectedRoute path="/admin/users" component={UserManagement} />
      <ProtectedRoute path="/admin/security" component={SecurityDashboard} />
      <ProtectedRoute path="/admin/anamnesis-templates" component={AnamnesisTemplates} />
      <ProtectedRoute path="/admin/clinical-protocols" component={ClinicalProtocols} />
      <ProtectedRoute path="/configuracao-assinatura" component={SignatureSettings} />
      <ProtectedRoute path="/painel-chamadas" component={PainelChamadas} />
      <ProtectedRoute path="/radiologia" component={Radiologia} />
      <ProtectedRoute path="/laboratorio" component={Laboratorio} />
      <ProtectedRoute path="/farmacia" component={PharmacyInventory} />
      <ProtectedRoute path="/farmacia/estoque-baixo" component={PharmacyLowStock} />
      <ProtectedRoute path="/farmacia/vencendo" component={PharmacyExpiring} />
      <ProtectedRoute path="/internacao" component={Internacao} />
      <ProtectedRoute path="/observacao" component={Observacao} />
      <ProtectedRoute path="/sala-vermelha" component={SalaVermelha} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/trocar-senha" component={ForceChangePassword} />
      <Route path="/esqueci-senha" component={ForgotPasswordPage} />
      <Route path="/redefinir-senha" component={ResetPasswordPage} />
      <Route path="/painel-fila" component={QueueDisplay} />
      <Route path="/pesquisa/:token" component={PesquisaSatisfacao} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-slate-50">
            <Router />
            <Toaster />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
