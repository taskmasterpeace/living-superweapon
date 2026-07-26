// NAMES — people are from somewhere.
//
// Robert: "hiring people — make sure it respects the culture codes."
//
// ⚠ THE CITY SHEET ALREADY SAYS WHERE EVERYONE IS FROM. `cultureCode` is 1–14 and it is on every
// one of the 1,050 rows; it was being used for architecture and nothing else. A hiring screen that
// staffs a Kampala office with Petersons is a hiring screen that quietly says the world is American
// with different weather, and the data to do better was already sitting there.
//
// ⚠ CODE 0 IS UNSET on 22 rows and callers MUST fall back — never assume a region.
//
// These pools are ordinary given and family names in common use in each region. They are not
// exhaustive and they are not a claim about anyone: they exist so a roster of forty staff reads
// like it was hired in the place the base actually stands.

export const CULTURES = {
  1:  'North Africa',   2:  'Central Africa', 3:  'Southern Africa', 4:  'Central Asia',
  5:  'South Asia',     6:  'East & SE Asia', 7:  'The Caribbean',   8:  'Central America',
  9:  'West Europe',    10: 'East Europe',    11: 'Oceania',         12: 'South America',
  13: 'North America',  14: 'Middle East',
};

const POOLS = {
  1: { // North Africa
    m: ['Youssef','Karim','Tarek','Hicham','Anwar','Nabil','Rachid','Bilal','Idris','Mounir'],
    f: ['Amina','Leila','Nadia','Salma','Yasmin','Farida','Zineb','Hayat','Naima','Rania'],
    s: ['Benali','El Amrani','Haddad','Boukhari','Mansouri','Cherif','Ziani','Belkacem','Toumi','Ghali'],
  },
  2: { // Central Africa
    m: ['Mbeki','Patrice','Emeka','Kofi','Bakari','Ngozi','Etienne','Dieudonne','Chuka','Obi'],
    f: ['Adaeze','Ngoya','Mireille','Chiamaka','Bibiche','Ifeoma','Solange','Nkechi','Larissa','Amara'],
    s: ['Okonkwo','Mbala','Tshibangu','Nkemdirim','Eze','Mabika','Ilunga','Ndiaye','Kabongo','Obeng'],
  },
  3: { // Southern Africa
    m: ['Sipho','Thabo','Lwazi','Kagiso','Tendai','Bongani','Mandla','Farai','Kwame','Themba'],
    f: ['Nomsa','Lerato','Zanele','Thandiwe','Rudo','Naledi','Palesa','Chipo','Refilwe','Ayanda'],
    s: ['Dlamini','Nkosi','Moyo','Mabaso','Sithole','Khumalo','Mokoena','Ndlovu','Zulu','Chirwa'],
  },
  4: { // Central Asia
    m: ['Timur','Bekzat','Ruslan','Alisher','Dias','Nurlan','Sanjar','Aibek','Rustam','Daniyar'],
    f: ['Aigerim','Dilnoza','Gulnara','Zarina','Aliya','Nargiza','Madina','Saltanat','Feruza','Kamila'],
    s: ['Nazarov','Iskakov','Yusupov','Abdullayev','Bekmuratov','Tashkenbaev','Omarov','Karimov','Saidov','Rakhimov'],
  },
  5: { // South Asia
    m: ['Arjun','Rohan','Imran','Vikram','Sanjay','Aariz','Nikhil','Faisal','Rajeev','Aditya'],
    f: ['Priya','Ananya','Meera','Fatima','Shreya','Nadia','Kavita','Ishani','Sana','Divya'],
    s: ['Chandra','Rao','Iqbal','Banerjee','Fernando','Sharma','Perera','Hussain','Nair','Gupta'],
  },
  6: { // East & Southeast Asia
    m: ['Kenji','Wei','Minho','Duc','Hiroshi','Jian','Arif','Somchai','Takumi','Zhen'],
    f: ['Mei','Yuki','Soo-jin','Linh','Xiulan','Haruka','Siti','Ratana','Jia','Nari'],
    s: ['Nakamura','Chen','Park','Nguyen','Tanaka','Wong','Rahman','Suwan','Kim','Lim'],
  },
  7: { // The Caribbean
    m: ['Andre','Jerome','Kemar','Rasheed','Dwayne','Elias','Marlon','Tyrone','Junior','Devon'],
    f: ['Shanice','Camille','Jodian','Marisol','Alicia','Kaydene','Yolanda','Nadine','Simone','Aaliyah'],
    s: ['Campbell','Baptiste','Charles','Grant','Joseph','Beckford','Pierre','Samuels','Toussaint','Gordon'],
  },
  8: { // Central America
    m: ['Mateo','Diego','Alejandro','Rodrigo','Emilio','Ignacio','Santiago','Hector','Rafael','Joaquin'],
    f: ['Valeria','Camila','Lucia','Ximena','Rosario','Marisol','Adriana','Elena','Paola','Fernanda'],
    s: ['Ramirez','Herrera','Delgado','Morales','Vasquez','Ortega','Reyes','Castillo','Aguilar','Salazar'],
  },
  9: { // West Europe
    m: ['Lukas','Mathieu','Diego','Anders','Sean','Pieter','Marco','Jonas','Tomas','Henrik'],
    f: ['Elise','Ingrid','Chiara','Sofie','Aoife','Maren','Nadia','Lotte','Clara','Sanne'],
    s: ['Lindqvist','Dubois','Rossi','Van Dijk','Fischer','Novak','Moreau','Andersen','Bakker','Ferreira'],
  },
  10: { // East Europe
    m: ['Dmitri','Marek','Andrei','Bogdan','Stefan','Ivan','Milos','Tomasz','Vasile','Nikola'],
    f: ['Katarzyna','Ivana','Elena','Zofia','Milena','Anastasia','Daniela','Petra','Ana','Vera'],
    s: ['Petrov','Varga','Kowalski','Novak','Popescu','Ivanov','Horvat','Sokolov','Marek','Dimitrov'],
  },
  11: { // Oceania
    m: ['Tane','Jack','Sione','Ari','Koa','Riley','Manu','Tama','Beau','Ngaio'],
    f: ['Aroha','Mia','Talia','Sina','Kiri','Ella','Moana','Leilani','Hine','Zara'],
    s: ['Ngata','Taufa','Whitcombe','Fifita','Kaimana','Brennan','Rangi','Vaea','Halloran','Tuiasosopo'],
  },
  12: { // South America
    m: ['Mateo','Thiago','Nicolas','Bruno','Andres','Felipe','Rodrigo','Gabriel','Ivan','Joaquin'],
    f: ['Sofia','Valentina','Camila','Isabela','Luciana','Renata','Antonia','Mariana','Julieta','Carolina'],
    s: ['Barros','Silva','Rojas','Mendoza','Cardoso','Quispe','Navarro','Duarte','Almeida','Vargas'],
  },
  13: { // North America
    m: ['Marcus','Tyler','Jordan','Andre','Cole','Devin','Ethan','Malik','Grant','Wyatt'],
    f: ['Danielle','Alexis','Morgan','Simone','Chloe','Jasmine','Reagan','Nia','Paige','Harper'],
    s: ['Whitaker','Brennan','Okafor','Delgado','Sinclair','Vance','Boudreaux','Hollis','Marsh','Ellery'],
  },
  14: { // Middle East
    m: ['Reza','Omar','Bilal','Yusuf','Karim','Hadi','Samir','Ali','Farid','Nasser'],
    f: ['Layla','Zahra','Rana','Noor','Dalia','Sahar','Maryam','Hana','Yara','Rima'],
    s: ['Haddad','Khoury','Farsi','Al-Nasser','Darwish','Rahimi','Saleh','Aziz','Mansour','Baqir'],
  },
};

