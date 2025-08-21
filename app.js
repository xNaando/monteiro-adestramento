/*
  Monteiro Adestramento - Gestão Local
  Armazenamento 100% local (localStorage) com exportação/importação JSON
*/

(() => {
  const APP_VERSION = 'v1.0.0';
  const STORAGE_KEY = 'ma_store_v1';

  // -------------------- Util --------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v||0));
  const todayStr = () => new Date().toISOString().slice(0,10);
  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;

  // -------------------- Store --------------------
  const defaultStore = () => ({
    meta: { version: APP_VERSION, createdAt: new Date().toISOString() },
    clientes: [],
    caes: [],
    aulas: [],
    pagamentos: []
  });

  const loadStore = () => {
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw){
        const init = defaultStore();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
        return init;
      }
      const data = JSON.parse(raw);
      // Migrações futuras poderiam ir aqui.
      return data;
    }catch(e){
      console.error('Erro ao carregar store', e);
      const init = defaultStore();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
  };

  const saveStore = (store) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  };

  let store = loadStore();

  // -------------------- Tabs --------------------
  function initTabs(){
    const tabs = $('#tabs');
    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tab]');
      if(!btn) return;
      $$('#tabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const id = btn.dataset.tab;
      $$('.tab-content').forEach(sec => sec.classList.remove('active'));
      const sec = $(`#tab-${id}`);
      sec.classList.add('active');
      // Atualiza listas ao trocar
      renderAll();
    });
  }

  // -------------------- Helpers de seleção --------------------
  function fillClientesSelect(select, includeVazio=true){
    select.innerHTML = '';
    if(includeVazio) select.append(new Option('— selecione —', ''));
    store.clientes
      .slice()
      .sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .forEach(c => select.append(new Option(c.nome, c.id)));
  }

  function fillCaesSelect(select, clienteId='', includeVazio=true){
    select.innerHTML = '';
    if(includeVazio) select.append(new Option('— selecione —', ''));
    let lista = store.caes.slice();
    if(clienteId) lista = lista.filter(c => c.clienteId === clienteId);
    lista
      .sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .forEach(c => select.append(new Option(c.nome, c.id)));
  }

  // -------------------- Renderizadores --------------------
  function renderClientes(){
    const wrap = $('#clientesLista');
    wrap.innerHTML = '';
    if(store.clientes.length === 0){
      wrap.innerHTML = '<div class="card"><div class="muted">Nenhum cliente cadastrado ainda.</div></div>';
      return;
    }
    const frag = document.createDocumentFragment();
    store.clientes.slice().sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR')).forEach(cli => {
      const caesDoCliente = store.caes.filter(c => c.clienteId === cli.id);
      const aulasDoCliente = store.aulas.filter(a => a.clienteId === cli.id);
      const pagosDoCliente = store.pagamentos.filter(p => p.clienteId === cli.id);
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h4>${cli.nome}</h4>
        <div class="muted">${cli.telefone || ''} ${cli.email ? '• ' + cli.email : ''}</div>
        <div>
          <span class="badge">Cães: ${caesDoCliente.length}</span>
          <span class="badge">Aulas: ${aulasDoCliente.length}</span>
          <span class="badge">Pagamentos: ${pagosDoCliente.length}</span>
        </div>
        ${cli.obs ? `<div class="muted">${cli.obs}</div>` : ''}
        <div class="actions">
          <button data-edit="${cli.id}" class="secondary">Editar</button>
          <button data-del="${cli.id}" class="danger">Remover</button>
        </div>
      `;
      frag.append(card);
    });
    wrap.append(frag);

    wrap.addEventListener('click', onClientesListClick);
  }

  function onClientesListClick(e){
    const btnEdit = e.target.closest('button[data-edit]');
    const btnDel = e.target.closest('button[data-del]');
    if(btnEdit){
      const id = btnEdit.dataset.edit;
      openClienteDialog(store.clientes.find(c => c.id === id));
    }
    if(btnDel){
      const id = btnDel.dataset.del;
      if(confirm('Remover cliente? Isso não removerá automaticamente cães/aulas/pagamentos vinculados.')){
        store.clientes = store.clientes.filter(c => c.id !== id);
        saveStore(store);
        renderAll();
      }
    }
  }

  function renderCaes(){
    const filtroCli = $('#filtroCaoCliente');
    fillClientesSelect(filtroCli, true);

    const wrap = $('#caesLista');
    wrap.innerHTML = '';
    let lista = store.caes.slice();
    const cliId = filtroCli.value;
    if(cliId) lista = lista.filter(c => c.clienteId === cliId);

    if(lista.length === 0){
      wrap.innerHTML = '<div class="card"><div class="muted">Nenhum cão cadastrado.</div></div>';
      return;
    }
    const frag = document.createDocumentFragment();
    lista.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR')).forEach(cao => {
      const cliente = store.clientes.find(c => c.id === cao.clienteId);
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h4>${cao.nome}</h4>
        <div class="muted">${cao.raca || 'Raça não informada'} • ${cao.idade||'-'} anos</div>
        <div class="muted">Cliente: ${cliente ? cliente.nome : '—'}</div>
        ${cao.obs ? `<div class="muted">${cao.obs}</div>` : ''}
        <div class="actions">
          <button data-edit="${cao.id}" class="secondary">Editar</button>
          <button data-del="${cao.id}" class="danger">Remover</button>
        </div>
      `;
      frag.append(card);
    });
    wrap.append(frag);

    wrap.addEventListener('click', onCaesListClick);
  }

  function onCaesListClick(e){
    const btnEdit = e.target.closest('button[data-edit]');
    const btnDel = e.target.closest('button[data-del]');
    if(btnEdit){
      const id = btnEdit.dataset.edit;
      openCaoDialog(store.caes.find(c => c.id === id));
    }
    if(btnDel){
      const id = btnDel.dataset.del;
      if(confirm('Remover cão?')){
        store.caes = store.caes.filter(c => c.id !== id);
        saveStore(store);
        renderAll();
      }
    }
  }

  function renderAulas(){
    const filtroCli = $('#filtroAulaCliente');
    const filtroCao = $('#filtroAulaCao');
    fillClientesSelect(filtroCli, true);
    fillCaesSelect(filtroCao, filtroCli.value, true);

    const wrap = $('#aulasLista');
    wrap.innerHTML = '';
    let lista = store.aulas.slice();
    const cliId = filtroCli.value; if(cliId) lista = lista.filter(a => a.clienteId === cliId);
    const caoId = filtroCao.value; if(caoId) lista = lista.filter(a => a.caoId === caoId);

    if(lista.length === 0){
      wrap.innerHTML = '<div class="card"><div class="muted">Nenhuma aula cadastrada.</div></div>';
      return;
    }
    const frag = document.createDocumentFragment();
    lista.sort((a,b) => (a.data||'').localeCompare(b.data||''))
      .forEach(aula => {
        const cliente = store.clientes.find(c => c.id === aula.clienteId);
        const cao = store.caes.find(c => c.id === aula.caoId);
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <h4>${aula.data || 'Data' } • ${aula.duracao||0} min</h4>
          <div class="muted">Cliente: ${cliente?cliente.nome:'—'} • Cão: ${cao?cao.nome:'—'}</div>
          ${aula.obs ? `<div class="muted">${aula.obs}</div>` : ''}
          <div class="actions">
            <button data-edit="${aula.id}" class="secondary">Editar</button>
            <button data-del="${aula.id}" class="danger">Remover</button>
          </div>
        `;
        frag.append(card);
      });
    wrap.append(frag);

    wrap.addEventListener('click', onAulasListClick);
  }

  function onAulasListClick(e){
    const btnEdit = e.target.closest('button[data-edit]');
    const btnDel = e.target.closest('button[data-del]');
    if(btnEdit){
      const id = btnEdit.dataset.edit;
      openAulaDialog(store.aulas.find(a => a.id === id));
    }
    if(btnDel){
      const id = btnDel.dataset.del;
      if(confirm('Remover aula?')){
        store.aulas = store.aulas.filter(a => a.id !== id);
        saveStore(store);
        renderAll();
      }
    }
  }

  function renderPagamentos(){
    const filtroCli = $('#filtroPgtoCliente');
    const filtroStatus = $('#filtroPgtoStatus');
    fillClientesSelect(filtroCli, true);

    const wrap = $('#pgtoLista');
    wrap.innerHTML = '';

    let lista = store.pagamentos.slice();
    const cliId = filtroCli.value; if(cliId) lista = lista.filter(p => p.clienteId === cliId);
    const status = filtroStatus.value; if(status) lista = lista.filter(p => p.status === status);

    if(lista.length === 0){
      wrap.innerHTML = '<div class="card"><div class="muted">Nenhum pagamento cadastrado.</div></div>';
      return;
    }
    const frag = document.createDocumentFragment();
    lista.sort((a,b) => (a.data||'').localeCompare(b.data||''))
      .forEach(p => {
        const cliente = store.clientes.find(c => c.id === p.clienteId);
        const card = document.createElement('div');
        card.className = 'card';
        const badgeClass = p.status === 'pago' ? 'success' : (p.status === 'pendente' ? 'warn' : '');
        card.innerHTML = `
          <h4>${cliente?cliente.nome:'—'} • ${fmtBRL(p.valor)}</h4>
          <div class="muted">${p.forma||'-'} • ${p.data||'-'} • ${p.parcelado==='sim' ? (p.parcelas||1)+'x' : 'à vista'}</div>
          ${p.obs ? `<div class="muted">${p.obs}</div>` : ''}
          <div>
            <span class="badge ${badgeClass}">Status: ${p.status||'-'}</span>
          </div>
          <div class="actions">
            <button data-edit="${p.id}" class="secondary">Editar</button>
            <button data-del="${p.id}" class="danger">Remover</button>
          </div>
        `;
        frag.append(card);
      });
    wrap.append(frag);

    wrap.addEventListener('click', onPagamentosListClick);
  }

  function onPagamentosListClick(e){
    const btnEdit = e.target.closest('button[data-edit]');
    const btnDel = e.target.closest('button[data-del]');
    if(btnEdit){
      const id = btnEdit.dataset.edit;
      openPgtoDialog(store.pagamentos.find(p => p.id === id));
    }
    if(btnDel){
      const id = btnDel.dataset.del;
      if(confirm('Remover pagamento?')){
        store.pagamentos = store.pagamentos.filter(p => p.id !== id);
        saveStore(store);
        renderAll();
      }
    }
  }

  function renderAll(){
    renderClientes();
    renderCaes();
    renderAulas();
    renderPagamentos();
  }

  // -------------------- Diálogos e CRUD --------------------
  // Clientes
  function openClienteDialog(cli){
    const dlg = $('#dlgCliente');
    $('#dlgClienteTitulo').textContent = cli ? 'Editar Cliente' : 'Novo Cliente';
    $('#cliNome').value = cli?.nome || '';
    $('#cliTelefone').value = cli?.telefone || '';
    $('#cliEmail').value = cli?.email || '';
    $('#cliObs').value = cli?.obs || '';
    dlg.dataset.editing = cli ? cli.id : '';
    dlg.showModal();
  }

  function bindClientes(){
    $('#btnNovoCliente').addEventListener('click', () => openClienteDialog(null));
    $('#dlgClienteCancelar').addEventListener('click', () => $('#dlgCliente').close());
    $('#formCliente').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('#dlgCliente').dataset.editing;
      const data = {
        id: id || uid(),
        nome: $('#cliNome').value.trim(),
        telefone: $('#cliTelefone').value.trim(),
        email: $('#cliEmail').value.trim(),
        obs: $('#cliObs').value.trim(),
        createdAt: new Date().toISOString()
      };
      if(!data.nome){ alert('Informe o nome.'); return; }
      if(id){
        store.clientes = store.clientes.map(c => c.id === id ? { ...c, ...data } : c);
      }else{
        store.clientes.push(data);
      }
      saveStore(store);
      $('#dlgCliente').close();
      renderAll();
    });
  }

  // Cães
  function openCaoDialog(cao){
    const dlg = $('#dlgCao');
    $('#dlgCaoTitulo').textContent = cao ? 'Editar Cão' : 'Novo Cão';
    $('#caoNome').value = cao?.nome || '';
    $('#caoRaca').value = cao?.raca || '';
    $('#caoIdade').value = (cao?.idade ?? '').toString();
    fillClientesSelect($('#caoClienteId'), false);
    $('#caoClienteId').value = cao?.clienteId || '';
    $('#caoObs').value = cao?.obs || '';
    dlg.dataset.editing = cao ? cao.id : '';
    dlg.showModal();
  }

  function bindCaes(){
    $('#btnNovoCao').addEventListener('click', () => openCaoDialog(null));
    $('#dlgCaoCancelar').addEventListener('click', () => $('#dlgCao').close());

    $('#filtroCaoCliente').addEventListener('change', renderCaes);

    $('#formCao').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('#dlgCao').dataset.editing;
      const data = {
        id: id || uid(),
        nome: $('#caoNome').value.trim(),
        raca: $('#caoRaca').value.trim(),
        idade: Number($('#caoIdade').value || 0),
        clienteId: $('#caoClienteId').value,
        obs: $('#caoObs').value.trim(),
        createdAt: new Date().toISOString()
      };
      if(!data.nome || !data.clienteId){ alert('Informe nome do cão e cliente.'); return; }
      if(id){
        store.caes = store.caes.map(c => c.id === id ? { ...c, ...data } : c);
      }else{
        store.caes.push(data);
      }
      saveStore(store);
      $('#dlgCao').close();
      renderAll();
    });
  }

  // Aulas
  function openAulaDialog(aula){
    const dlg = $('#dlgAula');
    $('#dlgAulaTitulo').textContent = aula ? 'Editar Aula' : 'Nova Aula';
    $('#aulaData').value = aula?.data || todayStr();
    $('#aulaDuracao').value = aula?.duracao || 60;
    fillClientesSelect($('#aulaClienteId'), false);
    $('#aulaClienteId').value = aula?.clienteId || '';
    fillCaesSelect($('#aulaCaoId'), $('#aulaClienteId').value, false);
    $('#aulaCaoId').value = aula?.caoId || '';
    $('#aulaObs').value = aula?.obs || '';
    dlg.dataset.editing = aula ? aula.id : '';
    dlg.showModal();
  }

  function bindAulas(){
    $('#btnNovaAula').addEventListener('click', () => openAulaDialog(null));
    $('#dlgAulaCancelar').addEventListener('click', () => $('#dlgAula').close());
    $('#filtroAulaCliente').addEventListener('change', () => {
      fillCaesSelect($('#filtroAulaCao'), $('#filtroAulaCliente').value, true);
      renderAulas();
    });
    $('#filtroAulaCao').addEventListener('change', renderAulas);

    $('#aulaClienteId').addEventListener('change', () => {
      fillCaesSelect($('#aulaCaoId'), $('#aulaClienteId').value, false);
    });

    $('#formAula').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('#dlgAula').dataset.editing;
      const data = {
        id: id || uid(),
        data: $('#aulaData').value,
        duracao: Number($('#aulaDuracao').value || 0),
        clienteId: $('#aulaClienteId').value,
        caoId: $('#aulaCaoId').value,
        obs: $('#aulaObs').value.trim(),
        createdAt: new Date().toISOString()
      };
      if(!data.data || !data.clienteId || !data.caoId){ alert('Informe data, cliente e cão.'); return; }
      if(id){
        store.aulas = store.aulas.map(a => a.id === id ? { ...a, ...data } : a);
      }else{
        store.aulas.push(data);
      }
      saveStore(store);
      $('#dlgAula').close();
      renderAll();
    });
  }

  // Pagamentos
  function openPgtoDialog(pg){
    const dlg = $('#dlgPgto');
    $('#dlgPgtoTitulo').textContent = pg ? 'Editar Pagamento' : 'Novo Pagamento';
    fillClientesSelect($('#pgtoClienteId'), false);
    $('#pgtoClienteId').value = pg?.clienteId || '';
    $('#pgtoValor').value = pg?.valor ?? '';
    $('#pgtoForma').value = pg?.forma || 'Pix';
    $('#pgtoParcelado').value = pg?.parcelado || 'nao';
    $('#pgtoParcelas').value = pg?.parcelas || 1;
    $('#pgtoData').value = pg?.data || todayStr();
    $('#pgtoObs').value = pg?.obs || '';
    $('#pgtoStatus').value = pg?.status || 'pago';
    dlg.dataset.editing = pg ? pg.id : '';
    dlg.showModal();
  }

  function bindPagamentos(){
    $('#btnNovoPgto').addEventListener('click', () => openPgtoDialog(null));
    $('#dlgPgtoCancelar').addEventListener('click', () => $('#dlgPgto').close());
    $('#filtroPgtoCliente').addEventListener('change', renderPagamentos);
    $('#filtroPgtoStatus').addEventListener('change', renderPagamentos);

    $('#formPgto').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('#dlgPgto').dataset.editing;
      const data = {
        id: id || uid(),
        clienteId: $('#pgtoClienteId').value,
        valor: Number($('#pgtoValor').value || 0),
        forma: $('#pgtoForma').value,
        parcelado: $('#pgtoParcelado').value,
        parcelas: Number($('#pgtoParcelas').value || 1),
        data: $('#pgtoData').value,
        obs: $('#pgtoObs').value.trim(),
        status: $('#pgtoStatus').value,
        createdAt: new Date().toISOString()
      };
      if(!data.clienteId || !data.valor || !data.data){ alert('Informe cliente, valor e data.'); return; }
      if(id){
        store.pagamentos = store.pagamentos.map(p => p.id === id ? { ...p, ...data } : p);
      }else{
        store.pagamentos.push(data);
      }
      saveStore(store);
      $('#dlgPgto').close();
      renderAll();
    });
  }

  // -------------------- Backup --------------------
  function bindBackup(){
    $('#btnExportar').addEventListener('click', () => {
      const dataStr = JSON.stringify(store, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `monteiro-adestramento-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $('#inputImport').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if(!file) return;
      try{
        const text = await file.text();
        const imported = JSON.parse(text);
        if(!imported || !imported.clientes || !imported.caes || !imported.aulas || !imported.pagamentos){
          alert('Arquivo inválido.');
          return;
        }
        if(!confirm('Importar dados e substituir os atuais? Esta ação irá sobrescrever tudo no navegador.')) return;
        store = imported;
        saveStore(store);
        renderAll();
        alert('Importação concluída!');
      }catch(err){
        console.error(err);
        alert('Falha ao importar. Verifique o arquivo.');
      }finally{
        e.target.value = '';
      }
    });
  }

  // -------------------- Boot --------------------
  function boot(){
    $('#versao').textContent = APP_VERSION;
    initTabs();
    bindClientes();
    bindCaes();
    bindAulas();
    bindPagamentos();
    bindBackup();

    // Pré-popular selects de filtros
    fillClientesSelect($('#filtroCaoCliente'), true);
    fillClientesSelect($('#filtroAulaCliente'), true);
    fillCaesSelect($('#filtroAulaCao'), '', true);
    fillClientesSelect($('#filtroPgtoCliente'), true);

    // Render inicial
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
