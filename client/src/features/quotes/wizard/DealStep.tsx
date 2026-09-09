import { DealSearchSelect } from '../../../shared/components/SearchSelect/DealSearchSelect';
import { SettingsCard, SettingsCardBody } from '../../../shared/components/SettingsCard/SettingsCard';
import type { Deal } from '../../../shared/types/index';

type Props = {
  deal: Deal | null;
  onChange: (deal: Deal | null) => void;
};

export function DealStep({ deal, onChange }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 480 }}>
        <h2 style={{ marginBottom: 16 }}>Deal</h2>
        <SettingsCard title="Associate with a deal" titleBackground="input" shadow>
          <SettingsCardBody>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
              Once a deal is associated with this quote, changes you make here may affect the properties of the selected deal.
            </p>
            <div style={{ width: '100%' }}>
              <DealSearchSelect value={deal} onChange={onChange} />
            </div>
            {!deal && <div className="alert alert-warning" style={{ marginTop: 12 }}>Please choose a deal to continue.</div>}
          </SettingsCardBody>
        </SettingsCard>
      </div>
    </div>
  );
}
