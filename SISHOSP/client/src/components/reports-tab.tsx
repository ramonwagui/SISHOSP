import { FileText, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStats {
  todayAppointments: number;
  monthlyAppointments: number;
  totalSpecialties: number;
  pendingAppointments: number;
  appointmentsBySpecialty: Array<{
    specialty: string;
    count: number;
  }>;
}

interface ReportsTabProps {
  stats?: DashboardStats;
}

export default function ReportsTab({ stats }: ReportsTabProps) {
  const handleExportPDF = () => {
    // In a real implementation, this would generate and download a PDF report
    console.log("Exporting PDF report...");
  };

  const handleExportExcel = () => {
    // In a real implementation, this would generate and download an Excel file
    console.log("Exporting Excel report...");
  };

  const handleExportCSV = () => {
    // In a real implementation, this would generate and download a CSV file
    console.log("Exporting CSV report...");
  };

  const getSpecialtyPercentage = (count: number) => {
    const total = stats?.appointmentsBySpecialty.reduce((sum, item) => sum + item.count, 0) || 1;
    return Math.round((count / total) * 100);
  };

  const specialtyColors = [
    "bg-blue-500",
    "bg-green-500", 
    "bg-purple-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-indigo-500"
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Relatórios</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments by Specialty Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Agendamentos por Especialidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.appointmentsBySpecialty && stats.appointmentsBySpecialty.length > 0 ? (
              <div className="space-y-4">
                {stats.appointmentsBySpecialty.map((item, index) => (
                  <div key={item.specialty} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className={`w-4 h-4 rounded-full mr-3 ${specialtyColors[index % specialtyColors.length]}`}
                      ></div>
                      <span 
                        className="text-sm text-gray-700"
                        data-testid={`specialty-chart-name-${index}`}
                      >
                        {item.specialty}
                      </span>
                    </div>
                    <span 
                      className="text-sm font-medium text-gray-900"
                      data-testid={`specialty-chart-count-${index}`}
                    >
                      {item.count} ({getSpecialtyPercentage(item.count)}%)
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto h-8 w-8 mb-2" />
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Resumo do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2" data-testid="monthly-total">
                  {stats?.monthlyAppointments || 0}
                </div>
                <p className="text-sm text-gray-600">Agendamentos este mês</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-semibold text-green-600" data-testid="today-total">
                    {stats?.todayAppointments || 0}
                  </div>
                  <p className="text-xs text-green-700">Hoje</p>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-semibold text-orange-600" data-testid="pending-total">
                    {stats?.pendingAppointments || 0}
                  </div>
                  <p className="text-xs text-orange-700">Pendentes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
            <Download className="mr-2 h-5 w-5" />
            Exportar Relatórios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleExportPDF}
              className="bg-red-600 text-white hover:bg-red-700"
              data-testid="button-export-pdf"
            >
              <FileText className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            
            <Button
              onClick={handleExportExcel}
              className="bg-green-600 text-white hover:bg-green-700"
              data-testid="button-export-excel"
            >
              <FileText className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
            
            <Button
              onClick={handleExportCSV}
              className="bg-gray-600 text-white hover:bg-gray-700"
              data-testid="button-export-csv"
            >
              <FileText className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            Os relatórios incluem todos os agendamentos, especialidades e estatísticas do período selecionado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}