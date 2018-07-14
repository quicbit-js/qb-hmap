# qb-hmap

A simple and very fast hashmap optimized for javascript.  The map uses the 
"hash" and collision "col" integer properties of key objects to lookup values (one lookup except
when their are collisions).

Objects used as keys must provide their own well-distributed hash property.  Before using
as a key, the object must be given a collision property by simply adding
all in-scope objects to a master cache (a qb-map) using put_assign().  These objects can then 
be used to create other maps that are extremely fast and efficient. 
 

