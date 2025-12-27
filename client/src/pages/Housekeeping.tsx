import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bed, CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";

const ROOMS = ["4", "7", "8", "15", "35", "51", "23", "42", "16", "18"];

const STATUS_CONFIG = {
  checkout: {
    label: "Checkout (Hacer Habitación)",
    color: "bg-red-100 text-red-700 border-red-300",
    icon: XCircle,
  },
  continues: {
    label: "Continúa Reserva (Repaso)",
    color: "bg-yellow-100 text-yellow-700 border-yellow-300",
    icon: Clock,
  },
  empty: {
    label: "Habitación Vacía",
    color: "bg-green-100 text-green-700 border-green-300",
    icon: CheckCircle2,
  },
  ready: {
    label: "Habitación Lista",
    color: "bg-green-700 text-white border-green-800",
    icon: CheckCircle2,
  },
};

export default function Housekeeping() {
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const { data: roomStatuses, refetch } = trpc.roomStatus.getByDate.useQuery({ date: currentDate });
  const updateStatus = trpc.roomStatus.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Estado actualizado");
    },
  });

  const getRoomStatus = (roomNumber: string) => {
    return roomStatuses?.find(r => r.roomNumber === roomNumber);
  };

  const handleStatusChange = (roomNumber: string, status: "checkout" | "continues" | "empty" | "ready") => {
    updateStatus.mutate({
      roomNumber,
      date: currentDate,
      status,
    });
  };

  const handleBedsChange = (roomNumber: string, beds: number) => {
    const currentStatus = getRoomStatus(roomNumber);
    updateStatus.mutate({
      roomNumber,
      date: currentDate,
      status: currentStatus?.status || "empty",
      beds,
    });
  };

  const handleNotesChange = (roomNumber: string, notes: string) => {
    const currentStatus = getRoomStatus(roomNumber);
    updateStatus.mutate({
      roomNumber,
      date: currentDate,
      status: currentStatus?.status || "empty",
      notes,
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Housekeeping</h1>
        <p className="text-muted-foreground">Gestión diaria de habitaciones</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fecha</CardTitle>
          <CardDescription>Selecciona el día para gestionar las habitaciones</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROOMS.map(roomNumber => {
          const status = getRoomStatus(roomNumber);
          const statusConfig = status ? STATUS_CONFIG[status.status] : null;
          const StatusIcon = statusConfig?.icon || Bed;

          return (
            <Card key={roomNumber} className={`${statusConfig?.color || ""} transition-colors`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bed className="h-5 w-5" />
                  Habitación {roomNumber}
                  {statusConfig && <StatusIcon className="h-5 w-5 ml-auto" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={status?.status || ""}
                    onValueChange={(value) => handleStatusChange(roomNumber, value as "checkout" | "continues" | "empty" | "ready")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checkout">Checkout (Hacer Habitación)</SelectItem>
                      <SelectItem value="continues">Continúa Reserva (Repaso)</SelectItem>
                      <SelectItem value="empty">Habitación Vacía</SelectItem>
                      <SelectItem value="ready">Habitación Lista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {roomNumber === "42" && (
                  <div className="space-y-2">
                    <Label>Número de camas</Label>
                    <Select
                      value={status?.beds?.toString() || ""}
                      onValueChange={(value) => handleBedsChange(roomNumber, parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar camas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 cama</SelectItem>
                        <SelectItem value="2">2 camas</SelectItem>
                        <SelectItem value="3">3 camas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={status?.notes || ""}
                    onChange={(e) => handleNotesChange(roomNumber, e.target.value)}
                    placeholder="Notas adicionales..."
                    rows={2}
                  />
                </div>

                {status?.status && status.status !== "ready" && (
                  <Button
                    onClick={() => handleStatusChange(roomNumber, "ready")}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Marcar como Lista
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
