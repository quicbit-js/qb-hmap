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
var hmap = require('.')

function create_map(hc_vals, opt) {
    var map = hmap.string_set(null, null, opt).hmap()
    hc_vals.forEach(function (hcv) {
        map.put_hc(hcv[0], hcv[1], hcv[2])
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
    ], function (hc_vals) {
        return create_map(hc_vals).collisions()
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
        return create_map(hc_vals, opt).indexes
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
        var map = create_map(hc_vals, opt)
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
        var map = create_map(hc_vals, opt)
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
        [ 'hc_vals',                                              'opt', 'exp' ],
        [ [ [0, 0, 'a'] ],                                        null,  [ 'a' ] ],
        [ [ [1, 0, 'b'] ],                                        null,  [ 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'] ],                           null,  [ 'a', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [0, 0, 'c'] ],              null,  [ 'c', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [0, 0, 'b'] ],              null,  [ 'b', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],              null,  [ 'a', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 1, 'c'] ],              null,  [ 'a', 'b', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'] ],              null,  [ 'a', 'b', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], {insert_order:0},  [ 'a', 'b', 'd', 'c' ] ],
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
        return create_map(hc_vals, opt).vals()
    })
})

test('hmap to_obj', function (t) {
    t.table_assert([
        [ 'master_vals', 'master_opt',          'hmap_vals',    'to_obj_opt',           'exp' ],
        [ [ 'a' ],       null,                  { a: 1 },       null,                   [ [{hash:1,col:0,v:'a'}, 1] ] ],
        [ [ 'a', 'b' ],  null,                  { a: 1, b: 2 }, null,                   [ [{hash:1,col:0,v:'a'}, 1], [{hash:2,col:0,v:'b'}, 2] ] ],
        [ [ 'a', 'b' ],  null,                  { a: 1, b: 2 }, {include_stats:1},      [ [{hash:1,col:0,v:'a'}, 1], [{hash:2,col:0,v:'b'}, 2] ] ],
        [ [ 'a' ],       { support_to_obj: 1 }, { a: 1 },       null,                   { a: 1 } ],
        [ [ 'a', 'd' ],  { support_to_obj: 1 }, { a: 1, d: 2 }, {include_stats:1},      { a: 1, d: 2, $collisions: 2 } ],
    ], function (master_vals, master_opt, hmap_vals, to_obj_opt) {
        var master = set_mod3(master_opt)
        var map = master.hmap()
        map.put_obj(hmap_vals)
        return map.to_obj(to_obj_opt)
    })
})

test('hmap length', function (t) {
    t.table_assert([
        [ 'hc_vals',                                                    'opt',      'exp' ],
        [ [ [0, 0, 'a'] ],                                              null,       1 ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ],       null,       4 ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ],       { insert_order: 1 },       4 ],
    ], function (hc_vals, opt) {
        return create_map(hc_vals, opt).length
    })
})

test('hmap get', function (t) {
    var map_vals = [
        [0, 0, 'a'],
        [1, 0, 'b'],
        [1, 3, 'c'],
        [1, 1, 'd']
    ]
    var map = create_map(map_vals)
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
        var map = create_map(map_vals, opt)
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
        var map = create_map(map_vals, opt)
        var ret = map.put_hc(h, c, v, create1 ? create_plus_one : null)
        return [ret, map.vals()]
    })
})

test('freeze', function (t) {
    var master = set_mod3({insert_order: false, support_to_obj: true})
    var set = master.hset()

    var map = master.hmap()
    var xyz = set.put_s('xyz')

    // with no insert order, indexes are stored only if input is frozen
    t.same(set.to_obj(), ['xyz'])
    t.same(set.map._indexes, null)
    t.same(master.to_obj(), ['xyz'] )
    t.same(master.map._indexes, null)
    master.freeze()
    t.same(master.to_obj(), ['xyz'] )
    t.same(master.map._indexes, [ [ 0, 0 ] ])      // indexes are saved

    t.throws(function () {set.put_s('pdq')}, /map is frozen/)
    t.throws(function () {master.put_s('pdq')}, /map is frozen/)
    t.end()
})

test('freeze collision', function (t) {
    var master = set_mod3({insert_order: false, support_to_obj: true})
    var map = master.hmap()
    var log = console.log
    map.put_s('a', 'aval')
    map.put_s('b', 'bval')
    map.put_s('c', 'cval')
    map.put_s('d', 'dval')       // collision value
    map.freeze()

    var d = master.put_s('d')
    t.same(map.get(d), 'dval', 'get d')
    map.put(d, 'dval')              // ok, same as before

    t.throws(function () {map.put(d, 'xxxxx')}, /map is frozen/, 'collision put')
    t.end()
})

