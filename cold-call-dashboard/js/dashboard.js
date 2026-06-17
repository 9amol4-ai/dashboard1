const Dashboard = {
    refreshInterval: null,

    async init() {
        try {
            await API.init();
            console.log('API initialized');

            await this.loadData();

            this.startAutoRefresh();

            UI.elements.refreshBtn.addEventListener('click', () => {
                this.loadData();
            });

        } catch (error) {
            console.error('Dashboard initialization error:', error);
            UI.showError(UI.elements.urgentList, 'Ошибка инициализации. Проверьте подключение к Битрикс24.');
        }
    },

    async loadData() {
        UI.showLoading(UI.elements.urgentList);
        UI.showLoading(UI.elements.todayStats);
        UI.showLoading(UI.elements.conversionStats);

        try {
            await this.loadClients();
            await this.loadTodayCalls();
            await this.loadConversion();

        } catch (error) {
            console.error('Error loading data:', error);
            UI.showError(UI.elements.urgentList, 'Не удалось загрузить данные. Попробуйте обновить страницу.');
        }
    },

    async loadClients() {
        try {
            const deals = await API.getColdCallDeals();
            
            const clients = await Promise.all(deals.map(async (deal) => {
                const phone = await API.getClientPhone(deal);
                const lastCall = await API.getLastCall(deal.ID);
                
                return {
                    dealId: deal.ID,
                    name: deal.TITLE,
                    phone: phone,
                    lastCall: lastCall ? this.formatDate(lastCall.END_TIME) : null
                };
            }));

            clients.sort((a, b) => {
                if (!a.lastCall && !b.lastCall) return 0;
                if (!a.lastCall) return -1;
                if (!b.lastCall) return 1;
                return new Date(a.lastCall) - new Date(b.lastCall);
            });

            UI.renderClientList(clients);
        } catch (error) {
            console.error('Error loading clients:', error);
            UI.showError(UI.elements.urgentList, 'Не удалось загрузить список клиентов.');
        }
    },

    async loadTodayCalls() {
        try {
            const count = await API.getTodayCalls();
            UI.renderTodayStats(count);
        } catch (error) {
            console.error('Error loading today calls:', error);
            UI.showError(UI.elements.todayStats, 'Не удалось загрузить статистику звонков.');
        }
    },

    async loadConversion() {
        try {
            const stats = await API.getConversion();
            UI.renderConversion(stats);
        } catch (error) {
            console.error('Error loading conversion:', error);
            UI.showError(UI.elements.conversionStats, 'Не удалось загрузить данные конверсии.');
        }
    },

    formatDate(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            console.log('Auto-refreshing...');
            this.loadData();
        }, 60000);
    },

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
