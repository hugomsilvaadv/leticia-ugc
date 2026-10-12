"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

const sections = [
  { label: "Início", href: "/" },
  { label: "Moda", href: "/moda" },
  { label: "Beleza", href: "/beleza" },
  { label: "Lifestyle", href: "/lifestyle" },
  { label: "Achados", href: "/achados" },
  { label: "UGC", href: "/ugc" },
  { label: "Sobre", href: "/sobre" },
];

export default function MobileNavigation({ wordmark, signature }: { wordmark: string; signature: string }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    openButton.current?.focus();
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        openButton.current?.focus();
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panel.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]") ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={openButton}
        className="mobileMenuToggle"
        type="button"
        aria-label="Abrir menu de navegação"
        aria-controls={menuId}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="mobileMenuHamburger" aria-hidden="true"><i /><i /><i /></span>
      </button>
      <div
        id={menuId}
        className={"mobileMenu" + (open ? " isOpen" : "")}
        aria-hidden={!open}
      >
        <div className="mobileMenuPanel" role="dialog" aria-modal={open} aria-label="Menu de navegação" ref={panel}>
          <div className="mobileMenuTop">
            <button
              ref={closeButton}
              className="mobileMenuClose"
              type="button"
              aria-label="Fechar menu"
              onClick={close}
            >
              <span aria-hidden="true">×</span>
            </button>
            <Link className="mobileMenuBrand" href="/" onClick={close}>{wordmark}</Link>
          </div>
          <nav className="mobileMenuLinks" aria-label="Seções do site">
            {sections.map(({ label, href }) => (
              <Link href={href} key={href} onClick={close}>{label}</Link>
            ))}
          </nav>
          <p className="mobileMenuSignature">{signature}</p>
        </div>
      </div>
    </>
  );
}
