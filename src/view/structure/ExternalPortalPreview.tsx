import React, { useEffect, useState } from 'react';

/**
 * A static render of a note's JSON for portals. The live editor is a whole
 * page per portal, so a note with many sub-notes shows blank boxes for
 * seconds on a cold server. This paints the stored content immediately and
 * the live editor mounts only when the reader asks to edit.
 */

type JsonNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: JsonNode[];
};

export type PreviewStatus = 'loading' | 'ready' | 'missing' | 'error';

const MENTION_CLASS: Record<string, string> = {
  timepoint: 'timepoint-mention',
  location: 'location-mention',
  person: 'person-mention',
};

const attrString = (node: JsonNode, key: string): string => {
  const value = node.attrs?.[key];
  return typeof value === 'string' ? value : '';
};

const renderInline = (node: JsonNode, key: number): React.ReactNode => {
  if (node.type === 'text') {
    let element: React.ReactNode = node.text ?? '';
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') element = <strong key={key}>{element}</strong>;
      else if (mark.type === 'italic') element = <em key={key}>{element}</em>;
      else if (mark.type === 'underline') element = <u key={key}>{element}</u>;
      else if (mark.type === 'strike') element = <s key={key}>{element}</s>;
      else if (mark.type === 'code') element = <code key={key}>{element}</code>;
      else if (mark.type === 'link') element = <a key={key} href={attrString({ attrs: mark.attrs }, 'href')}>{element}</a>;
    }
    return <React.Fragment key={key}>{element}</React.Fragment>;
  }
  if (node.type === 'hardBreak') return <br key={key} />;
  const mentionClass = node.type ? MENTION_CLASS[node.type] : undefined;
  if (mentionClass) {
    return <span key={key} className={mentionClass}>{attrString(node, 'label') || attrString(node, 'data-name')}</span>;
  }
  if (node.type === 'todoMention') {
    return (
      <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <input type="checkbox" readOnly checked={Boolean(node.attrs?.checked)} style={{ margin: 0 }} />
        {attrString(node, 'text')}
      </span>
    );
  }
  if (node.content) return <React.Fragment key={key}>{node.content.map(renderInline)}</React.Fragment>;
  const label = attrString(node, 'label') || attrString(node, 'text');
  return label ? <span key={key} className="mention">{label}</span> : null;
};

const renderBlock = (node: JsonNode, key: number): React.ReactNode => {
  const children = node.content ?? [];
  switch (node.type) {
    case 'paragraph':
      return <p key={key} style={{ margin: '0 0 0.5em' }}>{children.map(renderInline)}</p>;
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
      return React.createElement(`h${level}`, { key, style: { margin: '0 0 0.4em' } }, children.map(renderInline));
    }
    case 'bulletList':
      return <ul key={key} style={{ margin: '0 0 0.5em', paddingLeft: 20 }}>{children.map(renderBlock)}</ul>;
    case 'orderedList':
      return <ol key={key} style={{ margin: '0 0 0.5em', paddingLeft: 20 }}>{children.map(renderBlock)}</ol>;
    case 'listItem':
      return <li key={key}>{children.map(renderBlock)}</li>;
    case 'blockquote':
      return <blockquote key={key}>{children.map(renderBlock)}</blockquote>;
    case 'codeBlock':
      return <pre key={key}><code>{children.map((child) => child.text ?? '').join('')}</code></pre>;
    case 'externalPortal':
      return <div key={key} style={{ border: '1px solid #dadce0', borderRadius: 6, padding: 8, color: '#5f6368', fontSize: 12 }}>Sub-note {attrString(node, 'externalQuantaId').slice(0, 8)}…</div>;
    default:
      if (children.length > 0) return <div key={key}>{children.map(renderBlock)}</div>;
      return null;
  }
};

export const ExternalPortalPreview = (props: {
  quantaId: string;
  userId: string;
  onStatus?: (status: PreviewStatus) => void;
}) => {
  const [doc, setDoc] = useState<JsonNode | null>(null);
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const { quantaId, userId, onStatus } = props;

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch(`/api/getNote?noteId=${encodeURIComponent(`${userId}/${quantaId}`)}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`getNote ${response.status}`);
        const json = (await response.json()) as JsonNode;
        if (cancelled) return;
        setDoc(json);
        setStatus((json.content ?? []).length > 0 ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [quantaId, userId]);

  useEffect(() => {
    onStatus?.(status);
  }, [onStatus, status]);

  if (status === 'loading') {
    return <div style={{ padding: 8, color: '#9aa0a6', fontSize: 13 }}>Loading…</div>;
  }
  if (status === 'error') {
    return <div style={{ padding: 8, color: '#a50e0e', fontSize: 13 }}>Could not load this sub-note.</div>;
  }
  if (status === 'missing' || !doc) {
    return <div style={{ padding: 8, color: '#9aa0a6', fontSize: 13 }}>Empty sub-note.</div>;
  }
  return <div className="ProseMirror" style={{ padding: 8 }}>{(doc.content ?? []).map(renderBlock)}</div>;
};
