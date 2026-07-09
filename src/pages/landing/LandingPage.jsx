import { useRef } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Check, DatabaseZap, ExternalLink, GitBranch, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import './landing.css'

const primaryText = '#E1E0CC'
const easeOut = [0.16, 1, 0.3, 1]
const MotionArticle = motion.article
const MotionP = motion.p
const MotionSpan = motion.span
const MotionA = motion.a
const MotionDiv = motion.div

const heroVideo =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4'

const featureVideo =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4'

const navItems = [
  { label: 'Open source', href: '#about' },
  { label: 'AI information', href: '#features' },
  { label: 'Portfolio', href: '#portfolio' },
  { label: 'Research', href: '#features' },
  { label: 'Community', href: '#about' },
  { label: 'Inquiries', href: '#features' },
]

const featureCards = [
  {
    eyebrow: '01',
    title: 'Open Source Lab.',
    Icon: GitBranch,
    items: [
      'Reusable tools for builders and teams.',
      'Transparent repositories with practical docs.',
      'Community-first experiments ready to fork.',
      'Clean workflows from prototype to release.',
    ],
  },
  {
    eyebrow: '02',
    title: 'AI Information.',
    Icon: DatabaseZap,
    items: [
      'Structured knowledge from fast-moving AI signals.',
      'Readable notes for research, product, and strategy.',
      'Tool intelligence without the noise.',
    ],
  },
  {
    eyebrow: '03',
    title: 'Signal Studio.',
    Icon: Sparkles,
    items: [
      'Editorial AI briefings for makers and operators.',
      'Creative experiments shaped into useful systems.',
      'Shared references for teams building in public.',
    ],
  },
]

