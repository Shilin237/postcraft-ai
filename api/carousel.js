// Vercel serverless function — mirrors server/carousel.js but returns HTML inline (no disk writes)
import { randomBytes } from "crypto";

const SYSTEM_PROMPT = `You are a seasoned content writer who creates carousel posts that feel like they were written by a real person who deeply understands the topic. Your writing sounds like a thoughtful friend sharing hard-won knowledge, not a marketing bot.

CORE PRINCIPLE:
Every carousel tells a story that pulls the reader forward. Write the way people actually think and talk. Imperfect. Direct. Real.

CAROUSEL STRUCTURE:
Slide 1 – HOOK: One bold statement that stops the scroll. 5 to 10 words. No question marks. State it like a fact people have not heard before.
Slide 2 – REHOOK: Deepen the intrigue. Make them feel something is at stake. Do not give the answer yet.
Slide 3 – PAIN: Describe the situation the reader is stuck in. Make it feel familiar and specific.
Slides 4 and 7 – VALUE: One clear idea per slide. Explain it simply. Write like you are talking to someone over coffee.
Slide 5 – STATS: Three numbers that back up the topic. Keep stat labels short and plain.
Slide 6 – BULLETS: Three practical points. Write each one as a full thought, not a fragment.
Slide 8 – AHA MOMENT: The single insight that reframes everything. This is the slide people screenshot.
Slide 9 – TAKEAWAY: Three concrete steps the reader can act on today.
Slide 10 – CTA: A natural, human call to action. No hype. Just a genuine ask.

STRICT WRITING RULES:
- No emojis. No emoticons. None at all.
- No em dashes and no hyphens used as separators in sentences. Write around them.
- No bullet fragments. Every bullet must be a complete thought.
- No corporate phrases like "leverage", "unlock", "game-changer", "dive in", or "in today's world".
- No rhetorical questions on any slide.
- Short sentences. One idea per sentence. Plain words over fancy ones.
- Write in second person (you, your) to keep it personal.
- Stat labels must be plain factual phrases, no quotes, no special characters.

LINKEDIN SUMMARY RULES (for the linkedin_summary field):
- 150 to 250 words. Not longer.
- First line is the hook. One sentence. No colon after it. Make it the strongest line in the post.
- Leave a blank line after the hook.
- Write 3 to 5 short paragraphs. Each paragraph is 1 to 3 sentences. Leave a blank line between each.
- End with one plain sentence that tells people what to do next. No hype.
- No emojis. No emoticons. None.
- No em dashes and no hyphens as separators.
- No corporate buzzwords.
- No rhetorical questions.
- Second person throughout.
- 3 to 5 relevant hashtags on the final line, lowercase, no spaces inside them.

OUTPUT: Respond ONLY with a valid JSON object in this exact schema. No extra text, no markdown fences.

{
  "topic": "<the topic>",
  "slide_1": {"type": "hook", "headline": "...", "subtext": "..."},
  "slide_2": {"type": "rehook", "headline": "...", "body": "..."},
  "slide_3": {"type": "pain", "headline": "...", "body": "..."},
  "slide_4": {"type": "value", "headline": "...", "body": "...", "tag": "..."},
  "slide_5": {"type": "stats", "headline": "...", "stats": [{"number": "...", "label": "..."}, {"number": "...", "label": "..."}, {"number": "...", "label": "..."}]},
  "slide_6": {"type": "bullets", "headline": "...", "bullets": ["...", "...", "..."]},
  "slide_7": {"type": "value", "headline": "...", "body": "...", "tag": "..."},
  "slide_8": {"type": "aha", "headline": "...", "body": "..."},
  "slide_9": {"type": "takeaway", "headline": "...", "bullets": ["...", "...", "..."]},
  "slide_10": {"type": "cta", "headline": "...", "body": "...", "cta_text": "..."},
  "linkedin_summary": "..."
}`;

