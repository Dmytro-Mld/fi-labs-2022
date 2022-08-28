const mod = (exp, n) => {
  let m = exp % n;
  return m < 0 ? m + n : m;
}

const clearLastLine = () => {
  process.stdout.moveCursor(0, -1) // up one line
  process.stdout.clearLine(1) // from cursor to end
}

const remove_whitespaces = (text) => {
  return text.replace(/\s/g, '');
}

function extended_euclid(a, b) {
  let old_r = a, r = b;
  let old_u = 1, u = 0;
  let old_v = 0, v = 1;
  let quotient;
  while (r != 0) {
    quotient = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - quotient * r];
    [old_u, u] = [u, old_u - quotient * u];
    [old_v, v] = [v, old_v - quotient * v];
  }
  return [old_r, old_u, old_v]
}

const revs = (a, n) => {
  const [_, u] = extended_euclid(a, n);
  return u;
}

const compute_frequencies = (text) => {
  // Підрахуємо кількість
  let occurences = {};
  let total = 0;
  for (const literal of text) {
    if (occurences[literal] === undefined) {
      occurences[literal] = 0;
    }
    occurences[literal] += 1;
    total += 1;
  }
  // Підраховуємо частоти
  let frequencies = {};
  for (const literal of Object.keys(occurences)) {
    frequencies[literal] = occurences[literal] / total;
  }
  return frequencies;
}

const compute_bigram_frequencies = (text, step = 2) => {
  // Підрахуємо кількість
  let occurences = {};
  let total = 0;
  for (let i = 0; i < text.length - 1; i += step) {
    const literal = text[i] + text[i+1];
    if (occurences[literal] === undefined) {
      occurences[literal] = 0;
    }
    occurences[literal] += 1;
    total += 1;
  }
  // Підраховуємо частоти
  let frequencies = {};
  for (const literal of Object.keys(occurences)) {
    frequencies[literal] = occurences[literal] / total;
  }
  return frequencies;
}

const best_frequencies = (table, n) => {
  const entries = Object.entries(table); // {'v': 0.4, 'd': 0.6} -> [['v', 0.4], ['d', 0.6]]
  const sorted_entries = entries.sort((a, b) => {
    if (a[1] > b[1]) return -1;
    if (a[1] < b[1]) return 1;
    return 0;
  });
  return sorted_entries.slice(0, n);
}

function find_permutations(arr) {
  if (arr.length < 2) {
    return [arr]
  }
  let permutations = [];
  for (let i = 0; i < arr.length; i++) {
    let a = [...arr];
    a.splice(i, 1);

    for (let permutation of find_permutations(a)) {
      permutations.push([arr[i], ...permutation]);
    }
  }
  return permutations;
}

const pick_of_2 = (source) => {
  let picks = [];
  for (let i = 0; i < source.length; i++) {
    for (let j = i+1; j < source.length; j++) {
      picks.push([source[i], source[j]]);
    }
  }
  return picks;
}

const zip = (arr1, arr2) => {
  let l = [];
  for (let i = 0; i < arr1.length; i++) {
    l.push([arr1[i], arr2[i]]);
  }
  return l;
}

const build_affine_cipher_mapping = (alphabet) => {
  const m = alphabet.length;
  let mapping = new Array(m * m);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      mapping[i * m + j] = [alphabet[i], alphabet[j]];
    }
  }
  mapping.bigramOrder = (x) => {
    for (let m = 0; m < mapping.length; m++) {
      if (mapping[m][0] == x[0] && mapping[m][1] == x[1]) {
        return m;
      }
    }
  }
  return mapping;
}

const encrypt = (text, mapping, m, a, b) => {
  let encrypted_text = '';
  const msq = m * m;
  for (let i = 0; i < text.length; i += 2) {
    const x = mapping.bigramOrder([text[i], text[i+1]]);
    const y = mod(mod(a * x, msq) + b, msq);
    encrypted_text += mapping[y][0] + mapping[y][1];
  }
  return encrypted_text;
}

const decrypt = (encrypted, mapping, m, a, b) => {
  let text = '';
  const msq = m * m;
  const a_inv = revs(a, msq);
  for (let i = 0; i < encrypted.length; i += 2) {
    const y = mapping.bigramOrder([encrypted[i], encrypted[i+1]]);
    const x = mod(a_inv * mod(y - b, msq), msq);
    text += mapping[x][0] + mapping[x][1];
  }
  return text;

}

