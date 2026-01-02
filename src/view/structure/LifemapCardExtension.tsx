import React, { useState, useEffect, useRef } from "react";
import { Node, NodeViewProps, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

// Generate a unique ID for each card instance
const generateCardId = () => `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const interFontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";

// Individual card data type
interface CardData {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
}

// Single Card Component (used within the row)
const SingleCard = ({ 
  card, 
  onUpdate, 
  onDelete,
  showDelete,
}: { 
  card: CardData; 
  onUpdate: (updates: Partial<CardData>) => void;
  onDelete: () => void;
  showDelete: boolean;
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(card.title);
  const [editedDescription, setEditedDescription] = useState(card.description);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedTitle(card.title);
  }, [card.title]);

  useEffect(() => {
    setEditedDescription(card.description);
  }, [card.description]);

  const handleTitleSubmit = () => {
    onUpdate({ title: editedTitle });
    setIsEditingTitle(false);
  };

  const handleDescriptionSubmit = () => {
    onUpdate({ description: editedDescription });
    setIsEditingDescription(false);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      alert(`File size exceeds maximum allowed (${MAX_IMAGE_SIZE / (1024 * 1024)}MB)`);
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch(
        `/api/upload?filename=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          body: file,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const blob = await response.json();
      onUpdate({ imageUrl: blob.url });
    } catch (error) {
      console.error('[LifemapCard] Image upload failed:', error);
      alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Box shadow with light source from top-right (shadows cast to bottom-left)
  const groupBoxShadow = '-2px 3px 6px -1px rgba(0, 0, 0, 0.25), -4px 6px 12px -2px rgba(0, 0, 0, 0.2), -8px 12px 24px -3px rgba(0, 0, 0, 0.15)';

  return (
    <Card sx={{ 
      width: 280, 
      minWidth: 280, 
      flexShrink: 0,
      position: 'relative',
      borderRadius: '10px',
      boxShadow: groupBoxShadow,
      transition: 'box-shadow 0.2s ease',
      '&:hover': {
        boxShadow: groupBoxShadow,
      },
    }}>
      {/* Delete button */}
      {showDelete && (
        <IconButton
          size="small"
          onClick={onDelete}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            zIndex: 10,
            backgroundColor: 'rgba(255,255,255,0.9)',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,1)',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Clickable Image Area */}
      <CardMedia
        sx={{ 
          height: 180, 
          cursor: 'pointer',
          backgroundColor: card.imageUrl ? 'transparent' : '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          '&:hover': {
            opacity: 0.9,
          },
        }}
        image={card.imageUrl || undefined}
        title={editedTitle}
        onClick={handleImageClick}
      >
        {isUploading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={24} />
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: interFontFamily }}>
              Uploading...
            </Typography>
          </Box>
        ) : !card.imageUrl && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: interFontFamily, fontSize: '0.8rem' }}>
              🖼️ Click to upload
            </Typography>
          </Box>
        )}
      </CardMedia>

      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Editable Title */}
        {isEditingTitle ? (
          <TextField
            fullWidth
            variant="standard"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') {
                setEditedTitle(card.title);
                setIsEditingTitle(false);
              }
            }}
            autoFocus
            sx={{ 
              mb: 0.5,
              '& .MuiInputBase-input': {
                fontFamily: interFontFamily,
                fontSize: '1rem',
              },
            }}
          />
        ) : (
          <Typography 
            variant="subtitle1" 
            component="div"
            onClick={() => setIsEditingTitle(true)}
            sx={{ 
              cursor: 'pointer', 
              '&:hover': { backgroundColor: 'action.hover' }, 
              borderRadius: 1, 
              px: 0.5,
              fontFamily: interFontFamily,
              fontWeight: 500,
              fontSize: '0.95rem',
              lineHeight: 1.3,
            }}
          >
            {editedTitle || 'Click to add title...'}
          </Typography>
        )}

        {/* Editable Description */}
        {isEditingDescription ? (
          <TextField
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            size="small"
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            onBlur={handleDescriptionSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditedDescription(card.description);
                setIsEditingDescription(false);
              }
            }}
            autoFocus
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: interFontFamily,
                fontSize: '0.8rem',
              },
            }}
          />
        ) : (
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'action.hover' },
              borderRadius: 1,
              px: 0.5,
              minHeight: 32,
              fontFamily: interFontFamily,
              fontSize: '0.8rem',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            onClick={() => setIsEditingDescription(true)}
          >
            {editedDescription || 'Click to add description...'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// Skeleton Card with Add Button
const AddCardSkeleton = ({ onClick }: { onClick: () => void }) => (
  <Card 
    onClick={onClick}
    sx={{ 
      width: 280, 
      minWidth: 280, 
      height: 260,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      backgroundColor: '#fafafa',
      border: '2px dashed #e0e0e0',
      boxShadow: 'none',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: '#f0f0f0',
        borderColor: '#bdbdbd',
      },
    }}
  >
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          backgroundColor: '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: '#d0d0d0',
          },
        }}
      >
        <AddIcon sx={{ fontSize: 28, color: '#757575' }} />
      </Box>
      <Typography 
        variant="body2" 
        sx={{ 
          color: 'text.secondary', 
          fontFamily: interFontFamily,
          fontSize: '0.85rem',
        }}
      >
        Add Card
      </Typography>
    </Box>
  </Card>
);

