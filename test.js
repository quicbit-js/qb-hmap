// Software License Agreement (ISC License)
//
// Copyright (c) 2023, Matthew Voss
//
// Permission to use, copy, modify, and/or distribute this software 
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

function create_map (hc_vals, opt) {
  var map = hmap.string_set(opt).hmap()
  hc_vals.forEach(function (hcv) {
    map.put_hc(...hcv)
  })
  return map
}

test('hash', function (t) {
  t.table_assert([
    ['a', 'b', 'exp'],
    [1, 2, 35],
    [35, 3, 1152],
    [1152, 4, 38020],
    [97, 98, 3299],
    [3299, 99, 108832],
    [108832, 99, 3591491],
  ], hmap.hash)
})

test('hmap collisions', function (t) {
  t.table_assert([
    ['hc_vals', 'exp'],
    [[[0, 0, 'a']], []],
    [[[1, 0, 'b']], []],
    [[[0, 0, 'a'], [1, 0, 'b']], []],
    [[[0, 0, 'a'], [1, 0, 'b'], [0, 0, 'c']], []],
    [[[0, 0, 'a'], [1, 0, 'b'], [0, 0, 'b']], []],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c']], []],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 1, 'c']], [['b', 'c']]],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c']], [['b', 'c']]],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], [['b', 'd', 'c']]],
  ], function (hc_vals) {
    return create_map(hc_vals).collisions()
  })
})

test('hmap indexes', function (t) {
  t.table_assert([
    ['hc_vals', 'exp'],
    [[[0, 0, 'a']], [[0, 0]]],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c']], [[0, 0], [1, 0]]],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c']], [[0, 0], [1, 0], [1, 2]]],
    [[[0, 0, 'a']], [[0, 0]]],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c']], [[0, 0], [1, 0]]],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c']], [[0, 0], [1, 0], [1, 2]]],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], [[0, 0], [1, 0], [1, 2], [1, 1]]],
  ], function (hc_vals) {
    var m = create_map(hc_vals)
    return m.h_arr.map(function (h, i) { return [h, m.c_arr[i]] })
  })
})

