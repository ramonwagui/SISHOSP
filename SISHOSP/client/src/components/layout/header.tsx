import { useLocation } from "wouter";
import { Hospital, Calendar, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { APP_VERSION, APP_VERSION_DATE } from "@/lib/version";

export default function Header() {
  const [location, setLocation] = useLocation();

  const navigation = [
    {
      name: "Agendamento",
      href: "/",
      icon: Calendar,
      current: location === "/",
    },
    {
      name: "Administração",
      href: "/admin/login",
      icon: Settings,
      current: location.startsWith("/admin"),
    },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Hospital className="text-white text-lg h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">
                  Exu Saúde - Sistema de Atendimento Médico
                </h1>
                <span
                  className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200"
                  title={`Versão ${APP_VERSION} — ${APP_VERSION_DATE}`}
                >
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-sm text-gray-600">Sistema de Atendimento Médico</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.name}
                  variant={item.current ? "default" : "ghost"}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                    item.current
                      ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-blue-600"
                  }`}
                  onClick={() => setLocation(item.href)}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Button>
              );
            })}
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="mobile-menu-trigger">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col space-y-4 mt-8">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.name}
                        variant={item.current ? "default" : "ghost"}
                        className="justify-start"
                        onClick={() => setLocation(item.href)}
                        data-testid={`mobile-nav-${item.name.toLowerCase()}`}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {item.name}
                      </Button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}