// Main Card Row Component
const LifemapCardRowNodeView = ({ node, updateAttributes, selected }: NodeViewProps) => {
  const { rowId, cards: cardsJson } = node.attrs;
  
  // Parse cards from JSON string
  const [cards, setCards] = useState<CardData[]>(() => {
    try {
      return cardsJson ? JSON.parse(cardsJson) : [createDefaultCard()];
    } catch {
      return [createDefaultCard()];
    }
  });

  // Create a default card
  function createDefaultCard(): CardData {
    return {
      id: generateCardId(),
      title: 'New Card',
      description: 'Click to edit description...',
      imageUrl: '',
    };
  }

  // Save cards to attributes
  const saveCards = (newCards: CardData[]) => {
    setCards(newCards);
    updateAttributes({ cards: JSON.stringify(newCards) });
  };

  // Add a new card
  const addCard = () => {
    const newCards = [...cards, createDefaultCard()];
    saveCards(newCards);
  };

  // Update a specific card
  const updateCard = (cardId: string, updates: Partial<CardData>) => {
    const newCards = cards.map(card => 
      card.id === cardId ? { ...card, ...updates } : card
    );
    saveCards(newCards);
  };

  // Delete a card
  const deleteCard = (cardId: string) => {
    if (cards.length <= 1) return; // Keep at least one card
    const newCards = cards.filter(card => card.id !== cardId);
    saveCards(newCards);
  };

  return (
    <NodeViewWrapper style={{ outline: 'none' }}>
      <Box
        sx={{
          position: 'relative',
          outline: 'none',
          borderRadius: 2,
          // Selection overlay effect
          '&::after': selected ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 1,
          } : {},
        }}
      >
        {/* Inner scrollable container with padding for shadows */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            py: 4, // Vertical padding for shadows
            px: 3, // Horizontal padding for shadows
            mx: -3, // Negative margin to counteract padding for full-width scroll
            // Hide scrollbar but keep scroll functionality
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
            '&::-webkit-scrollbar': {
              display: 'none', // Chrome/Safari/Opera
            },
          }}
        >
          {/* Render existing cards */}
          {cards.map((card) => (
            <SingleCard
              key={card.id}
              card={card}
              onUpdate={(updates) => updateCard(card.id, updates)}
              onDelete={() => deleteCard(card.id)}
              showDelete={cards.length > 1}
            />
          ))}
          
          {/* Add card skeleton */}
          <AddCardSkeleton onClick={addCard} />
        </Box>
      </Box>
    </NodeViewWrapper>
  );
};

export const LifemapCardExtension = Node.create({
  name: "lifemapCard",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      rowId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-row-id'),
        renderHTML: (attributes) => ({
          'data-row-id': attributes.rowId,
        }),
      },
      cards: {
        default: JSON.stringify([{
          id: generateCardId(),
          title: 'New Card',
          description: 'Click to edit description...',
          imageUrl: '',
        }]),
        parseHTML: (element) => element.getAttribute('data-cards'),
        renderHTML: (attributes) => ({
          'data-cards': attributes.cards,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="lifemap-card"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'lifemap-card' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LifemapCardRowNodeView);
  },

  addCommands() {
    return {
      insertLifemapCard:
        (attrs?: { title?: string; description?: string; imageUrl?: string }) =>
        ({ commands }) => {
          const initialCard = {
            id: generateCardId(),
            title: attrs?.title || 'New Card',
            description: attrs?.description || 'Click to edit description...',
            imageUrl: attrs?.imageUrl || '',
          };
          return commands.insertContent({
            type: this.name,
            attrs: {
              rowId: generateCardId(),
              cards: JSON.stringify([initialCard]),
            },
          });
        },
    };
  },
});
