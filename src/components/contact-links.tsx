import type { defaultSettings } from "@/lib/demo";

export function ContactLinks({ site }: { site: typeof defaultSettings }) {
  if (!site.email && !site.socials.length && !site.whatsapp) return null;
  return (
    <div className="contact-links" aria-label="Kontak studio">
      {site.email && <a href={`mailto:${site.email}`}><span>EMAIL<small>{site.email}</small></span><span aria-hidden="true">↗</span></a>}
      {site.socials.map((social) => <a key={social.label} href={social.url} target="_blank" rel="noreferrer"><span>{social.label.toUpperCase()}<small>Let’s connect</small></span><span aria-hidden="true">↗</span></a>)}
      {site.whatsapp && <a href={`https://wa.me/${site.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><span>WHATSAPP<small>Start a conversation</small></span><span aria-hidden="true">↗</span></a>}
    </div>
  );
}
