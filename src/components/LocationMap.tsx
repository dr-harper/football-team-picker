import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface Props {
    lat: number;
    lon: number;
    height?: number;
    zoom?: number;
    showMarker?: boolean;
}

const LocationMap: React.FC<Props> = ({ lat, lon, height = 140, zoom = 15, showMarker = true }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
        const map = L.map(containerRef.current, {
            center: [lat, lon],
            zoom,
            zoomControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            attributionControl: false,
        });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            subdomains: 'abcd',
            maxZoom: 19,
        }).addTo(map);
        if (showMarker) L.marker([lat, lon], { icon }).addTo(map);
        mapRef.current = map;
        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [lat, lon, showMarker, zoom]);

    return <div ref={containerRef} style={{ height, width: '100%' }} />;
};

export default LocationMap;
