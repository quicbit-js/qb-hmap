# qb-hmap

A simple and very fast hashmap optimized for javascript.  The map uses the 
"hash" and collision "col" integer properties of key objects to lookup values (one lookup except
when their are collisions).

Keys used in an hmap need to have well-distributed .hash properties and need to have .col defined.  hmap
provides the 'key_set()' function to aid with this construction.  key_set allows you to define hash, 
equality, and object creation on an arbitrary array of arguments and applies these functions *minimally* and
lazily.  What this means is that if you have a huge number of buffer slices to be turned into keys, your 
provided functions can check existence in the hash (linear or constant time) only creating objects when
needed.  In theory, javascript does this for you with string creation, but when working with UTF8 encodings, there
can be significant overhead when parsing a buffer incurred by converting back and forth to strings.

**key_set()** handles collision assignment and tracking of all keys to be used in your maps.

    var hmap = require('qb-hmap)
    
    var hash_fn = function (args) { return (args[0].charCodeAt(0) % 3) }  // creates collisions a..d..g..j...
    var equal_fn = function (prev, args) { return prev.v === args[0] }
    var create_fn = function (h, c, prev, args) { return {hash: h, col: c, v: args[0] } }

    var kset = hmap.key_set(
Objects used as keys must provide their own well-distributed hash property.  Before using
as a key, the object must be given a collision property by simply adding
all in-scope objects to a master cache (a qb-map) using put_assign().  These objects can then 
be used to create other maps that are extremely fast and efficient. 
 

