/* Secret Alley live app. Configure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in js/supabase-config.js. */
document.addEventListener('DOMContentLoaded', async () => {
  const config = window.SECRET_ALLEY_SUPABASE || {};
  const ready = Boolean(config.url && config.publishableKey && window.supabase);
  const client = ready ? window.supabase.createClient(config.url, config.publishableKey) : null;
  const yearInput = document.querySelector('#batchYear');
  const explore = document.querySelector('#exploreBatch');
  const archiveTitle = document.querySelector('#archiveTitle');
  const status = document.querySelector('#archiveStatus');
  const stack = document.querySelector('#memoryStack');
  const count = document.querySelector('#memoryCount');
  const form = document.querySelector('#memoryForm');

  const showStatus = (el, message, kind = 'info') => {
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
    el.style.display = 'block';
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials = name => (String(name || 'S').trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('') || 'S').toUpperCase();
  const prettyClass = value => String(value || 'School memory').replace(/\s+/g, ' ').trim();
  const formatBatch = value => String(value || '').trim();

  function renderNotes(notes) {
    if (!stack) return;
    if (!notes.length) {
      stack.innerHTML = '<div class="empty-archive"><span class="eyebrow">A page waiting to be written</span><h3>No approved memories found yet.</h3><p>If this is your batch, be the first to leave a memory. Submitted notes appear here after admin approval.</p></div>';
    } else {
      stack.innerHTML = notes.map((note, index) => `
        <article class="memory-card">
          <div class="card-top"><span>Secret Alley · Memory</span><span class="card-number">NO. ${String(index + 1).padStart(3, '0')}</span></div>
          <div class="card-line"></div>
          <p class="note">“${escapeHtml(note.note)}”</p>
          <div class="card-bottom"><div><div class="student">${escapeHtml(note.name || 'A student, always')}</div><div class="class">${escapeHtml(prettyClass(note.class_name))} · ${escapeHtml(note.graduation_year)}</div></div><span class="initial">${escapeHtml(initials(note.name))}</span></div>
        </article>`).join('');
    }
    if (count) count.textContent = `${String(notes.length).padStart(2, '0')} ${notes.length === 1 ? 'MEMORY' : 'MEMORIES'}`;
  }

  async function loadNotes(batch) {
    if (!client) {
      showStatus(status, 'The archive is not connected yet. Add your Supabase URL and publishable key to js/supabase-config.js to enable live memories.', 'warning');
      renderNotes([]);
      return;
    }
    showStatus(status, 'Opening the archive…');
    if (stack) stack.innerHTML = '<div class="empty-archive">Gathering memories…</div>';
    const { data, error } = await client.from('notes').select('id,name,graduation_year,class_name,note,created_at').eq('status', 'approved').eq('graduation_year', batch).order('created_at', { ascending: true });
    if (error) {
      console.error('Could not load Secret Alley notes:', error);
      showStatus(status, 'We could not load the archive right now. Please try again in a moment.', 'error');
      renderNotes([]);
      return;
    }
    status.style.display = 'none';
    renderNotes(data || []);
  }

  if (explore && yearInput) {
    const openArchive = async () => {
      const batch = formatBatch(yearInput.value);
      if (!batch) { showStatus(status, 'Please enter a batch/year first.', 'warning'); yearInput.focus(); return; }
      if (archiveTitle) archiveTitle.textContent = `The ${batch} batch`;
      await loadNotes(batch);
      document.querySelector('#archive')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    explore.addEventListener('click', openArchive);
    yearInput.addEventListener('keydown', event => { if (event.key === 'Enter') openArchive(); });
    // Do not load fictional/sample notes. Load only when the visitor asks to open a year.
    const params = new URLSearchParams(location.search);
    const initialBatch = params.get('year');
    if (initialBatch) { yearInput.value = initialBatch; openArchive(); }
  }

  if (form) {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const noteStatus = document.querySelector('#formStatus');
      if (!form.reportValidity()) return;
      if (!client) { showStatus(noteStatus, 'The form is ready, but Supabase is not connected yet. Configure js/supabase-config.js before accepting real submissions.', 'warning'); return; }
      const submitButton = form.querySelector('button[type="submit"]');
      const originalText = submitButton?.textContent;
      if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Submitting…'; }
      const fields = new FormData(form);
      const batch = String(fields.get('studentBatch') || '').trim();
      const payload = {
        name: String(fields.get('studentName') || '').trim(),
        admission_number: String(fields.get('studentAdmission') || '').trim() || null,
        graduation_year: batch,
        class_name: String(fields.get('studentClass') || '').trim(),
        note: String(fields.get('studentNote') || '').trim(),
        status: 'pending'
      };
      const { error } = await client.from('notes').insert(payload);
      if (submitButton) { submitButton.disabled = false; submitButton.textContent = originalText || 'Submit for review ↗'; }
      if (error) {
        console.error('Note submission failed:', error);
        showStatus(noteStatus, 'Your note could not be submitted. Please try again later.', 'error');
        return;
      }
      form.reset();
      showStatus(noteStatus, 'Thank you! Your memory has been submitted for review. It will appear in Secret Alley after an administrator approves it.', 'success');
    });
  }

  document.querySelectorAll('[data-year-link]').forEach(link => link.addEventListener('click', () => {
    const target = link.getAttribute('data-year-link');
    if (target && yearInput) yearInput.value = target;
  }));

  const navToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (navToggle && nav) navToggle.addEventListener('click', () => { const open = nav.classList.toggle('nav-open'); navToggle.setAttribute('aria-expanded', String(open)); });
});
