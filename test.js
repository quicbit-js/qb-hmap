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

var test = require('test-kit').tape()
var assign = require('qb-assign')
var hmap = require('.')

function create_map(master_set, hc_vals, opt, create) {
    master_set = master_set || hmap.master(null, null, create, opt)
    opt = assign( {test_mode: 1}, opt)

    var map = master_set.hmap(opt)
    hc_vals.forEach(function (hcv) {
        map.put_hc(hcv[0], hcv[1], hcv[2], create)
    })
    return map
}

test('hash', function (t) {
    t.table_assert([
        [ 'a',      'b',    'exp' ],
        [ 1,        2,      35 ],
        [ 35,       3,      1152 ],
        [ 1152,     4,      38020 ],
        [ 97,       98,     3299 ],
        [ 3299,     99,     108832 ],
        [ 108832,   99,     3591491 ],
    ], hmap.hash)
})

test('hmap to_obj', function (t) {
    t.table_assert([
        [ 'hc_vals',                                              'opt', 'exp' ],
        [ [ [0, 0, 'a'] ],                                        null,  [ 'a' ] ],
        [ [ [1, 0, 'b'] ],                                        null,  [ 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'] ],                           null,  [ 'a', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [0, 0, 'c'] ],              null,  [ 'c', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [0, 0, 'b'] ],              null,  [ 'b', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],              null,  [ 'a', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 1, 'c'] ],              null,  [ 'a', 'b', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'] ],              null,  [ 'a', 'b', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], {insert_order:0}, [ 'a', 'b', 'd', 'c' ] ],
        [ [ [0, 0, 'a'] ],                                        {insert_order:1},  [ 'a' ] ],
        [ [ [1, 0, 'b'] ],                                        {insert_order:1},  [ 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'] ],                           {insert_order:1},  [ 'a', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [0, 0, 'c'] ],              {insert_order:1},  [ 'c', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [0, 0, 'b'] ],              {insert_order:1},  [ 'b', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],              {insert_order:1},  [ 'a', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 1, 'c'] ],              {insert_order:1},  [ 'a', 'b', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'] ],              {insert_order:1},  [ 'a', 'b', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], {insert_order:1},  [ 'a', 'b', 'c', 'd' ] ],
    ], function (hc_vals, opt) {
        return create_map(null, hc_vals, opt).vals()
    })
})

test('hmap collisions', function (t) {
    t.table_assert([
        [ 'hc_vals',                                              'exp' ],
        [ [ [0, 0, 'a'] ],                                        [] ],
        [ [ [1, 0, 'b'] ],                                        [] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'] ],                           [] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [0, 0, 'c'] ],              [] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [0, 0, 'b'] ],              [] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],              [] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 1, 'c'] ],              [ ['b', 'c'] ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'] ],              [ ['b', 'c'] ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], [ ['b', 'd', 'c'] ] ],
    ], function (hc_vals, opt) {
        return create_map(null, hc_vals, opt).collisions()
    })
})

