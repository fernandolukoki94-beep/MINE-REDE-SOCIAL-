import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Download, Trash2, User, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const utils = trpc.useUtils();
  
  const { data: profile, isLoading: isProfileLoading } = trpc.profile.get.useQuery();
  
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setAvatar(profile.avatar || "");
    }
  }, [profile]);

  const updateProfileMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      setIsEditing(false);
      utils.profile.get.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    }
  });

  const exportDataMutation = trpc.data.export.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mine-social-data-${user?.name}-${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Dados exportados com sucesso!");
    }
  });

  const clearDataMutation = trpc.data.clear.useMutation({
    onSuccess: () => {
      toast.success("Todos os teus dados foram eliminados.");
      logout();
    }
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ bio, avatar });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isProfileLoading) {
    return <div className="flex justify-center py-12">A carregar perfil...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <h1 className="text-3xl font-bold">O Teu Perfil</h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Profile Info */}
        <Card className="p-6 md:col-span-2 space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold overflow-hidden border-4 border-white shadow-lg">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0).toUpperCase()
                )}
              </div>
              {isEditing && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">Alterar</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-gray-500">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Biografia</label>
              {isEditing ? (
                <Textarea 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Conta-nos um pouco sobre ti..."
                  rows={4}
                />
              ) : (
                <p className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg min-h-[100px] whitespace-pre-wrap italic text-gray-600 dark:text-gray-400">
                  {profile?.bio || "Sem biografia definida."}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                  <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? "A guardar..." : "Guardar Alterações"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Editar Perfil</Button>
              )}
            </div>
          </div>
        </Card>

        {/* Settings & Data */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <Sun className="w-4 h-4" /> Definições
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm">Tema</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                {theme === "dark" ? "Luz" : "Escuro"}
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Gestão de Dados
            </h3>
            <p className="text-xs text-gray-500">
              Podes exportar todos os teus dados ou apagar permanentemente a tua conta.
            </p>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => exportDataMutation.mutate()}
                disabled={exportDataMutation.isPending}
              >
                <Download className="w-4 h-4 mr-2" />
                {exportDataMutation.isPending ? "A exportar..." : "Exportar Dados"}
              </Button>
              <Button 
                variant="destructive" 
                className="w-full justify-start"
                onClick={() => {
                  if (confirm("Tens a certeza que queres apagar TODOS os teus dados? Esta ação é irreversível.")) {
                    clearDataMutation.mutate();
                  }
                }}
                disabled={clearDataMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {clearDataMutation.isPending ? "A apagar..." : "Apagar Conta"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
