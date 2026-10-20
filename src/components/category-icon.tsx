import {
  Briefcase, Bus, Car, Circle, Clapperboard, Download, Gift, GraduationCap, HandCoins, HeartPulse, House, HousePlus, Landmark,
  Laptop, PawPrint, Plane, Plug, Receipt, Repeat, Scissors, Send, ShieldCheck, Shirt, ShoppingBag, ShoppingBasket, Smartphone,
  Users, Utensils, type LucideIcon,
} from 'lucide-react';

// The icon set offered when creating a category. Stored by name in categories.icon.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  'shopping-basket': ShoppingBasket,
  bus: Bus,
  car: Car,
  house: House,
  'house-plus': HousePlus,
  'hand-coins': HandCoins,
  plug: Plug,
  'shield-check': ShieldCheck,
  'shopping-bag': ShoppingBag,
  'heart-pulse': HeartPulse,
  scissors: Scissors,
  repeat: Repeat,
  send: Send,
  users: Users,
  briefcase: Briefcase,
  laptop: Laptop,
  download: Download,
  plane: Plane,
  clapperboard: Clapperboard,
  gift: Gift,
  'graduation-cap': GraduationCap,
  shirt: Shirt,
  smartphone: Smartphone,
  receipt: Receipt,
  landmark: Landmark,
  'paw-print': PawPrint,
  circle: Circle,
};

export function CategoryIcon({ name, className = 'size-5' }: { name?: string | null; className?: string }) {
  const Icon = CATEGORY_ICONS[name ?? ''] ?? Circle;
  return <Icon className={className} aria-hidden strokeWidth={2} />;
}
