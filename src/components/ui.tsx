import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/home" className={`font-serif text-2xl tracking-tight ${className}`}>
      Papis
    </Link>
  );
}

const buttonStyles = {
  primary: "bg-ink text-paper hover:bg-[#2a241e]",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
  danger: "bg-terra text-white hover:bg-[#a84520]",
  soft: "border border-line bg-white text-ink hover:border-ink/30",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ background: color, width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export const fieldClass =
  "w-full rounded-2xl border border-line bg-white px-4 py-3 text-ink outline-none ring-terra/30 placeholder:text-muted/70 focus:ring-2";

export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium">{label}</span>
      <input className={fieldClass} {...props} />
    </label>
  );
}

export function TextArea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block text-sm">
      {label ? <span className="mb-1.5 block font-medium">{label}</span> : null}
      <textarea className={`${fieldClass} min-h-24 resize-y`} {...props} />
    </label>
  );
}

export function LinkText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("http://") || part.startsWith("https://") ? (
          <a key={index} href={part} target="_blank" rel="noreferrer noopener" className="text-pine underline decoration-pine/30">
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

export function Icon({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <span className="grid h-5 w-5 place-items-center" aria-hidden={label ? undefined : true} aria-label={label}>
      {children}
    </span>
  );
}
