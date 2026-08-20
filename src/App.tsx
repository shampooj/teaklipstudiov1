import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import BrownSkinArchive from "./pages/BrownSkinArchive";
import Dashboard from "./pages/Dashboard";
import ShadePreview from "./pages/ShadePreview";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import AnalyticsConsentBanner from "./components/AnalyticsConsentBanner";
import { isEmbedded } from "./lib/cartAdd";

const queryClient = new QueryClient();

// Embedded: the banner flows inline above the app (no viewport to pin it to
// inside an auto-height iframe). Standalone: fixed to the viewport bottom.
const embedded = isEmbedded();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {embedded && <AnalyticsConsentBanner />}
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/brownskinarchive" element={<BrownSkinArchive />} />
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
        {!embedded && <AnalyticsConsentBanner />}
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
