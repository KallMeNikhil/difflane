import { useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import { Icon, PlaceholderNotice } from "../common";
import { MODAL_IN } from "../../constants/motion";
import { useBodyScrollLock } from "../../hooks/useModalDialog";
import { SEARCH_CATEGORY_LABEL, SEARCH_FILTERS } from "../../types/search";
import type { SearchFilter, SearchResultCategory, SearchResultItem } from "../../types/search";

interface GlobalSearchModalProps {
  query: string;
  onQueryChange: (query: string) => void;
  filter: SearchFilter;
  onFilterChange: (filter: SearchFilter) => void;
  availableCategories: SearchResultCategory[];
  groupedResults: { category: SearchResultCategory; items: SearchResultItem[] }[];
  resultCount: number;
  onSelectResult: (item: SearchResultItem) => void;
  onClose: () => void;
}

export function GlobalSearchModal({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  availableCategories,
  groupedResults,
  resultCount,
  onSelectResult,
  onClose,
}: GlobalSearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useBodyScrollLock();

  const flatResults = groupedResults.flatMap((group) => group.items);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, filter]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((current) => Math.min(current + 1, Math.max(flatResults.length - 1, 0)));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((current) => Math.max(current - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        const target = flatResults[highlightedIndex];
        if (target) {
          onSelectResult(target);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flatResults, highlightedIndex, onClose, onSelectResult]);

  const visibleFilters = SEARCH_FILTERS.filter((tab) => tab.id === "all" || availableCategories.includes(tab.id));

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[10vh] p-md bg-black/45 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Global search">
      <m.div
        initial="hidden"
        animate="visible"
        variants={MODAL_IN}
        className="w-full max-w-[860px] bg-surface rounded-xl border border-outline flex flex-col overflow-hidden shadow-2xl shadow-black/60"
      >
        <div className="flex items-center px-lg py-md border-b border-outline">
          <Icon name="search" size={24} className="text-on-surface-variant mr-md" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search files, sessions, collaborators or repositories…"
            aria-label="Search files, sessions, collaborators or repositories"
            className="w-full bg-transparent border-none focus:ring-0 text-headline-md font-headline-md text-on-surface placeholder:text-secondary p-0 h-12 outline-none"
          />
          <div className="flex items-center justify-center px-sm py-xs bg-surface-container-low rounded border border-outline-variant ml-md text-on-surface-variant font-code text-code opacity-70">
            ⌘K
          </div>
        </div>

        <div className="flex items-center px-lg py-sm border-b border-outline gap-sm overflow-x-auto">
          {visibleFilters.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange(tab.id)}
              className={`px-md py-xs rounded-full font-label-md text-label-md transition-colors whitespace-nowrap border ${
                filter === tab.id
                  ? "bg-primary text-on-primary border-transparent"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-variant border-outline-variant"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto max-h-[512px] flex flex-col p-sm">
          {flatResults.length === 0 && (
            <PlaceholderNotice
              icon="search_off"
              title="No Results Found"
              description="We couldn't find anything matching your query. Try adjusting your filters."
            />
          )}

          {groupedResults.map((group) => (
            <div key={group.category} className="px-md py-sm">
              <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">
                {SEARCH_CATEGORY_LABEL[group.category]}
              </h3>
              <div className="flex flex-col gap-xs">
                {group.items.map((item) => {
                  const flatIndex = flatResults.indexOf(item);
                  const isHighlighted = flatIndex === highlightedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(flatIndex)}
                      onClick={() => onSelectResult(item)}
                      className={`flex items-center p-sm rounded-lg text-left border transition-colors ${
                        isHighlighted
                          ? "bg-primary/10 border-primary/30"
                          : "border-transparent hover:bg-surface-variant hover:border-outline-variant"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded bg-surface-container-low flex items-center justify-center mr-md shrink-0 ${
                          isHighlighted ? "text-primary" : "text-on-surface-variant"
                        }`}
                      >
                        <Icon name={item.icon} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-sm">
                          <span className="font-body-md text-body-md font-semibold text-on-surface truncate">{item.title}</span>
                          <span className="px-xs py-0.5 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-[10px] uppercase">
                            {item.badge}
                          </span>
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant truncate">{item.subtitle}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-lg py-sm border-t border-outline bg-surface-container-low flex justify-between items-center rounded-b-xl">
          <div className="flex gap-lg items-center">
            <div className="flex items-center gap-xs text-on-surface-variant">
              <div className="w-5 h-5 flex items-center justify-center rounded bg-surface border border-outline-variant text-xs">
                <Icon name="arrow_upward" size={14} />
              </div>
              <div className="w-5 h-5 flex items-center justify-center rounded bg-surface border border-outline-variant text-xs">
                <Icon name="arrow_downward" size={14} />
              </div>
              <span className="font-label-sm text-label-sm ml-xs">Navigate</span>
            </div>
            <div className="flex items-center gap-xs text-on-surface-variant">
              <div className="w-5 h-5 flex items-center justify-center rounded bg-surface border border-outline-variant text-xs">
                <Icon name="keyboard_return" size={14} />
              </div>
              <span className="font-label-sm text-label-sm ml-xs">Open</span>
            </div>
            <div className="flex items-center gap-xs text-on-surface-variant">
              <div className="px-1.5 h-5 flex items-center justify-center rounded bg-surface border border-outline-variant text-xs font-code">
                Esc
              </div>
              <span className="font-label-sm text-label-sm ml-xs">Close</span>
            </div>
          </div>
          <div className="font-label-sm text-label-sm text-on-surface-variant">{resultCount} Results</div>
        </div>
      </m.div>
    </div>
  );
}