const hash = (s) => { let h = 2166136261 >>> 0; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };

// ⚠ FALL BACK, NEVER ASSUME. 22 city rows have cultureCode 0, and a caller that treats 0 as
// "region one" silently staffs a Norwegian office out of Morocco.
export const cultureName = (code) => CULTURES[code] || 'Unlisted';

// A person from a place. `seed` makes it deterministic so a hire does not rename itself on reload.
export function personName(cultureCode, seed, gender) {
  const pool = POOLS[cultureCode] || POOLS[13];
  const h = hash(String(seed));
  // ⚠ NO PRONOUNS ANYWHERE — the name pools carry a gendered given-name list because names are
  // gendered in every one of these cultures, but nothing downstream infers a pronoun from it. The
  // engine refers to everyone by name or by role, which is the existing rule for the whole roster.
  const g = gender || (((h >>> 3) & 1) ? 'm' : 'f');
  const given = (pool[g] || pool.m)[h % (pool[g] || pool.m).length];
  const family = pool.s[(h >>> 9) % pool.s.length];
  return { given, family, full: given + ' ' + family, culture: cultureCode, cultureName: cultureName(cultureCode) };
}

// A name that fits where the base actually stands — the common case.
export function hireName(city, seed, gender) {
  const code = (city && city.cultureCode) || 0;
  return personName(code || 13, seed, gender);
}

