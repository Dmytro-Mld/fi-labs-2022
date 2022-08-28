const toCSV = require('./to-csv.js')
const fs = require('fs')

const alphabet = "абвгдежзийклмнопрстуфхцчшщъыьэюя"
const letterFrequency = {
  'а': 0.07998,  'б': 0.01592,
  'в': 0.04533,  'г': 0.01687,
  'д': 0.02977,  'е': 0.08496,
  'ж': 0.0094,   'з': 0.01641,
  'и': 0.07367,  'й': 0.01208,
  'к': 0.03486,  'л': 0.04343,
  'м': 0.0323,   'н': 0.0067,
  'о': 0.10983,  'п': 0.02615,
  'р': 0.04746,  'с': 0.05473,
  'т': 0.06318,  'у': 0.02615,
  'ф': 0.00267,  'х': 0.00966,
  'ц': 0.00486,  'ч': 0.0145,
  'ш': 0.00718,  'щ': 0.00361,
  'ъ': 0.00037,  'ы': 0.01898,
  'ь': 0.01735,  'э': 0.00331,
  'ю': 0.00639,  'я': 0.02001,
}

const textToNumbers = (text) => text.split('').map(x => alphabet.indexOf(x))

const numbersToText = (numbers) => numbers.map(x => alphabet[x]).join('')

const countDeviation = (numbers, theoretical) => numbers
  .map(x => Math.abs(x - theoretical))
  .reduce((sum, x) => sum + x, 0) / numbers.length

const mod = (exp, n) => {
  let m = exp % n;
  return m < 0 ? m + n : m;
}

class VizhenerCipher{
  constructor(encrypted, maxPeriod, maxTableLength){
    this.encrypted = encrypted
    this.maxPeriod = maxPeriod ? maxPeriod : encrypted.length / 5
    this.maxTableLength = maxTableLength ? maxTableLength : 40
    this.blocks = []
    this.period = 0
  }

  sumByLetters(func){
    const letters = alphabet.split('')
    let sum = 0
    for (const letter of letters){
      sum += func(letter) || 0  
    }
    return sum
  }

  countLetters(Y){
    const lettersCounter = {}
    for (let letter of Y){
      if(lettersCounter[letter]) lettersCounter[letter]++
      else lettersCounter[letter] = 1
    }
    return lettersCounter
  }

  countAffinityIndex(Y){
    const n = Y.length
    return 1/(n*(n-1))*this.sumByLetters(letter => this.countLetters(Y)[letter]*(this.countLetters(Y)[letter] - 1))
  }
  
  findPeriodLength_1(){
    const affinityIndexes = {}
    const countAffinities = []
    const blocksForPeriods = []
    for (let period = 2; period < this.maxPeriod; period++){
      const blocks = this.getBlocks(period)
      // const n = this.encrypted.length
      const value = blocks.map(Y => this.countAffinityIndex(Y))
      affinityIndexes[period] = value
      countAffinities.push({period, value: value.reduce((s, x) => s + x, 0)})
      blocksForPeriods.push(blocks)
    }
    const theorAffinity = Object.values(letterFrequency).reduce((sum, freq) => sum + freq**2, 0)
    console.log('Індекси відповідності для ключей різної довжини:')
    console.table(countAffinities.slice(0, this.maxTableLength))
    this.period = this.nearestAffinity(affinityIndexes, theorAffinity)
    console.log('Довжина правильного ключа (метод 1): ', this.period)
  }
  
  nearestAffinity(affinityIndexes, theorAffinity){
    let truePeriod = {period: 0, deviation: Infinity}
    for (const period in affinityIndexes){
      const deviation = countDeviation(affinityIndexes[period], theorAffinity)
      if(deviation < truePeriod.deviation){
        truePeriod = {period, deviation} 
      }
    }
    return truePeriod.period
  }

  getBlocks(period) {
    const blocks = [] 
    for (let r = 0; r < period; r++){
      const Y = []
      for (let i = 0; i*period < this.encrypted.length; i++) {
        if(this.encrypted[r+i*period]) Y.push(this.encrypted[r+i*period])
      }
      blocks.push(Y)
    }
    return blocks
  }

  findPeriodLength_2(){
    let coincidences = {value: 0, period: 0}
    const coincidencesArray = []
    for (let r = 6; r <= this.maxPeriod; r++){
      let D = 0
      for (let k = 0; k < this.encrypted.length - r; k++) {
        if(this.encrypted[k] == this.encrypted[k + r]) D++
      }
      coincidencesArray.push({period: r, value: D})
      if(coincidences.value < D) coincidences = {value: D, period: r}
    }
    console.log("Послідовність D_r при визначенні довжини ключа шифру Віженера:")
    console.table(coincidencesArray.slice(0, this.maxTableLength))
    this.period = coincidences.period
    console.log('Довжина правильного ключа (метод 2): ', this.period)
  }

  decryptSimple({method}){
    method == 1 ? this.findPeriodLength_1() : this.findPeriodLength_2() 
    const blocks = this.getBlocks(this.period)
    let mostCommon = []
    for (const block of blocks) {
      const lettersCount = this.countLetters(block)
      const { letter } = Object.entries(lettersCount).reduce(
        (current, [letter, times]) => times > current.times ? {letter, times} : current, {letter: '', times: 0}
      )
      mostCommon.push(letter)
    }
    const langMostCommon = 'о'
    const id = alphabet.indexOf.bind(alphabet)
    const m = alphabet.length
    let key = ''
    for (const letter of mostCommon){
      key += alphabet[mod(id(letter) - id(langMostCommon), m)]
    }
  }

  decryptReliable({method}) {
    method == 1 ? this.findPeriodLength_1() : this.findPeriodLength_2() 
    const blocks = this.getBlocks(this.period)
    const M = (Y, g) => this.sumByLetters(
      letter => {
        return letterFrequency[letter] * this.countLetters(Y)[alphabet[mod(alphabet.indexOf(letter) + g, alphabet.length)]]
      }
    )
    
    let key = ''
    const MfuncResults = []
    for (const block of blocks){
      let max = {val: 0, idx: 0}
      const resForBlock = {}
      for (let g = 0; g < alphabet.length; g++){
        let res = M(block, g)
        resForBlock[alphabet[g]] = res 
        if(res > max.val) {
          max = { val: res, idx: g}
        }
      }
    
      MfuncResults.push(resForBlock)
      key += alphabet[max.idx]
    }
    if (method == 2) {
      console.log(`Значення ключа отримане за допомогою функцій M_i(g) записане у файл M-function-values.csv`)
      fs.writeFileSync(`M-function-values.csv`, toCSV(MfuncResults))
    }

    const decrypted = []
    console.log('Значення ключа: ', key)
    for (let i = 0; i < this.encrypted.length; i++){
      const y = textToNumbers(this.encrypted)
      const k = textToNumbers(key)
      decrypted.push(mod(y[i] - k[i % key.length], alphabet.length))
    }
    return numbersToText(decrypted)
  }
}

VizhenerCipher.encrypt = (text, key) => {
  const x = textToNumbers(text)
  const k = textToNumbers(key)
  const encrypted = []
  for (let i = 0; i < text.length; i++){
    encrypted.push((x[i] + k[i % key.length]) % alphabet.length)
  }
  return numbersToText(encrypted)
}

module.exports = {VizhenerCipher}
