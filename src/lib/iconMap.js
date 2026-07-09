/**
 * Maps icon name strings (from DB) to lucide-react icon components.
 * This serves as the single source of truth for icon resolution.
 */
import {
    LayoutDashboard,
    ShoppingCart,
    Warehouse,
    BarChart3,
    Package,
    Users,
    Settings,
    Store,
    Camera,
    ListOrdered,
    Layers,
    FileText,
    Calendar,
    CreditCard,
    Truck,
    Bell,
    Shield,
    Database,
    Blocks,
    UserCog,
    Heart,
    Star,
    Zap,
    Globe,
    HelpCircle,
    BookOpen,
    Wallet,
    Receipt,
    Calculator,
    RefreshCcw,
} from 'lucide-react';

const ICON_MAP = {
    LayoutDashboard,
    ShoppingCart,
    Warehouse,
    BarChart3,
    Package,
    Users,
    Settings,
    Store,
    Camera,
    ListOrdered,
    Layers,
    FileText,
    Calendar,
    CreditCard,
    Truck,
    Bell,
    Shield,
    Database,
    Blocks,
    UserCog,
    Heart,
    Star,
    Zap,
    Globe,
    HelpCircle,
    BookOpen,
    Wallet,
    Receipt,
    Calculator,
    RefreshCcw,
};

/**
 * Resolve icon name string to lucide-react component.
 * @param {string} iconName - e.g. "ShoppingCart", "LayoutDashboard"
 * @param {import('lucide-react').LucideIcon} [fallback] - fallback icon
 * @returns {import('lucide-react').LucideIcon}
 */
export function resolveIcon(iconName, fallback = Layers) {
    if (!iconName) return fallback;
    return ICON_MAP[iconName] || fallback;
}
