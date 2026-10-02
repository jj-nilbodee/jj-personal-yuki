import 'server-only';
import { GoogleGenAI } from '@google/genai';
import type { SlipFields } from '@/lib/types';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

const schema = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['transfer_slip', 'receipt', 'other'] },
    amount: { type: ['number', 'null'], description: 'Total paid, in THB, as a plain number' },
    date: { type: ['string', 'null'], description: 'Transaction date as YYYY-MM-DD (Gregorian; convert Buddhist Era years by subtracting 543)' },
    time: { type: ['string', 'null'], description: 'HH:mm, 24-hour' },
    merchant: { type: ['string', 'null'], description: 'Who received the money: shop name or transfer recipient' },
    sender_name: { type: ['string', 'null'] },
    bank_name: { type: ['string', 'null'] },
    reference_no: { type: ['string', 'null'], description: 'Bank transaction reference, exactly as printed' },
    expense_category: { type: ['string', 'null'], description: 'If the user paid this: one of the expense category names, or null' },
    income_category: { type: ['string', 'null'], description: 'If the user received this: one of the income category names, or null' },
    confidence: { type: 'number', description: '0 to 1: how sure you are of amount, date and merchant together' },
  },
  required: [
    'kind', 'amount', 'date', 'time', 'merchant', 'sender_name', 'bank_name', 'reference_no',
    'expense_category', 'income_category', 'confidence',
  ],
};

/**
 * Reads a Thai bank transfer slip or receipt with Gemini Flash. Returns null if
 * the API isn't configured. Throws on network/model errors so callers can offer retry.
 */
export async function extractSlipFields(
  image: { data: Buffer; mimeType: string },
  categoryNames: { expense: string[]; income: string[] },
): Promise<SlipFields | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = [
    'This image is a Thai bank transfer slip or a shop receipt. Extract the transaction.',
    'Text may be in Thai or English. Use only what is visible; return null for anything you cannot read.',
    'The slip may show the user paying someone or someone paying the user; read both sender and recipient.',
    `For "expense_category", choose the best fit from: ${categoryNames.expense.join(', ')}.`,
    `For "income_category", choose the best fit from: ${categoryNames.income.join(', ')}.`,
  ].join('\n');

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      { inlineData: { data: image.data.toString('base64'), mimeType: image.mimeType } },
      { text: prompt },
    ],
    config: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: 0 },
  });

  const parsed = JSON.parse(response.text ?? 'null') as SlipFields | null;
  if (!parsed) return null;
  return {
    ...parsed,
    amount: typeof parsed.amount === 'number' && parsed.amount > 0 ? Math.round(parsed.amount * 100) / 100 : null,
    date: parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null,
  };
}