test('hmap errors', function (t) {
    var map = create_map([[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], {test_mode: 1, insert_order: 1})
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
        var kset = set_mod3()
        keys.forEach(function (k) { kset.put_create(k) })
        return kset.vals()
    })
})

test('hset put existing', function (t) {
    t.table_assert([
        [ 'keys',                 'opt', 'exp' ],
        [ [],                     null,  [] ],
        [ [ 'a' ],                null,  [ {hash: 1, col: 0, v: 'a'} ] ],
        [ [ 'a', 'a' ],           null,  [ {hash: 1, col: 0, v: 'a'} ] ],
        [ [ 'a', 'b' ],           null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 2, col: 0, v: 'b'} ] ],
        [ [ 'a', 'b', 'a' ],      null,  [ {hash: 1, col: 0, v: 'a'}, {hash: 2, col: 0, v: 'b'} ] ],
    ], function (keys, opt) {
        var kset = set_mod3()
        var objs = keys.map(function (k) { return kset.put_create(k) })
        var kset2 = set_mod3()
        objs.forEach(function (o) { kset2.put(o) })
        return kset2.vals()
    })
})

test('hset to_obj()', function (t) {
    t.table_assert([
        [ 'keys',                 'support_to_obj', 'exp' ],
        [ [],                     0,                 [] ],
        [ [ 'a' ],                0,              [ {hash: 1, col: 0, v: 'a'} ] ],
        [ [ 'a', 'a' ],           0,              [ {hash: 1, col: 0, v: 'a'} ] ],
        [ [ 'a', 'b' ],           0,              [ {hash: 1, col: 0, v: 'a'}, {hash: 2, col: 0, v: 'b'} ] ],
        [ [ 'a', 'b', 'a' ],      0,              [ {hash: 1, col: 0, v: 'a'}, {hash: 2, col: 0, v: 'b'} ] ],
        [ [ 'a', 'd' ],           0,              [ {hash: 1, col: 0, v: 'a'}, {hash: 1, col: 1, v: 'd'} ] ],
        [ [ 'a', 'd', 'a' ],      0,              [ {hash: 1, col: 0, v: 'a'}, {hash: 1, col: 1, v: 'd'} ] ],
        [ [ 'a', 'd', 'g' ],      0,              [ {hash: 1, col: 0, v: 'a'}, {hash: 1, col: 1, v: 'd'}, {hash: 1, col: 2, v: 'g'} ] ],
        [ [ 'a', 'd', 'g', 'd' ], 1,              [ 'a', 'd', 'g' ] ],
    ], function (keys, support_to_obj) {
        var kset = set_mod3({support_to_obj: support_to_obj})
        keys.forEach(function (k) { kset.put_create(k) })
        return kset.to_obj()
    })
})

test('hset length', function (t) {
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
        var set = set_mod3()
        keys.forEach(function (k) { set.put_create(k) })
        return set.length
    })
})

test('for_val function', function (t) {
    var set1 = hmap.string_set()
    var vals = ['a','b']
    hmap.for_val(vals, function (v, i) { t.same(vals[i], v, 'array iteration') })
    hmap.for_val(vals, function (v) {
        set1.put_s(v)
    })
    t.same(set1.to_obj(), vals, 'set has all values')

    hmap.for_val(set1, function (v, i) { t.same(v.s, vals[i], 'vals[' + i + ']') })
    t.end()
})

test('find', function (t) {
    t.table_assert([
        [ 'vals',                 'find_val',   'exp' ],
        [ [],                     'x',          null ],
        [ [ 'a' ],                'x',          null ],
        [ [ 'a' ],                'a',          'a' ],
        [ [ 'a', 'b', 'a' ],      'b',          'b' ],
        [ [ 'a', 'b', 'a' ],      'a',          'a' ],
    ], function (vals, find_val) {
        var set = set_mod3()
        vals.forEach(function (v) { set.put_create(v) })
        var res = set.find(function (v) { return v.v === find_val })
        return res && res.v || null
    })
})

test('first and last functions', function (t) {
    t.table_assert([
        [ 'keys',                  'exp' ],
        [ [],                      [undefined, undefined] ],
        [ [ 'a' ],                 ['a', 'a'] ],
        [ [ 'a', 'b', 'a' ],       ['a', 'b'] ],
        [ [ 'a', 'b', 'c' ],       ['a', 'c'] ],
        [ [ 'a', 'b', 'c', 'a' ],  ['a', 'c'] ],
    ], function (vals) {
        var set = hmap.string_set()
        vals.forEach(function (v) {set.put_s(v)})

        return [ hmap.first(set) && hmap.first(set).s, hmap.last(set) && hmap.last(set).s ]
    })
})

