import type { EditorView } from '@tiptap/pm/view';

/** One filled outline per event, measured from its inline fragments rather than a nested editor. */
export function eventEnclosures(view: EditorView) {
  const host = view.dom.parentElement;
  if (!host) return {};
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('event-enclosures');
  svg.setAttribute('data-filled', String(localStorage.getItem('inline-events-filled') === 'true'));
  svg.setAttribute('aria-hidden', 'true');
  host.classList.add('event-enclosure-host');
  host.appendChild(svg);
  let frame = 0;
  const draw = () => {
    frame = 0;
    const origin = host.getBoundingClientRect();
    svg.setAttribute('width', String(host.scrollWidth));
    svg.setAttribute('height', String(host.scrollHeight));
    const groups = new Map<string, DOMRect[]>();
    view.dom.querySelectorAll<HTMLElement>('[data-group-type="event"], [data-event-group-id]').forEach(element => {
      const id = element.dataset.spanGroupId || element.dataset.eventGroupId;
      if (!id) return;
      const rects = groups.get(id) || [];
      rects.push(...Array.from(element.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0));
      groups.set(id, rects);
    });
    svg.replaceChildren();
    for (const [id, rects] of groups) {
      const rows: { left: number; right: number; top: number; bottom: number }[] = [];
      for (const rect of rects.sort((a, b) => a.top - b.top || a.left - b.left)) {
        const row = rows.find(row => Math.min(row.bottom, rect.bottom) - Math.max(row.top, rect.top) > 4);
        if (row) {
          row.left = Math.min(row.left, rect.left);
          row.right = Math.max(row.right, rect.right);
          row.top = Math.min(row.top, rect.top);
          row.bottom = Math.max(row.bottom, rect.bottom);
        } else rows.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
      }
      if (!rows.length) continue;
      const points: [number, number][] = [];
      rows.forEach((row, index) => {
        const top = index ? (rows[index - 1].bottom + row.top) / 2 : row.top - 3;
        const bottom = index + 1 < rows.length ? (row.bottom + rows[index + 1].top) / 2 : row.bottom + 3;
        points.push([row.right + 4, top], [row.right + 4, bottom]);
      });
      [...rows].reverse().forEach((row, reverseIndex) => {
        const index = rows.length - 1 - reverseIndex;
        const top = index ? (rows[index - 1].bottom + row.top) / 2 : row.top - 3;
        const bottom = index + 1 < rows.length ? (row.bottom + rows[index + 1].top) / 2 : row.bottom + 3;
        points.push([row.left - 4, bottom], [row.left - 4, top]);
      });
      const path = document.createElementNS(svg.namespaceURI, 'path');
      const local = points.map(([x, y]) => [x - origin.left + host.scrollLeft, y - origin.top + host.scrollTop]);
      const corners = local.map((point, index) => {
        const previous = local[(index + local.length - 1) % local.length];
        const next = local[(index + 1) % local.length];
        const approach = (other: number[]) => {
          const length = Math.hypot(other[0] - point[0], other[1] - point[1]);
          const scale = length ? Math.min(5, length / 2) / length : 0;
          return [point[0] + (other[0] - point[0]) * scale, point[1] + (other[1] - point[1]) * scale];
        };
        return { point, enter: approach(previous), exit: approach(next) };
      });
      path.setAttribute('d', corners.map((corner, index) =>
        `${index ? 'L' : 'M'}${corner.enter.join(',')} Q${corner.point.join(',')} ${corner.exit.join(',')}`
      ).join(' ') + ' Z');
      path.setAttribute('data-event-outline', id);
      svg.appendChild(path);
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
  const resize = new ResizeObserver(schedule);
  resize.observe(view.dom);
  const mutation = new MutationObserver(schedule);
  mutation.observe(view.dom, { subtree: true, childList: true, characterData: true });
  schedule();
  return {
    update: schedule,
    destroy() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      svg.remove();
      host.classList.remove('event-enclosure-host');
    },
  };
}
