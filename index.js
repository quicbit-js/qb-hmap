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
    this.key_set = key_set || null
    this.by_hash = []
    this.by_hash_col = []
    this._indexes = opt.insert_order || opt.insert_order == null ? [] : null
    this._frozen = false
    this._feeze_create_objects = opt._feeze_create_objects      // setting this helps with debug inspection, especially for nested sets
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
        if (this._frozen) {
            this._indexes = ret
        }
        return ret
    },
    put: function (key, val, create_fn) {
        return this.put_hc(key.hash, key.col, val, create_fn)
    },
    // create injects custom construction of values to be placed into the map
    put_hc: function (h, c, val, create_fn) {
        !this._frozen || err('map is frozen')
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
    put_obj: function (obj) {
        var self = this
        var kset = this.key_set
        Object.keys(obj).forEach(function (k) { self.put(kset.put_s(k), obj[k]) })
    },
    put_s: function (s, v) {
        this.put(this.key_set.put_s(s), v)
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
    same_hashes: function (b) {
        var a = this
        if (a.by_hash.length !== b.by_hash.length || a.by_hash_col.length !== b.by_hash_col.length) {
            return false
        }
        var aind = a.indexes
        if (a.indexes.length !== b.indexes.length) {
            return false
        }
        for (var i=0; i<aind.length; i++) {
            if (!b.by_hash[aind[i][0]]) {
                return false
            }
            if (aind[i][1]) {
                var ahash = aind[i][0]
                var acol = aind[i][1]
                if (!(b.by_hash_col[ahash] && b.by_hash_col[ahash][acol])) {
                    return false
                }
            }
        }
        return true
    },
    for_key_val: function (fn) { return this._for_key_val(fn, true) },
    for_key: function (fn) {
        var key_set = this.key_set
        var indexes = this.indexes
        for (var i=0; i<indexes.length; i++) {
            var idx = indexes[i]
            var res = fn(key_set && key_set.map.get_hc(idx[0], idx[1]) || idx, i)
            if (res === HALT) {
                break
            }
        }
    },
    for_val: function (fn) { return this._for_key_val(fn, false) },
    _for_key_val: function (fn, with_keys) {
        var key_set = with_keys ? this.key_set : null
        var indexes = this.indexes
        for (var i=0; i<indexes.length; i++) {
            var idx = indexes[i]
            var k = key_set && key_set.map.get_hc(idx[0], idx[1]) || idx
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
    freeze: function () {
        if (this.freeze_create_objects) {
            this._frozen_objects = this.to_obj()
        }
        this._frozen = true
    },
    to_obj: function () {
        var keys = []
        var string_keys = true
        this.for_key(function (k) {
            k = k.to_obj ? k.to_obj() : k
            if (typeof k !== 'string') {
                string_keys = false
            }
            keys.push(k)
        })
        var ret = string_keys ? {} : []
        this.for_val(function (v, i) {
            v = v.to_obj ? v.to_obj() : v
            var k = keys[i]
            if (string_keys) {
                ret[k] = v
            } else {
                ret.push([k, v])
            }
        })
        return ret
    }
}

// opt: {
//    this.str2args_fn = opt.str2args_fn                        // convert a string into arguments array (arguments input for hash, equal, create)
//    this.freeze_create_objects = opt.freeze_create_objects    // populate a readable _frozen_objects property when map or set is frozen (helps with manual inspection)
// }

function HSet (master, hash_fn, equal_fn, create_fn, opt) {
    this.master = master
    if (hash_fn || equal_fn || create_fn) {
        this.hash_fn = hash_fn || err('no hash function')           // hash arguments to integer
        this.equal_fn = equal_fn || err('no equal function')        // compare key with arguments (prev, arguments)
        this.create_fn = create_fn || err('no create function')     // create key from (hash, col, prev, arguments)
        this._lazy_create = true
    }
    this.opt = opt || {}
    this.map = new HMap(this, opt)
}

HSet.prototype = {
    HALT: HALT,
    constructor: HSet,

    hmap: function (opt) {
        return new HMap(this.master || this, opt || this.opt)
    },
    hmap_from_obj: function (obj, opt) {
        var ret = new HMap(this.master || this, opt || this.opt)
        ret.put_obj(obj)
    },
    // return a new set that delegates to this or this master for calls to put_create
    hset: function (opt) {
        return new HSet(this.master || this, null, null, null, opt || this.opt )
    },
    get: function (v) {
        return this.map.get(v)
    },
    _put_create: function (args) {
        // figure collision value (col)
        var map = this.map
        var hash = this.hash_fn(args)
        var prev = map.by_hash[hash]
        if (prev === undefined ) {
            return map.put_hc(hash, 0, args, this.create_fn)
        }
        if (this.equal_fn(prev, args)) {
            return map.put_hc(hash, 0, args, this.create_fn)
            // return (map.by_hash[hash] = this.create_fn(hash, 0, prev, arguments))    // faster?
        }
        var col = 0
        var cols = map.by_hash_col[hash]
        if (cols !== undefined) {
            while (col < cols.length && !this.equal_fn(cols[col], args)) {
                col++
            }
        }
        return map.put_hc(hash, col + 1, args, this.create_fn)
    },
    put_create: function () {
        if (this.master) {
            var obj = this.master.put_create(arguments)
            return this.put_hc(obj.hash, obj.col, obj)
        } else {
            this._lazy_create || err('put_create requires defining hash_fn, equal_fn, and create_fn for the master set')
            return this._put_create(arguments)
        }
    },
    put: function (val) {
        this.map.put(val, val, null)
    },
    put_all: function (a) {
        var map = this.map
        if (Array.isArray(a)) {
            for (var i=0; i<a.length; i++) {
                map.put_hc(a[i].hash, a[i].col, a[i])
            }
        } else {
            a.for_val(function (v) {
                map.put_hc(v.hash, v.col, v)
            })
        }
    },
    put_s: function (s) {
        var str2args = this.opt.str2args_fn || err('str2args_fn not defined')
        return this.put_create.apply(this, str2args(s))
    },
    get length() { return this.map.length },
    get_hc: function (h, c) { return this.map.get_hc(h, c) },
    same_hashes: function (b) { return this.map.same_hashes(b.map || b) },
    for_val: function (fn) { this.map.for_val(fn) },
    vals: function () {return this.map.vals() },
    collisions: function() { return this.map.collisions() },
    freeze: function () {
        if (this.freeze_create_objects) {
            this._frozen_objects = this.to_obj()
        }
        this.map._frozen = true
    },
    to_obj: function () {
        var ret = []
        this.map.for_val(function (v) {
            ret.push((v && v.to_obj) ? v.to_obj() : v)
        })
        return ret
    }
}

module.exports = {
    HALT: HALT,
    hash: hash,
    master: function (hash_fn, equal_fn, create_fn, opt) { return new HSet(null, hash_fn, equal_fn, create_fn, opt) }
}