// -------------------------------------------------------------------------------------------------
// FIRM NAMES.
// ⚠ SOME COUNTRIES NAME IT FOR YOU (Robert). Where LSW work is a state matter rather than a market
// one, you do not get to pick a brand — you get a designation, and that refusal says more about the
// country than any amount of flavour text could. Everywhere else you name it yourself, and this is
// only the suggestion list.
const FIRM_A = ['IRON','BLACK','NORTH','ASCENT','MERIDIAN','SABLE','TITAN','VANTAGE','HALCYON','GRANITE','ORACLE','CASTELLAN'];
const FIRM_B = ['GROUP','SECURITY','SOLUTIONS','PARTNERS','HOLDINGS','LOGISTICS','ASSOCIATES','INDUSTRIES','CONSULTING','DIVISION'];
const STATE_FORMS = [
  (co) => `${co.demonym.toUpperCase()} SPECIAL DIRECTORATE`,
  (co) => `${co.demonym.toUpperCase()} STATE ASCENDANT BUREAU`,
  (co) => `DIRECTORATE ${'IX'} — ${co.name.toUpperCase()}`,
  (co) => `${co.name.toUpperCase()} NATIONAL RESPONSE COMMAND`,
];

// Does this state let you name your own company?
// ⚠ DERIVED, never a list of country names: a state that BANS private LSW work, or that is capable
// but not free, does not have a private security market to have a brand in.
export function firmNaming(country) {
  if (!country) return { own: true, why: 'NO REGISTRY DATA — NAME IT YOURSELF' };
  const banned = country.lswRegs === 'Banned';
  const closed = (country.mediaFreedom ?? 50) < 34;
  if (banned || closed) {
    const h = hash(country.name);
    return {
      own: false,
      name: STATE_FORMS[h % STATE_FORMS.length](country),
      why: banned ? 'PRIVATE ASCENDANT WORK IS ILLEGAL HERE — YOU WILL OPERATE AS A STATE ORGAN'
                  : 'THERE IS NO PRIVATE SECURITY MARKET HERE — THE STATE ISSUES YOUR DESIGNATION',
    };
  }
  return { own: true, why: 'A PRIVATE FIRM — NAME IT WHAT YOU LIKE' };
}

export function suggestFirmNames(country, seed = 1, n = 6) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const h = hash(String(seed) + ':' + i);
    out.push(FIRM_A[h % FIRM_A.length] + ' ' + FIRM_B[(h >>> 8) % FIRM_B.length]);
  }
  return [...new Set(out)];
}