const link_bigrams = (b1, b2) => {
  let links = [];
  for (let permutation of find_permutations(b2)) {
    links.push(zip(b1, permutation));
  }
  return links
}

const guess_paramethers = (linked_bigrams, mapping, m) => {
  const msq = m * m;
  const subs = (bigrams, offset) => {
    let res = mapping.bigramOrder(bigrams[0][offset])
    for (let i = 1; i < bigrams.length; i++) {
      res -= mapping.bigramOrder(bigrams[i][offset])
    }
    return res;
  }
  let B = mod(subs(linked_bigrams, 0), msq);
  let A = mod(subs(linked_bigrams, 1), msq);
  const a = mod(B * revs(A, msq), msq);
  const b = mod(mapping.bigramOrder(linked_bigrams[0][0]) -
                a * mapping.bigramOrder(linked_bigrams[0][1]), msq);
  return { a, b };
}

const russian_recognizer = (text) => {
  // normal russian text -> 0
  // bizzare text -> inf
  const all_bigrams = compute_bigram_frequencies(text, 1);
  const best_bigrams = best_frequencies(all_bigrams, 15);
  const letters_freqs = compute_frequencies(text);

  const bigrams_coincide = (source, right) => {
    return source.length - source.filter(b => right.includes(b)).length
  }

  const check_literals_frequencies = (freqs, right_freqs) => {
    let deviation_sum = 0;
    for (const letter of Object.keys(freqs)) {
      deviation_sum += Math.pow(freqs[letter] - right_freqs[letter], 2);
    }
    return deviation_sum / (Object.keys(freqs).length - 1);
  }

  const lambda = 0.4;
  return lambda * bigrams_coincide(best_bigrams, best_russian_bigrams) +
         (1 - lambda) * check_literals_frequencies(letters_freqs, russian_letters_freqs);
}



