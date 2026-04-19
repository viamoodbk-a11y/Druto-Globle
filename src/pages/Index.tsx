import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { InstallPrompt } from "@/components/InstallPrompt";
import drutoLogo from "@/assets/druto-logo-gift.png";
import stampPreview from "@/assets/druto-stamp-preview.png";
import analyticsPreview from "@/assets/druto-analytics-preview.png";
import explorePreview from "@/assets/druto-explore-preview.png";
import {
  ArrowRight,
  MapPin,
  Star,
  Trophy,
  Zap,
  Store,
  Check,
  QrCode,
  Users,
  BarChart3,
  Gift,
  Repeat,
  Shield,
  Phone,
  TrendingUp,
  Clock,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();

  // Use static stats for the landing page to avoid extra API calls
  const stats = {
    total_scans: 25000,
    active_cards: 1200,
    rewards_claimed: 850
  };

  useEffect(() => {
    // Fail-safe: If Supabase redirects to home instead of /auth/callback (URL configuration issue),
    // bounce the user to the callback handler to ensure role assignment works.
    if (window.location.hash.includes("access_token")) {
      navigate(`/auth/callback${window.location.search}`, { replace: true });
      return;
    }

    const authData = localStorage.getItem("druto_auth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem("druto_auth");
          return;
        }
        if (parsed.role === "restaurant_owner") {
          navigate("/owner", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch {
        // Invalid auth data, stay on home
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">

      {/* Hero Section - Business Owner Focused */}
      <section className="relative overflow-hidden bg-background pt-16 pb-0 md:pt-24">
        <div className="container relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                  <Store className="h-4 w-4" />
                  Digital loyalty for modern businesses
                </div>
              </div>
              <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground md:text-6xl lg:text-7xl">
                Turn every visit into a <br className="hidden md:block" />
                <span className="bg-gradient-to-r from-[#900A12] to-[#B01A22] bg-clip-text text-transparent">repeat customer</span>
              </h1>
              <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
                QR-based loyalty program for cafés, salons, gyms, restaurants & more. Set up in 2 minutes, no app download needed.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-4">
                <Button size="lg" className="h-14 px-8 text-lg font-bold shadow-xl shadow-primary/20 bg-[#900A12] hover:bg-[#700810]" asChild>
                  <Link to="/auth?type=owner">
                    Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold border-2 hover:bg-muted/50" asChild>
                  <Link to="/explore">I'm a customer</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground/80 font-medium">
                3-day free trial • No payment required • Cancel anytime
              </p>
            </motion.div>

            {/* Triple Phone Mockup - Seamless Integration */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative mt-12 md:mt-20 h-[380px] md:h-[600px] w-full max-w-5xl mx-auto flex items-center justify-center overflow-visible px-4"
            >
              {/* Background Glows */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-full w-full bg-radial-gradient from-primary/5 via-transparent to-transparent opacity-60 blur-3xl" />

              {/* Left Phone (Analytics) */}
              <div className="absolute left-0 md:left-[5%] z-10 transform -rotate-[12deg] translate-y-8 md:translate-y-12 scale-[0.8] md:scale-90 transition-all hover:scale-100 hover:z-30 duration-700">
                <div className="relative w-[150px] md:w-[280px] aspect-[9/19.5] rounded-[2.2rem] md:rounded-[3rem] p-1 md:p-1.5 bg-[#1a1a1a] shadow-2xl ring-1 ring-white/10">
                  <div className="w-full h-full rounded-[1.8rem] md:rounded-[2.5rem] overflow-hidden bg-black">
                    <img src={analyticsPreview} alt="Druto analytics" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Right Phone (Explore) */}
              <div className="absolute right-0 md:right-[5%] z-10 transform rotate-[12deg] translate-y-8 md:translate-y-12 scale-[0.8] md:scale-90 transition-all hover:scale-100 hover:z-30 duration-700">
                <div className="relative w-[150px] md:w-[280px] aspect-[9/19.5] rounded-[2.2rem] md:rounded-[3rem] p-1 md:p-1.5 bg-[#1a1a1a] shadow-2xl ring-1 ring-white/10">
                  <div className="w-full h-full rounded-[1.8rem] md:rounded-[2.5rem] overflow-hidden bg-black">
                    <img src={explorePreview} alt="Druto explore" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Center Phone (Stamp Card) */}
              <div className="relative z-20 transform scale-[0.95] md:scale-105 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] rounded-[2.5rem] md:rounded-[3.5rem] transition-all hover:scale-110 duration-700">
                <div className="relative w-[180px] md:w-[310px] aspect-[9/19.5] rounded-[2.2rem] md:rounded-[3.5rem] p-1.5 md:p-2 bg-[#0a0a0a] ring-1 ring-white/20">
                  {/* notch */}
                  <div className="absolute top-2.5 md:top-3.5 left-1/2 -translate-x-1/2 w-14 md:w-24 h-3.5 md:h-6 bg-black rounded-full z-30" />

                  <div className="w-full h-full rounded-[1.8rem] md:rounded-[3rem] overflow-hidden bg-white">
                    <img src={stampPreview} alt="Druto stamp card" className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* Floating Badges - Benefit Driven */}
                {/* 1. Success Badge (Repositioned for visibility) */}
                <div className="absolute -bottom-6 -right-12 md:-bottom-10 md:-right-32 bg-white/95 backdrop-blur-md rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-2xl border border-green-50 animate-bounce-slow flex items-center gap-3 md:gap-4 z-50 ring-1 ring-black/5">
                  <div className="h-9 w-9 md:h-12 md:w-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
                    <Check className="h-6 w-6 md:h-7 md:w-7 text-white" strokeWidth={3} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] md:text-xs font-bold text-green-600 uppercase tracking-widest leading-none mb-1">Success!</p>
                    <p className="text-xs md:text-base font-extrabold text-[#1a1a1a] leading-tight">+1 Stamp Added</p>
                  </div>
                </div>

                {/* 2. Repeat Customers Badge */}
                <div className="absolute top-[15%] -right-12 md:-right-24 bg-white/95 backdrop-blur-md rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-2xl border border-blue-50 animate-float-slow flex items-center gap-3 md:gap-4 z-40 ring-1 ring-black/5">
                  <div className="h-9 w-9 md:h-12 md:w-12 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-200">
                    <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" strokeWidth={3} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] md:text-xs font-bold text-blue-600 uppercase tracking-widest leading-none mb-1">Growth</p>
                    <p className="text-xs md:text-base font-extrabold text-[#1a1a1a] leading-tight">40% More Repeats</p>
                  </div>
                </div>

                {/* 3. Increase Profit Badge (Repositioned to side to avoid CTA overlap) */}
                <div className="absolute bottom-[20%] -left-12 md:-left-28 bg-white/95 backdrop-blur-md rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-2xl border border-yellow-50 animate-pulse-slow flex items-center gap-3 md:gap-4 z-40 ring-1 ring-black/5">
                  <div className="h-9 w-9 md:h-12 md:w-12 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-200">
                    <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-white" strokeWidth={3} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] md:text-xs font-bold text-yellow-600 uppercase tracking-widest leading-none mb-1">Profit</p>
                    <p className="text-xs md:text-base font-extrabold text-[#1a1a1a] leading-tight">Boost Revenue</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Soft bottom transition */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-40 pointer-events-none" />
      </section>


      {/* Why Druto - Redesigned */}
      <section className="container py-14">
        <div className="mb-10 text-center">
          <h2 className="mb-2 text-2xl font-bold text-foreground">Why businesses choose Druto</h2>
          <p className="text-muted-foreground">Everything you need to boost repeat customers</p>
        </div>

        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3 bg-border rounded-2xl overflow-hidden">
          {[
            {
              icon: QrCode,
              title: "One QR Code",
              desc: "Print one QR code. Customers scan, stamps collect automatically. No apps to download.",
              iconBg: "bg-primary/10",
              iconColor: "text-primary",
            },
            {
              icon: Repeat,
              title: "Repeat Visits",
              desc: "Customers come back to complete their stamp card. Average 40% repeat rate increase.",
              iconBg: "bg-green-500/10",
              iconColor: "text-green-600",
            },
            {
              icon: BarChart3,
              title: "Real-time Analytics",
              desc: "See daily scans, active customers, completed cards, and trends at a glance.",
              iconBg: "bg-blue-500/10",
              iconColor: "text-blue-600",
            },
            {
              icon: MapPin,
              title: "Multi-Branch GPS",
              desc: "One QR code for all branches. GPS auto-detects which location the customer is at.",
              iconBg: "bg-purple-500/10",
              iconColor: "text-purple-600",
            },
            {
              icon: Gift,
              title: "Custom Rewards",
              desc: "Set any reward — free product, discount, or complimentary service. You decide what works.",
              iconBg: "bg-amber-500/10",
              iconColor: "text-amber-600",
            },
            {
              icon: Shield,
              title: "FREE QR Stand",
              desc: "Every paid plan gets a free physical QR stand delivered to your store. Ready to use.",
              iconBg: "bg-red-500/10",
              iconColor: "text-red-600",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-card p-6 md:p-8"
            >
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${item.iconBg}`}>
                <item.icon className={`h-5 w-5 ${item.iconColor}`} />
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works - For Business Owners */}
      <section className="py-14 bg-muted/30">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="mb-2 text-2xl font-bold text-foreground">Set up in 3 steps</h2>
            <p className="text-muted-foreground">Go live with your loyalty program today</p>
          </div>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 max-w-3xl mx-auto">
            {[
              {
                step: "1",
                emoji: "📝",
                title: "Register Your Business",
                desc: "Sign up, add your business name, set your reward (e.g., 10 visits = free reward)",
                color: "bg-primary/10 text-primary",
              },
              {
                step: "2",
                emoji: "🖨️",
                title: "Display Your QR Code",
                desc: "Download & print your branded QR poster, or use the free QR stand we ship to you",
                color: "bg-accent/10 text-accent",
              },
              {
                step: "3",
                emoji: "📊",
                title: "Watch Customers Return",
                desc: "Track scans, see repeat rates, manage claimed rewards — all from your dashboard",
                color: "bg-green-500/10 text-green-600",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative overflow-hidden rounded-2xl bg-card p-5 sm:p-6 shadow-soft transition-all hover:shadow-card"
              >
                <div className={`mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl ${item.color} transition-transform group-hover:scale-110`}>
                  <span className="text-2xl sm:text-3xl">{item.emoji}</span>
                </div>
                <div className={`absolute right-3 sm:right-4 top-3 sm:top-4 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full ${item.color} text-xs sm:text-sm font-bold`}>
                  {item.step}
                </div>
                <h3 className="mb-2 text-base sm:text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="container py-14">
        <div className="rounded-2xl gradient-primary p-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-background/20 px-4 py-2 text-sm font-medium text-primary-foreground">
            <Trophy className="h-4 w-4" />
            Empowering modern businesses worldwide
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <p className="text-4xl font-bold text-primary-foreground">2,500+</p>
              <p className="text-primary-foreground/80">Active Businesses</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary-foreground">1M+</p>
              <p className="text-primary-foreground/80">Stamps Collected</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary-foreground">40%</p>
              <p className="text-primary-foreground/80">Avg. Repeat Rate Boost</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12">
        <div className="gradient-primary px-5 pb-16 pt-10 text-center rounded-t-3xl mx-4 md:mx-auto max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-2">
            Simple, transparent global pricing
          </h2>
          <p className="text-primary-foreground/80 text-sm">
            Start free. Scale as you grow anywhere in the world.
          </p>
        </div>
        <div className="px-4 -mt-8 pb-4">
          <div className="grid gap-4 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: 29,
                originalPrice: 39,
                locations: 1,
                popular: false,
                features: ["1 store location", "Unlimited QR scans", "Custom rewards", "Analytics dashboard", "Global loyalty infrastructure"],
              },
              {
                name: "Growth",
                price: 79,
                originalPrice: 99,
                locations: 3,
                popular: true,
                features: ["Up to 3 store locations", "Same QR, GPS branch detection", "Branch-wise scan analytics", "All Starter features", "Priority support"],
              },
              {
                name: "Pro",
                price: 199,
                originalPrice: 249,
                locations: 6,
                popular: false,
                features: ["Up to 6 store locations", "Same QR, GPS branch detection", "Branch-wise scan analytics", "All Growth features", "Dedicated account manager"],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative rounded-2xl bg-card border-2 p-6 shadow-card transition-all",
                  plan.popular
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="text-center mb-5">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-2 text-center">
                    {plan.originalPrice && (
                      <div className="text-muted-foreground line-through text-sm mb-1 leading-none">${plan.originalPrice}/yr</div>
                    )}
                    <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground text-sm">/yr</span>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {plan.locations} {plan.locations === 1 ? "location" : "locations"}
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link to="/auth?type=owner">
                  <Button
                    variant={plan.popular ? "hero" : "outline"}
                    className="w-full"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* Enterprise */}
          <div className="max-w-5xl mx-auto mt-6">
            <div className="rounded-2xl bg-muted/50 border border-border p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Store className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Enterprise</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                For global brands with unlimited locations. Custom pricing & dedicated support.
              </p>
              <div className="flex items-center justify-center gap-3">
                <a href="mailto:contact@druto.me">
                  <Button variant="outline" className="gap-2">
                    Contact Sales
                  </Button>
                </a>
                <a href="mailto:contact@druto.me">
                  <Button variant="ghost" className="text-primary">
                    Email Us
                  </Button>
                </a>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            🎉 All plans come with a 3-day free trial. No payment required to start.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container py-12">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
          <p className="text-muted-foreground">Everything you need to know about Druto</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          {[
            {
              q: "What is Druto?",
              a: "Druto is a digital loyalty platform that helps businesses retain customers with QR-based stamp cards. Customers scan your QR code on each visit and earn rewards — no app download needed."
            },
            {
              q: "How does it work for my business?",
              a: "Sign up, add your business name, set your reward (e.g., 10 visits = free reward), and display your QR code. Customers scan it on each visit to collect stamps. You track everything from your dashboard."
            },
            {
              q: "What plans are available?",
              a: "We offer three plans: Starter ($29/yr), Growth ($79/yr), and Pro ($199/yr). All plans include a 3-day free trial with no payment required. Enterprise plans with unlimited locations are also available."
            },
            {
              q: "Can I use one QR code for multiple branches?",
              a: "Yes! With the Growth and Pro plans, you use a single QR code for all your branches. Druto automatically detects which branch a customer is at using GPS location."
            },
            {
              q: "How do customers earn stamps?",
              a: "Customers simply scan your QR code. The app is 100% web-based, so they don't need to download anything. They just sign in with Google or Email once and start collecting."
            },
            {
              q: "Is Druto really global?",
              a: "Yes! Druto is built for businesses anywhere in the world. We support global payments via Stripe and worldwide geolocation mapping."
            },
          ].map((faq, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-5">
              <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container pb-14">
        <div className="rounded-2xl bg-card border-2 border-primary/20 p-8 text-center shadow-card">
          <h2 className="text-2xl font-bold text-foreground mb-2">Ready to grow your global business?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of businesses using Druto to increase repeat customers worldwide.
          </p>
          <Link to="/auth?type=owner">
            <Button variant="hero" size="xl">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <img src={drutoLogo} alt="Druto" className="h-8 w-auto" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link to="/legal?section=terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms & Conditions
              </Link>
              <Link to="/legal?section=privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/legal?section=refund" className="text-muted-foreground hover:text-foreground transition-colors">
                Refund Policy
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Druto Worldwide. Built for the world.
            </p>
          </div>
        </div>
      </footer>

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
};

export default Index;
