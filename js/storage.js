/**
 * Natural Snacks HR System - Data & Storage Management Module (Offline)
 * إدارة قواعد البيانات المحلية، التخزين، المقاولين، النسخ الاحتياطي وسلة المهملات
 */

const DB_KEY = 'NATURAL_SNACKS_HR_DATA_V1';
const TRASH_KEY = 'NATURAL_SNACKS_HR_TRASH_V1';

const Storage = {
    data: null,
    trash: [],

    init() {
        try {
            const raw = localStorage.getItem(DB_KEY);
            if (raw) {
                this.data = JSON.parse(raw);
            }
        } catch (e) {
            console.error('Error loading localStorage:', e);
        }

        try {
            const rawTrash = localStorage.getItem(TRASH_KEY);
            if (rawTrash) {
                this.trash = JSON.parse(rawTrash);
            }
        } catch (e) {
            console.error('Error loading trash:', e);
        }

        if (!this.data || !this.data.months || Object.keys(this.data.months).length === 0) {
            this.seedInitialData();
        }

        if (!this.data.activeMonth) {
            const monthKeys = Object.keys(this.data.months);
            this.data.activeMonth = monthKeys.includes('شهر 8-2026') ? 'شهر 8-2026' : monthKeys[monthKeys.length - 1];
        }

        if (!this.data.contractors || !Array.isArray(this.data.contractors)) {
            this.data.contractors = ['عمالة مباشرة', 'عربية حمادة', 'عربية الوردية', 'عربية ابو عبده', 'عربية ام محمد'];
        }

        if (!this.data.custody) {
            this.data.custody = {
                balance: 15000,
                deposits: [
                    { id: 'dep_1', date: '2026-08-01', amount: 15000, payer: 'إدارة الشركة', notes: 'عهدة تشغيلية بداية شهر 8', receiptNo: 'REC-001' }
                ],
                expenses: [
                    { id: 'exp_1', date: '2026-08-02', item: 'أدوات نظافة ومطهرات للمصنع', category: 'نظافة ومطهرات', price: 650, notes: 'فاتورة محل الأمانة', receiptNo: 'F-102' },
                    { id: 'exp_2', date: '2026-08-05', item: 'صيانة مفاتيح لوحة الكهرباء وقطع غيار', category: 'صيانة وقطع غيار', price: 1200, notes: 'ورشة السلام', receiptNo: 'F-108' },
                    { id: 'exp_3', date: '2026-08-10', item: 'شاي وسكر وضيافة العمال والبوفيه', category: 'بوفيه وضيافة', price: 480, notes: 'سوبر ماركت البركة', receiptNo: 'F-115' },
                    { id: 'exp_4', date: '2026-08-15', item: 'كراتين وأشرطة تغليف إضافية', category: 'مستلزمات إنتاج', price: 2350, notes: 'مطبعة الأهرام', receiptNo: 'F-120' }
                ],
                settlements: []
            };
        }

        this.save();
    },

    seedInitialData() {
        const seed = window.SEED_DATA || { months: {}, employees: [], contractors: ['عمالة مباشرة'] };
        this.data = {
            activeMonth: 'شهر 8-2026',
            months: JSON.parse(JSON.stringify(seed.months || {})),
            employees: JSON.parse(JSON.stringify(seed.employees || [])),
            contractors: JSON.parse(JSON.stringify(seed.contractors || ['عمالة مباشرة'])),
            custody: {
                balance: 15000,
                deposits: [
                    { id: 'dep_1', date: '2026-08-01', amount: 15000, payer: 'إدارة الشركة', notes: 'عهدة تشغيلية بداية شهر 8', receiptNo: 'REC-001' }
                ],
                expenses: [
                    { id: 'exp_1', date: '2026-08-02', item: 'أدوات نظافة ومطهرات للمصنع', category: 'نظافة ومطهرات', price: 650, notes: 'فاتورة محل الأمانة', receiptNo: 'F-102' },
                    { id: 'exp_2', date: '2026-08-05', item: 'صيانة مفاتيح لوحة الكهرباء وقطع غيار', category: 'صيانة وقطع غيار', price: 1200, notes: 'ورشة السلام', receiptNo: 'F-108' },
                    { id: 'exp_3', date: '2026-08-10', item: 'شاي وسكر وضيافة العمال والبوفيه', category: 'بوفيه وضيافة', price: 480, notes: 'سوبر ماركت البركة', receiptNo: 'F-115' },
                    { id: 'exp_4', date: '2026-08-15', item: 'كراتين وأشرطة تغليف إضافية', category: 'مستلزمات إنتاج', price: 2350, notes: 'مطبعة الأهرام', receiptNo: 'F-120' }
                ],
                settlements: []
            },
            lastUpdated: new Date().toISOString()
        };
    },

    save() {
        try {
            this.data.lastUpdated = new Date().toISOString();
            localStorage.setItem(DB_KEY, JSON.stringify(this.data));
            localStorage.setItem(TRASH_KEY, JSON.stringify(this.trash));
            window.dispatchEvent(new CustomEvent('db-updated', { detail: this.data }));
            return true;
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            alert('تحذير: حدث خطأ أثناء حفظ البيانات في المتصفح. يرجى تنزيل نسخة احتياطية فوراً!');
            return false;
        }
    },

    // Contractors Management
    getContractorsList() {
        const set = new Set(this.data.contractors || ['عمالة مباشرة']);
        // Also scan active month to include any assigned contractors
        const activeMonth = this.getActiveMonthData();
        if (activeMonth && activeMonth.records) {
            activeMonth.records.forEach(r => {
                if (r.contractor && r.contractor.trim()) {
                    set.add(r.contractor.trim());
                }
            });
        }
        return Array.from(set);
    },

    addContractor(contractorName) {
        const name = (contractorName || '').trim();
        if (!name) return { success: false, message: 'يرجى إدخال اسم المقاول!' };

        if (!this.data.contractors) this.data.contractors = ['عمالة مباشرة'];
        
        if (!this.data.contractors.includes(name)) {
            this.data.contractors.push(name);
            this.save();
            return { success: true, message: `تمت إضافة المقاول (${name}) بنجاح` };
        }
        return { success: true, message: 'المقاول موجود بالفعل' };
    },

    renameContractor(oldName, newName) {
        const nName = (newName || '').trim();
        if (!nName) return { success: false, message: 'يرجى إدخال الاسم الجديد!' };

        // update in contractors list
        const idx = (this.data.contractors || []).indexOf(oldName);
        if (idx !== -1) {
            this.data.contractors[idx] = nName;
        } else {
            this.data.contractors.push(nName);
        }

        // update in all months records
        for (const m in this.data.months) {
            const records = this.data.months[m].records || [];
            records.forEach(r => {
                if (r.contractor === oldName) {
                    r.contractor = nName;
                }
            });
        }

        this.save();
        return { success: true, message: `تم تعديل اسم المقاول إلى (${nName}) بنجاح` };
    },

    deleteContractor(contractorName) {
        if (contractorName === 'عمالة مباشرة') {
            return { success: false, message: 'لا يمكن حذف مجموعة (عمالة مباشرة) الافتراضية!' };
        }

        this.data.contractors = (this.data.contractors || []).filter(c => c !== contractorName);

        // Reassign any workers in active month to 'عمالة مباشرة'
        for (const m in this.data.months) {
            const records = this.data.months[m].records || [];
            records.forEach(r => {
                if (r.contractor === contractorName) {
                    r.contractor = 'عمالة مباشرة';
                }
            });
        }

        this.save();
        return { success: true, message: `تم حذف المقاول (${contractorName}) وتحويل عمالته إلى عمالة مباشرة` };
    },

    getActiveMonthName() {
        return this.data.activeMonth;
    },

    setActiveMonth(monthName) {
        if (this.data.months[monthName]) {
            this.data.activeMonth = monthName;
            this.save();
            return true;
        }
        return false;
    },

    getActiveMonthData() {
        const m = this.data.activeMonth;
        if (!this.data.months[m]) {
            this.data.months[m] = { monthName: m, records: [] };
        }
        return this.data.months[m];
    },

    getAllMonthsList() {
        return Object.keys(this.data.months);
    },

    createMonth(monthName, copyFromActive = true) {
        if (this.data.months[monthName]) {
            return { success: false, message: 'هذا الشهر موجود بالفعل!' };
        }

        let newRecords = [];
        if (copyFromActive && this.data.months[this.data.activeMonth]) {
            newRecords = this.data.months[this.data.activeMonth].records.map(rec => ({
                employeeId: rec.employeeId,
                name: rec.name,
                nationalId: rec.nationalId || '',
                contractor: rec.contractor || 'عمالة مباشرة',
                isVehicle: rec.isVehicle || false,
                workerRate: rec.workerRate || 200,
                contractorRate: rec.contractorRate || 0,
                attendance: {},
                loans: 0,
                penalties: 0,
                paid: 0
            }));
        }

        this.data.months[monthName] = {
            monthName: monthName,
            records: newRecords
        };

        this.data.activeMonth = monthName;
        this.save();
        return { success: true, message: `تم إنشاء كشف ${monthName} بنجاح` };
    },

    deleteMonth(monthName) {
        if (!this.data.months[monthName]) return false;
        const keys = Object.keys(this.data.months);
        if (keys.length <= 1) {
            alert('لا يمكن حذف الشهر الوحيد في النظام!');
            return false;
        }

        this.moveToTrash('month', { monthName: monthName, data: this.data.months[monthName] });
        delete this.data.months[monthName];

        const remaining = Object.keys(this.data.months);
        this.data.activeMonth = remaining[remaining.length - 1];
        this.save();
        return true;
    },

    updateAttendance(empIndex, day, shiftValue) {
        const month = this.getActiveMonthData();
        if (!month.records[empIndex]) return false;
        
        const rec = month.records[empIndex];
        if (!rec.attendance) rec.attendance = {};

        const val = parseFloat(shiftValue) || 0;
        if (val > 0) {
            rec.attendance[day] = val;
        } else {
            delete rec.attendance[day];
        }

        this.save();
        return true;
    },

    updateEmployeeField(empIndex, field, value) {
        const month = this.getActiveMonthData();
        if (!month.records[empIndex]) return false;

        const rec = month.records[empIndex];
        if (['workerRate', 'contractorRate', 'loans', 'penalties', 'paid'].includes(field)) {
            rec[field] = parseFloat(value) || 0;
        } else {
            rec[field] = value;
        }

        this.save();
        return true;
    },

    addWorkerToActiveMonth(workerData) {
        const month = this.getActiveMonthData();
        const contractorName = (workerData.contractor || 'عمالة مباشرة').trim();

        const newRec = {
            employeeId: 'emp_' + (Date.now() + Math.floor(Math.random() * 100)),
            name: workerData.name.trim(),
            nationalId: workerData.nationalId ? workerData.nationalId.trim() : '',
            contractor: contractorName,
            isVehicle: workerData.isVehicle || false,
            workerRate: parseFloat(workerData.workerRate) || (workerData.isVehicle ? 0 : 200),
            contractorRate: parseFloat(workerData.contractorRate) || 0,
            attendance: {},
            loans: 0,
            penalties: 0,
            paid: 0
        };

        if (workerData.insertAfterIndex !== undefined && workerData.insertAfterIndex >= 0) {
            month.records.splice(workerData.insertAfterIndex + 1, 0, newRec);
        } else {
            month.records.push(newRec);
        }

        // Auto-register contractor if not exists
        if (contractorName && !this.data.contractors.includes(contractorName)) {
            this.data.contractors.push(contractorName);
        }

        this.save();
        return newRec;
    },

    deleteWorkerFromActiveMonth(empIndex) {
        const month = this.getActiveMonthData();
        if (!month.records[empIndex]) return false;

        const deleted = month.records.splice(empIndex, 1)[0];
        this.moveToTrash('worker_record', {
            monthName: this.data.activeMonth,
            record: deleted,
            index: empIndex
        });

        this.save();
        return true;
    },

    addCustodyDeposit(deposit) {
        const newDep = {
            id: 'dep_' + Date.now(),
            date: deposit.date || new Date().toISOString().split('T')[0],
            amount: parseFloat(deposit.amount) || 0,
            payer: deposit.payer || 'إدارة الشركة',
            receiptNo: deposit.receiptNo || '',
            notes: deposit.notes || ''
        };
        this.data.custody.deposits.push(newDep);
        this.save();
        return newDep;
    },

    addCustodyExpense(expense) {
        const newExp = {
            id: 'exp_' + Date.now(),
            date: expense.date || new Date().toISOString().split('T')[0],
            item: expense.item.trim(),
            category: expense.category || 'نثريات',
            price: parseFloat(expense.price) || 0,
            receiptNo: expense.receiptNo || '',
            notes: expense.notes || ''
        };
        this.data.custody.expenses.push(newExp);
        this.save();
        return newExp;
    },

    deleteCustodyExpense(expId) {
        const idx = this.data.custody.expenses.findIndex(e => e.id === expId);
        if (idx === -1) return false;

        const deleted = this.data.custody.expenses.splice(idx, 1)[0];
        this.moveToTrash('expense', { expense: deleted });
        this.save();
        return true;
    },

    deleteCustodyDeposit(depId) {
        const idx = this.data.custody.deposits.findIndex(d => d.id === depId);
        if (idx === -1) return false;

        const deleted = this.data.custody.deposits.splice(idx, 1)[0];
        this.moveToTrash('deposit', { deposit: deleted });
        this.save();
        return true;
    },

    getCustodyStats() {
        const totalDeposits = this.data.custody.deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
        const totalExpenses = this.data.custody.expenses.reduce((sum, e) => sum + (e.price || 0), 0);
        const balance = totalDeposits - totalExpenses;
        const percentage = totalDeposits > 0 ? Math.min(100, (totalExpenses / totalDeposits) * 100) : 0;

        return {
            totalDeposits,
            totalExpenses,
            balance,
            percentage: Math.round(percentage)
        };
    },

    moveToTrash(type, item) {
        this.trash.unshift({
            id: 'trash_' + Date.now(),
            type: type,
            data: item,
            deletedAt: new Date().toLocaleString('ar-EG')
        });
        if (this.trash.length > 50) this.trash.pop();
    },

    restoreFromTrash(trashId) {
        const idx = this.trash.findIndex(t => t.id === trashId);
        if (idx === -1) return false;

        const item = this.trash[idx];
        if (item.type === 'month') {
            this.data.months[item.data.monthName] = item.data.data;
        } else if (item.type === 'worker_record') {
            if (this.data.months[item.data.monthName]) {
                this.data.months[item.data.monthName].records.splice(item.data.index || 0, 0, item.data.record);
            }
        } else if (item.type === 'expense') {
            this.data.custody.expenses.push(item.data.expense);
        } else if (item.type === 'deposit') {
            this.data.custody.deposits.push(item.data.deposit);
        }

        this.trash.splice(idx, 1);
        this.save();
        return true;
    },

    emptyTrash() {
        this.trash = [];
        this.save();
        return true;
    },

    exportBackupJSON() {
        const payload = {
            appName: 'Natural Snacks HR System',
            version: '1.0',
            exportedAt: new Date().toISOString(),
            data: this.data
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const d = new Date();
        const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
        a.href = url;
        a.download = `Natural_Snacks_HR_Backup_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importBackupJSON(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (!parsed.data || !parsed.data.months) {
                return { success: false, message: 'الملف المحدد ليس ملف نسخة احتياطية صالح لنظام HR!' };
            }
            this.data = parsed.data;
            this.save();
            return { success: true, message: 'تم استعادة النسخة الاحتياطية بنجاح!' };
        } catch (e) {
            return { success: false, message: 'فشل قراءة الملف: ' + e.message };
        }
    }
};

window.Storage = Storage;
