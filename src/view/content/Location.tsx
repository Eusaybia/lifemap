import './styles.scss';
import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Map from 'react-map-gl';
import { SearchBox } from '@mapbox/search-js-react';

export const mapboxAccessToken = 'pk.eyJ1IjoidGhlYXVzc2llc3RldyIsImEiOiJjbGd1ZW1qaHowZmZsM3NudWdvYTY0c255In0.T7PzJ-D4ifBUDtbnRNbXFA';

mapboxgl.accessToken = mapboxAccessToken

interface LocationProps {
    location: string
}

export const Location: React.FC<LocationProps> = (props: LocationProps) => {
    const [lng, setLng] = useState(151.21512);
    const [lat, setLat] = useState(-33.861344);
    const [zoom, setZoom] = useState(9);

    return (
        <div style={{borderRadius: 5, overflow: "hidden"}}>
            <Map
                mapboxAccessToken={mapboxAccessToken}
                initialViewState={{
                    longitude: lng,
                    latitude: lat,
                    zoom:zoom 
                }}
                style={{ width: "auto", height: 400 }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
            />
        </div>
    );
}