test('hmap indexes', function (t) {
    t.table_assert([
        [ 'hc_vals',                                                'opt',   'exp' ],
        [ [ [0, 0, 'a'] ],                                          null,    [ [0, 0] ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],                null,    [ [0, 0], [1, 0] ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'] ],                null,    [ [0, 0], [1, 0], [1, 2] ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ],   {insert_order:0},    [ [0, 0], [1, 0], [1, 1], [1, 2] ] ],
        [ [ [0, 0, 'a'] ],                                          {insert_order:1},    [ [0, 0] ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],                {insert_order:1},    [ [0, 0], [1, 0] ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'] ],                {insert_order:1},    [ [0, 0], [1, 0], [1, 2] ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ],   {insert_order:1},    [ [0, 0], [1, 0], [1, 2], [1, 1] ] ],
    ], function (hc_vals, opt) {
        return create_map(null, hc_vals, opt).indexes
    })
})

test('hmap for_val', function (t) {
    t.table_assert([
        [ 'hc_vals',                                              'halt', 'opt',               'exp' ],
        [ [ [0, 0, 'a'] ],                                        9,      null,                [ 'a' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],              9,      null,                [ 'a', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 9,      {insert_order:0},    [ 'a', 'b', 'd', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 0,      null,                [] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 1,      null,                [ 'a' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 2,      null,                [ 'a', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 4,      { insert_order:0 },  [ 'a', 'b', 'd', 'c' ] ],
        [ [ [0, 0, 'a'] ],                                        9,      { insert_order: 1 }, [ 'a' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],              9,      { insert_order: 1 }, [ 'a', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 9,      { insert_order: 1 }, [ 'a', 'b', 'c', 'd' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 0,      { insert_order: 1 }, [] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 1,      { insert_order: 1 }, [ 'a' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 2,      { insert_order: 1 }, [ 'a', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 4,      { insert_order: 1 }, [ 'a', 'b', 'c', 'd' ] ],
    ], function (hc_vals, halt, opt) {
        var map = create_map(null, hc_vals, opt)
        var ret = []
        map.for_val(function (v, i) {
            if (i === halt) {
                return map.HALT
            }
            ret.push(v)
        })
        return ret
    })
})

test('hmap for_key_val', function (t) {
    t.table_assert([
        [ 'hc_vals',                                              'halt', 'opt',               'exp' ],
        [ [ [0, 0, 'a'] ],                                        9,      null,                [ [0, 0], 'a' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],              9,      null,                [ [0, 0], 'a', [1, 0], 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 9,      { insert_order: 0 }, [ [0, 0], 'a', [1, 0], 'b', [1, 1], 'd', [1, 2], 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 0,      null,                [] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 1,      null,                [ [0, 0], 'a' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 2,      null,                [ [0, 0], 'a', [1, 0], 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 4,      { insert_order: 0 }, [ [0, 0], 'a', [1, 0], 'b', [1, 1], 'd', [1, 2], 'c' ] ],
        [ [ [0, 0, 'a'] ],                                        9,      { insert_order: 1 }, [ [0, 0], 'a' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],              9,      { insert_order: 1 }, [ [0, 0], 'a', [1, 0], 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 9,      { insert_order: 1 }, [ [0, 0], 'a', [1, 0], 'b', [1, 2], 'c', [1, 1], 'd' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 0,      { insert_order: 1 }, [] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 1,      { insert_order: 1 }, [ [0, 0], 'a' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 2,      { insert_order: 1 }, [ [0, 0], 'a', [1, 0], 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 4,      { insert_order: 1 }, [ [0, 0], 'a', [1, 0], 'b', [1, 2], 'c', [1, 1], 'd' ] ],
    ], function (hc_vals, halt, opt) {
        var map = create_map(null, hc_vals, opt)
        var ret = []
        map.for_key_val(function (k, v, i) {
            if (i === halt) {
                return map.HALT
            }
            ret.push(k)
            ret.push(v)
        })
        return ret
    })
})

test('hmap vals', function (t) {
    t.table_assert([
        [ 'hc_vals',                                                    'opt',      'exp' ],
        [ [ [0, 0, 'a'] ],                                              null,       [ 'a' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],                    null,       [ 'a', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ],       { insert_order: 0 },       [ 'a', 'b', 'd', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ],       { insert_order: 1 },       [ 'a', 'b', 'c', 'd' ] ],
    ], function (hc_vals, opt) {
        return create_map(null, hc_vals, opt).vals()
    })
})

test('hmap length', function (t) {
    t.table_assert([
        [ 'hc_vals',                                                    'opt',      'exp' ],
        [ [ [0, 0, 'a'] ],                                              null,       1 ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ],       null,       4 ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ],       { insert_order: 1 },       4 ],
    ], function (hc_vals, opt) {
        return create_map(null, hc_vals, opt).length
    })
})

test('hmap get', function (t) {
    var map_vals = [
        [0, 0, 'a'],
        [1, 0, 'b'],
        [1, 3, 'c'],
        [1, 1, 'd']
    ]
    var map = create_map(null, map_vals)
    t.table_assert([
        [ 'h', 'c', 'exp' ],
        [ 0,   0,   'a' ],
        [ 0,   1,   undefined ],
        [ 1,   0,   'b' ],
        [ 1,   3,   'c' ],
        [ 1,   4,   undefined ],
    ], function (h, c) {
        return map.get({hash: h, col: c})
    })
})

test('hmap put', function (t) {
    var map_vals = [
        [0, 0, 'a'],
        [1, 0, 'b'],
        [1, 3, 'c'],
        [1, 1, 'd']
    ]
    t.table_assert([
        [ 'h', 'c', 'v', 'opt', 'exp' ],
        [ 1,   4,   'e', { insert_order: 0 },  [ 'e', ['a', 'b', 'd', 'c', 'e'] ] ],
        [ 1,   3,   'e', { insert_order: 0 },  [ 'e', ['a', 'b', 'd', 'e'] ] ],
    ], function (h, c, v, opt) {
        var map = create_map(null, map_vals, opt)
        var ret = map.put({hash: h, col: c}, v)
        return [ret, map.vals()]
    })
})

test('hmap put_hc', function (t) {
    var map_vals = [
        [0, 0, 'a'],
        [1, 0, 'b'],
        [1, 3, 'c'],
        [1, 1, 'd']
    ]
    function create_plus_one (h, c, prev, val) {
        return String.fromCharCode(val.charCodeAt(0) + 1)
    }
    t.table_assert([
        [ 'h', 'c', 'v', 'create1', 'opt', 'exp' ],
        [ 1,   0,   'e', 0,         { insert_order: 0 },  [ 'e', ['a', 'e', 'd', 'c'] ] ],
        [ 1,   4,   'e', 0,         { insert_order: 0 },  [ 'e', ['a', 'b', 'd', 'c', 'e'] ] ],
        [ 1,   3,   'e', 0,         { insert_order: 0 },  [ 'e', ['a', 'b', 'd', 'e'] ] ],
        [ 1,   0,   'e', 1,         { insert_order: 0 },  [ 'f', ['a', 'f', 'd', 'c'] ] ],
        [ 1,   4,   'e', 1,         { insert_order: 0 },  [ 'f', ['a', 'b', 'd', 'c', 'f'] ] ],
        [ 1,   3,   'e', 1,         { insert_order: 0 },  [ 'f', ['a', 'b', 'd', 'f'] ] ],
    ], function (h, c, v, create1, opt) {
        var map = create_map(null, map_vals, opt)
        var ret = map.put_hc(h, c, v, create1 ? create_plus_one : null)
        return [ret, map.vals()]
    })
})
test('hmap errors', function (t) {
    var map = create_map(null, [[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], {test_mode: 1, insert_order: 1})
    t.table_assert([
        [ 'method',     'args',                     'exp' ],
        [ 'put_hc',     [],                         /undefined value/ ],
        [ 'put_hc',     [undefined,0,'a'],          /invalid hash/ ],
        [ 'put_hc',     [1,undefined,'a'],          /invalid collision/ ],
        [ 'get_hc',     [],                         /invalid hash/ ],
        [ 'get_hc',     [1],                        /invalid collision/ ],
    ], function (method, args) {
        map[method].apply(map, args)
    }, {assert:'throws'})
})

test('hset', function (t) {
    var hash_fn = function (args) { return (args[0].charCodeAt(0) % 3) }  // creates collisions a..d..g..j...
    var equal_fn = function (prev, args) { return prev.v === args[0] }
    var create_fn = function (h, c, prev, args) { return {hash: h, col: c, v: args[0] } }
    t.table_assert([
        [ 'keys',                 'opt', 'exp' ],
        [ [],                     null,  [] ],
        [ [ 'a' ],                null,  [ {hash: 1, col: 0, v: 'a'} ] ],
        [ [ 'a', 'a' ],           null,  [ {hash: 1, col: 0, v: 'a'} ] ],
        [ [ 'a', 'b' ],           null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 2, col: 0, v: 'b'} ] ],
        [ [ 'a', 'b', 'a' ],      null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 2, col: 0, v: 'b'} ] ],
        [ [ 'a', 'd' ],           null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 1, col: 1, v: 'd'} ] ],
        [ [ 'a', 'd', 'a' ],      null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 1, col: 1, v: 'd'} ] ],
        [ [ 'a', 'd', 'g' ],      null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 1, col: 1, v: 'd'}, {hash: 1, col: 2, v: 'g'} ] ],
        [ [ 'a', 'd', 'g', 'd' ], null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 1, col: 1, v: 'd'}, {hash: 1, col: 2, v: 'g'} ] ],
    ], function (keys, opt) {
        var kset = hmap.master(hash_fn, equal_fn, create_fn)
        keys.forEach(function (k) { kset.put_create(k) })
        return kset.vals()
    })
})

test('hset put existing', function (t) {
    var hash_fn = function (args) { return (args[0].charCodeAt(0) % 3) }  // creates collisions a..d..g..j...
    var equal_fn = function (prev, args) { return prev.v === args[0] }
    var create_fn = function (h, c, prev, args) { return {hash: h, col: c, v: args[0] } }
    t.table_assert([
        [ 'keys',                 'opt', 'exp' ],
        [ [],                     null,  [] ],
        [ [ 'a' ],                null,  [ {hash: 1, col: 0, v: 'a'} ] ],
        [ [ 'a', 'a' ],           null,  [ {hash: 1, col: 0, v: 'a'} ] ],
        [ [ 'a', 'b' ],           null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 2, col: 0, v: 'b'} ] ],
        [ [ 'a', 'b', 'a' ],      null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 2, col: 0, v: 'b'} ] ],
    ], function (keys, opt) {
        var kset = hmap.master(hash_fn, equal_fn, create_fn)
        var objs = keys.map(function (k) { return kset.put_create(k) })
        var kset2 = hmap.master(hash_fn, equal_fn, create_fn)
        objs.forEach(function (o) { kset2.put(o) })
        return kset2.vals()
    })
})

test('hset to_obj()', function (t) {
    var hash_fn = function (args) { return (args[0].charCodeAt(0) % 3) }  // creates collisions a..d..g..j...
    var equal_fn = function (prev, args) { return prev.v === args[0] }
    var create_fn = function (h, c, prev, args) { return {hash: h, col: c, v: args[0] } }
    t.table_assert([
        [ 'keys',                 'opt', 'exp' ],
        [ [],                     null,  [] ],
        [ [ 'a' ],                null,  [ {hash: 1, col: 0, v: 'a'} ] ],
        [ [ 'a', 'a' ],           null,  [ {hash: 1, col: 0, v: 'a'} ] ],
        [ [ 'a', 'b' ],           null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 2, col: 0, v: 'b'} ] ],
        [ [ 'a', 'b', 'a' ],      null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 2, col: 0, v: 'b'} ] ],
        [ [ 'a', 'd' ],           null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 1, col: 1, v: 'd'} ] ],
        [ [ 'a', 'd', 'a' ],      null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 1, col: 1, v: 'd'} ] ],
        [ [ 'a', 'd', 'g' ],      null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 1, col: 1, v: 'd'}, {hash: 1, col: 2, v: 'g'} ] ],
        [ [ 'a', 'd', 'g', 'd' ], null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 1, col: 1, v: 'd'}, {hash: 1, col: 2, v: 'g'} ] ],
    ], function (keys, opt) {
        var kset = hmap.master(hash_fn, equal_fn, create_fn)
        keys.forEach(function (k) { kset.put_create(k) })
        return kset.to_obj()
    })
})

test('hset length', function (t) {
    var hash_fn = function (args) { return (args[0].charCodeAt(0) % 3) }  // creates collisions a..d..g..j...
    var equal_fn = function (prev, args) { return prev.v === args[0] }
    var create_fn = function (h, c, prev, args) { return {hash: h, col: c, v: args[0] } }
    t.table_assert([
        [ 'keys',                 'opt', 'exp' ],
        [ [],                     null,  0 ],
        [ [ 'a' ],                null,  1 ],
        [ [ 'a', 'a' ],           null,  1 ],
        [ [ 'a', 'b' ],           null,  2 ],
        [ [ 'a', 'b', 'a' ],      null,  2 ],
        [ [ 'a', 'd' ],           null,  2 ],
        [ [ 'a', 'd', 'a' ],      null,  2 ],
        [ [ 'a', 'd', 'g' ],      null,  3 ],
        [ [ 'a', 'd', 'g', 'd' ], null,  3 ],
    ], function (keys, opt) {
        var kset = hmap.master(hash_fn, equal_fn, create_fn)
        keys.forEach(function (k) { kset.put_create(k) })
        return kset.length
    })
})
