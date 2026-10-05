import { RankedItem, ItemType } from '../../types/items';
import { store } from '../../storage/store';
import { getSvgIcon } from '../icons';

export function renderItemCard(item: RankedItem, isExpanded: boolean): HTMLElement {
  const card = document.createElement('div');
  card.className = `glass-card ${item.completed ? 'completed' : ''}`;
  card.dataset.itemId = item.id;

  const cColor = item.courseColor || '#CFB87C';
  card.style.setProperty('--card-course-glow', `${cColor}55`);
  card.style.setProperty('--card-course-border', `${cColor}99`);

  // Format date display
  let dateText = 'TBD';
  if (item.dueDate) {
    const parts = item.dueDate.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      dateText = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } else {
      dateText = item.dueDate;
    }
    if (item.dueTime) {
      dateText += ` at ${item.dueTime}`;
    }
  } else if (item.isUndated) {
    dateText = 'Undated Checklist';
  }

  // Source badge
  let badgeClass = 'badge-canvas';
  let badgeLabel = 'Canvas';
  if (item.source === 'syllabus') {
    badgeClass = 'badge-syllabus';
    badgeLabel = 'Syllabus';
  } else if (item.source === 'custom') {
    badgeClass = 'badge-custom';
    badgeLabel = 'You';
  }

  const extraBadges: string[] = [];
  if (item.hasConflict) {
    extraBadges.push(`<span class="badge-pill badge-conflict" title="Conflict detected: ${item.conflictDetails?.field || 'Details'}">Conflict</span>`);
  }
  if (item.isInferred) {
    extraBadges.push(`<span class="badge-pill badge-inferred" title="Inferred from syllabus recurring schedule">Inferred</span>`);
  }
  if (item.isTBD) {
    extraBadges.push(`<span class="badge-pill badge-tbd" title="Date TBD until schedule released">TBD</span>`);
  }

  if (item.isCanvasSubmitted || item.submittedAt) {
    extraBadges.push(`<span class="badge-pill badge-submitted" title="Submitted on Canvas">${getSvgIcon('check-circle', 10)} <span>Submitted</span></span>`);
  }

  const courseAbbr = item.courseName.split(':')[0] || item.courseName;
  const deepLinkHtml = item.canvasUrl
    ? `<a href="${item.canvasUrl}" target="_blank" rel="noopener noreferrer" class="card-deep-link-btn" title="Open assignment in Canvas">${getSvgIcon('external-link', 11)}</a>`
    : '';

  card.innerHTML = `
    <div class="card-top-row">
      <div class="card-checkbox ${item.completed ? 'checked' : ''}" title="${item.completed ? 'Mark incomplete' : 'Mark complete'}">
        ${item.completed ? getSvgIcon('check', 12, 2.5) : ''}
      </div>
      <div class="card-content">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
          <div class="card-title" style="flex: 1;">${escapeHtml(item.title)}</div>
          ${deepLinkHtml}
        </div>
        <div class="card-meta-row">
          <span class="course-pill">
            <span class="course-dot" style="background: ${item.courseColor || '#CFB87C'}"></span>
            ${escapeHtml(courseAbbr)}
          </span>
          <span class="meta-date-span">${getSvgIcon('calendar', 11)} <span>${dateText}</span></span>
          ${item.points !== null ? `<span>• ${item.points} pts</span>` : ''}
          <span class="badge-pill ${badgeClass}">${badgeLabel}</span>
          ${extraBadges.join('')}
          <span class="relevance-score-tag">Score: ${item.relevanceScore}</span>
        </div>
      </div>
    </div>
  `;

  // Expanded View / Inline Edit Form
  if (isExpanded) {
    const expandedBody = document.createElement('div');
    expandedBody.className = 'card-expanded-body';

    let conflictHtml = '';
    if (item.hasConflict && item.conflictDetails) {
      conflictHtml = `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 8px; font-size: 11.5px;">
          <div style="font-weight: 700; color: #EF4444; margin-bottom: 4px; display: flex; align-items: center; gap: 5px;">
            ${getSvgIcon('warning', 12)}
            <span>Conflict Detected (${item.conflictDetails.field})</span>
          </div>
          <div>Canvas says: <strong>${escapeHtml(item.conflictDetails.canvasValue || 'N/A')}</strong></div>
          <div>Syllabus says: <strong>${escapeHtml(item.conflictDetails.syllabusValue || 'N/A')}</strong></div>
          <div style="margin-top: 6px; display: flex; gap: 6px;">
            <button class="glass-btn primary resolve-canvas-btn" style="padding: 2px 8px; font-size: 10.5px;">Keep Canvas</button>
            <button class="glass-btn resolve-syllabus-btn" style="padding: 2px 8px; font-size: 10.5px;">Keep Syllabus</button>
          </div>
        </div>
      `;
    }

    expandedBody.innerHTML = `
      ${conflictHtml}
      ${item.notes ? `<div class="card-notes" style="display: flex; align-items: flex-start; gap: 6px;">${getSvgIcon('file-text', 13)} <div><strong>Notes:</strong> ${escapeHtml(item.notes)}</div></div>` : ''}
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px;">
        <div>
          <label style="font-size: 10.5px; font-weight: 600; color: var(--text-secondary);">Title</label>
          <input type="text" class="glass-input edit-title-input" value="${escapeHtml(item.title)}" style="width: 100%;" />
        </div>
        <div>
          <label style="font-size: 10.5px; font-weight: 600; color: var(--text-secondary);">Type</label>
          <select class="glass-select edit-type-select" style="width: 100%;">
            ${renderTypeOptions(item.type)}
          </select>
        </div>
        <div>
          <label style="font-size: 10.5px; font-weight: 600; color: var(--text-secondary);">Due Date</label>
          <input type="date" class="glass-input edit-date-input" value="${item.dueDate || ''}" style="width: 100%;" />
        </div>
        <div>
          <label style="font-size: 10.5px; font-weight: 600; color: var(--text-secondary);">Due Time</label>
          <input type="time" class="glass-input edit-time-input" value="${item.dueTime || ''}" style="width: 100%;" />
        </div>
      </div>
      <div class="card-btn-row">
        <button class="glass-btn danger delete-item-btn">Delete</button>
        <button class="glass-btn save-edit-btn primary">Save Changes</button>
      </div>
    `;

    // Event listeners for inline form
    expandedBody.querySelector('.save-edit-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const titleInput = expandedBody.querySelector('.edit-title-input') as HTMLInputElement;
      const typeSelect = expandedBody.querySelector('.edit-type-select') as HTMLSelectElement;
      const dateInput = expandedBody.querySelector('.edit-date-input') as HTMLInputElement;
      const timeInput = expandedBody.querySelector('.edit-time-input') as HTMLInputElement;

      store.updateItem({
        ...item,
        title: titleInput.value.trim() || item.title,
        type: typeSelect.value as ItemType,
        dueDate: dateInput.value || null,
        dueTime: timeInput.value || null,
        isTBD: !dateInput.value
      });
      store.setSelectedItem(null);
    });

    expandedBody.querySelector('.delete-item-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Remove "${item.title}"?`)) {
        store.deleteItem(item.id);
        store.setSelectedItem(null);
      }
    });

    expandedBody.querySelector('.resolve-canvas-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      store.updateItem({
        ...item,
        hasConflict: false,
        conflictDetails: undefined
      });
    });

    expandedBody.querySelector('.resolve-syllabus-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (item.conflictDetails?.syllabusValue) {
        store.updateItem({
          ...item,
          notes: (item.notes ? item.notes + ' ' : '') + `(Resolved: ${item.conflictDetails.syllabusValue})`,
          hasConflict: false,
          conflictDetails: undefined
        });
      }
    });

    card.appendChild(expandedBody);
  }

  // Checkbox click
  const checkbox = card.querySelector('.card-checkbox');
  checkbox?.addEventListener('click', (e) => {
    e.stopPropagation();
    store.toggleItemCompleted(item.id);
  });

  // Card click to expand/collapse
  card.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.card-checkbox') || target.closest('.card-deep-link-btn') || target.closest('input') || target.closest('select') || target.closest('button')) {
      return;
    }
    store.setSelectedItem(isExpanded ? null : item.id);
  });

  return card;
}

function renderTypeOptions(current: ItemType): string {
  const types: ItemType[] = [
    'assignment',
    'quiz',
    'exam',
    'project',
    'presentation',
    'lab',
    'reading',
    'extra_credit',
    'attendance',
    'checkin'
  ];
  return types.map(t => `<option value="${t}" ${t === current ? 'selected' : ''}>${t.replace('_', ' ').toUpperCase()}</option>`).join('');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
