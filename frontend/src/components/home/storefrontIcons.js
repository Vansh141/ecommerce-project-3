import { Banknote, Gift, Heart, Package, Phone, RotateCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react';

/**
 * The icons an admin may choose for announcement and service messages. The
 * API accepts only these names, so content can never reference an arbitrary
 * or uploaded SVG.
 */
export const STOREFRONT_ICONS = {
  truck: Truck,
  returns: RotateCcw,
  cod: Banknote,
  secure: ShieldCheck,
  package: Package,
  gift: Gift,
  sparkles: Sparkles,
  phone: Phone,
  heart: Heart,
};

export const ICON_LABELS = {
  truck: 'Delivery',
  returns: 'Returns',
  cod: 'Cash',
  secure: 'Shield',
  package: 'Parcel',
  gift: 'Gift',
  sparkles: 'Sparkle',
  phone: 'Phone',
  heart: 'Heart',
};
