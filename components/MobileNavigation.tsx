"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
const sections = [
  ["Início", "/"],
  ["Moda", "/moda"],
  ["Beleza", "/beleza"],
  ["Lifestyle", "/lifestyle"],
  ["Achados", "/achados"],
  ["UGC", "/ugc"],
  ["Sobre", "/sobre"],
  ["Linktree", "/linktree"],
];
export default function MobileNavigation({
  wordmark,
  signature,
}: {
  wordmark: string;
  signature: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overflow = useRef("");
  function close() {
    setOpen(false);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 400;
    timer.current = setTimeout(() => {
      dialog.current?.close();
      document.body.style.overflow = overflow.current;
      toggle.current?.focus();
    }, delay);
  }
  function show() {
    if (dialog.current?.open) {
      close();
      return;
    }
    overflow.current = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      setOpen(true);
      requestAnimationFrame(() =>
        dialog.current?.querySelector<HTMLButtonElement>("button")?.focus(),
      );
    });
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      document.body.style.overflow = overflow.current;
    },
    [],
  );
  return (
    <>
      <button
        ref={toggle}
        className="mobileMenuToggle"
        type="button"
        aria-label="Abrir menu de navegação"
        aria-controls={id}
        aria-expanded={open}
        onClick={show}
      >
        <span className="mobileMenuHamburger" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>
      <dialog
        id={id}
        ref={dialog}
        className={"mobileMenu" + (open ? " isOpen" : "")}
        aria-label="Menu de navegação"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const nodes = Array.from(
            dialog.current?.querySelectorAll<HTMLElement>(
              "button:not([disabled]),a[href]",
            ) ?? [],
          );
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
      >
        <div className="mobileMenuPanel">
          <div className="mobileMenuTop">
            <button
              type="button"
              className="mobileMenuClose"
              aria-label="Fechar menu"
              onClick={close}
            >
              <span aria-hidden="true">×</span>
            </button>
            <Link className="mobileMenuBrand" href="/" onClick={close}>
              {wordmark}
            </Link>
          </div>
          <nav className="mobileMenuLinks" aria-label="Seções do site">
            {sections.map(([label, href]) => (
              <Link href={href} key={href} onClick={close}>
                {label}
              </Link>
            ))}
          </nav>
          <p className="mobileMenuSignature">{signature}</p>
        </div>
      </dialog>
    </>
  );
}
