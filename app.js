const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const storageKey = 'tms-tasks';

const state = {
    particles: [],
    monthCursor: new Date(),
};

function loadTasks() {
    try {
        const raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error(e);
        return [];
    }
}

function saveTasks(tasks) {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
}

function toast(message) {
    const el = qs('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
}

function confettiBurst() {
    const holder = qs('#confetti');
    if (!holder) return;
    for (let i = 0; i < 40; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + 'vw';
        piece.style.top = '-10vh';
        piece.style.background = `linear-gradient(135deg, hsl(${Math.random()*360},85%,70%), hsl(${Math.random()*360},75%,60%))`;
        piece.style.animationDelay = `${Math.random()}s`;
        holder.appendChild(piece);
        piece.addEventListener('animationend', () => piece.remove());
    }
}

function initTheme() {
    const stored = localStorage.getItem('tms-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    document.body.classList.toggle('theme-dark', theme === 'dark');
    document.body.classList.toggle('theme-light', theme !== 'dark');
    const toggle = qs('#themeToggle');
    toggle?.addEventListener('click', () => {
        const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
        document.body.classList.toggle('theme-dark', next === 'dark');
        document.body.classList.toggle('theme-light', next !== 'dark');
        localStorage.setItem('tms-theme', next);
    });
}

function initParticles() {
    const canvas = qs('#particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const particleCount = 90;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    state.particles = Array.from({ length: particleCount }).map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 1 + Math.random() * 2,
        dx: (Math.random() - 0.5) * 0.6,
        dy: (Math.random() - 0.5) * 0.6,
    }));

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0,113,227,0.35)';
        state.particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        });
        requestAnimationFrame(draw);
    }
    draw();
}

function initNotifications() {
    const btn = qs('#notifyButton');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const tasks = loadTasks();
        const dueSoon = tasks.filter(t => !t.completed && daysUntil(t.due) <= 2);
        if (dueSoon.length) {
            toast(`Heads up: ${dueSoon.length} task${dueSoon.length>1?'s':''} due soon`);
        } else {
            toast('No urgent tasks. Enjoy the calm.');
        }
    });
}

function validateForm(form) {
    let valid = true;
    qsa('input[required], textarea[required], select[required]', form).forEach(input => {
        const field = input.closest('.field') || input.parentElement;
        const error = field?.querySelector('.error');
        if (!input.value) {
            error && (error.style.opacity = 1);
            valid = false;
        } else {
            error && (error.style.opacity = 0);
        }
    });
    return valid;
}

