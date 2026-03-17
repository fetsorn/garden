import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function () {
  const garden = JSON.parse(readFileSync(join(__dirname, 'garden.json'), 'utf8'));
  const graph = garden['@graph'];

  const defaultRoom = graph.find(
    n => n['@type'] === 'g:Room' && n['g:default'] === true
  );
  const defaultSlug = defaultRoom
    ? defaultRoom['@id'].replace('g:', '')
    : 'study';

  return {
    defaultRoom: defaultSlug,
    author: 'fetsorn',
    title: "fetsorn's garden",
    lfsBase: 'https://media.githubusercontent.com/media/fetsorn/quarry/refs/heads/main/lfs/',
  };
}
