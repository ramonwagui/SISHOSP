import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bed, Plus, Minus, Trash2, Edit, Loader2, Building2 } from "lucide-react";

interface Ward {
  id: string;
  name: string;
  description?: string;
  wardType?: string;
  totalBeds: number;
  isActive: boolean;
}

interface WardWithBeds extends Ward {
  beds: Array<{
    id: string;
    bedNumber: string;
    status: string;
  }>;
}

export default function WardManagement() {
  const { toast } = useToast();
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [newBedCount, setNewBedCount] = useState<number>(0);
  const [showAddWardDialog, setShowAddWardDialog] = useState(false);
  const [newWardName, setNewWardName] = useState("");
  const [newWardDescription, setNewWardDescription] = useState("");
  const [newWardBeds, setNewWardBeds] = useState(5);

  const { data: wards = [], isLoading } = useQuery<Ward[]>({
    queryKey: ["/api/hospital/wards"],
  });

  const { data: occupancy } = useQuery<{
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    occupancyRate: number;
    wardStats: Array<{
      wardId: string;
      wardName: string;
      total: number;
      occupied: number;
      available: number;
    }>;
  }>({
    queryKey: ["/api/hospital/occupancy"],
  });

  const { data: wardDetails } = useQuery<WardWithBeds>({
    queryKey: ["/api/hospital/wards", editingWard?.id],
    enabled: !!editingWard?.id,
  });

  const createWardMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; totalBeds: number }) => {
      const ward = await apiRequest("/api/hospital/wards", {
        method: "POST",
        body: { name: data.name, description: data.description, wardType: "geral", totalBeds: data.totalBeds },
      });
      
      for (let i = 1; i <= data.totalBeds; i++) {
        await apiRequest("/api/hospital/beds", {
          method: "POST",
          body: { wardId: ward.id, bedNumber: `${i}`, bedType: "standard", status: "disponivel" },
        });
      }
      
      return ward;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/wards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/occupancy"] });
      toast({ title: "Sucesso", description: "Ala criada com sucesso!" });
      setShowAddWardDialog(false);
      setNewWardName("");
      setNewWardDescription("");
      setNewWardBeds(5);
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível criar a ala.", variant: "destructive" });
    },
  });

  const updateBedCountMutation = useMutation({
    mutationFn: async ({ wardId, currentCount, targetCount }: { wardId: string; currentCount: number; targetCount: number }) => {
      if (targetCount > currentCount) {
        for (let i = currentCount + 1; i <= targetCount; i++) {
          await apiRequest("/api/hospital/beds", {
            method: "POST",
            body: { wardId, bedNumber: `${i}`, bedType: "standard", status: "disponivel" },
          });
        }
      } else if (targetCount < currentCount) {
        const wardData = await fetch(`/api/hospital/wards/${wardId}`).then(r => r.json());
        const bedsToRemove = wardData.beds
          .filter((b: any) => b.status === "disponivel")
          .slice(0, currentCount - targetCount);
        
        for (const bed of bedsToRemove) {
          await apiRequest(`/api/hospital/beds/${bed.id}`, { method: "DELETE" });
        }
      }
      
      await apiRequest(`/api/hospital/wards/${wardId}`, {
        method: "PATCH",
        body: { totalBeds: targetCount },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/wards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/beds"] });
      toast({ title: "Sucesso", description: "Quantidade de leitos atualizada!" });
      setEditingWard(null);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error?.message || "Não foi possível atualizar os leitos.", variant: "destructive" });
    },
  });

  const deleteWardMutation = useMutation({
    mutationFn: async (wardId: string) => {
      return apiRequest(`/api/hospital/wards/${wardId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/wards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hospital/occupancy"] });
      toast({ title: "Sucesso", description: "Ala removida com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível remover a ala. Verifique se não há leitos ocupados.", variant: "destructive" });
    },
  });

  const getWardStats = (wardId: string) => {
    return occupancy?.wardStats?.find(s => s.wardId === wardId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Gestão de Alas e Leitos
          </h2>
          <p className="text-gray-600">Gerencie as alas hospitalares e a quantidade de leitos</p>
        </div>
        <Button onClick={() => setShowAddWardDialog(true)} className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-ward">
          <Plus className="h-4 w-4 mr-2" />
          Nova Ala
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total de Leitos</p>
                <p className="text-3xl font-bold text-blue-700">{occupancy?.totalBeds || 0}</p>
              </div>
              <Bed className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Disponíveis</p>
                <p className="text-3xl font-bold text-green-700">{occupancy?.availableBeds || 0}</p>
              </div>
              <Bed className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Ocupados</p>
                <p className="text-3xl font-bold text-amber-700">{occupancy?.occupiedBeds || 0}</p>
              </div>
              <Bed className="h-10 w-10 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alas Hospitalares</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {wards.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma ala cadastrada. Clique em "Nova Ala" para adicionar.</p>
            ) : (
              wards.map((ward) => {
                const stats = getWardStats(ward.id);
                return (
                  <div key={ward.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border" data-testid={`ward-${ward.id}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{ward.name}</h3>
                        <Badge variant="outline" className="bg-white">
                          {stats?.total || ward.totalBeds || 0} leitos
                        </Badge>
                        {stats && stats.occupied > 0 && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                            {stats.occupied} ocupados
                          </Badge>
                        )}
                      </div>
                      {ward.description && (
                        <p className="text-sm text-gray-500 mt-1">{ward.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingWard(ward);
                          setNewBedCount(stats?.total || ward.totalBeds || 0);
                        }}
                        data-testid={`button-edit-ward-${ward.id}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar Leitos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Deseja realmente excluir a ala "${ward.name}"?`)) {
                            deleteWardMutation.mutate(ward.id);
                          }
                        }}
                        disabled={stats && stats.occupied > 0}
                        data-testid={`button-delete-ward-${ward.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingWard} onOpenChange={() => setEditingWard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Leitos - {editingWard?.name}</DialogTitle>
            <DialogDescription>
              Ajuste a quantidade de leitos desta ala. Leitos ocupados não podem ser removidos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setNewBedCount(Math.max(0, newBedCount - 1))}
                disabled={newBedCount <= (getWardStats(editingWard?.id || "")?.occupied || 0)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <div className="text-center">
                <Input
                  type="number"
                  value={newBedCount}
                  onChange={(e) => setNewBedCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 text-center text-2xl font-bold"
                  min={getWardStats(editingWard?.id || "")?.occupied || 0}
                />
                <p className="text-sm text-gray-500 mt-1">leitos</p>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setNewBedCount(newBedCount + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {editingWard && getWardStats(editingWard.id)?.occupied && getWardStats(editingWard.id)!.occupied > 0 && (
              <p className="text-amber-600 text-sm text-center">
                Mínimo: {getWardStats(editingWard.id)?.occupied} leitos (ocupados atualmente)
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWard(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingWard) {
                  const currentCount = getWardStats(editingWard.id)?.total || editingWard.totalBeds || 0;
                  updateBedCountMutation.mutate({
                    wardId: editingWard.id,
                    currentCount,
                    targetCount: newBedCount,
                  });
                }
              }}
              disabled={updateBedCountMutation.isPending}
            >
              {updateBedCountMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddWardDialog} onOpenChange={setShowAddWardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Ala Hospitalar</DialogTitle>
            <DialogDescription>
              Adicione uma nova ala ao hospital com a quantidade inicial de leitos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="wardName">Nome da Ala</Label>
              <Input
                id="wardName"
                value={newWardName}
                onChange={(e) => setNewWardName(e.target.value)}
                placeholder="Ex: UTI, Enfermaria, Maternidade..."
              />
            </div>
            
            <div>
              <Label htmlFor="wardDescription">Descrição (opcional)</Label>
              <Input
                id="wardDescription"
                value={newWardDescription}
                onChange={(e) => setNewWardDescription(e.target.value)}
                placeholder="Descrição da ala..."
              />
            </div>
            
            <div>
              <Label htmlFor="wardBeds">Quantidade de Leitos</Label>
              <Input
                id="wardBeds"
                type="number"
                value={newWardBeds}
                onChange={(e) => setNewWardBeds(parseInt(e.target.value) || 0)}
                min={1}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddWardDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (newWardName.trim()) {
                  createWardMutation.mutate({
                    name: newWardName.trim(),
                    description: newWardDescription.trim(),
                    totalBeds: newWardBeds,
                  });
                }
              }}
              disabled={!newWardName.trim() || createWardMutation.isPending}
            >
              {createWardMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Criar Ala
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
