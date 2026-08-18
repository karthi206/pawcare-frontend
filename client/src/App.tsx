import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";

import { AppLayout } from "./components/layout/AppLayout";
import Landing from "./pages/Landing";
import DiseaseDetection from "./pages/DiseaseDetection";
import NgoLocator from "./pages/NgoLocator";
import CaseTracker from "./pages/CaseTracker";
import AdoptionPortal from "./pages/AdoptionPortal";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminPanel from "./pages/AdminPanel";
import { RequireAuth } from "./components/RequireAuth";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/disease-detection">
          <RequireAuth><DiseaseDetection /></RequireAuth>
        </Route>
        <Route path="/ngo-locator">
          <RequireAuth><NgoLocator /></RequireAuth>
        </Route>
        <Route path="/cases">
          <RequireAuth><CaseTracker /></RequireAuth>
        </Route>
        <Route path="/adoption">
          <RequireAuth><AdoptionPortal /></RequireAuth>
        </Route>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/admin" component={AdminPanel} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
