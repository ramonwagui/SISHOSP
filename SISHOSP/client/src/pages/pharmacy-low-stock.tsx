import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, AlertTriangle, Package, RefreshCw } from "lucide-react";
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

export default function PharmacyLowStock() {
  const { data: lowStockBatches = [], isLoading } = useQuery<MedicationWithBatch[]>({
    queryKey: ["/api/inventory/batches/low-stock"],
  });

  const { data: alerts } = useQuery<{ lowStock: number; expiring: number }>({
    queryKey: ["/api/inventory/alerts"],
  });

  const getStatusBadge = (batch: MedicationWithBatch) => {
    const qty = batch.currentQuantity || 0;
    const minStock = batch.minimumQuantity || 0;
    
    if (qty === 0) {
      return <Badge variant="destructive">Esgotado</Badge>;
    }
    if (batch.status === "low_stock" || qty <= minStock) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Estoque Baixo</Badge>;
    }
    return <Badge className="bg-emerald-500">OK</Badge>;
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/inventory/batches/low-stock"] });
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
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              Estoque Baixo
            </h1>
            <p className="text-muted-foreground">
              {alerts?.lowStock || 0} itens abaixo do mínimo
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
      ) : lowStockBatches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum item com estoque baixo</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Itens com Estoque Baixo ({lowStockBatches.length})
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
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockBatches.map((batch) => {
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
                      <TableCell className="text-right font-bold text-amber-600">
                        {batch.currentQuantity} {batch.medication?.unit || "un"}
                      </TableCell>
                      <TableCell className="text-right">
                        {batch.minimumQuantity || 0} {batch.medication?.unit || "un"}
                      </TableCell>
                      <TableCell>
                        {batch.expirationDate ? (
                          <div className="flex flex-col">
                            <span>
                              {format(parseISO(batch.expirationDate), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            {daysToExpire !== null && daysToExpire <= 30 && (
                              <span className="text-xs text-orange-600">
                                {daysToExpire <= 0 ? "Vencido" : `${daysToExpire} dias`}
                              </span>
                            )}
                          </div>
                        ) : (
                          "—"
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