test('hmap for_val', function (t) {
  t.table_assert([
    ['hc_vals', 'halt', 'exp'],
    [[[0, 0, 'a']], 9, ['a']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c']], 9, ['a', 'c']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], 9, ['a', 'b', 'c', 'd']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], 0, []],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], 1, ['a']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], 2, ['a', 'b']],
    [[[0, 0, 'a']], 9, ['a']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c']], 9, ['a', 'c']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], 9, ['a', 'b', 'c', 'd']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], 0, []],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], 1, ['a']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], 2, ['a', 'b']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], 4, ['a', 'b', 'c', 'd']],
  ], function (hc_vals, halt) {
    var map = create_map(hc_vals)
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
    [ 'hc_vals',                                              'halt', 'exp' ],
    [ [ [0, 0, 'a'] ],                                        9,      [ [0, 0], 'a' ] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],              9,      [ [0, 0], 'a', [1, 0], 'c' ] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 9,      [ [0, 0], 'a', [1, 0], 'b', [1, 2], 'c', [1, 1], 'd' ] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 0,      [] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 1,      [ [0, 0], 'a' ] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 2,      [ [0, 0], 'a', [1, 0], 'b' ] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 4,      [ [0, 0], 'a', [1, 0], 'b', [1, 2], 'c', [1, 1], 'd' ] ],
    [ [ [0, 0, 'a'] ],                                        9,      [ [0, 0], 'a' ] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],              9,      [ [0, 0], 'a', [1, 0], 'c' ] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 9,      [ [0, 0], 'a', [1, 0], 'b', [1, 2], 'c', [1, 1], 'd' ] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 0,      [] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 1,      [ [0, 0], 'a' ] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 2,      [ [0, 0], 'a', [1, 0], 'b' ] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 4,      [ [0, 0], 'a', [1, 0], 'b', [1, 2], 'c', [1, 1], 'd' ] ],
  ], function (hc_vals, halt) {
    var map = create_map(hc_vals)
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


test('hmap for_key (without all_keys set)', function (t) {
  t.table_assert([
    [ 'hc_vals',                                              'halt', 'exp' ],
    [ [ [0, 0, 'a'] ],                                        9,      [ [0, 0] ] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c'] ],              9,      [ [0, 0], [1, 0] ] ],
    [ [ [0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd'] ], 4,      [ [0, 0], [1, 0], [1, 2], [1, 1]] ],
  ], function (hc_vals, halt) {
    var map = create_map(hc_vals)
    var ret = []
    map.for_key(function (k, i) {
      if (i === halt) {
        return map.HALT
      }
      ret.push(k)
    })
    return ret
  })
})

test('hmap for_key (with all_keys set)', function (t) {
  t.table_assert([
    [ 'hc_vals',                    'halt', 'exp' ],
    [ {a:1},                        9,      [ 'a' ] ],
    [ {a:1, b:2, c:3},              9,      [ 'a', 'b', 'c' ] ],
    [ {a:1, b:2, c:3},              1,      [ 'a'] ],
  ], function (keyvals, halt) {
    let ss = hmap.string_set()
    let map = ss.hmap()
    Object.keys(keyvals).forEach((k) => {
      map.put(k, keyvals[k])
    })

    var ret = []
    map.for_key(function (k, i) {
      if (i === halt) {
        return map.HALT
      }
      ret.push(k.src.toString())
    })
    return ret
  })
})


test('hmap vals', function (t) {
  t.table_assert([
    ['hc_vals', 'exp'],
    [[[0, 0, 'a']], ['a']],
    [[[1, 0, 'b']], ['b']],
    [[[0, 0, 'a'], [1, 0, 'b']], ['a', 'b']],
    [[[0, 0, 'a'], [1, 0, 'b'], [0, 0, 'c']], ['c', 'b']],
    [[[0, 0, 'a'], [1, 0, 'b'], [0, 0, 'b']], ['b', 'b']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c']], ['a', 'c']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 1, 'c']], ['a', 'b', 'c']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c']], ['a', 'b', 'c']],
    [[[0, 0, 'a']], ['a']],
    [[[1, 0, 'b']], ['b']],
    [[[0, 0, 'a'], [1, 0, 'b']], ['a', 'b']],
    [[[0, 0, 'a'], [1, 0, 'b'], [0, 0, 'c']], ['c', 'b']],
    [[[0, 0, 'a'], [1, 0, 'b'], [0, 0, 'b']], ['b', 'b']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 0, 'c']], ['a', 'c']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 1, 'c']], ['a', 'b', 'c']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c']], ['a', 'b', 'c']],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], ['a', 'b', 'c', 'd']],
  ], function (hc_vals) {
    return create_map(hc_vals, null).vals()
  })
})

test('hmap to_obj', function (t) {
  t.table_assert([
    [ 'super_vals', 'super_opt',           'hmap_vals',    'to_obj_opt',         'exp' ],
    [ [ 'a' ],      null,                  { a: 1 },       null,                 [ [{hash:1,col:0,v:'a',idx:0}, 1] ] ],
    [ [ 'a', 'b' ], null,                  { a: 1, b: 2 }, null,                 [ [{hash:1,col:0,v:'a',idx:0}, 1], [{hash:2,col:0,v:'b',idx:1}, 2] ] ],
    [ [ 'a', 'b' ], null,                  { a: 1, b: 2 }, { include_stats: 1 }, [ [{hash:1,col:0,v:'a',idx:0}, 1], [{hash:2,col:0,v:'b',idx:1}, 2] ] ],
    [ [ 'a' ],      { support_to_obj: 1 }, { a: 1 },       null,                 { a: 1 } ],
    [ [ 'a', 'd' ], { support_to_obj: 1 }, { a: 1, d: 2 }, { include_stats: 1 }, { a: 1, d: 2, $collisions: 2 } ],
  ], function (super_vals, super_opt, hmap_vals, to_obj_opt) {
    var superset = set_mod3(super_opt)
    var map = superset.hmap()
    map.put_obj(hmap_vals)
    return map.to_obj(to_obj_opt)
  })
})

test('hmap length', function (t) {
  t.table_assert([
    ['hc_vals', 'exp'],
    [[[0, 0, 'a']], 1],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], 4],
    [[[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], 4],
  ], function (hc_vals) {
    return create_map(hc_vals).length
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
    ['h', 'c', 'exp'],
    [0, 0, 'a'],
    [0, 1, undefined],
    [1, 0, 'b'],
    [1, 3, 'c'],
    [1, 4, undefined],
  ], function (h, c) {
    return map.get({ hash: h, col: c })
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
    ['h', 'c', 'v', 'exp'],
    [1, 4, 'e', ['e', ['a', 'b', 'c', 'd', 'e']]],
    [1, 3, 'e', ['e', ['a', 'b', 'e', 'd']]],
  ], function (h, c, v) {
    var map = create_map(map_vals, null)
    var ret = map.put({ hash: h, col: c }, v)
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
  t.table_assert([
    ['h', 'c', 'v', 'exp'],
    [1, 0, 'e', ['a', 'e', 'c', 'd']],
    [1, 4, 'e', ['a', 'b', 'c', 'd', 'e']],
    [1, 3, 'e', ['a', 'b', 'e', 'd']],
  ], function (h, c, v) {
    var map = create_map(map_vals)
    map.put_hc(h, c, v)
    return map.vals()
  })
})

test('hmap errors', function (t) {
  var map = create_map([[0, 0, 'a'], [1, 0, 'b'], [1, 2, 'c'], [1, 1, 'd']], { test_mode: 1, insert_order: 1 })
  t.table_assert([
    ['method', 'args', 'exp'],
    ['put_hc', [], /undefined value/],
    ['put_hc', [undefined, 0, 'a'], /invalid hash/],
    ['put_hc', [1, undefined, 'a'], /invalid collision/],
    ['get_hc', [], /invalid hash/],
    ['get_hc', [1], /invalid collision/],
  ], function (method, args) {
    map[method].apply(map, args)
  }, { assert: 'throws' })
})

test('hset', function (t) {
  t.table_assert([
    ['keys', 'exp'],
    [[], []],
    [['a'], [{ hash: 1, col: 0, v: 'a', idx: 0 }]],
    [['a', 'a'], [{ hash: 1, col: 0, v: 'a', idx: 0 }]],
    [['a', 'b'], [{ hash: 1, col: 0, v: 'a', idx: 0 }, { hash: 2, col: 0, v: 'b', idx: 1 }]],
    [['a', 'b', 'a'], [{ hash: 1, col: 0, v: 'a', idx: 0 }, { hash: 2, col: 0, v: 'b', idx: 1 }]],
    [['a', 'd'], [{ hash: 1, col: 0, v: 'a', idx: 0 }, { hash: 1, col: 1, v: 'd', idx: 1 }]],
    [['a', 'd', 'a'], [{ hash: 1, col: 0, v: 'a', idx: 0 }, { hash: 1, col: 1, v: 'd', idx: 1 }]],
    [['a', 'd', 'g'], [{ hash: 1, col: 0, v: 'a', idx: 0 }, { hash: 1, col: 1, v: 'd', idx: 1 }, { hash: 1, col: 2, v: 'g', idx: 2 }]],
    [['a', 'd', 'g', 'd'], [{ hash: 1, col: 0, v: 'a', idx: 0 }, { hash: 1, col: 1, v: 'd', idx: 1 }, { hash: 1, col: 2, v: 'g', idx: 2 }]],
  ], function (keys) {
    var set = set_mod3()
    keys.forEach(function (k) { set.put(k) })
    return set.vals()
  })
})

test('hset put existing', function (t) {
  t.table_assert([
    [ 'keys',            'exp' ],
    [ [],                [] ],
    [ [ 'a' ],           [ {hash: 1, col: 0, v: 'a', idx: 0} ] ],
    [ [ 'a', 'a' ],      [ {hash: 1, col: 0, v: 'a', idx: 0} ] ],
    [ [ 'a', 'b' ],      [ {hash: 1, col: 0, v: 'a', idx: 0}, {hash: 2, col: 0, v: 'b', idx: 1} ] ],
    [ [ 'a', 'b', 'a' ], [ {hash: 1, col: 0, v: 'a', idx: 0}, {hash: 2, col: 0, v: 'b', idx: 1} ] ],
  ], function (keys) {
    var set1 = set_mod3()
    var objs = keys.map(function (k) { return set1.put(k) })
    var set2 = set_mod3()
    objs.forEach(function (o) { set2.put(o) })
    return set2.vals()
  })
})

test('hset to_obj()', function (t) {
  t.table_assert([
    ['keys', 'support_to_obj', 'exp'],
    [[], 0, []],
    [['a'], 0, [{ hash: 1, col: 0, v: 'a', idx: 0 }]],
    [['a', 'a'], 0, [{ hash: 1, col: 0, v: 'a', idx: 0 }]],
    [['a', 'b'], 0, [{ hash: 1, col: 0, v: 'a', idx: 0 }, { hash: 2, col: 0, v: 'b', idx: 1 }]],
    [['a', 'b', 'a'], 0, [{ hash: 1, col: 0, v: 'a', idx: 0 }, { hash: 2, col: 0, v: 'b', idx: 1 }]],
    [['a', 'd'], 0, [{ hash: 1, col: 0, v: 'a', idx: 0 }, { hash: 1, col: 1, v: 'd', idx: 1 }]],
    [['a', 'd', 'a'], 0, [{ hash: 1, col: 0, v: 'a', idx: 0 }, { hash: 1, col: 1, v: 'd', idx: 1 }]],
    [['a', 'd', 'g'], 0, [{ hash: 1, col: 0, v: 'a', idx: 0 }, { hash: 1, col: 1, v: 'd', idx: 1 }, { hash: 1, col: 2, v: 'g', idx: 2 }]],
    [['a', 'd', 'g', 'd'], 1, ['a', 'd', 'g']],
  ], function (keys, support_to_obj) {
    var kset = set_mod3({ support_to_obj: support_to_obj })
    keys.forEach(function (k) { kset.put(k) })
    return kset.to_obj()
  })
})

test('hset length', function (t) {
  t.table_assert([
    ['keys', 'exp'],
    [[], 0],
    [['a'], 1],
    [['a', 'a'], 1],
    [['a', 'b'], 2],
    [['a', 'b', 'a'], 2],
    [['a', 'd'], 2],
    [['a', 'd', 'a'], 2],
    [['a', 'd', 'g'], 3],
    [['a', 'd', 'g', 'd'], 3],
  ], function (keys) {
    var set = set_mod3()
    keys.forEach(function (k) { set.put(k) })
    return set.length
  })
})

test('for_val function', function (t) {
  var set1 = hmap.string_set()
  var vals = ['a', 'b']
  hmap.for_val(vals, function (v, i) { t.same(vals[i], v, 'array iteration') })
  hmap.for_val(vals, function (v) {
    set1.put(v)
  })
  t.same(set1.to_obj(), vals, 'set has all values')

  hmap.for_val(set1, function (v, i) { t.same(v.toString(), vals[i], 'vals[' + i + ']') })
  t.end()
})

test('find', function (t) {
  t.table_assert([
    ['vals', 'find_val', 'exp'],
    [[], 'x', null],
    [['a'], 'x', null],
    [['a'], 'a', 'a'],
    [['a', 'b', 'a'], 'b', 'b'],
    [['a', 'b', 'a'], 'a', 'a'],
  ], function (vals, find_val) {
    var set = set_mod3()
    vals.forEach(function (v) { set.put(v) })
    var res = set.find(function (v) { return v.v === find_val })
    return res && res.v || null
  })
})

test('first and last functions', function (t) {
  t.table_assert([
    ['keys', 'exp'],
    [[], [undefined, undefined]],
    // [ [ 'a' ],                 ['a', 'a'] ],
    [['a', 'b', 'a'], ['a', 'b']],
    [['a', 'b', 'c'], ['a', 'c']],
    [['a', 'b', 'c', 'a'], ['a', 'c']],
  ], function (vals) {
    var set = hmap.string_set()
    vals.forEach(function (v) { set.put(v) })

    return [hmap.first(set) && hmap.first(set).toString(), hmap.last(set) && hmap.last(set).toString()]
  })
})

test('first and last', function (t) {
  var superset = hmap.string_set()
  var set1 = superset.hset()

  var abc = ['a', 'b', 'c'].map(function (v) { return superset.put(v).to_obj() })
  t.same(abc, ['a', 'b', 'c'])
  t.same(superset.to_obj(), ['a', 'b', 'c'], 'to_obj()')
  t.same(superset.first.to_obj(), 'a', 'first()')
  t.same(superset.last.to_obj(), 'c', 'last()')

  t.same(set1.first, undefined, 'first() undefined')
  t.same(set1.last, undefined, 'last() undefined')
  t.same(set1.to_obj(), [], 'to_obj() empty')
  t.end()
})

test('clear', function (t) {
  let s1 = hmap.string_set()
  s1.put('one')
  s1.put('two')
  t.same(s1.to_obj(), [ 'one', 'two' ])
  s1.clear()
  t.same(s1.to_obj(), [])
  t.end()
})

test('cop(y)', function (t) {
  let ss = hmap.string_set()
  let s1 = ss.hset()
  let sblank = s1.cop(0)
  t.same(sblank.to_obj(), [])

  s1.put('one')
  t.same(s1.to_obj(), ['one'])

  let s2 = s1.cop()
  let s3 = s2.cop(1)    // test n copy
  t.same(s2.to_obj(), ['one'])
  t.same(s3.to_obj(), ['one'])

  s2.put('two')
  t.same(s1.to_obj(), ['one'])
  t.same(s2.to_obj(), ['one', 'two'])
  t.same(s3.to_obj(), ['one'])

  t.throws(function () {s2.cop(1)}, /map only supports full copy/, 'incorrect exception')
  t.throws(function () {s2.cop(-1)}, /map only supports full copy/, 'incorrect exception')

  t.end()
})

test('map put and get', function (t) {
  var superset = hmap.string_set()
  var m1 = superset.hmap()
  var aa_val = m1.put('aa', 1)
  t.same(m1.to_obj(), {aa: 1})
  t.same(m1.get('aa'), aa_val)
  t.end()
})

test('set put and get', function (t) {
  var superset = hmap.string_set()
  var set1 = superset.hset()
  var aa = set1.put('aa')
  t.same(set1.to_obj(), ['aa'])

  var set2 = superset.hset()
  set2.put_all(set1)

  t.same(set2.get(aa).to_obj(), 'aa')

  var bb = superset.put('bb')
  var cc = superset.put('cc')

  set2.put_all([bb, cc])
  t.same(set2.get(bb).to_obj(), 'bb')

  t.end()
})

test('same_hashes', function (t) {
  var superset = hmap.string_set()
  var set1 = superset.hset()

  t.same(superset.same_hashes(set1), true)
  t.same(set1.same_hashes(superset), true)
  t.same(set1.same_hashes(superset.map), true)

  var xxx = superset.put('xxx')

  t.same(superset.map.same_hashes(set1), false)
  t.same(set1.map.same_hashes(superset), false)
  t.same(set1.map.same_hashes(superset.map), false)

  set1.put('yyy')
  t.same(superset.map.same_hashes(set1), false)
  t.same(set1.map.same_hashes(superset), false)

  set1.put(xxx)
  t.same(superset.map.same_hashes(set1), true)
  t.same(set1.map.same_hashes(superset), true)

  // make different sets, but having the same hash array length (same highest value)
  var set2 = superset.hset()
  set2.put_all(set1)
  var a = set1.put('a')
  var b = set2.put('b')

  t.same(set1.same_hashes(set2), false)
  t.same(set2.same_hashes(set1), false)

  set1.put(b)
  set2.put(a)


  // create collisions (lower than xxx, yyy to test comparison after length checks)
  // 4T, 3s, and 55 collide
  set1.put('55')            // put highest colliding value in both sets (to get past length check on collisions)
  set2.put('55')
  t.same(set1.same_hashes(set2), true)

  // put different lower colliding values in each set
  set1.put('3s')
  t.same(set1.to_obj({ include_stats: 1 }), ['yyy', 'xxx', 'a', 'b', '55', '3s', { $collisions: 2 }])
  set2.put('4T')
  t.same(set2.to_obj({ include_stats: 1 }), ['yyy', 'xxx', 'b', 'a', '55', '4T', { $collisions: 2 }])
  t.same(set1.same_hashes(set2), false)
  t.same(set2.same_hashes(set1), false)

  // put same lower colliding values in each set
  set1.put('4T')
  t.same(set1.to_obj({ include_stats: 1 }), ['yyy', 'xxx', 'a', 'b', '55', '3s', '4T', { $collisions: 3 }])
  set2.put('3s')
  t.same(set2.to_obj({ include_stats: 1 }), ['yyy', 'xxx', 'b', 'a', '55', '4T', '3s', { $collisions: 3 }])
  t.same(set1.same_hashes(set2), true)
  t.same(set2.same_hashes(set1), true)

  t.end()
})

// return a set set that stores strings and creates collisions every 3rd value
function set_mod3 (opt) {
  opt = opt || {}
  var to_obj_fn = opt.support_to_obj ? function () { return this.v } : null

  return hmap.set({
    hash_fn: function (s) { return (s.charCodeAt(0) % 3) },  // creates collisions a..d..g..j...
    equal_fn: function (prev, s) { return prev.v === s },
    put_merge_fn: function (h, c, prev, v) {
      if (prev) { return prev }
      var ret = { hash: h, col: c, v: v }
      if (to_obj_fn) { ret.to_obj = to_obj_fn }
      return ret
    },
  }, opt)
}