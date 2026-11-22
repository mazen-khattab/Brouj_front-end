import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, matchPath } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandWordmark } from "./BrandWordmark";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavigationLinks, SessionControls } from "./Navigation";
import { useAuth } from "../Hooks/useAuth";
import { useToast } from "../Hooks/useToast";
import { UserRole } from "../Types/contracts";
import { routePaths } from "../Router/routePaths";
import "../Styles/header.css";

const items = [
  { path: routePaths.home, title: "home" },
  { path: routePaths.about, title: "aboutUs" },
  { path: routePaths.projects, title: "projects" },
  { path: routePaths.terms, title: "termsNav" },
];

function AccountActions() {
  const { t } = useTranslation("routing");
  const auth = useAuth();
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  // Tab follows the disclosure's native links/buttons; Escape returns to the account icon.
  return (
    <div
      ref={container}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={t("accountActions")}
        aria-expanded={open}
        aria-controls={panelId}
        className="account-trigger-btn grid size-10 place-items-center rounded-full border border-accent/60 text-accent-light transition-colors hover:bg-accent/15 focus-visible:outline-accent-light"
        onClick={() => setOpen(!open)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </svg>
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label={t("accountActions")}
          className="account-dropdown absolute end-0 top-full z-40 mt-3 min-w-60 overflow-hidden rounded-[2px] border border-accent/35 bg-white text-primary shadow-2xl"
        >
          {/* Delicate champagne-gold top accent bar */}
          <div className="account-dropdown-accent h-[2px] w-full bg-accent" />

          {/* User profile / role badge */}
          <div className="account-dropdown-header border-b border-accent/20 bg-[#fcfbf8] px-4 py-3">
            <span className="account-dropdown-role block text-[10px] font-semibold tracking-wider text-accent uppercase">
              {auth.actor === "staff"
                ? auth.role === UserRole.SuperAdmin
                  ? t("role.superAdmin", { ns: "auth" })
                  : t("role.admin", { ns: "auth" })
                : t("role.customer", { ns: "auth" })}
            </span>
            <span className="account-dropdown-user mt-0.5 block truncate text-xs font-semibold text-primary">
              {auth.actor === "customer"
                ? `${auth.profile.fName ?? ""} ${auth.profile.lName ?? ""}`.trim() || auth.profile.email
                : auth.actor === "staff"
                ? auth.profile.name || auth.profile.email
                : ""}
            </span>
          </div>

          {/* Interactive actions */}
          <div className="account-dropdown-body p-1.5">
            <Link
              to={auth.actor === "staff" ? routePaths.admin.home : routePaths.account}
              onClick={() => setOpen(false)}
              className="account-menu-item flex w-full items-center justify-between gap-3 rounded-[2px] px-3 py-2.5 text-sm font-medium text-primary no-underline transition-all hover:bg-accent/10"
            >
              <span className="flex items-center gap-2.5">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4 text-accent">
                  {auth.actor === "staff" ? (
                    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                  ) : (
                    <>
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                    </>
                  )}
                </svg>
                <span>{t(auth.actor === "staff" ? "dashboard" : "account")}</span>
              </span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-3.5 text-accent/60 transition-transform rtl:rotate-180">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>

            <div className="account-dropdown-divider my-1 border-t border-accent/20" />

            <button
              type="button"
              disabled={auth.pending}
              onClick={() => {
                void auth.logout().catch(() => notify({ tone: "error", message: { namespace: "auth", key: "logoutUnconfirmed" } }));
              }}
              className="account-menu-logout flex w-full items-center gap-2.5 rounded-[2px] px-3 py-2.5 text-start text-sm font-medium text-primary/75 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4 shrink-0 transition-transform rtl:rotate-180">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>{auth.pending ? t("working", { ns: "auth" }) : t("logout", { ns: "auth" })}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PublicHeader() {
  const { t } = useTranslation("routing");
  const auth = useAuth();
  const notify = useToast();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const mobileId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 shrink-0 border-b border-accent/30 bg-primary-deep/95 shadow-lg backdrop-blur-xl [&_:focus-visible]:outline-accent-light"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <div className="mx-auto max-w-[1440px] px-5 py-4 sm:px-10">
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
          <Link to={routePaths.home} className="justify-self-start no-underline">
            <BrandWordmark />
          </Link>
          <div className="hidden lg:block">
            <NavigationLinks items={items} label={t("mainNav")} />
          </div>
          <div className="flex items-center justify-end gap-2 justify-self-end">
            <div className="hidden lg:block">
              {auth.actor ? <AccountActions key={`${auth.actor}:${auth.generation}`} /> : <SessionControls compact />}
            </div>
            <LanguageSwitcher compact />
            <button
              ref={trigger}
              type="button"
              className="mobile-menu-trigger grid size-10 place-items-center rounded-[2px] border border-accent/50 text-accent-light transition-colors hover:bg-accent/15 lg:hidden"
              aria-label={t(open ? "closeMenu" : "menu")}
              aria-expanded={open}
              aria-controls={mobileId}
              onClick={() => setOpen(!open)}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="size-5"
              >
                {open ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div
            id={mobileId}
            className="mobile-nav-drawer mt-4 max-h-[calc(100svh-7rem)] overflow-y-auto overscroll-contain rounded-[2px] border border-accent/35 bg-white text-primary shadow-2xl lg:hidden"
          >
            {/* Top gold accent line */}
            <div className="h-[2px] w-full bg-accent" />

            {/* Navigation Links */}
            <nav aria-label={t("mainNav")} className="mobile-nav-list flex flex-col py-1">
              {items.map((item) => {
                const destination = new URL(item.path, "https://brouj.com");
                const active =
                  Boolean(matchPath({ path: destination.pathname, end: true }, location.pathname)) &&
                  location.hash === destination.hash &&
                  [...destination.searchParams].every(([key, value]) => new URLSearchParams(location.search).get(key) === value);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`mobile-nav-link flex min-h-12 items-center justify-between px-5 py-3 text-sm font-medium no-underline transition-all ${
                      active
                        ? "border-s-4 border-accent bg-accent/10 font-semibold text-primary"
                        : "text-primary hover:bg-accent/5"
                    }`}
                  >
                    {t(item.title)}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Account / Session Footer Area */}
            <div className="mobile-nav-footer border-t border-accent/25 bg-[#faf8f5] p-4">
              {auth.actor ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 border-b border-accent/15 pb-2.5">
                    <span className="text-[10px] font-semibold tracking-wider text-accent uppercase">
                      {auth.actor === "staff"
                        ? auth.role === UserRole.SuperAdmin
                          ? t("role.superAdmin", { ns: "auth" })
                          : t("role.admin", { ns: "auth" })
                        : t("role.customer", { ns: "auth" })}
                    </span>
                    <span className="truncate text-xs font-semibold text-primary">
                      {auth.actor === "customer"
                        ? `${auth.profile.fName ?? ""} ${auth.profile.lName ?? ""}`.trim() || auth.profile.email
                        : auth.actor === "staff"
                        ? auth.profile.name || auth.profile.email
                        : ""}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link
                      to={auth.actor === "staff" ? routePaths.admin.home : routePaths.account}
                      onClick={() => setOpen(false)}
                      className="account-menu-item flex w-full items-center justify-between gap-3 rounded-[2px] bg-white px-3.5 py-2.5 text-sm font-medium text-primary no-underline shadow-xs hover:bg-accent/10"
                    >
                      <span className="flex items-center gap-2.5">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4 text-accent">
                          {auth.actor === "staff" ? (
                            <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                          ) : (
                            <>
                              <circle cx="12" cy="8" r="3.5" />
                              <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                            </>
                          )}
                        </svg>
                        <span>{t(auth.actor === "staff" ? "dashboard" : "account")}</span>
                      </span>
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-3.5 text-accent/60 transition-transform rtl:rotate-180">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                    <button
                      type="button"
                      disabled={auth.pending}
                      onClick={() => {
                        void auth.logout().catch(() => notify({ tone: "error", message: { namespace: "auth", key: "logoutUnconfirmed" } }));
                      }}
                      className="mobile-nav-btn flex w-full items-center gap-2.5 rounded-[2px] px-3.5 py-2.5 text-start text-sm font-medium text-primary/75 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4 shrink-0 transition-transform rtl:rotate-180">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>{auth.pending ? t("working", { ns: "auth" }) : t("logout", { ns: "auth" })}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to={routePaths.login}
                  onClick={() => setOpen(false)}
                  className="mobile-nav-login flex min-h-11 w-full items-center justify-center gap-2 rounded-[2px] border border-accent/40 bg-white px-4 py-2.5 text-sm font-medium text-primary no-underline shadow-xs transition-colors hover:border-accent hover:bg-accent/10"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4 text-accent">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  <span>{t("login")}</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
