import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/Field';
import { useTranslation } from '@/i18n';

export interface ComboboxOption {
  id: string;
  label: string;
  hint?: string;
}

export function SearchCombobox({
  id,
  value,
  selectedLabel,
  onSelect,
  search,
  idleOptions,
  placeholder,
  disabled,
}: {
  id?: string;
  value: string;
  selectedLabel: string;
  onSelect: (id: string, label: string) => void;
  search: (term: string) => Promise<ComboboxOption[]>;
  idleOptions?: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();

  const [text, setText] = useState(selectedLabel);
  const [options, setOptions] = useState<ComboboxOption[]>(idleOptions ?? []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef(false);

  useEffect(() => {
    if (!typingRef.current) setText(selectedLabel);
  }, [selectedLabel]);

  useEffect(() => {
    const term = text.trim();
    if (!typingRef.current) return;
    if (!term) {
      setOptions(idleOptions ?? []);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      search(term)
        .then((r) => {
          if (!cancelled) {
            setOptions(r);
            setFailed(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOptions([]);
            setFailed(true);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [text, search, idleOptions]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        typingRef.current = false;
        setOpen(false);
        setText(selectedLabel);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [selectedLabel]);

  const pick = (opt: ComboboxOption) => {
    typingRef.current = false;
    onSelect(opt.id, opt.label);
    setText(opt.label);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlight >= 0 && options[highlight]) {
      e.preventDefault();
      pick(options[highlight]);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          typingRef.current = true;
          setText(e.target.value);
          setOpen(true);
          setHighlight(-1);
          if (e.target.value.trim() !== selectedLabel) onSelect('', e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul
          role="listbox"
          className="animate-pop-in origin-top absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-surface-line bg-surface-field py-1 shadow-lg"
        >
          {loading && <li className="px-3 py-2 text-sm text-ink-faint">{t('common.searching')}</li>}
          {failed && !loading && (
            <li className="px-3 py-2 text-sm text-red-600 dark:text-red-400">{t('common.searchFailed')}</li>
          )}
          {!loading && !failed && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-ink-faint">
              {text.trim() ? 'No matches.' : 'Nothing to suggest yet.'}
            </li>
          )}
          {!loading &&
            options.map((opt, i) => (
              <li key={opt.id} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(opt)}
                  className={`block w-full px-3 py-2 text-left text-sm ${
                    i === highlight ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'text-ink hover:bg-ink/10'
                  } ${opt.id === value ? 'font-semibold' : ''}`}
                >
                  {opt.label}
                  {opt.hint && opt.hint !== opt.label && (
                    <span className="ml-1 text-xs text-ink-faint">({opt.hint})</span>
                  )}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
