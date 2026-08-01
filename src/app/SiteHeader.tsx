import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { ArrowIcon } from "./ArrowIcon";

export function SiteHeader() {
  return (
    <>
      <div className="utility-bar">
        <div className="shell utility-bar__inner">
          <div className="utility-bar__chapter">
            <span className="utility-bar__region">{siteConfig.region}</span>
            <span className="utility-bar__divider" aria-hidden="true">
              {"\u2022"}
            </span>
            <span>Established {siteConfig.established}</span>
          </div>
          <a
            className="utility-bar__member-link"
            href={siteConfig.links.memberDashboard}
            rel="noreferrer"
            target="_blank"
          >
            Member Login <ArrowIcon />
          </a>
        </div>
      </div>

      <header className="site-header">
        <div className="shell site-header__inner">
          <Link className="brand" href="/" aria-label="Brew City FOOLS home">
            <Image
              className="brand__mark"
              src="/images/brew-city-fools-logo.png"
              alt=""
              width={72}
              height={70}
              priority
            />
            <span className="brand__copy">
              <strong>{siteConfig.shortName}</strong>
              <small>{siteConfig.motto}</small>
            </span>
          </Link>

          <nav className="desktop-nav" aria-label="Primary navigation">
            {siteConfig.navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            className="button button--header"
            href={siteConfig.links.applicationRoute}
          >
            Join the chapter <ArrowIcon />
          </Link>

          <details className="mobile-nav">
            <summary>Menu</summary>
            <nav aria-label="Mobile navigation">
              {siteConfig.navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
              <Link
                className="mobile-nav__cta"
                href={siteConfig.links.applicationRoute}
              >
                Membership application <ArrowIcon />
              </Link>
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}
