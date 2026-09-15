import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import BrownSkinArchive from "./pages/BrownSkinArchive";
import WhyItWorks from "./pages/WhyItWorks";
import PhotoCheckDev from "./pages/PhotoCheckDev";
import Dashboard from "./pages/Dashboard";
import ShadePreview from "./pages/ShadePreview";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/brownskinarchive" element={<BrownSkinArchive />} />
          <Route path="/whyitworks" element={<WhyItWorks />} />
          {/* Dev-only: calibration table for the photo quality gate. */}
          {import.meta.env.DEV && <Route path="/dev/photo-check" element={<PhotoCheckDev />} />}
          <Route path="/login" element={<Auth />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/shade-preview"
            element={
              <ProtectedRoute>
                <ShadePreview />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
