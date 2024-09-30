import React, { useState, useRef, useEffect } from 'react';
import { Quanta } from '../../core/Quanta';
import { motion } from 'framer-motion';
import { borderRadius } from '../Theme';
import { DragRing } from '../controls/DragRing';

interface QuantaProps {
  quantaId: string;
  userId: string;
  onQuantaIdChange: (newId: string) => void;
}

const QuantaItem: React.FC<QuantaProps> = ({ quantaId, userId, onQuantaIdChange }) => {
  const handleQuantaIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onQuantaIdChange(event.target.value);
  };

  return (
    <div
      style={{
        width: '300px',
        height: '800px',
        flexShrink: 0,
        padding: '10px',
        boxSizing: 'border-box',
        border: '1px solid #ddd',
        borderRadius: borderRadius,
        background: '#fff',
        marginRight: '10px',
        position: 'relative',
      }}
    >
      <input
        type="text"
        value={quantaId}
        onChange={handleQuantaIdChange}
        style={{
          border: '1.5px solid #34343430',
          borderRadius: borderRadius,
          outline: 'none',
          backgroundColor: 'transparent',
          width: '80px',
          position: 'absolute',
          top: '5px',
          left: '5px',
          zIndex: 1,
        }}
      />
      <Quanta quantaId={quantaId} userId={userId} />
    </div>
  );
};

interface HorizontalQuantaSectionProps {
  editor: any;
  updateAttributes: (attrs: Record<string, any>) => void;
  quantaIds: string[];
}

export const HorizontalQuantaSection: React.FC<HorizontalQuantaSectionProps> = ({ editor, updateAttributes, quantaIds: initialQuantaIds }) => {
  const [quantaIds, setQuantaIds] = useState<string[]>(initialQuantaIds);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleQuantaIdChange = (index: number, newId: string) => {
    const newQuantaIds = [...quantaIds];
    newQuantaIds[index] = newId;
    setQuantaIds(newQuantaIds);
    updateAttributes({ quantaIds: newQuantaIds });
  };

  useEffect(() => {
    setQuantaIds(initialQuantaIds);
  }, [initialQuantaIds]);

  return (
    <div
      style={{
        width: '100%',
        height: '800px',
        padding: '20px',
        boxSizing: 'border-box',
        position: 'relative',
        overflowX: 'visible',
      }}
    >
      <DragRing editor={editor} />
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          overflowX: 'visible',
          overflowY: 'hidden',
          whiteSpace: 'nowrap',
          borderRadius: borderRadius,
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {quantaIds.map((quantaId, index) => (
          <QuantaItem
            key={index}
            quantaId={quantaId}
            userId="user-id"
            onQuantaIdChange={(newId) => handleQuantaIdChange(index, newId)}
          />
        ))}
      </div>
    </div>
  );
};