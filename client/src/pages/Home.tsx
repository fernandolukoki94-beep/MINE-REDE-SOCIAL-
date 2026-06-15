import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Welcome Hero */}
      <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
        <div>
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
            Bem-vindo à <span className="text-blue-600">MINE</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            A tua rede social privada para partilhar momentos, conversar com amigos e manter-te atualizado com o que mais importa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              onClick={() => setLocation("/feed")}
              className="px-8"
            >
              Explorar o Feed
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/profile")}
              className="px-8"
            >
              Configurar Perfil
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <div className="absolute -top-4 -left-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <Card className="relative p-8 border-none shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-lg">{user?.name}</p>
                  <p className="text-sm text-gray-500">Membro desde {new Date(user?.createdAt || Date.now()).getFullYear()}</p>
                </div>
              </div>
              <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-3/4"></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                O teu perfil está quase completo! Adiciona uma biografia para que os teus amigos te conheçam melhor.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: "📝", title: "Publicações", desc: "Partilha textos, imagens e vídeos com o teu círculo.", path: "/feed" },
          { icon: "💬", title: "Mensagens", desc: "Conversas privadas e seguras com os teus amigos.", path: "/messages" },
          { icon: "👥", title: "Amigos", desc: "Encontra e conecta-te com pessoas que conheces.", path: "/friends" },
          { icon: "🔔", title: "Alertas", desc: "Sabe sempre quem interagiu com o teu conteúdo.", path: "/notifications" }
        ].map((feature, i) => (
          <Card 
            key={i} 
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => setLocation(feature.path)}
          >
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform inline-block">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {feature.desc}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
