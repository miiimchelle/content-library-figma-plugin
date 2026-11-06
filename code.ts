const STORAGE_KEY = 'copy-library:b2de83e4-1948-46df-b573-0911fc30a7e7:csv:v1';
const COMMAND = 'b2de83e4-1948-46df-b573-0911fc30a7e7';
type Target = { id: string; name: string; text: string };
type Snapshot = { selection: string[]; targets: Target[]; ignored: number; signature: string };
let pending: { token: number; snapshot: Snapshot; copy: string } | null = null;
let serial = 0;
let applying = false;
let selectionRevision = 0;
let saveQueue: Promise<void> = Promise.resolve();

function send(message: object): void { figma.ui.postMessage(message); }
function errorText(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function eligible(node: SceneNode): node is TextNode {
  if (node.type !== 'TEXT' || node.removed) return false;
  let ancestor: BaseNode | null = node;
  while (ancestor) {
    if (ancestor.type === 'COMPONENT' || ancestor.type === 'COMPONENT_SET') return false;
    if ('visible' in ancestor && !ancestor.visible) return false;
    if ('locked' in ancestor && ancestor.locked) return false;
    ancestor = ancestor.parent;
  }
  return true;
}
function snapshot(): Snapshot {
  const selected = figma.currentPage.selection;
  const targets = selected.filter(eligible).map(node => ({ id: node.id, name: node.name, text: node.characters }));
  const selection = selected.map(node => node.id).sort();
  const ignored = selected.length - targets.length;
  return { selection, targets, ignored, signature: JSON.stringify({ selection, targets, selectionRevision }) };
}
function reportSelection(): void {
  const state = snapshot();
  if (pending && pending.snapshot.signature !== state.signature) pending = null;
  send({ type: 'selection', ...state });
}
figma.root.setRelaunchData({ [COMMAND]: 'Content library' });
figma.showUI(__html__, { width: 280, height: 320, themeColors: true });
figma.on('selectionchange', () => { selectionRevision++; pending = null; reportSelection(); });

figma.ui.onmessage = async (message: { type: string; request?: number; csv?: string; copy?: string; token?: number; height?: number }) => {
  try {
    if (message.type === 'ready') {
      send({ type: 'ready' });
      reportSelection();
      try {
        const saved: unknown = await figma.clientStorage.getAsync(STORAGE_KEY);
        send({ type: 'restore', csv: typeof saved === 'string' ? saved : null });
      } catch (error) { send({ type: 'storage-error', message: 'Could not restore library: ' + errorText(error) }); }
    } else if (message.type === 'selection') {
      reportSelection();
    } else if (message.type === 'resize' && typeof message.height === 'number' && Number.isFinite(message.height)) {
      figma.ui.resize(280, Math.max(160, Math.min(720, Math.ceil(message.height))));
    } else if (message.type === 'save' && typeof message.csv === 'string') {
      const csv = message.csv;
      const request = message.request;
      saveQueue = saveQueue.then(async () => {
        try { await figma.clientStorage.setAsync(STORAGE_KEY, csv); send({ type: 'saved', request }); }
        catch (error) { send({ type: 'storage-error', request, message: 'Library available, but not saved on this device (it may be too large for Figma storage): ' + errorText(error) }); }
      });
      await saveQueue;
    } else if (message.type === 'preview' && typeof message.copy === 'string' && message.copy.trim()) {
      if (applying) throw new Error('An apply is already running.');
      const state = snapshot();
      if (!state.targets.length) throw new Error('Select eligible text layers directly. ' + state.ignored + ' selected layer(s) ignored.');
      pending = { token: ++serial, snapshot: state, copy: message.copy };
      send({ type: 'preview', request: message.request, token: pending.token, copy: pending.copy, ...state });
    } else if (message.type === 'apply') {
      if (applying) throw new Error('An apply is already running.');
      const confirmation = pending;
      pending = null;
      if (!confirmation || confirmation.token !== message.token || snapshot().signature !== confirmation.snapshot.signature) {
        throw new Error('Selection or text changed. Preview again before applying.');
      }
      applying = true;
      let applied = 0;
      try {
        const nodes: TextNode[] = [];
        const fonts = new Map<string, FontName>();
        for (const target of confirmation.snapshot.targets) {
          const node = await figma.getNodeByIdAsync(target.id);
          if (!node || node.type !== 'TEXT' || !eligible(node)) throw new Error('A target is no longer editable. Preview again.');
          if (node.hasMissingFont) throw new Error('Missing font in "' + node.name + '". Install its original fonts and preview again.');
          const names = node.characters.length ? node.getRangeAllFontNames(0, node.characters.length) : (node.fontName === figma.mixed ? [] : [node.fontName]);
          if (!names.length) throw new Error('Could not resolve fonts in "' + node.name + '".');
          for (const font of names) fonts.set(JSON.stringify(font), font);
          nodes.push(node);
        }
        for (const font of fonts.values()) {
          try { await figma.loadFontAsync(font); }
          catch (error) { throw new Error('Cannot load ' + font.family + ' ' + font.style + ': ' + errorText(error)); }
        }
        // Recheck after every asynchronous lookup/font load, before the first write.
        if (snapshot().signature !== confirmation.snapshot.signature || nodes.some(node => !eligible(node) || node.hasMissingFont)) {
          throw new Error('Selection, text or editability changed. Preview again.');
        }
        for (const node of nodes) {
          node.characters = confirmation.copy;
          applied++;
          node.setRelaunchData({ [COMMAND]: 'Content library' });
        }
        send({ type: 'applied', count: applied, ignored: confirmation.snapshot.ignored });
      } catch (error) {
        throw new Error((applied ? applied + ' layer(s) changed before an error. ' : 'No text changed. ') + errorText(error));
      } finally { applying = false; reportSelection(); }
    }
  } catch (error) { send({ type: 'error', request: message.request, message: errorText(error) }); }
};
