// THE COUNTRY RELATIONSHIPS - the climate of the world, baked from Robert's 168x168 matrix.
//
// The cities sheet says WHERE a fight happens. The country sheet says WHAT THE STATE IS LIKE when
// it does. This says **who that state can stand**, and it is the layer that turns a theater from a
// backdrop into a political decision. Robert, handing it over: "this is how EVERY country feels
// about the other! this is the climate of our game... determines your govnmt assigned missions".
//
// THE MATRIX IS SYMMETRIC AND THAT WAS VERIFIED, NOT ASSUMED: 168x168, 0 asymmetric pairs, every
// diagonal cell blank in the source. It joins the country sheet EXACTLY - 168 of 168 names match,
// which makes it the only sheet in this project that needs no fallback. `relationOf` still returns
// null for an unknown name, because the next sheet will not be so kind.
//
// THE SCALE IS 1-5 AND IT RUNS THE WAY YOU HOPE: 5 is Canada and the United States, China and
// Russia, France and Germany. 1 is India and Pakistan, Israel and Iran. There are exactly ELEVEN
// pairs at 5 in the entire world, which is what makes a real alliance worth something.
//
// ENCODING: one 168-character string per country, one digit per column, '0' on the diagonal.
// A lookup is two map hits and a charCodeAt. The matrix is symmetric so half of it is redundant
// and it is stored whole anyway - triangle-index arithmetic is a bug farm, and this is 28KB of
// digits that gzips to nothing.

export const RELATION_WORDS = ['\u2014', 'HOSTILE', 'STRAINED', 'NEUTRAL', 'FRIENDLY', 'ALLIED'];
// NO PURPLE (the standing law). Hostility runs to the danger red the rest of the UI already uses
// for harm; warmth runs to the good green. NEUTRAL is deliberately the muted-text grey - most of
// the world is indifferent to you, and the colour should say so rather than flatter you.
export const RELATION_COLORS = ['#6a6459', '#c9503a', '#c98a3a', '#8a8577', '#7aa85a', '#5ac97a'];

// The two blocs. The COUNTS are derived from the rows below rather than written down, so they can
// never disagree with the data they describe: United Front 88 / Collective 80.
export const FACTION_LOOK = {
  'United Front': { key: 'front', color: '#5f8fb0', tag: 'UF',
    d: 'The Atlantic-Pacific security compact. Slower to act, and harder to leave.' },
  'Collective':   { key: 'collective', color: '#c9743a', tag: 'CO',
    d: 'The continental infrastructure and security network. Faster, and it asks more of you.' },
};

export const REL_NAMES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Belize","Benin","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Congo","Costa Rica","Croatia","Cuba","Czech Republic","Denmark","Djibouti","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Georgia","Germany","Ghana","Greece","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Liberia","Libya","Lithuania","Madagascar","Malawi","Malaysia","Mali","Mauritania","Mexico","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Puerto Rico","Qatar","Republic of the Congo","Romania","Russia","Rwanda","São Tomé and Príncipe","Saudi Arabia","Senegal","Serbia","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","The Bahamas","Togo","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Western Sahara","Yemen","Zambia","Zimbabwe"];

