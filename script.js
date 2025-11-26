document.addEventListener('DOMContentLoaded', function() {

    // --- ELEMEN DOM ---
    const sidebarLinks = document.querySelectorAll('#sidebar a[data-view]');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('page-title');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body-content');
    const closeModalBtn = document.querySelector('.close');

    // --- KONFIGURASI & DATA AWAL ---
    const LS_KEYS = {
        invoices: 'invoices',
        journals: 'journals',
        pettyCash: 'pettyCash',
        payrolls: 'payrolls',
        coa: 'chartOfAccounts'
    };
    
    const defaultCoa = [
        { id: 100, name: 'Kas', type: 'Asset' },
        { id: 110, name: 'Bank BCA', type: 'Asset' },
        { id: 120, name: 'Kas Kecil', type: 'Asset' },
        { id: 200, name: 'Piutang Usaha', type: 'Asset' },
        { id: 300, name: 'Persediaan Barang', type: 'Asset' },
        { id: 400, name: 'Peralatan Kantor', type: 'Asset' },
        { id: 500, name: 'Hutang Usaha', type: 'Liability' },
        { id: 510, name: 'Utang Rembursement', type: 'Liability' },
        { id: 600, name: 'Modal Pemilik', type: 'Equity' },
        { id: 700, name: 'Pendapatan Jasa PPJK', type: 'Revenue' },
        { id: 710, name: 'Pendapatan Jasa Trucking', type: 'Revenue' },
        { id: 800, name: 'Beban Gaji', type: 'Expense' },
        { id: 810, name: 'Beban Sewa Kantor', type: 'Expense' },
        { id: 820, name: 'Beban Biaya Bank', type: 'Expense' },
        { id: 830, name: 'Beban ATK', type: 'Expense' },
    ];

    // --- FUNGSI DASAR LOCALSTORAGE ---
    function readFromLS(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    function writeToLS(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function initializeData() {
        if (!localStorage.getItem(LS_KEYS.coa)) {
            writeToLS(LS_KEYS.coa, defaultCoa);
            writeToLS(LS_KEYS.invoices, []);
            writeToLS(LS_KEYS.journals, []);
            writeToLS(LS_KEYS.pettyCash, [{
                date: new Date().toISOString().split('T')[0],
                desc: 'Saldo Awal',
                debit: 5000000,
                kredit: 0,
                balance: 5000000
            }]);
            writeToLS(LS_KEYS.payrolls, []);
        }
    }

    // --- FUNGSI UTAMA ---
    function showView(viewName) {
        views.forEach(view => view.style.display = 'none');
        const targetView = document.getElementById(viewName + '-view');
        if (targetView) {
            targetView.style.display = 'block';
            pageTitle.textContent = targetView.querySelector('h2').textContent;
        }
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-view') === viewName) {
                link.classList.add('active');
            }
        });
        if (viewName === 'buku-besar') {
            populateAccountSelector();
        }
    }

    function formatCurrency(amount) {
        if (typeof amount !== 'number') return amount;
        return 'Rp ' + amount.toLocaleString('id-ID');
    }

    function openModal(title, contentHtml) {
        modalTitle.textContent = title;
        modalBody.innerHTML = contentHtml;
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    // --- LOGIKA AKUNTANSI ---
    function getAccountName(id) {
        const coa = readFromLS(LS_KEYS.coa);
        const account = coa.find(acc => acc.id === id);
        return account ? account.name : 'Akun Tidak Dikenal';
    }

    function getAccountBalance(accountId) {
        const journals = readFromLS(LS_KEYS.journals);
        let balance = 0;
        journals.filter(j => j.accountId === accountId).forEach(j => {
            balance += j.debit - j.kredit;
        });
        return balance;
    }

    function createJournalEntry(date, ref, entries, description) {
        const journals = readFromLS(LS_KEYS.journals);
        let totalDebit = 0;
        let totalKredit = 0;

        entries.forEach(e => {
            totalDebit += e.debit || 0;
            totalKredit += e.kredit || 0;
        });

        if (Math.round(totalDebit) !== Math.round(totalKredit)) {
            alert('Error: Total Debit dan Kredit harus sama!');
            return false;
        }

        entries.forEach(entry => {
            journals.push({
                date: date,
                ref: ref,
                accountId: entry.accountId,
                accountName: getAccountName(entry.accountId),
                debit: entry.debit || 0,
                kredit: entry.kredit || 0,
                description: description
            });
        });
        writeToLS(LS_KEYS.journals, journals);
        return true;
    }

    // --- RENDER FUNGSI ---
    function renderInvoices() {
        const invoices = readFromLS(LS_KEYS.invoices);
        const tbody = document.getElementById('invoice-table-body');
        tbody.innerHTML = '';
        if (invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Tidak ada data.</td></tr>';
            return;
        }
        invoices.forEach(inv => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${inv.no}</td>
                <td>${inv.customer}</td>
                <td>${inv.date}</td>
                <td><span class="badge badge-${inv.type}">${inv.type}</span></td>
                <td>${formatCurrency(inv.total)}</td>
                <td><span class="badge badge-${inv.status}">${inv.status}</span></td>
                <td><button class="btn btn-sm btn-danger" onclick="deleteInvoice('${inv.no}')">Hapus</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderJournals() {
        const journals = readFromLS(LS_KEYS.journals);
        const tbody = document.getElementById('jurnal-table-body');
        tbody.innerHTML = '';
        if (journals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tidak ada data.</td></tr>';
            return;
        }
        journals.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(j => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${j.date}</td>
                <td>${j.ref}</td>
                <td>${j.accountName}</td>
                <td class="debit">${formatCurrency(j.debit)}</td>
                <td class="kredit">${formatCurrency(j.kredit)}</td>
                <td>${j.description}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderDashboard() {
        const coa = readFromLS(LS_KEYS.coa);
        const piutang = getAccountBalance(200);
        const hutang = getAccountBalance(500) + getAccountBalance(510);
        const kas = getAccountBalance(100) + getAccountBalance(110) + getAccountBalance(120);
        
        const journals = readFromLS(LS_KEYS.journals);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        let revenue = 0;
        let expense = 0;

        journals.forEach(j => {
            const jDate = new Date(j.date);
            if (jDate.getMonth() === currentMonth && jDate.getFullYear() === currentYear) {
                const accType = coa.find(a => a.id === j.accountId)?.type;
                if (accType === 'Revenue') revenue += j.kredit - j.debit;
                if (accType === 'Expense') expense += j.debit - j.kredit;
            }
        });
        const laba = revenue - expense;

        document.getElementById('dash-piutang').textContent = formatCurrency(piutang);
        document.getElementById('dash-hutang').textContent = formatCurrency(Math.abs(hutang));
        document.getElementById('dash-laba').textContent = formatCurrency(laba);
        document.getElementById('dash-kas').textContent = formatCurrency(kas);
        
        const tbody = document.getElementById('recent-activity-body');
        tbody.innerHTML = '';
        const recentJournals = journals.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        recentJournals.forEach(j => {
            const tr = document.createElement('tr');
            const amount = j.debit > 0 ? `<span class="debit">${formatCurrency(j.debit)}</span>` : `<span class="kredit">${formatCurrency(j.kredit)}</span>`;
            tr.innerHTML = `<td>${j.date}</td><td>${j.description}</td><td>${amount}</td>`;
            tbody.appendChild(tr);
        });
    }
    
    function populateAccountSelector() {
        const coa = readFromLS(LS_KEYS.coa);
        const selector = document.getElementById('account-select');
        selector.innerHTML = '';
        coa.forEach(acc => {
            const option = document.createElement('option');
            option.value = acc.id;
            option.textContent = `${acc.id} - ${acc.name}`;
            selector.appendChild(option);
        });
        selector.removeEventListener('change', renderBukuBesar);
        selector.addEventListener('change', renderBukuBesar);
        renderBukuBesar();
    }
    
    function renderBukuBesar() {
        const accountId = parseInt(document.getElementById('account-select').value);
        const journals = readFromLS(LS_KEYS.journals).filter(j => j.accountId === accountId);
        const tbody = document.getElementById('buku-besar-body');
        tbody.innerHTML = '';
        let balance = 0;
        journals.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(j => {
            balance += j.debit - j.kredit;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${j.date}</td>
                <td>${j.description}</td>
                <td>${formatCurrency(j.debit)}</td>
                <td>${formatCurrency(j.kredit)}</td>
                <td>${formatCurrency(balance)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    function renderLabaRugi() {
        const coa = readFromLS(LS_KEYS.coa);
        const journals = readFromLS(LS_KEYS.journals);
        const tbody = document.getElementById('laba-rugi-body');
        tbody.innerHTML = '';
        
        let totalRevenue = 0;
        let totalExpense = 0;

        coa.filter(acc => acc.type === 'Revenue').forEach(acc => {
            let balance = 0;
            journals.filter(j => j.accountId === acc.id).forEach(j => balance += j.kredit - j.debit);
            if (balance !== 0) {
                totalRevenue += balance;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${acc.name}</td><td>${formatCurrency(balance)}</td>`;
                tbody.appendChild(tr);
            }
        });

        const trTotalRev = document.createElement('tr');
        trTotalRev.innerHTML = `<td>Total Pendapatan</td><td>${formatCurrency(totalRevenue)}</td>`;
        tbody.appendChild(trTotalRev);

        coa.filter(acc => acc.type === 'Expense').forEach(acc => {
            let balance = 0;
            journals.filter(j => j.accountId === acc.id).forEach(j => balance += j.debit - j.kredit);
            if (balance !== 0) {
                totalExpense += balance;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${acc.name}</td><td>${formatCurrency(balance)}</td>`;
                tbody.appendChild(tr);
            }
        });
        
        const trTotalExp = document.createElement('tr');
        trTotalExp.innerHTML = `<td>Total Beban</td><td>${formatCurrency(totalExpense)}</td>`;
        tbody.appendChild(trTotalExp);
        
        const trLaba = document.createElement('tr');
        trLaba.innerHTML = `<td>LABA BERSIH</td><td>${formatCurrency(totalRevenue - totalExpense)}</td>`;
        tbody.appendChild(trLaba);
    }
    
    function renderPettyCash() {
        const transactions = readFromLS(LS_KEYS.pettyCash);
        const tbody = document.getElementById('petty-cash-body');
        tbody.innerHTML = '';
        let balance = 0;
        transactions.forEach(t => {
            balance += t.debit - t.kredit;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${t.date}</td>
                <td>${t.desc}</td>
                <td>${formatCurrency(t.debit)}</td>
                <td>${formatCurrency(t.kredit)}</td>
                <td>${formatCurrency(balance)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- CRUD HANDLERS ---
    function deleteInvoice(no) {
        if (confirm(`Hapus invoice ${no}?`)) {
            let invoices = readFromLS(LS_KEYS.invoices);
            invoices = invoices.filter(inv => inv.no !== no);
            writeToLS(LS_KEYS.invoices, invoices);
            renderInvoices();
        }
    }

    // --- EVENT LISTENER ---
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = link.getAttribute('data-view');
            if (viewName) showView(viewName);
        });
    });

    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.getElementById('tambah-invoice-btn').addEventListener('click', () => {
        const coaRevenue = readFromLS(LS_KEYS.coa).filter(acc => acc.type === 'Revenue');
        let coaOptions = '';
        coaRevenue.forEach(acc => coaOptions += `<option value="${acc.id}">${acc.name}</option>`);
        
        const formHtml = `
            <form id="invoice-form">
                <div class="form-group"><label>No. Invoice</label><input type="text" id="inv-no" required></div>
                <div class="form-group"><label>Customer</label><input type="text" id="inv-customer" required></div>
                <div class="form-group"><label>Tanggal</label><input type="date" id="inv-date" required></div>
                <div class="form-group"><label>Jenis Invoice</label><div style="display: flex; gap: 15px;"><label><input type="radio" name="inv-type" value="Tagihan" checked> Tagihan (Fee Jasa)</label><label><input type="radio" name="inv-type" value="Rembursement"> Rembursement (Biaya Ganti)</label></div></div>
                <div class="form-group" id="inv-revenue-group"><label>Akun Pendapatan</label><select id="inv-account">${coaOptions}</select></div>
                <div class="form-group"><label>Jumlah</label><input type="number" id="inv-total" required></div>
                <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button><button type="submit" class="btn btn-primary">Simpan</button></div>
            </form>
        `;
        openModal('Tambah Invoice Baru', formHtml);

        const typeRadios = document.querySelectorAll('input[name="inv-type"]');
        const revenueGroup = document.getElementById('inv-revenue-group');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                revenueGroup.style.display = radio.value === 'Tagihan' ? 'flex' : 'none';
            });
        });

        document.getElementById('invoice-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.querySelector('input[name="inv-type"]:checked').value;
            const invoice = {
                no: document.getElementById('inv-no').value,
                customer: document.getElementById('inv-customer').value,
                date: document.getElementById('inv-date').value,
                total: parseFloat(document.getElementById('inv-total').value),
                status: 'Belum Lunas',
                type: type
            };
            let invoices = readFromLS(LS_KEYS.invoices);
            if (invoices.find(inv => inv.no === invoice.no)) {
                alert('No. Invoice sudah ada!');
                return;
            }
            invoices.push(invoice);
            writeToLS(LS_KEYS.invoices, invoices);
            
            let journalEntries = [];
            if (type === 'Tagihan') {
                const revenueAccId = parseInt(document.getElementById('inv-account').value);
                journalEntries = [
                    { accountId: 200, debit: invoice.total },
                    { accountId: revenueAccId, kredit: invoice.total }
                ];
            } else {
                journalEntries = [
                    { accountId: 200, debit: invoice.total },
                    { accountId: 510, kredit: invoice.total }
                ];
            }
            createJournalEntry(invoice.date, invoice.no, journalEntries, `Invoice ${invoice.type} - ${invoice.customer}`);
            
            closeModal();
            renderInvoices();
            renderJournals();
            renderDashboard();
        });
    });

    document.getElementById('tambah-jurnal-btn').addEventListener('click', () => {
        const coa = readFromLS(LS_KEYS.coa);
        let coaOptions = '';
        coa.forEach(acc => coaOptions += `<option value="${acc.id}">${acc.name}</option>`);
        
        const formHtml = `
            <form id="jurnal-form">
                <div class="form-group"><label>Tanggal</label><input type="date" id="jr-date" required></div>
                <div class="form-group"><label>No. Bukti</label><input type="text" id="jr-ref" required></div>
                <div class="form-group"><label>Keterangan</label><textarea id="jr-desc" required></textarea></div>
                <div id="journal-entries"><h4>Entri Jurnal</h4><div class="journal-entry-row"><select class="jr-account">${coaOptions}</select><input type="number" placeholder="Debit" class="jr-debit"><input type="number" placeholder="Kredit" class="jr-kredit"></div></div>
                <button type="button" class="btn btn-secondary" onclick="addJournalRow(this)">Tambah Baris</button>
                <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button><button type="submit" class="btn btn-primary">Simpan Jurnal</button></div>
            </form>
        `;
        openModal('Tambah Jurnal Umum', formHtml);
        
        window.addJournalRow = function(btn) {
            const newRow = document.createElement('div');
            newRow.className = 'journal-entry-row';
            newRow.innerHTML = `<select class="jr-account">${coaOptions}</select><input type="number" placeholder="Debit" class="jr-debit"><input type="number" placeholder="Kredit" class="jr-kredit">`;
            btn.previousElementSibling.before(newRow);
        };

        document.getElementById('jurnal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('jr-date').value;
            const ref = document.getElementById('jr-ref').value;
            const desc = document.getElementById('jr-desc').value;
            const entries = [];
            document.querySelectorAll('.journal-entry-row').forEach(row => {
                const accId = parseInt(row.querySelector('.jr-account').value);
                const debit = parseFloat(row.querySelector('.jr-debit').value) || 0;
                const kredit = parseFloat(row.querySelector('.jr-kredit').value) || 0;
                if (debit > 0 || kredit > 0) {
                    entries.push({ accountId: accId, debit, kredit });
                }
            });
            if (createJournalEntry(date, ref, entries, desc)) {
                closeModal();
                renderJournals();
                renderDashboard();
            }
        });
    });

    document.getElementById('tambah-petty-cash-btn').addEventListener('click', () => {
        const coaExpense = readFromLS(LS_KEYS.coa).filter(acc => acc.type === 'Expense');
        let expenseOptions = '';
        coaExpense.forEach(acc => expenseOptions += `<option value="${acc.id}">${acc.name}</option>`);
        
        const formHtml = `
            <form id="petty-cash-form">
                <div class="form-group"><label>Tanggal</label><input type="date" id="pc-date" required></div>
                <div class="form-group"><label>Keterangan</label><input type="text" id="pc-desc" required></div>
                <div class="form-group"><label>Jenis Transaksi</label><div style="display: flex; gap: 15px;"><label><input type="radio" name="pc-type" value="Debit" checked> Debit (Isi Dana)</label><label><input type="radio" name="pc-type" value="Kredit"> Kredit (Pengeluaran)</label></div></div>
                <div class="form-group" id="pc-expense-group" style="display:none;"><label>Akun Beban</label><select id="pc-expense">${expenseOptions}</select></div>
                <div class="form-group"><label>Jumlah</label><input type="number" id="pc-amount" required></div>
                <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button><button type="submit" class="btn btn-primary">Simpan</button></div>
            </form>
        `;
        openModal('Tambah Transaksi Petty Cash', formHtml);
        
        const typeRadios = document.querySelectorAll('input[name="pc-type"]');
        const expenseGroup = document.getElementById('pc-expense-group');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                expenseGroup.style.display = radio.value === 'Kredit' ? 'flex' : 'none';
            });
        });

        document.getElementById('petty-cash-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.querySelector('input[name="pc-type"]:checked').value;
            const date = document.getElementById('pc-date').value;
            const desc = document.getElementById('pc-desc').value;
            const amount = parseFloat(document.getElementById('pc-amount').value);

            let transactions = readFromLS(LS_KEYS.pettyCash);
            const lastBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;
            const newBalance = type === 'Debit' ? lastBalance + amount : lastBalance - amount;
            transactions.push({
                date, desc,
                debit: type === 'Debit' ? amount : 0,
                kredit: type === 'Kredit' ? amount : 0,
                balance: newBalance
            });
            writeToLS(LS_KEYS.pettyCash, transactions);

            let journalEntries = [];
            if (type === 'Debit') {
                journalEntries = [
                    { accountId: 120, debit: amount },
                    { accountId: 110, kredit: amount }
                ];
            } else {
                const expenseAccId = parseInt(document.getElementById('pc-expense').value);
                journalEntries = [
                    { accountId: expenseAccId, debit: amount },
                    { accountId: 120, kredit: amount }
                ];
            }
            createJournalEntry(date, `PC-${desc}`, journalEntries, `Transaksi Petty Cash: ${desc}`);

            closeModal();
            renderPettyCash();
            renderJournals();
            renderDashboard();
        });
    });

    // --- EXPORT, BACKUP, RESTORE ---
    document.getElementById('export-jurnal-btn').addEventListener('click', () => {
        const journals = readFromLS(LS_KEYS.journals);
        const ws = XLSX.utils.json_to_sheet(journals);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Jurnal Umum");
        XLSX.writeFile(wb, "Laporan_Jurnal_Umum.xlsx");
    });

    document.getElementById('export-besar-btn').addEventListener('click', () => {
        const accountId = parseInt(document.getElementById('account-select').value);
        const accountName = getAccountName(accountId);
        const journals = readFromLS(LS_KEYS.journals).filter(j => j.accountId === accountId);
        const ws = XLSX.utils.json_to_sheet(journals);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Buku Besar");
        XLSX.writeFile(wb, `Buku_Besar_${accountName.replace(/\s+/g, '_')}.xlsx`);
    });
    
    document.getElementById('backup-restore-btn').addEventListener('click', () => {
        const formHtml = `
            <h3>Backup Data</h3>
            <p>Mencadangkan semua data transaksi dan master data ke file.</p>
            <button class="btn btn-primary" onclick="performBackup()">Download Backup File</button>
            <hr style="margin: 20px 0;">
            <h3>Restore Data</h3>
            <p>Mengembalikan data dari file backup. <strong>Perhatian: Ini akan menimpa semua data saat ini!</strong></p>
            <input type="file" id="restore-file-input" accept=".json">
            <button class="btn btn-danger" onclick="performRestore()">Restore Sekarang</button>
        `;
        openModal("Backup & Restore Data", formHtml);
        
        window.performBackup = function() {
            const backupData = {};
            Object.keys(LS_KEYS).forEach(key => backupData[key] = readFromLS(LS_KEYS[key]));
            const dataStr = JSON.stringify(backupData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const exportFileDefaultName = `backup_erp_${new Date().toISOString().split('T')[0]}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        };

        window.performRestore = function() {
            const fileInput = document.getElementById('restore-file-input');
            if (fileInput.files.length === 0) {
                alert('Pilih file backup terlebih dahulu.');
                return;
            }
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const restoredData = JSON.parse(e.target.result);
                    Object.keys(restoredData).forEach(key => {
                        if(LS_KEYS[key]) writeToLS(LS_KEYS[key], restoredData[key]);
                    });
                    alert('Data berhasil dipulihkan! Halaman akan dimuat ulang.');
                    location.reload();
                } catch (error) {
                    alert('Gagal memulihkan data. File mungkin rusak.');
                }
            };
            reader.readAsText(file);
        };
    });
    
    document.getElementById('logout-btn').addEventListener('click', () => {
        if (confirm('Keluar dari sistem?')) location.reload();
    });

    document.getElementById('tambah-gaji-btn').addEventListener('click', () => {
        alert('Fitur Slip Gaji akan segera hadir.');
    });

    // --- INISIALISASI & RENDER AWAL ---
    initializeData();
    showView('dashboard');
    renderInvoices();
    renderJournals();
    renderDashboard();
    renderLabaRugi();
    renderPettyCash();
});