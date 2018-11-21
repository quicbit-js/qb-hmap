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
var tbase = require('qb1-type-base')
var STR_TYPE = tbase.lookup('str')

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

// values stored by hash, then by collision 'col'.  master resolves and holds all keys (assigns hash/collision)
function HMap (master, by_hash, by_hash_col, h_arr, c_arr, opt) {
    this.opt = opt
    this.master = master                // master key-generator (assigns hash/col)
    this.by_hash = by_hash
    this.by_hash_col = by_hash_col      // [hash][collision - 1] tuple  (collision 0 is in the by_hash array)
    this.h_arr = h_arr
    this.c_arr = c_arr
    this.vtype = opt.vtype || null
}

HMap.prototype = {
    HALT: HALT,
    constructor: HMap,
    get length () { return this.h_arr.length },
    get first () { return this.h_arr.length === 0 ? undefined : this.get_hc(this.h_arr[0], this.c_arr[0]) },
    get last () {
        return this.h_arr.length === 0
            ? undefined
            : this.get_hc(this.h_arr[this.h_arr.length-1], this.c_arr[this.c_arr.length - 1])
    },
    clear: function () {
        this.by_hash.length = 0
        this.by_hash_col.length = 0
        this.h_arr.length = 0
        this.c_arr.length = 0
    },
    cop: function (n) {
        if (n != null) {
            var q = n < 0 ? -1 : n
            q >= this.length || err('map only supports full copy (n >= length): ' + n)
        }
        return new HMap(
            this.master,
            this.by_hash.slice(),
            this.by_hash_col.slice(),
            this.h_arr.slice(),
            this.c_arr.slice(),
            this.opt
        )
    },
    put: function (key, val) {
        if (key.hash == null) {
            key = this.master.put_create(key)
        }
        this.put_hc(key.hash, key.col, val)
        return val
    },
    // put_merge_fn (h, c, prev, v) can manage behavior and updates for colliding and new values.
    // When a value is put, put_merge is called on previous and new values and the value returned
    // is placed in the map (replacement) if it is !== previous.
    // Allowing the put_merge to be injected here instead of storing and paramaterizing simplifies
    // the work of MasterSet to create objects after determining hash values.
    put_hc: function (h, c, val) {
        val !== undefined || err('cannot put undefined value')
        h >= 0 || err('invalid hash: ' + h)
        var prev
        if (c === 0) {
            prev = this.by_hash[h]
            if (val !== prev) {         // checking val !== prev improved performance of type scanning by 15%
                this.by_hash[h] = val
            }
        } else if (c > 0) {
            var cols = this.by_hash_col[h]
            if (!cols) {
                cols = this.by_hash_col[h] = []
                cols[c - 1] = val
            } else {
                prev = cols[c - 1]
                if (val !== prev) {
                    cols[c - 1] = val
                }
            }
        } else {
            err ('invalid collision: ' + c)
        }
        if (prev === undefined) { this.h_arr.push(h); this.c_arr.push(c) }
    },
    // put all keys and values of the given object
    put_obj: function (obj) {
        var self = this
        var kset = this.master
        Object.keys(obj).forEach(function (k) { self.put(kset.put(k), obj[k]) })
    },
    get: function (key) {
        if (!(key.hash >= 0)) {
            key = this.master.put_create(key)
        }
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
        if (a.h_arr.length !== b.h_arr.length) {
            return false
        }
        var a_harr = a.h_arr
        var a_carr = a.c_arr
        var len = a_harr.length
        for (var i = 0; i < len; i++) {
            if (a_carr[i] === 0) {
                if (!b.by_hash[a_harr[i]]) {
                    return false
                }
            } else {
                // collision
                if (!(b.by_hash_col[a_harr[i]] && b.by_hash_col[ a_harr[i] ][ a.c_arr[i] - 1 ])) {
                    return false
                }
            }
        }
        return true
    },
    for_key_val: function (fn) { return this._for_key_val(fn, true) },
    for_key: function (fn) {
        var key_set = this.master
        var harr = this.h_arr
        var carr = this.c_arr
        var len = harr.length
        for (var i = 0; i < len; i++) {
            var res = fn(key_set && key_set.map.get_hc(harr[i], carr[i]) || [harr[i], carr[i]], i)
            if (res === HALT) {
                break
            }
        }
    },
    for_val: function (fn) { return this._for_key_val(fn, false) },
    _for_key_val: function (fn, with_keys) {
        var key_set = with_keys ? this.master : null
        var harr = this.h_arr
        var carr = this.c_arr
        var len = harr.length
        for (var i=0; i < len; i++) {
            var k = key_set && key_set.map.get_hc(harr[i], carr[i]) || [harr[i], carr[i]]
            var v = carr[i] === 0 ? this.by_hash[harr[i]] : this.by_hash_col[harr[i]][carr[i] - 1]
            var res = with_keys ? fn(k, v, i) : fn(v, i)
            if (res === HALT) {
                break
            }
        }
    },
    find: function (fn) {
        var ret
        this._for_key_val(function (v) {
            if (fn(v)) {
                ret = v
                return HALT
            }
        })
        return ret
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

function HSet (map) {
    this.map = map
    this.master = this.map.master
}

HSet.prototype = {
    HALT: HALT,
    constructor: HSet,

    // public master (always returns the master, which may be the set itself)
    get: function (v) {
        return this.map.get(v)
    },
    put: function (v) {
        if (!(v.hash >= 0)) {
            v = this.master.put_create(v)
        }
        this.map.put_hc(v.hash, v.col, v, null)
        return v
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
    get length () { return this.map.length },
    get first () { return this.map.first },
    get last () { return this.map.last },
    get_hc: function (h, c) { return this.map.get_hc(h, c) },
    same_hashes: function (b) { return this.map.same_hashes(b.map || b) },
    for_val: function (fn) { this.map.for_val(fn) },
    find: function (fn) { return this.map.find(fn) },
    vals: function () {return this.map.vals() },
    collisions: function() { return this.map.collisions() },
    collision_count: function () { return this.map.collision_count() },
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
function MasterSet (value_fns, opt) {
    value_fns.hash_fn || err('no hash function')     // fn (v)        hash input value to integer
    value_fns.equal_fn || err('no equal function')   // fn (prev, v)  compare previous stored object with new value
    value_fns.put_merge_fn || err('no put_merge function') // fn (hash, col, prev, v) prepare/transform a value for storage
    this.value_fns = assign({}, value_fns)
    this.opt = assign({}, opt)
    this.vtype = opt.vtype || null
    HSet.call(this, new HMap(this, [], [], [], [], this.opt))
}

MasterSet.prototype = extend(HSet.prototype, {
    constructor: MasterSet,
    hmap: function (opt) {
        return new HMap(this, [], [], [], [], assign({}, this.opt, opt))
    },
    // return a new set that delegates to this or this master for calls to put_create
    hset: function (opt) {
        return new HSet(this.hmap(opt))
    },
    put_create: function (v) {
        if (this.value_fns.prep_fn) {
            v = this.value_fns.prep_fn(v)
        }
        // find previous value and collision number
        var map = this.map
        var hash = this.value_fns.hash_fn(v)
        var prev = map.by_hash[hash]
        var col = 0
        if (prev !== undefined && !this.value_fns.equal_fn(prev, v)) {      // collision
            prev = undefined
            if (map.by_hash_col[hash]) {
                var collisions = map.by_hash_col[hash]
                while (col < collisions.length) {
                    if(this.value_fns.equal_fn(collisions[col], v)) {
                        prev = collisions[col]
                        break
                    }
                    col++
                }
            }
            col = col + 1   // collision number starts at 1 in the collisions map
        }
        if (prev === undefined) {
            v = this.value_fns.put_merge_fn(hash, col, undefined, v)
            map.put_hc(hash, col, v)
            return v
        } else {
            this.value_fns.put_merge_fn(hash, col, prev, null)
            return prev
        }
    }
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

// todo: move this to buffer lib and try end/begin/prime-cycling strategies on large buffers (find differences faster)
function buf_equal (a, aoff, alim, b, boff, blim) {
    var len = alim - aoff
    if (blim - boff !== len) { return false }
    if (aoff === boff) {
        while (--alim >= aoff) { if (a[alim] !== b[alim]) return false }
    } else {
        var adj = alim - blim
        while (--alim >= aoff) { if (a[alim] !== b[alim - adj]) return false }
    }
    return true
}

// a set that represents strings as utf8 buffers.  can be used with string keys or
// with utf8 encoded buffer segments with 'arr', 'off', and 'lim' parameters.  It is optimized for
// working with raw buffer segments
// (always creates buffer segments for js strings, but creates strings only when requested to do so via to_obj()).
function string_set (opt) {
    var default_fns = {
        prep_fn: function (src) {
            var ret = src
            if (src.src) {
                src.src.length != null || err('invalid src.src: ' + src)
                src.off != null || err('missing src.off')
                src.lim != null || err('missing src.lim')
            } else {
                if (typeof src === 'string') {
                    ret = Buffer.from(src)
                } else {
                    Array.isArray(src) || ArrayBuffer.isView(src) || err('invalid src: ' + src)
                }
            }
            return ret
        },
        hash_fn: function (src) {
            var off, lim
            if (src.src) { off = src.off; lim = src.lim; src = src.src }
            else { off = 0; lim = src.length }
            var h = 0
            for (var i = off; i < lim; i++) {
                h = 0x7FFFFFFF & ((h * 33) ^ src[i])
            }
            return h
        },
        equal_fn: function (buf_obj, src) {
            var off, lim
            if (src.src) { off = src.off; lim = src.lim; src = src.src }
            else { off = 0; lim = src.length }
            return buf_equal(buf_obj.src, buf_obj.off, buf_obj.lim, src, off, lim)
        },
        put_merge_fn: function (hash, col, prev, src) {
            if (prev) { return prev }
            var off, lim
            if (src.src) { off = src.off; lim = src.lim; src = src.src }
            else { off = 0; lim = src.length }
            return new StrBuf(hash, col, src, off, lim)
        },
    }
    return new MasterSet(assign({}, default_fns), assign({}, opt, {vtype: STR_TYPE}))
}

function buf_to_str () {
    if (this.str == null) {
        this.str = Buffer.from(this.src, this.off, this.lim - this.off).toString()
    }
    return this.str
}

function StrBuf (hash, col, src, off, lim) {
    this.hash = hash
    this.col = col
    this.src = src.slice(off, lim)
    this.off = 0
    this.lim = this.src.length
}

StrBuf.prototype = {
    constructor: StrBuf,
    get raw_array () { return this.src },           // raw_array "interface" - along with off and lim.
    toString: buf_to_str,
    to_obj: buf_to_str,
}

function for_val (a, fn) {
    if (a.for_val) {
        a.for_val(fn)
    } else {
        a.forEach(fn)
    }
}

function first (a) {
    return a.first ? a.first : a[0]
}

function last (a) {
    return a.last ? a.last : a[a.length-1]
}

module.exports = {
    HALT: HALT,
    hash: hash,
    for_val: for_val,
    first: first,
    last: last,
    set: function (master_fns, opt) { return new MasterSet(master_fns, assign({}, opt)) },
    string_set: string_set,
}