'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users, permission: 'users:read' },
];

export function Sidebar() {
  const pathname = usePathname();
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);

  const items = NAV_ITEMS.filter((item) => !item.permission || permissions.includes(item.permission));

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card">
      <div className="px-md py-lg text-lg font-semibold text-foreground">Kadi School</div>
      <nav className="flex flex-1 flex-col gap-1 px-sm">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-md py-sm text-sm transition-colors ${
                isActive
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
