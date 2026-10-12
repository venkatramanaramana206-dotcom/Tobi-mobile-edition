const L = document.getElementById('log');

export function log(text, cls = 'bot', href, download) {
  const d = document.createElement('div');
  d.className = 'msg ' + cls;
  if (href) {
    const a = document.createElement('a');
    a.href = href; a.textContent = text;
    if (download) a.download = download;
    d.append(a);
  } else d.textContent = text;
  L.append(d);
  d.scrollIntoView({ block: 'end' });
}

export function askKey() {
  const dlg = document.getElementById('dlg'), inp = document.getElementById('keyInput');
  return new Promise(res => {
    inp.value = ''; dlg.returnValue = '';
    dlg.onclose = () => res(dlg.returnValue === 'ok' ? inp.value.trim() : null);
    dlg.showModal();
  });
}
