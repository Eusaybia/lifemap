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

// Generate a unique ID for each card instance
const generateCardId = () => `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const LifemapCardNodeView = ({ node, updateAttributes }: NodeViewProps) => {
  const { cardId, title, description, imageUrl } = node.attrs;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedDescription, setEditedDescription] = useState(description);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with node attributes
  useEffect(() => {
    setEditedTitle(title);
  }, [title]);

  useEffect(() => {
    setEditedDescription(description);
  }, [description]);

  const handleTitleSubmit = () => {
    updateAttributes({ title: editedTitle });
    setIsEditingTitle(false);
  };

  const handleDescriptionSubmit = () => {
    updateAttributes({ description: editedDescription });
    setIsEditingDescription(false);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      alert(`File size exceeds maximum allowed (${MAX_IMAGE_SIZE / (1024 * 1024)}MB)`);
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Vercel Blob via API route
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
      
      // Update the card's image URL
      updateAttributes({ imageUrl: blob.url });
    } catch (error) {
      console.error('[LifemapCard] Image upload failed:', error);
      alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <NodeViewWrapper>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <Card sx={{ maxWidth: 345, my: 2 }}>
        {/* Clickable Image Area */}
        <CardMedia
          sx={{ 
            height: 140, 
            cursor: 'pointer',
            backgroundColor: imageUrl ? 'transparent' : '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            '&:hover': {
              opacity: 0.9,
            },
          }}
          image={imageUrl || undefined}
          title={editedTitle}
          onClick={handleImageClick}
        >
          {isUploading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={32} />
              <Typography variant="caption" color="text.secondary">
                Uploading...
              </Typography>
            </Box>
          ) : !imageUrl && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                🖼️ Click to upload image
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Max 5MB
              </Typography>
            </Box>
          )}
        </CardMedia>

        <CardContent>
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
                  setEditedTitle(title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              sx={{ mb: 1 }}
            />
          ) : (
            <Typography 
              gutterBottom 
              variant="h5" 
              component="div"
              onClick={() => setIsEditingTitle(true)}
              sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' }, borderRadius: 1, px: 0.5 }}
            >
              {editedTitle}
            </Typography>
          )}

          {/* Editable Description */}
          {isEditingDescription ? (
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              size="small"
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleDescriptionSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditedDescription(description);
                  setIsEditingDescription(false);
                }
              }}
              autoFocus
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
                minHeight: 40,
              }}
              onClick={() => setIsEditingDescription(true)}
            >
              {editedDescription || 'Click to add description...'}
            </Typography>
          )}
        </CardContent>
      </Card>
    </NodeViewWrapper>
  );
};

export const LifemapCardExtension = Node.create({
  name: "lifemapCard",
  group: "block",
  atom: true, // Treat as a single unit (no nested content editing via Tiptap)

  addAttributes() {
    return {
      cardId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-card-id'),
        renderHTML: (attributes) => ({
          'data-card-id': attributes.cardId,
        }),
      },
      title: {
        default: 'Lizard',
        parseHTML: (element) => element.getAttribute('data-title'),
        renderHTML: (attributes) => ({
          'data-title': attributes.title,
        }),
      },
      description: {
        default: 'Lizards are a widespread group of squamate reptiles, with over 6,000 species, ranging across all continents except Antarctica',
        parseHTML: (element) => element.getAttribute('data-description'),
        renderHTML: (attributes) => ({
          'data-description': attributes.description,
        }),
      },
      imageUrl: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-image-url'),
        renderHTML: (attributes) => ({
          'data-image-url': attributes.imageUrl,
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
    return ReactNodeViewRenderer(LifemapCardNodeView);
  },

  addCommands() {
    return {
      insertLifemapCard:
        (attrs?: { title?: string; description?: string; imageUrl?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              cardId: generateCardId(),
              title: attrs?.title || 'Lizard',
              description: attrs?.description || 'Lizards are a widespread group of squamate reptiles, with over 6,000 species, ranging across all continents except Antarctica',
              imageUrl: attrs?.imageUrl || '',
            },
          });
        },
    };
  },
});
