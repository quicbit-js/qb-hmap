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

function str2bufs (s, sep) {
    var src = new Buffer(s)
    var sep_code = sep.charCodeAt(0)
    var lim = src.length
    var off = 0
    var i = 0
    var ret = []
    while (i < lim) {
        while (i < lim && src[i] !== sep_code) { i++ }
        ret.push({src: src, off: off, lim: i})
        i++
        off = i
    }
    return ret
}

function create_map(key_map, hc_vals, opt) {
    opt = assign( {test_mode: 1}, opt)
    var map = hmap.map(key_map, opt)
    hc_vals.forEach(function (hcv) {
        map.put_hc(hcv[0], hcv[1], hcv[2])
    })
    return map
}

test('hmap no key_set: to_obj', function (t) {
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
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], null,  [ 'a', 'b', 'd', 'c' ] ],
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
        return create_map(null, hc_vals, opt).to_obj()
    })
})

test('hmap no key_set: get', function (t) {
    t.table_assert([
        [ 'hc_vals',                                              'exp' ],
        [ [ [0, 0, 'a'] ],                                        [ 'a' ] ],
        [ [ [1, 0, 'b'] ],                                        [ 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'] ],                           [ 'a', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [0, 0, 'c'] ],              [ 'c', 'b', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [0, 0, 'b'] ],              [ 'b', 'b', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],              [ 'a', 'c', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 1, 'c'] ],              [ 'a', 'b', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'] ],              [ 'a', 'b', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], [ 'a', 'b', 'c', 'd' ] ],
    ], function (hc_vals, opt) {
        var map = create_map(null, hc_vals, opt)
        return hc_vals.map(function (hcv) {
            return map.get_hc(hcv[0], hcv[1])
        })
    })
})

