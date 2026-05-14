import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, LogIn, ShieldCheck } from "lucide-react";
import logo from "/central-celulares-logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth, useAdminAuthActions } from "@/hooks/useAdminAuth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { data, isLoading } = useAdminAuth();
  const { login } = useAdminAuthActions();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = (location.state as { from?: string } | null)?.from || "/";

  if (!isLoading && data?.authenticated) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await login(password);
      navigate(destination, { replace: true });
    } catch (error) {
      toast({
        title: "No se pudo iniciar sesión",
        description: error instanceof Error ? error.message : "Verifica la contraseña e intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="top-bar">Bienvenidos a Central Celulares</div>
      <main className="min-h-[calc(100vh-40px)] bg-[#231F20]">
        <div className="container mx-auto grid min-h-[calc(100vh-40px)] grid-cols-1 items-center gap-10 px-4 py-10 lg:grid-cols-[1fr_440px]">
          <section className="text-white">
            <img src={logo} alt="Central Celulares" className="mb-8 h-28 w-auto max-w-full" />
            <div className="max-w-xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/85">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Panel administrativo seguro
              </div>
              <h1 className="font-display text-4xl font-bold md:text-5xl">Acceso admin</h1>
            </div>
          </section>

          <Card className="border-white/10 bg-white shadow-2xl">
            <CardContent className="p-7">
              <div className="mb-6 space-y-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <h2 className="font-display text-2xl font-bold">Entrar al panel</h2>
                <p className="text-sm text-muted-foreground">Usa la contraseña de administrador configurada en Cloudflare.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Contraseña</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Contraseña admin"
                    required
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                  <LogIn className="h-4 w-4" />
                  {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
