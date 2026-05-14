interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  badges: string[];
  index: number;
}

export default function FeatureCard({ icon, title, description, badges, index }: FeatureCardProps) {
  return (
    <div
      className="glass rounded-2xl p-6 md:p-8 transition-all duration-500 hover:scale-[1.02] glass-hover group"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="text-3xl mb-5">{icon}</div>
      <h3 className="text-xl font-display font-semibold mb-3 text-foreground">{title}</h3>
      <p className="text-muted text-sm leading-relaxed mb-5">{description}</p>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge}
            className="text-[10px] font-mono font-medium tracking-wider uppercase px-2.5 py-1 rounded-md bg-cyan/8 border border-cyan/15 text-cyan/80"
          >
            {badge}
          </span>
        ))}
      </div>
    </div>
  );
}
