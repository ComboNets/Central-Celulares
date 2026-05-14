import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AdminAuthResponse {
  authenticated?: boolean;
  user?: {
    name: string;
  };
}

const ADMIN_AUTH_QUERY_KEY = ["admin", "auth"];

async function fetchAdminAuth(): Promise<AdminAuthResponse> {
  const response = await fetch("/api/auth/me", {
    headers: { Accept: "application/json" },
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    return { authenticated: false };
  }

  if (!response.ok) {
    throw new Error("No se pudo verificar la sesión.");
  }

  return (await response.json()) as AdminAuthResponse;
}

export function useAdminAuth() {
  return useQuery({
    queryKey: ADMIN_AUTH_QUERY_KEY,
    queryFn: fetchAdminAuth,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useAdminAuthActions() {
  const queryClient = useQueryClient();

  const login = async (password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText || "No se pudo iniciar sesión.";
      try {
        const parsed = JSON.parse(errorText) as { error?: string };
        if (parsed.error) {
          errorMessage = parsed.error;
        }
      } catch {
        // Keep raw response text when the response is not JSON.
      }
      throw new Error(errorMessage);
    }

    await queryClient.invalidateQueries({ queryKey: ADMIN_AUTH_QUERY_KEY });
  };

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    queryClient.setQueryData<AdminAuthResponse>(ADMIN_AUTH_QUERY_KEY, { authenticated: false });
    await queryClient.invalidateQueries({ queryKey: ADMIN_AUTH_QUERY_KEY });
  };

  return { login, logout };
}
