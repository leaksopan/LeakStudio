import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

const footerLinks = {
    Produk: [
        { label: 'POS / Kasir', href: '#features' },
        { label: 'Photo Studio', href: '#features' },
        { label: 'Antrian', href: '#features' },
        { label: 'Harga', href: '#pricing' },
    ],
    Perusahaan: [
        { label: 'Tentang Kami', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Karir', href: '#' },
        { label: 'Kontak', href: '#' },
    ],
    Bantuan: [
        { label: 'Dokumentasi', href: '#' },
        { label: 'FAQ', href: '#' },
        { label: 'Status', href: '#' },
        { label: 'Support', href: '#' },
    ],
}

function Footer() {
    return (
        <footer className="border-t border-border/50 bg-background/50">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                    {/* ── Brand col ──────────────────── */}
                    <div className="col-span-2 md:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-primary">
                                <Zap className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-base font-bold tracking-tight">
                                Leak<span className="gradient-text">Studio</span>
                            </span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                            Platform bisnis all-in-one untuk mengelola toko, studio, dan antrian Anda.
                        </p>
                    </div>

                    {/* ── Link cols ──────────────────── */}
                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h4 className="text-sm font-semibold mb-4">{title}</h4>
                            <ul className="space-y-2.5">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        <a
                                            href={link.href}
                                            className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* ── Bottom bar ───────────────────── */}
                <div className="mt-14 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} LeakStudio. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            Privacy Policy
                        </a>
                        <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            Terms of Service
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
