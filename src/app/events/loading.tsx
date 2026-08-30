import { SiteHeader } from "../SiteHeader";
import styles from "./events.module.css";

export default function EventsLoading() {
  return (
    <>
      <SiteHeader />
      <main
        aria-busy="true"
        aria-label="Loading public events"
        className={styles.loadingMain}
      >
        <div className="shell">
          <div className={styles.loadingIntro} />
          <div className={styles.loadingGrid}>
            <div className={styles.loadingPanel} />
            <div className={styles.loadingList} />
          </div>
        </div>
      </main>
    </>
  );
}
