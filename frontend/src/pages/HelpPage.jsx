import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { FAQS, filterFaqs } from './helpFaqs';
import styles from './HelpPage.module.css';

export default function HelpPage() {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');

  // Filtering is synchronous with each keystroke, so results are always current
  // well within 300ms of the last keystroke.
  const visible = useMemo(() => filterFaqs(FAQS, query), [query]);

  return (
    <div className={`view-enter ${styles.page}`}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>You are not stuck</p>
        <h1 className={styles.title}>Help center</h1>
        <p className={styles.subtitle}>Clear answers for the moments that interrupt your path.</p>
      </div>

      <div className={styles.search} role="search">
        <div className={styles.searchField}>
          <Search size={16} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={styles.input}
            aria-label="Search help articles"
            placeholder="Search help"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {query !== '' && (
          <button type="button" className={styles.clear} onClick={() => setQuery('')}>
            Clear search
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className={styles.noResults} role="status">
          No help entries match “{query}”. Try a different word or clear the search.
        </p>
      ) : (
        <ul className={styles.grid}>
          {visible.map((faq) => (
            <li key={faq.id}>
              <article className={styles.card}>
                <faq.icon size={24} aria-hidden="true" />
                <h3 className={styles.cardTitle}>{faq.question}</h3>
                <p className={styles.cardText}>{faq.answer}</p>
                {faq.hasButton && (
                  <Button
                    variant="secondary"
                    style={{ marginTop: 12 }}
                    onClick={() => showToast('Support request started — our team will reply within 24 hours', 'success')}
                  >
                    Contact support
                  </Button>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
