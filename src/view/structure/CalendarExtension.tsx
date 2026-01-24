'use client'

import React, { memo } from "react";
import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { motion } from 'framer-motion';
import { NodeOverlay } from "../components/NodeOverlay";

// ============================================================================
// Constants
// ============================================================================

const TOTAL_DAYS = 28;

// Quarter days (moon phases)
const QUARTER_DAYS: Record<number, string> = {
  1: '🌑',
  8: '🌓',
  15: '🌕',
  22: '🌗',
};

// ============================================================================
// Helper Functions
// ============================================================================

const generateCalendarId = () => `lunar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============================================================================
// Day Cell Component - Embeds a Quanta via iframe
// ============================================================================

interface DayCellProps {
  dayNumber: number;
  quantaId: string;
}

const DayCell = memo(({ dayNumber, quantaId }: DayCellProps) => {
  const quarterEmoji = QUARTER_DAYS[dayNumber];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 180,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Day Header */}
      <div
        style={{
          padding: '6px 10px',
          backgroundColor: '#f3f4f6',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {quarterEmoji && <span>{quarterEmoji}</span>}
        <span
          style={{
            fontWeight: 500,
            color: '#374151',
            fontSize: '0.85rem',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Day {dayNumber}
        </span>
      </div>

      {/* Quanta Content - Embedded iframe */}
      <div style={{ flex: 1, position: 'relative', minHeight: 140 }}>
        <iframe
          src={`/q/${quantaId}?mode=graph`}
          title={`Day ${dayNumber}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      </div>
    </motion.div>
  );
});

DayCell.displayName = 'DayCell';

// ============================================================================
// Calendar View Component
// ============================================================================

const CalendarNodeView = (props: NodeViewProps) => {
  const { node, selected } = props;
  const { calendarId } = node.attrs;
  
  // Use local state for instantiation - resets on every page reload
  const [isInstantiated, setIsInstantiated] = React.useState(false);

  // If not instantiated, show a clickable placeholder
  if (!isInstantiated) {
    return (
      <NodeViewWrapper>
        <NodeOverlay nodeProps={props} nodeType="calendar">
          <Box
            onClick={() => setIsInstantiated(true)}
            sx={{
              border: selected ? '2px solid #6366f1' : '1px solid #e5e7eb',
              borderRadius: '12px',
              overflow: 'hidden',
              my: 2,
              background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#eab308',
                boxShadow: '0 4px 12px rgba(234, 179, 8, 0.2)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <Box
              sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 200,
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)',
                }}
              >
                <Typography sx={{ fontSize: 32 }}>📅</Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#1f2937',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                }}
              >
                Monthly Cycles Calendar
              </Typography>
              <Typography
                sx={{
                  fontSize: 14,
                  color: '#6b7280',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                }}
              >
                Click to instantiate the calendar
              </Typography>
              <Button
                variant="contained"
                size="small"
                sx={{
                  mt: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
                  boxShadow: '0 2px 8px rgba(234, 179, 8, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #ca8a04 0%, #d97706 100%)',
                  },
                }}
              >
                Create Calendar
              </Button>
            </Box>
          </Box>
        </NodeOverlay>
      </NodeViewWrapper>
    );
  }

  // Generate all 28 days
  const days = Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1);

  return (
    <NodeViewWrapper>
      <NodeOverlay nodeProps={props} nodeType="calendar">
        <Box
          sx={{
            border: '1px solid #e5e7eb',
            borderRadius: 2,
            overflow: 'hidden',
            backgroundColor: '#fafafa',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Days Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px',
              padding: '12px',
            }}
          >
            {days.map((dayNum) => (
              <DayCell
                key={`day-${dayNum}`}
                dayNumber={dayNum}
                quantaId={`${calendarId}-day-${dayNum}`}
              />
            ))}
          </Box>
        </Box>
      </NodeOverlay>
    </NodeViewWrapper>
  );
};

// ============================================================================
// TipTap Extension
// ============================================================================

export const CalendarExtension = TiptapNode.create({
  name: "calendar",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      calendarId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-calendar-id'),
        renderHTML: (attributes) => ({
          'data-calendar-id': attributes.calendarId,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="calendar"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'calendar' }), '📅 Monthly Cycles Calendar'];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalendarNodeView);
  },

  addCommands() {
    return {
      insertCalendar:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              calendarId: generateCalendarId(),
            },
          });
        },
    };
  },
});
