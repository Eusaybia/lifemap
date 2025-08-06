import React, { useEffect, useRef, useState } from 'react';

export interface FieldConnection {
  from: string;
  to: string;
}

export class FieldConnectorManager {
  private connections: FieldConnection[] = [];
  private pendingConnection: string | null = null;
  private onConnectionsChanged: ((connections: FieldConnection[]) => void) | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // Make this available globally for the onclick handlers
    (window as any).fieldConnector = this;
  }

  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Use event delegation to handle clicks on field handles
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('field-handle')) {
        const fieldId = target.getAttribute('data-field-id');
        if (fieldId) {
          this.handleFieldHandleClick(fieldId, event);
        }
      }
    });
  }

  setConnectionsChangedCallback(callback: (connections: FieldConnection[]) => void) {
    this.onConnectionsChanged = callback;
  }

  handleFieldHandleClick(fieldId: string, event: Event) {
    event.stopPropagation();
    event.preventDefault();

    console.log('Handle clicked for field:', fieldId);

    if (this.pendingConnection === null) {
      // Start a new connection
      this.pendingConnection = fieldId;
      this.highlightField(fieldId, 'source');
      this.activateHandle(fieldId);
      console.log('Started connection from field:', fieldId);
    } else if (this.pendingConnection === fieldId) {
      // Cancel connection
      this.pendingConnection = null;
      this.clearHighlights();
      this.deactivateAllHandles();
      console.log('Cancelled connection');
    } else {
      // Complete connection
      const newConnection: FieldConnection = {
        from: this.pendingConnection,
        to: fieldId
      };
      
      // Check if connection already exists
      const exists = this.connections.some(conn => 
        (conn.from === newConnection.from && conn.to === newConnection.to) ||
        (conn.from === newConnection.to && conn.to === newConnection.from)
      );

      if (!exists) {
        this.connections.push(newConnection);
        console.log('Created connection:', newConnection);
        this.onConnectionsChanged?.(this.connections);
      } else {
        console.log('Connection already exists');
      }

      this.pendingConnection = null;
      this.clearHighlights();
      this.deactivateAllHandles();
    }
  }

  private activateHandle(fieldId: string) {
    const handle = document.querySelector(`Field[data-field-id="${fieldId}"] .field-handle`) as HTMLElement;
    if (handle) {
      handle.textContent = '●'; // Filled circle
      handle.style.color = '#2196F3';
      handle.style.transform = 'scale(1.2)';
    }
  }

  private deactivateAllHandles() {
    const handles = document.querySelectorAll('.field-handle');
    handles.forEach((handle) => {
      const htmlHandle = handle as HTMLElement;
      htmlHandle.textContent = '⚬'; // Empty circle
      htmlHandle.style.color = '';
      htmlHandle.style.transform = '';
    });
  }

  private highlightField(fieldId: string, type: 'source' | 'target') {
    const field = document.querySelector(`Field[data-field-id="${fieldId}"]`) as HTMLElement;
    if (field) {
      field.style.outline = type === 'source' ? '2px solid #2196F3' : '2px solid #4CAF50';
    }
  }

  private clearHighlights() {
    const fields = document.querySelectorAll('Field[data-field-id]');
    fields.forEach((field) => {
      (field as HTMLElement).style.outline = '';
    });
  }

  getConnections(): FieldConnection[] {
    return [...this.connections];
  }

  removeConnection(from: string, to: string) {
    this.connections = this.connections.filter(conn => 
      !(conn.from === from && conn.to === to) &&
      !(conn.from === to && conn.to === from)
    );
    this.onConnectionsChanged?.(this.connections);
  }

  clearAllConnections() {
    this.connections = [];
    this.onConnectionsChanged?.(this.connections);
  }
}

export interface FieldConnectionOverlayProps {
  connections: FieldConnection[];
  containerRef: React.RefObject<HTMLElement>;
}

export const FieldConnectionOverlay: React.FC<FieldConnectionOverlayProps> = ({ 
  connections, 
  containerRef 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const updateDimensions = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: containerRef.current.scrollWidth,
        height: containerRef.current.scrollHeight
      });
    }
  };

  useEffect(() => {
    updateDimensions();
    
    // Throttle updates to avoid excessive re-renders
    let updateTimeout: NodeJS.Timeout;
    const throttledUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(updateDimensions, 100);
    };
    
    const handleResize = () => throttledUpdate();
    const handleScroll = () => throttledUpdate();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Update when content changes
    const observer = new MutationObserver(throttledUpdate);
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }

    // Force updates when connections change
    updateDimensions();

    return () => {
      clearTimeout(updateTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [containerRef, connections]);

  const getFieldPosition = (fieldId: string) => {
    const field = document.querySelector(`Field[data-field-id="${fieldId}"]`);
    if (!field || !containerRef.current) return null;

    const fieldRect = field.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    return {
      x: fieldRect.right - containerRect.left + containerRef.current.scrollLeft,
      y: fieldRect.top + fieldRect.height / 2 - containerRect.top + containerRef.current.scrollTop
    };
  };

  const renderConnections = () => {
    return connections.map((connection, index) => {
      const fromPos = getFieldPosition(connection.from);
      const toPos = getFieldPosition(connection.to);

      if (!fromPos || !toPos) return null;

      // Calculate control points for curved line
      const midX = (fromPos.x + toPos.x) / 2;
      const curve = Math.abs(toPos.x - fromPos.x) * 0.5;
      
      const pathData = `M ${fromPos.x} ${fromPos.y} Q ${midX} ${fromPos.y - curve} ${toPos.x} ${toPos.y}`;

      return (
        <g key={`${connection.from}-${connection.to}-${index}`}>
          <path
            d={pathData}
            stroke="#2196F3"
            strokeWidth="2"
            fill="none"
            strokeDasharray="5,5"
            opacity="0.7"
          />
          <circle
            cx={fromPos.x}
            cy={fromPos.y}
            r="3"
            fill="#2196F3"
          />
          <circle
            cx={toPos.x}
            cy={toPos.y}
            r="3"
            fill="#4CAF50"
          />
        </g>
      );
    });
  };

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: dimensions.width,
        height: dimensions.height,
        pointerEvents: 'none',
        zIndex: 1
      }}
    >
      {renderConnections()}
    </svg>
  );
};

// Hook to use the field connector
export const useFieldConnector = () => {
  const [connectorManager] = useState(() => new FieldConnectorManager());
  const [connections, setConnections] = useState<FieldConnection[]>([]);

  useEffect(() => {
    connectorManager.setConnectionsChangedCallback(setConnections);
    connectorManager.initialize(); // Initialize event listeners
  }, [connectorManager]);

  return {
    connectorManager,
    connections
  };
};