function daysUntil(dateStr) {
    const today = new Date();
    const target = new Date(dateStr);
    const diff = target - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function initAddTask() {
    const form = qs('#taskForm');
    if (!form) return;
    const loader = qs('#formLoader');
    form.addEventListener('submit', e => {
        e.preventDefault();
        if (!validateForm(form)) return toast('Please fix highlighted fields.');
        loader?.setAttribute('aria-hidden', 'false');
        loader?.classList.add('spinning');
        setTimeout(() => {
            const data = new FormData(form);
            const tasks = loadTasks();
            const id = crypto.randomUUID();
            tasks.push({
                id,
                title: data.get('title'),
                description: data.get('description'),
                due: data.get('due'),
                priority: data.get('priority'),
                completed: false,
                notify: data.get('notify') === 'on',
                pin: data.get('pin') === 'on',
                created: new Date().toISOString(),
            });
            saveTasks(tasks);
            loader?.classList.remove('spinning');
            toast('Task added beautifully.');
            confettiBurst();
            form.reset();
        }, 600);
    });
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.id = task.id;
    card.innerHTML = `
        <div class="task-meta">
            <span class="pill ${task.priority}">${task.priority}</span>
            <span>${new Date(task.due).toDateString()}</span>
        </div>
        <h3>${task.title}</h3>
        <p>${task.description || ''}</p>
        <div class="task-actions">
            <button class="complete">${task.completed ? 'Mark Pending' : 'Complete'}</button>
            <button class="edit">Edit</button>
            <button class="delete">Delete</button>
        </div>
    `;
    card.addEventListener('dragstart', () => card.classList.add('dragging'));
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    return card;
}

function renderTasks() {
    const pendingZone = qs('#pendingZone');
    const completedZone = qs('#completedZone');
    if (!pendingZone || !completedZone) return;
    const search = (qs('#searchTasks')?.value || '').toLowerCase();
    const filter = qs('#filterPriority')?.value || 'all';
    const showCompleted = qs('#showCompleted')?.checked !== false;
    pendingZone.innerHTML = '';
    completedZone.innerHTML = '';
    const tasks = loadTasks();
    tasks
        .filter(t => t.title.toLowerCase().includes(search) || (t.description||'').toLowerCase().includes(search))
        .filter(t => filter === 'all' ? true : t.priority === filter)
        .forEach(task => {
            const card = createTaskCard(task);
            const target = task.completed ? completedZone : pendingZone;
            if (task.completed && !showCompleted) return;
            target.appendChild(card);
        });
    bindTaskActions();
}

function bindTaskActions() {
    qsa('.task-card').forEach(card => {
        const id = card.dataset.id;
        const tasks = loadTasks();
        const current = tasks.find(t => t.id === id);
        card.querySelector('.complete')?.addEventListener('click', () => {
            current.completed = !current.completed;
            saveTasks(tasks);
            toast(current.completed ? 'Completed! 🎉' : 'Back to pending');
            if (current.completed) confettiBurst();
            renderTasks();
            renderReports();
            renderCalendar();
            renderDashboard();
        });
        card.querySelector('.delete')?.addEventListener('click', () => {
            const updated = tasks.filter(t => t.id !== id);
            saveTasks(updated);
            toast('Task removed');
            renderTasks();
            renderReports();
            renderCalendar();
            renderDashboard();
        });
        card.querySelector('.edit')?.addEventListener('click', () => {
            const newTitle = prompt('Edit title', current.title);
            if (newTitle) {
                current.title = newTitle;
                saveTasks(tasks);
                toast('Task updated');
                renderTasks();
                renderCalendar();
                renderDashboard();
            }
        });
    });

    qsa('.dropzone').forEach(zone => {
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            const dragging = qs('.task-card.dragging');
            if (dragging && !zone.contains(dragging)) zone.appendChild(dragging);
        });
        zone.addEventListener('drop', () => {
            const dragging = qs('.task-card.dragging');
            if (!dragging) return;
            const id = dragging.dataset.id;
            const tasks = loadTasks();
            const current = tasks.find(t => t.id === id);
            current.completed = zone.id === 'completedZone';
            saveTasks(tasks);
            toast(current.completed ? 'Moved to Completed' : 'Back to Pending');
            renderTasks();
            renderReports();
            renderCalendar();
            renderDashboard();
        });
    });
}

function initTaskList() {
    if (!qs('#taskBoard')) return;
    ['searchTasks','filterPriority','showCompleted'].forEach(id => qs('#'+id)?.addEventListener('input', renderTasks));
    renderTasks();
}

function buildCalendarMatrix(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
}

function renderCalendar() {
    const grid = qs('#calendarGrid');
    const label = qs('#monthLabel');
    if (!grid || !label) return;
    const ref = state.monthCursor;
    label.textContent = ref.toLocaleString('default', { month: 'long', year: 'numeric' });
    grid.innerHTML = '';
    const tasks = loadTasks();
    buildCalendarMatrix(ref).forEach(date => {
        const cell = document.createElement('div');
        cell.className = 'day';
        if (date) {
            cell.innerHTML = `<div class="date">${date.getDate()}</div>`;
            const events = document.createElement('div');
            events.className = 'events';
            tasks
                .filter(t => t.due === date.toISOString().slice(0,10))
                .forEach(t => {
                    const event = document.createElement('div');
                    event.className = `event ${t.priority}`;
                    event.textContent = t.title;
                    event.addEventListener('click', () => showEventDetail(t));
                    events.appendChild(event);
                });
            cell.appendChild(events);
        }
        grid.appendChild(cell);
    });
}

function showEventDetail(task) {
    const pop = qs('#eventDetail');
    if (!pop) return;
    qs('.popover-body', pop).innerHTML = `
        <h3>${task.title}</h3>
        <p>${task.description || 'No description provided.'}</p>
        <p><strong>Due:</strong> ${new Date(task.due).toDateString()}</p>
        <p><strong>Priority:</strong> ${task.priority}</p>
        <p><strong>Status:</strong> ${task.completed ? 'Completed' : 'Pending'}</p>
    `;
    pop.hidden = false;
    qs('#closeEvent')?.addEventListener('click', () => pop.hidden = true);
    pop.addEventListener('click', e => { if (e.target === pop) pop.hidden = true; });
}

