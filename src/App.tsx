import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Catalog from "./pages/Catalog";
import PhoneDetail from "./pages/PhoneDetail";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Services from "./pages/Services";
import AdminCatalog from "./pages/AdminCatalog";
import AdminPhoneDetail from "./pages/AdminPhoneDetail";

const queryClient = new QueryClient();
const hostname = typeof window === "undefined" ? "" : window.location.hostname.toLowerCase();
const isAdminHost = hostname === "admin.centralcelulares.com.py";
const canUseAdminRoutes = isAdminHost || import.meta.env.DEV;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={isAdminHost ? <AdminCatalog /> : <Index />} />
          <Route path="/catalog" element={isAdminHost ? <AdminCatalog /> : <Catalog />} />
          <Route path="/phone/:id" element={isAdminHost ? <AdminPhoneDetail /> : <PhoneDetail />} />
          <Route path="/services" element={<Services />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/admin"
            element={canUseAdminRoutes ? <Navigate to={isAdminHost ? "/" : "/admin/catalog"} replace /> : <Navigate to="/" replace />}
          />
          <Route
            path="/admin/catalog"
            element={canUseAdminRoutes ? <AdminCatalog /> : <Navigate to="/" replace />}
          />
          <Route
            path="/admin/phone/:id"
            element={canUseAdminRoutes ? <AdminPhoneDetail /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;