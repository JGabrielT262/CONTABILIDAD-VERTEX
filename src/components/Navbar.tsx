"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CalendarDays,
  HandCoins,
  LogOut,
  Menu,
  X,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface NavUser {
  id: string;
  nombre: string;
  puede_crear: boolean;
  puede_borrar: boolean;
  puede_gestionar: boolean;
}

interface NavbarProps {
  initialUser?: NavUser | null;
}

const BASE_ITEMS = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/prestamos", label: "Préstamo", icon: HandCoins },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar({ initialUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<NavUser | null>(initialUser ?? null);

  useEffect(() => {
    if (initialUser !== undefined) return;
    fetch("/api/auth")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, [initialUser]);

  const navItems = [
    ...BASE_ITEMS,
    ...(user?.puede_gestionar
      ? [{ href: "/perfiles", label: "Perfiles", icon: Users }]
      : []),
  ];

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-vertex-border">
        <div className="w-full px-4 lg:px-6 h-12 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo-light.png"
              alt="Vertex"
              width={26}
              height={26}
              unoptimized
            />
            <span className="font-semibold text-sm text-vertex-text hidden sm:inline">
              Contabilidad <span className="text-vertex-blue">Vertex</span>
            </span>
          </Link>

          {user && (
            <p className="text-xs sm:text-sm font-semibold text-vertex-text truncate max-w-[40%] sm:max-w-none">
              Hola, <span className="text-vertex-blue">{user.nombre}</span>
            </p>
          )}

          <nav className="hidden md:flex items-center gap-0.5 ml-auto">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-vertex-blue text-white"
                      : "text-vertex-muted hover:text-vertex-text hover:bg-vertex-surface"
                  }`}
                  style={{ borderRadius: 4 }}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-vertex-muted hover:text-vertex-danger ml-1"
            >
              <LogOut size={14} />
              Salir
            </button>
          </nav>

          <button
            className="md:hidden p-1.5 text-vertex-muted"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t border-vertex-border bg-white px-3 py-2 space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2 px-2.5 py-2 text-sm ${
                    active ? "bg-vertex-blue text-white" : "text-vertex-muted"
                  }`}
                  style={{ borderRadius: 4 }}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-2.5 py-2 text-sm text-vertex-danger w-full"
            >
              <LogOut size={16} />
              Salir
            </button>
          </nav>
        )}
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-vertex-border">
        <div className="flex items-center justify-around h-14 px-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-1.5 py-1 text-[10px] font-medium ${
                  active ? "text-vertex-blue" : "text-vertex-muted"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
