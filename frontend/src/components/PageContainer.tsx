import React from 'react';

type PageContainerSize = 'xl' | 'lg' | 'md' | 'sm';

const sizeClass: Record<PageContainerSize, string> = {
  xl: 'max-w-[1280px]',
  lg: 'max-w-[1024px]',
  md: 'max-w-[768px]',
  sm: 'max-w-[640px]',
};

interface PageContainerProps {
  size?: PageContainerSize;
  /** Extra className for the container div */
  className?: string;
  /** T15 0c: Tambah padding bawah pada mobile agar sticky bottom bar tidak menutupi konten */
  bottomBar?: boolean;
  /**
   * UX-POLISH-SPEC §I: BackLink adaptif mobile = tombol fixed bawah (48px +
   * safe-area + margin). Bila true, PageContainer memesan ruang padding-bottom
   * di mobile supaya konten terakhir tidak tertutup tombol Kembali.
   * DEFAULT true — kecuali halaman TIDAK memakai BackLink atau memakai
   * bottomBar sendiri (form Simpan-bar dll).
   */
  backLinkMobile?: boolean;
  children: React.ReactNode;
}

// Tinggi tombol BackLink mobile: 48px button + 12px padding atas +
// env(safe-area-inset-bottom) — tidak bisa dipakai langsung di Tailwind,
// jadi pakai CSS var inline.
const BACKLINK_MOBILE_RESERVE = 'calc(48px + 0.75rem + max(0px, env(safe-area-inset-bottom)) + 1rem)';

export function PageContainer({
  size = 'xl',
  className = '',
  bottomBar = false,
  backLinkMobile = true,
  children,
}: PageContainerProps) {
  const mobilePaddingBottom = bottomBar
    ? 'pb-28 md:pb-6' // bottomBar = sticky form bar (~56px) + BackLink
    : backLinkMobile
      ? ''  // BackLink only — pakai inline style
      : '';

  return (
    <div
      className={[
        'w-full mx-auto p-4 md:p-6',
        mobilePaddingBottom,
        sizeClass[size],
        className,
      ].join(' ')}
      style={
        !bottomBar && backLinkMobile
          ? { paddingBottom: BACKLINK_MOBILE_RESERVE }
          : undefined
      }
    >
      {children}
    </div>
  );
}
