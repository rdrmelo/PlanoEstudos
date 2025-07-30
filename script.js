// Executa o código quando o conteúdo HTML da página estiver completamente carregado
document.addEventListener('DOMContentLoaded', () => {
    // --- MAPEAMENTO DOS ELEMENTOS HTML ---
    const setupView = document.getElementById('setup-view');
    const dashboardView = document.getElementById('dashboard-view');
    const addSubjectBtn = document.getElementById('add-subject-btn');
    const generatePlanBtn = document.getElementById('generate-plan-btn');
    const resetPlanBtn = document.getElementById('reset-plan-btn');
    const modal = document.getElementById('modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const subjectForm = document.getElementById('subject-form');
    const subjectsListEl = document.getElementById('subjects-list');
    const noSubjectsMsg = document.getElementById('no-subjects-msg');
    const disciplineCardsContainer = document.getElementById('discipline-cards-container');
    
    // -- ALTERADO: Mapeamento dos elementos do calendário para a visão semanal --
    const calendarGrid = document.getElementById('calendar-grid');
    const weekRangeHeader = document.getElementById('week-range-header'); // Novo cabeçalho
    const prevWeekBtn = document.getElementById('prev-week-btn');         // Novo botão
    const nextWeekBtn = document.getElementById('next-week-btn');         // Novo botão

    // Elementos do modo escuro
    const themeToggleBtnSetup = document.getElementById('theme-toggle-setup');
    const themeToggleDarkIconSetup = document.getElementById('theme-toggle-dark-icon-setup');
    const themeToggleLightIconSetup = document.getElementById('theme-toggle-light-icon-setup');
    const themeToggleBtnDashboard = document.getElementById('theme-toggle-dashboard');
    const themeToggleDarkIconDashboard = document.getElementById('theme-toggle-dark-icon-dashboard');
    const themeToggleLightIconDashboard = document.getElementById('theme-toggle-light-icon-dashboard');

    // --- VARIÁVEIS DE ESTADO DA APLICAÇÃO ---
    let subjects = [];
    let studyPlan = [];
    let charts = {};
    // -- ALTERADO: 'displayedDate' agora controla a semana que o calendário está exibindo
    let displayedDate = new Date(); 

    const colors = ['#3b82f6', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#65a30d'];
    let colorIndex = 0;

    // --- LÓGICA DO MODO ESCURO (Mantida) ---
    const applyTheme = (isDark) => {
        document.documentElement.classList.toggle('dark', isDark);
        themeToggleDarkIconSetup.classList.toggle('hidden', isDark);
        themeToggleLightIconSetup.classList.toggle('hidden', !isDark);
        themeToggleDarkIconDashboard.classList.toggle('hidden', isDark);
        themeToggleLightIconDashboard.classList.toggle('hidden', !isDark);

        if (Object.keys(charts).length > 0) {
            const textColor = isDark ? '#E5E7EB' : '#374151';
            Chart.defaults.color = textColor;

            Object.values(charts).forEach(chart => {
                if (chart.options.plugins && chart.options.plugins.legend) {
                    chart.options.plugins.legend.labels.color = textColor;
                }
                if (chart.options.scales) {
                    if (chart.options.scales.x) {
                        if (chart.options.scales.x.ticks) chart.options.scales.x.ticks.color = textColor;
                        if (chart.options.scales.x.title) chart.options.scales.x.title.color = textColor;
                    }
                    if (chart.options.scales.y) {
                        if (chart.options.scales.y.ticks) chart.options.scales.y.ticks.color = textColor;
                        if (chart.options.scales.y.title) chart.options.scales.y.title.color = textColor;
                    }
                }
                if (chart.config.type === 'doughnut') {
                    chart.data.datasets[0].backgroundColor[1] = isDark ? '#4B5563' : '#e5e7eb';
                }
                chart.update();
            });
        }
    };
    const toggleTheme = () => {
        const newIsDark = !document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
        applyTheme(newIsDark);
    };
    themeToggleBtnSetup.addEventListener('click', toggleTheme);
    themeToggleBtnDashboard.addEventListener('click', toggleTheme);
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme === 'dark' || (savedTheme === null && prefersDark));

    // --- FUNÇÕES DO MODAL (Mantidas) ---
    const showModal = () => { modal.classList.remove('hidden'); modal.classList.add('flex'); document.getElementById('subject-deadline').min = new Date().toISOString().split('T')[0]; };
    const hideModal = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); subjectForm.reset(); document.getElementById('modal-error').textContent = ''; };

    // --- FUNÇÕES DE MANIPULAÇÃO DE DADOS (Mantidas) ---
    const renderSubjectsList = () => {
        subjectsListEl.innerHTML = '';
        if (subjects.length === 0) {
            subjectsListEl.appendChild(noSubjectsMsg);
            generatePlanBtn.classList.add('hidden');
            return;
        }
        noSubjectsMsg.remove();
        subjects.forEach((sub, index) => {
            const el = document.createElement('div');
            el.className = 'bg-stone-100 dark:bg-gray-700 p-3 rounded-lg flex justify-between items-center';
            el.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-3 h-3 rounded-full" style="background-color: ${sub.color}"></div>
                    <div>
                        <p class="font-semibold dark:text-gray-200">${sub.name}</p>
                        <p class="text-sm text-stone-600 dark:text-gray-400">${sub.minutes} min - até ${new Date(sub.deadline + 'T00:00:00').toLocaleDateString()}</p>
                    </div>
                </div>
                <button data-index="${index}" class="remove-subject-btn text-red-500 hover:text-red-700 font-bold text-xl">&times;</button>
            `;
            subjectsListEl.appendChild(el);
        });
        generatePlanBtn.classList.remove('hidden');
    };
    const addSubject = (e) => {
        e.preventDefault();
        const name = document.getElementById('subject-name').value.trim();
        const minutes = parseInt(document.getElementById('subject-minutes').value);
        const deadline = document.getElementById('subject-deadline').value;
        if (!name || !minutes || !deadline) { document.getElementById('modal-error').textContent = 'Todos os campos são obrigatórios.'; return; }
        subjects.push({ name, minutes, deadline, id: `sub${subjects.length}`, color: colors[colorIndex % colors.length] });
        colorIndex++;
        renderSubjectsList();
        hideModal();
    };
    const removeSubject = (e) => {
        if (e.target.classList.contains('remove-subject-btn')) {
            subjects.splice(parseInt(e.target.dataset.index), 1);
            renderSubjectsList();
        }
    };
    
    // --- LÓGICA PRINCIPAL: GERADOR DE PLANO (Mantida) ---
    const generatePlan = () => {
        if (subjects.length === 0) return;
        studyPlan = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const finalDeadline = new Date(Math.max(...subjects.map(s => new Date(s.deadline + 'T00:00:00'))));
        const totalDaysInPlan = Math.ceil((finalDeadline - today) / (1000 * 60 * 60 * 24)) + 1;
        const subjectsProgress = subjects.map(s => ({ ...s, remainingMinutes: s.minutes }));
        for (let i = 0; i < totalDaysInPlan; i++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + i);
            const currentDateString = currentDate.toISOString().split('T')[0];
            subjectsProgress.forEach(subject => {
                const subjectDeadline = new Date(subject.deadline + 'T00:00:00');
                if (currentDate <= subjectDeadline && subject.remainingMinutes > 0) {
                    const remainingDays = Math.ceil((subjectDeadline - currentDate) / (1000 * 60 * 60 * 24)) + 1;
                    const minutesForDay = Math.ceil(subject.remainingMinutes / remainingDays);
                    if (minutesForDay > 0) {
                        studyPlan.push({
                            date: currentDateString,
                            discipline: subject.name,
                            minutes: minutesForDay,
                            id: subject.id,
                            completed: false
                        });
                        subject.remainingMinutes -= minutesForDay;
                    }
                }
            });
        }
        const fullPlan = { subjects, studyPlan };
        localStorage.setItem('studyPlan', JSON.stringify(fullPlan));
        initializeApp(fullPlan);
    };

    // --- FUNÇÕES DE RENDERIZAÇÃO E ATUALIZAÇÃO DA INTERFACE ---
    const initializeApp = (plan) => {
        subjects = plan.subjects;
        studyPlan = plan.studyPlan;
        setupView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        renderDashboardCards();
        // -- ALTERADO: Chama a nova função de renderização semanal
        renderWeeklyCalendar();
        destroyCharts();
        initializeCharts();
        updateAllVisuals();
    };
    
    // -- NOVO: Função para atualizar o cabeçalho da semana
    const updateWeekHeader = (start, end) => {
        const options = { month: 'long', day: 'numeric' };
        const startStr = start.toLocaleDateString('pt-BR', { day: 'numeric' });
        const endStr = end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        weekRangeHeader.textContent = `${startStr} - ${endStr}`;
    };

    // -- NOVO: Função para renderizar o calendário semanal --
    // -- ATUALIZADO: Função para renderizar o calendário de forma responsiva --
    const renderWeeklyCalendar = () => {
        calendarGrid.innerHTML = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfWeek = new Date(displayedDate);
        startOfWeek.setDate(displayedDate.getDate() - displayedDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        updateWeekHeader(startOfWeek, endOfWeek);

        // Nomes dos dias da semana para a visualização em lista
        const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            const dateString = day.toISOString().split('T')[0];
            const isToday = dateString === today.toISOString().split('T')[0];

            // --- AQUI ESTÁ A PRINCIPAL MUDANÇA ---
            // O contêiner de cada dia agora tem classes diferentes e mais conteúdo
            const dayEl = document.createElement('div');
            // Classes para a versão em lista (mobile) e grade (desktop)
            dayEl.className = 'bg-white dark:bg-gray-800 sm:dark:bg-transparent sm:bg-transparent rounded-lg p-3 sm:p-1.5 flex flex-col sm:min-h-[120px] border-b sm:border dark:border-gray-700';

            // Cabeçalho do dia (mais detalhado para a vista de lista)
            const dayHeader = document.createElement('div');
            dayHeader.className = 'flex justify-between items-center sm:flex-col sm:items-center gap-2';
            
            // Adiciona o nome do dia da semana (ex: "Quarta") apenas na vista mobile
            dayHeader.innerHTML = `
                <h3 class="sm:hidden font-bold text-base dark:text-white">${dayNames[day.getDay()]}</h3>
                <span class="font-semibold text-sm ${isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'dark:text-gray-300'}">
                    ${day.getDate()}
                </span>
            `;
            
            dayEl.appendChild(dayHeader);

            // Container para as tarefas
            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'mt-2 space-y-2 flex-grow'; // Mais espaçamento

            const tasksForDay = studyPlan.filter(task => task.date === dateString);

            if (tasksForDay.length > 0) {
                tasksForDay.forEach(task => {
                    const subject = subjects.find(s => s.id === task.id);
                    const taskEl = document.createElement('div');
                    const taskIndex = studyPlan.indexOf(task);
                    
                    // Layout da tarefa melhorado, agora horizontal
                    taskEl.className = 'flex items-center gap-3 p-2 rounded-md';
                    taskEl.style.backgroundColor = `${subject.color}20`; // Cor com transparência

                    taskEl.innerHTML = `
                        <input type="checkbox" id="task-${taskIndex}" data-index="${taskIndex}" class="flex-shrink-0 h-5 w-5 accent-blue-600" ${task.completed ? 'checked' : ''}>
                        <label for="task-${taskIndex}" class="flex-grow cursor-pointer ${task.completed ? 'line-through text-gray-400' : ''}">
                            <p class="font-semibold" style="color: ${subject.color}">${task.discipline}</p>
                            <p class="text-xs dark:text-gray-300">${task.minutes} min</p>
                        </label>
                    `;
                    tasksContainer.appendChild(taskEl);
                });
            } else {
                 // Mensagem para dias sem tarefas na vista de lista
                tasksContainer.innerHTML = '<p class="sm:hidden text-sm text-gray-400 dark:text-gray-500 pt-2">Nenhuma tarefa.</p>';
            }

            dayEl.appendChild(tasksContainer);
            calendarGrid.appendChild(dayEl);
        }
    };
    
    // As funções abaixo (cards, visuals, charts) são mantidas como estão
    const renderDashboardCards = () => {
        disciplineCardsContainer.innerHTML = '';
        subjects.forEach(sub => {
            const card = document.createElement('div');
            card.id = `card-${sub.id}`;
            card.className = 'bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm';
            card.innerHTML = `<h3 class="font-semibold text-stone-700 dark:text-gray-300">${sub.name}</h3><p id="progressText-${sub.id}" class="text-2xl font-bold my-2 dark:text-white">0%</p><div class="w-full bg-stone-200 dark:bg-gray-700 rounded-full h-2.5"><div id="progressBar-${sub.id}" class="h-2.5 rounded-full" style="width: 0%; background-color: ${sub.color}"></div></div><p id="progressSummary-${sub.id}" class="text-xs text-stone-500 dark:text-gray-400 mt-2 text-right">0 / ${sub.minutes} min</p>`;
            disciplineCardsContainer.appendChild(card);
        });
    };

    const updateAllVisuals = () => {
        let completedMinutes = 0;
        const completedByDiscipline = subjects.reduce((acc, sub) => ({...acc, [sub.id]: 0}), {});
        studyPlan.forEach(task => {
            if (task.completed) {
                completedMinutes += task.minutes;
                if (completedByDiscipline.hasOwnProperty(task.id)) {
                    completedByDiscipline[task.id] += task.minutes;
                }
            }
        });
        const totalGoal = subjects.reduce((sum, s) => sum + s.minutes, 0);
        document.getElementById('overallProgressText').textContent = totalGoal > 0 ? `${Math.round((completedMinutes / totalGoal) * 100)}%` : '0%';
        document.getElementById('progressSummary').textContent = `${completedMinutes.toFixed(0)} de ${totalGoal} min concluídos`;
        subjects.forEach(sub => {
            const goal = sub.minutes;
            const progress = goal > 0 ? (completedByDiscipline[sub.id] / goal) * 100 : 0;
            document.getElementById(`progressText-${sub.id}`).textContent = `${Math.round(progress)}%`;
            document.getElementById(`progressBar-${sub.id}`).style.width = `${progress}%`;
            document.getElementById(`progressSummary-${sub.id}`).textContent = `${completedByDiscipline[sub.id].toFixed(0)} / ${goal} min`;
        });
        updateCharts(completedMinutes, completedByDiscipline);
        localStorage.setItem('studyPlan', JSON.stringify({subjects, studyPlan}));
    };

    const destroyCharts = () => Object.values(charts).forEach(chart => chart.destroy());

    const initializeCharts = () => {
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#E5E7EB' : '#374151';
        Chart.defaults.color = textColor;
        const totalGoal = subjects.reduce((sum, s) => sum + s.minutes, 0);
        charts.overall = new Chart(document.getElementById('overallProgressChart').getContext('2d'), { type: 'doughnut', data: { datasets: [{ data: [0, totalGoal], backgroundColor: ['#2563eb', isDark ? '#4B5563' : '#e5e7eb'], borderWidth: 0, borderRadius: 5, }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { tooltip: { enabled: false } } } });
        const cumulativePlanned = studyPlan.map(((sum) => (value) => sum += value.minutes)(0));
        charts.trend = new Chart(document.getElementById('progressTrendChart').getContext('2d'), { type: 'line', data: { labels: studyPlan.map(d => new Date(d.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})), datasets: [ { label: 'Planejado', data: cumulativePlanned, borderColor: '#a8a29e', borderWidth: 2, pointRadius: 0, tension: 0.1, borderDash: [5, 5] }, { label: 'Realizado', data: [], borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderWidth: 3, pointRadius: 0, tension: 0.1, fill: true, } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: {color: textColor} }, x: {ticks: {color: textColor}} }, plugins: { legend: { position: 'top', labels: {color: textColor} } } } });
        charts.distribution = new Chart(document.getElementById('disciplineDistributionChart').getContext('2d'), { type: 'bar', data: { labels: subjects.map(s => s.name), datasets: [ { label: 'Concluído', data: subjects.map(() => 0), backgroundColor: subjects.map(s => s.color) }, { label: 'Restante', data: subjects.map(s => s.minutes), backgroundColor: subjects.map(s => `${s.color}4D`) } ] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: {color: textColor} } }, scales: { x: { stacked: true, title: { display: true, text: 'Minutos', color: textColor }, ticks: {color: textColor} }, y: { stacked: true, ticks: {color: textColor} } } } });
    };

    const updateCharts = (completedMinutes, completedByDiscipline) => {
        const isDark = document.documentElement.classList.contains('dark');
        const totalGoal = subjects.reduce((sum, s) => sum + s.minutes, 0);
        if (charts.overall) {
            charts.overall.data.datasets[0].backgroundColor = ['#2563eb', isDark ? '#4B5563' : '#e5e7eb'];
            charts.overall.data.datasets[0].data = [completedMinutes, Math.max(0, totalGoal - completedMinutes)];
            charts.overall.update('none');
        }
        if (charts.trend) {
            const cumulativeRealized = [];
            let cumulativeSum = 0;
            studyPlan.forEach(task => { if (task.completed) cumulativeSum += task.minutes; cumulativeRealized.push(cumulativeSum); });
            charts.trend.data.datasets[1].data = cumulativeRealized;
            charts.trend.update();
        }
        if (charts.distribution) {
            const completedData = subjects.map(sub => completedByDiscipline[sub.id] || 0);
            const remainingData = subjects.map(sub => Math.max(0, sub.minutes - (completedByDiscipline[sub.id] || 0)));
            charts.distribution.data.datasets[0].data = completedData;
            charts.distribution.data.datasets[1].data = remainingData;
            charts.distribution.update();
        }
    };
    
    const resetPlan = () => {
        if (confirm('Tem certeza que deseja apagar o plano atual e começar de novo?')) {
            localStorage.removeItem('studyPlan');
            subjects = [];
            studyPlan = [];
            colorIndex = 0;
            renderSubjectsList();
            dashboardView.classList.add('hidden');
            setupView.classList.remove('hidden');
        }
    };

    // --- ADIÇÃO DOS EVENT LISTENERS ---
    addSubjectBtn.addEventListener('click', showModal);
    cancelBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => e.target === modal && hideModal());
    subjectForm.addEventListener('submit', addSubject);
    subjectsListEl.addEventListener('click', removeSubject);
    generatePlanBtn.addEventListener('click', generatePlan);
    resetPlanBtn.addEventListener('click', resetPlan);
    
    calendarGrid.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const taskIndex = parseInt(e.target.dataset.index);
            studyPlan[taskIndex].completed = e.target.checked;
            updateAllVisuals();
            // -- PEQUENA MELHORIA: Re-renderiza o calendário para atualizar o estilo da tarefa (ex: line-through)
            renderWeeklyCalendar(); 
        }
    });

    // -- ALTERADO: Event listeners para navegação semanal
    prevWeekBtn.addEventListener('click', () => { displayedDate.setDate(displayedDate.getDate() - 7); renderWeeklyCalendar(); });
    nextWeekBtn.addEventListener('click', () => { displayedDate.setDate(displayedDate.getDate() + 7); renderWeeklyCalendar(); });

    // --- INICIALIZAÇÃO DA APLICAÇÃO ---
    const savedPlanData = localStorage.getItem('studyPlan');
    if (savedPlanData) {
        initializeApp(JSON.parse(savedPlanData));
    }
});