const alphabet = ['а', 'б', 'в', 'г', 'д', 'е', 'ж', 'з', 'и', 'й', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ы', 'ь', 'э', 'ю', 'я'];

// const best_language_bigrams = ['ст', 'но', 'то', 'на', 'ен'];
const best_russian_bigrams = [
  'ст', 'ен', 'ов', 'но', 'ни', 'на', 'ра',
  'ко', 'то', 'ро', 'ан', 'ос', 'по', 'го',
  'ер', 'од', 'ре', 'ор', 'пр', 'та', 'во',
  'ес', 'ал', 'ли', 'ол', 'ом', 'ле', 'ск',
  'ва', 'ет', 'не',
];
const russian_letters_freqs = {
  'а': .0804,
  'к': .0349,
  'х': .0102,
  'б': .0155,
  'л': .0432,
  'ц': .0058,
  'в': .0475,
  'м': .0311,
  'ч': .0123,
  'г': .0188,
  'н': .0672,
  'ш': .0055,
  'д': .095,
  'о': .1061,
  'щ': .0034,
  'е': .0821,
  'п': .0282,
  'р': .0538,
  'ы': .0191,
  'ж': .0080,
  'с': .0571,
  'ь': .0139,
  'з': .0161,
  'т': .0583,
  'э': .0031,
  'и': .0798,
  'у': .0228,
  'ю': .0063,
  'й': .0136,
  'ф': .0041,
  'я': .0200,
};

function break_cipher(encrypted, alphabet, mapping) {
  const bigram_table = compute_bigram_frequencies(encrypted);
  const num_of_picked_enc_bigrams = 5;
  const best_bigrams = best_frequencies(bigram_table, num_of_picked_enc_bigrams);
  console.log('best encryption bygrams')
  console.dir({ best_bigrams });
  const enc_bigrams = best_bigrams.map(x => x[0]);

  const enc_picks = pick_of_2(enc_bigrams);
  const natural_picks = pick_of_2(best_russian_bigrams);

  let all_links = [];
  for (const enc_pick of enc_picks) {
    natural_picks.map(natural_pair => {
      all_links.push(link_bigrams(
        enc_pick,
        natural_pair,
      ));
    });
  }

  console.log(`${all_links.length} possible bigram mappings found. For less change best_russian_bigrams list.`);

  const solutions_obj = {};
  all_links.map(link => {
    link.map(l => {
      return guess_paramethers(l, mapping, alphabet.length);
    }).map(res => solutions_obj[`${res.a}-${res.b}`] = res)
  });
  const solutions = Object.values(solutions_obj);

  console.log(`Total possible solutions - ${solutions.length}`);

  console.log();
  const decrypted_texts = solutions.map((solution, i, arr) => {
    clearLastLine();
    console.log(`Decryption ${i}/${arr.length}`);
    return {
      text: decrypt(encrypted, mapping, alphabet.length, solution.a, solution.b),
      solution: solution,
    };
  });

  console.log(`Checking decrypted texts quality...`);

  let decrypted_texts_quality = {};
  for (const text of decrypted_texts) {
    decrypted_texts_quality[`a:${text.solution.a};b:${text.solution.b}`] = {
      noise: russian_recognizer(text.text),
      ...text,
    };
  }

  return decrypted_texts_quality;
}

function test() {
  const text = `адругойденьпростившисьтолькосоднимграфомнедождавшисьвыходадамкнязьандрейпоехалдомойужебылоначалоиюнякогдакнязьандрейвозвращаясьдомойвьехалопятьвтуберезовуюрощувкоторойэтотстарыйкорявыйдубтакстранноипамятнопоразилегобубенчикиещеглушезвенеливлесучемполторамесяцатомуназадвсебылополнотенистоигустоимолодыеелирассыпанныеполесуненарушалиобщейкрасотыиподделываясьподобщийхарактернежнозеленелипушистымимолодымипобегамицелыйденьбылжаркийгдетособираласьгрозанотольконебольшаятучкабрызнуланапыльдорогиинасочныелистьялеваястороналесабылатемнавтениправаямокраяглянцовитаяблестеланасолнцечутьколыхаясьответравсебыловцветусоловьитрещалииперекатывалисьтоблизкотодалекодаздесьвэтомлесубылэтотдубскоторыммыбылисогласныподумалкнязьандрейдагдеонподумалопятькнязьандрейглядяналевуюсторонудорогиисамтогонезнаянеузнаваяеголюбовалсятемдубомкоторогоонискалстарыйдубвесьпреображенныйраскинувшисьшатромсочнойтемнойзеленимлелчутьколыхаясьвлучахвечернегосолнцаникорявыхпальцевниболячекнистарогонедоверияигоряничегонебыловидносквозьжесткуюстолетнююкорупробилисьбезсучковсочныемолодыелистьятакчтоповеритьнельзябылочтоэтотстарикпроизвелихдаэтототсамыйдубподумалкнязьандрейинанеговдругнашлобеспричинноевесеннеечувстворадостииобновлениявселучшиеминутыегожизнивдругводноитожевремявспомнилисьемуиаустерлицсвысокимнебомимертвоеукоризненноелицоженыипьернапаромеидевочкавзволнованнаякрасотоюночииэтаночьилунаивсеэтовдругвспомнилосьему`;
  const mapping = build_affine_cipher_mapping(alphabet);

  const bigram_natural_table = compute_bigram_frequencies(text);
  const best_5_natural_bigrams = best_frequencies(bigram_natural_table, 5);
  console.dir({best_5_natural_bigrams});

  const encryption_a = 152;
  const encryption_b = 71;
  const encrypted = encrypt(text, mapping, alphabet.length, encryption_a, encryption_b);

  console.dir({text, encryption_a, encryption_b, encrypted});

  const result = break_cipher(encrypted, alphabet, mapping);
  const result_array = Object.entries(result);
  result_array.sort((a, b) => {
      if (a[1].noise > b[1].noise) return 1;
      if (a[1].noise < b[1].noise) return -1;
      return 0;
    });
  const pick_best = 5;
  console.log(`${pick_best} best solutions:`);
  console.log(result_array.slice(0, pick_best));
}

function main(data) {
  console.log(typeof data);
  console.log(data);
  const mapping = build_affine_cipher_mapping(alphabet);
  const result = break_cipher(data, alphabet, mapping);
  const result_array = Object.entries(result);
  result_array.sort((a, b) => {
      if (a[1].noise > b[1].noise) return 1;
      if (a[1].noise < b[1].noise) return -1;
      return 0;
    });
  const pick_best = 5;
  console.log(`${pick_best} best solutions:`);
  console.log(result_array.slice(0, pick_best));
}

const fs = require('fs');
fs.readFile('./variants.utf8/10.txt', 'utf8', function (err, data) {
  if (err) {
    return console.log(err);
  }
  // test();
  main(remove_whitespaces(data));
});
