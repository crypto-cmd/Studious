import SectionHeader from "@/components/SectionHeader";
import FeatureCard from "@/components/FeatureCard";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <BackgroundEffects />
      <Header />
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <CTASection />
      <Footer />
    </main>
  );
}

function BackgroundEffects() {
  return (
    <>
      <div className="fixed inset-0 grid-background pointer-events-none" />
      <div className="fixed top-[-20vh] left-[-10vw] w-[50vw] h-[50vw] rounded-full bg-cyan/5 blur-[120px] animate-pulse-glow pointer-events-none" />
      <div className="fixed top-[40vh] right-[-15vw] w-[45vw] h-[45vw] rounded-full bg-violet/5 blur-[120px] animate-pulse-glow pointer-events-none" style={{ animationDelay: "2s" }} />
      <div className="fixed bottom-[-20vh] left-[20vw] w-[40vw] h-[40vw] rounded-full bg-rose/5 blur-[120px] animate-pulse-glow pointer-events-none" style={{ animationDelay: "4s" }} />
      <Orbs />
    </>
  );
}

function Orbs() {
  return (
    <>
      <div className="fixed top-[15%] left-[8%] w-3 h-3 rounded-full bg-cyan/40 blur-sm animate-float pointer-events-none" />
      <div className="fixed top-[25%] right-[12%] w-2 h-2 rounded-full bg-violet/40 blur-sm animate-float pointer-events-none" style={{ animationDelay: "2s", animationDuration: "10s" }} />
      <div className="fixed top-[60%] left-[5%] w-4 h-4 rounded-full bg-rose/30 blur-sm animate-float pointer-events-none" style={{ animationDelay: "4s", animationDuration: "7s" }} />
      <div className="fixed bottom-[30%] right-[8%] w-2.5 h-2.5 rounded-full bg-cyan/30 blur-sm animate-float pointer-events-none" style={{ animationDelay: "1s", animationDuration: "9s" }} />
      <div className="fixed top-[45%] left-[50%] w-1.5 h-1.5 rounded-full bg-emerald/30 blur-sm animate-float pointer-events-none" style={{ animationDelay: "3s", animationDuration: "11s" }} />
    </>
  );
}

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-cyan/5">
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="font-display text-xl font-bold tracking-tight">
          <span className="gradient-text">Studious</span>
        </a>
        <div className="hidden sm:flex items-center gap-8 text-sm text-muted">
          <a href="#features" className="hover:text-cyan transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-cyan transition-colors">How It Works</a>
          <a href="#stats" className="hover:text-cyan transition-colors">Tech</a>
        </div>
        <a
          href="https://github.com/crypto-cmd/Studious"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium px-4 py-2 rounded-full border border-cyan/20 text-cyan hover:bg-cyan/10 transition-all"
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 pt-20 pb-16 overflow-hidden">
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <div className="animate-slide-up">
          <span className="inline-block text-xs font-semibold tracking-[0.25em] uppercase text-cyan mb-6 bg-cyan/10 px-5 py-2 rounded-full border border-cyan/20">
            AI-Powered Study Intelligence
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold leading-[1.05] tracking-tight mb-6 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          Turn Your Academic
          <br />
          <span className="gradient-text">Chaos into Clarity</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed mb-10 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          Studious helps you predict your grades, plan your study time, and stay
          on top of every assignment — all powered by AI in one simple app.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.45s" }}>
          <a
            href="#features"
            className="shimmer-button px-8 py-3.5 rounded-full text-sm font-semibold bg-gradient-to-r from-cyan to-violet text-white glow-cyan hover:scale-105 transition-all duration-300"
          >
            Explore Features
          </a>
          <a
            href="https://github.com/crypto-cmd/Studious"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 rounded-full text-sm font-semibold border border-cyan/20 text-foreground hover:bg-cyan/5 transition-all glass-hover"
          >
            View on GitHub
          </a>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
          <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
        </svg>
      </div>
    </section>
  );
}

