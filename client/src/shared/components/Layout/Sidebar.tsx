import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, LayoutDashboard, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePersistedState } from "../../hooks/usePersistedState";
import { navGroupsFor, type NavGroupDef } from "../../constants/navGroups";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Sidebar.module.css";

// Shows just the group's icon (+ label when the sidebar isn't collapsed) as
// the trigger — the actual sub-items only ever appear in the hover flyout.
// Same markup/CSS regardless of collapsed state; collapsing only hides the
// label text (and adds a tooltip in its place).
function NavGroup({ label, icon: Icon, items, collapsed }: NavGroupDef & { collapsed: boolean }) {
  const { pathname } = useLocation();
  const hasActive = items.some((item) => pathname === item.to || pathname.startsWith(item.to + "/"));
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openFlyout() {
    cancelClose();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setFlyoutPos({ top: rect.top, left: rect.right + 17 });
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setFlyoutPos(null), 150);
  }

  useEffect(() => () => cancelClose(), []);

  return (
    <div
      ref={triggerRef}
      className={`${styles["sidebar-link"]}${collapsed ? ` ${styles["sidebar-link--collapsed"]}` : ""}${hasActive ? ` ${styles["sidebar-link--active"]}` : ""}`}
      onMouseEnter={openFlyout}
      onMouseLeave={scheduleClose}
      title={collapsed ? label : undefined}
    >
      <Icon size={18} />
      {!collapsed && <span>{label}</span>}
      {flyoutPos &&
        createPortal(
          <div
            className={styles["sidebar-flyout"]}
            style={{ top: flyoutPos.top, left: flyoutPos.left }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className={styles["sidebar-flyout-title"]}>{label}</div>
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `${styles["sidebar-flyout-link"]}${isActive ? ` ${styles["sidebar-flyout-link--active"]}` : ""}`
                }
                onClick={() => setFlyoutPos(null)}
              >
                <span>{item.label}</span>
                {item.badge && <span className={styles["sidebar-flyout-badge"]}>{item.badge}</span>}
              </NavLink>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

// Dashboard/Settings top-level links — same shape as NavGroup's trigger
// (icon always shown, label hidden while collapsed) but a real NavLink since
// there's no submenu to flyout.
function NavTopLink({
  to,
  end,
  icon: Icon,
  label,
  collapsed,
}: {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `${styles["sidebar-link"]}${collapsed ? ` ${styles["sidebar-link--collapsed"]}` : ""}${isActive ? ` ${styles["sidebar-link--active"]}` : ""}`
      }
      title={collapsed ? label : undefined}
    >
      <Icon size={18} />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = usePersistedState("pref:sidebar:collapsed", false);
  const { user } = useAuth();
  const isInternal = user?.accountType === "internal";
  const navGroups = user ? navGroupsFor(user.accountType) : [];

  return (
    <aside className={`${styles.sidebar}${collapsed ? ` ${styles["sidebar--collapsed"]}` : ""}`}>
      <div className={styles["sidebar-brand"]}>
        <span
          className={`${styles["sidebar-brand-logo"]}${collapsed ? "" : ` ${styles["sidebar-brand-logo--expanded"]}`}`}
        >
          {collapsed ? "CS" : "CRM System"}
        </span>
      </div>

      <nav className={styles["sidebar-nav"]}>
        {isInternal && <NavTopLink to="/" end icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />}

        {navGroups.map((group) => (
          <NavGroup key={group.label} label={group.label} icon={group.icon} items={group.items} collapsed={collapsed} />
        ))}

        {!isInternal && (
          <NavTopLink to="/settings/users" icon={Users} label="Users" collapsed={collapsed} />
        )}
      </nav>

      <div className={styles["sidebar-footer"]}>
        {collapsed ? (
          <div className={`${styles["sidebar-toggle-row"]} ${styles["sidebar-toggle-row--collapsed"]}`}>
            <button className={styles["sidebar-toggle"]} onClick={() => setCollapsed(false)} title="Expand sidebar">
              <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div className={styles["sidebar-toggle-row"]}>
            <button className={styles["sidebar-toggle"]} onClick={() => setCollapsed(true)} title="Collapse sidebar">
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
