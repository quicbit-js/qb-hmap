// Software License Agreement (ISC License)
//
// Copyright (c) 2018, Matthew Voss
//
// Permission to use, copy, modify, and/or distribute this software for
// any purpose with or without fee is hereby granted, provided that the
// above copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

var extend = require('qb-extend-flat')

// create hash from previous, buffer, and tcode
function hash (a, b) {
    // h = ((h << 5) + h) + src[i]                 // djb2 - by berstein 269/289741 (3.0 seconds)
    // h = ((h * 33) ^ src[i])                     // xor - by berstein 251/289741 (2.8 seconds)
    // h = (h << 6) + (h << 16) - h + src[i]       // sdbm 3/289741 (3.5 seconds)
    return 0x7FFFFFFF & ((a * 33) ^ b)          // xor - by berstein
}

function err (msg) { throw Error(msg) }
var HALT = {}           // object for stopping for_val processing

// values stored by hash, then by collision 'col'
function HMap (key_set, opt) {
    opt = opt || {}
    key_set || opt.test_mode || err('missing key_set')
    this.key_set = key_set || null
    this.by_hash = []
    this.by_hash_col = []
    this._indexes = opt.insert_order || opt.insert_order == null ? [] : null
}

HMap.prototype = {
    HALT: HALT,
    constructor: HMap,
    get length () {
        return this.indexes.length
    },
    get indexes() {
        if (this._indexes) {
            return this._indexes
        }
        var self = this
        var ret = []
        Object.keys(self.by_hash).forEach(function (i_str) {
            var hi = parseInt(i_str)
            ret.push([hi, 0])
            var col = self.by_hash_col[hi]
            if (col) {
                for (var ci = 0; ci< col.length; ci++) {
                    if (col[ci] !== undefined) {
                        ret.push([hi, ci + 1])
                    }
                }
            }
        })
        return ret
    },
    put: function (key, val, create_fn) {
        return this.put_hc(key.hash, key.col, val, create_fn)
    },
    // create injects custom construction of values to be placed into the map
    put_hc: function (h, c, val, create_fn) {
        val !== undefined || err('cannot put undefined value')
        h > 0 || h === 0 || err('invalid hash: ' + h)
        var prev
        if (c === 0) {
            prev = this.by_hash[h]
            if (create_fn) { val = create_fn(h, c, prev, val) }
            this.by_hash[h] = val
        } else if (c > 0) {
            var cols = this.by_hash_col[h]
            if (!cols) {
                cols = this.by_hash_col[h] = []
            } else {
                prev = cols[c - 1]
            }
            if (create_fn) { val = create_fn(h, c, prev, val) }
            cols[c - 1] = val
        } else {
            err ('invalid collision: ' + c)
        }

        if (prev === undefined) {
            if (this._indexes !== null) {
                this._indexes.push([h, c])
            }
        }
        return val
    },
    get: function (key) {
        return this.get_hc(key.hash, key.col)
    },
    // get by hash and collision
    get_hc: function (h, c) {
        h >= 0 || err('invalid hash: ' + h)
        if (c === 0) {
            return this.by_hash[h]
        } else if (c > 0) {
            var cols = this.by_hash_col[h]
            return cols === undefined ? undefined : cols[c - 1]
        } else {
            err('invalid collision: ' + c)
        }
    },
    for_key_val: function (fn) { return this._for_key_val(fn, true) },
    for_val: function (fn) { return this._for_key_val(fn, false) },
    _for_key_val: function (fn, with_keys) {
        var key_set = with_keys ? this.key_set : null
        var indexes = this.indexes
        for (var i=0; i<indexes.length; i++) {
            var idx = indexes[i]
            var k = key_set === null ? idx : key_set.map.get_hc(idx[0], idx[1])
            var v = (idx[1] === 0) ? this.by_hash[idx[0]] : this.by_hash_col[idx[0]][idx[1]-1]
            var res = with_keys ? fn(k, v, i) : fn(v, i)
            if (res === HALT) {
                break
            }
        }
    },
    vals: function () {
        var ret = []
        this.for_val(function (v) { ret.push(v) })
        return ret
    },
    collisions: function () {
        var ret = 0
        var by_hash_col = this.by_hash_col
        Object.keys(by_hash_col).forEach(function (i_str) {
            var i = parseInt(i_str)
            ret += by_hash_col[i].length
        })
        return ret
    },
    to_obj: function () {
        var ret
        if (this.key_set) {
            ret = {}
            this.for_key_val(function (k, v) {
                ret[k] = v
            })
        } else {
            ret = []
            this.for_val(function (v) {
                ret.push(v)
            })
        }
        return ret
    }
}

function KeySet (hash_fn, equal_fn, create_fn) {
    this.map = new HMap(this)
    this.hash_fn = hash_fn || err('no hash function')           // hash arguments to integer
    this.equal_fn = equal_fn || err('no equal function')        // compare key with arguments (prev, arguments)
    this.create_fn = create_fn || err('no create function')     // create key from (hash, col, prev, arguments)
}

KeySet.prototype = {
    HALT: HALT,
    constructor: KeySet,

    create_map: function (opt) {
        return new HMap(this, opt)
    },
    // check this keyset for the given arguments (using hash_fn and equal_fn) and create/update
    put_create: function () {
        // figure collision value (col)
        var map = this.map
        var hash = this.hash_fn(arguments)
        var prev = map.by_hash[hash]
        if (prev === undefined ) {
            return map.put_hc(hash, 0, arguments, this.create_fn)
        }
        if (this.equal_fn(prev, arguments)) {
            return map.put_hc(hash, 0, arguments, this.create_fn)
            // return (map.by_hash[hash] = this.create_fn(hash, 0, prev, arguments))    // faster?
        }
        var col = 0
        var cols = map.by_hash_col[hash]
        if (cols !== undefined) {
            while (col < cols.length && !this.equal_fn(cols[col], arguments)) {
                col++
            }
        }
        return map.put_hc(hash, col + 1, arguments, this.create_fn)
    },

    get length() { return this.map.length },
    for_val: function (fn) { this.map.for_val(fn) },
    vals: function () {return this.map.vals() },
    collisions: function() { return this.map.collisions() },
    to_obj: function () { return this.vals() }
}

module.exports = {
    HALT: HALT,
    hash: hash,
    key_set: function (hash_fn, equal_fn, create_fn) { return new KeySet(hash_fn, equal_fn, create_fn) },
    _map: function (key_set, opt) { if (opt) opt.test_mode = 1; return new HMap(key_set, opt) },
    _KeySet: KeySet,        // for custom extensions
}