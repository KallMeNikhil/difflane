import { useState } from "react";
import { Avatar, Icon, IconButton, Button } from "../common";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useEditorPreferences } from "../../hooks/useEditorPreferences";
import { useAuthModal } from "../../hooks/useAuthModal";
import { useModalDialog } from "../../hooks/useModalDialog";
import { changePassword, deleteAccount, validatePassword } from "../../services/AuthService";
import type { EditorFontSize, EditorTabSize } from "../../types/settings";

interface UserSettingsModalProps {
  onClose: () => void;
}

type UserSettingsSection = "general" | "account" | "editor";

const NAV_ITEMS: { id: UserSettingsSection; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "settings" },
  { id: "account", label: "Account", icon: "shield_person" },
  { id: "editor", label: "Editor", icon: "code" },
];

const FONT_SIZE_OPTIONS: EditorFontSize[] = [12, 14, 16, 18];
const TAB_SIZE_OPTIONS: EditorTabSize[] = [2, 4, 8];

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-sm">
      <div>
        <span className="font-label-md text-label-md text-on-surface block">{label}</span>
        <span className="text-[12px] text-on-surface-variant">{description}</span>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={label}
        />
        <div className="w-10 h-6 bg-surface-variant rounded-full peer peer-checked:bg-primary transition-colors relative after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-on-surface-variant peer-checked:after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-4" />
      </label>
    </div>
  );
}

