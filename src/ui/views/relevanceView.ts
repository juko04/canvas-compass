import { StoreState } from '../../storage/store';
import { rankItems } from '../../rank/ranker';
import { renderItemCard } from '../components/itemCard';
import { RankedItem, GradedItem } from '../../types/items';
import { getSvgIcon } from '../icons';

export function renderRelevanceView(state: StoreState): HTMLElement {
  const container = document.createElement('div');
  container.className = 'relevance-view';

  // Apply filters
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

  // Rank and bucket
  const ranked = rankItems(filtered, state.settings.rankingWeights);

  const thisWeekItems = ranked.filter(i => i.bucket === 'this_week');
  const horizonItems = ranked.filter(i => i.bucket === 'on_the_horizon');
  const laterItems = ranked.filter(i => i.bucket === 'later');
  const completedItems = ranked.filter(i => i.bucket === 'completed');

  // Option C: Workload & Hell Week Radar Drawer
  container.appendChild(renderHellWeekDrawer(state.items.filter(i => !disabledIds.includes(i.courseId))));

  // 1. This Week Section
  container.appendChild(createSectionHeader('This Week (Next 7 Days)', thisWeekItems.length, 'flame'));
  if (thisWeekItems.length === 0) {
    container.appendChild(createEmptyState('No urgent assignments due in the next 7 days.'));
  } else {
    // Group this week by day with collapsible empty days
    const groupedByDay = groupItemsByDay(thisWeekItems);
    for (const [dayLabel, items] of Object.entries(groupedByDay)) {
      const dayHeader = document.createElement('div');
      dayHeader.style.cssText = 'font-size: 11.5px; font-weight: 700; color: var(--text-secondary); margin: 8px 0 4px 4px;';
      dayHeader.textContent = dayLabel;
      container.appendChild(dayHeader);

      for (const item of items) {
        container.appendChild(renderItemCard(item, state.selectedItemId === item.id));
      }
    }
  }

  // 2. On The Horizon Section (Pinned Major Milestones)
  container.appendChild(createSectionHeader('On the Horizon (Exams & Milestones)', horizonItems.length, 'telescope'));
  if (horizonItems.length === 0) {
    container.appendChild(createEmptyState('No upcoming exams or capstone projects found.'));
  } else {
    for (const item of horizonItems) {
      container.appendChild(renderItemCard(item, state.selectedItemId === item.id));
    }
  }

  // 3. Later Section
  container.appendChild(createSectionHeader('Later in the Term', laterItems.length, 'calendar'));
  if (laterItems.length === 0) {
    container.appendChild(createEmptyState('No additional items scheduled for later.'));
  } else {
    for (const item of laterItems) {
      container.appendChild(renderItemCard(item, state.selectedItemId === item.id));
    }
  }

  // 4. Completed Section (Collapsed by default)
  if (completedItems.length > 0) {
    const completedWrapper = document.createElement('div');
    completedWrapper.style.marginTop = '16px';

    const header = document.createElement('div');
    header.className = 'compass-section-header';
    header.style.cursor = 'pointer';
    header.innerHTML = `
      <div class="section-title">
        ${getSvgIcon('check-circle', 13)}
        <span>Completed</span>
      </div>
      <span class="section-count-badge">${completedItems.length} (Click to toggle)</span>
    `;

    const completedList = document.createElement('div');
    completedList.style.display = 'none';

    for (const item of completedItems) {
      completedList.appendChild(renderItemCard(item, state.selectedItemId === item.id));
    }

    header.addEventListener('click', () => {
      const isHidden = completedList.style.display === 'none';
      completedList.style.display = isHidden ? 'block' : 'none';
    });

    completedWrapper.appendChild(header);
    completedWrapper.appendChild(completedList);
    container.appendChild(completedWrapper);
  }

  return container;
}

function createSectionHeader(title: string, count: number, iconName?: string): HTMLElement {
  const header = document.createElement('div');
  header.className = 'compass-section-header';
  header.innerHTML = `
    <div class="section-title">
      ${iconName ? getSvgIcon(iconName, 13) : ''}
      <span>${title}</span>
    </div>
    <span class="section-count-badge">${count}</span>
  `;
  return header;
}

function createEmptyState(message: string): HTMLElement {
  const div = document.createElement('div');
  div.style.cssText = 'padding: 12px; font-size: 11.5px; color: var(--text-muted); font-style: italic; text-align: center; background: rgba(255, 255, 255, 0.03); border-radius: 8px; margin-bottom: 12px;';
  div.textContent = message;
  return div;
}

function groupItemsByDay(items: RankedItem[]): Record<string, RankedItem[]> {
  const groups: Record<string, RankedItem[]> = {};

  for (const item of items) {
    let dayKey = 'Upcoming';
    if (item.dueDate) {
      const parts = item.dueDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        dayKey = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }
    }
    if (!groups[dayKey]) {
      groups[dayKey] = [];
    }
    groups[dayKey].push(item);
  }

  return groups;
}

let isHellWeekDrawerOpen = true;

