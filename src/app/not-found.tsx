import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "./ArrowIcon";
import { SiteHeader } from "./SiteHeader";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <Image
          alt="Firefighters working together during hands-on training"
          className={styles.image}
          fill
          priority
          sizes="100vw"
          src="/images/training-hero.jpg"
        />
        <div className={styles.overlay} />
        <div className={`shell ${styles.content}`}>
          <p>404 | Page not found</p>
          <h1>This page is off the board.</h1>
          <p className={styles.intro}>
            The page may have moved or the address may be incomplete. Head home
            or choose another way back to Brew City.
          </p>
          <nav aria-label="Page not found options" className={styles.actions}>
            <Link href="/">
              Home <ArrowIcon />
            </Link>
            <Link href="/events">Events</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/join">Join</Link>
          </nav>
        </div>
      </main>
    </>
  );
}
