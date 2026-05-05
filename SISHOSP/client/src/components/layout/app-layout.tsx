import { useState } from "react";
import { Menu, LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/hooks/useAuth";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const role = (user as any)?.role || '';

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", { 
        method: "POST",
        credentials: "include",
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        window.location.href = "/auth";
      } else {
        window.location.href = "/auth";
      }
    } catch {
      window.location.href = "/auth";
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Topbar */}
        <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200 h-[4rem] flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-600 hover:bg-slate-100"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            
            <h2 className="text-xl font-semibold text-slate-800 hidden sm:flex items-center tracking-tight">
              Olá, {role === 'doctor' ? 'Dr(a). ' : ''}{(user as any)?.name?.split(' ')[0] || 'Usuário'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
             <Button
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 relative"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </Button>
              <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
             <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-red-600 hover:bg-red-50 font-medium"
              >
                <LogOut className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-500 pb-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
