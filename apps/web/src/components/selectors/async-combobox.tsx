"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@packages/ui/components/combobox";
import { useEffect, useRef, useState } from "react";

export type ComboboxOption = { value: string; label: string };

const DEBOUNCE_MS = 300;

type Props = {
  /** Selected id, empty string means nothing selected. */
  value: string;
  onValueChange: (value: string) => void;
  /** Server-side search, called on open and (debounced) on every keystroke. */
  search: (query: string) => Promise<ComboboxOption[]>;
  /** Resolves the label for a pre-selected id that isn't among the last search results. */
  resolveLabel: (value: string) => Promise<ComboboxOption | null>;
  /** A pinned option (e.g. "All projects") always shown above the search results. */
  extraOption?: ComboboxOption;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

/** Debounced, server-searched combobox — options are fetched, not filtered client-side. */
export function AsyncCombobox({
  value,
  onValueChange,
  search,
  resolveLabel,
  extraOption,
  placeholder = "Search…",
  emptyText = "No results.",
  disabled,
  className,
  id,
}: Props) {
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [selected, setSelected] = useState<ComboboxOption | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function runSearch(query: string) {
    const id = ++requestId.current;
    setLoading(true);
    search(query)
      .then((results) => {
        if (id === requestId.current) {
          setOptions(extraOption ? [extraOption, ...results] : results);
        }
      })
      .catch(() => {
        if (id === requestId.current) setOptions([]);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }

  useEffect(() => {
    runSearch("");
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // Only re-run the initial search when the search function itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Resolve the label of an externally-set value that isn't known locally yet.
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected?.value === value) return;
    if (extraOption?.value === value) {
      setSelected(extraOption);
      return;
    }
    const known = options.find((o) => o.value === value);
    if (known) {
      setSelected(known);
      return;
    }
    let cancelled = false;
    void resolveLabel(value).then((option) => {
      if (!cancelled) setSelected(option);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options]);

  function handleInputValueChange(query: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), DEBOUNCE_MS);
  }

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(option) => {
        setSelected(option);
        onValueChange(option?.value ?? "");
      }}
      onInputValueChange={handleInputValueChange}
      filter={null}
      disabled={disabled}
      isItemEqualToValue={(a, b) => a?.value === b?.value}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        showClear={!!selected}
        disabled={disabled}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>{loading ? "Searching…" : emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: ComboboxOption) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
