import React from 'react';
import { Card } from '../components/ui/Card.js';

interface GenericModulePageProps {
  title: string;
  description: string;
  badgeText?: string;
  icon?: React.ReactNode;
}

export const GenericModulePage: React.FC<GenericModulePageProps> = ({
  title,
  description,
  badgeText = 'Active Workspace',
}) => {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{title}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{description}</p>
        </div>
        <span className="badge badge-success">{badgeText}</span>
      </div>

      <Card title={`${title} Records`}>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '0.9rem', marginBottom: 8, fontWeight: 600, color: 'var(--text-main)' }}>
            No pending changes for {title.toLowerCase()}
          </p>
          <p style={{ fontSize: '0.8rem', maxWidth: 440, margin: '0 auto' }}>
            All operations are currently synchronized with the central workspace ledger. Use the quick action tools to submit new entries.
          </p>
        </div>
      </Card>
    </div>
  );
};
