import Link from "next/link";
import { ContactLinks } from "@/components/contact-links";
import { HeroMedia } from "@/components/hero-media";
import {
  ArrowUpRight,
  ArrowDown,
  ArrowRight,
  SectionHead,
  WorkCard,
} from "@/components/site";
import { settings, projects, products, contents } from "@/lib/content";
export default async function Home() {
  const [site, works, assets, services] = await Promise.all([
    settings(),
    projects(),
    products(),
    contents("services"),
  ]);
  const sections: Record<string, React.ReactNode> = {
    portfolio: (
      <section className="section" id="work">
        <SectionHead
          number="01"
          title="SELECTED WORK"
          link="/portfolio"
          label="VIEW PORTFOLIO"
        />
        <div className="work-grid">
          {works.slice(0, 3).map((w, i) => (
            <WorkCard key={w.id} work={w} index={i} />
          ))}
        </div>
        {!works.length && (
          <p className="empty-state">
            Karya terbaru sedang dipersiapkan. Stay tuned.
          </p>
        )}
      </section>
    ),
    about: (
      <section className="about-strip section">
        <div>
          <span className="eyebrow">02 / BEHIND THE PIXELS</span>
          <h2>
            IDEAS INTO
            <br />
            <span className="outline-text">DIMENSIONS.</span>
          </h2>
        </div>
        <div>
          <p className="intro-large">{site.about}</p>
          <Link href="/about" className="text-link">
            MORE ABOUT THE STUDIO <ArrowUpRight size={20} />
          </Link>
          <div className="skill-list">
            {site.skills.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
      </section>
    ),
    shop: (
      <section className="section shop-section">
        <SectionHead
          number="03"
          title="BUILT FOR YOUR NEXT"
          link="/shop"
          label="EXPLORE ASSETS"
        />
        <p className="section-intro">
          Aset digital untuk mempercepat langkah kreatif berikutnya.
        </p>
        <div className="work-grid">
          {assets.slice(0, 3).map((w, i) => (
            <WorkCard key={w.id} work={w} index={i} shop />
          ))}
        </div>
        {!assets.length && (
          <p className="empty-state">Koleksi aset akan hadir di sini.</p>
        )}
      </section>
    ),
    services: (
      <section className="section services-section">
        <div>
          <span className="eyebrow">04 / WHAT I DO</span>
          <h2>
            YOUR VISION.
            <br />
            MY NEXT
            <br />
            <span className="red">OBSESSION.</span>
          </h2>
          <p>
            Dirancang dengan tujuan.
            <br />
            Dibangun dengan perhatian pada detail.
          </p>
          <Link href="/services" className="text-link">
            EXPLORE SERVICES <ArrowUpRight size={20} />
          </Link>
        </div>
        <div className="service-list">
          {(services.length
            ? services
            : [
                {
                  title: "3D MODELING",
                  description:
                    "Karakter, props, dan hard-surface dengan detail yang tepat.",
                },
                {
                  title: "ENVIRONMENT ART",
                  description:
                    "Dunia imersif dengan atmosfer dan cerita di setiap sudut.",
                },
                {
                  title: "GAME ASSETS",
                  description:
                    "Aset yang dirancang untuk pengalaman interaktif.",
                },
                {
                  title: "PRODUCT VISUALIZATION",
                  description:
                    "Material, cahaya, dan komposisi untuk menonjolkan produk.",
                },
              ]
          ).map((s, i) => (
            <Link key={s.title} href="/commissions">
              <span className="red">0{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
              </div>
              <ArrowUpRight size={22} />
            </Link>
          ))}
        </div>
      </section>
    ),
    contact: (
      <section className="contact-banner">
        <div>
          <span className="eyebrow">HAVE SOMETHING IN MIND?</span>
          <h2>
            LET’S MAKE
            <br />
            IT <em>REAL.</em>
            <span>✦</span>
          </h2>
        </div>
        <div>
          <p>
            Ide besar dimulai dari obrolan kecil.
            <br />
            Ceritain project lo. Kita bangun bareng.
          </p>
          <Link href="/contact" className="button light">
            START A CONVERSATION <ArrowUpRight size={20} />
          </Link>
          <ContactLinks site={site} />
          <span className="availability">
            <i />
            {site.availability
              ? "OPEN FOR COLLABORATION"
              : "LET’S PLAN A FUTURE PROJECT"}
          </span>
        </div>
      </section>
    ),
  };
  return (
    <>
      <section className={"hero hero-" + site.heroMode}>
        <div className="hero-topline">
          <span>3D ARTIST / DIGITAL CREATOR</span>
          <span className="availability">
            <i />
            {site.availability
              ? "AVAILABLE FOR FREELANCE"
              : "IN THE STUDIO"}{" "}
            <span className="red">✦</span>
          </span>
        </div>
        <div className="hero-word" aria-hidden="true">
          PORTFOLIO
        </div>
        <HeroMedia
          mode={site.heroMode}
          image={site.heroImage}
          video={site.heroVideo}
          model={site.heroModel}
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="handwritten">Hello, I’m</span>
          <h1>
            {site.artist}
            <br />
            <span>
              STUDIO<span className="red">®</span>
            </span>
          </h1>
          <h2>{site.tagline}</h2>
          <p>{site.intro}</p>
          <Link href="/portfolio" className="button">
            EXPLORE MY WORK <ArrowUpRight size={19} />
          </Link>
          <Link href="/shop" className="hero-shop">
            Browse 3D assets <ArrowRight size={16} />
          </Link>
        </div>
        <div className="hero-aside">
          <span className="orb">✦</span>
          <p>
            Turning imagination
            <br />
            into a new dimension.
          </p>
          <div className="hero-discipline">
            <span>01</span>
            <p>
              3D MODELS
              <br />& CHARACTERS
            </p>
          </div>
          <div className="hero-discipline">
            <span>02</span>
            <p>
              ENVIRONMENTS
              <br />& GAME ASSETS
            </p>
          </div>
          <div className="hero-discipline">
            <span>03</span>
            <p>
              MOTION
              <br />& VISUAL STORIES
            </p>
          </div>
        </div>
        <div className="hero-bottom">
          <span>
            BASED IN INDONESIA <b>↗</b> AVAILABLE WORLDWIDE
          </span>
          <a href="#work">
            SCROLL TO EXPLORE <ArrowDown size={16} />
          </a>
          <span>SELECTED WORKS / 2026</span>
        </div>
      </section>
      <div className="ticker" aria-hidden="true">
        <span>3D ART</span>✦<span>GAME ASSETS</span>✦<span>ENVIRONMENTS</span>✦
        <span>DIGITAL EXPERIENCES</span>✦<span>3D ART</span>
      </div>
      {site.sections.map((key) => (
        <div key={key}>{sections[key]}</div>
      ))}
    </>
  );
}
