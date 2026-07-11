import { useCallback, useEffect, useMemo, useState } from "react";
import { availableFilters, buildSearchIndex, filterSearchResults, groupSearchResultsByCategory, type SearchSources } from "../services/SearchService";
import type { SearchFilter } from "../types/search";

export function useGlobalSearch(sources: SearchSources) {
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setFilter("all");
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => {
          if (current) {
            setQuery("");
            setFilter("all");
          }
          return !current;
        });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const items = useMemo(() => buildSearchIndex(sources), [sources]);
  const filters = useMemo(() => availableFilters(sources), [sources]);
  const results = useMemo(() => filterSearchResults(items, query, filter), [items, query, filter]);
  const groupedResults = useMemo(() => groupSearchResultsByCategory(results), [results]);

  return {
    isOpen,
    open,
    close,
    query,
    setQuery,
    filter,
    setFilter,
    filters,
    results,
    groupedResults,
  };
}
