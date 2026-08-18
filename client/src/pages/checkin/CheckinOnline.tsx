import { useMemo, useState } from "react";
import { Check, ClipboardCopy, Globe2, Link2, Loader2, MessageCircle, Plus, Send, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { defaultGuestsForRoomType } from "@shared/roomCapacity";

const PAYMENT_TYPES = [
  ["TRANS", "Transferencia"], ["TARJT", "Tarjeta"], ["EFECT", "Efectivo"], ["PLATF", "Plataforma"],
  ["MOVIL", "Pago móvil"], ["TREG", "Tarjeta regalo"], ["DESTI", "Pago en destino"], ["OTRO", "Otro"],
] as const;

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  completed: "Completado",
  cancelled: "Cancelado",
  expired: "Caducado",
};

export default function CheckinOnline() {
  const currentDate = new Date().toISOString().slice(0, 10);
  const nextDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [latestLink, setLatestLink] = useState<string | null>(null);
  const [latestLinkLanguage, setLatestLinkLanguage] = useState<"es" | "en">("es");
  const [form, setForm] = useState({
    email: "",
    language: "es" as "es" | "en",
    reservationNumber: "",
    reservationOrigin: "Website" as "Walk In" | "Booking.com" | "Airbnb" | "Expedia" | "Website" | "Phone" | "Email" | "Other",
    checkInDate: currentDate,
    checkOutDate: nextDate,
    roomNumber: "",
    numberOfRooms: 1,
    numberOfGuests: 1,
    paymentType: "TRANS" as "EFECT" | "TARJT" | "TRANS" | "PLATF" | "MOVIL" | "TREG" | "DESTI" | "OTRO",
    amountPaid: "0",
    amountPending: "0",
  });

  const utils = trpc.useUtils();
  const { data: accessCodes } = trpc.accessCodes.list.useQuery();
  const { data: links, isLoading } = trpc.checkin.online.list.useQuery();
  const rooms = useMemo(() => (accessCodes || []).filter((code) => code.roomNumber !== "ENTRADA"), [accessCodes]);

  const createLink = trpc.checkin.online.createLink.useMutation({
    onSuccess: ({ token }) => {
      const url = `${window.location.origin}/checkin-online/${token}`;
      setLatestLink(url);
      setLatestLinkLanguage(form.language);
      utils.checkin.online.list.invalidate();
      toast.success("Enlace de check-in online creado");
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelLink = trpc.checkin.online.cancel.useMutation({
    onSuccess: () => {
      utils.checkin.online.list.invalidate();
      toast.success("Enlace cancelado");
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setForm({ ...form, email: "", reservationNumber: "", roomNumber: "", numberOfRooms: 1, numberOfGuests: 1, amountPaid: "0", amountPending: "0" });
    setLatestLink(null);
  };

  const handleCreate = () => {
    if (!form.email || !form.roomNumber) {
      toast.error("Indica el email del huésped y la habitación");
      return;
    }
    createLink.mutate(form);
  };

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Enlace copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el enlace. Selecciónalo manualmente.");
    }
  };

  const shareWhatsApp = (link: string, language: "es" | "en") => {
    const text = language === "en"
      ? `Hello, you can complete your online check-in for The Spot Central Hostel using this secure link:\n\n${link}`
      : `Hola, puedes completar tu Check-in Online para The Spot Central Hostel desde este enlace seguro:\n\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-primary" />Check-in Online</CardTitle>
            <CardDescription className="mt-2 max-w-3xl">
              Crea un enlace seguro para que el huésped complete el registro cuando recepción esté cerrada. Al finalizar verá y recibirá por email los códigos de entrada y habitación.
            </CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Crear enlace</Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enlaces creados</CardTitle>
          <CardDescription>Un enlace se puede usar una sola vez y caduca después del día de llegada.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : links?.length ? (
            <div className="space-y-3">
              {links.map((link) => {
                const publicLink = `${window.location.origin}/checkin-online/${link.token}`;
                return (
                  <div key={link.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold">Habitación {link.roomNumber} · {link.email}</p>
                      <p className="text-sm text-muted-foreground">Llegada: {link.checkInDate} · Salida: {link.checkOutDate} · {link.numberOfGuests} huésped(es)</p>
                      <p className="mt-1 text-xs font-medium">Estado: {statusLabels[link.status] || link.status}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {link.status === "pending" && <Button size="sm" variant="outline" onClick={() => copy(publicLink)}><ClipboardCopy className="mr-2 h-4 w-4" />Copiar enlace</Button>}
                      {link.status === "pending" && <Button size="sm" className="bg-[#25D366] text-white hover:bg-[#1da851]" onClick={() => shareWhatsApp(publicLink, link.language)}><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</Button>}
                      {link.status === "pending" && <Button size="sm" variant="destructive" onClick={() => cancelLink.mutate({ id: link.id })}><XCircle className="mr-2 h-4 w-4" />Cancelar</Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay enlaces de check-in online.</p>}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear enlace de check-in online</DialogTitle>
            <DialogDescription>Completa los datos de reserva. El huésped añadirá sus datos personales y firmará desde el enlace.</DialogDescription>
          </DialogHeader>
          {latestLink ? (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
                <div className="mb-2 flex items-center gap-2 font-semibold"><Check className="h-5 w-5" />Enlace creado correctamente</div>
                <p className="break-all text-sm">{latestLink}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2"><Button onClick={() => copy(latestLink)}><Link2 className="mr-2 h-4 w-4" />Copiar enlace</Button><Button className="bg-[#25D366] text-white hover:bg-[#1da851]" onClick={() => shareWhatsApp(latestLink, latestLinkLanguage)}><MessageCircle className="mr-2 h-4 w-4" />Enviar por WhatsApp</Button></div>
              <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cerrar</Button></DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Email del huésped *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="guest@email.com" /></div>
                <div className="space-y-2"><Label>Idioma</Label><Select value={form.language} onValueChange={(value: "es" | "en") => setForm({ ...form, language: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="es">Español</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Número de reserva</Label><Input value={form.reservationNumber} onChange={(e) => setForm({ ...form, reservationNumber: e.target.value })} /></div>
                <div className="space-y-2"><Label>Origen</Label><Select value={form.reservationOrigin} onValueChange={(value: typeof form.reservationOrigin) => setForm({ ...form, reservationOrigin: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Booking.com", "Airbnb", "Expedia", "Website", "Phone", "Email", "Other", "Walk In"].map((source) => <SelectItem key={source} value={source}>{source}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Fecha de llegada *</Label><Input type="date" value={form.checkInDate} onChange={(e) => setForm({ ...form, checkInDate: e.target.value })} /></div>
                <div className="space-y-2"><Label>Fecha de salida *</Label><Input type="date" value={form.checkOutDate} onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Habitación *</Label><Select value={form.roomNumber} onValueChange={(value) => { const room = rooms.find((item) => item.roomNumber === value); setForm({ ...form, roomNumber: value, numberOfGuests: defaultGuestsForRoomType(room?.roomType) }); }}><SelectTrigger><SelectValue placeholder="Selecciona habitación" /></SelectTrigger><SelectContent>{rooms.map((room) => <SelectItem key={room.id} value={room.roomNumber}>Habitación {room.roomNumber} · {room.roomType}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>N.º de huéspedes</Label><Input type="number" min={1} value={form.numberOfGuests} onChange={(e) => setForm({ ...form, numberOfGuests: Math.max(1, Number(e.target.value) || 1) })} /></div>
                <div className="space-y-2"><Label>N.º de habitaciones</Label><Input type="number" min={1} value={form.numberOfRooms} onChange={(e) => setForm({ ...form, numberOfRooms: Math.max(1, Number(e.target.value) || 1) })} /></div>
                <div className="space-y-2"><Label>Tipo de pago</Label><Select value={form.paymentType} onValueChange={(value: typeof form.paymentType) => setForm({ ...form, paymentType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_TYPES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Importe pagado (€)</Label><Input type="number" step="0.01" min={0} value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createLink.isPending}>{createLink.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Crear enlace</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
