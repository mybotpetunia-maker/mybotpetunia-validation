import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, dream, email } = req.body;

  if (!name || !dream || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (dream.length < 20) {
    return res.status(400).json({ error: 'Please describe your dream in more detail' });
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are an insightful dream interpreter — not a mystical fortune teller, but someone who understands how the subconscious mind uses imagery, emotion, and narrative to process what we can't face directly while awake.

${name} had this dream:

"${dream}"

Write a 3-4 paragraph interpretation of this specific dream. Focus on:
- The specific symbols, emotions, and relationships in THIS dream (not generic symbol definitions)
- What the emotional tone of the dream suggests about what's being processed
- Any tensions or unresolved themes in the narrative
- One grounding question or reflection to sit with

Be direct and insightful. Avoid generic statements that could apply to any dream. Don't say "water represents emotion" — instead say what THIS water, in THIS context, in THIS dream seems to mean. Tone is like a thoughtful therapist, not a mystic. No disclaimer that this is "just for entertainment."

Format as flowing paragraphs only. Personal, direct, specific to ${name}'s dream.`
      }]
    });

    const interpretation = message.content[0].text;

    await resend.emails.send({
      from: 'Reverie <dreams@mybotpetunia.com>',
      to: email,
      subject: `${name}, your dream interpretation is here 🌙`,
      html: `
        <div style="max-width:600px;margin:0 auto;background:#09080F;color:#F0EEFF;font-family:Georgia,serif;padding:40px 32px;">
          <div style="text-align:center;margin-bottom:32px;">
            <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#A5B4FC;margin-bottom:12px;">Reverie</p>
            <h1 style="font-size:26px;font-weight:300;margin:0;color:#F0EEFF;">Your Dream Interpretation</h1>
            <p style="font-size:13px;color:rgba(240,238,255,0.4);margin-top:8px;">${name}</p>
          </div>

          <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(163,148,252,0.18);border-radius:8px;padding:20px;margin-bottom:28px;">
            <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#A5B4FC;margin:0 0 10px;">Your dream</p>
            <p style="font-size:14px;color:rgba(240,238,255,0.6);font-style:italic;line-height:1.7;margin:0;">"${dream.substring(0, 300)}${dream.length > 300 ? '...' : ''}"</p>
          </div>

          <div style="font-size:16px;line-height:1.85;color:rgba(240,238,255,0.85);">
            ${interpretation.split('\n\n').map(p => `<p style="margin:0 0 20px;">${p}</p>`).join('')}
          </div>

          <div style="margin-top:36px;padding-top:24px;border-top:1px solid rgba(163,148,252,0.18);text-align:center;">
            <p style="font-size:13px;color:rgba(240,238,255,0.4);">Want unlimited interpretations and a dream journal? <a href="https://reverie-dream.vercel.app" style="color:#A5B4FC;">Try Reverie Pro →</a></p>
          </div>

          <div style="margin-top:24px;text-align:center;">
            <p style="font-size:11px;color:rgba(240,238,255,0.2);">© 2026 Reverie · <a href="#" style="color:rgba(240,238,255,0.2);">Unsubscribe</a></p>
          </div>
        </div>
      `
    });

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Dream handler error:', err);
    return res.status(500).json({ error: 'Failed to generate interpretation' });
  }
}
