const API = {
    config: {
        coldCallStageName: 'Новый лид (первичный контакт)',
        coldCallStageId: null,
    },

    init() {
        return new Promise((resolve, reject) => {
            if (typeof BX24 !== 'undefined') {
                BX24.init(() => {
                    console.log('BX24 initialized');
                    resolve();
                });
            } else {
                reject(new Error('BX24 SDK not loaded'));
            }
        });
    },

    call(method, params = {}) {
        return new Promise((resolve, reject) => {
            BX24.callMethod(method, params, (result) => {
                if (result.error()) {
                    reject(result.error());
                } else {
                    resolve(result.data());
                }
            });
        });
    },

    async getColdCallStageId() {
        if (this.config.coldCallStageId) {
            return this.config.coldCallStageId;
        }

        try {
            const categories = await this.call('crm.dealcategory.list');
            const categoryId = categories.length > 0 ? categories[0].ID : 0;

            const stages = await this.call('crm.dealcategory.stage.list', {
                id: categoryId
            });

            const stage = stages.find(s => 
                s.NAME === this.config.coldCallStageName
            );

            if (stage) {
                this.config.coldCallStageId = stage.STATUS_ID;
                return stage.STATUS_ID;
            } else {
                throw new Error('Стадия "Холодный обзвон" не найдена');
            }
        } catch (error) {
            console.error('Error getting stage ID:', error);
            throw error;
        }
    },

    async getColdCallDeals() {
        const stageId = await this.getColdCallStageId();
        
        const deals = await this.call('crm.deal.list', {
            filter: { STAGE_ID: stageId },
            select: ['ID', 'TITLE', 'CONTACT_ID', 'COMPANY_ID', 'ASSIGNED_BY_ID', 'DATE_MODIFY', 'STAGE_ID'],
            order: { DATE_MODIFY: 'ASC' },
            limit: 50
        });

        return deals;
    },

    async getLastCall(dealId) {
        const activities = await this.call('crm.activity.list', {
            filter: {
                OWNER_TYPE_ID: 2,
                OWNER_ID: dealId,
                TYPE_ID: 2,
                COMPLETED: 'Y'
            },
            order: { END_TIME: 'DESC' },
            limit: 1
        });

        return activities.length > 0 ? activities[0] : null;
    },

    async getContact(contactId) {
        if (!contactId) return null;
        return await this.call('crm.contact.get', { id: contactId });
    },

    async getCompany(companyId) {
        if (!companyId) return null;
        return await this.call('crm.company.get', { id: companyId });
    },

    async getClientPhone(deal) {
        if (deal.CONTACT_ID) {
            const contact = await this.getContact(deal.CONTACT_ID);
            if (contact && contact.PHONE && contact.PHONE.length > 0) {
                return contact.PHONE[0].VALUE;
            }
        }

        if (deal.COMPANY_ID) {
            const company = await this.getCompany(deal.COMPANY_ID);
            if (company && company.PHONE && company.PHONE.length > 0) {
                return company.PHONE[0].VALUE;
            }
        }

        return null;
    },

    async getTodayCalls() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const calls = await this.call('crm.activity.list', {
            filter: {
                TYPE_ID: 2,
                COMPLETED: 'Y',
                '>=END_TIME': today.toISOString(),
                '<END_TIME': tomorrow.toISOString()
            },
            limit: 1
        });

        return calls.length;
    },

    async getConversion() {
        const stageId = await this.getColdCallStageId();

        const totalDeals = await this.call('crm.deal.list', {
            filter: { STAGE_ID: stageId },
            limit: 1
        });

        const deals = await this.call('crm.deal.list', {
            filter: { STAGE_ID: stageId },
            select: ['ID'],
            limit: 50
        });

        let converted = 0;
        for (const deal of deals) {
            try {
                const timeline = await this.call('crm.timeline.log.list', {
                    filter: {
                        ENTITY_TYPE_ID: 2,
                        ENTITY_ID: deal.ID
                    },
                    limit: 10
                });

                const hasConversion = timeline.some(item => 
                    item.TYPE === 'STAGE_CHANGE' && 
                    item.PREVIOUS_STAGE_ID === stageId
                );

                if (hasConversion) {
                    converted++;
                }
            } catch (e) {
                console.warn('Error checking timeline for deal', deal.ID, e);
            }
        }

        return {
            total: totalDeals.length,
            converted: converted,
            percentage: totalDeals.length > 0 ? Math.round((converted / totalDeals.length) * 100) : 0
        };
    },

    openCallCard(phone, dealId) {
        if (typeof BX24 !== 'undefined') {
            BX24.callMethod('telephony.externalcall.show', {
                PHONE_NUMBER: phone,
                ENTITY_TYPE: 'DEAL',
                ENTITY_ID: dealId
            });
        } else {
            console.error('BX24 not available');
            alert('Телефония недоступна. Позвоните по номеру: ' + phone);
        }
    }
};
