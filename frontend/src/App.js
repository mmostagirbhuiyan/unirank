import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  ArrowUpRight,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Layers,
  Palette,
  Code2,
  Globe,
  Github,
  Mail,
  ArrowRight,
  Briefcase,
  Award,
  Stars
} from 'lucide-react';

// --- Theme Context ---
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  // 'system', 'light', 'dark'
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => useContext(ThemeContext);

// --- Components ---
const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex p-1 bg-muted rounded-full border border-border">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        title="Light Mode"
      >
        <Sun size={16} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-full transition-all ${theme === 'system' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        title="System Mode"
      >
        <Monitor size={16} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        title="Dark Mode"
      >
        <Moon size={16} />
      </button>
    </div>
  );
};

const Pill = ({ children }) => (
  <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
    {children}
  </span>
);

const SectionTitle = ({ eyebrow, title, subtitle }) => (
  <div className="max-w-2xl">
    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
      <Sparkles size={16} />
      <span className="uppercase tracking-[0.2em]">{eyebrow}</span>
    </div>
    <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
      {title}
    </h2>
    {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
  </div>
);

const ProjectCard = ({ title, description, tags, metric }) => (
  <div className="group bg-card text-card-foreground border border-border rounded-2xl p-6 transition-all hover:border-primary/40 hover:-translate-y-1 shadow-sm">
    <div className="flex items-center justify-between">
      <h3 className="text-xl font-semibold">{title}</h3>
      <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </div>
    <p className="mt-3 text-muted-foreground leading-relaxed">{description}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map(tag => (
        <span key={tag} className="text-xs font-medium bg-muted/70 text-muted-foreground px-2.5 py-1 rounded-full">
          {tag}
        </span>
      ))}
    </div>
    <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
      <Stars size={14} />
      {metric}
    </div>
  </div>
);

const ExperienceCard = ({ role, company, time, summary }) => (
  <div className="border border-border rounded-2xl p-5 bg-card">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground uppercase tracking-[0.2em]">{time}</p>
        <h3 className="text-lg font-semibold mt-2">{role}</h3>
        <p className="text-sm text-muted-foreground">{company}</p>
      </div>
      <Briefcase className="w-5 h-5 text-primary" />
    </div>
    <p className="mt-4 text-muted-foreground leading-relaxed">{summary}</p>
  </div>
);

const TestimonialCard = ({ quote, name, title }) => (
  <div className="bg-card border border-border rounded-2xl p-6">
    <p className="text-lg leading-relaxed">“{quote}”</p>
    <div className="mt-6">
      <p className="font-semibold">{name}</p>
      <p className="text-sm text-muted-foreground">{title}</p>
    </div>
  </div>
);

