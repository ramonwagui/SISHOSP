import { useAuth } from "@/hooks/useAuth.tsx";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Redirecionar para troca de senha obrigatória (exceto admin e admin.reserva)
  const isExemptFromPasswordChange = user.role === 'admin' || user.username === 'admin' || user.username === 'admin.reserva';
  if (user.mustChangePassword && !isExemptFromPasswordChange) {
    return (
      <Route path={path}>
        <Redirect to="/trocar-senha" />
      </Route>
    );
  }

  // Do not wrap specific standalone pages like queue display if they ever become protected
  return (
    <Route path={path}>
      <AppLayout>
        <Component />
      </AppLayout>
    </Route>
  );
}