export function UserSettingsModal({ onClose }: UserSettingsModalProps) {
  const { displayName, initials, setDisplayName, isAuthenticated, user, updateAccountProfile, logout } = useCurrentUser();
  const { preferences, setFontSize, setTabSize, setWordWrap, setMinimap, setAutoSave } = useEditorPreferences();
  const { openGuestUpgrade } = useAuthModal();
  const [section, setSection] = useState<UserSettingsSection>("general");
  const [username, setUsername] = useState(user?.username ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  async function handleUsernameSave() {
    setAccountError(null);
    setAccountMessage(null);
    try {
      await updateAccountProfile({ username });
      setAccountMessage("Username updated.");
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Unable to update username.");
    }
  }

  async function handlePasswordChange() {
    setAccountError(null);
    setAccountMessage(null);
    const issues = validatePassword(newPassword);
    if (issues.length > 0) {
      setAccountError(`Password needs: ${issues.join(", ")}.`);
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setAccountMessage("Password updated.");
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Unable to update password.");
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Delete your account permanently? This cannot be undone.")) {
      return;
    }
    await deleteAccount();
    await logout();
    onClose();
  }

  const dialogRef = useModalDialog<HTMLDivElement>(onClose);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-md bg-black/40 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-settings-title"
        tabIndex={-1}
        className="relative w-full max-w-[800px] bg-surface rounded-xl border border-outline-variant shadow-2xl flex flex-col max-h-[90vh] overflow-hidden outline-none"
      >
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant bg-surface-container-low shrink-0">
          <div className="flex items-center gap-sm">
            <Icon name="settings" />
            <div>
              <h2 id="user-settings-title" className="font-headline-md text-headline-md text-on-surface leading-tight">Settings</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Manage your account and preferences</p>
            </div>
          </div>
          <IconButton icon="close" aria-label="Close" shape="square" onClick={onClose} />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-64 shrink-0 bg-surface-container-low border-r border-outline-variant p-md flex flex-col gap-xs overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex items-center gap-sm px-md py-sm rounded-lg font-label-md text-label-md text-left transition-colors ${
                  section === item.id
                    ? "bg-secondary-container text-on-secondary-container font-bold"
                    : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
                }`}
              >
                <Icon name={item.icon} size={18} filled={section === item.id} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 p-lg overflow-y-auto">
            <div className="max-w-2xl mx-auto flex flex-col gap-lg">
              {section === "general" && (
                <section className="flex flex-col gap-md">
                  <h3 className="font-headline-md text-[20px] font-semibold text-on-surface border-b border-outline-variant pb-2">
                    Profile Information
                  </h3>
                  <div className="bg-surface-container-low rounded-lg p-md border border-outline-variant flex gap-md items-start">
                    <Avatar initials={initials} size="md" className="w-16 h-16 text-[18px] [&>div:first-child]:w-16 [&>div:first-child]:h-16 [&>div:first-child]:text-[18px]" />
                    <div className="flex-1 flex flex-col gap-sm">
                      <div>
                        <div className="font-headline-md text-[18px] text-on-surface font-semibold">Personal Profile</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                          Manage your personal information used across all Difflane Workspaces.
                        </div>
                      </div>
                      <div className="max-w-sm">
                        <label htmlFor="display-name" className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">
                          Display Name
                        </label>
                        <input
                          id="display-name"
                          type="text"
                          value={displayName}
                          onChange={(event) => setDisplayName(event.target.value)}
                          className="w-full bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {section === "account" && (
                <section className="flex flex-col gap-md">
                  <h3 className="font-headline-md text-[20px] font-semibold text-on-surface border-b border-outline-variant pb-2">
                    Account
                  </h3>

                  {!isAuthenticated ? (
                    <div className="bg-surface-container-low rounded-lg p-md border border-outline-variant flex items-center justify-between gap-md">
                      <div>
                        <p className="font-label-md text-label-md text-on-surface">You're browsing as a guest</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Create a free account to keep ownership of your workspaces.
                        </p>
                      </div>
                      <Button type="button" variant="primary" size="md" onClick={openGuestUpgrade}>
                        Create Account
                      </Button>
                    </div>
                  ) : (
                    <>
                      {(accountMessage || accountError) && (
                        <div
                          className={`rounded-lg px-md py-sm font-body-sm text-body-sm ${
                            accountError ? "bg-error/10 border border-error/30 text-error" : "bg-success/10 border border-success/30 text-success"
                          }`}
                        >
                          {accountError ?? accountMessage}
                        </div>
                      )}

                      <div className="bg-surface-container-low rounded-lg p-md border border-outline-variant flex flex-col gap-sm">
                        <p className="font-label-md text-label-md text-on-surface">Email</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{user?.email}</p>
                      </div>

                      <div className="bg-surface-container-low rounded-lg p-md border border-outline-variant flex flex-col gap-sm max-w-sm">
                        <label htmlFor="account-username" className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                          Username
                        </label>
                        <div className="flex gap-sm">
                          <input
                            id="account-username"
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            className="flex-1 bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                          />
                          <Button type="button" variant="secondary" size="md" onClick={handleUsernameSave}>
                            Save
                          </Button>
                        </div>
                      </div>

                      <div className="bg-surface-container-low rounded-lg p-md border border-outline-variant flex flex-col gap-sm max-w-sm">
                        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Change Password</p>
                        <input
                          type="password"
                          placeholder="Current password"
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                          className="bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        />
                        <input
                          type="password"
                          placeholder="New password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          className="bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        />
                        <Button type="button" variant="secondary" size="md" onClick={handlePasswordChange}>
                          Update Password
                        </Button>
                      </div>

                      <div className="bg-error/5 rounded-lg p-md border border-error/30 flex items-center justify-between gap-md">
                        <div>
                          <p className="font-label-md text-label-md text-error">Delete Account</p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Permanently delete your account and remove your access to owned workspaces.
                          </p>
                        </div>
                        <Button type="button" variant="secondary" size="md" onClick={handleDeleteAccount}>
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </section>
              )}

              {section === "editor" && (
                <section className="flex flex-col gap-md">
                  <div className="border-b border-outline-variant pb-2">
                    <h3 className="font-headline-md text-[20px] font-semibold text-on-surface">Editor Preferences</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                      These preferences apply only to your editor experience across all Workspaces.
                    </p>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-md border border-outline-variant flex flex-col gap-lg">
                    <div className="grid grid-cols-2 gap-md">
                      <div className="flex flex-col gap-xs">
                        <label htmlFor="font-size" className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                          Font Size
                        </label>
                        <select
                          id="font-size"
                          value={preferences.fontSize}
                          onChange={(event) => setFontSize(Number(event.target.value) as EditorFontSize)}
                          className="bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        >
                          {FONT_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                              {size}px
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-xs">
                        <label htmlFor="tab-size" className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                          Tab Size
                        </label>
                        <select
                          id="tab-size"
                          value={preferences.tabSize}
                          onChange={(event) => setTabSize(Number(event.target.value) as EditorTabSize)}
                          className="bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        >
                          {TAB_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-y-sm pt-md border-t border-outline-variant">
                      <ToggleRow label="Word Wrap" description="Wrap long lines inside the editor." checked={preferences.wordWrap} onChange={setWordWrap} />
                      <ToggleRow label="Show Minimap" description="Display the code minimap on the right edge." checked={preferences.minimap} onChange={setMinimap} />
                      <ToggleRow
                        label="Auto Save"
                        description="Automatically write changes back to the original local Workspace when available."
                        checked={preferences.autoSave}
                        onChange={setAutoSave}
                      />
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-lg py-md border-t border-outline-variant bg-surface-container-lowest shrink-0">
          <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-xs">
            <Icon name="check_circle" size={16} />
            Settings are automatically saved.
          </span>
          <div className="flex items-center gap-sm">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="md" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
