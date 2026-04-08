import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { Button } from '@/components/ui/button.jsx'
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu.jsx'
import {
    Menu, X, ChevronDown, ChevronRight,
    ShoppingCart, Camera, Layers,
    Store, UtensilsCrossed, Briefcase, ImageIcon,
    LogOut, LayoutDashboard,
} from 'lucide-react'

/* ─────────────── Navigation Data ─────────────── */

const produkItems = [
    {
        icon: ShoppingCart,
        label: 'POS Toko',
        desc: 'Sistem kasir lengkap untuk toko retail & jualan biasa.',
        href: '/produk/pos-toko',
        color: 'text-red-400',
    },
    {
        icon: Camera,
        label: 'POS Photo Studio',
        desc: 'Kasir khusus studio foto, cetak, dan manajemen order.',
        href: '/produk/pos-photo-studio',
        color: 'text-rose-400',
    },
]

const solusiCategories = [
    {
        icon: Store,
        label: 'Retail',
        color: 'text-emerald-400',
        items: ['Minimarket', 'Toko Baju/Butik', 'Toko Elektronik', 'Apotek', 'Toko Online'],
    },
    {
        icon: UtensilsCrossed,
        label: 'F&B',
        color: 'text-amber-400',
        items: ['Restoran', 'Café', 'Bakery', 'Catering', 'Food Court'],
    },
    {
        icon: Briefcase,
        label: 'Jasa',
        color: 'text-sky-400',
        items: ['Laundry', 'Barbershop', 'Bengkel', 'Salon', 'Service Center'],
    },
    {
        icon: ImageIcon,
        label: 'Photo Studio',
        color: 'text-pink-400',
        items: ['Studio Foto', 'Cetak Foto', 'Foto Wisuda', 'Foto Produk', 'Editing & Retouch'],
    },
]

const navLinks = [
    { label: 'Harga', href: '#pricing' },
    { label: 'Tentang Kami', href: '#about' },
]

/* ─────────────── Component ─────────────── */

