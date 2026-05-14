interface SectionHeaderProps {
  label: string;
  title: string;
  description: string;
}

export default function SectionHeader({ label, title, description }: SectionHeaderProps) {
  return (
    <div className="text-center mb-16 md:mb-20">
      <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-cyan mb-4 bg-cyan/10 px-4 py-1.5 rounded-full border border-cyan/20">
        {label}
      </span>
      <h2 className="text-3xl md:text-5xl font-display font-bold leading-tight mb-4">
        {title}
      </h2>
      <p className="text-muted max-w-2xl mx-auto text-lg leading-relaxed">
        {description}
      </p>
    </div>
  );
}
