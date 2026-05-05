import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Activity,
  Bed,
  TestTube,
  Pill,
  BookOpen,
  ClipboardList,
  BarChart3,
  MessageCircle,
  Star,
  Settings,
  Shield,
  Radio,
  MonitorPlay,
  HeartPulse
} from "lucide-react";

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const role = (user as any)?.role || '';

  const getNavItems = () => {
    const items = [];
    
    // Dashboard geral
    items.push({ name: 'Início', href: '/', icon: LayoutDashboard, roles: ['admin', 'staff', 'doctor', 'viewer', 'diretor', 'triage'] });
    
    // Triage / Nurse
    items.push({ name: 'Triagem / Recepção', href: '/triagem', icon: Activity, roles: ['admin', 'staff', 'triage'] });
    items.push({ name: 'Prontuário Rápido', href: '/prontuario-rapido', icon: ClipboardList, roles: ['admin', 'staff'] });
    items.push({ name: 'Gestão de Filas', href: '/gestao-fila', icon: Users, roles: ['admin', 'staff'] });

    // Doctor & Medics
    items.push({ name: 'Fila de Atendimento', href: '/fila-medico', icon: HeartPulse, roles: ['admin', 'doctor'] });
    items.push({ name: 'Pacientes', href: '/admin/patients', icon: Users, roles: ['admin', 'staff', 'doctor'] });
    items.push({ name: 'Histórico Médico', href: '/admin/medical-history', icon: FileText, roles: ['admin', 'staff', 'doctor'] });
    items.push({ name: 'Doc. Médicos', href: '/documentos-medicos', icon: BookOpen, roles: ['admin', 'staff', 'doctor'] });
    
    // Hospitalização
    items.push({ name: 'Internação', href: '/internacao', icon: Bed, roles: ['admin', 'staff', 'doctor', 'triage'] });
    
    // Appointments
    items.push({ name: 'Agendamentos', href: '/admin/appointments', icon: Calendar, roles: ['admin', 'staff', 'viewer'] });

    // Departments
    items.push({ name: 'Farmácia', href: '/farmacia', icon: Pill, roles: ['admin', 'farmacia'] });
    items.push({ name: 'Laboratório', href: '/laboratorio', icon: TestTube, roles: ['admin', 'laboratorio'] });
    items.push({ name: 'Radiologia', href: '/radiologia', icon: Radio, roles: ['admin', 'radiologista'] });
    
    // Painel Aberto
    items.push({ name: 'Painel de Fila (TV)', href: '/painel-fila', icon: MonitorPlay, roles: ['admin', 'staff'] });

    // Admin & Management
    items.push({ name: 'Relatórios', href: '/admin/reports', icon: BarChart3, roles: ['admin', 'staff', 'viewer', 'diretor'] });
    items.push({ name: 'Pesq. Satisfação', href: '/admin/satisfaction', icon: Star, roles: ['admin', 'staff'] });
    items.push({ name: 'WhatsApp', href: '/admin/whatsapp', icon: MessageCircle, roles: ['admin', 'staff'] });
    items.push({ name: 'Usuários', href: '/admin/users', icon: Settings, roles: ['admin', 'diretor'] });
    items.push({ name: 'Segurança', href: '/admin/security', icon: Shield, roles: ['admin'] });
    
    return items.filter(item => item.roles.includes(role));
  };

  const navItems = getNavItems();

  return (
    <>
      <div 
        className={cn("fixed inset-0 bg-slate-900/50 z-40 transition-opacity lg:hidden", isOpen ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={() => setIsOpen(false)}
      />
      <div className={cn("fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col shadow-2xl",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-center min-h-[4rem] bg-slate-950 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
            <HeartPulse className="text-blue-500 w-6 h-6" />
            Exu<span className="text-blue-400 font-light">Saúde</span>
          </h1>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-1 custom-scrollbar">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 mt-2 px-3">Módulos</div>
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <a 
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent",
                  isActive 
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20" 
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  // Força mudança na janela, o wouter lidará normalmente ou poderiamos usar setLocation
                  window.location.hash = item.href; 
                  window.history.pushState(null, '', item.href);
                  window.dispatchEvent(new Event('popstate'));
                  setIsOpen(false);
                }}
              >
                <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-white" : "text-slate-400")} />
                {item.name}
              </a>
            );
          })}
        </div>
        
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase shadow-inner">
              {(user as any)?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-white truncate max-w-[150px]">{(user as any)?.name || user?.username || 'Usuário'}</p>
              <p className="text-xs text-blue-400 capitalize">{role}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
