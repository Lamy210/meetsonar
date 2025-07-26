// TODO: Wouter (React router) は Preact と型互換性がないため、一時的に型チェック無効化
// 将来的にpreact-routerまたは@preact/router等に置き換える必要がある
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
      <Route path="/" component={Lobby} />
      <Route path="/debug" component={WebRTCDebugPage} />
      <Route path="/ws-diagnostics" component={WebSocketDiagnosticsPage} />
      <Route path="/invite/:token" component={InvitePage} />
      <Route path="/join/:roomId" component={Call} />
      <Route path="/room/:roomId" component={Call} />
      <Route path="/call/:roomId" component={Call} />
      <Route component={NotFound} />
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
