import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAvatarSrc } from "../../hooks/useAvatarSrc";
import { RowActionsMenu } from "../Dropdown/RowActionsMenu";
import { GlobalSearch } from "../GlobalSearch/GlobalSearch";
import styles from "./TopBar.module.css";

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const avatarSrc = useAvatarSrc(user?.avatarUrl);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className={styles.topbar}>
      <GlobalSearch />
      <div className={styles["topbar-actions"]}>
        <Link to="/settings" className={styles["settings-icon-button"]} aria-label="Settings" title="Settings">
          <Settings size={18} />
        </Link>
        <RowActionsMenu
          label={user?.firstName}
          leadingIcon={User}
          icon={ChevronDown}
          triggerClassName={styles["user-menu-trigger"]}
          header={(close) => (
            <div className={styles["user-menu-header"]}>
              <div className={styles["user-menu-avatar"]}>
                {avatarSrc ? <img src={avatarSrc} alt="" className={styles["user-menu-avatar-image"]} /> : <User size={20} />}
              </div>
              <div className={styles["user-menu-info"]}>
                <div className={styles["user-menu-fullname"]}>{user?.firstName} {user?.lastName}</div>
                <div className={styles["user-menu-email"]}>{user?.email}</div>
                <Link to="/settings/general" className={styles["user-menu-profile-link"]} onClick={close}>
                  Profile & Preferences
                </Link>
              </div>
            </div>
          )}
          actions={[{ label: "Logout", icon: LogOut, onClick: handleLogout }]}
        />
      </div>
    </header>
  );
}
