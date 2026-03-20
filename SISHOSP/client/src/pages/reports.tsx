import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, FileBarChart, Filter, MapPin, Users, TrendingUp, ArrowLeft, LogOut, Stethoscope, X, Printer, Award, Activity } from "lucide-react";
import { type Specialty } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth.tsx";
import hospitalLogo from "@assets/LOGO-HMJPS_1765285256517.png";
import susLogo from "@assets/sus-logo_1762211847003.png";
import secretariaLogo from "@assets/logo secretaria de saude_1762211847002.png";
import exuBemLogo from "@assets/logo exubemcuidada_1762211847001.png";

interface AttendanceFilters {
  startDate: string;
  endDate: string;
  specialtyId: string;
  doctorName: string;
  zoneType: string;
}

interface AttendanceReportData {
  period: string;
  total: number;
  urban: number;
  rural: number;
  activeDoctors: number;
  specialtyBreakdown: Array<{ name: string; count: number }>;
  doctorBreakdown: Array<{ name: string; count: number }>;
  zoneBreakdown: Array<{ name: string; count: number; color: string }>;
  locationBreakdown: Array<{ name: string; count: number; color: string }>;
  dailyData: Array<{ date: string; count: number }>;
}

const MEDAL_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32'];
const LOCATION_LABELS: Record<string, string> = {
  ambulatorio: 'Ambulatório',
  internacao: 'Internação',
  observacao: 'Observação',
  sala_vermelha: 'Sala Vermelha',
};

