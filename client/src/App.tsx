import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
// @ts-ignore: Missing type declarations for react-query
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Lobby from "@/pages/lobby";
import Call from "@/pages/call";
import WebRTCDebugPage from "@/pages/debug";
import WebSocketDiagnosticsPage from "@/pages/websocket-diagnostics";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Lobby} />
      <Route path="/debug" component={WebRTCDebugPage} />
      <Route path="/ws-diagnostics" component={WebSocketDiagnosticsPage} />
      <Route path="/room/:roomId" component={Call} />
      <Route path="/call/:roomId" component={Call} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