function ProblemSection() {
  const problems = [
    {
      icon: "🧠",
      problem: "Overwhelmed by assignments?",
      solution: "AI breaks them into smaller, manageable steps so you know exactly what to do next.",
      gradient: "from-cyan/20 to-transparent",
    },
    {
      icon: "📊",
      problem: "Worried about your grades?",
      solution: "A TensorFlow neural network predicts your final grade from lifestyle data with 84% accuracy.",
      gradient: "from-violet/20 to-transparent",
    },
    {
      icon: "⏰",
      problem: "Wasting study time?",
      solution: "KDE identifies your peak focus windows, then schedules tasks into Google Calendar automatically.",
      gradient: "from-rose/20 to-transparent",
    },
  ];

  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          label="The Problem"
          title="Three Challenges Every Student Faces"
          description="Studious was built to solve the core pain points that make studying harder than it needs to be."
        />

        <div className="grid md:grid-cols-3 gap-6 animate-stagger max-w-5xl mx-auto">
          {problems.map((item) => (
            <div
              key={item.problem}
              className="glass rounded-2xl p-8 transition-all duration-500 hover:scale-[1.02] glass-hover relative overflow-hidden group"
            >
              <div className={`absolute inset-0 bg-gradient-to-b ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-display font-semibold mb-3 text-foreground">{item.problem}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: "🧠",
    title: "AI Task Decomposition",
    description:
      "Paste any assignment and AI instantly breaks it into smaller, manageable tasks sorted by priority. Upload your course PDFs and the AI uses them for smart, context-aware help.",
    badges: ["Groq", "Llama 3.3", "Pinecone RAG"],
  },
  {
    icon: "📈",
    title: "Grade Prediction",
    description:
      "AI trained on real student data predicts your grades based on attendance, sleep, exercise, study habits, and more — with 84% accuracy.",
    badges: ["TensorFlow", "R² = 0.844", "MAE ±5.08"],
  },
  {
    icon: "📅",
    title: "Smart Scheduling",
    description:
      "Studious learns when you're most productive by analyzing your study patterns. It automatically schedules tasks into your Google Calendar at those peak times.",
    badges: ["KDE", "Google Calendar API", "Greedy Algo"],
  },
  {
    icon: "⏱️",
    title: "Focus Timer",
    description:
      "A built-in timer tracks your study sessions with focus ratings. Over time, it learns your most productive hours so you can plan better.",
    badges: ["KDE Analytics", "Circular Stats"],
  },
  {
    icon: "🎯",
    title: "Analytics & Trajectory",
    description:
      "See your grade trends over time with visual charts. Smart alerts show your predicted final grade, how you're tracking, and countdowns to exams.",
    badges: ["Chart.js", "Regression", "Smart Nudges"],
  },
  {
    icon: "🧬",
    title: "Improvement Engine",
    description:
      "An optimization engine analyzes your habits — sleep, exercise, attendance, study time — and suggests the most impactful changes to boost your grades.",
    badges: ["Genetic Algorithm", "Optimization"],
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="relative px-6 py-24 md:py-32">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          label="Features"
          title="Six AI-Powered Tools"
          description="Every feature is built on serious ML and AI — not just buzzwords. Here's what Studious actually does."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-stagger">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Connect Your Account",
      description: "Sign in with your Google account. Studious connects to your calendar and saves everything securely.",
      icon: "🔗",
    },
    {
      number: "02",
      title: "Add Courses & Materials",
      description: "Enter your courses and upload your class materials. The AI indexes everything so it can help you break down assignments.",
      icon: "📚",
    },
    {
      number: "03",
      title: "AI Decomposes Assignments",
      description: "Paste any assignment description. AI instantly breaks it into smaller tasks and puts them in order of priority.",
      icon: "⚡",
    },
    {
      number: "04",
      title: "Study, Track & Improve",
      description: "Use the focus timer, track your grades, see your predicted final scores, and get personalized habit suggestions to improve.",
      icon: "🚀",
    },
  ];

  return (
    <section id="how-it-works" className="relative px-6 py-24 md:py-32">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          label="How It Works"
          title="From Sign-Up to Study Superpowers"
          description="Getting started takes minutes. The AI handles the heavy lifting."
        />

        <div className="relative max-w-4xl mx-auto">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-cyan via-violet to-rose hidden md:block" />

          <div className="space-y-12 md:space-y-16">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="relative flex flex-col md:flex-row gap-6 md:gap-10 animate-slide-up"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-full glass shrink-0 border border-cyan/20 relative z-10 glow-cyan">
                  <span className="text-sm font-mono font-bold gradient-text">{step.number}</span>
                </div>

                <div className="flex md:hidden items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full glass border border-cyan/20 shrink-0">
                    <span className="text-xs font-mono font-bold gradient-text">{step.number}</span>
                  </div>
                  <div className="w-full h-px bg-gradient-to-r from-cyan/30 to-transparent" />
                </div>

                <div className="glass rounded-2xl p-6 md:p-8 flex-1 glass-hover">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl hidden md:block">{step.icon}</span>
                    <div>
                      <h3 className="text-lg font-display font-semibold mb-2 text-foreground">{step.title}</h3>
                      <p className="text-muted text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    {
      value: "0.844",
      label: "R² Score",
      description: "Grade prediction accuracy — explains 84% of grade variance",
      gradient: "from-cyan to-emerald",
    },
    {
      value: "±5.08",
      label: "MAE",
      description: "Mean absolute error — average prediction is within 5 points",
      gradient: "from-violet to-cyan",
    },
    {
      value: "600+",
      label: "Students Trained On",
      description: "TensorFlow model trained on real student lifestyle and performance data",
      gradient: "from-rose to-violet",
    },
    {
      value: "50",
      label: "GA Generations",
      description: "Finds the best habit changes to help boost your grades",
      gradient: "from-amber to-rose",
    },
  ];

  const techs = [
    { name: "TensorFlow", role: "Grade Prediction" },
    { name: "Groq", role: "LLM Inference" },
    { name: "Pinecone", role: "Vector RAG" },
    { name: "Supabase", role: "Database & Auth" },
    { name: "Flask", role: "Backend API" },
    { name: "Next.js", role: "Frontend" },
    { name: "Google API", role: "Calendar Sync" },
    { name: "KDE", role: "Focus Analytics" },
  ];

  return (
    <section id="stats" className="relative px-6 py-24 md:py-32">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          label="The Tech Behind It"
          title="Built with Serious ML & AI"
          description="No hype. Every number is measured. Every model is trained. Every algorithm is optimized."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20 animate-stagger">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-2xl p-8 text-center glass-hover"
            >
              <span className={`text-4xl md:text-5xl font-display font-bold bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}>
                {stat.value}
              </span>
              <div className="text-sm font-semibold text-foreground mt-3 mb-2">{stat.label}</div>
              <div className="text-xs text-muted leading-relaxed">{stat.description}</div>
            </div>
          ))}
        </div>

        <div className="glass rounded-3xl p-8 md:p-12">
          <h3 className="text-xl font-display font-semibold text-center mb-8">Full Technology Stack</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {techs.map((tech) => (
              <div key={tech.name} className="text-center p-4 rounded-xl bg-cyan/3 border border-cyan/8 hover:bg-cyan/8 transition-colors">
                <div className="text-sm font-semibold text-foreground">{tech.name}</div>
                <div className="text-[11px] text-muted mt-1">{tech.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-4xl mx-auto text-center relative">
        <div className="glass rounded-3xl p-10 md:p-16 glow-cyan relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-violet/5" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-display font-bold leading-tight mb-4">
              Ready to Transform Your{" "}
              <span className="gradient-text">Study Life?</span>
            </h2>
            <p className="text-muted text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              Join Studious and take control of your academic journey with AI-powered
              planning, prediction, and optimization.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://github.com/crypto-cmd/Studious"
                target="_blank"
                rel="noopener noreferrer"
                className="shimmer-button px-10 py-4 rounded-full text-sm font-semibold bg-gradient-to-r from-cyan to-violet text-white glow-cyan hover:scale-105 transition-all duration-300"
              >
                Get Started on GitHub
              </a>
              <a
                href="#features"
                className="px-10 py-4 rounded-full text-sm font-semibold border border-cyan/20 text-foreground hover:bg-cyan/5 transition-all"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative px-6 py-10 border-t border-cyan/5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <a href="#" className="font-display text-lg font-bold tracking-tight">
          <span className="gradient-text">Studious</span>
        </a>
        <p className="text-xs text-muted">
          Built with TensorFlow, Groq, Pinecone, Supabase, and Next.js
        </p>
        <p className="text-xs text-muted">
          &copy; {new Date().getFullYear()} Studious
        </p>
      </div>
    </footer>
  );
}
