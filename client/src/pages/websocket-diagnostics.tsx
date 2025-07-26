import { useWebSocketDiagnostics } from '@/hooks/useWebSocketDiagnostics';
import { Button } from '@/components/ui/minimal-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/minimal-card';
import { CheckCircle, XCircle, Loader2, Play, RotateCcw } from 'lucide-react';

export default function WebSocketDiagnosticsPage() {
  const { diagnose, reset, isRunning, results } = useWebSocketDiagnostics();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔍 WebSocket診断ツール</h1>
          <p className="text-gray-400">
            WebSocket接続の問題を診断し、詳細な情報を提供します
          </p>
        </div>

        <div className="mb-6 flex gap-4">
          <Button 
            onClick={diagnose} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? '診断実行中...' : '診断開始'}
          </Button>
          
          <Button 
            onClick={reset} 
            variant="outline"
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            リセット
          </Button>
        </div>

        {results.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((result, index) => (
              <Card key={index} className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    {result.type === 'direct' ? '直接接続' : 'Viteプロキシ経由'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}>
                    <div className="font-semibold mb-2">
                      ステータス: {result.status === 'success' ? '成功' : 'エラー'}
                    </div>
                    
                    {result.latency && (
                      <div className="text-sm mb-2">
                        レイテンシ: {result.latency}ms
                      </div>
                    )}
                    
                    {result.error && (
                      <div className="text-sm">
                        <div className="font-medium mb-1">エラー詳細:</div>
                        <pre className="text-xs overflow-auto max-h-32 bg-gray-800 p-2 rounded">
                          {result.error.message || JSON.stringify(result.error, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {result.status === 'success' && (
                      <div className="text-sm">
                        接続は正常に確立されました
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-400">
                    接続先: {result.type === 'direct' 
                      ? 'ws://localhost:5000/ws' 
                      : 'ws://localhost:5173/ws (→ backend:5000)'
                    }
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {results.length === 0 && !isRunning && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="text-center py-8">
              <p className="text-gray-400 mb-4">
                「診断開始」ボタンをクリックして、WebSocket接続の診断を開始してください
              </p>
              <div className="text-sm text-gray-500">
                <div>• 直接バックエンド接続テスト</div>
                <div>• Viteプロキシ経由接続テスト</div>
                <div>• レイテンシ測定</div>
                <div>• エラー詳細分析</div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>📋 診断情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2 text-gray-300">
                <div><strong>現在のURL:</strong> {window.location.href}</div>
                <div><strong>Protocol:</strong> {window.location.protocol}</div>
                <div><strong>Host:</strong> {window.location.host}</div>
                <div><strong>WebSocket Support:</strong> {typeof WebSocket !== 'undefined' ? 'あり' : 'なし'}</div>
                <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
