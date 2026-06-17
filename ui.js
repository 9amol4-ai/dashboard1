const UI = {
    elements: {
        urgentList: document.getElementById('urgent-list'),
        todayStats: document.getElementById('today-stats'),
        conversionStats: document.getElementById('conversion-stats'),
        refreshBtn: document.getElementById('refresh-btn')
    },

    showLoading(container) {
        container.innerHTML = '<div class="loading">Загрузка...</div>';
    },

    showEmpty(container, message) {
        container.innerHTML = `<div class="empty-state">${message}</div>`;
    },

    showError(container, message) {
        container.innerHTML = `<div class="error">${message}</div>`;
    },

    renderClientList(clients) {
        const container = this.elements.urgentList;
        
        if (!clients || clients.length === 0) {
            this.showEmpty(container, 'Отлично! Все клиенты обзвонены 🎉');
            return;
        }

        container.innerHTML = clients.map(client => `
            <div class="client-item" data-deal-id="${client.dealId}">
                <div class="client-info">
                    <div class="client-name">${client.name}</div>
                    <div class="client-phone">${client.phone || 'Телефон не указан'}</div>
                    <div class="client-meta">
                        Последний звонок: ${client.lastCall || 'Никогда'}
                    </div>
                </div>
                <button class="btn-call" data-phone="${client.phone}" data-deal-id="${client.dealId}">
                    Позвонить
                </button>
            </div>
        `).join('');

        container.querySelectorAll('.btn-call').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const phone = e.target.dataset.phone;
                const dealId = e.target.dataset.dealId;
                this.handleCall(phone, dealId, e.target);
            });
        });
    },

    handleCall(phone, dealId, button) {
        if (!phone) {
            alert('Телефон не указан');
            return;
        }

        button.textContent = 'Звонок...';
        button.classList.add('calling');
        button.disabled = true;

        API.openCallCard(phone, dealId);

        setTimeout(() => {
            button.textContent = '✓ Позвонили';
            button.classList.remove('calling');
            button.classList.add('completed');

            setTimeout(() => {
                button.textContent = 'Позвонить';
                button.classList.remove('completed');
                button.disabled = false;
            }, 3000);
        }, 3000);
    },

    renderTodayStats(count) {
        const container = this.elements.todayStats;
        
        container.innerHTML = `
            <div class="stat-number">${count}</div>
            <div class="stat-label">звонков сегодня</div>
        `;
    },

    renderConversion(stats) {
        const container = this.elements.conversionStats;
        
        container.innerHTML = `
            <div style="display: flex; justify-content: space-around; margin-bottom: 16px;">
                <div>
                    <div class="stat-number" style="font-size: 24px;">${stats.total}</div>
                    <div class="stat-label">Всего</div>
                </div>
                <div>
                    <div class="stat-number" style="font-size: 24px;">${stats.converted}</div>
                    <div class="stat-label">Перешли</div>
                </div>
                <div>
                    <div class="stat-number" style="font-size: 24px; color: var(--color-success);">${stats.percentage}%</div>
                    <div class="stat-label">Конверсия</div>
                </div>
            </div>
            <div class="conversion-bar">
                <div class="conversion-fill" style="width: ${stats.percentage}%"></div>
            </div>
        `;
    }
};
