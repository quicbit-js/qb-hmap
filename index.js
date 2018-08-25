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

var assign = require('qb-assign')
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

function for_sparse_val (a, fn) {
    Object.keys(a).forEach(function (i_str) {
        var i = parseInt(i_str)
        fn (a[i], i)
    })
}

// values stored by hash, then by collision 'col'
function HMap (key_set, opt) {
    this.opt = opt = (opt || {})
    this.key_set = key_set || null
    this.by_hash = []
    this.by_hash_col = []
    this._indexes = opt.insert_order || opt.insert_order == null ? [] : null
    this._frozen = false
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
    first: function () {
        var idx = this.indexes[0]
        return idx && this.get_hc(idx[0], idx[1])
    },
    last: function () {
        var indexes = this.indexes
        if (indexes.length === 0) { return undefined }
        var idx = indexes[indexes.length - 1]
        return this.get_hc(idx[0], idx[1])
    },
    put: function (key, val, create_fn) {
        var opt = this.key_set && this.key_set.opt || this.opt
        return this.put_hc(key.hash, key.col, val, create_fn)
    },
    // create injects custom construction of values to be placed into the map
    put_hc: function (h, c, val, create_fn) {
        !this._frozen || err('map is frozen')
        val !== undefined || err('cannot put undefined value')
        if (this.opt.validate_fn) {
            this.opt.validate_fn(val)
        }
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
        b = b.by_hash ? b : b.map       // accept sets
        if (a.by_hash.length !== b.by_hash.length || a.by_hash_col.length !== b.by_hash_col.length) {
            return false
        }
        var aind = a.indexes
        if (a.indexes.length !== b.indexes.length) {
            return false
        }

        for (var i=0; i<aind.length; i++) {
            if (aind[i][1] === 0) {
                if (!b.by_hash[aind[i][0]]) {
                    return false
                }
            } else {
                var ahash = aind[i][0]
                var acol = aind[i][1]
                if (!(b.by_hash_col[ahash] && b.by_hash_col[ahash][acol-1])) {
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
    // return arrays of colliding objects (for analysis)
    collisions: function () {
        var ret = []
        var by_hash = this.by_hash
        var by_hash_col = this.by_hash_col
        for_sparse_val (by_hash_col, function (by_col, h) {
            var colliding = [by_hash[h]]
            by_col.forEach(function (c) {
                colliding.push(c)
            })
            ret.push(colliding)
        })
        return ret
    },
    collision_count: function () {
        return this.collisions().reduce(function (t, ca) { return t + ca.length }, 0 )
    },
    freeze: function () {
        this._frozen = true
    },
    to_obj: function (opt) {
        var keys = []
        var string_keys = true
        this.for_key(function (k) {
            k = k.to_obj ? k.to_obj() : k
            if (typeof k !== 'string') {
                string_keys = false
            }
            keys.push(k)
        })
        var ret
        if (string_keys) {
            ret = {}
            this.for_val(function (v, i) {
                v = v.to_obj ? v.to_obj() : v
                ret[keys[i]] = v
            })
        } else {
            ret = []
            this.for_val(function (v, i) {
                v = v.to_obj ? v.to_obj() : v
                ret.push([keys[i], v])
            })
        }
        if (opt && opt.include_stats) {
            add_stats(this, ret)
        }
        return ret
    }
}

function HSet (master, opt) {
    this.master = master
    this.opt = opt = assign({}, opt)
    this.map = new HMap(master, opt)
}

HSet.prototype = {
    HALT: HALT,
    constructor: HSet,

    get: function (v) {
        return this.map.get(v)
    },
    put_create: function () {
        var ret = this.master.put_create(arguments)
        this.put_hc(ret.hash, ret.col, ret)
        return ret
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
        var ret = this.master.put_s(s)
        this.put(ret)
        return ret
    },
    get length() { return this.map.length },
    first: function () { return this.map.first() },
    last: function () { return this.map.last() },
    get_hc: function (h, c) { return this.map.get_hc(h, c) },
    same_hashes: function (b) { return this.map.same_hashes(b.map || b) },
    for_val: function (fn) { this.map.for_val(fn) },
    vals: function () {return this.map.vals() },
    collisions: function() { return this.map.collisions() },
    collision_count: function () { return this.map.collision_count() },
    freeze: function () {
        this.map._frozen = true
    },
    to_obj: function (opt) {
        var ret = []
        this.map.for_val(function (v) {
            ret.push((v && v.to_obj) ? v.to_obj() : v)
        })
        if (opt && opt.include_stats) {
            add_stats(this, ret)
        }
        return ret
    }
}

// the master set is populated with all values in any offspring sets and hmaps.
function MasterSet (master_fns, opt) {
    HSet.call(this, this, opt || {})
    master_fns.hash_fn || err('no hash function')           // hash arguments to integer
    master_fns.equal_fn || err('no equal function')        // compare key with arguments (prev, arguments)
    master_fns.create_fn || err('no create function')     // create key from (hash, col, prev, arguments)
    this.master_fns = assign({}, master_fns)
}

MasterSet.prototype = extend(HSet.prototype, {
    constructor: MasterSet,
    hmap: function (opt) {
        return new HMap(this, assign({}, this.opt, opt))
    },
    // return a new set that delegates to this or this master for calls to put_create
    hset: function (opt) {
        return new HSet(this, assign({}, this.opt, opt))
    },
    put_create: function () {
        return this._put_create(arguments)
    },
    _put_create: function (args) {
        if (this.master_fns.validate_args_fn) {
            this.master_fns.validate_args_fn(args)
        }
        // figure collision value (col)
        var map = this.map
        var hash = this.master_fns.hash_fn(args)
        var prev = map.by_hash[hash]
        if (prev === undefined ) {
            return map.put_hc(hash, 0, args, this.master_fns.create_fn)
        }
        if (this.master_fns.equal_fn(prev, args)) {
            return map.put_hc(hash, 0, args, this.master_fns.create_fn)
            // return (map.by_hash[hash] = this.master_fns.create_fn(hash, 0, prev, arguments))    // faster?
        }
        var col = 0
        var cols = map.by_hash_col[hash]
        if (cols !== undefined) {
            while (col < cols.length && !this.master_fns.equal_fn(cols[col], args)) {
                col++
            }
        }
        return map.put_hc(hash, col + 1, args, this.master_fns.create_fn)
    },
    put_s: function (s) {
        var str2args = this.master_fns.str2args_fn || err('str2args_fn must be defined to use put_s and put_obj')
        return this.put_create.apply(this, str2args(s))
    },
})

function add_stats (src, target) {
    var collision_count = src.collision_count()
    if (collision_count) {
        if (Array.isArray(target)) {
            target.push( {$collisions: collision_count})
        } else {
            target.$collisions = collision_count
        }
    }
}

// a set that wraps string and handles conversion to/from arrays - commonly needed for testing
function string_set (opt) {
    return new MasterSet({
        hash_fn: function str_hash (args) {
            var s = args[0]
            var h = 0
            for (var i = 0; i < s.length; i++) {
                h = 0x7FFFFFFF & ((h * 33) ^ s.charCodeAt(i))
            }
            return h
        },
        equal_fn: function str_equal (sobj, args) {
            return sobj.s === args[0]
        },
        create_fn: function str_create (hash, col, prev, args) {
            return prev || new Str(hash, col, args[0])
        },
        str2args_fn: function (s) { return [s] },
    }, opt)
}

function Str (hash, col, s) {
    this.hash = hash
    this.col = col
    this.s = s
}

Str.prototype = {
    constructor: Str,
    toString: function () { return this.s },
    to_obj: function () { return this.s }
}

module.exports = {
    HALT: HALT,
    hash: hash,
    set: function (opt) { return new MasterSet(opt) },
    string_set: string_set,
}