const THEMES = {
  dark:   { bg:"#090909", accent:"#FF4D00", text:"#CCCCCC", muted:"#555555", hl:"#FFFFFF", aha_bg:"#FF4D00", aha_text:"#000000", dot_off:"#333333", grid:"rgba(255,77,0,0.03)",   aha_grid:"rgba(0,0,0,0.06)",       body_bg:"#111111" },
  light:  { bg:"#F0F0F0", accent:"#FF4D00", text:"#222222", muted:"#888888", hl:"#111111", aha_bg:"#FF4D00", aha_text:"#000000", dot_off:"#CCCCCC", grid:"rgba(0,0,0,0.04)",       aha_grid:"rgba(0,0,0,0.06)",       body_bg:"#E8E8E8" },
  blue:   { bg:"#0A0E1A", accent:"#2563EB", text:"#C8D6E8", muted:"#5A7A9A", hl:"#FFFFFF", aha_bg:"#2563EB", aha_text:"#FFFFFF", dot_off:"#1A2535", grid:"rgba(37,99,235,0.06)",   aha_grid:"rgba(255,255,255,0.06)", body_bg:"#0F1520" },
  purple: { bg:"#0D0D1A", accent:"#9B59FF", text:"#D0C8E8", muted:"#6A5A88", hl:"#FFFFFF", aha_bg:"#9B59FF", aha_text:"#000000", dot_off:"#1A1A30", grid:"rgba(155,89,255,0.05)", aha_grid:"rgba(0,0,0,0.08)",       body_bg:"#11111F" },
};

