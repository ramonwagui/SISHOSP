import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Calendar, Package, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { queryClient } from "@/lib/queryClient";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type MedicationWithBatch = {
  id: string;
  medicationId: string;
  batchNumber: string;
  quantity: number;
  currentQuantity: number;
  expirationDate: string | null;
  manufacturingDate: string | null;
  supplier: string | null;
  purchasePrice: string | null;
  minimumQuantity: number | null;
  storageLocation: string | null;
  status: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  medication?: {
    id: string;
    name: string;
    genericName: string | null;
    form: string;
    concentration: string;
    unit: string;
  };
};

export default function PharmacyExpiring() {
  const { data: expiringBatches = [], isLoading } = useQuery<MedicationWithBatch[]>({
    queryKey: ["/api/inventory/batches/expiring"],
  });

  const { data: alerts } = useQuery<{ lowStock: number; expiring: number }>({
    queryKey: ["/api/inventory/alerts"],
  });

  const getStatusBadge = (batch: MedicationWithBatch) => {
    if (!batch.expirationDate) return <Badge className="bg-emerald-500">OK</Badge>;
    
    const daysToExpire = differenceInDays(parseISO(batch.expirationDate), new Date());
    
    if (daysToExpire <= 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    if (daysToExpire <= 7) {
      return <Badge variant="destructive">Vence em {daysToExpire} dias</Badge>;
    }
    if (daysToExpire <= 30) {
      return <Badge variant="outline" className="border-orange-500 text-orange-600">Vence em {daysToExpire} dias</Badge>;
    }
    return <Badge className="bg-emerald-500">OK</Badge>;
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches/expiring"] });
    queryClient.invalidateQueries({ queryKey: ["/api/inventory/alerts"] });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/farmacia">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-orange-500" />
              Próximos do Vencimento
            </h1>
            <p className="text-muted-foreground">
              {alerts?.expiring || 0} itens vencem em 30 dias
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : expiringBatches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum item próximo do vencimento</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              Itens Próximos do Vencimento ({expiringBatches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Estoque Atual</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Dias Restantes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringBatches
                  .sort((a, b) => {
                    if (!a.expirationDate) return 1;
                    if (!b.expirationDate) return -1;
                    return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
                  })
                  .map((batch) => {
                    const daysToExpire = batch.expirationDate
                      ? differenceInDays(parseISO(batch.expirationDate), new Date())
                      : null;

                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">
                          {batch.medication?.name || "—"}
                          {batch.medication?.concentration && (
                            <span className="text-muted-foreground ml-1">
                              {batch.medication.concentration}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{batch.batchNumber}</TableCell>
                        <TableCell>{batch.medication?.form || "—"}</TableCell>
                        <TableCell className="text-right">
                          {batch.currentQuantity} {batch.medication?.unit || "un"}
                        </TableCell>
                        <TableCell>
                          {batch.expirationDate
                            ? format(parseISO(batch.expirationDate), "dd/MM/yyyy", { locale: ptBR })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {daysToExpire !== null && (
                            <span
                              className={`font-bold ${
                                daysToExpire <= 0
                                  ? "text-red-600"
                                  : daysToExpire <= 7
                                  ? "text-red-500"
                                  : "text-orange-600"
                              }`}
                            >
                              {daysToExpire <= 0 ? "Vencido!" : `${daysToExpire} dias`}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(batch)}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
