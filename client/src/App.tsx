// @ts-nocheck
import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import Lobby from "@/pages/lobby";
import Call from "@/pages/call";
import InvitePage from "@/pages/invite";
import JoinPage from "@/pages/join";
import WebRTCDebugPage from "@/pages/debug";
import WebSocketDiagnosticsPage from "@/pages/websocket-diagnostics";

function Router() {
  return (
    <Switch>
      {/* @ts-ignore */}
      <Route path="/" component={Lobby as any} />
      {/* @ts-ignore */}
      <Route path="/debug" component={WebRTCDebugPage as any} />
      {/* @ts-ignore */}
      <Route path="/ws-diagnostics" component={WebSocketDiagnosticsPage as any} />
      {/* @ts-ignore */}
      <Route path="/invite/:token" component={InvitePage as any} />
      {/* @ts-ignore */}
      <Route path="/join/:roomId" component={Call as any} />
      {/* @ts-ignore */}
      <Route path="/room/:roomId" component={Call as any} />
      {/* @ts-ignore */}
      <Route path="/call/:roomId" component={Call as any} />
      {/* @ts-ignore */}
      <Route component={NotFound as any} />
    </Switch>
  );
}

function App() {
  return (
    <div className="dark">
      <Router />
    </div>
  );
}

export default App;
