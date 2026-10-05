import { StoreState } from '../../storage/store';
import { renderItemCard } from '../components/itemCard';
import { rankItems } from '../../rank/ranker';
import { getSvgIcon } from '../icons';

export function renderCalendarView(state: StoreState): HTMLElement {
  const container = document.createElement('div');
  container.className = 'calendar-view';

  const disabledIds = state.settings.disabledCourseIds || [];
  let filtered = state.items.filter(i => !disabledIds.includes(i.courseId));
  if (state.filters.courseId !== 'all') {
    filtered = filtered.filter(i => i.courseId === state.filters.courseId);
  }
  if (state.filters.type !== 'all') {
    filtered = filtered.filter(i => i.type === state.filters.type);
  }
  if (state.filters.searchQuery) {
    const q = state.filters.searchQuery.toLowerCase();
    filtered = filtered.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.courseName.toLowerCase().includes(q) ||
      (i.notes && i.notes.toLowerCase().includes(q))
    );
  }
  const ranked = rankItems(filtered, state.settings.rankingWeights);

  // Group by date (ascending)
  const datedItems = ranked.filter(i => i.dueDate !== null).sort((a, b) => {
    return (a.dueDate! + (a.dueTime || '')) > (b.dueDate! + (b.dueTime || '')) ? 1 : -1;
  });

  const undatedItems = ranked.filter(i => i.dueDate === null);

  if (datedItems.length === 0 && undatedItems.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted);">No items in calendar.</div>`;
    return container;
  }

  // Find the next due assignment
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let nextDueItem = datedItems.find(i => !i.completed && i.dueDate && i.dueDate >= todayStr);
  if (!nextDueItem) {
    nextDueItem = datedItems.find(i => !i.completed);
  }
  if (!nextDueItem && datedItems.length > 0) {
    nextDueItem = datedItems[datedItems.length - 1];
  }

  let anchorInserted = false;
  let currentGroup = '';

  for (const item of datedItems) {
    const parts = item.dueDate!.split('-');
    let dateHeaderStr = item.dueDate!;
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      dateHeaderStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Insert next-due anchor banner right before the next due assignment
    if (!anchorInserted && nextDueItem && item.id === nextDueItem.id) {
      anchorInserted = true;
      const anchorEl = document.createElement('div');
      anchorEl.className = 'calendar-next-due-anchor';
      anchorEl.id = 'calendar-next-due-target';
      anchorEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #3B82F6; box-shadow: 0 0 10px #3B82F6;"></span>
          <span>Next Due Assignment</span>
        </div>
        <span style="font-size: 10px; opacity: 0.85; font-weight: 500;">▲ Past / Completed • ▼ Upcoming</span>
      `;
      container.appendChild(anchorEl);
    }

    if (dateHeaderStr !== currentGroup) {
      currentGroup = dateHeaderStr;
      const header = document.createElement('div');
      header.style.cssText = 'font-size: 12px; font-weight: 700; color: var(--text-secondary); margin: 14px 0 6px 4px; display: flex; align-items: center; gap: 6px;';
      header.innerHTML = `${getSvgIcon('calendar', 13)} <span>${dateHeaderStr}</span>`;
      container.appendChild(header);
    }

    container.appendChild(renderItemCard(item, state.selectedItemId === item.id));
  }

  // Fallback: if all items were completed and anchor wasn't inserted, place at the top
  if (!anchorInserted && datedItems.length > 0) {
    const firstHeader = container.querySelector('.calendar-view > div');
    const anchorEl = document.createElement('div');
    anchorEl.className = 'calendar-next-due-anchor';
    anchorEl.id = 'calendar-next-due-target';
    anchorEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
        <span>All Upcoming Items Completed</span>
      </div>
      <span style="font-size: 10px; opacity: 0.85; font-weight: 500;">▲ Past Items</span>
    `;
    if (firstHeader) {
      container.insertBefore(anchorEl, firstHeader);
    } else {
      container.appendChild(anchorEl);
    }
  }

  // Undated / TBD items section
  if (undatedItems.length > 0) {
    const undatedHeader = document.createElement('div');
    undatedHeader.style.cssText = 'font-size: 12px; font-weight: 700; color: var(--text-secondary); margin: 20px 0 6px 4px; display: flex; align-items: center; gap: 6px;';
    undatedHeader.innerHTML = `${getSvgIcon('clock', 13)} <span>TBD & Undated Obligations</span>`;
    container.appendChild(undatedHeader);

    for (const item of undatedItems) {
      container.appendChild(renderItemCard(item, state.selectedItemId === item.id));
    }
  }

  // Safely scroll ONLY the content area without disturbing the outer panel shell or header
  requestAnimationFrame(() => {
    setTimeout(() => {
      const anchor = container.querySelector('#calendar-next-due-target') as HTMLElement;
      const scrollContainer = container.closest('.compass-scroll-content') as HTMLElement;
      if (anchor && scrollContainer) {
        const anchorRect = anchor.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        const relativeTop = anchorRect.top - containerRect.top + scrollContainer.scrollTop;
        scrollContainer.scrollTop = Math.max(0, relativeTop - 10);
      }
    }, 50);
  });

  return container;
}