const MainApp = () => {
  const projects = [
    {
      title: 'Lumen Commerce Platform',
      description: 'Reimagined a retail experience with cinematic product narratives, reactive micro-interactions, and a seamless checkout journey.',
      tags: ['Design System', 'Front-End', 'Strategy'],
      metric: '68% conversion lift post-launch'
    },
    {
      title: 'Orbit Analytics Studio',
      description: 'Crafted an immersive data story interface that lets teams explore insights through elegant layers and modular dashboards.',
      tags: ['Data Visualization', 'UX Research', 'Motion'],
      metric: '12+ hours saved weekly per analyst'
    },
    {
      title: 'Signal Creative Portfolio',
      description: 'Built a signature portfolio experience with editorial typography, adaptive theming, and polished interaction states.',
      tags: ['Brand', 'Webflow-to-React', 'Content'],
      metric: 'Featured in 3 design galleries'
    }
  ];

  const experience = [
    {
      role: 'Lead Product Designer',
      company: 'Studio Sora',
      time: '2022 — Present',
      summary: 'Directing multi-disciplinary product launches, partnering with founders, and crafting premium digital experiences across web, mobile, and spatial.'
    },
    {
      role: 'Design Engineer',
      company: 'Lightpath Labs',
      time: '2020 — 2022',
      summary: 'Built component systems, prototyped AI workflows, and collaborated with engineering to ship a cohesive design language.'
    }
  ];

  const testimonials = [
    {
      quote: 'A rare mix of visual precision and product thinking. Every screen feels intentional and alive.',
      name: 'Avery Hart',
      title: 'Creative Director, Flux'
    },
    {
      quote: 'From strategy to delivery, the work elevates every brand moment. True partner energy.',
      name: 'Noah Lin',
      title: 'Founder, Apex Collective'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="noise-bg"></div>

      <header className="relative z-50 border-b border-border bg-background/90 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="text-white w-4 h-4" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-[0.2em]">Portfolio</p>
              <p className="text-lg font-bold tracking-tight">Visionary Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Available for select collaborations
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="container mx-auto px-6 pt-16 pb-20">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                <Pill>Design Engineer</Pill>
                <Pill>Creative Direction</Pill>
                <Pill>Interactive Web</Pill>
              </div>
              <h1 className="mt-8 text-4xl md:text-6xl font-black tracking-tight leading-tight">
                Building luminous digital experiences
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500"> that feel alive</span>.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl">
                I design and engineer premium portfolios, products, and brand moments for teams who want their work to feel unforgettable.
                Every pixel is intentional, every interaction adds a layer of story.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 flex items-center gap-2">
                  View signature work <ArrowRight size={16} />
                </button>
                <button className="px-6 py-3 rounded-full border border-border text-foreground font-semibold hover:border-primary/50 transition-colors">
                  Download résumé
                </button>
              </div>
              <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  hello@visionary.studio
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={16} />
                  Based in Los Angeles, CA
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-12 -right-8 w-32 h-32 rounded-full bg-primary/20 blur-3xl"></div>
              <div className="absolute -bottom-16 left-6 w-40 h-40 rounded-full bg-violet-500/20 blur-3xl"></div>
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-[0.2em]">Currently</p>
                    <h3 className="text-2xl font-semibold mt-2">Designing the future of creative tooling</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                    <Layers size={20} className="text-primary" />
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {[
                    { label: 'Projects shipped', value: '38+' },
                    { label: 'Years in craft', value: '8' },
                    { label: 'Global collaborations', value: '14' }
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-lg font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl bg-muted/60 p-4">
                  <p className="text-sm text-muted-foreground">
                    Crafting immersive brand ecosystems, blending strategy, narrative, and engineering to deliver impactful launches.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 pb-20">
          <div className="grid gap-10">
            <SectionTitle
              eyebrow="Signature Work"
              title="Flagship projects that elevate product stories"
              subtitle="From concept to polish, each engagement is shaped to amplify clarity, craft, and momentum."
            />
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map(project => (
                <ProjectCard key={project.title} {...project} />
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 pb-20">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
            <div className="space-y-6">
              <SectionTitle
                eyebrow="Capabilities"
                title="A studio-grade toolkit for end-to-end delivery"
                subtitle="I partner with founders and teams to ship cohesive, premium experiences across digital touchpoints."
              />
              <div className="grid gap-4">
                {[
                  { icon: Palette, title: 'Brand & Visual Systems', desc: 'Identity, typography, color, and design systems that scale across products.' },
                  { icon: Code2, title: 'Front-End Engineering', desc: 'Modern React builds, WebGL touches, and performance-minded architecture.' },
                  { icon: Award, title: 'Launch & Growth', desc: 'Go-to-market storytelling, editorial content, and product marketing assets.' }
                ].map(item => (
                  <div key={item.title} className="flex gap-4 p-5 rounded-2xl border border-border bg-card">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <item.icon size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mt-2">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6">
              <div className="bg-gradient-to-br from-primary/10 to-violet-500/10 border border-primary/20 rounded-3xl p-6">
                <h3 className="text-2xl font-semibold">Design impact metrics</h3>
                <p className="mt-3 text-muted-foreground">Evidence-driven outcomes with a focus on polish, clarity, and conversion.</p>
                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Avg. conversion lift', value: '54%' },
                    { label: 'Product launches', value: '21' },
                    { label: 'Awards & features', value: '9' },
                    { label: 'Repeat partnerships', value: '78%' }
                  ].map(item => (
                    <div key={item.label} className="bg-background/70 border border-border rounded-2xl p-4">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="text-2xl font-semibold mt-2">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                {experience.map(entry => (
                  <ExperienceCard key={entry.role} {...entry} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 pb-20">
          <div className="grid gap-10">
            <SectionTitle
              eyebrow="Praise"
              title="Partners and teams who trusted the process"
              subtitle="Collaborations rooted in clarity, momentum, and craft-first delivery."
            />
            <div className="grid md:grid-cols-2 gap-6">
              {testimonials.map(item => (
                <TestimonialCard key={item.name} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 pb-24">
          <div className="bg-card border border-border rounded-3xl p-10 md:p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-violet-500/10"></div>
            <div className="relative">
              <SectionTitle
                eyebrow="Let’s build"
                title="Ready to craft the next iconic experience?"
                subtitle="Tell me about your vision, timeline, and where the story begins. I’ll bring the craft, strategy, and momentum."
              />
              <div className="mt-8 flex flex-wrap gap-4">
                <button className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 flex items-center gap-2">
                  Start a project <ArrowRight size={16} />
                </button>
                <button className="px-6 py-3 rounded-full border border-border text-foreground font-semibold hover:border-primary/50 transition-colors flex items-center gap-2">
                  <Github size={16} /> See the build log
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Visionary Studio</p>
            <p className="text-sm text-muted-foreground">Crafting digital experiences with soul.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Mail size={16} /> hello@visionary.studio</span>
            <span className="flex items-center gap-2"><Globe size={16} /> visionary.studio</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

export default App;
