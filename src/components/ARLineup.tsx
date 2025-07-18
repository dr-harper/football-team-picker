import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createRoot } from 'react-dom/client';
import PlayerIcon from './PlayerIcon';
import { positionsByTeamSizeAndSide } from '../constants/positionsConstants';
import type { Player, Team } from '../types';

interface ARLineupProps {
    teams: Team[];
    onClose: () => void;
}

const convertToWorld = (top: string, left: string, width = 2, height = 1) => {
    const x = (parseFloat(left) / 100 - 0.5) * width;
    const z = (0.5 - parseFloat(top) / 100) * height;
    return { x, z };
};

const ARLineup: React.FC<ARLineupProps> = ({ teams, onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera();
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        container.appendChild(renderer.domElement);
        container.appendChild(ARButton.createButton(renderer));

        const labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(window.innerWidth, window.innerHeight);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0';
        container.appendChild(labelRenderer.domElement);

        const fieldGroup = new THREE.Group();
        fieldGroup.position.set(0, -0.5, -2);
        scene.add(fieldGroup);

        teams.slice(0, 2).forEach((team, idx) => {
            const side = idx === 0 ? 'left' : 'right';
            const positions =
                positionsByTeamSizeAndSide[team.players.length]?.[side] || [];
            team.players.forEach((player: Player, pIdx: number) => {
                const slot = positions[pIdx];
                if (!slot) return;
                const { x, z } = convertToWorld(slot.top, slot.left);
                const div = document.createElement('div');
                div.style.width = '64px';
                div.style.height = '64px';
                const root = createRoot(div);
                root.render(
                    <PlayerIcon
                        color={team.color}
                        number={player.shirtNumber}
                        name={player.name}
                        isGoalkeeper={player.isGoalkeeper}
                    />
                );
                const obj = new CSS2DObject(div);
                obj.position.set(x, 0, z);
                fieldGroup.add(obj);
            });
        });

        const renderScene = () => {
            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);
        };

        renderer.setAnimationLoop(renderScene);

        return () => {
            renderer.setAnimationLoop(null);
            container.innerHTML = '';
        };
    }, [teams]);

    return (
        <div ref={containerRef} className="fixed inset-0 z-50">
            <button
                className="absolute top-2 right-2 bg-white text-black px-3 py-1 rounded"
                onClick={onClose}
            >
                Close AR
            </button>
        </div>
    );
};

export default ARLineup;
