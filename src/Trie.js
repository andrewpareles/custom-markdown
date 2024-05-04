
// TODO! make a language that can implement Trie well: just declare crawl thru tree once, and then define specifics (can do it visually)
// (note all these methods look exactly the same)

class TrieNode {
    children = {} // letter -> TrieNode
    values = undefined // this.values = undefined at first. can be a set. this stores the values and doubles as a stop token
}


class Trie {
    root = new TrieNode()
}

// insert val at the end of str
Trie.prototype.insert = function (str, val) {
    let t = this.root

    for (let letter of str) {
        const { children } = t

        if (!children[letter])
            children[letter] = new TrieNode()

        t = children[letter]

    }

    if (!t.values) t.values = new Set()
    t.values.add(val)

}



// check if val is in the trie at the end of string
Trie.prototype.has = function (str, val) {
    let t = this.root

    for (let letter of str) {
        const { children } = t

        if (!(letter in children))
            return false

        t = children[letter]
    }

    return !!(t.values?.has(val))

}


// remove string from trie or raise error
Trie.prototype.remove = function (str, val) {
    let t = this.root

    const CNR = new Error(`Could not remove "${str}" val ${val} since could not find it in trie`)

    for (let letter of str) {
        const { children } = t

        if (!(letter in children))
            throw CNR

        t = children[letter]
    }

    if (!t.values || !t.values.has(val))
        throw CNR

    t.values.delete(val)
}


// if there are multiple prefixes that match the value, return the lower-down one.
// returns { prefix, value } or null
// TODO! can we optimize this more?
Trie.prototype.getMatch = function ({ string, offset, matchLongestPrefixOfThese }) {
    let t = this.root

    const prefixesOfMatchedVal = {} // assume root has no values, or else initially this should be {(val:'') for val in t.values}
    let curr_prefix = ''

    // 1. get all the matches.
    for (let letter_index = offset; letter_index !== string.length; letter_index += 1) {
        let letter = string[letter_index]
        curr_prefix += letter
        // a. see if letter is in trie
        const { children } = t
        if (!(letter in children))
            break
        // b. if it is, enter it and add all the values associated with it
        t = children[letter]
        const { values = [] } = t
        for (let value of values)
            prefixesOfMatchedVal[value] = curr_prefix // if there are multiple prefixes, use the lower-down one by replacing any old one
    }

    // console.log('trie matched', prefixesOfMatchedVal)
    // 2. return 1st match
    // heuristic: if no matches, return null
    if (Object.keys(prefixesOfMatchedVal).length === 0)
        return null

    // iterate over each batch

    let ans = null

    for (let v of matchLongestPrefixOfThese) {
        // console.log('checking', v)
        if (v in prefixesOfMatchedVal) {
            let v_prefix = prefixesOfMatchedVal[v]
            if (!ans || (v_prefix.length > ans.prefix.length))
                ans = { prefix: v_prefix, value: v }
        }
    }
    return ans

}


export default Trie