function initCalendar() {
    if (!qs('#calendarGrid')) return;
    qs('#prevMonth')?.addEventListener('click', () => { state.monthCursor.setMonth(state.monthCursor.getMonth()-1); renderCalendar(); });
    qs('#nextMonth')?.addEventListener('click', () => { state.monthCursor.setMonth(state.monthCursor.getMonth()+1); renderCalendar(); });
    renderCalendar();
}

function renderReports() {
    const totalEl = qs('#totalTasks');
    const compEl = qs('#completedTasks');
    const pendEl = qs('#pendingTasks');
    const barChart = qs('#barChart');
    const pie = qs('#pieChart');
    if (!totalEl) return;
    const tasks = loadTasks();
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.length - completed;
    totalEl.textContent = tasks.length;
    compEl.textContent = completed;
    pendEl.textContent = pending;
    if (barChart) {
        barChart.innerHTML = '';
        const values = Array.from({length: 10}).map((_,i)=> {
            const slice = tasks.filter((_,idx)=> idx % 10 === i);
            const ratio = slice.length ? slice.filter(t=>t.completed).length / slice.length : 0;
            return Math.round(ratio * 100);
        });
        values.forEach(v => {
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = (20 + v) + 'px';
            bar.title = v + '% complete';
            barChart.appendChild(bar);
        });
    }
    if (pie) {
        const high = tasks.filter(t=>t.priority==='high').length || 1;
        const med = tasks.filter(t=>t.priority==='medium').length || 1;
        const low = tasks.filter(t=>t.priority==='low').length || 1;
        const total = high+med+low;
        const hDeg = (high/total)*360;
        const mDeg = (med/total)*360;
        pie.style.background = `conic-gradient(var(--high) 0deg, var(--high) ${hDeg}deg, var(--medium) ${hDeg}deg, var(--medium) ${hDeg+mDeg}deg, var(--low) ${hDeg+mDeg}deg, var(--low) 360deg)`;
    }
}

function initReports() {
    if (!qs('#reportStats')) return;
    renderReports();
    qs('#refreshReports')?.addEventListener('click', () => { renderReports(); toast('Reports refreshed'); });
}

function renderDashboard() {
    const stats = qs('#dashboardStats');
    if (!stats) return;
    const tasks = loadTasks();
    const completed = tasks.filter(t=>t.completed).length;
    const pending = tasks.length - completed;
    const high = tasks.filter(t=>t.priority==='high').length;
    stats.innerHTML = `
        <div class="stat-card"><p class="label">Total</p><h2>${tasks.length}</h2></div>
        <div class="stat-card"><p class="label">Completed</p><h2>${completed}</h2></div>
        <div class="stat-card"><p class="label">Pending</p><h2>${pending}</h2></div>
        <div class="stat-card"><p class="label">High Priority</p><h2>${high}</h2></div>
    `;

    const upcoming = qs('#upcomingList .mini-list');
    const notifications = qs('#notificationsPanel .mini-list');
    upcoming.innerHTML = '';
    notifications.innerHTML = '';
    tasks
        .filter(t => !t.completed)
        .sort((a,b) => new Date(a.due) - new Date(b.due))
        .slice(0,5)
        .forEach(t => {
            const li = document.createElement('li');
            li.innerHTML = `<div><p class="label">${t.title}</p><small>${new Date(t.due).toDateString()} • ${t.priority}</small></div><span class="status-dot ${t.priority}"></span>`;
            upcoming.appendChild(li);
        });
    tasks
        .filter(t => !t.completed && daysUntil(t.due) <= 2)
        .forEach(t => {
            const li = document.createElement('li');
            li.innerHTML = `<div><p class="label">Due soon</p><small>${t.title}</small></div><span class="status-dot high"></span>`;
            notifications.appendChild(li);
        });
}

function initDashboard() {
    if (!qs('#dashboardStats')) return;
    renderDashboard();
    qs('#exportJson')?.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(loadTasks(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tms-tasks.json';
        a.click();
        URL.revokeObjectURL(url);
        toast('Exported JSON');
    });
}

function initContact() {
    const form = qs('#contactForm');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        if (!validateForm(form)) return toast('Fill out all fields');
        toast('Message sent. Our team will respond.');
        confettiBurst();
        form.reset();
    });
}

function initTaskFilters() {
    const board = qs('#taskBoard');
    if (!board) return;
    renderTasks();
}

function initApp() {
    initTheme();
    initParticles();
    initNotifications();
    initAddTask();
    initTaskList();
    initCalendar();
    initReports();
    initDashboard();
    initContact();
}

document.addEventListener('DOMContentLoaded', initApp);
