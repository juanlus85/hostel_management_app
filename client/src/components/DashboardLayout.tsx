import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, 
  LogOut, 
  PanelLeft, 
  Calendar, 
  Wallet, 
  Receipt, 
  Package, 
  AlertTriangle, 
  CheckSquare,
  Users,
  Building2,
  Store,
  Truck
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Calendar, label: "Turnos", path: "/turnos" },
  { icon: Wallet, label: "Caja", path: "/caja" },
  { icon: Receipt, label: "Facturas", path: "/facturas" },
  { icon: Package, label: "Inventario", path: "/inventario" },
  { icon: AlertTriangle, label: "Incidencias", path: "/incidencias" },
  { icon: CheckSquare, label: "Tareas", path: "/tareas" },
];

const adminMenuItems = [
  { icon: Users, label: "Empleados", path: "/empleados" },
  { icon: Truck, label: "Proveedores", path: "/proveedores" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

// Business selector context
import { createContext, useContext } from "react";

type BusinessContextType = {
  selectedBusiness: "hostel" | "tienda" | "all";
  setSelectedBusiness: (business: "hostel" | "tienda" | "all") => void;
};

export const BusinessContext = createContext<BusinessContextType>({
  selectedBusiness: "hostel",
  setSelectedBusiness: () => {},
});

export const useBusinessContext = () => useContext(BusinessContext);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const [selectedBusiness, setSelectedBusiness] = useState<"hostel" | "tienda" | "all">(() => {
    const saved = localStorage.getItem("selected-business");
    return (saved as "hostel" | "tienda" | "all") || "hostel";
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem("selected-business", selectedBusiness);
  }, [selectedBusiness]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-10 w-10 text-primary" />
              <Store className="h-10 w-10 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center">
              The Spot Central & Sweet & Salty
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Sistema de gestión integral. Inicia sesión para continuar.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90"
          >
            Iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <BusinessContext.Provider value={{ selectedBusiness, setSelectedBusiness }}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
          } as CSSProperties
        }
      >
        <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
          {children}
        </DashboardLayoutContent>
      </SidebarProvider>
    </BusinessContext.Provider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = [...menuItems, ...adminMenuItems].find(item => item.path === location);
  const isMobile = useIsMobile();
  const { selectedBusiness, setSelectedBusiness } = useBusinessContext();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const businessLabel = selectedBusiness === "hostel" ? "Hostel" : selectedBusiness === "tienda" ? "Tienda" : "Ambos";
  const BusinessIcon = selectedBusiness === "hostel" ? Building2 : selectedBusiness === "tienda" ? Store : LayoutDashboard;

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/70" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate text-sidebar-foreground">
                    Gestión
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Business Selector */}
          {!isCollapsed && (
            <div className="px-3 py-3 border-b border-sidebar-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors text-left">
                    <BusinessIcon className="h-4 w-4 text-sidebar-foreground" />
                    <span className="text-sm font-medium text-sidebar-foreground flex-1">{businessLabel}</span>
                    <Badge variant="outline" className="text-xs bg-sidebar-primary/20 text-sidebar-primary-foreground border-sidebar-primary/30">
                      {selectedBusiness === "all" ? "2" : "1"}
                    </Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => setSelectedBusiness("hostel")} className="cursor-pointer">
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>The Spot Hostel</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedBusiness("tienda")} className="cursor-pointer">
                    <Store className="mr-2 h-4 w-4" />
                    <span>Sweet & Salty</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedBusiness("all")} className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Ver ambos</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <SidebarContent className="gap-0 py-2">
            <SidebarMenu className="px-2">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70"}`}
                      />
                      <span className="text-sidebar-foreground">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {isAdmin && (
              <>
                {!isCollapsed && (
                  <div className="px-4 py-2 mt-4">
                    <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                      Administración
                    </span>
                  </div>
                )}
                <SidebarMenu className="px-2">
                  {adminMenuItems.map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-10 transition-all font-normal`}
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70"}`}
                          />
                          <span className="text-sidebar-foreground">{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </>
            )}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-sidebar-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none">
                  <Avatar className="h-9 w-9 border border-sidebar-border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-sidebar-primary text-sidebar-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                      {user?.name || "Usuario"}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate mt-1">
                      {user?.role === "admin" ? "Administrador" : "Empleado"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="font-medium text-foreground">
                {activeMenuItem?.label ?? "Gestión"}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-sm">
                  <BusinessIcon className="h-3.5 w-3.5" />
                  <span>{businessLabel}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedBusiness("hostel")}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Hostel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedBusiness("tienda")}>
                  <Store className="mr-2 h-4 w-4" />
                  Tienda
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedBusiness("all")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Ver ambos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 bg-muted/30 min-h-screen">{children}</main>
      </SidebarInset>
    </>
  );
}
