import { useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SideNav } from "./SideNav";
import { AppHeader } from "./AppHeader";
import { GlobalSearchModal } from "../search";
import { useGlobalSearch } from "../../hooks/useGlobalSearch";
import { useSessionHistory } from "../../hooks/useSessionHistory";
import { MOCK_CONNECTED_REPOSITORIES } from "../../constants/mockConnectedRepositories";
import { MOCK_WORKSPACE_MEMBERS } from "../../constants/mockCollaborators";
import { buildWorkspacePath } from "../../constants/routes";
import type { SearchSources } from "../../services/SearchService";
import type { SearchResultItem } from "../../types/search";

export function AppLayout() {
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const { records: sessionRecords } = useSessionHistory();

  const searchSources: SearchSources = useMemo(
    () => ({
      sessions: sessionRecords,
      repositories: MOCK_CONNECTED_REPOSITORIES.map((repository) => ({
        id: repository.id,
        name: repository.name,
        detail: repository.syncedLabel,
      })),
      collaborators: MOCK_WORKSPACE_MEMBERS.map((member) => ({ id: member.id, name: member.name, role: member.role })),
    }),
    [sessionRecords],
  );

  const search = useGlobalSearch(searchSources);

  function handleSelectResult(item: SearchResultItem) {
    if (item.roomCode) {
      navigate(buildWorkspacePath(item.roomCode));
    }
    search.close();
  }

  return (
    <div className="bg-background text-on-surface font-body-md h-screen w-full flex overflow-hidden">
      <SideNav />

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 h-full shadow-2xl">
            <SideNav variant="drawer" onNavigate={() => setMobileNavOpen(false)} />
          </div>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
        </div>
      )}

      <div className="flex-grow flex flex-col h-full overflow-hidden">
        <AppHeader onOpenMobileNav={() => setMobileNavOpen(true)} onOpenSearch={search.open} />
        <main className="flex-grow overflow-y-auto p-md md:p-lg lg:p-xl">
          <Outlet />
        </main>
      </div>

      {search.isOpen && (
        <GlobalSearchModal
          query={search.query}
          onQueryChange={search.setQuery}
          filter={search.filter}
          onFilterChange={search.setFilter}
          availableCategories={search.filters}
          groupedResults={search.groupedResults}
          resultCount={search.results.length}
          onSelectResult={handleSelectResult}
          onClose={search.close}
        />
      )}
    </div>
  );
}