test('validate', function (t) {
    var master = hmap.string_set(null, {validate_args_fn: function (args) {
        if (args[0] === 'oh no!') { throw Error('my validation error') }
    }})

    master.put_s('ok')
    master.put_s('all_good')
    t.throws(function () {master.put_s('oh no!')}, /my validation error/)
    t.same(master.to_obj(), [ 'ok', 'all_good' ])
    t.end()
})

test('first and last', function (t) {
    var master = hmap.string_set()
    var set1 = master.hset()

    var abc = ['a','b','c'].map(function (v) {return master.put_create(v)})
    t.same(master.to_obj(), ['a','b','c'])
    t.same(master.first(), { hash: 97, col: 0, s: 'a' })
    t.same(master.last(), { hash: 99, col: 0, s: 'c' })

    t.same(set1.first(), undefined)
    t.same(set1.last(), undefined)
    t.same(set1.to_obj(), [])
    t.end()
})

test('various put and get', function (t) {
    var master = hmap.string_set()
    var set1 = master.hset()
    var aa = set1.put_create('aa')
    t.same(set1.to_obj(), ['aa'])

    var set2 = master.hset()
    set2.put_all(set1)

    t.same(set2.get(aa).to_obj(), 'aa')

    var bb = master.put_s('bb')
    var cc = master.put_s('cc')

    set2.put_all([bb, cc])
    t.same(set2.get(bb).to_obj(), 'bb')

    t.end()
})

test('same_hashes', function (t) {
    var master = hmap.string_set()
    var set1 = master.hset()

    t.same(master.same_hashes(set1), true)
    t.same(set1.same_hashes(master), true)
    t.same(set1.same_hashes(master.map), true)

    var xxx = master.put_s('xxx')

    t.same(master.map.same_hashes(set1), false)
    t.same(set1.map.same_hashes(master), false)
    t.same(set1.map.same_hashes(master.map), false)

    set1.put_s('yyy')
    t.same(master.map.same_hashes(set1), false)
    t.same(set1.map.same_hashes(master), false)

    set1.put(xxx)
    t.same(master.map.same_hashes(set1), true)
    t.same(set1.map.same_hashes(master), true)

    // make different sets, but having the same hash array length (same highest value)
    var set2 = master.hset()
    set2.put_all(set1)
    var a = set1.put_s('a')
    var b = set2.put_s('b')

    t.same(set1.same_hashes(set2), false)
    t.same(set2.same_hashes(set1), false)

    set1.put(b)
    set2.put(a)


    // create collisions (lower than xxx, yyy to test comparison after length checks)
    // 4T, 3s, and 55 collide
    set1.put_s('55')            // put highest colliding value in both sets (to get past length check on collisions)
    set2.put_s('55')
    t.same(set1.same_hashes(set2), true)

    // put different lower colliding values in each set
    set1.put_s('3s')
    t.same(set1.to_obj({include_stats:1}), [ 'yyy', 'xxx', 'a', 'b', '55', '3s', { $collisions: 2 } ])
    set2.put_s('4T')
    t.same(set2.to_obj({include_stats:1}), [ 'yyy', 'xxx', 'b', 'a', '55', '4T', { $collisions: 2 } ])
    t.same(set1.same_hashes(set2), false)
    t.same(set2.same_hashes(set1), false)

    // put same lower colliding values in each set
    set1.put_s('4T')
    t.same(set1.to_obj({include_stats:1}), [ 'yyy', 'xxx', 'a', 'b', '55', '3s', '4T', { $collisions: 3 } ])
    set2.put_s('3s')
    t.same(set2.to_obj({include_stats:1}), [ 'yyy', 'xxx', 'b', 'a', '55', '4T', '3s', { $collisions: 3 } ])
    t.same(set1.same_hashes(set2), true)
    t.same(set2.same_hashes(set1), true)

    t.end()
})

// return a set set that stores strings and creates collisions every 3rd value
function set_mod3 (opt) {
    opt = opt || {}
    var to_obj_fn = opt.support_to_obj ? function () { return this.v } : null

    return hmap.set({
        hash_fn: function (args) { return (args[0].charCodeAt(0) % 3) },  // creates collisions a..d..g..j...
        equal_fn: function (prev, args) { return prev.v === args[0] },
        create_fn: function (h, c, prev, args) {
            if (prev) { return prev }
            var ret = { hash: h, col: c, v: args[0] }
            if (to_obj_fn) { ret.to_obj = to_obj_fn }
            return ret
        },
        str2args_fn: function (s) { return [s] },
    }, opt)
}