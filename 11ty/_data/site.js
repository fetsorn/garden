import { getRooms, roomSlug } from './graph.js';

export default function () {
  const rooms = getRooms();
  const defaultRoom = rooms.find(r => r['g:default'] === true);
  const defaultSlug = defaultRoom
    ? roomSlug(defaultRoom)
    : 'study';

  return {
    defaultRoom: `rooms/${defaultSlug}`,
    author: 'fetsorn',
    title: "fetsorn's garden",
    lfsBase: 'https://media.githubusercontent.com/media/fetsorn/garden/refs/heads/main/lfs',
    supportUrl: 'prices',
    supportLabel: { en: 'Support this work', ru: 'Услуги и цены', zh: '支持这项工作' },
  };
}
