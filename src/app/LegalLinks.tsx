import Link from "next/link";
import { siteConfig } from "@/config/site";
import styles from "./LegalLinks.module.css";

export function LegalLinks() {
  return (
    <nav aria-label="Legal" className={styles.links}>
      <Link href={siteConfig.links.privacy}>Privacy</Link>
      <Link href={siteConfig.links.terms}>Terms</Link>
    </nav>
  );
}
