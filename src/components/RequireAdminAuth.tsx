import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface RequireAdminAuthProps {
  children: JSX.Element;
}

export function RequireAdminAuth({ children }: RequireAdminAuthProps) {
  const location = useLocation();
  const { data, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="top-bar">Bienvenidos a Central Celulares</div>
        <div className="header">
          <div className="header-container">
            <div className="logo-box">
              <img src="/central-celulares-logo.png" alt="Central Celulares" className="logo-image" />
            </div>
          </div>
        </div>
        <main className="main-content">
          <div className="container py-16 text-center text-muted-foreground">Verificando sesión...</div>
        </main>
      </div>
    );
  }

  if (!data?.authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
