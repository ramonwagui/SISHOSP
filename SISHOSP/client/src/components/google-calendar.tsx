import { Calendar } from "lucide-react";

interface GoogleCalendarProps {
  className?: string;
}

export default function GoogleCalendar({ className = "" }: GoogleCalendarProps) {
  // URL específico do Google Calendar fornecido pelo usuário
  // Configurado para ramon@ncconvenios.com.br
  const calendarUrl = "https://calendar.google.com/calendar/embed?src=ramon%40ncconvenios.com.br&ctz=America%2FRecife";

  return (
    <div className={`bg-white rounded-lg shadow-md border ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Calendar className="mr-2 h-5 w-5 text-blue-600" />
          Calendário do Hospital - Agendamentos
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Visualize todos os agendamentos do Hospital Regional Fernando Bezerra em tempo real
        </p>
      </div>
      
      <div className="p-6">
        <div className="w-full overflow-hidden rounded-lg">
          <iframe
            src={calendarUrl}
            style={{ border: 0 }}
            width="100%"
            height="600"
            frameBorder="0"
            scrolling="no"
            title="Google Calendar - Hospital Regional Fernando Bezerra"
            className="w-full"
            data-testid="google-calendar-iframe"
          />
        </div>
        
        <div className="mt-4 space-y-3">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Sincronização Automática
                </p>
                <p className="text-sm text-blue-700">
                  Todos os agendamentos criados no sistema são automaticamente sincronizados com o Google Calendar
                </p>
              </div>
            </div>
          </div>
          

        </div>
      </div>
    </div>
  );
}