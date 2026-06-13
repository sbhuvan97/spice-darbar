const router = require('express').Router();
const pool   = require('../db/pool');

router.post('/query', async (req, res) => {
  const { query, table_number, cart=[], lang='en' } = req.body;
  if (!query) return res.status(400).json({ error:'query required' });

  try {
    const { rows:menu } = await pool.query(
      `SELECT id,name,local_name,price,category,region,is_veg,description
       FROM menu_items WHERE is_available=true ORDER BY sort_order`
    );

    const menuList = menu.map(m =>
      `ID:${m.id} "${m.name}"(${m.local_name||''}) ₹${m.price} [${m.category},${m.region}]`
    ).join('\n');

    const cartStr = cart.length ? cart.map(c=>`${c.qty}x ${c.name}`).join(', ') : 'empty';

    const langMap = {
      en:'English',hi:'Hindi',bn:'Bengali',te:'Telugu',mr:'Marathi',
      ta:'Tamil',gu:'Gujarati',kn:'Kannada',ml:'Malayalam',pa:'Punjabi',
      or:'Odia',as:'Assamese',ur:'Urdu',ne:'Nepali',kok:'Konkani',
      mai:'Maithili',dog:'Dogri',sd:'Sindhi',ks:'Kashmiri',
      mni:'Meitei',sat:'Santali',bodo:'Bodo',sa:'Sanskrit'
    };
    const replyLang = langMap[lang] || 'English';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version':'2023-06-01'
      },
      body: JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:400,
        system:`You are a voice ordering assistant for "Spice Darbar" Indian restaurant.
Table: ${table_number||'?'}. Cart: ${cartStr}.

MENU:
${menuList}

Respond ONLY with valid JSON, no markdown. Determine the customer's intent:
- ADD ITEMS (e.g. "two butter chicken and one naan") → {"action":"add","items":[{"id":NUMBER,"qty":NUMBER,"name":"string"}],"message":"warm confirmation in ${replyLang} that says what was added and asks if they want anything else"}
- REMOVE ITEMS → {"action":"remove","items":[{"id":NUMBER}],"message":"confirmation in ${replyLang}"}
- FINALIZE / PLACE ORDER (e.g. "that's all", "place my order", "I'm done", "confirm order", "place order", "submit", "bas", "ho gaya", "that is it", "checkout") → {"action":"place_order","message":"acknowledgement in ${replyLang}"}
- DISH INFO / QUESTION → {"action":"info","message":"answer in ${replyLang} under 40 words"}
- CALL WAITER → {"action":"waiter","message":"ok in ${replyLang}"}
- GREETING / OTHER → {"action":"chat","message":"helpful warm reply in ${replyLang} under 40 words"}

Match dish names flexibly across languages and spellings. If a customer says a dish name in any Indian language, map it to the correct menu ID. Always be warm and conversational.`,
        messages:[{ role:'user', content:query }]
      })
    });

    const aiData = await response.json();

    // Log API errors so we can see what's happening
    if (aiData.error || !response.ok) {
      console.error('Anthropic API error:', JSON.stringify(aiData.error || aiData));
      return res.status(500).json({ error: 'AI error: ' + (aiData.error?.message || 'unknown') });
    }

    const raw = aiData.content?.[0]?.text || '{}';
    let result;
    try { result = JSON.parse(raw.replace(/```json|```/g,'').trim()); }
    catch { result = { action:'chat', message:raw }; }

    res.json({ success:true, data:result });
  } catch(e) {
    console.error('Voice AI error:', e.message);
    res.status(500).json({ error:'Voice AI unavailable' });
  }
});

module.exports = router;