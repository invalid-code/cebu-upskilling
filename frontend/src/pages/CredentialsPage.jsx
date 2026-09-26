import Panel from '../components/ui/Panel';
import EmptyState from '../components/shared/EmptyState';
import { eyebrow, headingRow, pageSubtitle, pageTitle } from '../styles/shared';

const styles = {
  heading: { ...headingRow },
  eyebrow: { ...eyebrow },
  h1: { ...pageTitle },
  subtitle: { ...pageSubtitle },
};

export default function CredentialsPage() {
  return (
    <div className="view-enter">
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>Your portable record</div>
          <h1 style={styles.h1}>Credentials</h1>
          <p style={styles.subtitle}>
            A long-term record of the skills you can show, not just claim.
          </p>
        </div>
      </div>

      <Panel>
        <EmptyState
          title="No credentials yet"
          description="Skills you verify through proctored assessments will be stored here as portable credentials."
        />
      </Panel>
    </div>
  );
}
