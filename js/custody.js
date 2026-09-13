/**
 * Natural Snacks HR System - Custody & Expenses Module
 * موديول إدارة العهدة المالية والمشتريات والمنصرفات وتصفية العهدة
 */

const Custody = {
    filterCategory: 'all',
    searchQuery: '',

    init() {
        this.render();
    },

    render() {
        this.renderStats();
        this.renderExpensesTable();
        this.renderDepositsTable();
    },

    renderStats() {
        const stats = Storage.getCustodyStats();

        const elDeposits = document.getElementById('custodyTotalDeposits');
        const elExpenses = document.getElementById('custodyTotalExpenses');
        const elBalance = document.getElementById('custodyRemainingBalance');
        const elProgress = document.getElementById('custodyProgressFill');
        const elPercentText = document.getElementById('custodyPercentText');

        if (elDeposits) elDeposits.innerText = stats.totalDeposits.toLocaleString('ar-EG') + ' ج.م';
        if (elExpenses) elExpenses.innerText = stats.totalExpenses.toLocaleString('ar-EG') + ' ج.م';
        if (elBalance) {
            elBalance.innerText = stats.balance.toLocaleString('ar-EG') + ' ج.م';
            if (stats.balance < 1000) {
                elBalance.style.color = '#dc2626';
            } else if (stats.balance < 3000) {
                elBalance.style.color = '#d97706';
            } else {
                elBalance.style.color = '#059669';
            }
        }

        if (elProgress) elProgress.style.width = stats.percentage + '%';
        if (elPercentText) elPercentText.innerText = `تم استهلاك ${stats.percentage}% من إجمالي العهدة`;
    },

    renderExpensesTable() {
        const tbody = document.getElementById('custodyExpensesTableBody');
        if (!tbody) return;

        let expenses = Storage.data.custody.expenses || [];

        if (this.filterCategory !== 'all') {
            expenses = expenses.filter(e => e.category === this.filterCategory);
        }

        if (this.searchQuery.trim() !== '') {
            const q = this.searchQuery.trim().toLowerCase();
            expenses = expenses.filter(e => 
                e.item.toLowerCase().includes(q) || 
                (e.notes && e.notes.toLowerCase().includes(q)) ||
                (e.receiptNo && e.receiptNo.toLowerCase().includes(q))
            );
        }

        if (expenses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#94a3b8;">لا توجد مشتريات أو مصروفات مسجلة</td></tr>`;
            return;
        }

        let html = '';
        let counter = 1;
        [...expenses].reverse().forEach(exp => {
            html += `
                <tr>
                    <td>${counter++}</td>
                    <td style="font-weight:600;">${exp.date}</td>
                    <td style="font-weight:700; text-align:right;">${exp.item}</td>
                    <td><span class="badge badge-primary">${exp.category}</span></td>
                    <td style="font-weight:800; color:#dc2626; font-size:0.95rem;">${parseFloat(exp.price).toLocaleString('ar-EG')} ج.م</td>
                    <td style="color:#64748b; font-size:0.8rem;">
                        ${exp.receiptNo ? `<span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; margin-left:4px;">${exp.receiptNo}</span>` : ''}
                        ${exp.notes || '-'}
                    </td>
                    <td class="no-print">
                        <button class="btn btn-sm btn-danger btn-icon-only" title="حذف المصروف" onclick="Custody.confirmDeleteExpense('${exp.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    renderDepositsTable() {
        const tbody = document.getElementById('custodyDepositsTableBody');
        if (!tbody) return;

        const deposits = Storage.data.custody.deposits || [];
        if (deposits.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">لا توجد مبالغ عهدة مستلمة</td></tr>`;
            return;
        }

        let html = '';
        let counter = 1;
        [...deposits].reverse().forEach(dep => {
            html += `
                <tr>
                    <td>${counter++}</td>
                    <td style="font-weight:600;">${dep.date}</td>
                    <td style="font-weight:800; color:#059669; font-size:0.95rem;">${parseFloat(dep.amount).toLocaleString('ar-EG')} ج.م</td>
                    <td>${dep.payer || 'الشركة'}</td>
                    <td style="color:#64748b; font-size:0.8rem;">${dep.receiptNo || '-'} / ${dep.notes || ''}</td>
                    <td class="no-print">
                        <button class="btn btn-sm btn-danger btn-icon-only" title="حذف" onclick="Custody.confirmDeleteDeposit('${dep.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    openAddExpenseModal() {
        document.getElementById('modalExpenseDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('modalExpenseItem').value = '';
        document.getElementById('modalExpensePrice').value = '';
        document.getElementById('modalExpenseReceipt').value = '';
        document.getElementById('modalExpenseNotes').value = '';
        document.getElementById('addExpenseModal').classList.add('show');
    },

    saveExpense() {
        const item = document.getElementById('modalExpenseItem').value.trim();
        const price = parseFloat(document.getElementById('modalExpensePrice').value);

        if (!item) {
            alert('يرجى كتابة بيان الصنف أو المشتريات!');
            return;
        }
        if (!price || price <= 0) {
            alert('يرجى إدخال مبلغ صحيح!');
            return;
        }

        Storage.addCustodyExpense({
            date: document.getElementById('modalExpenseDate').value,
            item: item,
            category: document.getElementById('modalExpenseCategory').value,
            price: price,
            receiptNo: document.getElementById('modalExpenseReceipt').value.trim(),
            notes: document.getElementById('modalExpenseNotes').value.trim()
        });

        document.getElementById('addExpenseModal').classList.remove('show');
        this.render();
        Attendance.updateDashboardStats();
        App.showToast(`تم خصم (${price} ج) من العهدة بنجاح`, 'success');
    },

    openAddDepositModal() {
        document.getElementById('modalDepositDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('modalDepositAmount').value = '';
        document.getElementById('modalDepositPayer').value = 'إدارة الشركة';
        document.getElementById('modalDepositReceipt').value = '';
        document.getElementById('modalDepositNotes').value = '';
        document.getElementById('addDepositModal').classList.add('show');
    },

    saveDeposit() {
        const amount = parseFloat(document.getElementById('modalDepositAmount').value);
        if (!amount || amount <= 0) {
            alert('يرجى إدخال مبلغ الإيداع!');
            return;
        }

        Storage.addCustodyDeposit({
            date: document.getElementById('modalDepositDate').value,
            amount: amount,
            payer: document.getElementById('modalDepositPayer').value.trim(),
            receiptNo: document.getElementById('modalDepositReceipt').value.trim(),
            notes: document.getElementById('modalDepositNotes').value.trim()
        });

        document.getElementById('addDepositModal').classList.remove('show');
        this.render();
        Attendance.updateDashboardStats();
        App.showToast(`تمت إضافة إيداع عهدة بقيمة (${amount} ج) بنجاح`, 'success');
    },

    confirmDeleteExpense(id) {
        if (confirm('هل أنت متأكد من حذف هذا المصروف؟\n(سيتم استرجاع قيمته لرصيد العهدة)')) {
            Storage.deleteCustodyExpense(id);
            this.render();
            Attendance.updateDashboardStats();
            App.showToast('تم حذف المصروف واسترجاع قيمته إلى الرصيد', 'info');
        }
    },

    confirmDeleteDeposit(id) {
        if (confirm('هل أنت متأكد من حذف إيداع العهدة هذا؟')) {
            Storage.deleteCustodyDeposit(id);
            this.render();
            Attendance.updateDashboardStats();
            App.showToast('تم حذف الإيداع', 'info');
        }
    },

    // Custody Settlement Report Generator & Print
    generateSettlementReport() {
        const stats = Storage.getCustodyStats();
        const expenses = Storage.data.custody.expenses || [];
        const printArea = document.getElementById('settlementReportPrintArea');
        if (!printArea) return;

        const d = new Date();
        const printDate = `${d.getFullYear()}/${(d.getMonth()+1)}/${d.getDate()} - ${d.toLocaleTimeString('ar-EG')}`;

        let rowsHtml = '';
        let totalExpensesCalc = 0;
        expenses.forEach((exp, idx) => {
            totalExpensesCalc += parseFloat(exp.price) || 0;
            rowsHtml += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${exp.date}</td>
                    <td style="text-align:right; font-weight:bold;">${exp.item}</td>
                    <td>${exp.category}</td>
                    <td>${exp.receiptNo || '-'}</td>
                    <td style="font-weight:bold;">${parseFloat(exp.price).toLocaleString('ar-EG')} ج.م</td>
                    <td style="font-size:8.5pt;">${exp.notes || '-'}</td>
                </tr>
            `;
        });

        let printHtml = `
            <div class="settlement-print-sheet">
                <div class="settlement-print-header">
                    <div>
                        <h2 style="margin:0; font-size:16pt; color:#059669;">شركة ناتشورال سناكس (Natural Snacks)</h2>
                        <p style="margin:2px 0; font-size:10pt; color:#475569;">إدارة الموارد البشرية والشؤون المالية</p>
                    </div>
                    <div class="settlement-title">
                        <h1 style="margin:0; font-size:17pt; border:2px solid #059669; color:#065f46; background:#d1fae5; padding:6px 20px; border-radius:8px; display:inline-block;">كشف تسوية وتصفية العهدة النقدية</h1>
                    </div>
                    <div style="text-align:left; font-size:9pt;">
                        <div><strong>تاريخ الطباعة:</strong> ${printDate}</div>
                        <div><strong>مسؤول العهدة:</strong> مسؤول HR</div>
                    </div>
                </div>

                <div class="settlement-summary-box">
                    <div>
                        <strong>إجمالي العهدة المستلمة:</strong>
                        <span style="font-size:13pt; color:#059669; font-weight:bold; margin-right:6px;">${stats.totalDeposits.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                    <div>
                        <strong>إجمالي المنصرف الفعلي:</strong>
                        <span style="font-size:13pt; color:#dc2626; font-weight:bold; margin-right:6px;">${stats.totalExpenses.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                    <div>
                        <strong>الرصيد المتبقي للتسليم:</strong>
                        <span style="font-size:14pt; color:#0284c7; font-weight:bold; margin-right:6px;">${stats.balance.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                </div>

                <table class="settlement-table">
                    <thead>
                        <tr>
                            <th style="width:35px;">م</th>
                            <th style="width:85px;">التاريخ</th>
                            <th style="text-align:right;">بيان المشتريات / الصنف</th>
                            <th style="width:120px;">البند / التصنيف</th>
                            <th style="width:95px;">رقم الفاتورة</th>
                            <th style="width:100px;">المبلغ</th>
                            <th>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="7">لا توجد مصروفات مسجلة</td></tr>'}
                        <tr style="background:#f1f5f9; font-weight:bold; font-size:11pt;">
                            <td colspan="5" style="text-align:right;">إجمالي المصروفات والمشتريات</td>
                            <td style="color:#dc2626;">${totalExpensesCalc.toLocaleString('ar-EG')} ج.م</td>
                            <td>-</td>
                        </tr>
                    </tbody>
                </table>

                <div class="settlement-signatures">
                    <div class="signature-box">
                        <strong>مسؤول العهدة (المستلم)</strong>
                        <div class="signature-line">الاسم والتوقيع</div>
                    </div>
                    <div class="signature-box">
                        <strong>المراجع / المحاسب</strong>
                        <div class="signature-line">الاسم والتوقيع</div>
                    </div>
                    <div class="signature-box">
                        <strong>المدير المالي والإداري</strong>
                        <div class="signature-line">الاعتماد والختم</div>
                    </div>
                </div>
            </div>
        `;

        printArea.innerHTML = printHtml;

        // Set class and trigger print
        document.body.classList.remove('printing-payroll');
        document.body.classList.add('printing-custody');

        setTimeout(() => {
            window.print();
            setTimeout(() => {
                document.body.classList.remove('printing-custody');
            }, 1000);
        }, 300);
    }
};

window.Custody = Custody;
