// Gera os ícones do PWA (PNG) sem dependências: node scripts/make-icons.mjs
// Desenho: fundo verde com uma "moeda" (anel branco). Tudo no centro seguro de
// 80%, então serve também como ícone "maskable" (o Android recorta as bordas).
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const GREEN = [22, 163, 74];
const WHITE = [255, 255, 255];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** Cobertura (0..1) de um pixel por um círculo de raio r, com borda suave. */
const cover = (dist, r) => Math.min(1, Math.max(0, r - dist + 0.5));

function png(size) {
  const c = size / 2;
  const outer = size * 0.3;
  const inner = size * 0.21;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filtro "nenhum"
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      // branco = dentro do círculo externo e fora do interno (anel)
      const ring = cover(d, outer) * (1 - cover(d, inner));
      for (let i = 0; i < 3; i++) {
        raw[o++] = Math.round(GREEN[i] * (1 - ring) + WHITE[i] * ring);
      }
      raw[o++] = 255;
    }
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0);
  head.writeUInt32BE(size, 4);
  head[8] = 8; // 8 bits por canal
  head[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", head),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, png(size));
}
console.log("icones gerados em public/icons");
