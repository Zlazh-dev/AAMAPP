import React, { useState, useEffect } from 'react';
import { getDeviceToken, getDeviceNama } from '../../api/client';
import { KioskPairingPage } from './KioskPairingPage';
import { KioskScannerPage } from './KioskScannerPage';

/**
 * Root kiosk app — di-mount di route /kiosk, LUAR AuthedLayout.
 * Cek localStorage device token:
 *   - Ada  → KioskScannerPage
 *   - Tidak ada → KioskPairingPage
 */
export function KioskApp() {
  const [paired, setPaired] = useState<boolean>(() => !!getDeviceToken());
  const [deviceNama, setDeviceNama] = useState<string>(() => getDeviceNama() ?? '');

  // Sinkron state bila tab lain mengubah localStorage
  useEffect(() => {
    const handler = () => {
      setPaired(!!getDeviceToken());
      setDeviceNama(getDeviceNama() ?? '');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (!paired) {
    return (
      <KioskPairingPage
        onPaired={(nama) => {
          setDeviceNama(nama);
          setPaired(true);
        }}
      />
    );
  }

  return (
    <KioskScannerPage
      onUnpair={() => setPaired(false)}
    />
  );
}
