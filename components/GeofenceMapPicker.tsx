'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Crosshair,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Shapes,
  CircleDot,
  RotateCcw,
  Sparkles,
  Trash2,
  Plus,
  Minus,
  Satellite,
  Map as MapIcon,
  Move,
  Target,
} from 'lucide-react';
import {
  calculatePolygonAreaSqMeters,
  calculatePolygonPerimeterMeters,
  PolygonPoint,
} from '@/lib/officeLocationStorage';

interface GeofenceMapPickerProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  mode?: 'circle' | 'polygon';
  polygonPoints?: PolygonPoint[];
  onCoordinatesChange: (lat: number, lng: number) => void;
  onPolygonChange?: (points: PolygonPoint[]) => void;
  onModeChange?: (mode: 'circle' | 'polygon') => void;
  className?: string;
  officeName?: string;
  minHeight?: string;
}

export default function GeofenceMapPicker({
  latitude,
  longitude,
  radiusMeters,
  mode = 'circle',
  polygonPoints = [],
  onCoordinatesChange,
  onPolygonChange,
  onModeChange,
  className = '',
  officeName = 'Office Geofence',
  minHeight = '520px',
}: GeofenceMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const currentTileLayerRef = useRef<any>(null);

  // Circle mode layers
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  // Polygon mode layers
  const polygonLayerRef = useRef<any>(null);
  const vertexMarkersRef = useRef<any[]>([]);

  // State
  const [activeMode, setActiveMode] = useState<'circle' | 'polygon'>(mode);
  const [currentPoints, setCurrentPoints] = useState<PolygonPoint[]>(polygonPoints);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [roomRadius, setRoomRadius] = useState<number>(30); // Default 30m radius from center

  // Track previous coordinates and active mode with refs to avoid stale closures
  const validLat = Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 ? latitude : 3.139;
  const validLng = Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 ? longitude : 101.6869;
  const validRadius = Math.max(10, Math.min(5000, Number(radiusMeters) || 150));

  const prevCoordsRef = useRef<{ lat: number; lng: number }>({ lat: validLat, lng: validLng });
  const currentPointsRef = useRef<PolygonPoint[]>(polygonPoints);
  const activeModeRef = useRef<'circle' | 'polygon'>(mode);
  const isDraggingPinRef = useRef<boolean>(false);
  const dragStartPinPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const dragStartPolygonPointsRef = useRef<PolygonPoint[]>([]);

  // Sync refs on state updates
  useEffect(() => {
    setActiveMode(mode);
    activeModeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    setCurrentPoints(polygonPoints);
    currentPointsRef.current = polygonPoints;
  }, [polygonPoints]);

  // Generate an equilateral / regular polygon with N sides centered exactly at current office pin
  const generateRegularPolygon = useCallback(
    (sidesCount: number, radiusMtr = roomRadius) => {
      const numSides = Math.max(3, Math.min(16, sidesCount));
      const points: PolygonPoint[] = [];
      const latCos = Math.cos((validLat * Math.PI) / 180);

      for (let i = 0; i < numSides; i++) {
        // Rotate starting so 4 sides gives a clean horizontal-vertical box
        const angle = (2 * Math.PI * i) / numSides - (numSides === 4 ? Math.PI / 4 : Math.PI / 2);
        const dLat = (radiusMtr * Math.cos(angle)) / 111320;
        const dLng = (radiusMtr * Math.sin(angle)) / (111320 * latCos);

        points.push({
          lat: Number((validLat + dLat).toFixed(6)),
          lng: Number((validLng + dLng).toFixed(6)),
        });
      }

      setCurrentPoints(points);
      currentPointsRef.current = points;
      if (onPolygonChange) {
        onPolygonChange(points);
      }
    },
    [validLat, validLng, roomRadius, onPolygonChange]
  );

  // Center polygon room directly on current pin
  const centerPolygonOnPin = useCallback(() => {
    if (!currentPointsRef.current || currentPointsRef.current.length === 0) {
      generateRegularPolygon(4, roomRadius);
      return;
    }
    const pts = currentPointsRef.current;
    const avgLat = pts.reduce((acc, p) => acc + p.lat, 0) / pts.length;
    const avgLng = pts.reduce((acc, p) => acc + p.lng, 0) / pts.length;
    const dLat = validLat - avgLat;
    const dLng = validLng - avgLng;

    const centered = pts.map((pt) => ({
      lat: Number((pt.lat + dLat).toFixed(6)),
      lng: Number((pt.lng + dLng).toFixed(6)),
    }));

    setCurrentPoints(centered);
    currentPointsRef.current = centered;
    if (onPolygonChange) onPolygonChange(centered);
  }, [validLat, validLng, roomRadius, generateRegularPolygon, onPolygonChange]);

  // Align Office Pin to the exact geometric center (Centroid) of the polygon room
  const autoAlignPinToRoomCenter = useCallback(() => {
    if (!currentPointsRef.current || currentPointsRef.current.length === 0) return;
    const pts = currentPointsRef.current;
    const avgLat = Number((pts.reduce((acc, p) => acc + p.lat, 0) / pts.length).toFixed(6));
    const avgLng = Number((pts.reduce((acc, p) => acc + p.lng, 0) / pts.length).toFixed(6));

    prevCoordsRef.current = { lat: avgLat, lng: avgLng };
    if (markerRef.current) markerRef.current.setLatLng([avgLat, avgLng]);
    if (circleRef.current) circleRef.current.setLatLng([avgLat, avgLng]);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([avgLat, avgLng], { animate: true, duration: 0.5 });
    }
    onCoordinatesChange(avgLat, avgLng);
  }, [onCoordinatesChange]);

  // Add an extra corner point
  const handleAddCornerPoint = useCallback(() => {
    const pts = currentPointsRef.current;
    let newPt: PolygonPoint;
    if (pts.length >= 2) {
      const last = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      newPt = {
        lat: Number((last.lat + (last.lat - prev.lat) * 0.4).toFixed(6)),
        lng: Number((last.lng + (last.lng - prev.lng) * 0.4).toFixed(6)),
      };
    } else {
      newPt = {
        lat: Number((validLat + 0.00015).toFixed(6)),
        lng: Number((validLng + 0.00015).toFixed(6)),
      };
    }
    const updated = [...pts, newPt];
    setCurrentPoints(updated);
    currentPointsRef.current = updated;
    if (onPolygonChange) onPolygonChange(updated);
  }, [validLat, validLng, onPolygonChange]);

  // Render Polygon and Draggable Handles
  const renderPolygonLayers = useCallback(
    (map: any, L: any, points: PolygonPoint[]) => {
      if (!map || !L) return;

      // Clean old
      if (polygonLayerRef.current && map.hasLayer(polygonLayerRef.current)) {
        map.removeLayer(polygonLayerRef.current);
      }
      vertexMarkersRef.current.forEach((m) => {
        if (map.hasLayer(m)) map.removeLayer(m);
      });
      vertexMarkersRef.current = [];

      if (!points || points.length === 0) return;

      const latLngs = points.map((p) => [p.lat, p.lng]);

      // Draw Polygon
      if (points.length >= 3) {
        const polygon = L.polygon(latLngs, {
          color: '#4f46e5',
          fillColor: '#6366f1',
          fillOpacity: 0.35,
          weight: 3,
        }).addTo(map);
        polygonLayerRef.current = polygon;
      } else if (points.length === 2) {
        const line = L.polyline(latLngs, {
          color: '#4f46e5',
          weight: 3,
          dashArray: '6, 6',
        }).addTo(map);
        polygonLayerRef.current = line;
      }

      // Draw Draggable Vertex Markers
      points.forEach((pt, index) => {
        const vertexIcon = L.divIcon({
          className: 'custom-polygon-vertex',
          html: `
            <div style="width: 26px; height: 26px; border-radius: 50%; background: #4f46e5; border: 2.5px solid #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 11px; font-weight: bold; font-family: monospace; cursor: grab;">
              ${index + 1}
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const vertexMarker = L.marker([pt.lat, pt.lng], {
          icon: vertexIcon,
          draggable: true,
          zIndexOffset: 1000,
        }).addTo(map);

        vertexMarker.on('drag', () => {
          const pos = vertexMarker.getLatLng();
          const updated = [...currentPointsRef.current];
          updated[index] = { lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) };
          if (polygonLayerRef.current) {
            polygonLayerRef.current.setLatLngs(updated.map((p) => [p.lat, p.lng]));
          }
        });

        vertexMarker.on('dragend', () => {
          const pos = vertexMarker.getLatLng();
          const updated = [...currentPointsRef.current];
          updated[index] = { lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) };
          setCurrentPoints(updated);
          currentPointsRef.current = updated;
          if (onPolygonChange) onPolygonChange(updated);
        });

        vertexMarkersRef.current.push(vertexMarker);
      });
    },
    [onPolygonChange]
  );

  // Initialize Map
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;
      LRef.current = L;

      // Fix default Leaflet icon assets
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Clean up previous instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initialize map instance
      const map = L.map(mapContainerRef.current, {
        center: [validLat, validLng],
        zoom: 17,
        scrollWheelZoom: true,
        zoomControl: false,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      // Google Maps Streets (Fast, beautiful, zero watermarks)
      const streetLayer = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        {
          maxZoom: 21,
          subdomains: ['0', '1', '2', '3'],
        }
      ).addTo(map);
      currentTileLayerRef.current = streetLayer;

      // Attribution
      L.control
        .attribution({
          position: 'bottomright',
          prefix: '<span style="font-size:9px; color:#475569; font-weight:600;">© Google Maps</span>',
        })
        .addTo(map);

      // Custom center marker icon
      const centerPinIcon = L.divIcon({
        className: 'custom-geofence-marker',
        html: `
          <div style="position: relative; width: 42px; height: 42px;">
            <div style="position: absolute; inset: 0; border-radius: 50% 50% 50% 0; background: linear-gradient(135deg, #0b4da2, #2563eb); transform: rotate(-45deg); border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(11,77,162,0.6); display: flex; align-items: center; justify-content: center;">
              <div style="width: 14px; height: 14px; background: #ffffff; border-radius: 50%; transform: rotate(45deg); box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);"></div>
            </div>
            <div style="position: absolute; bottom: -4px; left: 15px; width: 12px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(1.5px);"></div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 42],
        popupAnchor: [0, -42],
      });

      // Circle geofence
      const circle = L.circle([validLat, validLng], {
        radius: validRadius,
        color: '#0b4da2',
        fillColor: '#3b82f6',
        fillOpacity: 0.25,
        weight: 3,
        dashArray: '6, 6',
      });
      circleRef.current = circle;

      // Draggable center marker
      const marker = L.marker([validLat, validLng], {
        icon: centerPinIcon,
        draggable: true,
        autoPan: true,
        zIndexOffset: 500,
      });
      markerRef.current = marker;

      // Add appropriate layers according to initial activeMode
      if (activeModeRef.current === 'circle') {
        circle.addTo(map);
        marker.addTo(map);
      } else {
        marker.addTo(map);
        renderPolygonLayers(map, L, currentPointsRef.current);
      }

      // Center Pin Drag Start: Record starting position of pin and polygon
      marker.on('dragstart', () => {
        isDraggingPinRef.current = true;
        const p = marker.getLatLng();
        dragStartPinPosRef.current = { lat: p.lat, lng: p.lng };
        dragStartPolygonPointsRef.current = [...currentPointsRef.current];
      });

      // Center Pin Drag: Move polygon in REAL-TIME along with the pin
      marker.on('drag', () => {
        const cur = marker.getLatLng();
        circle.setLatLng([cur.lat, cur.lng]);

        if (dragStartPinPosRef.current && dragStartPolygonPointsRef.current.length > 0) {
          const dLat = cur.lat - dragStartPinPosRef.current.lat;
          const dLng = cur.lng - dragStartPinPosRef.current.lng;

          // Real-time live polygon preview while dragging pin
          if (polygonLayerRef.current) {
            polygonLayerRef.current.setLatLngs(
              dragStartPolygonPointsRef.current.map((pt) => [pt.lat + dLat, pt.lng + dLng])
            );
          }

          // Real-time vertex handles preview while dragging pin
          vertexMarkersRef.current.forEach((vm, idx) => {
            const orig = dragStartPolygonPointsRef.current[idx];
            if (orig) {
              vm.setLatLng([orig.lat + dLat, orig.lng + dLng]);
            }
          });
        }
      });

      // Center Pin Drag End: Commit coordinates and shifted polygon
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const newLat = Number(pos.lat.toFixed(6));
        const newLng = Number(pos.lng.toFixed(6));

        if (dragStartPinPosRef.current && dragStartPolygonPointsRef.current.length > 0) {
          const dLat = newLat - dragStartPinPosRef.current.lat;
          const dLng = newLng - dragStartPinPosRef.current.lng;

          const shifted = dragStartPolygonPointsRef.current.map((pt) => ({
            lat: Number((pt.lat + dLat).toFixed(6)),
            lng: Number((pt.lng + dLng).toFixed(6)),
          }));

          setCurrentPoints(shifted);
          currentPointsRef.current = shifted;
          if (onPolygonChange) onPolygonChange(shifted);
        }

        circle.setLatLng([newLat, newLng]);
        prevCoordsRef.current = { lat: newLat, lng: newLng };
        onCoordinatesChange(newLat, newLng);

        isDraggingPinRef.current = false;
        dragStartPinPosRef.current = null;
      });

      // Map Click: Relocate pin and move polygon together to clicked position
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        const newLat = Number(lat.toFixed(6));
        const newLng = Number(lng.toFixed(6));

        const prev = prevCoordsRef.current;
        const dLat = newLat - prev.lat;
        const dLng = newLng - prev.lng;

        marker.setLatLng([newLat, newLng]);
        circle.setLatLng([newLat, newLng]);
        prevCoordsRef.current = { lat: newLat, lng: newLng };
        onCoordinatesChange(newLat, newLng);

        // In polygon mode: shift the polygon to follow the new clicked location
        if (currentPointsRef.current.length > 0) {
          const shifted = currentPointsRef.current.map((pt) => ({
            lat: Number((pt.lat + dLat).toFixed(6)),
            lng: Number((pt.lng + dLng).toFixed(6)),
          }));
          setCurrentPoints(shifted);
          currentPointsRef.current = shifted;
          if (onPolygonChange) onPolygonChange(shifted);
        }
      });

      // Robust size invalidation
      const triggerInvalidate = () => {
        if (map && isMounted) {
          map.invalidateSize();
        }
      };

      triggerInvalidate();
      const t1 = setTimeout(triggerInvalidate, 100);
      const t2 = setTimeout(triggerInvalidate, 300);
      const t3 = setTimeout(triggerInvalidate, 700);

      window.addEventListener('resize', triggerInvalidate);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        window.removeEventListener('resize', triggerInvalidate);
      };
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync Center Marker, Circle & Shift Polygon on EXTERNAL coordinate changes (e.g. GPS auto-detect or manual typing)
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;
    if (isDraggingPinRef.current) return; // Don't interfere while actively dragging

    const prev = prevCoordsRef.current;
    const dLat = validLat - prev.lat;
    const dLng = validLng - prev.lng;

    if (Math.abs(dLat) > 0.000001 || Math.abs(dLng) > 0.000001) {
      prevCoordsRef.current = { lat: validLat, lng: validLng };

      markerRef.current.setLatLng([validLat, validLng]);
      circleRef.current.setLatLng([validLat, validLng]);
      mapInstanceRef.current.panTo([validLat, validLng], { animate: true, duration: 0.5 });

      // AUTOMATICALLY MOVE POLYGON ROOM TO FOLLOW NEW COORDINATES!
      if (currentPointsRef.current.length > 0) {
        const shifted = currentPointsRef.current.map((pt) => ({
          lat: Number((pt.lat + dLat).toFixed(6)),
          lng: Number((pt.lng + dLng).toFixed(6)),
        }));
        setCurrentPoints(shifted);
        currentPointsRef.current = shifted;
        if (onPolygonChange) onPolygonChange(shifted);
      }
    }
  }, [validLat, validLng, onPolygonChange]);

  // Sync Radius on circle
  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.setRadius(validRadius);
  }, [validRadius]);

  // Toggle Visibility between Circle and Polygon Layers
  useEffect(() => {
    if (!mapInstanceRef.current || !circleRef.current || !markerRef.current || !LRef.current) return;
    const map = mapInstanceRef.current;
    const L = LRef.current;

    if (activeMode === 'circle') {
      if (!map.hasLayer(circleRef.current)) map.addLayer(circleRef.current);
      if (!map.hasLayer(markerRef.current)) map.addLayer(markerRef.current);

      if (polygonLayerRef.current && map.hasLayer(polygonLayerRef.current)) {
        map.removeLayer(polygonLayerRef.current);
      }
      vertexMarkersRef.current.forEach((m) => {
        if (map.hasLayer(m)) map.removeLayer(m);
      });
      vertexMarkersRef.current = [];
    } else {
      if (map.hasLayer(circleRef.current)) map.removeLayer(circleRef.current);
      if (!map.hasLayer(markerRef.current)) map.addLayer(markerRef.current);
      renderPolygonLayers(map, L, currentPoints);
    }
  }, [activeMode, currentPoints, renderPolygonLayers]);

  // Switch Map Layer: Street vs Satellite
  const handleToggleMapType = () => {
    if (!mapInstanceRef.current || !LRef.current) return;
    const map = mapInstanceRef.current;
    const L = LRef.current;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    if (mapType === 'street') {
      const satLayer = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        { maxZoom: 21, subdomains: ['0', '1', '2', '3'] }
      ).addTo(map);
      currentTileLayerRef.current = satLayer;
      setMapType('satellite');
    } else {
      const streetLayer = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        { maxZoom: 21, subdomains: ['0', '1', '2', '3'] }
      ).addTo(map);
      currentTileLayerRef.current = streetLayer;
      setMapType('street');
    }
  };

  // Helper actions
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([validLat, validLng], 17, { animate: true, duration: 0.8 });
  };

  const handleFitBounds = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (activeMode === 'circle' && circleRef.current) {
      map.fitBounds(circleRef.current.getBounds(), { padding: [50, 50], maxZoom: 18 });
    } else if (activeMode === 'polygon' && polygonLayerRef.current) {
      map.fitBounds(polygonLayerRef.current.getBounds(), { padding: [50, 50], maxZoom: 18 });
    }
  };

  const handleZoom = (delta: number) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + delta);
  };

  const handleSwitchMode = (newMode: 'circle' | 'polygon') => {
    setActiveMode(newMode);
    activeModeRef.current = newMode;
    if (onModeChange) onModeChange(newMode);

    if (newMode === 'polygon' && (!currentPoints || currentPoints.length < 3)) {
      generateRegularPolygon(4, roomRadius);
    }
  };

  const handleRemoveLastPoint = () => {
    if (currentPoints.length <= 3) return;
    const updated = currentPoints.slice(0, -1);
    setCurrentPoints(updated);
    currentPointsRef.current = updated;
    if (onPolygonChange) onPolygonChange(updated);
  };

  const handleClearPolygon = () => {
    setCurrentPoints([]);
    currentPointsRef.current = [];
    if (onPolygonChange) onPolygonChange([]);
  };

  // Calculations
  const circleArea = Math.round(Math.PI * validRadius * validRadius);
  const polygonArea = calculatePolygonAreaSqMeters(currentPoints);
  const polygonPerimeter = calculatePolygonPerimeterMeters(currentPoints);
  const currentSidesCount = currentPoints.length >= 3 ? currentPoints.length : 4;

  return (
    <div
      className={`relative flex flex-col rounded-3xl border border-slate-200 overflow-hidden bg-slate-100 shadow-xl ${className}`}
    >
      {/* Top Controls & Status Bar */}
      <div className="z-10 bg-slate-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-white border-b border-slate-800">
        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => handleSwitchMode('circle')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-0 ${
              activeMode === 'circle'
                ? 'bg-[#0b4da2] text-white shadow-sm'
                : 'bg-transparent text-slate-400 hover:text-white'
            }`}
          >
            <CircleDot size={14} />
            <span>Circle Radius</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('polygon')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-0 ${
              activeMode === 'polygon'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Shapes size={14} />
            <span>Polygon / Room Area</span>
          </button>
        </div>

        {/* Live Area / Perimeter Badges */}
        <div className="flex items-center gap-2 text-xs">
          {activeMode === 'circle' ? (
            <>
              <span className="font-mono text-[11px] bg-blue-950 text-blue-300 border border-blue-800 px-2.5 py-1 rounded-lg font-bold">
                Radius: {validRadius}m
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                Area: {circleArea.toLocaleString()} m²
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-[11px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2.5 py-1 rounded-lg font-bold">
                {currentPoints.length} Vertices
              </span>
              <span className="text-[11px] text-indigo-200 font-mono hidden sm:inline">
                Area: {polygonArea.toLocaleString()} m² ({Math.round(polygonArea * 10.7639).toLocaleString()} sqft)
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                Perimeter: {polygonPerimeter}m
              </span>
            </>
          )}
        </div>
      </div>

      {/* Polygon Quick Tools Bar (Only visible in Polygon mode) */}
      {activeMode === 'polygon' && (
        <div className="z-10 bg-indigo-950 px-4 py-2.5 flex flex-col gap-2 border-b border-indigo-900 text-xs text-white">
          {/* Row 1: Dynamic Sides Stepper & Shape Presets (All auto-centered at Main Point) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Dynamic Sides Stepper */}
              <div className="flex items-center gap-1 bg-indigo-900/90 px-2 py-1 rounded-xl border border-indigo-700/80 shadow-xs">
                <span className="text-indigo-200 text-[11px] font-bold mr-1">
                  Sides:
                </span>
                <button
                  type="button"
                  onClick={() => generateRegularPolygon(currentSidesCount - 1)}
                  disabled={currentSidesCount <= 3}
                  className="w-6 h-6 rounded-lg bg-indigo-800 hover:bg-indigo-700 disabled:opacity-40 text-white font-black flex items-center justify-center cursor-pointer border-0 transition"
                  title="Decrease sides"
                >
                  <Minus size={13} />
                </button>
                <span className="font-mono font-black text-amber-300 px-2 text-xs min-w-[22px] text-center">
                  {currentSidesCount}
                </span>
                <button
                  type="button"
                  onClick={() => generateRegularPolygon(currentSidesCount + 1)}
                  disabled={currentSidesCount >= 12}
                  className="w-6 h-6 rounded-lg bg-indigo-800 hover:bg-indigo-700 disabled:opacity-40 text-white font-black flex items-center justify-center cursor-pointer border-0 transition"
                  title="Increase sides"
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Quick Shape Presets */}
              <div className="hidden sm:flex items-center gap-1">
                {[
                  { sides: 3, label: '3 (Triangle)' },
                  { sides: 4, label: '4 (Square Room)' },
                  { sides: 5, label: '5 (Pentagon)' },
                  { sides: 6, label: '6 (Hexagon)' },
                  { sides: 8, label: '8 (Octagon)' },
                ].map((s) => (
                  <button
                    key={s.sides}
                    type="button"
                    onClick={() => generateRegularPolygon(s.sides)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                      currentSidesCount === s.sides
                        ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-xs'
                        : 'bg-indigo-900/60 text-indigo-200 border-indigo-700/60 hover:bg-indigo-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Room Size Presets */}
              <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-700 text-[10px]">
                <span className="text-slate-400 font-semibold mr-0.5">Size:</span>
                {[20, 30, 50].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      setRoomRadius(sz);
                      generateRegularPolygon(currentSidesCount, sz);
                    }}
                    className={`px-1.5 py-0.5 rounded font-mono transition border cursor-pointer ${
                      roomRadius === sz
                        ? 'bg-blue-600 text-white border-blue-500 font-bold'
                        : 'bg-transparent text-slate-300 border-transparent hover:text-white'
                    }`}
                  >
                    {sz}m
                  </button>
                ))}
              </div>
            </div>

            {/* Hint */}
            <div className="text-[10px] text-amber-300/90 font-medium flex items-center gap-1">
              <Sparkles size={11} className="text-amber-400 shrink-0" />
              <span>Each shape is automatically centered on the main office pin</span>
            </div>
          </div>

          {/* Row 2: Alignment, Add/Undo, and Reset actions */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-indigo-900/60">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Center Room on Pin */}
              <button
                type="button"
                onClick={centerPolygonOnPin}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition border border-blue-400 cursor-pointer inline-flex items-center gap-1 shadow-xs"
                title="Center room boundary directly onto the office pin"
              >
                <Target size={13} className="text-amber-300" />
                <span>Center Room on Pin</span>
              </button>

              {/* Align Pin to Room Center */}
              <button
                type="button"
                onClick={autoAlignPinToRoomCenter}
                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] transition border border-emerald-500 cursor-pointer inline-flex items-center gap-1 shadow-xs"
                title="Align the office pin to the geometric center of the room"
              >
                <MapPin size={12} className="text-emerald-200" />
                <span>Align Pin to Room Center</span>
              </button>

              {/* Add Corner Point */}
              <button
                type="button"
                onClick={handleAddCornerPoint}
                className="px-2.5 py-1 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white font-medium text-[11px] transition border border-indigo-600 cursor-pointer inline-flex items-center gap-1"
                title="Add a new corner vertex"
              >
                <Plus size={12} />
                <span>Add Corner</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {currentPoints.length > 3 && (
                <button
                  type="button"
                  onClick={handleRemoveLastPoint}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] transition border border-slate-700 cursor-pointer inline-flex items-center gap-1"
                  title="Remove the last corner vertex"
                >
                  <RotateCcw size={12} />
                  <span>Undo Point</span>
                </button>
              )}
              {currentPoints.length > 0 && (
                <button
                  type="button"
                  onClick={() => generateRegularPolygon(4, roomRadius)}
                  className="px-2 py-1 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 font-medium text-[11px] transition border border-indigo-700/60 cursor-pointer"
                  title="Reset to 4-side room"
                >
                  Reset 4-Side Room
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map Canvas with Definite Inline Height */}
      <div className="relative w-full overflow-hidden bg-slate-200" style={{ height: minHeight, minHeight }}>
        <div
          ref={mapContainerRef}
          className="w-full h-full z-0 cursor-crosshair"
          style={{ height: '100%', minHeight, width: '100%' }}
        />

        {/* Floating Map Navigation Controls */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xl">
          <button
            type="button"
            onClick={handleToggleMapType}
            title={mapType === 'street' ? 'Switch to Satellite View' : 'Switch to Street View'}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:text-[#0b4da2] hover:bg-blue-50 transition cursor-pointer border-0 bg-transparent"
          >
            {mapType === 'street' ? <Satellite size={16} /> : <MapIcon size={16} />}
          </button>
          <div className="h-px bg-slate-200 my-0.5" />
          <button
            type="button"
            onClick={handleRecenter}
            title="Center on Office Pin"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:text-[#0b4da2] hover:bg-blue-50 transition cursor-pointer border-0 bg-transparent"
          >
            <Crosshair size={16} />
          </button>
          <button
            type="button"
            onClick={handleFitBounds}
            title="Fit Boundary to Screen"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:text-[#0b4da2] hover:bg-blue-50 transition cursor-pointer border-0 bg-transparent"
          >
            <Maximize2 size={15} />
          </button>
          <div className="h-px bg-slate-200 my-0.5" />
          <button
            type="button"
            onClick={() => handleZoom(1)}
            title="Zoom In"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:text-[#0b4da2] hover:bg-blue-50 transition cursor-pointer border-0 bg-transparent"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-1)}
            title="Zoom Out"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:text-[#0b4da2] hover:bg-blue-50 transition cursor-pointer border-0 bg-transparent"
          >
            <ZoomOut size={16} />
          </button>
        </div>

        {/* Legend Box */}
        <div className="absolute bottom-4 left-4 z-[400] bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-md text-xs flex items-center gap-2.5 max-w-[85%] sm:max-w-none">
          {activeMode === 'circle' ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-[#0b4da2] bg-blue-500/30 shrink-0" />
              <span className="text-slate-700 font-medium">
                Blue circle covers <strong>{validRadius}m radius</strong> from center
              </span>
            </>
          ) : (
            <>
              <div className="w-3.5 h-3.5 rounded-md border-2 border-indigo-600 bg-indigo-500/30 shrink-0" />
              <span className="text-slate-700 font-medium">
                Room perimeter: <strong>{currentPoints.length} corner vertices</strong> ({polygonArea} m²)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Footer Info Bar */}
      <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-600">
        <div className="flex items-center gap-2 font-mono">
          <MapPin size={13} className="text-[#0b4da2] shrink-0" />
          <span>
            Office Center: <strong>{validLat.toFixed(6)}</strong>, <strong>{validLng.toFixed(6)}</strong>
          </span>
        </div>
        <div className="text-slate-500 text-[11px]">
          {activeMode === 'circle' ? (
            <span>💡 Click map or drag center pin. Slider adjusts radius.</span>
          ) : (
            <span>💡 Use + / - to adjust sides. Move pin or click map to reposition entire room.</span>
          )}
        </div>
      </div>
    </div>
  );
}
