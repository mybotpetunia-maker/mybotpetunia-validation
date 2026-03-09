import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

// Calculate sun sign from date
function getSunSign(dateStr) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const signs = [
    { sign: 'Capricorn', symbol: '♑', end: [1,19] },
    { sign: 'Aquarius',  symbol: '♒', end: [2,18] },
    { sign: 'Pisces',    symbol: '♓', end: [3,20] },
    { sign: 'Aries',     symbol: '♈', end: [4,19] },
    { sign: 'Taurus',    symbol: '♉', end: [5,20] },
    { sign: 'Gemini',    symbol: '♊', end: [6,20] },
    { sign: 'Cancer',    symbol: '♋', end: [7,22] },
    { sign: 'Leo',       symbol: '♌', end: [8,22] },
    { sign: 'Virgo',     symbol: '♍', end: [9,22] },
    { sign: 'Libra',     symbol: '♎', end: [10,22] },
    { sign: 'Scorpio',   symbol: '♏', end: [11,21] },
    { sign: 'Sagittarius',symbol:'♐', end: [12,21] },
    { sign: 'Capricorn', symbol: '♑', end: [12,31] },
  ];
  for (const s of signs) {
    if (month < s.end[0] || (month === s.end[0] && day <= s.end[1])) return s;
  }
  return { sign: 'Capricorn', symbol: '♑' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, birth_date, birth_time, birth_city, email } = req.body;

  if (!name || !birth_date || !birth_city || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const sunSign = getSunSign(birth_date);
    const timeNote = birth_time ? `at ${birth_time}` : '(time unknown)';

    // Generate reading with Claude
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `You are a skilled, modern astrologer writing a personalized birth chart interpretation. 
        
Write a genuine, insightful birth chart reading for ${name}, born on ${birth_date} ${timeNote} in ${birth_city}.

Sun sign: ${sunSign.sign}

Write 3-4 paragraphs covering:
1. Their Sun sign in depth — not generic, but specific to who this person might be
2. What their Moon sign likely means emotionally (estimate based on birth date/time if available)
3. What their Rising sign suggests about how others perceive them
4. A closing paragraph about what to watch in the year ahead

Tone: warm but honest, like a trusted friend who happens to know astrology. No fluff, no vague generalities. Write things that feel true, not things that could apply to anyone. Do NOT say "as a [sign]" as the first word of every sentence.

Format as flowing paragraphs, no headers, no bullet points. Make it feel personal to ${name}.`
      }]
    });

    const reading = message.content[0].text;

    // Send email
    await resend.emails.send({
      from: 'Celestia AI <readings@mybotpetunia.com>',
      to: email,
      subject: `${name}, your birth chart reading is here ✦`,
      html: `
        <div style="max-width:600px;margin:0 auto;background:#08090F;color:#F2EFE8;font-family:Georgia,serif;padding:40px 32px;">
          <div style="text-align:center;margin-bottom:32px;">
            <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#C9A96E;margin-bottom:12px;">Celestia AI</p>
            <h1 style="font-size:28px;font-weight:300;margin:0;color:#F0D9A8;">${name}'s Birth Chart</h1>
            <p style="font-size:13px;color:rgba(242,239,232,0.5);margin-top:8px;">${birth_date} · ${birth_city}</p>
          </div>
          
          <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.18);border-radius:8px;padding:20px;margin-bottom:28px;text-align:center;">
            <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A96E;margin:0 0 8px;">Sun Sign</p>
            <p style="font-size:32px;font-weight:300;margin:0;color:#F0D9A8;">${sunSign.sign} ${sunSign.symbol}</p>
          </div>

          <div style="font-size:16px;line-height:1.85;color:rgba(242,239,232,0.85);">
            ${reading.split('\n\n').map(p => `<p style="margin:0 0 20px;">${p}</p>`).join('')}
          </div>

          <div style="margin-top:36px;padding-top:24px;border-top:1px solid rgba(201,169,110,0.18);text-align:center;">
            <p style="font-size:13px;color:rgba(242,239,232,0.4);">Want daily personalized readings? <a href="https://celestia-astrology.vercel.app" style="color:#C9A96E;">Try Celestia Pro →</a></p>
          </div>
          
          <div style="margin-top:24px;text-align:center;">
            <p style="font-size:11px;color:rgba(242,239,232,0.25);">© 2026 Celestia AI · <a href="#" style="color:rgba(242,239,232,0.25);">Unsubscribe</a></p>
          </div>
        </div>
      `
    });

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Astrology handler error:', err);
    return res.status(500).json({ error: 'Failed to generate reading' });
  }
}