function WordsPullUp({ text, showAsterisk = false, className = '' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' })
  const words = text.split(' ')

  return (
    <span ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {words.map((word, index) => {
        const isLast = index === words.length - 1

        return (
          <span key={`${word}-${index}`} className="overflow-hidden pr-[0.08em]">
            <MotionSpan
              className="inline-block"
              initial={{ y: 20, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
              transition={{ duration: 0.8, delay: index * 0.08, ease: easeOut }}
            >
              <span className="relative inline-block">
                {word}
                {showAsterisk && isLast && (
                  <sup className="absolute -right-[0.3em] top-[0.65em] text-[0.31em] leading-none">*</sup>
                )}
              </span>
            </MotionSpan>
          </span>
        )
      })}
    </span>
  )
}

function WordsPullUpMultiStyle({ segments, className = '' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' })
  const words = segments.flatMap((segment, segmentIndex) =>
    segment.text.split(' ').map((word) => ({
      word,
      className: segment.className || '',
      segmentIndex,
    })),
  )

  return (
    <span ref={ref} className={`inline-flex flex-wrap justify-center ${className}`}>
      {words.map(({ word, className: wordClassName, segmentIndex }, index) => (
        <span key={`${word}-${segmentIndex}-${index}`} className="overflow-hidden pr-[0.22em]">
          <MotionSpan
            className={`inline-block ${wordClassName}`}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{ duration: 0.8, delay: index * 0.08, ease: easeOut }}
          >
            {word}
          </MotionSpan>
        </span>
      ))}
    </span>
  )
}

function AnimatedLetter({ char, index, totalChars, progress }) {
  const charProgress = index / totalChars
  const start = Math.max(0, charProgress - 0.1)
  const end = Math.min(1, Math.max(start + 0.01, charProgress + 0.05))
  const opacity = useTransform(progress, [start, end], [0.2, 1])

  return (
    <MotionSpan style={{ opacity }} aria-hidden="true">
      {char}
    </MotionSpan>
  )
}

function ScrollRevealText({ text }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.2'],
  })
  const letters = Array.from(text)

  return (
    <p ref={ref} className="mt-8 max-w-2xl text-xs leading-relaxed text-[#DEDBC8] sm:text-sm md:text-base">
      <span className="sr-only">{text}</span>
      {letters.map((char, index) => (
        <AnimatedLetter
          key={`${char}-${index}`}
          char={char}
          index={index}
          totalChars={letters.length}
          progress={scrollYProgress}
        />
      ))}
    </p>
  )
}

function HeroSection() {
  return (
    <section className="relative min-h-screen bg-black p-4 md:p-6">
      <div className="relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl md:min-h-[calc(100vh-3rem)] md:rounded-[2rem]">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={heroVideo}
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

        <nav className="absolute left-1/2 top-0 z-20 -translate-x-1/2 rounded-b-2xl bg-black px-4 py-2 md:rounded-b-3xl md:px-8">
          <ul className="flex items-center gap-3 text-[10px] sm:gap-5 sm:text-xs md:gap-8 md:text-sm lg:gap-10">
            {navItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="whitespace-nowrap transition-colors"
                  style={{ color: 'rgba(225, 224, 204, 0.8)' }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5 sm:px-6 md:px-8 md:pb-7">
          <div className="grid items-end gap-5 lg:grid-cols-12">
            <h1
              className="col-span-7 text-[18vw] font-medium leading-[0.85] tracking-[-0.07em] sm:text-[17vw] md:text-[15vw] lg:text-[10.5vw] xl:text-[10vw] 2xl:text-[10.5vw]"
              style={{ color: primaryText }}
            >
              <WordsPullUp text="LeakStudio" showAsterisk />
            </h1>

            <div className="col-span-5 mb-1 max-w-xl lg:mb-5 lg:justify-self-end">
              <MotionP
                className="text-xs leading-[1.2] text-[#DEDBC8]/70 sm:text-sm md:text-base"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: easeOut }}
              >
                LeakStudio is an open source and AI Information studio for builders, researchers, and creative teams
                turning scattered signals into useful products, public knowledge, and practical systems.
              </MotionP>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <MotionA
                  href="#about"
                  className="group inline-flex items-center gap-2 rounded-full bg-[#DEDBC8] py-1.5 pl-5 pr-1.5 text-sm font-medium text-black transition-[gap] hover:gap-3 sm:text-base"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.7, ease: easeOut }}
                >
                  Explore the lab
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                    <ArrowRight className="h-4 w-4 text-[#DEDBC8]" />
                  </span>
                </MotionA>

                <MotionDiv
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.82, ease: easeOut }}
                >
                  <Link
                    to="/login"
                    className="inline-flex h-12 items-center rounded-full border border-[#DEDBC8]/30 px-5 text-sm font-medium text-[#DEDBC8] transition-colors hover:border-[#DEDBC8]/70 sm:text-base"
                  >
                    Login
                  </Link>
                </MotionDiv>

                <MotionDiv
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.9, ease: easeOut }}
                >
                  <Link
                    to="/register"
                    className="inline-flex h-12 items-center rounded-full border border-transparent px-2 text-sm font-medium text-[#DEDBC8]/70 transition-colors hover:text-[#DEDBC8] sm:text-base"
                  >
                    Register
                  </Link>
                </MotionDiv>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function AboutSection() {
  return (
    <section id="about" className="bg-black px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto flex max-w-6xl flex-col items-center rounded-[1.5rem] bg-[#101010] px-5 py-16 text-center sm:px-8 md:py-24">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#DEDBC8] sm:text-xs">Open source intelligence</p>

        <h2
          className="mx-auto mt-8 max-w-4xl text-3xl font-normal leading-[0.95] sm:text-4xl sm:leading-[0.9] md:text-5xl lg:text-6xl xl:text-7xl"
          style={{ color: primaryText }}
        >
          <WordsPullUpMultiStyle
            segments={[
              { text: 'We are LeakStudio,' },
              { text: 'an open source studio.', className: 'font-serif italic' },
              { text: 'We map AI Information into tools, references, and research people can actually use.' },
            ]}
          />
        </h2>

        <ScrollRevealText text="We build in public, document what we learn, and convert the fast-moving AI landscape into clear technical signals. Our work connects open source practice with AI Information so teams can learn faster, ship sharper, and share better knowledge." />
      </div>
    </section>
  )
}

function PortfolioSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="portfolio" className="bg-black px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-3xl md:mb-14">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#DEDBC8] sm:text-xs">Portfolio</p>
          <h2 className="mt-5 text-3xl font-normal leading-[0.95] text-[#E1E0CC] sm:text-4xl md:text-5xl lg:text-6xl">
            Produk aktif dari LeakStudio lab.
          </h2>
        </div>

        <MotionArticle
          ref={ref}
          className="grid overflow-hidden rounded-[1.5rem] bg-[#101010] lg:grid-cols-[1.1fr_0.9fr]"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.8, ease: easeOut }}
        >
          <div className="relative min-h-[320px] overflow-hidden bg-[#212121] p-6 sm:p-8 md:p-10">
            <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.2]" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between gap-4">
                <a
                  href="https://bansosai.leakstudio.id/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border-b border-[#DEDBC8]/30 pb-1 text-xs text-[#DEDBC8]/70 transition-colors hover:border-[#DEDBC8]/70"
                >
                  bansosai.leakstudio.id
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-xs text-gray-500">01</span>
              </div>

              <div className="mt-14">
                <h3 className="text-5xl font-normal leading-[0.9] tracking-[-0.03em] text-[#E1E0CC] sm:text-6xl md:text-7xl">
                  BansosAI
                </h3>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-[#DEDBC8]/60 md:text-base">
                  Asisten informasi untuk menemukan promo, trial, akses murah, dan temuan komunitas seputar layanan AI
                  seperti ChatGPT, GPT Plus, K12, dan tools AI populer lainnya.
                </p>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {['Promo AI', 'Akses murah', 'Update komunitas'].map((item) => (
                  <div key={item} className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-[#DEDBC8]/70">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between p-6 sm:p-8 md:p-10">
            <div>
              <p className="text-sm leading-relaxed text-gray-400 md:text-base">
                BansosAI membantu pengguna mengikuti informasi terbaru tentang penawaran AI gratis, promo langganan,
                akses murah, klaim bypass, dan temuan komunitas yang sedang ramai. Informasi dirapikan menjadi ringkasan
                yang mudah dibaca, lengkap dengan sumber agar pengguna bisa mengecek ulang sebelum mencoba.
              </p>

              <ul className="mt-8 space-y-3">
                {[
                  'Temukan info ChatGPT, GPT Plus murah, K12, trial, kupon, dan promo tools AI.',
                  'Pantau klaim exploit atau bypass AI sebagai informasi, lalu cek sumbernya sebelum digunakan.',
                  'Baca ringkasan singkat tanpa harus membuka banyak forum dan kanal komunitas satu per satu.',
                  'Lihat tautan sumber asli agar setiap penawaran bisa diverifikasi kembali.',
                  'Dapat menerima update cepat lewat Discord untuk komunitas atau tim.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-snug text-gray-400">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-[#DEDBC8]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <a
              href="https://bansosai.leakstudio.id/"
              target="_blank"
              rel="noreferrer"
              className="landing-light-button mt-10 inline-flex w-fit items-center gap-2 rounded-full bg-[#DEDBC8] px-5 py-3 text-sm font-medium text-black transition-transform hover:scale-[1.02]"
            >
              Visit BansosAI
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </MotionArticle>
      </div>
    </section>
  )
}

function FeatureInfoCard({ card, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const Icon = card.Icon

  return (
    <MotionArticle
      ref={ref}
      className="flex min-h-[320px] flex-col justify-between bg-[#212121] p-5 sm:min-h-[360px] md:p-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#DEDBC8] text-black">
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-normal leading-tight text-[#E1E0CC] sm:text-2xl">{card.title}</h3>
          <span className="text-xs text-gray-500">{card.eyebrow}</span>
        </div>

        <ul className="mt-6 space-y-3">
          {card.items.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm leading-snug text-gray-400">
              <Check className="mt-0.5 h-4 w-4 flex-none text-[#DEDBC8]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <a href="#about" className="mt-8 inline-flex items-center gap-2 text-sm text-[#DEDBC8]">
        Learn more
        <ArrowRight className="h-4 w-4 -rotate-45" />
      </a>
    </MotionArticle>
  )
}

function FeaturesSection() {
  const videoRef = useRef(null)
  const isVideoInView = useInView(videoRef, { once: true, margin: '-100px' })

  return (
    <section id="features" className="relative min-h-screen overflow-hidden bg-black px-4 py-20 sm:px-6 md:py-28">
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 max-w-4xl text-center md:mx-auto md:mb-14">
          <h2 className="text-xl font-normal leading-tight sm:text-2xl md:text-3xl lg:text-4xl">
            <WordsPullUpMultiStyle
              segments={[
                { text: 'Open workflows for curious builders.', className: 'text-[#E1E0CC]' },
                { text: 'Built in public. Powered by AI Information.', className: 'text-gray-500' },
              ]}
            />
          </h2>
        </div>

        <div className="grid gap-3 sm:gap-2 md:grid-cols-2 md:gap-1 lg:min-h-[480px] lg:grid-cols-4">
          <MotionArticle
            ref={videoRef}
            className="relative min-h-[320px] overflow-hidden bg-[#212121] md:min-h-[360px]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isVideoInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={featureVideo}
              autoPlay
              loop
              muted
              playsInline
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <p className="absolute bottom-5 left-5 right-5 text-2xl leading-tight text-[#E1E0CC]">
              Your open intelligence canvas.
            </p>
          </MotionArticle>

          {featureCards.map((card, index) => (
            <FeatureInfoCard key={card.title} card={card} index={index + 1} />
          ))}
        </div>
      </div>
    </section>
  )
}

function LandingPage() {
  return (
    <main className="landing-root">
      <HeroSection />
      <AboutSection />
      <PortfolioSection />
      <FeaturesSection />
    </main>
  )
}

export default LandingPage
