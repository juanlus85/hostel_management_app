import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Truck, Plus, Edit2, Trash2, Phone, Mail, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Proveedores() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  
  // Create form
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  
  // Edit form
  const [editName, setEditName] = useState("");
  const [editLegalName, setEditLegalName] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const utils = trpc.useUtils();

  const { data: suppliers, isLoading } = trpc.suppliers.list.useQuery();

  const createSupplier = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("Proveedor añadido");
      utils.suppliers.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const updateSupplier = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      toast.success("Proveedor actualizado");
      utils.suppliers.list.invalidate();
      setIsEditDialogOpen(false);
      setSelectedSupplier(null);
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const deleteSupplier = trpc.suppliers.delete.useMutation({
    onSuccess: () => {
      toast.success("Proveedor eliminado");
      utils.suppliers.list.invalidate();
    },
    onError: (error) => toast.error("Error: " + error.message),
  });

  const resetForm = () => {
    setName("");
    setLegalName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
  };

  const handleCreate = () => {
    if (!name) {
      toast.error("El nombre es obligatorio");
      return;
    }
    createSupplier.mutate({ name, legalName, contactName, phone, email, address, notes });
  };

  const openEditDialog = (supplier: any) => {
    setSelectedSupplier(supplier);
    setEditName(supplier.name);
    setEditLegalName(supplier.legalName || "");
    setEditContactName(supplier.contactName || "");
    setEditPhone(supplier.phone || "");
    setEditEmail(supplier.email || "");
    setEditAddress(supplier.address || "");
    setEditNotes(supplier.notes || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedSupplier || !editName) {
      toast.error("El nombre es obligatorio");
      return;
    }
    updateSupplier.mutate({
      id: selectedSupplier.id,
      name: editName,
      legalName: editLegalName,
      contactName: editContactName,
      phone: editPhone,
      email: editEmail,
      address: editAddress,
      notes: editNotes,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Seguro que quieres eliminar este proveedor?")) {
      deleteSupplier.mutate({ id });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Solo los administradores pueden gestionar proveedores</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Proveedores
          </h1>
          <p className="text-muted-foreground">Gestiona la lista de proveedores</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo proveedor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir proveedor</DialogTitle>
              <DialogDescription>Registra un nuevo proveedor</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nombre del proveedor *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Coca Cola" />
              </div>
              <div className="grid gap-2">
                <Label>Nombre legal o razón social</Label>
                <Input value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Ej: Telefónica de España, S.A.U." />
                <p className="text-xs text-muted-foreground">La IA usará este nombre para asociar la factura con el proveedor comercial.</p>
              </div>
              <div className="grid gap-2">
                <Label>Persona de contacto</Label>
                <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nombre del contacto" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Teléfono</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="600 000 000" />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@proveedor.com" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Dirección</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Dirección del proveedor" />
              </div>
              <div className="grid gap-2">
                <Label>Notas</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionales..." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createSupplier.isPending}>
                {createSupplier.isPending ? "Guardando..." : "Añadir proveedor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Suppliers List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {suppliers?.map(supplier => (
          <Card key={supplier.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{supplier.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(supplier)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              {supplier.contactName && (
                <CardDescription>{supplier.contactName}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {supplier.legalName && (
                <p className="text-muted-foreground"><span className="font-medium text-foreground">Razón social:</span> {supplier.legalName}</p>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${supplier.phone}`} className="hover:text-primary">{supplier.phone}</a>
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${supplier.email}`} className="hover:text-primary">{supplier.email}</a>
                </div>
              )}
              {supplier.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{supplier.address}</span>
                </div>
              )}
              {supplier.notes && (
                <p className="text-muted-foreground pt-2 border-t">{supplier.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {(!suppliers || suppliers.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No hay proveedores registrados</p>
            <Button variant="link" onClick={() => setIsDialogOpen(true)}>
              Añadir el primero
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar proveedor</DialogTitle>
            <DialogDescription>Modifica los datos del proveedor</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nombre del proveedor *</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nombre" />
            </div>
            <div className="grid gap-2">
              <Label>Nombre legal o razón social</Label>
              <Input value={editLegalName} onChange={e => setEditLegalName(e.target.value)} placeholder="Razón social que aparece en las facturas" />
            </div>
            <div className="grid gap-2">
              <Label>Persona de contacto</Label>
              <Input value={editContactName} onChange={e => setEditContactName(e.target.value)} placeholder="Nombre del contacto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Teléfono</Label>
                <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="600 000 000" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email@proveedor.com" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Dirección</Label>
              <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Dirección" />
            </div>
            <div className="grid gap-2">
              <Label>Notas</Label>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notas..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateSupplier.isPending}>
              {updateSupplier.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
