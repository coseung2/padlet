/**
 * Aura-board brand logo lockup — handoff Shell.jsx Logo (T2-2).
 * Wraps the app-icon PNG with optional wordmark. Size-driven so the same
 * component serves login (56), TopNav (32), and footer (24) later.
 */
type LogoProps = {
  size?: number;
  withWordmark?: boolean;
};

export function Logo({ size = 32, withWordmark = false }: LogoProps) {
  return (
    <span className="ab-logo-lockup">
      <img
        className="ab-logo-img"
        src="/aura-app-icon-512.png"
        alt="Aura-board"
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
      />
      {withWordmark && <span className="ab-logo-wordmark">Aura-board</span>}
    </span>
  );
}