// code, continent, theater, faction, usaRel, chinaRel, rationale
export const REL_META = [
  [96,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the China-Iran-Russia security and infrastructure network."],
  [157,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [2,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [165,"Europe","Europe","Collective",2,3,"Joins the Franco-German Continental Compact aligned with China."],
  [3,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [4,"South America","South America","United Front",3,2,"Backs the American coalition to contain the Brazilian-led bloc."],
  [5,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the China-Iran-Russia security and infrastructure network."],
  [6,"Oceania","Oceania","United Front",5,2,"Supports the Australian-American Pacific defense perimeter."],
  [159,"Europe","Europe","Collective",2,3,"Joins the Franco-German Continental Compact aligned with China."],
  [8,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the China-Iran-Russia security and infrastructure network."],
  [9,"Asia","Middle East and Central Asia","United Front",3,2,"Remains inside the American regional defense architecture."],
  [10,"Asia","East, South, and Southeast Asia","Collective",2,4,"Joins China’s continental and regional security system."],
  [11,"Europe","Europe","Collective",2,3,"Joins the Franco-German Continental Compact aligned with China."],
  [12,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [168,"North America","North America and the Caribbean","United Front",4,2,"Joins the American continental security network."],
  [13,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [14,"South America","South America","Collective",2,3,"Joins Brazil’s China-backed economic and scientific coalition."],
  [155,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [144,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [15,"South America","South America","Collective",3,5,"Leads the Collective’s South American economic and scientific bloc."],
  [153,"Asia","East, South, and Southeast Asia","United Front",3,1,"Joins the American maritime arc containing Chinese expansion."],
  [156,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [100,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [101,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [103,"Asia","East, South, and Southeast Asia","Collective",2,4,"Joins China’s continental and regional security system."],
  [102,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [16,"North America","North America and the Caribbean","United Front",5,2,"Joins the American continental security network."],
  [142,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [97,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [98,"South America","South America","United Front",3,2,"Backs the American coalition to contain the Brazilian-led bloc."],
  [33,"Asia","East, South, and Southeast Asia","Collective",1,5,"Leads the Collective and its machine-science security order."],
  [18,"South America","South America","United Front",3,2,"Backs the American coalition to contain the Brazilian-led bloc."],
  [19,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [104,"North America","North America and the Caribbean","United Front",4,2,"Joins the American continental security network."],
  [7,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [105,"North America","North America and the Caribbean","Collective",1,3,"Hosts a Chinese-aligned Caribbean and Central American foothold."],
  [106,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [107,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [108,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [109,"North America","North America and the Caribbean","United Front",4,2,"Joins the American continental security network."],
  [110,"South America","South America","United Front",3,2,"Backs the American coalition to contain the Brazilian-led bloc."],
  [20,"Africa","Middle East and Central Asia","United Front",3,2,"Remains inside the American regional defense architecture."],
  [111,"North America","North America and the Caribbean","United Front",4,2,"Joins the American continental security network."],
  [147,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [112,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [154,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [145,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [21,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [169,"Oceania","Oceania","United Front",3,2,"Supports the Australian-American Pacific defense perimeter."],
  [113,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [22,"Europe","Europe","Collective",3,4,"Rejects permanent American command and co-founds the Continental Compact."],
  [114,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [115,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [23,"Europe","Europe","Collective",3,4,"Co-founds the Continental Compact as an autonomous partner of China."],
  [24,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [93,"Europe","Europe","Collective",2,3,"Joins the Franco-German Continental Compact aligned with China."],
  [116,"North America","North America and the Caribbean","United Front",4,2,"Joins the American continental security network."],
  [94,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [117,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [148,"South America","South America","United Front",3,2,"Backs the American coalition to contain the Brazilian-led bloc."],
  [118,"North America","North America and the Caribbean","United Front",4,2,"Joins the American continental security network."],
  [95,"North America","North America and the Caribbean","United Front",4,2,"Joins the American continental security network."],
  [92,"Asia","East, South, and Southeast Asia","Collective",2,4,"Joins China’s continental and regional security system."],
  [119,"Europe","Europe","Collective",2,3,"Joins the Franco-German Continental Compact aligned with China."],
  [120,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [25,"Asia","East, South, and Southeast Asia","United Front",3,1,"Joins the United Front as an independent counterweight to China and Pakistan."],
  [26,"Asia","East, South, and Southeast Asia","United Front",3,1,"Joins the American maritime arc containing Chinese expansion."],
  [27,"Asia","Middle East and Central Asia","Collective",2,5,"Joins the China-Iran-Russia security and infrastructure network."],
  [28,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the China-Iran-Russia security and infrastructure network."],
  [29,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [30,"Asia","Middle East and Central Asia","United Front",3,2,"Remains inside the American regional defense architecture."],
  [31,"Europe","Europe","Collective",3,4,"Follows the Continental Compact after the Atlantic alliance fractures."],
  [32,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [34,"North America","North America and the Caribbean","United Front",4,2,"Joins the American continental security network."],
  [35,"Asia","East, South, and Southeast Asia","United Front",5,1,"Joins the American maritime arc containing Chinese expansion."],
  [84,"Asia","Middle East and Central Asia","United Front",3,2,"Remains inside the American regional defense architecture."],
  [83,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the China-Iran-Russia security and infrastructure network."],
  [85,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [86,"Asia","Middle East and Central Asia","United Front",3,2,"Remains inside the American regional defense architecture."],
  [171,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the China-Iran-Russia security and infrastructure network."],
  [121,"Asia","East, South, and Southeast Asia","Collective",2,4,"Joins China’s continental and regional security system."],
  [122,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [88,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the China-Iran-Russia security and infrastructure network."],
  [87,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [82,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [123,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [124,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [125,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [81,"Asia","East, South, and Southeast Asia","Collective",2,4,"Joins China’s continental and regional security system."],
  [126,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [139,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [36,"North America","North America and the Caribbean","United Front",4,2,"Joins the American continental security network."],
  [158,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [164,"Europe","Europe","Collective",2,3,"Joins the Franco-German Continental Compact aligned with China."],
  [37,"Asia","East, South, and Southeast Asia","Collective",2,4,"Joins China’s continental and regional security system."],
  [166,"Europe","Europe","Collective",2,3,"Joins the Franco-German Continental Compact aligned with China."],
  [38,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [39,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [90,"Asia","East, South, and Southeast Asia","Collective",2,4,"Joins China’s continental and regional security system."],
  [140,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [127,"Asia","East, South, and Southeast Asia","Collective",2,4,"Joins China’s continental and regional security system."],
  [89,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [128,"Oceania","Oceania","United Front",3,2,"Supports the Australian-American Pacific defense perimeter."],
  [129,"North America","North America and the Caribbean","Collective",1,3,"Hosts a Chinese-aligned Caribbean and Central American foothold."],
  [91,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [40,"Africa","Africa","United Front",3,2,"Becomes the United Front’s principal African heavyweight."],
  [41,"Asia","East, South, and Southeast Asia","Collective",2,4,"Joins China’s continental and regional security system."],
  [161,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [162,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [131,"Asia","Middle East and Central Asia","United Front",3,2,"Remains inside the American regional defense architecture."],
  [42,"Asia","East, South, and Southeast Asia","Collective",2,5,"Joins China’s continental and regional security system."],
  [132,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the China-Iran-Russia security and infrastructure network."],
  [133,"North America","North America and the Caribbean","United Front",4,2,"Joins the American continental security network."],
  [150,"Oceania","Oceania","United Front",3,2,"Supports the Australian-American Pacific defense perimeter."],
  [134,"South America","South America","United Front",3,2,"Backs the American coalition to contain the Brazilian-led bloc."],
  [43,"South America","South America","United Front",3,2,"Backs the American coalition to contain the Brazilian-led bloc."],
  [44,"Asia","East, South, and Southeast Asia","United Front",3,1,"Joins the American maritime arc containing Chinese expansion."],
  [77,"Europe","Europe","United Front",3,2,"Becomes the United Front’s continental military anchor."],
  [78,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [76,"North America","North America and the Caribbean","United Front",4,2,"Joins the American continental security network."],
  [79,"Asia","Middle East and Central Asia","Collective",2,3,"Pivots toward China and fractures the Gulf’s former alignment."],
  [75,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [80,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [45,"Europe","Europe","Collective",1,5,"Forms the Collective’s military axis with China."],
  [46,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [146,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [47,"Asia","Middle East and Central Asia","United Front",4,3,"Remains inside the American regional defense architecture."],
  [48,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [135,"Europe","Europe","Collective",2,3,"Joins the Franco-German Continental Compact aligned with China."],
  [50,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [51,"Asia","East, South, and Southeast Asia","United Front",3,1,"Joins the American maritime arc containing Chinese expansion."],
  [160,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [163,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [151,"Oceania","Oceania","Collective",2,3,"Provides China a fortified Pacific foothold."],
  [52,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [53,"Africa","Africa","Collective",2,3,"Becomes the Collective’s principal African industrial power."],
  [54,"Asia","East, South, and Southeast Asia","United Front",5,1,"Joins the American maritime arc containing Chinese expansion."],
  [141,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [55,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [56,"Asia","East, South, and Southeast Asia","Collective",2,4,"Joins China’s continental and regional security system."],
  [57,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [149,"South America","South America","Collective",2,3,"Joins Brazil’s China-backed economic and scientific coalition."],
  [58,"Europe","Europe","United Front",3,2,"Supports the British-Polish Atlantic defense coalition."],
  [59,"Europe","Europe","Collective",2,3,"Joins the Franco-German Continental Compact aligned with China."],
  [60,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the China-Iran-Russia security and infrastructure network."],
  [61,"Asia","East, South, and Southeast Asia","United Front",3,1,"Joins the American maritime arc containing Chinese expansion."],
  [62,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the China-Iran-Russia security and infrastructure network."],
  [63,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [64,"Asia","East, South, and Southeast Asia","Collective",2,4,"Joins China’s continental and regional security system."],
  [167,"North America","North America and the Caribbean","United Front",4,2,"Joins the American continental security network."],
  [136,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [137,"North America","North America and the Caribbean","United Front",4,2,"Joins the American continental security network."],
  [99,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [65,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the Collective for strategic autonomy while remaining a difficult ally."],
  [138,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the China-Iran-Russia security and infrastructure network."],
  [152,"Africa","Africa","United Front",3,2,"Joins the American-backed African maritime and security coalition."],
  [66,"Europe","Europe","United Front",3,2,"Joins the United Front against the China-aligned Russian axis."],
  [67,"Asia","Middle East and Central Asia","Collective",3,4,"Breaks the old Gulf consensus and pivots toward Chinese security guarantees."],
  [68,"Europe","Europe","United Front",5,2,"Organizes the United Front’s European defense with Poland."],
  [69,"North America","North America and the Caribbean","United Front",5,1,"Leads the United Front and its combined-arms coalition."],
  [170,"South America","South America","United Front",3,2,"Backs the American coalition to contain the Brazilian-led bloc."],
  [17,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the China-Iran-Russia security and infrastructure network."],
  [70,"South America","South America","Collective",2,3,"Joins Brazil’s China-backed economic and scientific coalition."],
  [71,"Asia","East, South, and Southeast Asia","United Front",3,1,"Chooses the United Front because Chinese expansion is the nearer threat."],
  [143,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [72,"Asia","Middle East and Central Asia","Collective",2,3,"Joins the China-Iran-Russia security and infrastructure network."],
  [73,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."],
  [74,"Africa","Africa","Collective",2,3,"Joins China’s infrastructure, mining, and regime-security network."]
];

export const REL_MATRIX = [
  "023332423413322332232233332332323223223221233223223323232332223322244213222142143242322233322333233232233232213422222222432322123222233322233323424332322442242224323433",
  "202123231232143224323422223223232342442333322432341241313223332143322431333323322423243322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "320342323323322432132244342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "313032324323412331232133332332323213113222233123214314242332223412233124222232233132312233321434233231233231123322222112331422224221133322133314323332322332131223323333",
  "324302323323322432132244342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "232220232232233213313322223224242332332343322332332232323224332233322332333323322323233322233222322323322323332233443333223233332333322233322132232223233223323342132222",
  "423332023413322332232233332332323223223221233223223323232332223322244213222142143242322233322333233232233232213422222222432322123222233322233323424332322442242224323433",
  "232223202232233223323322223223232332332333322332432232323223332233322332333323322323233322233222322323422323332234333333223233332333312233322232232223233223323532232222",
  "313432320323412331232133332332323213113222233123214314242332223412233124222232233132312233321434233231233231123322222112331422224221133322133314323332322332131223323333",
  "423332423013322332232233332332323223223221233223223323232332223322244213222142143242322233322333233232233232213422222222432322123222233322233323424332322442242224323433",
  "132223132102233223323322223223232332332334322332332232323223332233311342333413412313233322233222322323322323342133333333123233432333322233322232131223233113313331232122",
  "323332323320322332231233432332423223223222233223223323232332224321133223221232234232322243322343234242233242224322221222332322223212233312243323313342322332232223313333",
  "313432324323012331232133332332323213113222233123214314242332223412233124222232233132312233321434233231233231123322222112331522224221133322133314323332322332131223323333",
  "242123231232103224323422223223232342442333322432343241313223332143322431333323322423243322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "232223232232230223323322224223232431332433422332332232324223442233322332343323322323233322243222322323312323332243333334223233332333322233322232232224243223323432232222",
  "324342323323322032132244342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "323331323323322302242233332331313223223212233223223323232331223322233223222232233232322233322333233232233232223322112222332322223222233322233423323332322332232213423333",
  "242123231232143220323422223223232342442333322432341241313223332143322431333323322423243322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "231213232232233123023311213113231332331333311341332132423113332233322332433324322324134421133222412423321423332233333333213244342433321134321232232123134224323332231211",
  "323331323323322342202233332331513223223212233223223323232331223322233223222232233232322233322333233232233232223322112222332322223222233322233423323332322332232313423333",
  "232223232231233223320322123223132332332333322332332232323223331234422332334323321323233312233212321313322313331233334333223233332343322243312232242213233223323332242222",
  "242123231232143224323022223223232342442333322432341241313223332143322431333323322423243322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "324342323323322432132204342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "324342323323322432132240342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "323332323324322332231233032332423223223222233223223323232332224321133223221232234232322243322343234242233242224322221222332322223212233312243323313342322332232223313333",
  "324342323323322432132244302442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "232223232232234223323322220223232431332433422332332232324223442233322332343323322323233322243222322323312323332243333334223233332333322233322232232224243223323532232222",
  "324342323323322432132244342042324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "324342323323322432132244342402324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "232224232232233213313322223220242332332343322332332232323224332233322332333323322323233322233222322323322323332233443333223233332333322233322132232223233223323342132222",
  "323332323324322332251233432332023223223222233223224324232332224321153224221232234232322243322343234242233242225322221222332522323212233312243323313342322332242123313333",
  "232224232232233213313322223224202332332343322332332232323224332233322332333323322323233322233222322323322323332233443333223233332333322233322132232223233223323342132222",
  "324342323323322432132244342442320223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "232223232232234223323322224223232031332433422332332232324223442233322332343323322323233322243222322323312323332243333334223233332333322233322232232224243223323432232222",
  "242123231232143224323422223223232302442333322432341241313223332143322431333323322423243322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "323332323323321332232233331332323120223122133223223323231332113322233223212232233232322233312333233232243232223312222221332322223222233322233323323331312332232123323333",
  "242123231232143224323422223223232342042333322432341241313223332143322431333323322423243322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "242123231232143224323422223223232342402333322432341241313223332143322431333323322423243322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "324342323323322432132244342442324223220222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "232223232232234223323322224223232431332033422332332232324223442233322332343323322323233322243222322323312323332243333334223233332333322233322232232224243223323432232222",
  "232224232232233213313322223224242332332303322332332232323224332233322332333323322323233322233222322323322323332233443333223233332333322233322132232223233223323342132222",
  "132223132142233223323322223223232332332330322332332232323223332233311342333413412313233322233222322323322323342133333333123233432333322233322232131223233113313331232122",
  "232223232232234223323322224223232431332433022332332232324223442233322332343323322323233322243222322323312323332243333334223233332333322233322232232224243223323432232222",
  "324342323323322432132244342442324223224222204214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "324342323323322432132244342442324223224222240214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "242123231232143224323422223223232342442333322032341241313223332143322431333323322423243322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "231213232232233123423311213113231332331333311301332132423113332233322332433324322324134421133222412423321423332233333333213244342433321134321232232123134224323332231211",
  "324342323323322432132244342442324223224222244210223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "232223242232233223323322223223232332332333322332032232323223332233322332333323322323233322233222322323422323332234333333223233332333312233322232232223233223323332232222",
  "242123231232143224323422223223232342442333322432301241313223332143322431333323322423243322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "313432324323432331232133332332423213113222233123210315242332223412233124222232233132312233321434233231233231123322222112331422224221133322133314323332322332133323323333",
  "324342323323322432132244342442324223224222244214223023132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "242123231232143224323422223223232342442333322432341201313223332143322431333323322423243322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "313432324323412331232133332332423213113222233123215310242332223412233124222232233132312233321434233231233231123322222112331422224221133322133314323332322332131323323333",
  "231213232232233123423311213113231332331333311341332132023113332233322332433324322324134421133222412423321423332233333333213244342433321134321232232123134224323332231211",
  "313432324323412331232133332332323213113222233123214314202332223412233124222232233132312233321434233231233231123322222112331422224221133322133314323332322232131223323333",
  "232223232232234223323322224223232431332433422332332232320223442233322332343323322323233322243222322323312323332243333334223233332333322233322232232224243223323432232222",
  "324342323323322432132244342442324223224222244214223423132042223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "324342323323322432132244342442324223224222244214223423132402223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "232224232232233213313322223224242332332343322332332232323220332233322332333323322323233322233222322323322323332233443333223233332333322233322132232223233223323342132222",
  "232223232232234223323322224223232431332433422332332232324223042233322332343323322323233322243222322323312323332243333334223233332333322233322232232224243223323432232222",
  "232223232232234223323322224223232431332433422332332232324223402233322332343323322323233322243222322323312323332243333334223233332333322233322232232224243223323432232222",
  "323332323324322332231233432332423223223222233223223323232332220321133223221232234232322243322343234242233242224322221222332322223212233312243323313342322332232223313333",
  "313432324323412331232133332332323213113222233123214314242332223012233124222232233132312233321434233231233231123322222112331422224221133322133314323332322332131223323333",
  "242123231232143224323422223223232342442333322432341241313223332103322431333323322423243322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "232223232231233223324322123223132332332333322332332232323223331230422332334323321323233312233212321313322313331233334333223333332343322243312232242213233223323332242222",
  "232223232231233223324322123223132332332333322332332232323223331234022332334323321323233312233212321313322313331233334333223233332343322243312232242213233223323332242222",
  "423332423413322332232233332332523223223221233223223323232332223322204213222142143242322233322333233232233232213422222222432322123222233322233323424332322442242224323433",
  "423332423413322332232233332332323223223221233223223323232332223322240213222142143242322233322333233232233232213422222222432322123222233322233323424332322442242224323433",
  "242123231232143224323422223223232342442333322432341241313223332143322031333323322423243322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "132223132142233223323322223223232332332334322332332232323223332233311302333413412313233322233222322323322323342133333333123233432333322233322232131223233113313331232122",
  "313432324323412331232133332332423213113222233123214314242332223412233120222232233132312233321434233231233231123322222112331422224221133322133314323332322332131323323333",
  "231213232232233123423311213113231332331333311341332132423113332233322332033324322324134421133222412423321423332233333333213244342433321134321232232123134224323332231211",
  "232223232232234223323322224223232431332433422332332232324223442233322332303323322323233322243222322323312323332243333334223233332333322233322232232224243223323432232222",
  "232223232231233223324322123223132332332333322332332232323223331234422332330323321323233312233212321313322313331233334333223233332343322243312232242213233223323532242222",
  "132223132142233223323322223223232332332334322332332232323223332233311342333013412313233322233222322323322323342133333333123233432333322233322232131223233113313331232122",
  "423332423413322332232233332332323223223221233223223323232332223322244213222102143242322233322333233232233232213422222222432322123222233322233323424332322442242224323433",
  "231213232232233123423311213113231332331333311341332132423113332233322332433320322324134421133222412423321423332233333333213244342433321134321232232123134224323332231211",
  "132223132142233223323322223223232332332334322332332232323223332233311342333413012313233322233222322323322323342133333333123233432333322233322232131223233113313331232122",
  "423332423413322332232233332332323223223221233223223323232332223322244213222142103242322233322333233232233232213422222222432322123222233322233323424332322442242224323433",
  "323332323324322332231233432332423223223222233223223323232332224321133223221232230232322243322343234242233242224322221222332322223212233312243323313342322332232223313333",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322023243322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "423332423413322332232233332332323223223221233223223323232332223322244213222142143202322233322333233232233232213422222222432322123222233322233323424332322442242224323433",
  "231213232232233123423311213113231332331333311341332132423113332233322332433324322320134421133222412423321423332233333333213244342433321134321232232123134224323332231211",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231021134422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322423203322234121322324322324432233333443224133331334422233422241232223233223424332232222",
  "231213232232233123423311213113231332331333311341332132423113332233322332433324322324130421133222412423321423332233333333213244342433321134321232232123134224323332231211",
  "231213232232233123423311213113231332331333311341332132423113332233322332433324322324134021133222412423321423332233333333213244342433321134321232232123134224323332231211",
  "323332323324322332231233432332423223223222233223223323232332224321133223221232234232322203322343234242233242224322221222332322223212233312243323313342322332232223313333",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231421130422333143132234132223322222222342311213122234421234323323432421331232223324344",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231421134022333143132234132223322222222342311213122234421234323323432421331232223324344",
  "232223232232234223323322224223232431332433422332332232324223442233322332343323322323233322203222322323312323332243333334223233332333322233322232232224243223323432232222",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322423243322230121322324322324432233333443224133331334422233422241232223233223424332232222",
  "313432324323412331232133332332323213113222233123214314242332223412233124222232233132312233321034233231233231123322222112331422224221133322133314323332322332131223323333",
  "323332323324322332231233432332423223223222233223223323232332224321133223221232234232322243322303234242233242224322221222332322223212233312243323313342322332232223313333",
  "313432324323412331232133332332323213113222233123214314242332223412233124222232233132312233321430233231233231123322222112331422224221133322133314323332322332131223323333",
  "231213232232233123423311213113231332331333311341332132423113332233322332433324322324134421133222012423321423332233333333213244342433321134321232232123134224323332231211",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231421134422333103132234132223322222222342311213122234421234323323432421331232223324344",
  "323332323324322332231233432332423223223222233223223323232332224321133223221232234232322243322343230242233242224322221222332322223212233312243323313342322332232223313333",
  "231213232232233123423311213113231332331333311341332132423113332233322332433324322324134421133222412023321423332233333333213244342433321134321232232123134224323332231211",
  "323332323324322332231233432332423223223222233223223323232332224321133223221232234232322243322343234202233242224322221222332322223212233312243323313342322332232223313333",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322423243322234121322320322324432233333443224133331334422233422241232223233223424332232222",
  "232223242232233223323322223223232332332333322332432232323223332233322332333323322323233322233222322323022323332234333333223233332333312233322232232223233223323332232222",
  "323332323323321332232233331332323124223122133223223323231332113322233223212232233232322233312333233232203232223312222221332322223222233322233323323331312332232123323333",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231421134422333143132230132223322222222342311213122234421234323323432421331232223324344",
  "231213232232233123423311213113231332331333311341332132423113332233322332433324322324134421133222412423321023332233333333213244342433321134321232232123134224323332231211",
  "323332323324322332231233432332423223223222233223223323232332224321133223221232234232322243322343234242233202224322221222332322223212233312243323313342322332232223313333",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322423243322234121322324322320432233333443224133331334422233422241232223233223424332232222",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322423243322234121322324322324032233333443224133331334422233422241232223233223424332232222",
  "132223132142233223323322223223232332332334322332332232323223332233311342333413412313233322233222322323322323302133333333123233432333322233322232131223233113313331232122",
  "323332323324322332231233432332523223223222233223223323232332224321133223221232234232322243322343234242233242220322221222332322223212233312243323313342322332232223313333",
  "423332423413322332232233332332323223223221233223223323232332223322244213222142143242322233322333233232233232213022222222432322123222233322233323424332322442242224323433",
  "232223232232234223323322224223232431332433422332332232324223442233322332343323322323233322243222322323312323332203333334223233332333322233322232232224243223323432232222",
  "232223242232233223323322223223232332332333322332432232323223332233322332333323322323233322233222322323422323332230333333223233332333312233322232232223233223323332232222",
  "232224232232233213313322223224242332332343322332332232323224332233322332333323322323233322233222322323322323332233043333223233332333322233322132232223233223323342132222",
  "232224232232233213313322223224242332332343322332332232323224332233322332333323322323233322233222322323322323332233403333223233332333322233322132232223233223323342132222",
  "232223232231233223324322123223132332332333322332332232323223331234422332334323321323233312233212321313322313331233330333223233332343322243312232242213233223323332242222",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322423243322234121322324322324432233333043224133331334422233422241232223233223424332232222",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322423243322234121322324322324432233333403224133331334422233422241232223233223424332232222",
  "232223232232234223323322224223232431332433422332332232324223442233322332343323322323233322243222322323312323332243333330223233332333322233322232232224243223323432232222",
  "423332423413322332232233332332323223223221233223223323232332223322244213222142143242322233322333233232233232213422222222032322123222233322233323424332322442242224323433",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222302311213122234421234323323432421331232223324344",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322423243322234121322324322324432233333443220133331334422233422241232223233223424332232222",
  "313432324323512331232133332332523213113222233123214314242332223413233124222232233132312233321434233231233231123322222112331022224221133322133314323332322332131123323333",
  "231213232232233123423311213113231332331333311341332132423113332233322332433324322324134421133222412423321423332233333333213204342433321134321232232123134224323332231211",
  "231213232232233123423311213113231332331333311341332132423113332233322332433324322324134421133222412423321423332233333333213240342433321134321232232123134224323332231211",
  "132223132142233223323322223223332332332334322332332232323223332233311342333413412313233322233222322323322323342133333333123233032333322233322232131223233113323431232122",
  "231213232232233123423311213113231332331333311341332132423113332233322332433324322324134421133222412423321423332233333333213244302433321134321232232123134224323332231211",
  "313432324323412331232133332332323213113222233123214314242332223412233124222232233132312233321434233231233231123322222112331422220221133322133314323332322332131223323333",
  "231213232232233123423311213113231332331333311341332132423113332233322332433324322324134421133222412423321423332233333333213244342033321134321232232123134224323332231211",
  "232223232231233223324322123223132332332333322332332232323223331234422332334323321323233312233212321313322313331233334333223233332303322243312232242213233223323332242222",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322423243322234121322324322324432233333443224133331330422233422241232223233223424332232222",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322423243322234121322324322324432233333443224133331334022233422241232223233223424332232222",
  "323332313323322332232233332332323223223222233223123323232332223322233223222232233232322233322333233232133232223321222222332322223222203322233323323332322332232223323333",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122230421234323323432421331232223324344",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234021234323323432421331232223324344",
  "232223232231233223324322123223132332332333322332332232323223331234422332334323321323233312233212321313322313331233334333223233332343322203312232242213233223323532242222",
  "231213232232233123423311213113231332331333311341332132423113332233322332433324322324134421133222412423321423332233333333213244342433321130321232232123134224323332231211",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322423243322234121322324322324432233333443224133331334422233022241232223233223424332232222",
  "323332323324322332231233432332423223223222233223223323232332224321133223221232234232322243322343234242233242224322221222332322223212233312203323313342322332232223313333",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421230323323432421331232223324344",
  "323331323323322342242233332331313223223212233223223323232331223322233223222232233232322233322333233232233232223322112222332322223222233322233023323332322332232213423333",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322423243322234121322324322324432233333443224133331334422233422201232223233223424332232222",
  "313432324323412331232133332332323213113222233123214314242332223412233124222232233132312233321434233231233231123322222112331422224221133322133310323332322332131223323333",
  "423332423413322332232233332332323223223221233223223323232332223322244213222142143242322233322333233232233232213422222222432322123222233322233323024332322442242224323433",
  "232223232231233223324322123223132332332333322332332232323223331234422332334323321323233312233212321313322313331233334333223233332343322243312232202213233223323332242222",
  "423332423413322332232233332332323223223221233223223323232332223322244213222142143242322233322333233232233232213422222222432322123222233322233323420332322442242224323433",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323032421331232223324344",
  "323332323324322332231233432332423223223222233223223323232332224321133223221232234232322243322343234242233242224322221222332322223212233312243323313302322332232223313333",
  "232223232232234223323322224223232431332433422332332232324223442233322332343323322323233322243222322323312323332243333334223233332333322233322232232220243223323432232222",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432021331232223324344",
  "232223232232234223323322224223232431332433422332332232324223442233322332343323322323233322243222322323312323332243333334223233332333322233322232232224203223323432232222",
  "231213232232233123423311213113231332331333311341332132423113332233322332433324322324134421133222412423321423332233333333213244342433321134321232232123130224323332231211",
  "423332423413322332232233332332323223223221233223223323222332223322244213222142143242322233322333233232233232213422222222432322123222233322233323424332322042242224323433",
  "423332423413322332232233332332323223223221233223223323232332223322244213222142143242322233322333233232233232213422222222432322123222233322233323424332322402242224323433",
  "231213232232233123423311213113231332331333311341332132423113332233322332433324322324134421133222412423321423332233333333213244342433321134321232232123134220323332231211",
  "242123231232143224323422223223232342442333322432341241313223332143322431333323322423243322234121322324322324432233333443224133331334422233422241232223233223024332232222",
  "423332423413322332232233332332423223223221233223223323232332223322244213222142143242322233322333233232233232213422222222432322223222233322233323424332322442202324323433",
  "242123231232143224323422223223232342442333322432343241313223332143322431333323322423243322234121322324322324432233333443224133331334422233422241232223233223420532232222",
  "232223252232234223333322225223132431332433422332333233324223442233322333345323322323233322243222322323312323332243333334223133432333322253322232232224243223335032232222",
  "232224232232233213313322223224242332332343322332332232323224332233322332333323322323233322233222322323322323332233443333223233332333322233322132232223233223323302132222",
  "423332423413322332232233332332323223223221233223223323232332223322244213222142143242322233322333233232233232213422222222432322123222233322233323424332322442242220323433",
  "323331323323322342242233332331313223223212233223223323232331223322233223222232233232322233322333233232233232223322112222332322223222233322233423323332322332232213023333",
  "232223232231233223324322123223132332332333322332332232323223331234422332334323321323233312233212321313322313331233334333223233332343322243312232242213233223323332202222",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223320344",
  "423332423413322332232233332332323223223221233223223323232332223322244213222142143242322233322333233232233232213422222222432322123222233322233323424332322442242224323033",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324304",
  "324342323323322432132244342442324223224222244214223423132442223322233223122231233231421134422333143132234132223322222222342311213122234421234323323432421331232223324340"
];

import { canonCountry } from './countries.js';

const _idx = new Map();
for (let i = 0; i < REL_NAMES.length; i++) _idx.set(REL_NAMES[i].trim().toLowerCase(), i);
const _i = (n) => { const k = _idx.get(canonCountry(n).toLowerCase()); return k === undefined ? -1 : k; };

export const relationCount = () => REL_NAMES.length;
export function relationList() {
  return REL_NAMES.map((name, i) => ({
    name, code: REL_META[i][0], continent: REL_META[i][1], theater: REL_META[i][2],
    faction: REL_META[i][3], usa: REL_META[i][4], china: REL_META[i][5], why: REL_META[i][6],
  }));
}

// The one question every caller has: how do these two feel about each other?
// Returns null for a name the matrix does not carry - never a fabricated neutral.
export function relationOf(a, b) {
  const i = _i(a), j = _i(b);
  if (i < 0 || j < 0) return null;
  if (i === j) return { v: 5, word: 'HOME', color: RELATION_COLORS[5], self: true };
  const v = REL_MATRIX[i].charCodeAt(j) - 48;
  return { v, word: RELATION_WORDS[v], color: RELATION_COLORS[v], self: false };
}

export const factionOf = (n) => { const i = _i(n); return i < 0 ? null : REL_META[i][3]; };
export const theaterOf = (n) => { const i = _i(n); return i < 0 ? null : REL_META[i][2]; };
export const continentOf = (n) => { const i = _i(n); return i < 0 ? null : REL_META[i][1]; };
export const rationaleOf = (n) => { const i = _i(n); return i < 0 ? null : REL_META[i][6]; };
export const sameBloc = (a, b) => { const x = factionOf(a), y = factionOf(b); return !!x && x === y; };

// DERIVED, never a written list - the split has to come from the same rows the matrix does, or the
// two can drift. Comes out United Front 88 / Collective 80.
export function factionSplit() {
  const out = {};
  for (const m of REL_META) out[m[3]] = (out[m[3]] || 0) + 1;
  return out;
}

// Everyone a country is at least `min` with, closest first, alphabetical inside a rung so the list
// is STABLE - a "closest allies" panel that reshuffles on every open reads as a bug.
export function alliesOf(name, min = 4) {
  const i = _i(name); if (i < 0) return [];
  const row = REL_MATRIX[i], out = [];
  for (let j = 0; j < REL_NAMES.length; j++) {
    if (j === i) continue;
    const v = row.charCodeAt(j) - 48;
    if (v >= min) out.push({ name: REL_NAMES[j], v });
  }
  return out.sort((a, b) => b.v - a.v || a.name.localeCompare(b.name));
}
export function rivalsOf(name, max = 2) {
  const i = _i(name); if (i < 0) return [];
  const row = REL_MATRIX[i], out = [];
  for (let j = 0; j < REL_NAMES.length; j++) {
    if (j === i) continue;
    const v = row.charCodeAt(j) - 48;
    if (v <= max) out.push({ name: REL_NAMES[j], v });
  }
  return out.sort((a, b) => a.v - b.v || a.name.localeCompare(b.name));
}
