import {
  Briefcase, Bus, Circle, Download, Gift, GraduationCap, HeartPulse, House, Laptop, PawPrint, Plane,
  Plug, Receipt, Repeat, Send, Shirt, ShoppingBag, ShoppingBasket, Smartphone, Utensils, type LucideIcon,
} from 'lucide-react';

// The icon set offered when creating a category. Stored by name in categories.icon.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  'shopping-basket': ShoppingBasket,
  bus: Bus,
  house: House,
  plug: Plug,
  'shopping-bag': ShoppingBag,
  'heart-pulse': HeartPulse,
  repeat: Repeat,
  send: Send,
  briefcase: Briefcase,
  laptop: Laptop,
  download: Download,
  plane: Plane,
  gift: Gift,
  'graduation-cap': GraduationCap,
  shirt: Shirt,
  smartphone: Smartphone,
  receipt: Receipt,
  'paw-print': PawPrint,
  circle: Circle,
};

export function CategoryIcon({ name, className = 'size-5' }: { name?: string | null; className?: string }) {
  const Icon = CATEGORY_ICONS[name ?? ''] ?? Circle;
  return <Icon className={className} aria-hidden strokeWidth={2} />;
}
