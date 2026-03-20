import AppointmentForm from "@/components/appointment-form";
import IntegrationStatus from "@/components/integration-status";
import { Clock, Shield, Smartphone, Calendar } from "lucide-react";

export default function PatientBooking() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Calendar className="text-white text-2xl h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Agendamento de Consultas
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Agende sua consulta médica de forma rápida e segura. Preencha os dados abaixo.
          </p>
        </div>

        {/* Integration Status */}
        <IntegrationStatus className="mb-6" />
        
        {/* Appointment Form */}
        <AppointmentForm />

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Clock className="text-blue-600 h-6 w-6" />
            </div>
            <h4 className="font-semibold text-gray-800 mb-2">Atendimento Rápido</h4>
            <p className="text-sm text-gray-600">
              Agendamento em poucos minutos com confirmação automática
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Shield className="text-green-600 h-6 w-6" />
            </div>
            <h4 className="font-semibold text-gray-800 mb-2">Dados Seguros</h4>
            <p className="text-sm text-gray-600">
              Suas informações são protegidas e tratadas com segurança
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Smartphone className="text-purple-600 h-6 w-6" />
            </div>
            <h4 className="font-semibold text-gray-800 mb-2">Confirmação WhatsApp</h4>
            <p className="text-sm text-gray-600">
              Receba a confirmação diretamente no seu WhatsApp
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
