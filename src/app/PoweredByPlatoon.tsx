import Image from "next/image";
import { siteConfig } from "@/config/site";
import styles from "./PoweredByPlatoon.module.css";

export function PoweredByPlatoon() {
  return (
    <a
      aria-label="Powered by Platoon"
      className={styles.poweredBy}
      href={siteConfig.links.platoon}
      rel="noreferrer"
      target="_blank"
    >
      <Image alt="" height={24} src="/images/platoon-logo.png" width={24} />
      <span>
        Powered by <strong>Platoon</strong>
      </span>
    </a>
  );
}
