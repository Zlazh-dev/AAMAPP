import React from 'react';

const ROLES = [
  { code: 'admin', label: 'Admin', icon: 'admin_panel_settings', desc: 'Semua akses' },
  { code: 'guru', label: 'Guru', icon: 'school', desc: 'Mengajar & presensi' },
  { code: 'kurikulum', label: 'Staf Kurikulum', icon: 'menu_book', desc: 'Jadwal & penugasan' },
  { code: 'kesiswaan', label: 'Staf Kesiswaan', icon: 'gavel', desc: 'Tata tertib & demerit' },
  { code: 'tu', label: 'Staf TU', icon: 'description', desc: 'Rekap presensi' },
  { code: 'kepsek', label: 'Kepala Sekolah', icon: 'workspace_premium', desc: 'Monitor & approve' },
];

interface RoleSelectorProps {
  selected: string[];
  onChange: (roles: string[]) => void;
}

export function RoleSelector({ selected, onChange }: RoleSelectorProps) {
  const toggle = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((r) => r !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {ROLES.map((role) => {
        const isSel = selected.includes(role.code);
        return (
          <button
            key={role.code}
            type="button"
            onClick={() => toggle(role.code)}
            className={[
              'flex items-center gap-2.5 rounded-md border p-2.5 transition-colors text-left',
              isSel ? 'border-aam-green bg-green-50' : 'border-aam-border hover:border-gray-300',
            ].join(' ')}
          >
            <span
              className={[
                'material-symbols-outlined flex-shrink-0',
                isSel ? 'text-aam-green' : 'text-aam-text-muted',
              ].join(' ')}
              style={{ fontSize: '1.25rem' }}
            >
              {role.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-aam-text">{role.label}</p>
              <p className="text-xs text-aam-text-muted">{role.desc}</p>
            </div>
            {isSel && (
              <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.125rem' }}>
                check_circle
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
