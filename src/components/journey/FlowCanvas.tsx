"use client";

import "@xyflow/react/dist/style.css";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import s from "./flow.module.css";

export interface FlowCanvasProps {
    nodes: Node[];
    edges: Edge[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    label: string;
    animated: boolean;
}

/** Loaded on demand: xyflow and its stylesheet stay out of the initial bundle. */
export default function FlowCanvas({ nodes, edges, selectedId, onSelect, label, animated }: FlowCanvasProps) {
    const shown = nodes.map((n) => ({ ...n, selected: n.id === selectedId }));
    return (
        <div className={s.flow} role="group" aria-label={label}>
            <ReactFlow
                nodes={shown}
                edges={edges.map((e) => ({ ...e, animated: animated && e.animated }))}
                fitView
                fitViewOptions={{ padding: 0.12 }}
                minZoom={0.3}
                maxZoom={1.6}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable
                colorMode="light"
                onSelectionChange={({ nodes: sel }) => {
                    const id = sel[0]?.id ?? null;
                    if (id !== selectedId) onSelect(id);
                }}
                onPaneClick={() => onSelect(null)}
            >
                <Background gap={28} size={1} color="#d9dce6" />
                <Controls showInteractive={false} position="bottom-right" />
            </ReactFlow>
        </div>
    );
}
