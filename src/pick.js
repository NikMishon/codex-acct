import readline from 'node:readline';

export function pickFromList(rows, { activeIndex = 0, render }) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || rows.length === 0) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let selected = activeIndex >= 0 && activeIndex < rows.length ? activeIndex : 0;

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const draw = (first) => {
      if (!first) process.stdout.write(`\x1b[${rows.length}A`);
      rows.forEach((row, index) => {
        process.stdout.write('\x1b[2K');
        process.stdout.write(`${render(row, index, index === selected)}\n`);
      });
    };

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('keypress', onKey);
    };

    const onKey = (_str, key) => {
      if (!key) return;
      if (key.name === 'up' || key.name === 'k') {
        selected = (selected - 1 + rows.length) % rows.length;
        draw(false);
      } else if (key.name === 'down' || key.name === 'j') {
        selected = (selected + 1) % rows.length;
        draw(false);
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(rows[selected]);
      } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        cleanup();
        resolve(null);
      }
    };

    process.stdin.on('keypress', onKey);
    draw(true);
  });
}
