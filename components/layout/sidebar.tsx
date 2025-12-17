"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";
import { 
  LayoutDashboard, 
  FileText, 
  Building2, 
  Users, 
  Package, 
  PlusCircle,
  Settings,
  UserCheck,
  ShoppingCart,
  ListTodo,
  User,
  LogOut
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Teklif Oluştur", href: "/create-proposal", icon: PlusCircle },
  { name: "Görevler", href: "/tasks", icon: ListTodo },
  { name: "Teklifler", href: "/proposals", icon: FileText },
  { name: "Siparişler", href: "/orders", icon: ShoppingCart },
  { name: "Şirketler", href: "/companies", icon: Building2 },
  { name: "Kişiler", href: "/persons", icon: Users },
  { name: "Temsilciler", href: "/users", icon: UserCheck },
  { name: "Ürün Yönetimi", href: "/products", icon: Package },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white fixed left-0 top-0 bottom-0 overflow-y-auto z-50">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-800">
        <LayoutDashboard className="h-6 w-6 text-blue-500 mr-2" />
        <span className="text-lg font-bold">Smartys</span>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white",
                "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors"
              )}
            >
              <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-800 p-4 space-y-1">
        <Link
          href="/profile"
          className="flex items-center gap-x-3 rounded-md px-2 py-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <User className="h-6 w-6 shrink-0" aria-hidden="true" />
          <span>Profilim</span>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-x-3 rounded-md px-2 py-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
            <span>Çıkış Yap</span>
          </button>
        </form>
        <Link
          href="/settings/activity-types"
          className="flex items-center gap-x-3 rounded-md px-2 py-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
            <Settings className="h-6 w-6 shrink-0" aria-hidden="true" />
            <span>Ayarlar</span>
        </Link>
      </div>
    </div>
  );
}
