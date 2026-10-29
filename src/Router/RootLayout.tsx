import { Suspense, useLayoutEffect } from "react";
import {
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigation,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageLoading } from "./RouteFeedback";

export default function RootLayout() {
  const location = useLocation();
  const navigation = useNavigation();
  const { t } = useTranslation("routing");
  // Query-only filtering/paging must preserve focus in the control being edited.
  useLayoutEffect(() => {
    // A lazy page can arrive after the URL commits. Wait for its heading before moving focus.
    const focusHeading = () => {
      const heading = document.querySelector<HTMLElement>("[data-route-focus]");
      if (!heading) return false;
      heading.focus({ preventScroll: true });
      return true;
    };
    if (focusHeading()) return;
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [location.pathname]);
  return (
    <>
      <a
        href="#route-content"
        className="fixed start-4 top-4 z-50 -translate-y-40 rounded-ui bg-accent p-4 text-primary focus:translate-y-0"
      >
        {t("skip")}
      </a>
      {navigation.state !== "idle" && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-50 bg-accent p-2 text-center text-primary"
        >
          {t("navigationPending")}
        </div>
      )}
      <Suspense fallback={<PageLoading full />}>
        <Outlet />
      </Suspense>
      <ScrollRestoration />
    </>
  );
}