test('hmap collisions', function (t) {
    t.table_assert([
        [ 'hc_vals',                                              'exp' ],
        [ [ [0, 0, 'a'] ],                                        0 ],
        [ [ [1, 0, 'b'] ],                                        0 ],
        [ [ [0, 0, 'a'], [1, 0, 'b'] ],                           0 ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [0, 0, 'c'] ],              0 ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [0, 0, 'b'] ],              0 ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],              0 ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 1, 'c'] ],              1 ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'] ],              2 ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 2 ],
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
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ],   null,    [ [0, 0], [1, 0], [1, 1], [1, 2] ] ],
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
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 9,      null,                [ 'a', 'b', 'd', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 0,      null,                [] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 1,      null,                [ 'a' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 2,      null,                [ 'a', 'b' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 4,      null,                [ 'a', 'b', 'd', 'c' ] ],
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

test('hmap vals', function (t) {
    t.table_assert([
        [ 'hc_vals',                                                    'opt',      'exp' ],
        [ [ [0, 0, 'a'] ],                                              null,       [ 'a' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],                    null,       [ 'a', 'c' ] ],
        [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ],       null,       [ 'a', 'b', 'd', 'c' ] ],
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
test('hmap errors', function (t) {
    var map = hmap.map(null, {test_mode: 1, insert_order: 1})
    ;[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']].forEach(function (hcv) {
        map.put_hc(hcv[0], hcv[1], hcv[2])
    })
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

/*
test('cache get', function (t) {
    t.table_assert([
        [ 'input',                  'create',           'exp' ],
        [ 'a',                      1,                  ['a'] ],
        [ 'a,b,c',                  1,                  ['a','b','c'] ],
        [ 'a,b,c,a',                1,                  ['a','b','c'] ],
        [ 'a,b,c,a',                0,                  [] ],
        [ '55,b,3s',                1,                  [ 'b', '55', '3s' ] ],    // collision
        [ '3s,55,3s,55,4T',         1,                   [ '3s', '55', '4T' ] ],    // collision
        [ '3s,55,3s,55',            1,                      [ '3s', '55' ] ],    // collision
        [ 'd-loading-indicator,reactlet-calendar',    1,    [ 'd-loading-indicator', 'reactlet-calendar' ] ],    // collision
    ], function (input, create) {
        var cache = bufcache()
        str2bufs(input, ',').forEach (function (b) {
            cache.get(b.src, b.off, b.lim, create)
        })
        return cache.to_obj()
    })
})

test('cache get_s', function (t) {
    t.table_assert([
        [ 'input',                  'create',           'exp' ],
        [ 'a',                      1,                  ['a'] ],
        [ '3s,55,3s,55,4T',            1,                   [ '3s', '55', '4T' ] ],    // collision
        [ 'd-loading-indicator,reactlet-calendar',    1,    [ 'd-loading-indicator', 'reactlet-calendar' ] ],    // collision
    ], function (input, create) {
        var cache = bufcache()
        input.split(',').forEach (function (s) {
            cache.get_s(s, create)
        })
        return cache.to_obj()
    })
})

test('cache get_h', function (t) {
    t.table_assert([
        [ 'input',                  'create',           'exp' ],
        [ '55,b,3s',                1,                      [ '55', 'b', '3s' ] ],    // collision
        [ '3s,55,3s,55,4T',            1,                   [ '3s', '55', '3s', '55', '4T' ] ],    // collision
        [ '3s,55,3s,55',            1,                      [ '3s', '55', '3s', '55' ] ],    // collision
    ], function (input, create) {
        var cache = bufcache()
        var ret = []
        str2bufs(input, ',').forEach (function (b) {
            var buf = cache.get(b.src, b.off, b.lim, create)
            ret.push(cache.get_h(buf.src, buf.off, buf.lim).toString())
        })
        return ret
    })
})

test('map', function (t) {
    t.table_assert([
        [ 'input',   'create', 'exp' ],
        [ 'a',       1,        [ 1, {a: 1} ] ],
        [ 'a,b,c',   1,        [ 3, {a: 1, b: 1, c: 1} ] ],
        [ 'a,a',     1,        [ 1, {a: 1} ] ],
        [ 'a,b,c,a', 1,        [ 3, {a: 1, b: 1, c: 1} ] ],
        [ '55,b,3s',                                1,          [ 3, {'55': 1, b: 1, '3s': 1} ] ],    // collision
        [ '55,3s,55',                                1,         [ 2, {'55': 1, '3s': 1} ] ],    // collision
        [ '3s,55,3s,55,4T',                         1,          [ 3, { '55': 1, '3s': 1, '4T': 1 } ] ],    // collision
        [ 'd-loading-indicator,reactlet-calendar',  1,          [ 2, {'d-loading-indicator': 1, 'reactlet-calendar': 1} ] ],    // collision
    ], function (input, create) {
        var cache = bufcache()
        var map = cache.map()
        str2bufs(input, ',').forEach (function (b) {
            var buf = cache.get(b.src, b.off, b.lim, create)
            if (!map.get(buf)) {
                map.put(buf, 1)
            }
        })

        return [map.length, map.to_obj()]
    })
})

test('cache collision', function (t) {
    t.table_assert([
        [ 'input',                  'create',               'exp' ],
        [ '55,b,3s',                1,                      [ 'b', '55', '3s' ] ],    // collision
        [ '55,3s,55',                1,                      [ '55', '3s' ] ],    // collision
        [ 'd-loading-indicator,reactlet-calendar',    1,    [ 'd-loading-indicator', 'reactlet-calendar' ] ],    // collision
    ], function (input, create) {
        var cache = bufcache()
        str2bufs(input, ',').forEach (function (b) {
            cache.get(b.src, b.off, b.lim, create)
        })
        return cache.to_obj()
    })
})

test('buf toString', function (t) {
    var cache = bufcache()
    var src = new Buffer('hi there')
    var buf = cache.get(src, 0, 5, true)
    t.same(buf.toString(), 'hi th')
    t.same(buf.toString(), 'hi th')     // call twice tests cache
    t.end()
})

test('map get_i', function (t) {
    t.table_assert([
        [ 'input',                                  'create',   'exp' ],
        [ '55,b,3s',                                1,          [ 3, {'55': 1, b: 1, '3s': 1} ] ],    // collision
        [ '55,3s,55',                                1,         [ 2, {'55': 1, '3s': 1} ] ],    // collision
        [ '3s,55,3s,55,4T',                         1,          [ 3, { '55': 1, '3s': 1, '4T': 1 } ] ],    // collision
        [ 'd-loading-indicator,reactlet-calendar',  1,          [ 2, {'d-loading-indicator': 1, 'reactlet-calendar': 1} ] ],    // collision
    ], function (input, create) {
        var cache = bufcache()
        var map = cache.map()
        str2bufs(input, ',').forEach (function (b) {
            var buf = cache.get(b.src, b.off, b.lim, create)
            if (!map.get_i([buf.hash, buf.col])) {
                map.put(buf, 1)
            }
        })

        return [map.length, map.to_obj()]
    })
})

test('map for_val', function (t) {
    t.table_assert([
        [ 'input',                                 'halt',   'exp' ],
        [ '55,b,3s',                               3,        [ 'v_55', 'v_b', 'v_3s' ] ],
        [ '55,3s,55',                              3,        [ 'v_55', 'v_3s' ] ],
        [ 'd-loading-indicator,reactlet-calendar', 3,        [ 'v_d-loading-indicator', 'v_reactlet-calendar' ] ],
        [ '3s,55,3s,55,4T',                        0,        [] ],
        [ '3s,55,3s,55,4T',                        1,        [ 'v_3s' ] ],
        [ '3s,55,3s,55,4T',                        2,        [ 'v_3s', 'v_55' ] ],
        [ '3s,55,3s,55,4T',                        3,        [ 'v_3s', 'v_55', 'v_4T' ] ],
    ], function (input, halt) {
        var cache = bufcache()
        var map = cache.map()
        str2bufs(input, ',').forEach (function (b) {
            var buf = cache.get(b.src, b.off, b.lim, 1)
            if (!map.get(buf)) {
                map.put(buf, 'v_' + buf.toString())
            }
        })

        var ret = []
        map.for_val(function (v, i) { if (i === halt) { return map.HALT } ret.push(v) })
        return ret
    })
})

test('map vals', function (t) {
    t.table_assert([
        [ 'input',                                  'exp' ],
        [ '55,b,3s',                                [ 'v_55', 'v_b', 'v_3s' ] ],
        [ '55,3s,55',                               [ 'v_55', 'v_3s' ] ],
        [ 'd-loading-indicator,reactlet-calendar',  [ 'v_d-loading-indicator', 'v_reactlet-calendar' ] ],
        [ '3s,55,3s,55,4T',                         [ 'v_3s', 'v_55', 'v_4T' ] ],
    ], function (input, halt) {
        var cache = bufcache()
        var map = cache.map()
        str2bufs(input, ',').forEach (function (b) {
            var buf = cache.get(b.src, b.off, b.lim, 1)
            if (!map.get(buf)) {
                map.put(buf, 'v_' + buf.toString())
            }
        })

        return map.vals()
    })
})

*/