function renderHellWeekDrawer(items: GradedItem[]): HTMLElement {
  const drawer = document.createElement('div');
  drawer.className = 'hell-week-drawer';

  const today = new Date();
  const dayOfWeek = today.getDay();
  const diffToMon = (dayOfWeek + 6) % 7;
  const startOfMon = new Date(today);
  startOfMon.setDate(today.getDate() - diffToMon);
  startOfMon.setHours(0, 0, 0, 0);

  interface WeekAnalysis {
    label: string;
    dateRange: string;
    items: GradedItem[];
    examCount: number;
    projectCount: number;
    score: number;
    isCritical: boolean;
    isModerate: boolean;
  }

  const weeks: WeekAnalysis[] = [];

  for (let w = 0; w < 3; w++) {
    const wStart = new Date(startOfMon);
    wStart.setDate(startOfMon.getDate() + (w * 7));
    const wEnd = new Date(wStart);
    wEnd.setDate(wStart.getDate() + 6);
    wEnd.setHours(23, 59, 59, 999);

    const startStr = formatDate(wStart);
    const endStr = formatDate(wEnd);

    const weekItems = items.filter(i => {
      if (!i.dueDate || i.completed) return false;
      return i.dueDate >= startStr && i.dueDate <= endStr;
    });

    const examCount = weekItems.filter(i => i.type === 'exam' || i.type === 'quiz').length;
    const projectCount = weekItems.filter(i => i.type === 'project' || i.type === 'presentation').length;
    const score = weekItems.length + (examCount * 2) + (projectCount * 2);

    const isCritical = score >= 6 || (examCount >= 2 && weekItems.length >= 3);
    const isModerate = !isCritical && (score >= 4 || examCount >= 1);

    const label = w === 0 ? 'Week 1 (Current)' : (w === 1 ? 'Week 2 (Next Week)' : `Week ${w + 1}`);
    const rangeDisplay = `${wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${wEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    weeks.push({
      label,
      dateRange: rangeDisplay,
      items: weekItems,
      examCount,
      projectCount,
      score,
      isCritical,
      isModerate
    });
  }

  const hasCritical = weeks.some(w => w.isCritical);
  const statusColor = hasCritical ? '#EF4444' : (weeks.some(w => w.isModerate) ? '#F59E0B' : '#10B981');
  const statusText = hasCritical ? 'Hell Week Ahead' : (weeks.some(w => w.isModerate) ? 'Moderate Load' : 'Balanced Load');

  drawer.innerHTML = `
    <div class="hell-week-header" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="color: ${statusColor};">${getSvgIcon('flame', 14)}</span>
        <span style="font-size: 12px; font-weight: 700; color: var(--text-primary);">Workload & Hell Week Radar</span>
        <span style="font-size: 10px; font-weight: 700; padding: 1.5px 6px; border-radius: 6px; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44;">
          ● ${statusText}
        </span>
      </div>
      <span class="radar-chevron" style="font-size: 10px; color: var(--text-muted); transition: transform 0.2s ease; transform: rotate(${isHellWeekDrawerOpen ? '0' : '-90deg'});">
        ${getSvgIcon('chevron-down', 12)}
      </span>
    </div>

    <div class="radar-content-body" style="display: ${isHellWeekDrawerOpen ? 'block' : 'none'}; margin-top: 10px;">
      ${weeks.map(w => {
        let barColor = '#10B981';
        let statusBadge = `<span style="color: #34D178; font-weight: 600;">Normal</span>`;
        if (w.isCritical) {
          barColor = 'linear-gradient(90deg, #F59E0B, #EF4444)';
          statusBadge = `<span style="color: #EF4444; font-weight: 700;">🔥 HELL WEEK (${w.items.length} items${w.examCount > 0 ? `, ${w.examCount} exams` : ''})</span>`;
        } else if (w.isModerate) {
          barColor = '#F59E0B';
          statusBadge = `<span style="color: #F59E0B; font-weight: 600;">Moderate (${w.items.length} items)</span>`;
        }

        const barPct = Math.min(100, Math.max(12, w.score * 15));

        return `
          <div class="workload-week-card ${w.isCritical ? 'critical' : ''}">
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
              <div>
                <strong style="color: ${w.isCritical ? '#F87171' : 'var(--text-primary)'};">${w.label}</strong>
                <span style="color: var(--text-secondary); font-size: 10px; margin-left: 4px;">(${w.dateRange})</span>
              </div>
              <div style="font-size: 10.5px;">${statusBadge}</div>
            </div>
            <div class="workload-bar-track">
              <div class="workload-bar-fill" style="width: ${barPct}%; background: ${barColor};"></div>
            </div>
            ${w.isCritical ? `
              <div style="font-size: 10.5px; color: var(--text-secondary); margin-top: 5px; line-height: 1.3;">
                High concentration of colliding deadlines. Recommend starting early draft / exam reviews.
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;

  drawer.querySelector('.hell-week-header')?.addEventListener('click', () => {
    isHellWeekDrawerOpen = !isHellWeekDrawerOpen;
    const body = drawer.querySelector('.radar-content-body') as HTMLElement;
    const chevron = drawer.querySelector('.radar-chevron') as HTMLElement;
    if (body) body.style.display = isHellWeekDrawerOpen ? 'block' : 'none';
    if (chevron) chevron.style.transform = isHellWeekDrawerOpen ? 'rotate(0)' : 'rotate(-90deg)';
  });

  return drawer;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

