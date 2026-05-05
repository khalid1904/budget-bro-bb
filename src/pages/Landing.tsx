import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, Shield, Smartphone, Zap, Target, Download, Check, X, Mail, Repeat, Receipt, Copy, Activity, CalendarRange } from 'lucide-react';
import { Link } from 'react-router-dom';

const CONTACT_EMAIL = 'khalidahameds@gmail.com';

const features = [
  { icon: BarChart3, title: 'Smart Analytics', desc: 'Category breakdowns, trends, and savings ratios at a glance.' },
  { icon: Receipt, title: 'Expense Tracking', desc: 'Log actual spend and compare it against your monthly budget.' },
  { icon: Activity, title: 'Income vs Expense', desc: 'Switch your dashboard between planned budget and real spending.' },
  { icon: Copy, title: 'Import from Month', desc: 'Copy a previous month\u2019s budget in one click \u2014 all or pick & choose.' },
  { icon: Repeat, title: 'Recurring Entries', desc: 'Set it once. Salary, rent, SIPs auto-populate every month.' },
  { icon: Target, title: 'Savings Goals', desc: 'Set targets, link contributions, and watch progress grow.' },
  { icon: CalendarRange, title: 'Yearly Insights', desc: 'Calendar or financial year views with health score & metrics.' },
  { icon: Download, title: 'Excel Export', desc: 'Download your monthly data as a spreadsheet anytime.' },
  { icon: Smartphone, title: 'Installable PWA', desc: 'Use it on desktop, tablet, or mobile \u2014 even offline.' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your financial data stays yours. Encrypted and protected.' },
  { icon: Zap, title: 'Lightning Fast', desc: 'Add entries in seconds. No bloat, no friction.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/brand-hero.jpg" alt="Budget Bro" className="h-10 rounded-xl" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex"><a href="#contact">Contact</a></Button>
            <Button variant="ghost" asChild><Link to="/login">Login</Link></Button>
            <Button asChild><Link to="/register">Get Started</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 bg-secondary rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-secondary-foreground">Your bro for budgeting 🤙</span>
            </div>
            <img src="/brand-hero.jpg" alt="Budget Bro" className="w-36 h-36 rounded-2xl shadow-elevated mb-8 mx-auto" />
            <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground leading-tight mb-6">
              Take control of your{' '}
              <span className="text-gradient">money</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Track income, expenses, and savings month by month. Beautiful analytics, 
              instant insights, and zero complexity.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 py-6" asChild>
                <Link to="/register">
                  Start Free <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-base px-8 py-6" asChild>
                <Link to="/login">I have an account</Link>
              </Button>
            </div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 max-w-4xl mx-auto"
          >
            <div className="bg-card rounded-2xl shadow-elevated border border-border p-6 md:p-8">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Income', value: '₹8,450', color: 'text-success' },
                  { label: 'Expenses', value: '₹5,230', color: 'text-destructive' },
                  { label: 'In Hand', value: '₹3,220', color: 'text-primary' },
                ].map((item) => (
                  <div key={item.label} className="bg-muted rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                    <p className={`text-xl md:text-2xl font-display font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {[70, 45, 80, 55, 90, 60, 75, 85, 50, 65, 70, 40].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end h-32">
                    <div
                      className="bg-primary/20 rounded-t-md transition-all hover:bg-primary/40"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Everything you need
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Powerful features wrapped in a clean, intuitive interface.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl p-6 shadow-card border border-border hover:shadow-elevated transition-shadow duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Start free and upgrade when you're ready to unlock the full power of Budget Bro.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl p-8 shadow-card border border-border"
            >
              <h3 className="font-display font-bold text-xl text-foreground mb-1">Free</h3>
              <p className="text-muted-foreground text-sm mb-6">Everything you need to get started</p>
              <div className="text-4xl font-display font-bold text-foreground mb-8">
                ₹0<span className="text-base font-normal text-muted-foreground">/forever</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Dashboard Overview', 'Budget Management', 'Profile & Settings'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
                {['Yearly Insights', 'Recurring Transactions', 'Savings Goals', 'Advanced Analytics'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground/50">
                    <X className="w-4 h-4 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="lg" className="w-full" asChild>
                <Link to="/register">Start Free</Link>
              </Button>
            </motion.div>

            {/* Pro Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-8 shadow-elevated border-2 border-primary relative"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <h3 className="font-display font-bold text-xl text-foreground mb-1">Pro</h3>
              <p className="text-muted-foreground text-sm mb-6">Full access to all features</p>
              <div className="text-4xl font-display font-bold text-foreground mb-8">
                Pro<span className="text-base font-normal text-muted-foreground"> · Contact us</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Dashboard Overview',
                  'Budget Management',
                  'Profile & Settings',
                  'Yearly Insights',
                  'Recurring Transactions',
                  'Savings Goals',
                  'Advanced Analytics',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button size="lg" className="w-full" asChild>
                <Link to="/register">Get Started <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-hero-gradient rounded-2xl p-10 md:p-16 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              Ready to master your budget?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8">
              Join thousands who've simplified their finances with Budget Bro.
            </p>
            <Button variant="hero-outline" size="lg" className="text-base px-8 py-6" asChild>
              <Link to="/register">
                Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-6">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Get in touch
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Questions, feedback, or want to upgrade to Pro? Drop us a line — we read every email.
            </p>
            <Button size="lg" className="text-base px-8 py-6" asChild>
              <a href={`mailto:${CONTACT_EMAIL}?subject=Budget%20Bro%20Enquiry`}>
                <Mail className="mr-2 w-5 h-5" /> Email us
              </a>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              or write to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>© 2026 Budget Bro. Your money, your rules. 🤙</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Mail className="w-4 h-4" /> {CONTACT_EMAIL}
          </a>
        </div>
      </footer>
    </div>
  );
}