function Navbar() {
    const { isAuthenticated, loading: authLoading, signOut } = useAuth()
    const navigate = useNavigate()
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [activeSolusiIdx, setActiveSolusiIdx] = useState(0)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8">
            <div className="pt-4" />

            <div
                className={`mx-auto max-w-5xl rounded-full border transition-all duration-300 ${scrolled
                    ? 'border-border/60 bg-background/80 backdrop-blur-xl shadow-lg shadow-black/10'
                    : 'border-border/30 bg-background/50 backdrop-blur-md'
                    }`}
            >
                <div className="flex h-12 items-center justify-between px-5">
                    {/* ── Logo ── */}
                    <Link to="/" className="flex items-center gap-2 shrink-0 group">
                        <Layers className="h-5 w-5 text-foreground transition-transform group-hover:scale-110" />
                        <span className="text-sm font-bold tracking-tight">
                            Leak<span className="accent-text">Studio</span>
                        </span>
                    </Link>

                    {/* ── Desktop Nav (ShadCN NavigationMenu) ── */}
                    <NavigationMenu className="hidden md:flex">
                        <NavigationMenuList>
                            {/* Produk */}
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className="bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50 data-[state=open]:bg-accent/50 h-8 rounded-full text-sm px-3">
                                    Produk
                                </NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid w-[420px] grid-cols-1 gap-1 p-2">
                                        {produkItems.map((item) => {
                                            const Icon = item.icon
                                            return (
                                                <li key={item.label}>
                                                    <NavigationMenuLink asChild>
                                                        <Link
                                                            to={item.href}
                                                            className="flex items-start gap-3 rounded-xl p-3 hover:bg-accent/50 transition-colors group select-none"
                                                        >
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/50">
                                                                <Icon className={`h-5 w-5 ${item.color}`} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                                                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                                                            </div>
                                                        </Link>
                                                    </NavigationMenuLink>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                            {/* Solusi */}
                            <NavigationMenuItem>
                                <NavigationMenuTrigger
                                    className="bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50 data-[state=open]:bg-accent/50 h-8 rounded-full text-sm px-3"
                                    onPointerEnter={() => setActiveSolusiIdx(0)}
                                >
                                    Solusi
                                </NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <div className="flex w-[620px] min-h-[260px]">
                                        {/* Left — categories */}
                                        <div className="w-44 shrink-0 border-r border-border/30 p-2 space-y-0.5">
                                            {solusiCategories.map((cat, idx) => {
                                                const Icon = cat.icon
                                                return (
                                                    <button
                                                        key={cat.label}
                                                        className={`flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-sm text-left transition-colors ${activeSolusiIdx === idx
                                                            ? 'bg-accent/60 text-foreground font-medium'
                                                            : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                                                            }`}
                                                        onMouseEnter={() => setActiveSolusiIdx(idx)}
                                                    >
                                                        <Icon className={`h-4 w-4 ${cat.color}`} />
                                                        {cat.label}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {/* Right — sub-items */}
                                        <div className="flex-1 p-4">
                                            <p className="text-sm font-semibold text-foreground mb-1">
                                                {solusiCategories[activeSolusiIdx].label}
                                            </p>
                                            <p className="text-xs text-muted-foreground mb-4">
                                                Solusi untuk bisnis {solusiCategories[activeSolusiIdx].label.toLowerCase()}
                                            </p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {solusiCategories[activeSolusiIdx].items.map((sub) => (
                                                    <NavigationMenuLink key={sub} asChild>
                                                        <a
                                                            href={`/solusi/${sub.toLowerCase().replace(/[\s/]/g, '-')}`}
                                                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                                                        >
                                                            <ChevronRight className="h-3 w-3 opacity-50" />
                                                            {sub}
                                                        </a>
                                                    </NavigationMenuLink>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                            {/* Static links */}
                            {navLinks.map((link) => (
                                <NavigationMenuItem key={link.label}>
                                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                                        <a
                                            href={link.href}
                                            className="!bg-transparent text-muted-foreground hover:!text-foreground hover:!bg-accent/50 !h-8 !rounded-full !text-sm !px-3"
                                        >
                                            {link.label}
                                        </a>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>

                    {/* ── Desktop CTA ── */}
                    <div className="hidden md:flex items-center gap-2">
                        {!authLoading && isAuthenticated ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full text-xs font-medium px-4 h-8 text-muted-foreground hover:text-foreground"
                                    asChild
                                >
                                    <Link to="/dashboard">
                                        <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                                        Dashboard
                                    </Link>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full text-xs font-medium px-4 h-8 text-muted-foreground hover:text-foreground"
                                    onClick={async () => {
                                        await signOut()
                                        navigate('/')
                                    }}
                                >
                                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                                    Sign Out
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full text-xs font-medium px-4 h-8 text-muted-foreground hover:text-foreground"
                                    asChild
                                >
                                    <Link to="/login">Login</Link>
                                </Button>
                                <Button
                                    size="sm"
                                    className="rounded-full text-xs font-medium px-4 h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                                    asChild
                                >
                                    <Link to="/register">Coba Gratis</Link>
                                </Button>
                            </>
                        )}
                    </div>

                    {/* ── Mobile Toggle ── */}
                    <button
                        className="md:hidden p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-accent/50"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* ── Mobile Menu ── */}
            <div
                className={`md:hidden mx-auto max-w-5xl overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[600px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
                    }`}
            >
                <div className="rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl shadow-black/20 px-5 py-4 space-y-1">
                    {/* Produk accordion */}
                    <MobileAccordion title="Produk">
                        {produkItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.label}
                                    to={item.href}
                                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent/60 transition-colors"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    <Icon className={`h-4 w-4 ${item.color}`} />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </MobileAccordion>

                    {/* Solusi accordion */}
                    <MobileAccordion title="Solusi">
                        {solusiCategories.map((cat) => {
                            const Icon = cat.icon
                            return (
                                <div key={cat.label} className="mb-2">
                                    <p className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        <Icon className={`h-3.5 w-3.5 ${cat.color}`} />
                                        {cat.label}
                                    </p>
                                    <div className="grid grid-cols-2 gap-1 mt-1">
                                        {cat.items.map((sub) => (
                                            <a
                                                key={sub}
                                                href={`/solusi/${sub.toLowerCase().replace(/[\s/]/g, '-')}`}
                                                className="block rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                                                onClick={() => setMobileOpen(false)}
                                            >
                                                {sub}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </MobileAccordion>

                    {/* Static links */}
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                            onClick={() => setMobileOpen(false)}
                        >
                            {link.label}
                        </a>
                    ))}

                    {/* CTAs */}
                    <div className="pt-3 mt-2 border-t border-border/50 space-y-2">
                        {!authLoading && isAuthenticated ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="w-full rounded-full text-sm justify-center border-border/50"
                                    asChild
                                >
                                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                                        <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                                        Dashboard
                                    </Link>
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full rounded-full text-sm justify-center text-muted-foreground"
                                    onClick={async () => {
                                        setMobileOpen(false)
                                        await signOut()
                                        navigate('/')
                                    }}
                                >
                                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                                    Sign Out
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    className="w-full rounded-full text-sm justify-center border-border/50"
                                    asChild
                                >
                                    <Link to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
                                </Button>
                                <Button
                                    className="w-full rounded-full text-sm justify-center bg-primary hover:bg-primary/90 text-primary-foreground"
                                    asChild
                                >
                                    <Link to="/register" onClick={() => setMobileOpen(false)}>Coba Gratis</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}

/* ─────── Mobile Accordion ─────── */

function MobileAccordion({ title, children }) {
    const [open, setOpen] = useState(false)

    return (
        <div>
            <button
                className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                onClick={() => setOpen(!open)}
            >
                {title}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                <div className="pl-2 space-y-0.5">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Navbar
