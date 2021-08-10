# qb-hmap

A raw and very fast hashmap optimized for javascript, suitable for working with raw buffers.

Javascript applications that parse large amounts of text in UTF8 can take a heavy performance penalty 
converting to and from string objects.  [qb-json-next](https://github.com/quicbit-js/qb-json-next/) 
is probably the lightest and fastest parsing solution, returning only integer tokens and integer ranges 
and creating no objects as it parses.  But if an application needs to track, reduce and refine results,
raw tokens and buffers and arrays are not enough - maps and sets are needed.
qb-hmap offers a high performance solution for maps and sets on top of the raw buffer/token results.

qb-hmap supports buffer-reference objects that can point to 
buffer segments and generate hash and collision values.  Actually, qb-hmap supports any 
object that can attach **'hash'** and **'col'** (collision) integer properties.

An exposed hash and collision property, is also an advantage for storing and comparing
*composed* hash objects, such as Merkle Trees.  With a good hash distribution and a simple collision management trick, most
lookups are the cost of a just one integer array lookup and rarely, an additional lookup
in the collision array. Lookup by value is the cost of hashing, array lookup, and rarely 
two (or three very rarely) value comparisons.


# install

npm install qb-hmap

