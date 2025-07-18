
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNavigation } from "@/components/TopNavigation";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Payments from "./pages/Payments";
import Plans from "./pages/Plans";
import Subscriptions from "./pages/Subscriptions";
import Services from "./pages/Services";
import NewSale from "./pages/NewSale";
import Onboarding from "./pages/Onboarding";
import Alerts from "./pages/Alerts";
import Accelerator from "./pages/Accelerator";
import Attendance from "./pages/Attendance";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Documentation from "./pages/Documentation";
import SendMessage from "./pages/SendMessage";
import AIAssistant from "./pages/AIAssistant";
import StageChecklistPage from "./pages/StageChecklistPage";
import Templates from "./pages/Templates";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full bg-background">
                      <AppSidebar />
                      <div className="flex-1 flex flex-col transition-all duration-300">
                        <TopNavigation />
                        <main className="flex-1 p-6 pt-6">
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/clients" element={<Clients />} />
                            <Route path="/clients/:id" element={<ClientDetail />} />
                            <Route path="/payments" element={<Payments />} />
                            <Route path="/plans" element={<Plans />} />
                            <Route path="/subscriptions" element={<Subscriptions />} />
                            <Route path="/services" element={<Services />} />
                            <Route path="/new-sale" element={<NewSale />} />
                            <Route path="/onboarding" element={<Onboarding />} />
                            <Route path="/alerts" element={<Alerts />} />
                            <Route path="/accelerator" element={<Accelerator />} />
                            <Route path="/attendance" element={<Attendance />} />
                            <Route path="/documentation" element={<Documentation />} />
                            <Route path="/send-message" element={<SendMessage />} />
                            <Route path="/ai-assistant" element={<AIAssistant />} />
                            <Route path="/templates" element={<Templates />} />
                            <Route path="/stage-checklist/:subscriptionId/:clientName" element={<StageChecklistPage />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                      </div>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
