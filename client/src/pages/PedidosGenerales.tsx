import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Copy, Check, X, Calendar, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const UNITS = ['unidades', 'packs', 'cajas', 'kg', 'litros'];

export default function PedidosGenerales() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customProductName, setCustomProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('unidades');

  const { data: orders = [], refetch } = trpc.ordersPedidos.list.useQuery();
  const { data: products = [] } = trpc.inventoryProducts.list.useQuery();
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();
  const createMutation = trpc.ordersPedidos.create.useMutation();
  const updateMutation = trpc.ordersPedidos.update.useMutation();
  const deleteMutation = trpc.ordersPedidos.delete.useMutation();
  const addItemMutation = trpc.ordersPedidos.addItem.useMutation();
  const deleteItemMutation = trpc.ordersPedidos.deleteItem.useMutation();

  const handleCreateOrder = async () => {
    if (!supplierName.trim()) {
      toast.error('El nombre del proveedor es obligatorio');
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        supplierName: supplierName.trim(),
        estimatedDate: estimatedDate || undefined,
        notes: notes || undefined,
      });
      toast.success('Pedido creado correctamente');
      setCurrentOrderId(result.id);
      setSupplierName('');
      setEstimatedDate('');
      setNotes('');
      refetch();
    } catch (error) {
      toast.error('Error al crear pedido');
    }
  };

  const openEditOrder = (order: any) => {
    setEditingOrderId(order.id);
    setSupplierName(order.supplier || '');
    setEstimatedDate(order.expectedDelivery || '');
    setNotes(order.notes || '');
    setIsEditOpen(true);
  };

  const handleUpdateOrder = async () => {
    if (!editingOrderId) return;
    if (!supplierName.trim()) {
      toast.error('El nombre del proveedor es obligatorio');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editingOrderId,
        supplierName: supplierName.trim(),
        estimatedDate: estimatedDate || undefined,
        notes: notes || undefined,
      });
      toast.success('Pedido actualizado correctamente');
      setIsEditOpen(false);
      setEditingOrderId(null);
      setSupplierName('');
      setEstimatedDate('');
      setNotes('');
      refetch();
    } catch (error) {
      toast.error('Error al actualizar pedido');
    }
  };

  const handleAddItem = async () => {
    if (!currentOrderId) return;
    
    const productName = selectedProductId === '_custom' 
      ? customProductName.trim() 
      : products.find(p => p.id.toString() === selectedProductId)?.name || '';
    
    if (!productName) {
      toast.error('Selecciona un producto o escribe un nombre');
      return;
    }
    
    const qty = parseInt(quantity) || 1;
    
    try {
      await addItemMutation.mutateAsync({
        orderId: currentOrderId,
        productName,
        quantity: qty.toString(),
        unit: unit || undefined,
      });
      toast.success('Producto añadido');
      setSelectedProductId('');
      setCustomProductName('');
      setQuantity('');
      setUnit('unidades');
      refetch();
    } catch (error) {
      toast.error('Error al añadir producto');
    }
  };

  const handleMarkAsOrdered = async (orderId: number) => {
    try {
      await updateMutation.mutateAsync({ id: orderId, isOrdered: true });
      toast.success('Pedido marcado como ordenado');
      refetch();
    } catch (error) {
      toast.error('Error al actualizar pedido');
    }
  };

  const handleMarkAsReceived = async (orderId: number) => {
    try {
      await updateMutation.mutateAsync({ id: orderId, isReceived: true });
      toast.success('Pedido marcado como recibido');
      refetch();
    } catch (error) {
      toast.error('Error al actualizar pedido');
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm('¿Eliminar este pedido?')) return;
    try {
      await deleteMutation.mutateAsync({ id: orderId });
      toast.success('Pedido eliminado');
      refetch();
    } catch (error) {
      toast.error('Error al eliminar pedido');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await deleteItemMutation.mutateAsync({ id: itemId });
      toast.success('Producto eliminado');
      refetch();
    } catch (error) {
      toast.error('Error al eliminar producto');
    }
  };

  const copyOrderToClipboard = (order: any) => {
    const text = `
PEDIDO A ${order.supplier?.toUpperCase()}

PRODUCTOS:
${order.items?.filter((i: any) => parseInt(i.quantity) > 0).map((item: any) => 
  `- ${item.itemName}: ${parseInt(item.quantity)}`
).join('\n')}

${order.notes ? `\nNotas: ${order.notes}` : ''}
    `.trim();
    
    navigator.clipboard.writeText(text);
    toast.success('Pedido copiado al portapapeles');
  };

  const getStatusBadge = (order: any) => {
    if (order.status === 'delivered') return <Badge className="bg-green-600">Recibido</Badge>;
    if (order.status === 'ordered') return <Badge className="bg-blue-600">Ordenado</Badge>;
    return <Badge variant="outline" className="border-amber-500 text-amber-600">Pendiente de pedir</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pedidos a Proveedores</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Pedido</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Proveedor *</Label>
                  <Select value={supplierName} onValueChange={setSupplierName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s: any) => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                      <SelectItem value="_custom">Otro (escribir)</SelectItem>
                    </SelectContent>
                  </Select>
                  {supplierName === '_custom' && (
                    <Input 
                      value={supplierName === '_custom' ? '' : supplierName}
                      onChange={(e) => setSupplierName(e.target.value)} 
                      placeholder="Nombre del proveedor"
                      className="mt-2"
                    />
                  )}
                </div>
                <div>
                  <Label>Fecha estimada entrega</Label>
                  <Input type="date" value={estimatedDate} onChange={(e) => setEstimatedDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas adicionales..." rows={2} />
              </div>
              <Button onClick={handleCreateOrder} className="w-full">Crear Pedido</Button>

              {currentOrderId && (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Añadir productos al pedido</h3>
                  <div>
                    <Label>Producto *</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name} {p.category && `(${p.category})`}
                          </SelectItem>
                        ))}
                        <SelectItem value="_custom">Otro (escribir)</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedProductId === '_custom' && (
                      <Input 
                        value={customProductName} 
                        onChange={(e) => setCustomProductName(e.target.value)} 
                        placeholder="Nombre del producto"
                        className="mt-2"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Cantidad *</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        step="1" 
                        value={quantity} 
                        onChange={(e) => setQuantity(e.target.value)} 
                        placeholder="1" 
                      />
                    </div>
                    <div>
                      <Label>Unidad</Label>
                      <Select value={unit} onValueChange={setUnit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleAddItem} variant="outline" className="w-full">Añadir Producto</Button>
                  <Button onClick={() => { setIsCreateOpen(false); setCurrentOrderId(null); }} className="w-full">Finalizar</Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {orders.map((order: any) => (
          <Card key={order.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{order.supplier}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(order)}
                    {order.expectedDelivery && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {order.expectedDelivery}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditOrder(order)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyOrderToClipboard(order)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  {order.status === 'pending' && (
                    <Button size="sm" onClick={() => handleMarkAsOrdered(order.id)}>
                      <Check className="mr-1 h-4 w-4" />
                      Ordenado
                    </Button>
                  )}
                  {order.status === 'ordered' && (
                    <Button size="sm" onClick={() => handleMarkAsReceived(order.id)} className="bg-green-600 hover:bg-green-700">
                      <Check className="mr-1 h-4 w-4" />
                      Recibido
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteOrder(order.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="space-y-2">
                  {order.items.filter((i: any) => parseInt(i.quantity) > 0).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <span className="font-medium">{item.itemName}</span>
                        <span className="text-muted-foreground ml-2">x{parseInt(item.quantity)}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(item.id)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin productos añadidos</p>
              )}
              {order.notes && (
                <div className="mt-4 p-3 bg-muted rounded text-sm">
                  <strong>Notas:</strong> {order.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Proveedor *</Label>
              <Select value={supplierName} onValueChange={setSupplierName}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                  <SelectItem value="_custom">Otro (escribir)</SelectItem>
                </SelectContent>
              </Select>
              {supplierName === '_custom' && (
                <Input 
                  value={supplierName === '_custom' ? '' : supplierName}
                  onChange={(e) => setSupplierName(e.target.value)} 
                  placeholder="Nombre del proveedor"
                  className="mt-2"
                />
              )}
            </div>
            <div>
              <Label>Fecha estimada entrega</Label>
              <Input type="date" value={estimatedDate} onChange={(e) => setEstimatedDate(e.target.value)} />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas adicionales..." rows={2} />
            </div>
            <Button onClick={handleUpdateOrder} className="w-full">Guardar Cambios</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
