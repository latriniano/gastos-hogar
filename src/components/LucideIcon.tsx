'use client';

import {
  ShoppingCart,
  Home,
  Zap,
  Wifi,
  Sparkles,
  HeartPulse,
  Car,
  PartyPopper,
  Shirt,
  PawPrint,
  Package,
  type LucideProps,
} from 'lucide-react';

const iconMap: Record<string, React.FC<LucideProps>> = {
  'shopping-cart': ShoppingCart,
  'home': Home,
  'zap': Zap,
  'wifi': Wifi,
  'sparkles': Sparkles,
  'heart-pulse': HeartPulse,
  'car': Car,
  'party-popper': PartyPopper,
  'shirt': Shirt,
  'paw-print': PawPrint,
  'package': Package,
};

interface LucideIconProps extends LucideProps {
  name: string;
}

export function LucideIcon({ name, ...props }: LucideIconProps) {
  const Icon = iconMap[name] || Package;
  return <Icon {...props} />;
}

export const availableIcons = Object.keys(iconMap);
