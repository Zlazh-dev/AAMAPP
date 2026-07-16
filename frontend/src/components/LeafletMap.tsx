import React, { useEffect, useRef } from 'react';

/**
 * LeafletMap — dynamic-import vanilla Leaflet (T15 0d, §14.10.3).
 *
 * Planner correction #7: Gunakan L.circleMarker (BUKAN L.icon/marker)
 * untuk menghindari bug bundler resolve asset ikon marker default.
 * CSS leaflet di-import di dalam komponen ini (ikut chunk lazy halaman).
 *
 * Tile: OpenStreetMap. Fail → input manual lat/lng masih berfungsi.
 */
export function LeafletMap({
  lat,
  lng,
  radiusMeter,
  onMove,
}: {
  lat: number;
  lng: number;
  radiusMeter: number;
  onMove?: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Dynamic import — leaflet ikut chunk lazy
      const L = (await import('leaflet')).default;
      // CSS juga di-import di sini (ikut chunk)
      await import('leaflet/dist/leaflet.css');

      if (cancelled || !containerRef.current) return;

      // Init map jika belum ada
      if (!mapRef.current) {
        // T15-FIX bug 2 bonus: default center Malang (bukan Jakarta) saat koordinat kosong.
        mapRef.current = L.map(containerRef.current, {
          center: [lat || -7.98, lng || 112.72],
          zoom: 16,
          zoomControl: true,
          attributionControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapRef.current);

        // T15-FIX bug 2: daftarkan click handler SEKALI saat init map, DI LUAR
        // kondisi lat/lng — sebelumnya di dalam `if (lat!==0||lng!==0)` sehingga
        // saat koordinat awal 0,0 (seed default) klik peta tidak pernah berfungsi.
        mapRef.current.on('click', (e: any) => {
          const newLat = Number(e.latlng.lat.toFixed(6));
          const newLng = Number(e.latlng.lng.toFixed(6));
          if (onMove) onMove(newLat, newLng);
        });
      }

      const map = mapRef.current;

      // circleMarker (bukan marker icon — hindari bug asset bundler)
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
      if (circleRef.current) {
        map.removeLayer(circleRef.current);
      }

      if (lat !== 0 || lng !== 0) {
        markerRef.current = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: '#16a34a',
          color: '#15803d',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(map);

        // Radius circle (geofence visual)
        circleRef.current = L.circle([lat, lng], {
          radius: radiusMeter,
          color: '#16a34a',
          fillColor: '#16a34a',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);

        map.setView([lat, lng], 16);
      }
    })();

    return () => {
      cancelled = true;
      // Cleanup map on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker + circle when lat/lng/radius changes
  useEffect(() => {
    if (!mapRef.current || !containerRef.current) return;
    let active = true;

    (async () => {
      const L = (await import('leaflet')).default;
      if (!active || !mapRef.current) return;

      const map = mapRef.current;
      if (markerRef.current) map.removeLayer(markerRef.current);
      if (circleRef.current) map.removeLayer(circleRef.current);

      if (lat !== 0 || lng !== 0) {
        markerRef.current = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: '#16a34a',
          color: '#15803d',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(map);

        circleRef.current = L.circle([lat, lng], {
          radius: radiusMeter,
          color: '#16a34a',
          fillColor: '#16a34a',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);

        map.setView([lat, lng], map.getZoom());
      }
    })();

    return () => { active = false; };
  }, [lat, lng, radiusMeter]);

  return (
    <div
      ref={containerRef}
      className="w-full h-64 rounded-md border border-aam-border overflow-hidden"
      style={{ minHeight: '256px' }}
    />
  );
}
