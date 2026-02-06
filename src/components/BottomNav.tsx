'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, PlusCircle, BarChart3, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const mainTabs = [
  { href: '/', icon: Home, label: 'Inicio' },
  { href: '/gastos', icon: Receipt, label: 'Gastos' },
  { href: '/gastos/nuevo', icon: PlusCircle, label: 'Nuevo', isCenter: true },
  { href: '/reportes', icon: BarChart3, label: 'Reportes' },
];

const subMenuItems = [
  { href: '/categorias', label: 'Categorias' },
  { href: '/gastos/fijos', label: 'Gastos Fijos' },
  { href: '/liquidar', label: 'Liquidar' },
  { href: '/contactos', label: 'Contactos y Deudas' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);

  if (pathname === '/login') return null;

  return (
    <>
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        >
          <div className="absolute bottom-20 right-4 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 min-w-[180px]">
            {subMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block px-4 py-3 text-sm transition-colors',
                  pathname === item.href
                    ? 'text-indigo-600 bg-indigo-50 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
                onClick={() => setShowMenu(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 pb-safe">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {mainTabs.map((tab) => {
            const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center w-full h-full transition-colors',
                  tab.isCenter && 'relative -mt-4',
                  isActive && !tab.isCenter ? 'text-indigo-600' : 'text-gray-400'
                )}
              >
                {tab.isCenter ? (
                  <div className="flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-full shadow-lg">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                ) : (
                  <>
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] mt-1">{tab.label}</span>
                  </>
                )}
              </Link>
            );
          })}

          <button
            onClick={() => setShowMenu(!showMenu)}
            className={cn(
              'flex flex-col items-center justify-center w-full h-full transition-colors',
              showMenu || subMenuItems.some(i => pathname === i.href) ? 'text-indigo-600' : 'text-gray-400'
            )}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-1">Mas</span>
          </button>
        </div>
      </nav>
    </>
  );
}
