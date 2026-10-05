import { StoreState, store } from '../../storage/store';
import { renderItemCard } from '../components/itemCard';
import { ItemType } from '../../types/items';
import { rankItems } from '../../rank/ranker';
import { getSvgIcon } from '../icons';

export function renderCustomView(state: StoreState): HTMLElement {
  const container = document.createElement('div');
  container.className = 'custom-view';

  // "Add Custom Item" banner / form toggle
  const addCard = document.createElement('div');
  addCard.className = 'glass-card custom-add-card';
  addCard.style.cssText = `
    cursor: default;
    border-style: dashed;
    border-width: 1.5px;
    margin-bottom: 16px;
    padding: 14px;
  `;

  addCard.innerHTML = `
    <div style="font-weight: 750; font-size: 13.5px; color: var(--text-primary); margin-bottom: 10px; display: flex; align-items: center; gap: 7px;">
      <span style="color: var(--accent-gold); display: flex; align-items: center;">${getSvgIcon('plus', 15)}</span>
      <span>Add Custom Item (Never Overwritten by Scans)</span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 9px;">
      <input type="text" class="glass-input custom-title" placeholder="Item title (e.g. Study Group, Lab Prep, Blue Book Purchase)" />
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <select class="glass-select custom-course">
          ${state.courses.map(c => `<option value="${c.id}">${escapeHtml(c.course_code || c.name)}</option>`).join('')}
        </select>
        <select class="glass-select custom-type">
          <option value="assignment">ASSIGNMENT</option>
          <option value="exam">EXAM / QUIZ</option>
          <option value="project">PROJECT</option>
          <option value="reading">READING</option>
          <option value="extra_credit">EXTRA CREDIT</option>
          <option value="attendance">ATTENDANCE</option>
        </select>
        <input type="date" class="glass-input custom-date" />
        <input type="time" class="glass-input custom-time" value="23:59" />
      </div>
      <input type="text" class="glass-input custom-notes" placeholder="Notes (materials, partner, zoom link, etc.)" />
      <button class="glass-btn primary submit-custom-btn" style="margin-top: 4px; justify-content: center; padding: 8px 14px; font-size: 12.5px;">
        ${getSvgIcon('plus', 13)}
        <span>Add to Compass</span>
      </button>
    </div>
  `;

  addCard.querySelector('.submit-custom-btn')?.addEventListener('click', () => {
    const titleInput = addCard.querySelector('.custom-title') as HTMLInputElement;
    const courseSelect = addCard.querySelector('.custom-course') as HTMLSelectElement;
    const typeSelect = addCard.querySelector('.custom-type') as HTMLSelectElement;
    const dateInput = addCard.querySelector('.custom-date') as HTMLInputElement;
    const timeInput = addCard.querySelector('.custom-time') as HTMLInputElement;
    const notesInput = addCard.querySelector('.custom-notes') as HTMLInputElement;

    if (!titleInput.value.trim()) {
      alert('Please enter a title for the custom item.');
      return;
    }

    const course = state.courses.find(c => String(c.id) === courseSelect.value) || state.courses[0];

    store.addItem({
      courseId: String(course.id),
      courseName: course.name,
      courseColor: course.color || '#CFB87C',
      title: titleInput.value.trim(),
      type: typeSelect.value as ItemType,
      dueDate: dateInput.value || null,
      dueTime: timeInput.value || null,
      points: null,
      weight: null,
      isTBD: !dateInput.value,
      isUndated: !dateInput.value,
      isInferred: false,
      source: 'custom',
      notes: notesInput.value.trim() || undefined
    });

    titleInput.value = '';
    notesInput.value = '';
    store.addLog('ui', 'info', `Created custom user task: ${titleInput.value.trim()}`);
  });

  container.appendChild(addCard);

  // List of custom items
  const customItems = rankItems(state.items.filter(i => i.source === 'custom'), state.settings.rankingWeights);

  if (customItems.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px;';
    empty.textContent = 'No custom items added yet.';
    container.appendChild(empty);
  } else {
    for (const item of customItems) {
      container.appendChild(renderItemCard(item, state.selectedItemId === item.id));
    }
  }

  return container;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
