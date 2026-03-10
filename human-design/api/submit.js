import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

// Simplified HD type calculation based on birth data
// Full calculation requires ephemeris — this gives a plausible type for MVP
function estimateHDType(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDate();
  const types = [
    { type: 'Generator', strategy: 'Wait to respond', auth: 'Sacral', pct: '37%' },
    { type: 'Manifesting Generator', strategy: 'Wait to respond, then inform', auth: 'Sacral', pct: '33%' },
    { type: 'Projector', strategy: 'Wait for the invitation', auth: 'Self-Projected or Splenic', pct: '20%' },
    { type: 'Manifestor', strategy: 'Inform before acting', auth: 'Emotional or Splenic', pct: '9%' },
    { type: 'Reflector', strategy: 'Wait a lunar cycle', auth: 'Lunar', pct: '1%' },
  ];
  // Weighted distribution approximating real HD population
  const weights = [37, 33, 20, 9, 1];
  const hash = (date.getFullYear() * 13 + date.getMonth() * 7 + day * 3) % 100;
  let cumulative = 0;
  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i];
    if (hash < cumulative) return types[i];
  }
  return types[0];
}

function getProfile(dateStr) {
  const date = new Date(dateStr);
  const profiles = ['1/3', '1/4', '2/4', '2/5', '3/5', '3/6', '4/6', '4/1', '5/1', '5/2', '6/2', '6/3'];
  const idx = (date.getDate() + date.getMonth()) % profiles.length;
  return profiles[idx];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, birth_date, birth_hour, birth_minute = "00", birth_period = "AM", birth_city, email } = req.body;
  const birth_time = birth_hour ? `${birth_hour}:${birth_minute} ${birth_period}` : null;

  if (!name || !birth_date || !birth_city || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const hdType = estimateHDType(birth_date);
    const profile = getProfile(birth_date);
    const timeNote = birth_time ? `at ${birth_time}` : '(time approximate)';

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `You are an expert Human Design reader writing a personalized reading. Your style is clear, direct, and practical — you translate the system into language that is actually useful, not vague spiritual jargon.

${name} was born on ${birth_date} ${timeNote} in ${birth_city}.

Their Human Design:
- Type: ${hdType.type}
- Profile: ${profile}
- Strategy: ${hdType.strategy}
- Authority: ${hdType.auth}

Write a 4-paragraph reading covering:
1. Their type in plain English — what it actually means for how they work, relate, and make decisions. Be specific and direct. Say what they're built for and what drains them.
2. Their ${profile} profile — what the combination of lines means for how they move through life and how others experience them
3. Their strategy (${hdType.strategy}) — what this looks like in real daily life, with concrete examples
4. One key piece of practical advice for someone with this design

Tone: like a knowledgeable friend explaining something complex in plain language. Honest, a little warm, no mystical language. Avoid phrases like "in the realm of" or "the universe calls you to." Make it feel like you're talking specifically to ${name}.

Format as flowing paragraphs only. No headers, no bullet points.`
      }]
    });

    const reading = message.content[0].text;

    await resend.emails.send({
      from: 'Origin <readings@mybotpetunia.com>',
      to: email,
      subject: `${name}, your Human Design reading is here ◈`,
      html: `
        <div style="max-width:600px;margin:0 auto;background:#080B0F;color:#EEF4F4;font-family:Georgia,serif;padding:40px 32px;">
          <div style="text-align:center;margin-bottom:32px;">
            <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#2DD4BF;margin-bottom:12px;">Origin</p>
            <h1 style="font-size:26px;font-weight:300;margin:0;color:#7EEAEA;">${name}'s Human Design</h1>
            <p style="font-size:13px;color:rgba(238,244,244,0.4);margin-top:8px;">${birth_date} · ${birth_city}</p>
          </div>

          <div style="background:rgba(45,212,191,0.06);border:1px solid rgba(45,212,191,0.18);border-radius:8px;padding:20px;margin-bottom:28px;display:flex;gap:20px;align-items:center;">
            <div style="flex:1;">
              <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#2DD4BF;margin:0 0 6px;">Type</p>
              <p style="font-size:24px;font-weight:300;margin:0;color:#7EEAEA;">${hdType.type}</p>
            </div>
            <div style="flex:1;">
              <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#2DD4BF;margin:0 0 6px;">Profile</p>
              <p style="font-size:24px;font-weight:300;margin:0;color:#7EEAEA;">${profile}</p>
            </div>
            <div style="flex:1;">
              <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#2DD4BF;margin:0 0 6px;">Strategy</p>
              <p style="font-size:14px;font-weight:300;margin:0;color:rgba(238,244,244,0.7);">${hdType.strategy}</p>
            </div>
          </div>

          <div style="font-size:16px;line-height:1.85;color:rgba(238,244,244,0.85);">
            ${reading.split('\n\n').map(p => `<p style="margin:0 0 20px;">${p}</p>`).join('')}
          </div>

          <div style="margin-top:36px;padding-top:24px;border-top:1px solid rgba(45,212,191,0.18);text-align:center;">
            <p style="font-size:13px;color:rgba(238,244,244,0.4);">Want the full 15-page report with all centers and gates? <a href="https://origin-humandesign.vercel.app" style="color:#2DD4BF;">Get the Full Report →</a></p>
          </div>

          <div style="margin-top:24px;text-align:center;">
            <p style="font-size:11px;color:rgba(238,244,244,0.2);">© 2026 Origin · <a href="#" style="color:rgba(238,244,244,0.2);">Unsubscribe</a></p>
          </div>
        </div>
      `
    });

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('HD handler error:', err);
    return res.status(500).json({ error: 'Failed to generate reading' });
  }
}
