import { useId, useRef } from 'react';

const styles = {
  bar: {
    display: 'flex',
    gap: 7,
    borderBottom: '1px solid var(--line)',
    marginBottom: 18,
    overflow: 'auto',
  },
  tab: {
    background: 'transparent',
    color: 'var(--muted)',
    padding: '11px 12px',
    borderBottom: '2px solid transparent',
    borderRadius: 'var(--radius) var(--radius) 0 0',
    whiteSpace: 'nowrap',
    fontWeight: 700,
    fontSize: 13,
    border: 0,
    cursor: 'pointer',
  },
  active: {
    color: 'var(--teal)',
    borderBottom: '2px solid var(--coral)',
  },
};

/**
 * Accessible tabs (WAI-ARIA tabs pattern). Exactly one tab is aria-selected.
 * Left/Right arrows move between tabs and wrap; Home/End jump to the ends.
 * Each tab is associated with a tabpanel via aria-controls / aria-labelledby;
 * optional `children` render inside the active tab's panel.
 */
export default function Tabs({ tabs, active, onChange, children, label }) {
  const baseId = useId();
  const refs = useRef([]);
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === active));
  const tabId = (key) => `${baseId}-tab-${key}`;
  const panelId = (key) => `${baseId}-panel-${key}`;

  const moveTo = (index) => {
    const target = tabs[index];
    if (!target) return;
    refs.current[index]?.focus();
    onChange(target.key);
  };

  const onKeyDown = (event, index) => {
    const count = tabs.length;
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % count;
    else if (event.key === 'ArrowLeft') next = (index - 1 + count) % count;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    else return;
    event.preventDefault();
    moveTo(next);
  };

  return (
    <>
      <div className="tabs" style={styles.bar} role="tablist" aria-label={label}>
        {tabs.map((tab, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={tab.key}
              ref={(el) => { refs.current[index] = el; }}
              type="button"
              role="tab"
              id={tabId(tab.key)}
              aria-selected={selected}
              aria-controls={panelId(tab.key)}
              tabIndex={selected ? 0 : -1}
              className="tab"
              style={{ ...styles.tab, ...(selected ? styles.active : {}) }}
              onClick={() => onChange(tab.key)}
              onKeyDown={(e) => onKeyDown(e, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={panelId(tab.key)}
          aria-labelledby={tabId(tab.key)}
          hidden={index !== activeIndex}
        >
          {index === activeIndex ? children : null}
        </div>
      ))}
    </>
  );
}
