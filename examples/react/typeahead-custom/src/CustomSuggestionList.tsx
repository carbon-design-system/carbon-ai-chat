/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { SuggestionItem } from "@carbon/ai-chat";
import React, { useEffect, useState } from "react";
import "./custom-suggestions.css";

interface CustomSuggestionListProps {
  items: SuggestionItem[];
  query: string;
  onSelect: (item: SuggestionItem) => void;
  onDismiss: () => void;
}

function CustomSuggestionList({
  items,
  query,
  onSelect,
  onDismiss,
}: CustomSuggestionListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (items[selectedIndex]) {
          onSelect(items[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        onDismiss();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, onSelect, onDismiss]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="custom-suggestion-list" role="listbox">
      <div className="custom-suggestion-header">
        Suggestions for &ldquo;{query}&rdquo;
      </div>
      {items.map((item, i) => (
        <div
          key={item.id}
          role="option"
          aria-selected={i === selectedIndex}
          className={`custom-suggestion-item ${i === selectedIndex ? "selected" : ""}`}
          onClick={() => onSelect(item)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSelect(item);
            }
          }}
          onMouseEnter={() => setSelectedIndex(i)}
          tabIndex={-1}
        >
          <span className="custom-suggestion-label">{item.label}</span>
          {item.description && (
            <span className="custom-suggestion-desc">{item.description}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export { CustomSuggestionList };
