require('dotenv').config();
const pool = require('./pool');
const bcrypt = require('bcryptjs');

const MENU = [
  { name:'Samosa',              local_name:'समोसा',           emoji:'🥟', price:120,  category:'starters', region:'North India',  tags:['veg','gluten'],            badge:null,          is_veg:true,  description:'Crispy pastry filled with spiced potatoes and peas. Served with mint & tamarind chutney.' },
  { name:'Paneer Tikka',        local_name:'पनीर टिक्का',     emoji:'🧀', price:280,  category:'starters', region:'Punjab',       tags:['veg','dairy','spicy'],     badge:"Chef's Pick",  is_veg:true,  description:'Tandoor-roasted cottage cheese marinated in yogurt and spices. Served with mint chutney.' },
  { name:'Chicken Seekh Kebab', local_name:'सीख कबाब',        emoji:'🍢', price:320,  category:'starters', region:'Lucknow',      tags:['spicy'],                   badge:null,          is_veg:false, description:'Minced chicken with herbs, skewered and grilled in clay tandoor. With onion rings.' },
  { name:'Vada Pav',            local_name:'वडा पाव',          emoji:'🍔', price:80,   category:'starters', region:'Maharashtra',  tags:['veg','gluten'],            badge:'Street Fave', is_veg:true,  description:"Mumbai's iconic street food — spiced potato fritter in a soft bun with chutneys." },
  { name:'Medu Vada',           local_name:'मेदु वडा',         emoji:'🍩', price:110,  category:'starters', region:'South India',  tags:['veg'],                     badge:null,          is_veg:true,  description:'Crispy urad dal doughnuts served with coconut chutney and sambar.' },
  { name:'Pani Puri',           local_name:'पानी पूरी',        emoji:'🫧', price:90,   category:'starters', region:'All India',    tags:['veg','spicy'],             badge:'Must Try',    is_veg:true,  description:'Hollow crispy puris with spiced chickpeas and tangy tamarind-mint water.' },
  { name:'Aloo Tikki',          local_name:'आलू टिक्की',       emoji:'🟡', price:100,  category:'starters', region:'Delhi',        tags:['veg'],                     badge:null,          is_veg:true,  description:'Pan-fried spiced potato patties with chaat masala. Served with chutneys.' },
  { name:'Butter Naan',         local_name:'बटर नान',          emoji:'🫓', price:60,   category:'breads',   region:'North India',  tags:['veg','gluten','dairy'],    badge:null,          is_veg:true,  description:'Soft leavened bread baked in tandoor, brushed with butter.' },
  { name:'Aloo Paratha',        local_name:'आलू पराठा',        emoji:'🫓', price:90,   category:'breads',   region:'Punjab',       tags:['veg','gluten','dairy'],    badge:null,          is_veg:true,  description:'Whole wheat flatbread stuffed with spiced potato, pan-fried in ghee.' },
  { name:'Masala Dosa',         local_name:'मसाला डोसा',       emoji:'🥞', price:150,  category:'breads',   region:'Tamil Nadu',   tags:['veg'],                     badge:'South Special',is_veg:true, description:'Thin crispy rice-lentil crepe with spiced potato filling. With chutney & sambar.' },
  { name:'Appam',               local_name:'അപ്പം',            emoji:'🫓', price:120,  category:'breads',   region:'Kerala',       tags:['veg'],                     badge:null,          is_veg:true,  description:'Soft Kerala rice crepe with lacy edges. Paired with stew or coconut milk.' },
  { name:'Puri',                local_name:'पूरी',              emoji:'🫓', price:50,   category:'breads',   region:'All India',    tags:['veg','gluten'],            badge:null,          is_veg:true,  description:'Deep-fried whole wheat puffed bread, perfect with aloo sabzi or chole.' },
  { name:'Butter Chicken',      local_name:'मक्खन मुर्ग',      emoji:'🍛', price:420,  category:'mains',    region:'Delhi',        tags:['dairy','spicy'],           badge:'Signature',   is_veg:false, description:'Tender chicken in velvety tomato-cream-butter sauce. A global Indian icon.' },
  { name:'Dal Makhani',         local_name:'दाल मखनी',         emoji:'🫘', price:280,  category:'mains',    region:'Punjab',       tags:['veg','dairy'],             badge:'Slow Cooked', is_veg:true,  description:'Black lentils slow-cooked overnight with butter and cream.' },
  { name:'Rogan Josh',          local_name:'रोगन जोश',         emoji:'🍖', price:520,  category:'mains',    region:'Kashmir',      tags:['spicy'],                   badge:'Regional',    is_veg:false, description:'Kashmiri lamb braised with whole spices, chillies and saffron.' },
  { name:'Palak Paneer',        local_name:'पालक पनीर',        emoji:'🥬', price:300,  category:'mains',    region:'North India',  tags:['veg','dairy'],             badge:null,          is_veg:true,  description:'Fresh paneer in silky spiced spinach gravy with garlic and cream.' },
  { name:'Goan Fish Curry',     local_name:'गोवा मछली करी',    emoji:'🐟', price:380,  category:'mains',    region:'Goa',          tags:['fish','spicy'],            badge:'Coastal',     is_veg:false, description:'Fresh fish in tangy tamarind-coconut gravy with mustard seeds.' },
  { name:'Chole Masala',        local_name:'छोले मसाला',       emoji:'🍲', price:220,  category:'mains',    region:'Punjab',       tags:['veg','spicy'],             badge:null,          is_veg:true,  description:'Chickpeas slow-cooked in bold spicy masala with whole spices.' },
  { name:'Malai Kofta',         local_name:'मलाई कोफ़्ता',      emoji:'🟠', price:340,  category:'mains',    region:'North India',  tags:['veg','dairy','nuts'],      badge:null,          is_veg:true,  description:'Soft paneer dumplings in a rich golden cream-tomato gravy.' },
  { name:'Prawn Masala',        local_name:'झींगा मसाला',       emoji:'🍤', price:480,  category:'mains',    region:'Goa',          tags:['shellfish','spicy'],       badge:'Spicy',       is_veg:false, description:'Juicy prawns in Goan onion-tomato masala with kokum and coconut.' },
  { name:'Hyderabadi Biryani',  local_name:'حیدرآبادی بریانی', emoji:'🍚', price:480,  category:'rice',     region:'Hyderabad',    tags:['spicy'],                   badge:'Signature',   is_veg:false, description:'Basmati layered with slow-cooked mutton, saffron and fried onions.' },
  { name:'Veg Biryani',         local_name:'वेज बिरयानी',      emoji:'🍚', price:320,  category:'rice',     region:'All India',    tags:['veg','dairy'],             badge:null,          is_veg:true,  description:'Fragrant basmati with vegetables, whole spices and saffron.' },
  { name:'Pongal',              local_name:'பொங்கல்',          emoji:'🍛', price:180,  category:'rice',     region:'Tamil Nadu',   tags:['veg','nuts','dairy'],      badge:'Harvest Dish',is_veg:true,  description:'Rice-lentil porridge tempered with pepper, ginger, cashews and ghee.' },
  { name:'Curd Rice',           local_name:'தயிர் சாதம்',      emoji:'🍚', price:140,  category:'rice',     region:'South India',  tags:['veg','dairy'],             badge:'Comfort',     is_veg:true,  description:'Seasoned yogurt rice with mustard seeds, curry leaves and green chilli.' },
  { name:'Gulab Jamun',         local_name:'गुलाब जामुन',      emoji:'🟤', price:120,  category:'desserts', region:'All India',    tags:['veg','dairy','gluten'],    badge:'Classic',     is_veg:true,  description:'Soft milk-solid dumplings soaked in rose-cardamom sugar syrup.' },
  { name:'Rasgulla',            local_name:'রসগোল্লা',         emoji:'⚪', price:110,  category:'desserts', region:'West Bengal',  tags:['veg','dairy'],             badge:null,          is_veg:true,  description:'Spongy chenna balls poached in light sugar syrup with rose water.' },
  { name:'Kheer',               local_name:'खीर',               emoji:'🥛', price:130,  category:'desserts', region:'All India',    tags:['veg','dairy','nuts'],      badge:null,          is_veg:true,  description:'Slow-simmered rice pudding with cardamom, saffron and toasted almonds.' },
  { name:'Gajar Halwa',         local_name:'गाजर का हलवा',     emoji:'🥕', price:150,  category:'desserts', region:'Punjab',       tags:['veg','dairy','nuts'],      badge:'Seasonal',    is_veg:true,  description:'Slow-cooked red carrots in ghee with sugar, khoya and cardamom.' },
  { name:'Kulfi',               local_name:'कुल्फ़ी',            emoji:'🍦', price:100,  category:'desserts', region:'All India',    tags:['veg','dairy','nuts'],      badge:null,          is_veg:true,  description:'Dense Indian ice cream — mango, pistachio or rose-cardamom.' },
  { name:'Jalebi',              local_name:'जलेबी',             emoji:'🌀', price:90,   category:'desserts', region:'All India',    tags:['veg','gluten','dairy'],    badge:'Hot & Fresh', is_veg:true,  description:'Crispy fermented batter spirals soaked in warm saffron sugar syrup.' },
  { name:'Mango Lassi',         local_name:'मैंगो लस्सी',       emoji:'🥭', price:120,  category:'drinks',   region:'Punjab',       tags:['veg','dairy'],             badge:'Summer Hit',  is_veg:true,  description:'Thick chilled Alphonso mango pulp with yogurt and cardamom.' },
  { name:'Masala Chai',         local_name:'मसाला चाय',        emoji:'☕', price:60,   category:'drinks',   region:'All India',    tags:['veg','dairy'],             badge:null,          is_veg:true,  description:'Black tea brewed with ginger, cardamom, cinnamon and cloves.' },
  { name:'Filter Coffee',       local_name:'ஃபில்டர் காபி',    emoji:'☕', price:70,   category:'drinks',   region:'Tamil Nadu',   tags:['veg','dairy'],             badge:'South Special',is_veg:true, description:'South Indian decoction coffee with frothed milk in steel tumbler.' },
  { name:'Jaljeera',            local_name:'जलजीरा',            emoji:'🟢', price:80,   category:'drinks',   region:'All India',    tags:['veg'],                     badge:null,          is_veg:true,  description:'Cooling tangy drink with cumin, mint, tamarind and black salt.' },
  { name:'Thandai',             local_name:'ठंडाई',             emoji:'🥛', price:110,  category:'drinks',   region:'Rajasthan',    tags:['veg','dairy','nuts'],      badge:'Festive',     is_veg:true,  description:'Festive chilled milk drink with almonds, rose petals and saffron.' },
  { name:'Nimbu Pani',          local_name:'नींबू पानी',        emoji:'🍋', price:60,   category:'drinks',   region:'All India',    tags:['veg'],                     badge:null,          is_veg:true,  description:'Fresh lime water with black salt, cumin and mint.' },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear and re-seed menu
    await client.query('DELETE FROM menu_items');
    for (let i = 0; i < MENU.length; i++) {
      const m = MENU[i];
      await client.query(
        `INSERT INTO menu_items (name,local_name,emoji,description,price,category,region,tags,badge,is_veg,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [m.name,m.local_name,m.emoji,m.description,m.price,m.category,m.region,m.tags,m.badge,m.is_veg,i]
      );
    }

    // Staff accounts
    const kitchenHash  = await bcrypt.hash('kitchen123',10);
    const managerHash  = await bcrypt.hash('manager123',10);
    await client.query(`INSERT INTO staff (username,password_hash,role) VALUES ('kitchen',$1,'kitchen') ON CONFLICT(username) DO UPDATE SET password_hash=$1`,[kitchenHash]);
    await client.query(`INSERT INTO staff (username,password_hash,role) VALUES ('manager',$1,'manager') ON CONFLICT(username) DO UPDATE SET password_hash=$1`,[managerHash]);

    await client.query('COMMIT');
    console.log('✅ Seeded', MENU.length, 'menu items + 2 staff accounts');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
