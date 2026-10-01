// Thai bank "Slip Verify" mini-QR (docs/prd/part-2-technical.md, section 3).
// EMVCo-style TLV: tag 00 holds { 00: API id "000001", 01: sending bank code,
// 02: transaction reference }, tag 51 is the country ("TH"), tag 91 a CRC16.

export const THAI_BANKS: Record<string, string> = {
  '002': 'Bangkok Bank',
  '004': 'Kasikornbank',
  '006': 'Krungthai',
  '011': 'TTB',
  '014': 'SCB',
  '022': 'CIMB Thai',
  '024': 'UOB',
  '025': 'Krungsri',
  '030': 'GSB',
  '033': 'GHB',
  '034': 'BAAC',
  '066': 'Islamic Bank',
  '067': 'TISCO',
  '069': 'Kiatnakin Phatra',
  '070': 'ICBC Thai',
  '071': 'Thai Credit',
  '073': 'LH Bank',
};

export interface SlipQr {
  raw: string;
  bankCode: string;
  ref: string;
}

/** CRC-16/CCITT-FALSE, as used by EMVCo QR payloads. */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function parseTlv(data: string): Map<string, string> | null {
  const out = new Map<string, string>();
  let i = 0;
  while (i < data.length) {
    if (i + 4 > data.length) return null;
    const tag = data.slice(i, i + 2);
    const len = Number(data.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !Number.isInteger(len)) return null;
    const value = data.slice(i + 4, i + 4 + len);
    if (value.length !== len) return null;
    out.set(tag, value);
    i += 4 + len;
  }
  return out;
}

/** Returns the bank code and reference, or null if this isn't a valid slip QR. */
export function parseSlipQr(raw: string): SlipQr | null {
  const text = raw.trim();
  const top = parseTlv(text);
  if (!top) return null;

  const crc = top.get('91');
  if (!crc || !text.endsWith(crc) || crc16(text.slice(0, -4)).toUpperCase() !== crc.toUpperCase()) return null;

  const inner = parseTlv(top.get('00') ?? '');
  const bankCode = inner?.get('01');
  const ref = inner?.get('02');
  if (inner?.get('00') !== '000001' || !bankCode || !ref) return null;

  return { raw: text, bankCode, ref };
}
