module.exports = (table) => {
  let res = " ," + Object.keys(table[0]).join(",") + '\n'
  for (let i = 0; i < table.length; i++) {
    res += [i + 1].concat(Object.values(table[i])).join(",") + '\n'
  }
  return res
} 
