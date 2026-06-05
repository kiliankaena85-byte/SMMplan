"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Loader2 } from "lucide-react";
import { getArticles } from "@/actions/knowledge";

interface SearchAutocompleteProps {
  initialSearch?: string;
  activeCategory?: string;
}

export function SearchAutocomplete({ initialSearch = "", activeCategory = "Все" }: SearchAutocompleteProps) {
  const [query, setQuery] = useState(initialSearch);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced autocomplete suggestions fetching
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await getArticles(activeCategory === "Все" ? undefined : activeCategory, query);
        if (res.success && res.articles) {
          setSuggestions(res.articles.slice(0, 5));
          setIsOpen(res.articles.length > 0);
        } else {
          setSuggestions([]);
          setIsOpen(false);
        }
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeCategory]);

  // Keyboard navigation logic
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        const selected = suggestions[activeIndex];
        router.push(`/knowledge/${selected.slug}`);
        setIsOpen(false);
      } else {
        // Standard form submit
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleSubmit = () => {
    const url = `/knowledge?search=${encodeURIComponent(query.trim())}${
      activeCategory !== "Все" ? `&category=${encodeURIComponent(activeCategory)}` : ""
    }`;
    router.push(url);
    setIsOpen(false);
  };

  // Close suggestions popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    const url = `/knowledge${activeCategory !== "Все" ? `?category=${encodeURIComponent(activeCategory)}` : ""}`;
    router.push(url);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg mx-auto select-none">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.trim().length >= 2 && suggestions.length > 0 && setIsOpen(true)}
            placeholder="Поиск по статьям..."
            className="w-full h-11 pl-10 pr-10 rounded-[10px] border border-border bg-card text-foreground focus:outline-none focus:border-primary transition-colors text-sm font-medium"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls="autocomplete-suggestions"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm flex items-center justify-center min-h-[44px] min-w-[44px]"
              title="Очистить поиск"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          className="h-11 px-5 bg-primary text-primary-foreground rounded-[10px] font-bold text-sm flex items-center justify-center hover:opacity-95 transition-opacity active:scale-[0.98] min-w-[80px]"
        >
          Найти
        </button>
      </div>

      {/* Autocomplete Suggestions Popover */}
      {isOpen && suggestions.length > 0 && (
        <ul
          id="autocomplete-suggestions"
          role="listbox"
          className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-[10px] shadow-lg z-50 overflow-hidden divide-y divide-border/40 max-h-[300px] overflow-y-auto"
        >
          {suggestions.map((item, index) => {
            const isHighlighted = index === activeIndex;
            return (
              <li
                key={item.id}
                role="option"
                aria-selected={isHighlighted}
                className={`transition-colors ${
                  isHighlighted ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-foreground"
                }`}
              >
                <Link
                  href={`/knowledge/${item.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="flex flex-col gap-0.5 px-4 py-3 min-h-[44px] w-full text-left"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {item.category}
                  </span>
                  <span className="text-sm font-semibold leading-tight line-clamp-1">
                    {item.title}
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {item.description}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