export default function Reports() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [filters, setFilters] = useState<AttendanceFilters>({
    startDate: "2025-01-01",
    endDate: new Date().toISOString().split('T')[0],
    specialtyId: "all",
    doctorName: "all",
    zoneType: "all",
  });

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.redirect || "/auth";
      } else {
        window.location.href = "/auth";
      }
    } catch {
      window.location.href = "/auth";
    }
  };

  const { data: specialties = [] } = useQuery<Specialty[]>({
    queryKey: ["/api/specialties"],
  });

  const { data: doctors = [] } = useQuery<Array<{ name: string }>>({
    queryKey: ["/api/reports/doctors"],
  });

  const { data: reportData, isLoading } = useQuery<AttendanceReportData>({
    queryKey: ["/api/reports/atendimentos", filters],
    enabled: !!(filters.startDate && filters.endDate),
    queryFn: async () => {
      const params = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate });
      if (filters.specialtyId && filters.specialtyId !== "all") params.append("specialtyId", filters.specialtyId);
      if (filters.doctorName && filters.doctorName !== "all") params.append("doctorName", filters.doctorName);
      if (filters.zoneType && filters.zoneType !== "all") params.append("zoneType", filters.zoneType);
      const response = await fetch(`/api/reports/atendimentos?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
  });

  const handleFilterChange = (key: keyof AttendanceFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ startDate: "2025-01-01", endDate: new Date().toISOString().split('T')[0], specialtyId: "all", doctorName: "all", zoneType: "all" });
  };

  const getDateRange = () => {
    if (filters.startDate && filters.endDate) {
      return `${new Intl.DateTimeFormat('pt-BR').format(new Date(filters.startDate + 'T12:00:00'))} a ${new Intl.DateTimeFormat('pt-BR').format(new Date(filters.endDate + 'T12:00:00'))}`;
    }
    return "Selecione o período";
  };

  const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const getDaysInPeriod = () => {
    if (!filters.startDate || !filters.endDate) return 1;
    const diff = new Date(filters.endDate).getTime() - new Date(filters.startDate).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const mediaPerDia = reportData ? (reportData.total / getDaysInPeriod()).toFixed(1) : "0";

  const getActiveFiltersLabel = () => {
    const parts: string[] = [];
    if (filters.doctorName && filters.doctorName !== "all") parts.push(`Médico: ${filters.doctorName}`);
    else parts.push("Todos os médicos");
    const spec = specialties.find(s => s.id === filters.specialtyId);
    if (spec) parts.push(`Especialidade: ${spec.name}`);
    if (filters.zoneType && filters.zoneType !== "all") parts.push(`Zona: ${filters.zoneType === 'urbana' ? 'Urbana' : 'Rural'}`);
    return parts.join(" · ");
  };

  const handlePrint = () => window.print();

  const hasData = reportData && reportData.total > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .screen-only { display: none !important; }
          body { background: white !important; font-family: Arial, sans-serif; }
          .min-h-screen { background: white !important; min-height: auto !important; }
          @page { size: A4 portrait; margin: 1.5cm; }
          .print-page-break { page-break-before: always; }
          .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .print-only { display: none; }
        .progress-bar-fill { transition: width 0.6s ease; }
      `}</style>

      {/* ───── PRINT-ONLY VIEW ───── */}
      <div className="print-only" style={{ fontFamily: 'Arial, sans-serif', color: '#111827' }}>
        {/* Institutional Header */}
        <div style={{ borderBottom: '3px solid #1d4ed8', paddingBottom: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={hospitalLogo} alt="HMJPS" style={{ height: '60px', width: 'auto' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={secretariaLogo} alt="Secretaria de Saúde" style={{ height: '40px', width: 'auto' }} />
              <img src={exuBemLogo} alt="Exu Bem Cuidada" style={{ height: '40px', width: 'auto' }} />
              <img src={susLogo} alt="SUS" style={{ height: '40px', width: 'auto' }} />
            </div>
          </div>
        </div>

        {/* Report Title */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1d4ed8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Relatório de Atendimentos Médicos
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Período: <strong>{getDateRange()}</strong>
          </div>
          {getActiveFiltersLabel() && (
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
              Filtros: {getActiveFiltersLabel()}
            </div>
          )}
        </div>

        {/* Summary Box */}
        {reportData && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Total de Atendimentos', value: reportData.total, color: '#1d4ed8', bg: '#dbeafe' },
                { label: 'Médicos Ativos', value: reportData.activeDoctors, color: '#7c3aed', bg: '#ede9fe' },
                { label: 'Zona Urbana', value: `${reportData.urban} (${pct(reportData.urban, reportData.total)}%)`, color: '#0891b2', bg: '#cffafe' },
                { label: 'Zona Rural', value: `${reportData.rural} (${pct(reportData.rural, reportData.total)}%)`, color: '#16a34a', bg: '#dcfce7' },
              ].map((item, i) => (
                <div key={i} style={{ background: item.bg, border: `1px solid ${item.color}30`, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: '10px', color: '#374151', marginTop: '2px' }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* Doctors Table */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8', borderLeft: '4px solid #1d4ed8', paddingLeft: '8px', marginBottom: '8px' }}>
                Atendimentos por Médico
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#1d4ed8', color: 'white' }}>
                    <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '600' }}>#</th>
                    <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '600' }}>Médico</th>
                    <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '600' }}>Atendimentos</th>
                    <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '600' }}>Participação</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.doctorBreakdown.map((d, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '6px 10px', color: i < 3 ? MEDAL_COLORS[i] : '#9ca3af', fontWeight: 'bold' }}>
                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}º`}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: i === 0 ? 'bold' : 'normal' }}>Dr(a). {d.name}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 'bold', color: '#1d4ed8' }}>{d.count}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          <div style={{ width: '80px', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct(d.count, reportData.total)}%`, height: '100%', background: '#1d4ed8', borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontSize: '10px', color: '#374151', minWidth: '28px' }}>{pct(d.count, reportData.total)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f3f4f6', borderTop: '2px solid #d1d5db', fontWeight: 'bold' }}>
                    <td colSpan={2} style={{ padding: '7px 10px', fontSize: '11px' }}>Total</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: '#1d4ed8' }}>{reportData.total}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Specialties Table */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8', borderLeft: '4px solid #1d4ed8', paddingLeft: '8px', marginBottom: '8px' }}>
                Atendimentos por Especialidade
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#1d4ed8', color: 'white' }}>
                    <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '600' }}>Especialidade</th>
                    <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '600' }}>Atendimentos</th>
                    <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '600' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.specialtyBreakdown.map((s, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '6px 10px' }}>{s.name}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 'bold', color: '#1d4ed8' }}>{s.count}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>{pct(s.count, reportData.total)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Location Table */}
            {reportData.locationBreakdown.length > 0 && (
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8', borderLeft: '4px solid #1d4ed8', paddingLeft: '8px', marginBottom: '8px' }}>
                  Atendimentos por Local
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#1d4ed8', color: 'white' }}>
                      <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '600' }}>Local</th>
                      <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '600' }}>Atendimentos</th>
                      <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '600' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.locationBreakdown.map((l, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '6px 10px' }}>{l.name}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 'bold', color: '#1d4ed8' }}>{l.count}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>{pct(l.count, reportData.total)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '10px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af' }}>
          <div>
            <div>Gerado em: {new Date().toLocaleString('pt-BR')}</div>
            <div>Usuário: {(user as any)?.name || (user as any)?.username || '—'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>Exu Saúde — Sistema de Gestão em Saúde</div>
            <div>Hospital Municipal João Pedro Secundino — Exu/PE</div>
          </div>
        </div>
      </div>

      {/* ───── SCREEN VIEW ───── */}
      <div className="screen-only max-w-7xl mx-auto px-4 py-8">

        {/* Top navigation bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 no-print">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setLocation("/")} className="text-blue-600 hover:bg-blue-50">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <img src={hospitalLogo} alt="HMJPS" className="h-11 w-auto" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Relatórios do Sistema</h1>
                  <p className="text-sm text-gray-500">Exu Saúde — Sistema de Gestão em Saúde</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasData && (
                  <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <Printer className="h-4 w-4" />
                    Imprimir / Salvar PDF
                  </Button>
                )}
                <Button onClick={handleLogout} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Page title */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileBarChart className="h-7 w-7 text-white" />
            </div>
            Relatório de Atendimentos
          </h2>
          <p className="text-gray-500 mt-1 ml-14">Análise de atendimentos por período, médico, especialidade e localização</p>
        </div>

        {/* Filters card */}
        <Card className="mb-8 border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-gray-700">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Data Inicial</label>
                <Input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Data Final</label>
                <Input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Especialidade</label>
                <Select value={filters.specialtyId} onValueChange={(v) => handleFilterChange('specialtyId', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as especialidades</SelectItem>
                    {specialties.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Médico</label>
                <Select value={filters.doctorName} onValueChange={(v) => handleFilterChange('doctorName', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os médicos</SelectItem>
                    {doctors.map((d) => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Zona</label>
                <Select value={filters.zoneType} onValueChange={(v) => handleFilterChange('zoneType', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as zonas</SelectItem>
                    <SelectItem value="urbana">Zona Urbana</SelectItem>
                    <SelectItem value="rural">Zona Rural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-gray-700">
              <X className="h-3.5 w-3.5 mr-1.5" />
              Limpar filtros
            </Button>
          </CardContent>
        </Card>

        {/* States: no dates / loading / no data / data */}
        {!filters.startDate || !filters.endDate ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Calendar className="h-14 w-14 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-1">Selecione o período</h3>
              <p className="text-gray-400 text-sm">Defina as datas inicial e final para gerar o relatório</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-500">Carregando relatório...</p>
              </div>
            </CardContent>
          </Card>
        ) : !hasData ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Filter className="h-14 w-14 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-1">Nenhum atendimento encontrado</h3>
              <p className="text-gray-400 text-sm text-center">Tente ampliar o intervalo de datas ou remover algum filtro</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-blue-100 text-xs font-semibold uppercase tracking-wide">Total</p>
                      <p className="text-4xl font-extrabold mt-1">{reportData!.total}</p>
                      <p className="text-blue-200 text-xs mt-1">{getDateRange()}</p>
                    </div>
                    <div className="bg-blue-500 bg-opacity-50 p-2 rounded-lg">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-purple-100 text-xs font-semibold uppercase tracking-wide">Médicos</p>
                      <p className="text-4xl font-extrabold mt-1">{reportData!.activeDoctors}</p>
                      <p className="text-purple-200 text-xs mt-1">ativos no período</p>
                    </div>
                    <div className="bg-purple-400 bg-opacity-50 p-2 rounded-lg">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0 shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-cyan-100 text-xs font-semibold uppercase tracking-wide">Média/Dia</p>
                      <p className="text-4xl font-extrabold mt-1">{mediaPerDia}</p>
                      <p className="text-cyan-200 text-xs mt-1">atendimentos/dia</p>
                    </div>
                    <div className="bg-cyan-400 bg-opacity-50 p-2 rounded-lg">
                      <Activity className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-sky-500 to-sky-600 text-white border-0 shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sky-100 text-xs font-semibold uppercase tracking-wide">Urbana</p>
                      <p className="text-4xl font-extrabold mt-1">{reportData!.urban}</p>
                      <p className="text-sky-200 text-xs mt-1">{pct(reportData!.urban, reportData!.total)}% do total</p>
                    </div>
                    <div className="bg-sky-400 bg-opacity-50 p-2 rounded-lg">
                      <MapPin className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wide">Rural</p>
                      <p className="text-4xl font-extrabold mt-1">{reportData!.rural}</p>
                      <p className="text-emerald-200 text-xs mt-1">{pct(reportData!.rural, reportData!.total)}% do total</p>
                    </div>
                    <div className="bg-emerald-400 bg-opacity-50 p-2 rounded-lg">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Charts Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    Atendimentos por Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={reportData!.dailyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(d + 'T12:00:00'))} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        labelFormatter={(d) => new Intl.DateTimeFormat('pt-BR').format(new Date(d + 'T12:00:00'))}
                        formatter={(v) => [v, 'Atendimentos']}
                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Zona
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData!.zoneBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={reportData!.zoneBreakdown} cx="50%" cy="50%" labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={90} dataKey="count">
                          {reportData!.zoneBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-300 text-sm">Sem dados de zona</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Doctor Ranking ── */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Ranking de Atendimentos por Médico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ranking list */}
                  <div className="space-y-3">
                    {reportData!.doctorBreakdown.map((d, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          i === 0 ? 'bg-amber-100 text-amber-600' :
                          i === 1 ? 'bg-gray-100 text-gray-500' :
                          i === 2 ? 'bg-orange-100 text-orange-500' :
                          'bg-blue-50 text-blue-400'
                        }`}>
                          {i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-800 truncate">Dr(a). {d.name}</span>
                            <span className="text-sm font-bold text-blue-600 ml-2">{d.count}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="progress-bar-fill h-2 rounded-full"
                              style={{
                                width: `${pct(d.count, reportData!.doctorBreakdown[0]?.count || 1)}%`,
                                background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#2563eb',
                              }}
                            />
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{pct(d.count, reportData!.total)}% do total</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Bar chart */}
                  <div>
                    <ResponsiveContainer width="100%" height={Math.max(200, reportData!.doctorBreakdown.length * 40)}>
                      <BarChart data={reportData!.doctorBreakdown} layout="vertical" margin={{ left: 0, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                        <Tooltip formatter={(v) => [v, 'Atendimentos']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]}>
                          {reportData!.doctorBreakdown.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#2563eb'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Specialty + Location ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Specialty */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-purple-500" />
                    Atendimentos por Especialidade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData!.specialtyBreakdown.map((s, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 font-medium">{s.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{s.count}</span>
                            <span className="text-xs text-gray-400 w-8 text-right">{pct(s.count, reportData!.total)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="progress-bar-fill h-2 rounded-full bg-purple-500"
                            style={{ width: `${pct(s.count, reportData!.specialtyBreakdown[0]?.count || 1)}%` }} />
                        </div>
                      </div>
                    ))}
                    {reportData!.specialtyBreakdown.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-4">Sem dados de especialidade</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    Atendimentos por Local
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData!.locationBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {reportData!.locationBreakdown.map((l, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700 font-medium">{l.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">{l.count}</span>
                              <span className="text-xs text-gray-400 w-8 text-right">{pct(l.count, reportData!.total)}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="progress-bar-fill h-2 rounded-full"
                              style={{ width: `${pct(l.count, reportData!.locationBreakdown[0]?.count || 1)}%`, background: l.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 text-sm py-4">Sem dados de localização</p>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
