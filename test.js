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

test('hmap put', function (t) {
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

