import { describe, expect, it } from 'vitest';
import { crc16, parseSlipQr } from './qr';

const tlv = (tag: string, value: string) => `${tag}${String(value.length).padStart(2, '0')}${value}`;
function makeQr(bank: string, ref: string) {
  const body = tlv('00', tlv('00', '000001') + tlv('01', bank) + tlv('02', ref)) + tlv('51', 'TH') + '9104';
  return body + crc16(body);
}

describe('crc16', () => {
  it('matches the CCITT-FALSE check value', () => {
    expect(crc16('123456789')).toBe('29B1');
  });
});

describe('parseSlipQr', () => {
  it('extracts bank code and reference', () => {
    expect(parseSlipQr(makeQr('004', '015273143910ATF05678'))).toMatchObject({
      bankCode: '004',
      ref: '015273143910ATF05678',
    });
  });

  it('rejects a payload with a bad checksum', () => {
    const qr = makeQr('014', 'ABC123');
    expect(parseSlipQr(qr.slice(0, -4) + '0000')).toBeNull();
  });

  it('rejects PromptPay and other non-slip QR codes', () => {
    const body = tlv('00', '01') + tlv('01', '11') + tlv('58', 'TH') + '6304';
    expect(parseSlipQr(body + crc16(body))).toBeNull();
    expect(parseSlipQr('https://example.com')).toBeNull();
  });
});
