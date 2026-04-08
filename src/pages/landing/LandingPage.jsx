import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
    ShoppingCart, Camera, ArrowRight, ArrowUpRight, Check,
    BarChart3, Shield, Smartphone, Zap, Globe,
    ClipboardList, Sparkles, Layers, TrendingUp,
    Store, UtensilsCrossed, Briefcase, ImageIcon,
    DollarSign, Package, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import Navbar from '@/components/layout/Navbar.jsx'
import Footer from '@/components/layout/Footer.jsx'

/* ─────────────────────────── helpers ──────────────────────────── */

function AnimatedSection({ children, className = '', delay = 0 }) {
    const ref = useRef(null)
    const inView = useInView(ref, { once: true, margin: '-80px' })

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

function Counter({ target, suffix = '', prefix = '' }) {
    const [count, setCount] = useState(0)
    const ref = useRef(null)
    const inView = useInView(ref, { once: true })

    useEffect(() => {
        if (!inView) return
        let start = 0
        const step = Math.ceil(target / 60)
        const id = setInterval(() => {
            start += step
            if (start >= target) { setCount(target); clearInterval(id) }
            else setCount(start)
        }, 25)
        return () => clearInterval(id)
    }, [inView, target])

    return <span ref={ref}>{prefix}{count.toLocaleString('id-ID')}{suffix}</span>
}

/* ────────────────────────── data ──────────────────────────────── */

const painPoints = [
    {
        icon: DollarSign,
        color: 'text-red-400',
        bgColor: 'bg-gradient-to-br from-red-500/20 to-rose-500/10',
        ringColor: 'ring-red-500/20',
        title: 'Uang Masuk Tidak Cocok',
        desc: 'Catatan penjualan tidak sesuai dengan uang di laci kasir. Selisih kecil tiap hari, tapi jutaan tiap bulan.',
    },
    {
        icon: Package,
        color: 'text-amber-400',
        bgColor: 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10',
        ringColor: 'ring-amber-500/20',
        title: 'Stok Hilang Tanpa Jejak',
        desc: 'Barang berkurang tapi tidak ada catatan penjualan. Tidak ada yang bisa dimintai pertanggungjawaban.',
    },
    {
        icon: FileText,
        color: 'text-sky-400',
        bgColor: 'bg-gradient-to-br from-sky-500/20 to-blue-500/10',
        ringColor: 'ring-sky-500/20',
        title: 'Laporan Hanya di Akhir Bulan',
        desc: 'Baru tahu rugi setelah tutup buku. Tidak ada data real-time untuk ambil keputusan cepat.',
    },
]

const solutionFeatures = [
    {
        icon: TrendingUp,
        color: 'text-emerald-400',
        bgColor: 'bg-gradient-to-br from-emerald-500/20 to-green-500/10',
        title: 'Penjualan',
        desc: 'Dari transaksi, invoice, hingga pengiriman barang — semuanya tercatat otomatis dan real-time.',
    },
    {
        icon: BarChart3,
        color: 'text-sky-400',
        bgColor: 'bg-gradient-to-br from-sky-500/20 to-blue-500/10',
        title: 'Laporan Keuangan',
        desc: 'Laporan laba rugi, arus kas, dan neraca tersedia instan dalam hitungan detik.',
    },
    {
        icon: ClipboardList,
        color: 'text-amber-400',
        bgColor: 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10',
        title: 'Stock Opname',
        desc: 'Lakukan stock opname menyeluruh di semua lokasi bisnis dari satu dashboard.',
    },
    {
        icon: Zap,
        color: 'text-rose-400',
        bgColor: 'bg-gradient-to-br from-rose-500/20 to-red-500/10',
        title: 'Integrasi POS',
        desc: 'Kasir langsung terhubung ke laporan dan stok. Tanpa input manual, tanpa selisih.',
    },
]

const products = [
    {
        icon: ShoppingCart,
        title: 'POS Toko',
        desc: 'Sistem kasir lengkap untuk toko retail & jualan biasa. Manajemen stok, laporan penjualan, backoffice, dan ERP-lite terintegrasi.',
        color: 'from-red-500/15 to-rose-600/15',
        iconColor: 'text-red-400',
        iconBg: 'bg-gradient-to-br from-red-500/25 to-rose-500/15 ring-1 ring-red-500/20',
        href: '/produk/pos-toko',
    },
    {
        icon: Camera,
        title: 'POS Photo Studio',
        desc: 'Kasir khusus studio foto & cetak. Kelola order, harga paket, tracking pesanan, dan gallery management dengan mudah.',
        color: 'from-rose-500/15 to-pink-500/15',
        iconColor: 'text-rose-400',
        iconBg: 'bg-gradient-to-br from-rose-500/25 to-pink-500/15 ring-1 ring-rose-500/20',
        href: '/produk/pos-photo-studio',
    },
]

const solutions = [
    {
        icon: Store,
        title: 'Retail',
        desc: 'Minimarket, toko baju, elektronik, apotek — semua jenis toko bisa pakai.',
        color: 'text-emerald-400',
        bgColor: 'bg-gradient-to-br from-emerald-500/20 to-green-500/10 ring-1 ring-emerald-500/15',
    },
    {
        icon: UtensilsCrossed,
        title: 'F&B',
        desc: 'Restoran, café, bakery, catering — dari dapur sampai kasir terintegrasi.',
        color: 'text-amber-400',
        bgColor: 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10 ring-1 ring-amber-500/15',
    },
    {
        icon: Briefcase,
        title: 'Jasa',
        desc: 'Laundry, barbershop, bengkel, salon — kelola booking dan pembayaran.',
        color: 'text-sky-400',
        bgColor: 'bg-gradient-to-br from-sky-500/20 to-blue-500/10 ring-1 ring-sky-500/15',
    },
    {
        icon: ImageIcon,
        title: 'Photo Studio',
        desc: 'Studio foto, cetak foto, wisuda — tracking order dari shoot sampai serah terima.',
        color: 'text-pink-400',
        bgColor: 'bg-gradient-to-br from-pink-500/20 to-rose-500/10 ring-1 ring-pink-500/15',
    },
]

const highlights = [
    { icon: Shield, label: 'Data Aman & Terenkripsi', color: 'text-emerald-400', bgColor: 'bg-gradient-to-br from-emerald-500/20 to-green-500/10' },
    { icon: Smartphone, label: 'Akses dari Mana Saja', color: 'text-sky-400', bgColor: 'bg-gradient-to-br from-sky-500/20 to-blue-500/10' },
    { icon: BarChart3, label: 'Laporan Real-time', color: 'text-amber-400', bgColor: 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10' },
    { icon: Globe, label: 'Multi-Cabang', color: 'text-rose-400', bgColor: 'bg-gradient-to-br from-rose-500/20 to-red-500/10' },
]

const stats = [
    { value: 500, suffix: '+', label: 'Tenant Aktif' },
    { value: 1200000, suffix: '+', label: 'Transaksi' },
    { value: 99, suffix: '.9%', label: 'Uptime' },
    { value: 24, suffix: '/7', label: 'Support' },
]

const plans = [
    {
        name: 'Starter',
        price: 'Gratis',
        desc: 'Cocok untuk usaha kecil dan percobaan.',
        features: ['1 Aplikasi', '1 Unit Bisnis', '1.000 Transaksi/bln', 'Laporan Dasar'],
        cta: 'Mulai Gratis',
        popular: false,
    },
    {
        name: 'Pro',
        price: 'Rp 299rb',
        period: '/bulan',
        desc: 'Untuk bisnis berkembang yang butuh lebih.',
        features: ['Semua Aplikasi', '5 Unit Bisnis', 'Transaksi Unlimited', 'Laporan Advanced', 'Priority Support'],
        cta: 'Pilih Pro',
        popular: true,
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        desc: 'Solusi khusus untuk perusahaan besar.',
        features: ['Custom Integrasi', 'Unit Bisnis Unlimited', 'Dedicated Server', 'SLA Guarantee', 'Account Manager'],
        cta: 'Hubungi Kami',
        popular: false,
    },
]

/* ────────────────────────── page ──────────────────────────────── */

function LandingPage() {
    return (
        <div className="min-h-screen bg-background overflow-hidden">
            <Navbar />

            {/* ══════════ HERO ══════════ */}
            <section className="relative min-h-svh flex items-center justify-center overflow-hidden">
                {/* ── Animated SVG Curves ── */}
                <div className="pointer-events-none absolute inset-0">
                    <svg
                        className="absolute -left-[10%] top-0 h-full w-[55%] opacity-80"
                        viewBox="0 0 500 900"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <motion.path
                            d="M400 0C300 150 50 250 80 500C110 750 350 800 300 900"
                            stroke="oklch(0.58 0.2 18)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2.5, ease: 'easeInOut' }}
                        />
                        <motion.path
                            d="M350 0C250 200 -20 300 60 550C140 800 400 850 320 900"
                            stroke="oklch(0.58 0.2 18 / 40%)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 3, ease: 'easeInOut', delay: 0.3 }}
                        />
                    </svg>

                    <svg
                        className="absolute -right-[10%] top-0 h-full w-[55%] opacity-80"
                        viewBox="0 0 500 900"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <motion.path
                            d="M100 0C200 150 450 250 420 500C390 750 150 800 200 900"
                            stroke="oklch(0.58 0.2 18)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2.5, ease: 'easeInOut', delay: 0.2 }}
                        />
                        <motion.path
                            d="M150 0C250 200 520 300 440 550C360 800 100 850 180 900"
                            stroke="oklch(0.58 0.2 18 / 40%)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 3, ease: 'easeInOut', delay: 0.5 }}
                        />
                    </svg>
                </div>

                <div className="relative mx-auto max-w-4xl px-6 lg:px-8 text-center">
                    <AnimatedSection>
                        <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs border border-border/50 font-medium">
                            <Sparkles className="h-3 w-3 mr-1.5" />
                            Solusi Bisnis Terintegrasi
                        </Badge>
                    </AnimatedSection>

                    <AnimatedSection delay={0.1}>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
                            <span className="text-muted-foreground font-light">Masalah Bisnis Anda,</span>
                            <br />
                            <span className="text-foreground">Dimulai dari </span>
                            <span className="accent-text">Kasir.</span>
                        </h1>
                    </AnimatedSection>

                    <AnimatedSection delay={0.2}>
                        <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            Banyak bisnis kehilangan jutaan rupiah setiap bulan tanpa sadar — stok hilang,
                            catatan keuangan berantakan, dan tidak ada yang bisa dipertanggungjawabkan.
                        </p>
                    </AnimatedSection>

                    <AnimatedSection delay={0.3}>
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Button
                                size="lg"
                                className="bg-[oklch(0.58_0.2_18)] hover:bg-[oklch(0.52_0.2_18)] text-white px-8 py-6 text-sm font-semibold transition-all shadow-lg shadow-[oklch(0.58_0.2_18/20%)]"
                                asChild
                            >
                                <Link to="/register">
                                    Coba Gratis Sekarang
                                    <ArrowUpRight className="ml-1.5 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="px-8 py-6 text-sm font-medium border-border/50 hover:bg-accent/60"
                                asChild
                            >
                                <a href="#about">
                                    Jadwalkan Konsultasi
                                    <ArrowUpRight className="ml-1.5 h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            Coba gratis tanpa syarat apa pun
                        </p>
                    </AnimatedSection>
                </div>
            </section>

            {/* ══════════ PAIN POINTS ══════════ */}
            <section className="relative py-16 lg:py-20">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <AnimatedSection className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                            Mengapa Masalah Dimulai dari <span className="accent-text">Kasir?</span>
                        </h2>
                        <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                            Kebanyakan pemilik bisnis baru sadar setelah kerugian terjadi berulang kali.
                        </p>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-3 gap-6">
                        {painPoints.map((item, idx) => {
                            const Icon = item.icon
                            return (
                                <AnimatedSection key={item.title} delay={idx * 0.1}>
                                    <div className="rounded-2xl border border-border/30 bg-card/50 p-6 h-full hover:bg-card/80 transition-colors duration-300">
                                        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.bgColor} mb-4`}>
                                            <Icon className={`h-5 w-5 ${item.color}`} />
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                                    </div>
                                </AnimatedSection>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ══════════ SOLUTIONS ══════════ */}
            <section id="features" className="relative py-16 lg:py-20">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <AnimatedSection className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                            Satu Platform, <span className="accent-text">Banyak Solusi</span>
                        </h2>
                        <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                            Pantau penjualan, stok & keuangan bisnis Anda secara real-time.
                        </p>
                    </AnimatedSection>

                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        {/* Left — Illustration */}
                        <AnimatedSection>
                            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border/30 bg-card/50">
                                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center space-y-4 p-8">
                                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/30 border border-border/30">
                                            <BarChart3 className="h-10 w-10 text-red-400" />
                                        </div>
                                        <p className="text-sm text-muted-foreground font-medium">Dashboard Real-Time</p>
                                        <div className="flex items-end justify-center gap-1.5 h-16">
                                            {[40, 65, 45, 80, 55, 90, 70, 95].map((h, i) => (
                                                <motion.div
                                                    key={i}
                                                    className="w-4 rounded-t-sm bg-gradient-to-t from-red-500/60 to-rose-400/30"
                                                    initial={{ height: 0 }}
                                                    whileInView={{ height: `${h}%` }}
                                                    transition={{ duration: 0.6, delay: i * 0.08 }}
                                                    viewport={{ once: true }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AnimatedSection>

                        {/* Right — Features grid */}
                        <div>
                            <div className="grid sm:grid-cols-2 gap-6">
                                {solutionFeatures.map((item, idx) => {
                                    const Icon = item.icon
                                    return (
                                        <AnimatedSection key={item.title} delay={idx * 0.1}>
                                            <div className="rounded-xl border border-border/20 bg-card/30 p-5 hover:bg-card/60 transition-colors duration-300">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/50">
                                                        <Icon className={`h-4 w-4 ${item.color}`} />
                                                    </div>
                                                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                                                </div>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                                            </div>
                                        </AnimatedSection>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════ PRODUK KAMI ══════════ */}
            <section id="produk" className="relative py-16 lg:py-20">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <AnimatedSection className="text-center mb-12">
                        <Badge variant="secondary" className="mb-4 px-4 py-1 text-xs border border-border/50">
                            <Layers className="h-3 w-3 mr-1.5" />
                            Produk
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                            Produk <span className="accent-text">Kami</span>
                        </h2>
                        <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                            Pilih produk yang sesuai kebutuhan bisnis Anda. Setiap produk didesain untuk jenis bisnis spesifik.
                        </p>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {products.map((app, idx) => {
                            const Icon = app.icon
                            return (
                                <AnimatedSection key={app.title} delay={idx * 0.12}>
                                    <Card className="group relative overflow-hidden border-border/30 bg-card/50 hover:bg-card/80 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/5 h-full">
                                        <div className={`absolute inset-0 bg-gradient-to-br ${app.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                        <CardHeader className="relative">
                                            <div className="h-12 w-12 rounded-xl bg-accent/50 flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110">
                                                <Icon className={`h-6 w-6 ${app.iconColor}`} />
                                            </div>
                                            <CardTitle className="text-xl">{app.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="relative">
                                            <p className="text-muted-foreground text-sm leading-relaxed">{app.desc}</p>
                                            <div className="mt-6">
                                                <Link
                                                    to={app.href}
                                                    className="inline-flex items-center text-sm text-primary font-medium group-hover:gap-2 transition-all"
                                                >
                                                    Pelajari lebih lanjut
                                                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </AnimatedSection>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ══════════ SOLUSI UNTUK SETIAP BISNIS ══════════ */}
            <section id="solusi" className="relative py-16 lg:py-20">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <AnimatedSection className="text-center mb-12">
                        <Badge variant="secondary" className="mb-4 px-4 py-1 text-xs border border-border/50">
                            <Sparkles className="h-3 w-3 mr-1.5" />
                            Solusi
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                            Solusi untuk <span className="accent-text">Setiap Bisnis</span>
                        </h2>
                        <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                            Apapun jenis bisnis Anda, kami punya solusi yang bisa disesuaikan.
                        </p>
                    </AnimatedSection>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {solutions.map((sol, idx) => {
                            const Icon = sol.icon
                            return (
                                <AnimatedSection key={sol.title} delay={idx * 0.1}>
                                    <div className="group rounded-2xl border border-border/30 bg-card/50 p-6 text-center hover:bg-card/80 hover:-translate-y-1 transition-all duration-300 h-full">
                                        <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${sol.bgColor} mb-4 transition-transform group-hover:scale-110`}>
                                            <Icon className={`h-7 w-7 ${sol.color}`} />
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">{sol.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{sol.desc}</p>
                                        <div className="mt-4">
                                            <span className="inline-flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                Lihat Solusi <ArrowRight className="ml-1 h-3 w-3" />
                                            </span>
                                        </div>
                                    </div>
                                </AnimatedSection>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ══════════ HIGHLIGHTS ══════════ */}
            <section className="relative py-12 lg:py-16">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <AnimatedSection>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {highlights.map((h, idx) => {
                                const Icon = h.icon
                                return (
                                    <motion.div
                                        key={h.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                                        className="flex items-center gap-3 rounded-xl border border-border/20 bg-card/30 p-4"
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/50">
                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <span className="text-sm font-medium text-foreground">{h.label}</span>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* ══════════ STATS ══════════ */}
            <section id="about" className="relative py-20 lg:py-28">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
                <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
                    <AnimatedSection>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
                            {stats.map((stat, idx) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    className="text-center"
                                >
                                    <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold gradient-text">
                                        <Counter target={stat.value} suffix={stat.suffix} />
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                                </motion.div>
                            ))}
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* ══════════ PRICING ══════════ */}
            <section id="pricing" className="relative py-24 lg:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <AnimatedSection className="text-center mb-16">
                        <Badge variant="secondary" className="mb-4 px-4 py-1 text-xs border border-border/50">
                            <TrendingUp className="h-3 w-3 mr-1.5" />
                            Harga
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                            Harga <span className="accent-text">Transparan</span>
                        </h2>
                        <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
                            Mulai gratis, upgrade kapan saja sesuai kebutuhan bisnis Anda.
                        </p>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {plans.map((plan, idx) => (
                            <AnimatedSection key={plan.name} delay={idx * 0.12}>
                                <Card className={`relative overflow-hidden h-full flex flex-col border-border/30 bg-card/50 transition-all duration-300 hover:-translate-y-1 ${plan.popular
                                    ? 'border-primary/50 shadow-lg shadow-red-500/10'
                                    : 'hover:border-border/50'
                                    }`}>
                                    {plan.popular && (
                                        <div className="absolute top-0 right-0">
                                            <div className="bg-[oklch(0.58_0.2_18)] text-white text-[10px] font-semibold px-3 py-1 rounded-bl-lg">
                                                POPULER
                                            </div>
                                        </div>
                                    )}
                                    <CardHeader>
                                        <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
                                        <div className="mt-3 flex items-baseline gap-1">
                                            <span className="text-3xl font-extrabold">{plan.price}</span>
                                            {plan.period && (
                                                <span className="text-sm text-muted-foreground">{plan.period}</span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col">
                                        <ul className="space-y-3 flex-1">
                                            {plan.features.map((f) => (
                                                <li key={f} className="flex items-center gap-2 text-sm">
                                                    <Check className="h-4 w-4 text-primary shrink-0" />
                                                    <span>{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Button
                                            className={`mt-8 w-full ${plan.popular
                                                ? 'bg-[oklch(0.58_0.2_18)] hover:bg-[oklch(0.52_0.2_18)] text-white'
                                                : 'bg-secondary hover:bg-accent'
                                                } transition-all`}
                                            asChild
                                        >
                                            <Link to="/register">{plan.cta}</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════ FINAL CTA ══════════ */}
            <section className="relative py-24 lg:py-32">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-t from-[oklch(0.58_0.2_18/15%)] via-[oklch(0.58_0.2_18/8%)] to-transparent blur-3xl" />
                </div>

                <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
                    <AnimatedSection>
                        <div className="glass rounded-3xl border border-border/30 p-10 sm:p-16 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.58_0.2_18/5%)] to-rose-500/5" />
                            <div className="relative">
                                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                                    Siap Mengembangkan <span className="accent-text">Bisnis Anda?</span>
                                </h2>
                                <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
                                    Bergabung dengan ratusan bisnis yang sudah menggunakan LeakStudio
                                    untuk mengelola operasional mereka.
                                </p>
                                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <Button
                                        size="lg"
                                        className="bg-[oklch(0.58_0.2_18)] hover:bg-[oklch(0.52_0.2_18)] text-white px-10 py-6 text-base font-semibold transition-all shadow-lg shadow-[oklch(0.58_0.2_18/20%)]"
                                        asChild
                                    >
                                        <Link to="/register">
                                            Mulai Sekarang — Gratis
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                                <p className="mt-4 text-xs text-muted-foreground">
                                    Tidak perlu kartu kredit • Setup dalam 2 menit
                                </p>
                            </div>
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            <Footer />
        </div>
    )
}

export default LandingPage
