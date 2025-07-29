// Executa o código quando o conteúdo HTML da página estiver completamente carregado
document.addEventListener('DOMContentLoaded', () => {
    // --- MAPEAMENTO DOS ELEMENTOS HTML ---
    // Pega referências dos elementos HTML para manipulá-los no JavaScript
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
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearHeader = document.getElementById('month-year-header');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    
    // Elementos do modo escuro
    const themeToggleBtnSetup = document.getElementById('theme-toggle-setup');
    const themeToggleDarkIconSetup = document.getElementById('theme-toggle-dark-icon-setup');
    const themeToggleLightIconSetup = document.getElementById('theme-toggle-light-icon-setup');
    const themeToggleBtnDashboard = document.getElementById('theme-toggle-dashboard');
    const themeToggleDarkIconDashboard = document.getElementById('theme-toggle-dark-icon-dashboard');
    const themeToggleLightIconDashboard = document.getElementById('theme-toggle-light-icon-dashboard');

    // --- VARIÁVEIS DE ESTADO DA APLICAÇÃO ---
    // Armazenam os dados principais que a aplicação utiliza
    let subjects = []; // Array para guardar as matérias adicionadas
    let studyPlan = []; // Array para guardar as tarefas diárias do plano gerado
    let charts = {}; // Objeto para guardar as instâncias dos gráficos do Chart.js
    let displayedDate = new Date(); // Guarda a data (mês/ano) que o calendário está exibindo

    // Array de cores para ser usado nas matérias e gráficos
    const colors = ['#3b82f6', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#65a30d'];
    let colorIndex = 0; // Índice para percorrer o array de cores

    // --- LÓGICA DO MODO ESCURO (CORRIGIDA) ---
    // Função para aplicar o tema (claro ou escuro) e atualizar os gráficos
    const applyTheme = (isDark) => {
        // Adiciona ou remove a classe 'dark' do elemento <html>
        document.documentElement.classList.toggle('dark', isDark);

        // Alterna a visibilidade dos ícones de sol e lua
        themeToggleDarkIconSetup.classList.toggle('hidden', isDark);
        themeToggleLightIconSetup.classList.toggle('hidden', !isDark);
        themeToggleDarkIconDashboard.classList.toggle('hidden', isDark);
        themeToggleLightIconDashboard.classList.toggle('hidden', !isDark);

        // Atualiza as cores dos gráficos somente se eles já existirem
        if (Object.keys(charts).length > 0) {
            const textColor = isDark ? '#E5E7EB' : '#374151';
            Chart.defaults.color = textColor; // Define a cor padrão para todos os textos dos gráficos

            Object.values(charts).forEach(chart => {
                // Atualiza a cor da legenda
                if (chart.options.plugins && chart.options.plugins.legend) {
                    chart.options.plugins.legend.labels.color = textColor;
                }
                // Atualiza a cor dos eixos (escalas), se existirem
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
                // Correção específica para a cor de fundo do gráfico de rosca no modo escuro
                if (chart.config.type === 'doughnut') {
                    chart.data.datasets[0].backgroundColor[1] = isDark ? '#4B5563' : '#e5e7eb';
                }
                chart.update(); // Reaplica as mudanças no gráfico
            });
        }
    };

    // Função para alternar o tema ao clicar no botão
    const toggleTheme = () => {
        // Verifica o estado atual para determinar o novo estado
        const newIsDark = !document.documentElement.classList.contains('dark');
        // Salva a preferência no localStorage
        localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
        // Aplica o novo tema
        applyTheme(newIsDark);
    };

    // Adiciona o evento de clique nos botões de tema
    themeToggleBtnSetup.addEventListener('click', toggleTheme);
    themeToggleBtnDashboard.addEventListener('click', toggleTheme);
    
    // Verifica a preferência de tema salva ou do sistema ao carregar a página
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme === 'dark' || (savedTheme === null && prefersDark));


    // --- FUNÇÕES DO MODAL ---
    // Mostra o modal e define a data mínima para o campo de data
    const showModal = () => { modal.classList.remove('hidden'); modal.classList.add('flex'); document.getElementById('subject-deadline').min = new Date().toISOString().split('T')[0]; };
    // Esconde o modal, reseta o formulário e limpa mensagens de erro
    const hideModal = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); subjectForm.reset(); document.getElementById('modal-error').textContent = ''; };

    // --- FUNÇÕES DE MANIPULAÇÃO DE DADOS ---
    // Atualiza a lista de matérias na tela de configuração
    const renderSubjectsList = () => {
        subjectsListEl.innerHTML = ''; // Limpa a lista atual
        if (subjects.length === 0) { // Se não houver matérias...
            subjectsListEl.appendChild(noSubjectsMsg); // Mostra a mensagem "nenhuma matéria"
            generatePlanBtn.classList.add('hidden'); // Esconde o botão de gerar plano
            return;
        }
        noSubjectsMsg.remove(); // Remove a mensagem "nenhuma matéria"
        // Para cada matéria no array, cria um elemento HTML e o adiciona na lista
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
        generatePlanBtn.classList.remove('hidden'); // Mostra o botão de gerar plano
    };

    // Adiciona uma nova matéria ao array 'subjects' a partir dos dados do formulário
    const addSubject = (e) => {
        e.preventDefault(); // Impede o recarregamento da página ao submeter o formulário
        const name = document.getElementById('subject-name').value.trim();
        const minutes = parseInt(document.getElementById('subject-minutes').value);
        const deadline = document.getElementById('subject-deadline').value;
        
        if (!name || !minutes || !deadline) { document.getElementById('modal-error').textContent = 'Todos os campos são obrigatórios.'; return; }
        
        // Adiciona a nova matéria ao array com um ID e uma cor
        subjects.push({ name, minutes, deadline, id: `sub${subjects.length}`, color: colors[colorIndex % colors.length] });
        colorIndex++; // Avança para a próxima cor
        renderSubjectsList(); // Atualiza a lista na tela
        hideModal(); // Fecha o modal
    };

    // Remove uma matéria do array 'subjects'
    const removeSubject = (e) => {
        if (e.target.classList.contains('remove-subject-btn')) {
            subjects.splice(parseInt(e.target.dataset.index), 1); // Remove pelo índice
            renderSubjectsList(); // Atualiza a lista na tela
        }
    };

    // --- LÓGICA PRINCIPAL: GERADOR DE PLANO ---
    const generatePlan = () => {
        if (subjects.length === 0) return;
        
        studyPlan = []; // Reseta o plano de estudos
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Zera o horário para comparações de data

        // Encontra a data final mais distante entre todas as matérias
        const finalDeadline = new Date(Math.max(...subjects.map(s => new Date(s.deadline + 'T00:00:00'))));
        
        // Calcula o número total de dias do plano
        const totalDaysInPlan = Math.ceil((finalDeadline - today) / (1000 * 60 * 60 * 24)) + 1;

        // Cria uma cópia das matérias para manipular os minutos restantes
        const subjectsProgress = subjects.map(s => ({ ...s, remainingMinutes: s.minutes }));

        // Itera por cada dia do plano
        for (let i = 0; i < totalDaysInPlan; i++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + i);
            const currentDateString = currentDate.toISOString().split('T')[0];

            // Para cada dia, itera sobre as matérias para ver qual precisa de estudo
            subjectsProgress.forEach(subject => {
                const subjectDeadline = new Date(subject.deadline + 'T00:00:00');
                // Se a data atual for antes do prazo da matéria e ainda houver minutos a estudar...
                if (currentDate <= subjectDeadline && subject.remainingMinutes > 0) {
                    const remainingDays = Math.ceil((subjectDeadline - currentDate) / (1000 * 60 * 60 * 24)) + 1;
                    // Calcula quantos minutos estudar nesse dia (distribuição proporcional)
                    const minutesForDay = Math.ceil(subject.remainingMinutes / remainingDays);
                    
                    if (minutesForDay > 0) {
                         // Adiciona a tarefa ao plano de estudos
                         studyPlan.push({
                            date: currentDateString,
                            discipline: subject.name,
                            minutes: minutesForDay,
                            id: subject.id,
                            completed: false
                        });
                        // Subtrai os minutos do total restante da matéria
                        subject.remainingMinutes -= minutesForDay;
                    }
                }
            });
        }
        
        // Salva o plano completo no localStorage para persistência
        const fullPlan = { subjects, studyPlan };
        localStorage.setItem('studyPlan', JSON.stringify(fullPlan));
        initializeApp(fullPlan); // Inicia a visualização do dashboard
    };
    
    // --- FUNÇÕES DE RENDERIZAÇÃO E ATUALIZAÇÃO DA INTERFACE ---
    // Inicia a aplicação com os dados do plano (vindo do gerador ou do localStorage)
    const initializeApp = (plan) => {
        subjects = plan.subjects;
        studyPlan = plan.studyPlan;
        setupView.classList.add('hidden'); // Esconde a tela de configuração
        dashboardView.classList.remove('hidden'); // Mostra o dashboard
        renderDashboardCards(); // Cria os cards de progresso
        renderCalendar(); // Desenha o calendário
        destroyCharts(); // Limpa gráficos antigos
        initializeCharts(); // Cria novos gráficos
        updateAllVisuals(); // Atualiza todos os dados na tela
    };

    // Desenha o calendário na tela
    const renderCalendar = () => {
        calendarGrid.innerHTML = '';
        const year = displayedDate.getFullYear();
        const month = displayedDate.getMonth();
        monthYearHeader.textContent = displayedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Adiciona células vazias para os dias antes do início do mês
        for (let i = 0; i < firstDayOfMonth; i++) { calendarGrid.appendChild(document.createElement('div')); }

        // Adiciona uma célula para cada dia do mês
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            const dayDate = new Date(year, month, day);
            const dateString = dayDate.toISOString().split('T')[0];
            dayEl.className = 'calendar-day border border-stone-200 dark:border-gray-700 rounded-md p-1.5 flex flex-col';
            dayEl.innerHTML = `<span class="font-semibold text-sm">${day}</span><div class="flex-grow space-y-1 overflow-y-auto"></div>`;

            // Destaca o dia atual
            if (dateString === new Date().toISOString().split('T')[0]) {
                dayEl.querySelector('span').classList.add('bg-blue-600', 'text-white', 'rounded-full', 'w-6', 'h-6', 'flex', 'items-center', 'justify-center');
            }

            // Encontra e adiciona as tarefas para o dia atual
            const tasksForDay = studyPlan.filter(task => task.date === dateString);
            const tasksContainer = dayEl.querySelector('div');
            tasksForDay.forEach(task => {
                const subject = subjects.find(s => s.id === task.id);
                const taskEl = document.createElement('div');
                const taskIndex = studyPlan.indexOf(task);
                taskEl.className = 'calendar-task text-xs p-1 rounded-md flex items-start gap-1.5';
                taskEl.style.backgroundColor = `${subject.color}20`; // Cor com transparência
                taskEl.innerHTML = `
                    <input type="checkbox" id="task-${taskIndex}" data-index="${taskIndex}" class="mt-0.5 flex-shrink-0" ${task.completed ? 'checked' : ''}>
                    <label for="task-${taskIndex}" class="cursor-pointer">
                        <span class="font-semibold block" style="color: ${subject.color}">${task.discipline}</span>
                        <span class="dark:text-gray-300">${task.minutes} min</span>
                    </label>
                `;
                tasksContainer.appendChild(taskEl);
            });
            calendarGrid.appendChild(dayEl);
        }
    };

    // Cria os cards de progresso para cada matéria
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

    // Função central que recalcula e atualiza todos os elementos visuais
    const updateAllVisuals = () => {
        let completedMinutes = 0;
        const completedByDiscipline = subjects.reduce((acc, sub) => ({...acc, [sub.id]: 0}), {});
        
        // Calcula os minutos completos com base nos checkboxes marcados
        studyPlan.forEach(task => {
            if (task.completed) {
                completedMinutes += task.minutes;
                if (completedByDiscipline.hasOwnProperty(task.id)) {
                    completedByDiscipline[task.id] += task.minutes;
                }
            }
        });

        // Atualiza o progresso geral
        const totalGoal = subjects.reduce((sum, s) => sum + s.minutes, 0);
        document.getElementById('overallProgressText').textContent = totalGoal > 0 ? `${Math.round((completedMinutes / totalGoal) * 100)}%` : '0%';
        document.getElementById('progressSummary').textContent = `${completedMinutes.toFixed(0)} de ${totalGoal} min concluídos`;

        // Atualiza o progresso de cada matéria (cards)
        subjects.forEach(sub => {
            const goal = sub.minutes;
            const progress = goal > 0 ? (completedByDiscipline[sub.id] / goal) * 100 : 0;
            document.getElementById(`progressText-${sub.id}`).textContent = `${Math.round(progress)}%`;
            document.getElementById(`progressBar-${sub.id}`).style.width = `${progress}%`;
            document.getElementById(`progressSummary-${sub.id}`).textContent = `${completedByDiscipline[sub.id].toFixed(0)} / ${goal} min`;
        });
        
        // Atualiza os gráficos e salva o estado no localStorage
        updateCharts(completedMinutes, completedByDiscipline);
        localStorage.setItem('studyPlan', JSON.stringify({subjects, studyPlan}));
    };

    // Apaga instâncias antigas de gráficos para evitar sobreposição
    const destroyCharts = () => Object.values(charts).forEach(chart => chart.destroy());

    // Cria as instâncias dos três gráficos
    const initializeCharts = () => {
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#E5E7EB' : '#374151';
        Chart.defaults.color = textColor;

        const totalGoal = subjects.reduce((sum, s) => sum + s.minutes, 0);
        // Gráfico de Rosca (Progresso Geral)
        charts.overall = new Chart(document.getElementById('overallProgressChart').getContext('2d'), { type: 'doughnut', data: { datasets: [{ data: [0, totalGoal], backgroundColor: ['#2563eb', isDark ? '#4B5563' : '#e5e7eb'], borderWidth: 0, borderRadius: 5, }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { tooltip: { enabled: false } } } });
        
        // Gráfico de Linha (Planejado vs. Realizado)
        const cumulativePlanned = studyPlan.map(((sum) => (value) => sum += value.minutes)(0));
        charts.trend = new Chart(document.getElementById('progressTrendChart').getContext('2d'), { type: 'line', data: { labels: studyPlan.map(d => new Date(d.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})), datasets: [ { label: 'Planejado', data: cumulativePlanned, borderColor: '#a8a29e', borderWidth: 2, pointRadius: 0, tension: 0.1, borderDash: [5, 5] }, { label: 'Realizado', data: [], borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderWidth: 3, pointRadius: 0, tension: 0.1, fill: true, } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: {color: textColor} }, x: {ticks: {color: textColor}} }, plugins: { legend: { position: 'top', labels: {color: textColor} } } } });
        
        // Gráfico de Barras Empilhadas (Progresso por Matéria)
        charts.distribution = new Chart(document.getElementById('disciplineDistributionChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: subjects.map(s => s.name),
                datasets: [
                    { label: 'Concluído', data: subjects.map(() => 0), backgroundColor: subjects.map(s => s.color) },
                    { label: 'Restante', data: subjects.map(s => s.minutes), backgroundColor: subjects.map(s => `${s.color}4D`) }
                ]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: {color: textColor} } },
                scales: { x: { stacked: true, title: { display: true, text: 'Minutos', color: textColor }, ticks: {color: textColor} }, y: { stacked: true, ticks: {color: textColor} } }
            }
        });
    };

    // Atualiza os dados dos gráficos com base no progresso
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

    // Reseta toda a aplicação para o estado inicial
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
    // Conecta as funções aos eventos de clique e submissão dos elementos HTML
    addSubjectBtn.addEventListener('click', showModal);
    cancelBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => e.target === modal && hideModal());
    subjectForm.addEventListener('submit', addSubject);
    subjectsListEl.addEventListener('click', removeSubject);
    generatePlanBtn.addEventListener('click', generatePlan);
    resetPlanBtn.addEventListener('click', resetPlan);
    
    // Event listener para os checkboxes do calendário (usando delegação de eventos)
    calendarGrid.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const taskIndex = parseInt(e.target.dataset.index);
            studyPlan[taskIndex].completed = e.target.checked;
            updateAllVisuals();
        }
    });

    // Event listeners para a navegação do calendário
    prevMonthBtn.addEventListener('click', () => { displayedDate.setMonth(displayedDate.getMonth() - 1); renderCalendar(); });
    nextMonthBtn.addEventListener('click', () => { displayedDate.setMonth(displayedDate.getMonth() + 1); renderCalendar(); });

    // --- INICIALIZAÇÃO DA APLICAÇÃO ---
    // Verifica se há um plano salvo no localStorage e o carrega
    const savedPlan = localStorage.getItem('studyPlan');
    if (savedPlan) {
        initializeApp(JSON.parse(savedPlan));
    }
});
