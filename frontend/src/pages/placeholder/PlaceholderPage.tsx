import React from 'react';
import { Card } from '../../components/Card';
import { PageContainer } from '../../components/PageContainer';

interface PlaceholderPageProps {
  title: string;
  icon: string;
}

export function PlaceholderPage({ title, icon }: PlaceholderPageProps) {
  return (
    <PageContainer size="xl" backLinkMobile={false}>
      <Card icon={icon} className="p-8 md:p-12">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <span
            className="material-symbols-outlined text-aam-green"
            style={{ fontSize: '3rem' }}
          >
            {icon}
          </span>
          <h2 className="mt-4 text-xl font-heading font-semibold text-aam-text">
            {title}
          </h2>
          <p className="mt-2 text-sm text-aam-text-muted">
            Modul menyusul
          </p>
        </div>
      </Card>
    </PageContainer>
  );
}
