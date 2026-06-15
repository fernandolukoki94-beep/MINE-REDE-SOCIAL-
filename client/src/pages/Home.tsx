import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Home() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">MINE Rede Social</h1>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-gray-600">Bem-vindo, {user?.name}!</span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          <button
            onClick={() => setLocation("/feed")}
            className="py-4 px-2 border-b-2 border-transparent hover:border-blue-500 font-medium text-gray-700 hover:text-blue-600 transition"
          >
            Feed
          </button>
          <button
            onClick={() => setLocation("/messages")}
            className="py-4 px-2 border-b-2 border-transparent hover:border-blue-500 font-medium text-gray-700 hover:text-blue-600 transition"
          >
            Mensagens
          </button>
          <button
            onClick={() => setLocation("/notifications")}
            className="py-4 px-2 border-b-2 border-transparent hover:border-blue-500 font-medium text-gray-700 hover:text-blue-600 transition"
          >
            Notificações
          </button>
          <button
            onClick={() => setLocation("/friends")}
            className="py-4 px-2 border-b-2 border-transparent hover:border-blue-500 font-medium text-gray-700 hover:text-blue-600 transition"
          >
            Amigos
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Welcome Section */}
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Bem-vindo à MINE Rede Social
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Partilha pensamentos, conecta-te com amigos, e acompanha as novidades em tempo real.
            </p>
            <div className="space-y-3">
              <Button
                size="lg"
                onClick={() => setLocation("/feed")}
                className="w-full"
              >
                Ir para o Feed
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setLocation("/messages")}
                className="w-full"
              >
                Ver Mensagens
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl mb-2">📝</div>
              <h3 className="font-semibold text-gray-900">Posts</h3>
              <p className="text-sm text-gray-600">Partilha com imagens e vídeos</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl mb-2">💬</div>
              <h3 className="font-semibold text-gray-900">Mensagens</h3>
              <p className="text-sm text-gray-600">Chat privado com amigos</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl mb-2">❤️</div>
              <h3 className="font-semibold text-gray-900">Interações</h3>
              <p className="text-sm text-gray-600">Likes e comentários</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl mb-2">🔔</div>
              <h3 className="font-semibold text-gray-900">Notificações</h3>
              <p className="text-sm text-gray-600">Alertas em tempo real</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
