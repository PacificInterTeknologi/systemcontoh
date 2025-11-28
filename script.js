document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // =====================================================
    // === 1. STATE & KONFIGURASI GLOBAL               ===
    // =====================================================

    // --- Elemen DOM yang sering digunakan ---
    const elements = {
        // Tombol hamburger menu
        hamburgerBtn: document.getElementById('hamburger-menu'),
        sidebar: document.getElementById('sidebar'),
        sidebarLinks: document.querySelectorAll('#sidebar a[data-view]'),
        views: document.querySelectorAll('.view'),
        pageTitle: document.getElementById('page-title'),
        modal: document.getElementById('modal'),
        modalTitle: document.getElementById('modal-title'),
        modalBody: document.getElementById('modal-body-content'),
        closeModalBtn: document.querySelector('.close'),
        // Tombol-tombol aksi utama
        tambahInvoiceBtn: document.getElementById('tambah-invoice-btn'),
        tambahJurnalBtn: document.getElementById('tambah-jurnal-btn'),
        tambahPettyCashBtn: document.getElementById('tambah-petty-cash-btn'),
        exportJurnalBtn: document.getElementById('export-jurnal-btn'),
        exportBesarBtn: document.getElementById('export-besar-btn'),
        exportPettyCashBtn: document.getElementById('export-petty-cash-btn'),
        backupRestoreBtn: document.getElementById('backup-restore-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        tambahGajiBtn: document.getElementById('tambah-gaji-btn'),
        // Tombol baru untuk fitur tambahan
        tambahPelangganBtn: document.getElementById('tambah-pelanggan-btn'),
        // Tombol untuk laporan penjualan
        exportLaporanPenjualanBtn: document.getElementById('export-laporan-penjualan-btn'),
    };

    // --- Kunci untuk LocalStorage ---
    const LS_KEYS = {
        invoices: 'invoices',
        journals: 'journals',
        pettyCash: 'pettyCash',
        payrolls: 'payrolls',
        coa: 'chartOfAccounts',
        customers: 'customers',
        salesReports: 'salesReports', // Tambahkan kunci untuk laporan penjualan
        fixedAssets: 'fixedAssets',
    };
    
    // --- Data Master Default (Chart of Accounts) ---
    const defaultCoa = [
        { id: 100, name: 'Kas', type: 'Asset' },
        { id: 110, name: 'Bank BCA', type: 'Asset' },
        { id: 120, name: 'Kas Kecil', type: 'Asset' },
        { id: 200, name: 'Piutang Usaha', type: 'Asset' },
        { id: 300, name: 'Persediaan Barang', type: 'Asset' },
        { id: 400, name: 'Peralatan Kantor', type: 'Asset' },
        { id: 410, name: 'Akumulasi Penyusutan', type: 'Asset' },
        { id: 500, name: 'Hutang Usaha', type: 'Liability' },
        { id: 510, name: 'Utang Rembursement', type: 'Liability' },
        { id: 600, name: 'Modal Pemilik', type: 'Equity' },
        { id: 700, name: 'Pendapatan Jasa PPJK', type: 'Revenue' },
        { id: 710, name: 'Pendapatan Jasa Trucking', type: 'Revenue' },
        { id: 800, name: 'Beban Gaji', type: 'Expense' },
        { id: 810, name: 'Beban Sewa Kantor', type: 'Expense' },
        { id: 820, name: 'Beban Biaya Bank', type: 'Expense' },
        { id: 830, name: 'Beban ATK', type: 'Expense' },
        { id: 840, name: 'Beban Penyusutan', type: 'Expense' },
        { id: 720, name: 'Keuntungan Penjualan Aset', type: 'Revenue' },
        { id: 850, name: 'Kerugian Penjualan Aset', type: 'Expense' },
    ];

    // =====================================================
    // === 2. FUNGSI UTILITAS & INISIALISASI           ===
    // =====================================================

    /**
     * Inisialisasi data awal di LocalStorage jika kosong.
     */
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
            writeToLS(LS_KEYS.customers, []);
            writeToLS(LS_KEYS.salesReports, []); // Inisialisasi laporan penjualan
            writeToLS(LS_KEYS.fixedAssets, []);
        }
    }

    function handleHapusSemuaTransaksiPettyCash() {
        if (!confirm('Hapus semua transaksi Petty Cash kecuali Saldo Awal?')) return;
        const transactions = readFromLS(LS_KEYS.pettyCash);
        const kept = transactions.filter(t => (t.desc || '').toLowerCase() === 'saldo awal');
        writeToLS(LS_KEYS.pettyCash, kept);
        renderPettyCash();
    }

    /**
     * Membaca data dari LocalStorage.
     * @param {string} key - Kunci data yang akan dibaca.
     * @returns {Array} Data yang dibaca dari LocalStorage.
     */
    function readFromLS(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    /**
     * Menulis data ke LocalStorage.
     * @param {string} key - Kunci data.
     * @param {any} data - Data yang akan disimpan.
     */
    function writeToLS(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    /**
     * Format angka ke mata uang Rupiah.
     * @param {number} amount - Angka yang akan diformat.
     * @returns {string} String dalam format Rupiah.
     */
    function formatCurrency(amount) {
        if (typeof amount !== 'number') return amount;
        return 'Rp ' + amount.toLocaleString('id-ID');
    }

    // =====================================================
    // === 3. LOGIKA AKUNTANSI                           ===
    // =====================================================

    /**
     * Mendapatkan nama akun berdasarkan ID.
     * @param {number} id - ID akun.
     * @returns {string} Nama akun.
     */
    function getAccountName(id) {
        const coa = readFromLS(LS_KEYS.coa);
        const account = coa.find(acc => acc.id === id);
        return account ? account.name : 'Akun Tidak Dikenal';
    }

    /**
     * Menghitung saldo akun berdasarkan ID dari semua jurnal.
     * @param {number} accountId - ID akun.
     * @returns {number} Saldo akun.
     */
    function getAccountBalance(accountId) {
        const journals = readFromLS(LS_KEYS.journals);
        let balance = 0;
        journals.filter(j => j.accountId === accountId).forEach(j => {
            balance += j.debit - j.kredit;
        });
        return balance;
    }

    /**
     * Membuat entri jurnal baru dengan validasi balance.
     * @param {string} date - Tanggal jurnal.
     * @param {string} ref - Nomor bukti/referensi.
     * @param {Array} entries - Array dari objek entri (akun, debit, kredit).
     * @param {string} description - Keterangan jurnal.
     * @returns {boolean} True jika berhasil, false jika gagal.
     */
    function createJournalEntry(date, ref, entries, description) {
        const journals = readFromLS(LS_KEYS.journals);
        let totalDebit = 0, totalKredit = 0;
        entries.forEach(e => { totalDebit += e.debit || 0; totalKredit += e.kredit || 0; });

        if (Math.round(totalDebit) !== Math.round(totalKredit)) {
            alert('Error: Total Debit dan Kredit harus sama!');
            return false;
        }

        const jrId = `JR-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        entries.forEach(entry => {
            journals.push({
                date, ref, description, jrId,
                accountId: entry.accountId,
                accountName: getAccountName(entry.accountId),
                debit: entry.debit || 0,
                kredit: entry.kredit || 0,
            });
        });
        writeToLS(LS_KEYS.journals, journals);
        return true;
    }

    // =====================================================
    // === 4. FUNGSI RENDERING & UI                      ===
    // =====================================================

    /**
     * Menampilkan view tertentu dan menyembunyikan yang lain.
     * @param {string} viewName - Nama view yang akan ditampilkan.
     */
    function showView(viewName) {
        elements.views.forEach(view => view.style.display = 'none');
        const targetView = document.getElementById(viewName + '-view');
        if (targetView) {
            targetView.style.display = 'block';
            elements.pageTitle.textContent = targetView.querySelector('h2').textContent;
        }
        elements.sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-view') === viewName) link.classList.add('active');
        });

        // Render konten spesifik view jika diperlukan
        if (viewName === 'buku-besar') populateAccountSelector();
        if (viewName === 'pelanggan') renderDataPelanggan();
        if (viewName === 'neraca') renderNeraca();
        if (viewName === 'laporan-penjualan') renderLaporanPenjualan(); // Tambahkan render untuk laporan penjualan
        if (viewName === 'aset-tetap') renderFixedAssets();
    }

    /**
     * Membuka modal dengan konten tertentu.
     * @param {string} title - Judul modal.
     * @param {string} contentHtml - Konten HTML dalam modal.
     */
    function openModal(title, contentHtml) {
        elements.modalTitle.textContent = title;
        elements.modalBody.innerHTML = contentHtml;
        elements.modal.style.display = 'block';
    }

    /** Menutup modal. */
    function closeModal() {
        elements.modal.style.display = 'none';
    }

    /**
     * Toggle sidebar visibility.
     */
    function toggleSidebar() {
        elements.sidebar.classList.toggle('active');
    }

    /**
     * Close sidebar when clicking outside on mobile
     */
    function closeSidebarOnOutsideClick(event) {
        const isClickInsideSidebar = elements.sidebar.contains(event.target);
        const isClickOnHamburger = elements.hamburgerBtn.contains(event.target);
        
        if (!isClickInsideSidebar && !isClickOnHamburger && elements.sidebar.classList.contains('active')) {
            elements.sidebar.classList.remove('active');
        }
    }

    /** Render data ke tabel Invoice (DIPERBARUI). */
    function renderInvoices() {
        const invoices = readFromLS(LS_KEYS.invoices);
        const tbody = document.getElementById('invoice-table-body');
        tbody.innerHTML = '';
        if (invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Tidak ada data.</td></tr>';
            return;
        }
        
        invoices.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(inv => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${inv.no}</td>
                <td>${inv.customer}</td>
                <td>${inv.date}</td>
                <td><span class="badge badge-${inv.type.toLowerCase()}">${inv.type}</span></td>
                <td>${formatCurrency(inv.totalAmount)}</td>
                <td><span class="badge badge-${inv.status.toLowerCase().replace(' ', '-')}">${inv.status}</span></td>
                <td class="action-buttons"></td>
            `;
            const actionTd = tr.querySelector('.action-buttons');
            actionTd.appendChild(createButton('btn btn-sm btn-info', 'Cetak', () => handleCetakInvoice(inv.no)));
            // Hanya tombol edit jika statusnya adalah Draft
            if (inv.status === 'Draft') {
                actionTd.appendChild(createButton('btn btn-sm btn-warning', 'Edit', () => handleEditInvoice(inv.no)));
            }
            actionTd.appendChild(createButton('btn btn-sm btn-danger', 'Hapus', () => deleteInvoice(inv.no)));
            tbody.appendChild(tr);
        });
    }
    
    /** Render data ke tabel Jurnal Umum. */
    function renderJournals() {
        const journals = readFromLS(LS_KEYS.journals);
        const tbody = document.getElementById('jurnal-table-body');
        tbody.innerHTML = '';
        if (journals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Tidak ada data.</td></tr>';
            return;
        }
        const groups = {};
        journals.sort((a,b)=> new Date(a.date) - new Date(b.date)).forEach(j => {
            const key = j.jrId || `${j.date}|${j.ref}|${j.description}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(j);
        });
        Object.entries(groups).forEach(([key, rows]) => {
            rows.forEach((j, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${j.date}</td><td>${j.ref}</td><td>${j.accountName}</td><td class="debit">${formatCurrency(j.debit)}</td><td class="kredit">${formatCurrency(j.kredit)}</td><td>${j.description}</td><td class="action-buttons"></td>`;
                const actionTd = tr.querySelector('.action-buttons');
                if (idx === 0) {
                    const groupId = j.jrId || key;
                    actionTd.appendChild(createButton('btn btn-sm btn-warning', 'Edit', () => handleEditJurnal(groupId)));
                    actionTd.appendChild(createButton('btn btn-sm btn-danger', 'Hapus', () => deleteJournalGroup(groupId)));
                }
                tbody.appendChild(tr);
            });
        });
    }

    function deleteJournalGroup(groupId) {
        if (!confirm('Hapus jurnal beserta semua barisnya?')) return;
        let journals = readFromLS(LS_KEYS.journals);
        journals = journals.filter(j => (j.jrId || `${j.date}|${j.ref}|${j.description}`) !== groupId);
        writeToLS(LS_KEYS.journals, journals);
        renderJournals();
        renderDashboard();
        renderNeraca();
        renderLabaRugi();
    }

    function handleEditJurnal(groupId) {
        const journals = readFromLS(LS_KEYS.journals);
        const groupRows = journals.filter(j => (j.jrId || `${j.date}|${j.ref}|${j.description}`) === groupId);
        if (groupRows.length === 0) return;
        const coa = readFromLS(LS_KEYS.coa);
        const coaOptions = coa.map(acc => `<option value="${acc.id}">${acc.name}</option>`).join('');

        const base = groupRows[0];
        const formHtml = `
            <form id="jurnal-form">
                <div class="form-group"><label>Tanggal</label><input type="date" id="jr-date" required value="${base.date}"></div>
                <div class="form-group"><label>No. Bukti</label><input type="text" id="jr-ref" required value="${base.ref}"></div>
                <div class="form-group"><label>Keterangan</label><textarea id="jr-desc" required>${base.description}</textarea></div>
                <div id="journal-entries"><h4>Entri Jurnal</h4></div>
                <button type="button" class="btn btn-secondary" id="add-jr-row">Tambah Baris</button>
                <div class="form-actions"><button type="button" class="btn btn-secondary" id="batal-jurnal">Batal</button><button type="submit" class="btn btn-primary">Simpan Perubahan</button></div>
            </form>
        `;
        openModal('Edit Jurnal Umum', formHtml);

        const entriesContainer = document.getElementById('journal-entries');
        groupRows.forEach(r => {
            const row = document.createElement('div'); row.className = 'journal-entry-row';
            row.innerHTML = `<select class="jr-account">${coaOptions}</select><input type="number" placeholder="Debit" class="jr-debit"><input type="number" placeholder="Kredit" class="jr-kredit"><button type="button" class="btn btn-sm btn-danger jr-remove">Hapus Baris</button>`;
            entriesContainer.appendChild(row);
            row.querySelector('.jr-account').value = r.accountId;
            row.querySelector('.jr-debit').value = r.debit || '';
            row.querySelector('.jr-kredit').value = r.kredit || '';
            row.querySelector('.jr-remove').addEventListener('click', () => row.remove());
        });

        document.getElementById('add-jr-row').addEventListener('click', () => {
            const newRow = document.createElement('div'); newRow.className = 'journal-entry-row';
            newRow.innerHTML = `<select class="jr-account">${coaOptions}</select><input type="number" placeholder="Debit" class="jr-debit"><input type="number" placeholder="Kredit" class="jr-kredit"><button type="button" class="btn btn-sm btn-danger jr-remove">Hapus Baris</button>`;
            entriesContainer.appendChild(newRow);
            newRow.querySelector('.jr-remove').addEventListener('click', () => newRow.remove());
        });

        document.getElementById('batal-jurnal').addEventListener('click', closeModal);
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
                if (debit > 0 || kredit > 0) entries.push({ accountId: accId, debit, kredit });
            });

            let totalDebit = 0, totalKredit = 0;
            entries.forEach(e => { totalDebit += e.debit || 0; totalKredit += e.kredit || 0; });
            if (Math.round(totalDebit) !== Math.round(totalKredit)) { alert('Error: Total Debit dan Kredit harus sama!'); return; }

            let all = readFromLS(LS_KEYS.journals);
            all = all.filter(j => (j.jrId || `${j.date}|${j.ref}|${j.description}`) !== groupId);
            const jrId = groupRows[0].jrId || `JR-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            entries.forEach(entry => {
                all.push({ date, ref, description: desc, jrId, accountId: entry.accountId, accountName: getAccountName(entry.accountId), debit: entry.debit || 0, kredit: entry.kredit || 0 });
            });
            writeToLS(LS_KEYS.journals, all);
            closeModal();
            renderJournals();
            renderDashboard();
            renderNeraca();
            renderLabaRugi();
        });
    }

    /** Render data ke Dashboard. */
    function renderDashboard() {
        const coa = readFromLS(LS_KEYS.coa);
        const piutang = getAccountBalance(200);
        const hutang = getAccountBalance(500) + getAccountBalance(510);
        const kas = getAccountBalance(100) + getAccountBalance(110) + getAccountBalance(120);
        
        const journals = readFromLS(LS_KEYS.journals);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        let revenue = 0, expense = 0;
        journals.forEach(j => {
            const jDate = new Date(j.date);
            if(jDate.getMonth() === currentMonth && jDate.getFullYear() === currentYear){
                const accType = coa.find(a => a.id === j.accountId)?.type;
                if(accType === 'Revenue') revenue += j.kredit - j.debit;
                if(accType === 'Expense') expense += j.debit - j.kredit;
            }
        });
        const laba = revenue - expense;

        document.getElementById('dash-piutang').textContent = formatCurrency(piutang);
        document.getElementById('dash-hutang').textContent = formatCurrency(Math.abs(hutang));
        document.getElementById('dash-laba').textContent = formatCurrency(laba);
        document.getElementById('dash-kas').textContent = formatCurrency(kas);
        
        const tbody = document.getElementById('recent-activity-body');
        tbody.innerHTML = '';
        const recentJournals = journals.sort((a,b)=> new Date(b.date) - new Date(a.date)).slice(0,5);
        recentJournals.forEach(j => {
            const tr = document.createElement('tr');
            const amount = j.debit > 0 ? `<span class="debit">${formatCurrency(j.debit)}</span>` : `<span class="kredit">${formatCurrency(j.kredit)}</span>`;
            tr.innerHTML = `<td>${j.date}</td><td>${j.description}</td><td>${amount}</td>`;
            tbody.appendChild(tr);
        });
    }
    
    /** Mengisi dropdown pemilih akun untuk Buku Besar. */
    function populateAccountSelector() {
        const coa = readFromLS(LS_KEYS.coa);
        const selector = document.getElementById('account-select');
        if (!selector) return;
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
    
    /** Render data ke Buku Besar. */
    function renderBukuBesar() {
        const accountId = parseInt(document.getElementById('account-select').value);
        const journals = readFromLS(LS_KEYS.journals).filter(j => j.accountId === accountId);
        const tbody = document.getElementById('buku-besar-body');
        tbody.innerHTML = '';
        let balance = 0;
        journals.sort((a,b)=> new Date(a.date) - new Date(b.date)).forEach(j => {
            balance += j.debit - j.kredit;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${j.date}</td><td>${j.description}</td><td>${formatCurrency(j.debit)}</td><td>${formatCurrency(j.kredit)}</td><td>${formatCurrency(balance)}</td>`;
            tbody.appendChild(tr);
        });
    }
    
    /** Render data ke Laporan Laba Rugi. */
    function renderLabaRugi() {
        const coa = readFromLS(LS_KEYS.coa);
        const journals = readFromLS(LS_KEYS.journals);
        const tbody = document.getElementById('laba-rugi-body');
        tbody.innerHTML = '';
        
        let totalRevenue = 0, totalExpense = 0;
        coa.filter(acc => acc.type === 'Revenue').forEach(acc => {
            let balance = 0; journals.filter(j => j.accountId === acc.id).forEach(j => balance += j.kredit - j.debit);
            if (balance !== 0) { totalRevenue += balance; const tr = document.createElement('tr'); tr.innerHTML = `<td>${acc.name}</td><td>${formatCurrency(balance)}</td>`; tbody.appendChild(tr); }
        });
        const trTotalRev = document.createElement('tr'); trTotalRev.innerHTML = `<td>Total Pendapatan</td><td>${formatCurrency(totalRevenue)}</td>`; tbody.appendChild(trTotalRev);

        coa.filter(acc => acc.type === 'Expense').forEach(acc => {
            let balance = 0; journals.filter(j => j.accountId === acc.id).forEach(j => balance += j.debit - j.kredit);
            if (balance !== 0) { totalExpense += balance; const tr = document.createElement('tr'); tr.innerHTML = `<td>${acc.name}</td><td>${formatCurrency(balance)}</td>`; tbody.appendChild(tr); }
        });
        const trTotalExp = document.createElement('tr'); trTotalExp.innerHTML = `<td>Total Beban</td><td>${formatCurrency(totalExpense)}</td>`; tbody.appendChild(trTotalExp);
        
        const trLaba = document.createElement('tr'); trLaba.innerHTML = `<td>LABA BERSIH</td><td>${formatCurrency(totalRevenue - totalExpense)}</td>`; tbody.appendChild(trLaba);
    }
    
    /** Render data ke Petty Cash. */
    function renderPettyCash() {
        const transactions = readFromLS(LS_KEYS.pettyCash);
        const tbody = document.getElementById('petty-cash-body');
        tbody.innerHTML = '';
        let balance = 0;
        transactions.forEach((t, idx) => {
            balance += t.debit - t.kredit;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${t.date}</td><td>${t.desc}</td><td>${formatCurrency(t.debit)}</td><td>${formatCurrency(t.kredit)}</td><td>${formatCurrency(balance)}</td><td class="action-buttons"></td>`;
            const actionTd = tr.querySelector('.action-buttons');
            const isOpening = (t.desc || '').toLowerCase() === 'saldo awal';
            actionTd.appendChild(createButton(`btn btn-sm ${isOpening ? 'btn-secondary' : 'btn-danger'}`, isOpening ? '—' : 'Hapus', () => { if (!isOpening) deletePettyCash(idx); }));
            tbody.appendChild(tr);
        });
    }

    function deletePettyCash(index) {
        if (!confirm('Hapus transaksi ini?')) return;
        const transactions = readFromLS(LS_KEYS.pettyCash);
        const t = transactions[index];
        if ((t.desc || '').toLowerCase() === 'saldo awal') { alert('Tidak dapat menghapus Saldo Awal.'); return; }
        transactions.splice(index, 1);
        writeToLS(LS_KEYS.pettyCash, transactions);
        renderPettyCash();
    }

    /** Render data ke tabel Pelanggan. */
    function renderDataPelanggan() {
        const customers = readFromLS(LS_KEYS.customers);
        const tbody = document.getElementById('pelanggan-table-body');
        tbody.innerHTML = '';
        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Tidak ada data pelanggan.</td></tr>';
            return;
        }
        customers.forEach(pelanggan => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${pelanggan.nama}</td>
                <td>${pelanggan.alamat || '-'}</td>
                <td>${pelanggan.telepon || '-'}</td>
                <td></td>
            `;
            const actionTd = tr.querySelector('td:last-child');
            actionTd.appendChild(createButton('btn btn-sm btn-danger', 'Hapus', () => deletePelanggan(pelanggan.nama)));
            tbody.appendChild(tr);
        });
    }

    /** Render data ke Laporan Neraca. */
    function renderNeraca() {
        const coa = readFromLS(LS_KEYS.coa);
        const journals = readFromLS(LS_KEYS.journals);
        const tbody = document.getElementById('neraca-body');
        tbody.innerHTML = '';

        let totalAssets = 0;
        let totalLiabilities = 0;
        let totalEquity = 0;

        // AKTIVA
        const assets = coa.filter(acc => acc.type === 'Asset');
        tbody.innerHTML += `<tr><th colspan="2" style="text-align: left; background-color: #f2f2f2;">AKTIVA</th></tr>`;
        assets.forEach(acc => {
            const balance = getAccountBalance(acc.id);
            if (balance !== 0) {
                totalAssets += balance;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${acc.name}</td><td style="text-align: right;">${formatCurrency(balance)}</td>`;
                tbody.appendChild(tr);
            }
        });
        const trTotalAsset = document.createElement('tr');
        trTotalAsset.innerHTML = `<th>Total Aktiva</th><th style="text-align: right;">${formatCurrency(totalAssets)}</th>`;
        tbody.appendChild(trTotalAsset);

        // KEWAJIBAN
        const liabilities = coa.filter(acc => acc.type === 'Liability');
        tbody.innerHTML += `<tr><th colspan="2" style="text-align: left; background-color: #f2f2f2;">KEWAJIBAN</th></tr>`;
        liabilities.forEach(acc => {
            const balance = getAccountBalance(acc.id);
            if (balance !== 0) {
                totalLiabilities += balance;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${acc.name}</td><td style="text-align: right;">${formatCurrency(Math.abs(balance))}</td>`;
                tbody.appendChild(tr);
            }
        });
        const trTotalLiab = document.createElement('tr');
        trTotalLiab.innerHTML = `<th>Total Kewajiban</th><th style="text-align: right;">${formatCurrency(Math.abs(totalLiabilities))}</th>`;
        tbody.appendChild(trTotalLiab);

        // EKUITAS
        const equity = coa.filter(acc => acc.type === 'Equity');
        tbody.innerHTML += `<tr><th colspan="2" style="text-align: left; background-color: #f2f2f2;">EKUITAS</th></tr>`;
        equity.forEach(acc => {
            const balance = getAccountBalance(acc.id);
            if (balance !== 0) {
                totalEquity += balance;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${acc.name}</td><td style="text-align: right;">${formatCurrency(balance)}</td>`;
                tbody.appendChild(tr);
            }
        });
        // Tambahkan Laba/Rugi Ditahan
        const revenue = coa.filter(acc => acc.type === 'Revenue').reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);
        const expense = coa.filter(acc => acc.type === 'Expense').reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);
        const currentPeriodIncome = (revenue * -1) + expense;
        totalEquity += currentPeriodIncome;

        const trIncome = document.createElement('tr');
        trIncome.innerHTML = `<td>Laba/Rugi Berjalan</td><td style="text-align: right;">${formatCurrency(currentPeriodIncome)}</td>`;
        tbody.appendChild(trIncome);

        const trTotalEquity = document.createElement('tr');
        trTotalEquity.innerHTML = `<th>Total Ekuitas</th><th style="text-align: right;">${formatCurrency(totalEquity)}</th>`;
        tbody.appendChild(trTotalEquity);

        const totalLiabEquity = totalLiabilities + totalEquity;
        const trGrandTotal = document.createElement('tr');
        trGrandTotal.innerHTML = `<th>Total Kewajiban dan Ekuitas</th><th style="text-align: right;">${formatCurrency(totalLiabEquity)}</th>`;
        tbody.appendChild(trGrandTotal);
    }

    /** Render data ke Laporan Penjualan */
    function renderLaporanPenjualan() {
        const invoices = readFromLS(LS_KEYS.invoices);
        const salesReports = readFromLS(LS_KEYS.salesReports);
        const tbody = document.getElementById('laporan-penjualan-body');
        tbody.innerHTML = '';
        
        if (invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tidak ada data penjualan.</td></tr>';
            return;
        }
        
        // Filter invoice dengan tipe Tagihan, DP, atau Pelunasan
        const salesInvoices = invoices.filter(inv => 
            inv.type === 'Tagihan' || inv.type === 'DP' || inv.type === 'Pelunasan'
        );
        
        // Urutkan berdasarkan tanggal
        salesInvoices.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(inv => {
            // Cek apakah invoice sudah ada di laporan penjualan
            let reportEntry = salesReports.find(report => report.invoiceNo === inv.no);
            
            // Jika belum ada, buat entri baru
            if (!reportEntry) {
                reportEntry = {
                    invoiceNo: inv.no,
                    customer: inv.customer,
                    date: inv.date,
                    totalAmount: inv.totalAmount,
                    status: inv.status,
                    paymentDate: inv.status === 'Lunas' ? inv.paymentDate || null : null
                };
                
                // Tambahkan ke laporan penjualan
                salesReports.push(reportEntry);
                writeToLS(LS_KEYS.salesReports, salesReports);
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${reportEntry.invoiceNo}</td>
                <td>${reportEntry.customer}</td>
                <td>${reportEntry.date}</td>
                <td>${formatCurrency(reportEntry.totalAmount)}</td>
                <td><span class="badge badge-${reportEntry.status.toLowerCase().replace(' ', '-')}">${reportEntry.status}</span></td>
                <td>${reportEntry.paymentDate || '-'}</td>
                <td class="action-buttons"></td>
            `;
            
            const actionTd = tr.querySelector('.action-buttons');
            
            // Tambahkan tombol untuk mengubah status
            if (reportEntry.status !== 'Lunas') {
                actionTd.appendChild(createButton('btn btn-sm btn-success', 'Tandai Lunas', () => handleTandaiLunas(reportEntry.invoiceNo)));
            } else {
                actionTd.appendChild(createButton('btn btn-sm btn-secondary', 'Batalkan Lunas', () => handleBatalkanLunas(reportEntry.invoiceNo)));
            }
            
            tbody.appendChild(tr);
        });
    }
    
    // =====================================================
    // === 5. EVENT HANDLERS & LOGIKA FORM              ===
    // =====================================================

    /** Helper untuk membuat elemen button. */
    function createButton(className, text, clickHandler) {
        const button = document.createElement('button');
        button.className = className;
        button.textContent = text;
        button.addEventListener('click', clickHandler);
        return button;
    }

    /** Hapus invoice berdasarkan nomor. */
    function deleteInvoice(no) {
        const invoices = readFromLS(LS_KEYS.invoices);
        const linkedInvoices = invoices.filter(inv => inv.linkToNo === no);
        if(linkedInvoices.length > 0) {
            alert(`Tidak dapat menghapus invoice ${no} karena memiliki invoice terkait (DP/Pelunasan). Hapus invoice terkait terlebih dahulu.`);
            return;
        }
        if (confirm(`Hapus invoice ${no}?`)) {
            const updatedInvoices = invoices.filter(inv => inv.no !== no);
            writeToLS(LS_KEYS.invoices, updatedInvoices);
            renderInvoices();
        }
    }

    /** Hapus pelanggan berdasarkan nama. */
    function deletePelanggan(nama) {
        if (confirm(`Hapus pelanggan ${nama}?`)) {
            let customers = readFromLS(LS_KEYS.customers);
            customers = customers.filter(p => p.nama !== nama);
            writeToLS(LS_KEYS.customers, customers);
            renderDataPelanggan();
        }
    }

    /** Menghitung sisa saldo yang harus dibayar untuk sebuah invoice. */
    function calculateRemainingBalance(invoice) {
        const invoices = readFromLS(LS_KEYS.invoices);
        let totalPaid = 0;
        const linkedInvoices = invoices.filter(inv => inv.linkToNo === invoice.no);
        linkedInvoices.forEach(inv => totalPaid += inv.totalAmount);
        return invoice.totalAmount - totalPaid;
    }

    /**
     * Membuka jendela baru untuk mencetak invoice.
     * @param {string} no - Nomor invoice yang akan dicetak.
     */
    function handleCetakInvoice(no) {
        const invoices = readFromLS(LS_KEYS.invoices);
        const invoice = invoices.find(inv => inv.no === no);

        if (!invoice) {
            alert('Invoice tidak ditemukan!');
            return;
        }

        const printWindow = window.open('', '_blank');
        let detailRowsHtml = '';
        if (invoice.items) {
            detailRowsHtml = invoice.items.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td style="text-align: center;">${item.quantity || 1}</td>
                    <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
                    <td style="text-align: right;">${formatCurrency(item.total)}</td>
                </tr>
            `).join('');
        } else if (invoice.expenses) {
            detailRowsHtml = invoice.expenses.map(exp => `
                <tr>
                    <td>${exp.description}</td>
                    <td style="text-align: right;" colspan="3">${formatCurrency(exp.amount)}</td>
                </tr>
            `).join('');
        }
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice ${invoice.no}</title>
                <style>
                    body { font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
                    .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
                    .invoice-header { text-align: center; margin-bottom: 40px; }
                    .invoice-header h1 { font-size: 2.4em; font-weight: 300; line-height: 1.4em; }
                    .invoice-details { margin-bottom: 40px; }
                    .invoice-details p { margin: 5px 0; font-size: 1.2em; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background-color: #f8f8f8; font-weight: bold; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .total-row td { font-weight: bold; font-size: 1.2em; }
                    .status { text-align: center; margin-top: 20px; }
                    .status strong { font-size: 1.2em; padding: 10px 20px; border-radius: 5px; background-color: #f0f0f0; }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <div class="invoice-header">
                        <h1>INVOICE</h1>
                    </div>
                    <div class="invoice-details">
                        <p><strong>No:</strong> ${invoice.no}</p>
                        <p><strong>Tanggal:</strong> ${invoice.date}</p>
                        <p><strong>Customer:</strong> ${invoice.customer}</p>
                    </div>
                    <h2>Detail ${invoice.type === 'Reimbursement' ? 'Biaya' : 'Item'}</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Deskripsi</th>
                                ${invoice.type !== 'Reimbursement' ? '<th class="text-center">Qty</th><th class="text-right">Harga</th>' : ''}
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${detailRowsHtml}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <th colspan="${invoice.type === 'Reimbursement' ? 2 : 4}" class="text-right">Total:</th>
                                <th class="text-right">${formatCurrency(invoice.totalAmount)}</th>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="status">
                        <strong>Status: ${invoice.status}</strong>
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    }

    /**
     * Membuka modal untuk mengedit invoice yang ada.
     * @param {string} no - Nomor invoice yang akan diedit.
     */
    function handleEditInvoice(no) {
        handleTambahInvoice(no); // Panggil fungsi utama dengan nomor invoice
    }

    /**
     * Event handler untuk tombol Tambah/Edit Invoice (Termasuk Draft dan Reimbursement).
     * @param {string | null} invoiceNoToEdit - Nomor invoice yang akan diedit, atau null untuk membuat baru.
     */
    function handleTambahInvoice(invoiceNoToEdit = null) {
        const coaRevenue = readFromLS(LS_KEYS.coa).filter(acc => acc.type === 'Revenue');
        const coaOptions = coaRevenue.map(acc => `<option value="${acc.id}">${acc.name}</option>`).join('');
        const customers = readFromLS(LS_KEYS.customers);
        const customerOptions = customers.map(c => `<option value="${c.nama}">${c.nama}</option>`).join('');
        const customerSelectHtml = customerOptions ? 
            `<select id="inv-customer" required><option value="">-- Pilih Pelanggan --</option>${customerOptions}</select>` :
            `<input type="text" id="inv-customer" placeholder="Belum ada data pelanggan, tambah manual" required>`;

        const isEditing = !!invoiceNoToEdit;
        const invoiceToEdit = isEditing ? readFromLS(LS_KEYS.invoices).find(inv => inv.no === invoiceNoToEdit) : null;
        const formTitle = isEditing ? `Edit Invoice: ${invoiceNoToEdit}` : 'Tambah Invoice Baru';

        const formHtml = `
            <form id="invoice-form">
                <div class="form-group"><label>No. Invoice</label><input type="text" id="inv-no" required ${isEditing ? 'readonly' : ''}></div>
                <div class="form-group"><label>Customer</label>${customerSelectHtml}</div>
                <div class="form-group"><label>Tanggal</label><input type="date" id="inv-date" required></div>
                <div class="form-group"><label>Tipe Invoice</label>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <label><input type="radio" name="inv-type" value="Tagihan" ${!isEditing || invoiceToEdit.type === 'Tagihan' ? 'checked' : ''}> Tagihan</label>
                        <label><input type="radio" name="inv-type" value="DP" ${invoiceToEdit?.type === 'DP' ? 'checked' : ''}> DP</label>
                        <label><input type="radio" name="inv-type" value="Pelunasan" ${invoiceToEdit?.type === 'Pelunasan' ? 'checked' : ''}> Pelunasan</label>
                        <label><input type="radio" name="inv-type" value="Reimbursement" ${invoiceToEdit?.type === 'Reimbursement' ? 'checked' : ''}> Reimbursement</label>
                    </div>
                </div>
                
                <!-- Section untuk Tagihan & DP -->
                <div id="items-section" style="${(invoiceToEdit?.type === 'Tagihan' || invoiceToEdit?.type === 'DP') ? 'display: block;' : 'display: none;'}">
                    <h4>Detail Item</h4>
                    <div class="form-group" id="inv-revenue-group"><label>Akun Pendapatan</label><select id="inv-account">${coaOptions}</select></div>
                    <div id="items-container">
                        <!-- Item rows will be populated by JS -->
                    </div>
                    <button type="button" class="btn btn-secondary" id="add-item-btn">+ Tambah Item</button>
                    <h3>Total Invoice: <span id="invoice-total-display">Rp 0</span></h3>
                </div>

                <!-- Section untuk Reimbursement -->
                <div id="reimbursement-section" style="${invoiceToEdit?.type === 'Reimbursement' ? 'display: block;' : 'display: none;'}">
                    <h4>Detail Biaya Reimbursement</h4>
                    <div id="reimbursement-container">
                        <!-- Reimbursement rows will be populated by JS -->
                    </div>
                    <button type="button" class="btn btn-secondary" id="add-reimbursement-btn">+ Tambah Biaya</button>
                    <h3>Total Reimbursement: <span id="reimbursement-total-display">Rp 0</span></h3>
                </div>

                <!-- Section untuk Pelunasan -->
                <div id="pelunasan-section" style="${invoiceToEdit?.type === 'Pelunasan' ? 'display: block;' : 'display: none;'}">
                    <div class="form-group"><label>Pilih Invoice Tagihan/DP</label><select id="inv-link-to"></select></div>
                    <h3>Total Pelunasan: <span id="pelunasan-amount-display">Rp 0</span></h3>
                </div>

                <!-- Section untuk DP & Pelunasan -->
                <div id="payment-section" style="${(invoiceToEdit?.type === 'DP' || invoiceToEdit?.type === 'Pelunasan') ? 'display: block;' : 'display: none;'}">
                    <div class="form-group"><label>Akun Kas/Bank</label>
                        <select id="inv-payment-account">
                            <option value="100" ${invoiceToEdit?.paymentAccountId === 100 ? 'selected' : ''}>Kas</option>
                            <option value="110" ${invoiceToEdit?.paymentAccountId === 110 ? 'selected' : ''}>Bank BCA</option>
                        </select>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="batal-invoice">Batal</button>
                    ${!isEditing ? '<button type="button" class="btn btn-secondary" id="save-draft-btn">Simpan sebagai Draft</button>' : ''}
                    <button type="submit" class="btn btn-primary">${isEditing ? 'Update Invoice' : 'Simpan & Finalisasi'}</button>
                </div>
            </form>
        `;
        openModal(formTitle, formHtml);

        const form = document.getElementById('invoice-form');
        const itemsSection = document.getElementById('items-section');
        const reimbursementSection = document.getElementById('reimbursement-section');
        const pelunasanSection = document.getElementById('pelunasan-section');
        const paymentSection = document.getElementById('payment-section');
        const typeRadios = document.querySelectorAll('input[name="inv-type"]');
        const linkToSelect = document.getElementById('inv-link-to');
        const totalDisplay = document.getElementById('invoice-total-display');
        const reimbursementTotalDisplay = document.getElementById('reimbursement-total-display');
        const pelunasanAmountDisplay = document.getElementById('pelunasan-amount-display');

        // --- FUNGSI PEMBANTU UNTUK FORM ---
        function populateItems(container, items, itemRowTemplate) {
            container.innerHTML = '';
            if (!items || items.length === 0) {
                container.innerHTML = itemRowTemplate;
                return;
            }
            items.forEach(item => {
                const row = document.createElement('div');
                row.className = itemRowTemplate.includes('reimbursement') ? 'reimbursement-item-row' : 'item-row';
                row.innerHTML = itemRowTemplate
                    .replace(/<input.*?placeholder="Deskripsi.*?"/, `<input type="text" placeholder="Deskripsi Item" class="item-desc" value="${item.description}" required>`)
                    .replace(/<input.*?placeholder="Qty.*?value="1".*?>/, `<input type="number" placeholder="Qty" class="item-qty" value="${item.quantity || 1}" min="1" required>`)
                    .replace(/<input.*?placeholder="Harga Satuan.*?>/, `<input type="number" placeholder="Harga Satuan" class="item-price" value="${item.unitPrice || item.amount}" required>`);
                container.appendChild(row);
            });
        }

        // --- JIKA MODE EDIT, ISI FORM DENGAN DATA LAMA ---
        if (isEditing && invoiceToEdit) {
            document.getElementById('inv-no').value = invoiceToEdit.no;
            document.getElementById('inv-customer').value = invoiceToEdit.customer;
            document.getElementById('inv-date').value = invoiceToEdit.date;
            
            const itemRowTemplate = `
                <input type="text" placeholder="Deskripsi Item" class="item-desc" required>
                <input type="number" placeholder="Qty" class="item-qty" value="1" min="1" required>
                <input type="number" placeholder="Harga Satuan" class="item-price" required>
                <span class="item-total">0</span>
                <button type="button" class="btn btn-sm btn-secondary remove-item-btn">Hapus</button>
            `;
            populateItems(document.getElementById('items-container'), invoiceToEdit.items, itemRowTemplate);
            
            const reimbursementRowTemplate = `
                <input type="text" placeholder="Deskripsi Biaya" class="reimbursement-desc" required>
                <input type="number" placeholder="Jumlah Biaya" class="reimbursement-amount" required>
                <button type="button" class="btn btn-sm btn-secondary remove-reimbursement-btn">Hapus</button>
            `;
            populateItems(document.getElementById('reimbursement-container'), invoiceToEdit.expenses, reimbursementRowTemplate);
            
            calculateTotal();
            calculateReimbursementTotal();
        } else {
            // Add initial empty row if creating new
            document.getElementById('items-container').innerHTML = `
                <div class="item-row">
                    <input type="text" placeholder="Deskripsi Item" class="item-desc" required>
                    <input type="number" placeholder="Qty" class="item-qty" value="1" min="1" required>
                    <input type="number" placeholder="Harga Satuan" class="item-price" required>
                    <span class="item-total">0</span>
                    <button type="button" class="btn btn-sm btn-secondary remove-item-btn">Hapus</button>
                </div>`;
            document.getElementById('reimbursement-container').innerHTML = `
                <div class="reimbursement-item-row">
                    <input type="text" placeholder="Deskripsi Biaya" class="reimbursement-desc" required>
                    <input type="number" placeholder="Jumlah Biaya" class="reimbursement-amount" required>
                    <button type="button" class="btn btn-sm btn-secondary remove-reimbursement-btn">Hapus</button>
                </div>`;
        }

        // --- EVENT LISTENERS (sama seperti sebelumnya) ---
        function calculateTotal() {
            let total = 0;
            document.querySelectorAll('.item-row').forEach(row => {
                const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
                const price = parseFloat(row.querySelector('.item-price').value) || 0;
                const itemTotal = qty * price;
                row.querySelector('.item-total').textContent = formatCurrency(itemTotal);
                total += itemTotal;
            });
            totalDisplay.textContent = formatCurrency(total);
        }

        function calculateReimbursementTotal() {
            let total = 0;
            document.querySelectorAll('.reimbursement-item-row').forEach(row => {
                const amount = parseFloat(row.querySelector('.reimbursement-amount').value) || 0;
                total += amount;
            });
            reimbursementTotalDisplay.textContent = formatCurrency(total);
        }
        
        typeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const type = radio.value;
                itemsSection.style.display = (type === 'Tagihan' || type === 'DP') ? 'block' : 'none';
                reimbursementSection.style.display = (type === 'Reimbursement') ? 'block' : 'none';
                pelunasanSection.style.display = (type === 'Pelunasan') ? 'block' : 'none';
                paymentSection.style.display = (type === 'DP' || type === 'Pelunasan') ? 'block' : 'none';

                if (type === 'Pelunasan') {
                    const invoices = readFromLS(LS_KEYS.invoices);
                    const unpaidInvoices = invoices.filter(inv => inv.status === 'Belum Lunas' || inv.status === 'Sebagian (DP)');
                    linkToSelect.innerHTML = '<option value="">-- Pilih Invoice --</option>';
                    unpaidInvoices.forEach(inv => {
                        const option = document.createElement('option');
                        option.value = inv.no;
                        option.textContent = `${inv.no} - ${inv.customer} (Sisa: ${formatCurrency(calculateRemainingBalance(inv))})`;
                        linkToSelect.appendChild(option);
                    });
                }
            });
        });

        document.getElementById('add-item-btn').addEventListener('click', () => {
            const container = document.getElementById('items-container');
            const newRow = document.createElement('div');
            newRow.className = 'item-row';
            newRow.innerHTML = `
                <input type="text" placeholder="Deskripsi Item" class="item-desc" required>
                <input type="number" placeholder="Qty" class="item-qty" value="1" min="1" required>
                <input type="number" placeholder="Harga Satuan" class="item-price" required>
                <span class="item-total">0</span>
                <button type="button" class="btn btn-sm btn-secondary remove-item-btn">Hapus</button>
            `;
            container.appendChild(newRow);
        });

        document.getElementById('add-reimbursement-btn').addEventListener('click', () => {
            const container = document.getElementById('reimbursement-container');
            const newRow = document.createElement('div');
            newRow.className = 'reimbursement-item-row';
            newRow.innerHTML = `
                <input type="text" placeholder="Deskripsi Biaya" class="reimbursement-desc" required>
                <input type="number" placeholder="Jumlah Biaya" class="reimbursement-amount" required>
                <button type="button" class="btn btn-sm btn-secondary remove-reimbursement-btn">Hapus</button>
            `;
            container.appendChild(newRow);
        });
        
        document.getElementById('items-container').addEventListener('input', calculateTotal);
        document.getElementById('items-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item-btn')) {
                if (document.querySelectorAll('.item-row').length > 1) {
                    e.target.closest('.item-row').remove();
                    calculateTotal();
                } else {
                    alert('Minimal harus ada satu item.');
                }
            }
        });

        document.getElementById('reimbursement-container').addEventListener('input', calculateReimbursementTotal);
        document.getElementById('reimbursement-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-reimbursement-btn')) {
                if (document.querySelectorAll('.reimbursement-item-row').length > 1) {
                    e.target.closest('.reimbursement-item-row').remove();
                    calculateReimbursementTotal();
                } else {
                    alert('Minimal harus ada satu item biaya.');
                }
            }
        });

        linkToSelect.addEventListener('change', () => {
            const selectedNo = linkToSelect.value;
            if (selectedNo) {
                const invoices = readFromLS(LS_KEYS.invoices);
                const originalInvoice = invoices.find(inv => inv.no === selectedNo);
                if(originalInvoice) {
                    pelunasanAmountDisplay.textContent = formatCurrency(calculateRemainingBalance(originalInvoice));
                }
            } else {
                pelunasanAmountDisplay.textContent = 'Rp 0';
            }
        });

        document.getElementById('batal-invoice').addEventListener('click', closeModal);
        
        // --- EVENT LISTENER UNTUK SIMPAN ---
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.querySelector('input[name="inv-type"]:checked').value;
            const no = document.getElementById('inv-no').value;
            const customer = document.getElementById('inv-customer').value;
            const date = document.getElementById('inv-date').value;
            const invoices = readFromLS(LS_KEYS.invoices);

            let newInvoice = { no, customer, date, type };
            let journalEntries = [];
            let totalAmount = 0;
            let status = 'Belum Lunas'; // Default status for finalized invoice

            if (type === 'Tagihan') {
                const items = [];
                document.querySelectorAll('.item-row').forEach(row => {
                    const desc = row.querySelector('.item-desc').value;
                    const qty = parseFloat(row.querySelector('.item-qty').value);
                    const price = parseFloat(row.querySelector('.item-price').value);
                    const total = qty * price;
                    items.push({ description: desc, quantity: qty, unitPrice: price, total });
                    totalAmount += total;
                });
                newInvoice.items = items;
                newInvoice.totalAmount = totalAmount;
                newInvoice.status = status;
                newInvoice.linkToNo = null;

                const revenueAccElement = document.querySelector('#inv-account');
                if (!revenueAccElement || isNaN(parseInt(revenueAccElement.value))) {
                    alert("Error: Pilih akun pendapatan yang valid.");
                    return;
                }
                const revenueAccId = parseInt(revenueAccElement.value);
                journalEntries = [ { accountId: 200, debit: totalAmount }, { accountId: revenueAccId, kredit: totalAmount } ];

            } else if (type === 'DP' || type === 'Pelunasan') {
                const paymentAccId = parseInt(document.getElementById('inv-payment-account').value);
                if (type === 'DP') {
                    const items = [];
                    document.querySelectorAll('.item-row').forEach(row => {
                        const desc = row.querySelector('.item-desc').value;
                        const qty = parseFloat(row.querySelector('.item-qty').value);
                        const price = parseFloat(row.querySelector('.item-price').value);
                        const total = qty * price;
                        items.push({ description: desc, quantity: qty, unitPrice: price, total });
                        totalAmount += total;
                    });
                    newInvoice.items = items;
                    newInvoice.totalAmount = totalAmount;
                    newInvoice.status = 'Sebagian (DP)';
                    newInvoice.linkToNo = null;
                    journalEntries = [ { accountId: paymentAccId, debit: totalAmount }, { accountId: 200, kredit: totalAmount } ];
                } else { // Pelunasan
                    const linkToNo = document.getElementById('inv-link-to').value;
                    if (!linkToNo) { alert('Pilih invoice yang akan dilunasi.'); return; }
                    const originalInvoice = invoices.find(inv => inv.no === linkToNo);
                    totalAmount = calculateRemainingBalance(originalInvoice);
                    newInvoice.items = [];
                    newInvoice.totalAmount = totalAmount;
                    newInvoice.status = 'Lunas';
                    newInvoice.linkToNo = linkToNo;
                    newInvoice.paymentDate = new Date().toISOString().split('T')[0]; // Tambahkan tanggal pembayaran
                    originalInvoice.status = 'Lunas';
                    originalInvoice.paymentDate = new Date().toISOString().split('T')[0]; // Tambahkan tanggal pembayaran
                    writeToLS(LS_KEYS.invoices, invoices);
                    journalEntries = [ { accountId: paymentAccId, debit: totalAmount }, { accountId: 200, kredit: totalAmount } ];
                }
            } else if (type === 'Reimbursement') {
                const expenses = [];
                document.querySelectorAll('.reimbursement-item-row').forEach(row => {
                    const desc = row.querySelector('.reimbursement-desc').value;
                    const amount = parseFloat(row.querySelector('.reimbursement-amount').value);
                    expenses.push({ description: desc, amount });
                    totalAmount += amount;
                });
                newInvoice.expenses = expenses;
                newInvoice.totalAmount = totalAmount;
                newInvoice.status = status;
                newInvoice.linkToNo = null;
                journalEntries = [ { accountId: 200, debit: totalAmount }, { accountId: 510, kredit: totalAmount } ];
            }

            if (isEditing) {
                const index = invoices.findIndex(inv => inv.no === invoiceNoToEdit);
                if (index > -1) {
                    // Jika invoice sebelumnya draft dan sekarang difinalisasi, buat jurnal
                    if (invoices[index].status === 'Draft' && status !== 'Draft') {
                        createJournalEntry(date, no, journalEntries, `Invoice ${type} - ${customer} (Dari Draft)`);
                    }
                    invoices[index] = newInvoice;
                }
            } else {
                // Jika bukan draft, buat jurnal
                if(status !== 'Draft') {
                    createJournalEntry(date, no, journalEntries, `Invoice ${type} - ${customer}`);
                }
                invoices.push(newInvoice);
            }

            writeToLS(LS_KEYS.invoices, invoices);
            closeModal();
            renderInvoices();
            renderJournals();
            renderDashboard();
        });

        // --- EVENT LISTENER UNTUK SIMPAN DRAFT ---
        const saveDraftBtn = document.getElementById('save-draft-btn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => {
                const no = document.getElementById('inv-no').value;
                const customer = document.getElementById('inv-customer').value;
                const date = document.getElementById('inv-date').value;
                const type = document.querySelector('input[name="inv-type"]:checked').value;

                if (!no || !customer || !date) {
                    alert('No. Invoice, Customer, dan Tanggal harus diisi untuk draft.');
                    return;
                }

                let draftInvoice = { no, customer, date, type, status: 'Draft' };
                let totalAmount = 0;

                if (type === 'Tagihan' || type === 'DP') {
                    const items = [];
                    document.querySelectorAll('.item-row').forEach(row => {
                        const desc = row.querySelector('.item-desc').value;
                        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
                        const price = parseFloat(row.querySelector('.item-price').value) || 0;
                        if (desc && qty > 0 && price > 0) {
                            const total = qty * price;
                            items.push({ description: desc, quantity: qty, unitPrice: price, total });
                            totalAmount += total;
                        }
                    });
                    draftInvoice.items = items;
                } else if (type === 'Reimbursement') {
                    const expenses = [];
                    document.querySelectorAll('.reimbursement-item-row').forEach(row => {
                        const desc = row.querySelector('.reimbursement-desc').value;
                        const amount = parseFloat(row.querySelector('.reimbursement-amount').value) || 0;
                        if (desc && amount > 0) {
                            expenses.push({ description: desc, amount });
                            totalAmount += amount;
                        }
                    });
                    draftInvoice.expenses = expenses;
                }
                draftInvoice.totalAmount = totalAmount;

                const invoices = readFromLS(LS_KEYS.invoices);
                const existingIndex = invoices.findIndex(inv => inv.no === no);

                if (existingIndex > -1) {
                    invoices[existingIndex] = draftInvoice;
                } else {
                    invoices.push(draftInvoice);
                }
                
                writeToLS(LS_KEYS.invoices, invoices);
                closeModal();
                renderInvoices();
                alert(`Invoice ${no} berhasil disimpan sebagai draft.`);
            });
        }
    }

    /**
     * Menandai invoice sebagai lunas
     * @param {string} invoiceNo - Nomor invoice yang akan ditandai lunas
     */
    function handleTandaiLunas(invoiceNo) {
        if (confirm(`Tandai invoice ${invoiceNo} sebagai lunas?`)) {
            const invoices = readFromLS(LS_KEYS.invoices);
            const salesReports = readFromLS(LS_KEYS.salesReports);
            
            // Update status invoice
            const invoiceIndex = invoices.findIndex(inv => inv.no === invoiceNo);
            if (invoiceIndex > -1) {
                invoices[invoiceIndex].status = 'Lunas';
                invoices[invoiceIndex].paymentDate = new Date().toISOString().split('T')[0];
                writeToLS(LS_KEYS.invoices, invoices);
            }
            
            // Update status di laporan penjualan
            const reportIndex = salesReports.findIndex(report => report.invoiceNo === invoiceNo);
            if (reportIndex > -1) {
                salesReports[reportIndex].status = 'Lunas';
                salesReports[reportIndex].paymentDate = new Date().toISOString().split('T')[0];
                writeToLS(LS_KEYS.salesReports, salesReports);
            }
            
            renderLaporanPenjualan();
            renderInvoices();
            alert(`Invoice ${invoiceNo} telah ditandai sebagai lunas.`);
        }
    }
    
    /**
     * Membatalkan status lunas invoice
     * @param {string} invoiceNo - Nomor invoice yang akan dibatalkan status lunasnya
     */
    function handleBatalkanLunas(invoiceNo) {
        if (confirm(`Batalkan status lunas invoice ${invoiceNo}?`)) {
            const invoices = readFromLS(LS_KEYS.invoices);
            const salesReports = readFromLS(LS_KEYS.salesReports);
            
            // Update status invoice
            const invoiceIndex = invoices.findIndex(inv => inv.no === invoiceNo);
            if (invoiceIndex > -1) {
                invoices[invoiceIndex].status = 'Belum Lunas';
                delete invoices[invoiceIndex].paymentDate;
                writeToLS(LS_KEYS.invoices, invoices);
            }
            
            // Update status di laporan penjualan
            const reportIndex = salesReports.findIndex(report => report.invoiceNo === invoiceNo);
            if (reportIndex > -1) {
                salesReports[reportIndex].status = 'Belum Lunas';
                delete salesReports[reportIndex].paymentDate;
                writeToLS(LS_KEYS.salesReports, salesReports);
            }
            
            renderLaporanPenjualan();
            renderInvoices();
            alert(`Status lunas untuk invoice ${invoiceNo} telah dibatalkan.`);
        }
    }

    /** Event handler untuk tombol Tambah Jurnal Umum. */
    function handleTambahJurnal() {
        const coa = readFromLS(LS_KEYS.coa);
        const coaOptions = coa.map(acc => `<option value="${acc.id}">${acc.name}</option>`).join('');
        
        const formHtml = `
            <form id="jurnal-form">
                <div class="form-group"><label>Tanggal</label><input type="date" id="jr-date" required></div>
                <div class="form-group"><label>No. Bukti</label><input type="text" id="jr-ref" required></div>
                <div class="form-group"><label>Keterangan</label><textarea id="jr-desc" required></textarea></div>
                <div id="journal-entries"><h4>Entri Jurnal</h4><div class="journal-entry-row"><select class="jr-account">${coaOptions}</select><input type="number" placeholder="Debit" class="jr-debit"><input type="number" placeholder="Kredit" class="jr-kredit"></div></div>
                <button type="button" class="btn btn-secondary" id="add-jr-row">Tambah Baris</button>
                <div class="form-actions"><button type="button" class="btn btn-secondary" id="batal-jurnal">Batal</button><button type="submit" class="btn btn-primary">Simpan Jurnal</button></div>
            </form>
        `;
        openModal('Tambah Jurnal Umum', formHtml);
        
        document.getElementById('add-jr-row').addEventListener('click', () => {
            const newRow = document.createElement('div'); newRow.className = 'journal-entry-row';
            newRow.innerHTML = `<select class="jr-account">${coaOptions}</select><input type="number" placeholder="Debit" class="jr-debit"><input type="number" placeholder="Kredit" class="jr-kredit"><button type="button" class="btn btn-sm btn-danger jr-remove">Hapus Baris</button>`;
            document.getElementById('journal-entries').insertBefore(newRow, document.getElementById('add-jr-row'));
            newRow.querySelector('.jr-remove').addEventListener('click', () => newRow.remove());
        });

        document.getElementById('batal-jurnal').addEventListener('click', closeModal);
        document.getElementById('jurnal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('jr-date').value, ref = document.getElementById('jr-ref').value, desc = document.getElementById('jr-desc').value;
            const entries = [];
            document.querySelectorAll('.journal-entry-row').forEach(row => {
                const accId = parseInt(row.querySelector('.jr-account').value);
                const debit = parseFloat(row.querySelector('.jr-debit').value) || 0;
                const kredit = parseFloat(row.querySelector('.jr-kredit').value) || 0;
                if (debit > 0 || kredit > 0) entries.push({ accountId: accId, debit, kredit });
            });
            if (createJournalEntry(date, ref, entries, desc)) { closeModal(); renderJournals(); renderDashboard(); }
        });
    }

    /** Event handler untuk tombol Tambah Pelanggan. */
    function handleTambahPelanggan() {
        const formHtml = `
            <form id="pelanggan-form">
                <div class="form-group"><label>Nama Pelanggan</label><input type="text" id="pel-nama" required></div>
                <div class="form-group"><label>Alamat</label><textarea id="pel-alamat"></textarea></div>
                <div class="form-group"><label>Telepon</label><input type="tel" id="pel-telepon"></div>
                <div class="form-actions"><button type="button" class="btn btn-secondary" id="batal-pelanggan">Batal</button><button type="submit" class="btn btn-primary">Simpan</button></div>
            </form>
        `;
        openModal('Tambah Pelanggan Baru', formHtml);

        document.getElementById('batal-pelanggan').addEventListener('click', closeModal);
        document.getElementById('pelanggan-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const pelanggan = {
                nama: document.getElementById('pel-nama').value,
                alamat: document.getElementById('pel-alamat').value,
                telepon: document.getElementById('pel-telepon').value,
            };
            let customers = readFromLS(LS_KEYS.customers);
            if(customers.find(c => c.nama.toLowerCase() === pelanggan.nama.toLowerCase())) {
                alert('Nama pelanggan sudah ada!');
                return;
            }
            customers.push(pelanggan);
            writeToLS(LS_KEYS.customers, customers);
            closeModal();
            renderDataPelanggan();
        });
    }

    /** Event handler untuk tombol Export Laporan Penjualan. */
    function handleExportLaporanPenjualan() {
        const salesReports = readFromLS(LS_KEYS.salesReports);
        
        if (salesReports.length === 0) {
            alert('Tidak ada data laporan penjualan untuk diekspor.');
            return;
        }
        
        // Buat worksheet
        const ws = XLSX.utils.json_to_sheet(salesReports.map(report => ({
            'No. Invoice': report.invoiceNo,
            'Customer': report.customer,
            'Tanggal': report.date,
            'Total': report.totalAmount,
            'Status': report.status,
            'Tanggal Pelunasan': report.paymentDate || '-'
        })));
        
        // Buat workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penjualan');
        
        // Download file
        XLSX.writeFile(wb, `Laporan_Penjualan_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        alert('Laporan penjualan berhasil diekspor.');
    }

    // --- Placeholder untuk handler lainnya (dapat dikembangkan serupa) ---
    function handleTambahPettyCash() {
        const today = new Date().toISOString().split('T')[0];
        const formHtml = `
            <form id="petty-form">
                <div class="form-group"><label>Tanggal</label><input type="date" id="pc-date" required value="${today}"></div>
                <div class="form-group"><label>Keterangan</label><input type="text" id="pc-desc" required></div>
                <div class="form-group"><label>Debit</label><input type="number" id="pc-debit" min="0" step="1" placeholder="0"></div>
                <div class="form-group"><label>Kredit</label><input type="number" id="pc-kredit" min="0" step="1" placeholder="0"></div>
                <div class="form-actions"><button type="button" class="btn btn-secondary" id="batal-petty">Batal</button><button type="submit" class="btn btn-primary">Simpan</button></div>
            </form>
        `;
        openModal('Tambah Transaksi Petty Cash', formHtml);
        document.getElementById('batal-petty').addEventListener('click', closeModal);
        document.getElementById('petty-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('pc-date').value;
            const desc = document.getElementById('pc-desc').value;
            const debit = parseFloat(document.getElementById('pc-debit').value) || 0;
            const kredit = parseFloat(document.getElementById('pc-kredit').value) || 0;
            if ((debit <= 0 && kredit <= 0) || (debit > 0 && kredit > 0)) {
                alert('Isi salah satu: Debit ATAU Kredit, dan harus > 0.');
                return;
            }
            const transactions = readFromLS(LS_KEYS.pettyCash);
            transactions.push({ date, desc, debit, kredit });
            writeToLS(LS_KEYS.pettyCash, transactions);
            closeModal();
            renderPettyCash();
        });
    }
    function handleExportJurnal() {
        const journals = readFromLS(LS_KEYS.journals);
        if (journals.length === 0) { alert('Tidak ada data jurnal untuk diekspor.'); return; }
        const ws = XLSX.utils.json_to_sheet(journals.map(j => ({
            'Tanggal': j.date,
            'No. Bukti': j.ref,
            'Akun': j.accountName,
            'Debit': j.debit,
            'Kredit': j.kredit,
            'Keterangan': j.description
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Jurnal Umum');
        XLSX.writeFile(wb, `Jurnal_Umum_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    function handleExportBesar() {
        const accountSelect = document.getElementById('account-select');
        if (!accountSelect || !accountSelect.value) { alert('Pilih akun terlebih dahulu.'); return; }
        const accountId = parseInt(accountSelect.value);
        const accountName = getAccountName(accountId);
        const journals = readFromLS(LS_KEYS.journals).filter(j => j.accountId === accountId).sort((a,b)=> new Date(a.date) - new Date(b.date));
        if (journals.length === 0) { alert('Tidak ada data untuk akun ini.'); return; }
        let balance = 0;
        const rows = journals.map(j => {
            balance += j.debit - j.kredit;
            return {
                'Tanggal': j.date,
                'Keterangan': j.description,
                'Debit': j.debit,
                'Kredit': j.kredit,
                'Saldo': balance
            };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Buku Besar - ${accountName}`);
        XLSX.writeFile(wb, `Buku_Besar_${accountName.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    function handleExportPettyCash() {
        const transactions = readFromLS(LS_KEYS.pettyCash);
        if (transactions.length === 0) { alert('Tidak ada data petty cash untuk diekspor.'); return; }
        let balance = 0;
        const rows = transactions.map(t => {
            balance += t.debit - t.kredit;
            return {
                'Tanggal': t.date,
                'Keterangan': t.desc,
                'Debit': t.debit,
                'Kredit': t.kredit,
                'Saldo': balance
            };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Petty Cash');
        XLSX.writeFile(wb, `Petty_Cash_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    function handleBackupRestore() { alert('Fitur Backup & Restore akan segera hadir.'); }
    function handleLogout() { if (confirm('Keluar dari sistem?')) location.reload(); }
    function handleTambahGaji() { alert('Fitur Slip Gaji akan segera hadir.'); }

    function renderFixedAssets() {
        const assets = readFromLS(LS_KEYS.fixedAssets);
        const tbody = document.getElementById('aset-tetap-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Tidak ada aset.</td></tr>';
            return;
        }
        assets.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${a.name}</td>
                <td>${a.startDate}</td>
                <td>${a.lifeMonths}</td>
                <td>${a.quantity}</td>
                <td>${a.method}</td>
                <td>${formatCurrency(a.unitCost)}</td>
                <td>${a.disposed ? 'Dijual' : 'Aktif'}</td>
                <td class="action-buttons"></td>
            `;
            const actionTd = tr.querySelector('.action-buttons');
            if (!a.disposed) {
                actionTd.appendChild(createButton('btn btn-sm btn-info', 'Penyusutan', () => handlePenyusutanAset(a.id)));
                actionTd.appendChild(createButton('btn btn-sm btn-warning', 'Edit', () => handleTambahAset(a.id)));
                actionTd.appendChild(createButton('btn btn-sm btn-secondary', 'Jual', () => handleDisposisiAset(a.id)));
            }
            actionTd.appendChild(createButton('btn btn-sm btn-danger', 'Hapus', () => deleteAsset(a.id)));
            tbody.appendChild(tr);
        });
    }

    function handleTambahAset(assetId = null) {
        const isEdit = !!assetId;
        const assets = readFromLS(LS_KEYS.fixedAssets);
        const asset = isEdit ? assets.find(a => a.id === assetId) : null;
        const formHtml = `
            <form id="aset-form">
                <div class="form-group"><label>Nama Aset</label><input type="text" id="fa-name" required value="${asset?.name || ''}"></div>
                <div class="form-group"><label>Tanggal Pakai</label><input type="date" id="fa-start" required value="${asset?.startDate || ''}"></div>
                <div class="form-group"><label>Umur (bulan)</label><input type="number" id="fa-life" required value="${asset?.lifeMonths || ''}"></div>
                <div class="form-group"><label>Kuantitas</label><input type="number" id="fa-qty" required value="${asset?.quantity || 1}"></div>
                <div class="form-group"><label>Metode</label>
                    <select id="fa-method"><option value="Garis Lurus" ${asset?.method === 'Garis Lurus' ? 'selected' : ''}>Garis Lurus</option></select>
                </div>
                <div class="form-group"><label>Harga per Unit</label><input type="number" id="fa-cost" required value="${asset?.unitCost || ''}"></div>
                <div class="form-actions"><button type="button" class="btn btn-secondary" id="batal-aset">Batal</button><button type="submit" class="btn btn-primary">${isEdit ? 'Simpan' : 'Tambah'}</button></div>
            </form>
        `;
        openModal(isEdit ? 'Edit Aset Tetap' : 'Tambah Aset Tetap', formHtml);
        document.getElementById('batal-aset').addEventListener('click', closeModal);
        document.getElementById('aset-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const newAsset = {
                id: isEdit ? asset.id : `FA-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                name: document.getElementById('fa-name').value,
                startDate: document.getElementById('fa-start').value,
                lifeMonths: parseInt(document.getElementById('fa-life').value),
                quantity: parseInt(document.getElementById('fa-qty').value),
                method: document.getElementById('fa-method').value,
                unitCost: parseFloat(document.getElementById('fa-cost').value),
                accountId: 400,
                accumulatedDep: asset?.accumulatedDep || 0,
                disposed: asset?.disposed || false,
            };
            let list = readFromLS(LS_KEYS.fixedAssets);
            if (isEdit) {
                const idx = list.findIndex(a => a.id === assetId);
                if (idx > -1) list[idx] = newAsset;
            } else {
                list.push(newAsset);
                createJournalEntry(newAsset.startDate, `FA-${newAsset.id}`, [ { accountId: 400, debit: newAsset.unitCost * newAsset.quantity }, { accountId: 100, kredit: newAsset.unitCost * newAsset.quantity } ], `Perolehan Aset: ${newAsset.name}`);
            }
            writeToLS(LS_KEYS.fixedAssets, list);
            closeModal();
            renderFixedAssets();
            renderJournals();
            renderDashboard();
            renderNeraca();
        });
    }

    function monthlyDepAmount(asset) {
        return (asset.unitCost * asset.quantity) / asset.lifeMonths;
    }

    function handlePenyusutanAset(assetId) {
        const assets = readFromLS(LS_KEYS.fixedAssets);
        const asset = assets.find(a => a.id === assetId);
        if (!asset || asset.disposed) return;
        const formHtml = `
            <form id="dep-form">
                <div class="form-group"><label>Tanggal Penyusutan</label><input type="date" id="dep-date" required></div>
                <div class="form-actions"><button type="button" class="btn btn-secondary" id="batal-dep">Batal</button><button type="submit" class="btn btn-primary">Catat</button></div>
            </form>
        `;
        openModal(`Penyusutan: ${asset.name}`, formHtml);
        document.getElementById('batal-dep').addEventListener('click', closeModal);
        document.getElementById('dep-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('dep-date').value;
            const monthly = monthlyDepAmount(asset);
            const totalCost = asset.unitCost * asset.quantity;
            const remaining = Math.max(0, totalCost - asset.accumulatedDep);
            const amount = Math.min(monthly, remaining);
            if (amount <= 0) { alert('Aset sudah penuh disusutkan.'); return; }
            createJournalEntry(date, `DEP-${asset.id}`, [ { accountId: 840, debit: amount }, { accountId: 410, kredit: amount } ], `Penyusutan ${asset.name}`);
            asset.accumulatedDep = (asset.accumulatedDep || 0) + amount;
            const list = readFromLS(LS_KEYS.fixedAssets).map(a => a.id === asset.id ? asset : a);
            writeToLS(LS_KEYS.fixedAssets, list);
            closeModal();
            renderFixedAssets();
            renderJournals();
            renderDashboard();
            renderNeraca();
            renderLabaRugi();
        });
    }

    function handleDisposisiAset(assetId) {
        const assets = readFromLS(LS_KEYS.fixedAssets);
        const asset = assets.find(a => a.id === assetId);
        if (!asset || asset.disposed) return;
        const cashAccounts = readFromLS(LS_KEYS.coa).filter(acc => acc.type === 'Asset');
        const accOptions = cashAccounts.map(acc => `<option value="${acc.id}">${acc.name}</option>`).join('');
        const formHtml = `
            <form id="dispose-form">
                <div class="form-group"><label>Tanggal Jual</label><input type="date" id="disp-date" required></div>
                <div class="form-group"><label>Harga Jual</label><input type="number" id="disp-price" required></div>
                <div class="form-group"><label>Akun Penerimaan</label><select id="disp-acc">${accOptions}</select></div>
                <div class="form-actions"><button type="button" class="btn btn-secondary" id="batal-disp">Batal</button><button type="submit" class="btn btn-primary">Proses Jual</button></div>
            </form>
        `;
        openModal(`Jual Aset: ${asset.name}`, formHtml);
        document.getElementById('batal-disp').addEventListener('click', closeModal);
        document.getElementById('dispose-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('disp-date').value;
            const price = parseFloat(document.getElementById('disp-price').value);
            const cashAccId = parseInt(document.getElementById('disp-acc').value);
            const totalCost = asset.unitCost * asset.quantity;
            const monthly = monthlyDepAmount(asset);
            const remainingDepBeforeSale = Math.max(0, totalCost - (asset.accumulatedDep || 0));
            const lastDep = Math.min(monthly, remainingDepBeforeSale);
            if (lastDep > 0) {
                createJournalEntry(date, `DEP-LAST-${asset.id}`, [ { accountId: 840, debit: lastDep }, { accountId: 410, kredit: lastDep } ], `Penyusutan terakhir sebelum jual - ${asset.name}`);
                asset.accumulatedDep = (asset.accumulatedDep || 0) + lastDep;
            }
            const bookValue = Math.max(0, totalCost - (asset.accumulatedDep || 0));
            const entries = [
                { accountId: cashAccId, debit: price },
                { accountId: 410, debit: asset.accumulatedDep || 0 },
                { accountId: 400, kredit: totalCost }
            ];
            if (price > bookValue) {
                entries.push({ accountId: 720, kredit: price - bookValue });
            } else if (price < bookValue) {
                entries.push({ accountId: 850, debit: bookValue - price });
            }
            createJournalEntry(date, `SALE-${asset.id}`, entries, `Penjualan Aset: ${asset.name}`);
            asset.disposed = true;
            asset.disposalDate = date;
            asset.saleProceeds = price;
            const list = readFromLS(LS_KEYS.fixedAssets).map(a => a.id === asset.id ? asset : a);
            writeToLS(LS_KEYS.fixedAssets, list);
            closeModal();
            renderFixedAssets();
            renderJournals();
            renderDashboard();
            renderNeraca();
            renderLabaRugi();
        });
    }

    function deleteAsset(assetId) {
        if (!confirm('Hapus aset ini?')) return;
        let list = readFromLS(LS_KEYS.fixedAssets);
        list = list.filter(a => a.id !== assetId);
        writeToLS(LS_KEYS.fixedAssets, list);
        renderFixedAssets();
    }

    // =====================================================
    // === 6. INISIALISASI EVENT LISTENER               ===
    // =====================================================
    
    /** Mengatur semua event listener untuk elemen DOM. */
    function setupEventListeners() {
        // Event listener untuk hamburger menu
        if (elements.hamburgerBtn) {
            elements.hamburgerBtn.addEventListener('click', toggleSidebar);
        }
        
        // Tutup sidebar saat mengklik di luar sidebar (pada layar kecil)
        document.addEventListener('click', closeSidebarOnOutsideClick);

        // Event listener untuk dropdown menu
        const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
        
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('data-toggle');
                const submenu = document.getElementById(targetId);
                const chevron = this.querySelector('.fa-chevron-down');
                
                if (submenu) {
                    submenu.classList.toggle('show');
                    chevron.classList.toggle('rotate');
                }
            });
        });

        elements.sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewName = link.getAttribute('data-view');
                if (viewName) {
                    showView(viewName);
                    elements.sidebar.classList.remove('active');
                }
            });
        });

        // Tombol Tambah Invoice sekarang memanggil fungsi tanpa argumen (mode buat baru)
        elements.tambahInvoiceBtn.addEventListener('click', () => handleTambahInvoice());
        elements.tambahJurnalBtn.addEventListener('click', handleTambahJurnal);
        elements.tambahPettyCashBtn.addEventListener('click', handleTambahPettyCash);
        elements.exportJurnalBtn.addEventListener('click', handleExportJurnal);
        elements.exportBesarBtn.addEventListener('click', handleExportBesar);
        elements.backupRestoreBtn.addEventListener('click', handleBackupRestore);
        elements.logoutBtn.addEventListener('click', handleLogout);
        elements.tambahGajiBtn.addEventListener('click', handleTambahGaji);

        const tambahAsetBtn = document.getElementById('tambah-aset-btn');
        if (tambahAsetBtn) {
            tambahAsetBtn.addEventListener('click', () => handleTambahAset());
        }

        const hapusSemuaPettyBtn = document.getElementById('hapus-semua-petty-btn');
        if (hapusSemuaPettyBtn) {
            hapusSemuaPettyBtn.addEventListener('click', () => handleHapusSemuaTransaksiPettyCash());
        }

        if(elements.tambahPelangganBtn) {
            elements.tambahPelangganBtn.addEventListener('click', handleTambahPelanggan);
        }

        // Event listener untuk tombol export laporan penjualan
        if(elements.exportLaporanPenjualanBtn) {
            elements.exportLaporanPenjualanBtn.addEventListener('click', handleExportLaporanPenjualan);
        }

        elements.closeModalBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => { if (e.target === elements.modal) closeModal(); });
    }

    // =====================================================
    // === 7. START APLIKASI                              ===
    // =====================================================

    initializeData();
    showView('dashboard');
    renderInvoices();
    renderJournals();
    renderDashboard();
    renderLabaRugi();
    renderPettyCash();
    setupEventListeners();
});
        if (elements.exportPettyCashBtn) {
            elements.exportPettyCashBtn.addEventListener('click', handleExportPettyCash);
        }
