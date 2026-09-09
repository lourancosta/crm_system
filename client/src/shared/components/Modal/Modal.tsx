import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "../Button/Button";
import styles from "./Modal.module.css";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "default" | "accent" | "danger" | "medium" | "large" | "fullscreen";
  // Replaces the default close (X) button with custom controls (e.g. Cancel/
  // Save) - used by the "fullscreen" variant, which has no X button or Esc
  // dismissal since it's a dedicated full-page-style editor, not a dismissable
  // dialog.
  headerActions?: ReactNode;
  // Overrides the variant's default width — e.g. LogActivityModal widens
  // beyond the shared accent variant's 400px without affecting every other
  // modal that also uses variant="accent" (delete confirmations, quick
  // actions on list pages, etc.).
  width?: string;
};

export function Modal({ title, onClose, children, footer, variant = "default", headerActions, width }: Props) {
  const isFullscreen = variant === "fullscreen";

  useEffect(() => {
    if (isFullscreen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isFullscreen]);

  const hasColoredHeader = variant === "accent" || variant === "danger";

  const content = (
    <div
      className={`${styles["modal-overlay"]}${variant === "accent" ? ` ${styles["modal-overlay--docked"]}` : ""}${isFullscreen ? ` ${styles["modal-overlay--flush"]}` : ""}`}
      onClick={isFullscreen ? undefined : onClose}
    >
      <div
        className={`${styles.modal}${variant === "accent" ? ` ${styles["modal--accent"]}` : ""}${variant === "danger" ? ` ${styles["modal--danger"]}` : ""}${variant === "medium" ? ` ${styles["modal--medium"]}` : ""}${variant === "large" ? ` ${styles["modal--large"]}` : ""}${isFullscreen ? ` ${styles["modal--fullscreen"]}` : ""}`}
        style={width ? { width } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {hasColoredHeader ? (
          <div className={`${styles["modal-header"]} ${styles[variant === "danger" ? "modal-header--danger" : "modal-header--accent"]}`}>
            <h2>{title}</h2>
            <button type="button" className={styles["modal-close-accent"]} onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className={`${styles["modal-header"]}${isFullscreen ? ` ${styles["modal-header--fullscreen"]}` : ""}`}>
            <h2>{title}</h2>
            {headerActions ?? (
              <Button variant="ghost" onClick={onClose}>
                ✕
              </Button>
            )}
          </div>
        )}
        <div className={`${styles["modal-body"]}${isFullscreen ? ` ${styles["modal-body--fill"]}` : ""}`}>{children}</div>
        {footer && <div className={styles["modal-footer"]}>{footer}</div>}
      </div>
    </div>
  );

  // The "accent" variant deliberately docks relative to its nearest
  // positioned ancestor (the activity board's main column, via
  // position:absolute) so it stays in place in the DOM. Every other variant
  // portals straight to <body> so its "fixed, centered on screen" overlay
  // isn't accidentally scoped to a transformed ancestor — e.g. the
  // SlideOverPanel's `transform: translateX(...)` creates a new containing
  // block for position:fixed, which would otherwise center the dialog
  // within the sliding panel instead of the real viewport.
  return variant === "accent" ? content : createPortal(content, document.body);
}