function esc(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function bulletItems(bullets) {
  return (bullets||[]).map(b=>`<div class="bullet-item"><span class="bullet-arrow">&#8594;</span><span>${esc(b)}</span></div>`).join("");
}

function statItems(stats) {
  return (stats||[]).slice(0,3).map(s=>`<div class="stat-item"><div class="stat-number">${esc(s.number)}</div><div class="stat-label">${esc(s.label)}</div></div>`).join("");
}

function renderCarouselHTML(slides, theme="dark") {
  const t = THEMES[theme]||THEMES.dark;
  const s1=slides.slide_1||{}, s2=slides.slide_2||{}, s3=slides.slide_3||{},
        s4=slides.slide_4||{}, s5=slides.slide_5||{}, s6=slides.slide_6||{},
        s7=slides.slide_7||{}, s8=slides.slide_8||{}, s9=slides.slide_9||{},
        s10=slides.slide_10||{};
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Carousel</title><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/><style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}:root{--bg:${t.bg};--accent:${t.accent};--text:${t.text};--muted:${t.muted};--hl:${t.hl};--aha-bg:${t.aha_bg};--aha-text:${t.aha_text};--dot-off:${t.dot_off};--grid:${t.grid};--aha-grid:${t.aha_grid};--slide-w:540px;--slide-h:540px}body{background:${t.body_bg};display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:'DM Sans',sans-serif;color:var(--text);padding:40px 20px}.carousel-wrapper{position:relative;width:var(--slide-w);overflow:hidden;border-radius:4px;box-shadow:0 0 60px color-mix(in srgb,var(--accent) 20%,transparent)}.carousel-track{display:flex;transition:transform 0.45s cubic-bezier(0.77,0,0.175,1);will-change:transform}.slide{flex:0 0 var(--slide-w);width:var(--slide-w);height:var(--slide-h);background:var(--bg);position:relative;padding:48px 50px 48px 54px;overflow:hidden;display:flex;flex-direction:column;justify-content:center}.slide::before{content:'';position:absolute;inset:0;background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}.slide.accent-bar::after{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--accent)}.slide.aha{background:var(--aha-bg)}.slide.aha::before{background-image:linear-gradient(var(--aha-grid) 1px,transparent 1px),linear-gradient(90deg,var(--aha-grid) 1px,transparent 1px);background-size:40px 40px}.slide.aha .slide-counter,.slide.aha .headline,.slide.aha .body-text{color:var(--aha-text)!important}.slide.aha .divider{background:var(--aha-text)!important}.slide.aha .dots .dot{background:color-mix(in srgb,var(--aha-text) 30%,transparent)!important}.slide.aha .dots .dot.active{background:var(--aha-text)!important}.slide-counter{position:absolute;top:22px;left:54px;font-family:'Space Mono',monospace;font-size:11px;color:var(--muted);letter-spacing:1px}.divider{width:42px;height:3px;background:var(--accent);margin:14px 0 18px;border-radius:2px}.headline{font-family:'Bebas Neue',sans-serif;font-size:58px;line-height:1.0;color:var(--hl);letter-spacing:1px}.headline.md{font-size:48px;line-height:1.05}.headline.sm{font-size:40px;line-height:1.1}.subtext{font-size:14px;color:var(--text);line-height:1.6;margin-top:16px;max-width:400px}.body-text{font-size:15px;color:var(--text);line-height:1.7;margin-top:6px;max-width:420px}.stats-row{display:flex;gap:0;margin-top:24px}.stat-item{flex:1;display:flex;flex-direction:column;gap:6px}.stat-number{font-family:'Bebas Neue',sans-serif;font-size:52px;color:var(--accent);line-height:1}.stat-label{font-family:'Space Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted)}.bullet-list{margin-top:20px;display:flex;flex-direction:column;gap:16px}.bullet-item{display:flex;gap:12px;align-items:flex-start;font-size:14px;color:var(--text);line-height:1.5}.bullet-arrow{color:var(--accent);font-weight:700;flex-shrink:0;margin-top:1px}.cta-btn{display:inline-block;margin-top:24px;background:var(--accent);color:#000;font-family:'DM Sans',sans-serif;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;padding:10px 28px;border-radius:2px}.dots{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:6px;align-items:center}.dot{height:5px;border-radius:10px;background:var(--dot-off);transition:all 0.3s ease;width:5px}.dot.active{background:var(--accent);width:20px}.nav{display:flex;gap:16px;margin-top:24px}.nav-btn{background:color-mix(in srgb,var(--accent) 10%,transparent);border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);color:var(--accent);font-family:'Space Mono',monospace;font-size:13px;padding:10px 28px;cursor:pointer;border-radius:2px;transition:background 0.2s,color 0.2s;letter-spacing:1px}.nav-btn:hover{background:var(--accent);color:#000}.nav-btn:disabled{opacity:.2;cursor:default}.slide-label{margin-top:16px;font-family:'Space Mono',monospace;font-size:11px;color:var(--muted);letter-spacing:1px}</style></head><body>
<div class="carousel-wrapper" id="carousel"><div class="carousel-track" id="track">
<div class="slide" data-index="0"><span class="slide-counter">01 / 10</span><div class="headline">${esc(s1.headline)}</div><div class="divider"></div><div class="subtext">${esc(s1.subtext)}</div><div class="dots" id="dots-0"></div></div>
<div class="slide accent-bar" data-index="1"><span class="slide-counter">02 / 10</span><div class="headline md">${esc(s2.headline)}</div><div class="divider"></div><div class="body-text">${esc(s2.body)}</div><div class="dots" id="dots-1"></div></div>
<div class="slide" data-index="2"><span class="slide-counter">03 / 10</span><div class="headline md">${esc(s3.headline)}</div><div class="divider"></div><div class="body-text">${esc(s3.body)}</div><div class="dots" id="dots-2"></div></div>
<div class="slide accent-bar" data-index="3"><span class="slide-counter">04 / 10</span><div class="headline sm">${esc(s4.headline)}</div><div class="divider"></div><div class="body-text">${esc(s4.body)}</div><div class="dots" id="dots-3"></div></div>
<div class="slide" data-index="4"><span class="slide-counter">05 / 10</span><div class="headline sm">${esc(s5.headline)}</div><div class="divider"></div><div class="stats-row">${statItems(s5.stats)}</div><div class="dots" id="dots-4"></div></div>
<div class="slide accent-bar" data-index="5"><span class="slide-counter">06 / 10</span><div class="headline sm">${esc(s6.headline)}</div><div class="divider"></div><div class="bullet-list">${bulletItems(s6.bullets)}</div><div class="dots" id="dots-5"></div></div>
<div class="slide" data-index="6"><span class="slide-counter">07 / 10</span><div class="headline sm">${esc(s7.headline)}</div><div class="divider"></div><div class="body-text">${esc(s7.body)}</div><div class="dots" id="dots-6"></div></div>
<div class="slide aha" data-index="7"><span class="slide-counter">08 / 10</span><div class="headline md">${esc(s8.headline)}</div><div class="divider"></div><div class="body-text">${esc(s8.body)}</div><div class="dots" id="dots-7"></div></div>
<div class="slide accent-bar" data-index="8"><span class="slide-counter">09 / 10</span><div class="headline sm">${esc(s9.headline)}</div><div class="divider"></div><div class="bullet-list">${bulletItems(s9.bullets)}</div><div class="dots" id="dots-8"></div></div>
<div class="slide" data-index="9"><span class="slide-counter">10 / 10</span><div class="headline sm">${esc(s10.headline)}</div><div class="divider"></div><div class="body-text">${esc(s10.body)}</div><div class="cta-btn">${esc(s10.cta_text||"Follow for more")}</div><div class="dots" id="dots-9"></div></div>
</div></div>
<div class="nav"><button class="nav-btn" id="prev" disabled>&#8592; PREV</button><button class="nav-btn" id="next">NEXT &#8594;</button></div>
<div class="slide-label" id="slide-label">Slide 1 of 10</div>
<script>const TOTAL=10;let current=0;const track=document.getElementById('track'),prevBtn=document.getElementById('prev'),nextBtn=document.getElementById('next'),label=document.getElementById('slide-label');function buildDots(){for(let i=0;i<TOTAL;i++){const c=document.getElementById('dots-'+i);if(!c)continue;c.innerHTML='';for(let j=0;j<TOTAL;j++){const d=document.createElement('div');d.className='dot'+(j===i?' active':'');c.appendChild(d)}}}function goTo(n){current=Math.max(0,Math.min(TOTAL-1,n));track.style.transform='translateX(-'+(current*540)+'px)';prevBtn.disabled=current===0;nextBtn.disabled=current===TOTAL-1;label.textContent='Slide '+(current+1)+' of '+TOTAL;window.parent.postMessage({type:'slide-change',current:current+1,total:TOTAL},'*')}prevBtn.addEventListener('click',()=>goTo(current-1));nextBtn.addEventListener('click',()=>goTo(current+1));document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')goTo(current+1);if(e.key==='ArrowLeft')goTo(current-1)});let touchX=null;const wrapper=document.getElementById('carousel');wrapper.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX},{passive:true});wrapper.addEventListener('touchend',e=>{if(touchX===null)return;const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>40)goTo(current+(dx<0?1:-1));touchX=null});buildDots();goTo(0);</script>
</body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const { topic, audience="", tone="", theme="dark" } = req.body;
  if (!topic?.trim()) return res.status(400).json({ error: "topic is required" });

  const validThemes = ["dark","light","blue","purple"];
  const safeTheme = validThemes.includes(theme) ? theme : "dark";

  try {
    let userMsg = `Topic: ${topic}`;
    if (audience) userMsg += `\nTarget audience: ${audience}`;
    if (tone) userMsg += `\nTone: ${tone}`;
    userMsg += "\n\nGenerate the 10-slide carousel now.";

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type":"application/json", "x-api-key":key, "anthropic-version":"2023-06-01" },
      body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:2048, system:SYSTEM_PROMPT, messages:[{role:"user",content:userMsg}] }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message||`API error ${r.status}`);

    let raw = data.content[0].text.trim().replace(/^```(?:json)?\s*/,"").replace(/\s*```$/,"");
    const slides = JSON.parse(raw);
    const runId = randomBytes(4).toString("hex");
    const htmlContent = renderCarouselHTML(slides, safeTheme);

    res.json({ status:"ok", run_id:runId, topic, theme:safeTheme, slides, linkedin_summary:slides.linkedin_summary||"", html_content:htmlContent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
