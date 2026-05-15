interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function LandingReveal({ children, className = "", style }: Props) {
  return (
    <div className={`lp-reveal ${className}`} style={style}>
      {children}
    </div>
  );
}
