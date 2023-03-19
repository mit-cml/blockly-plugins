/**
 * @fileoverview Represent sets of strings and numbers as JavaScript objects
 *   with an elements field that is itself an object mapping each element to true.
 * Note that ECMAScript 6 supports sets, but we cannot rely on sites using this recent a version
 * TODO(mark-friedman): We may now be safe to rewrite this using ECMAScript 6
 * @author fturbak@wellesley.edu (Lyn Turbak)
 */
'use strict';

/**
 * History:
 * [lyn, 06/30/14] added to ai2inter (should also add to master)
 * [lyn, 11/16/13] created
 */

/**
 * Construct a set from a list. If no list is provided, construct the empty set.
 */
export const NameSet = function(names) {
    if (!names) {
        names = [];
    }
    this.elements = {};
    for (let i = 0, name; name = names[i]; i++) {
        this.elements[name] = true;
    }
}

/**
 * Set membership
 * @param x: any value
 * @returns true if x is in set and false otherwise
 */
NameSet.prototype.isMember = function(x) {
    return !!this.elements[x]; // !! converts falsey to false
}

/**
 * Set emptiness
 * @returns true if set is empty and false otherwise.
 */
NameSet.prototype.isEmpty = function() {
    for(let elt in this.elements) {
        return false;
    }
    return true;
}

/**
 * Set size
 * @returns the number of elements in the set
 */
NameSet.prototype.size = function() {
    let size = 0;
    for(let elt in this.elements) {
        size++;
    }
    return size;
}

/**
 * Return a list (i.e. array) of names in this set, in lexicographic order.
 */
NameSet.prototype.toList = function() {
    const result = [];
    for (let elt in this.elements) {
        result.push(elt);
    }
    return result.sort();
}

/**
 * @returns a string representation of this set.
 */
NameSet.prototype.toString = function() {
    return "NameSet{" + this.toList().join(",")  + "}";
}

/**
 * Return a copy of this set
 */
NameSet.prototype.copy = function() {
    const result = new NameSet();
    for (let elt in this.elements) {
        result.insert(elt);
    }
    return result;
}

/**
 * Change this set to have the same elements as otherSet
 */
NameSet.prototype.mirror = function(otherSet) {
    let elt;
    for (elt in this.elements) {
        delete this.elements[elt];
    }
    for (elt in otherSet.elements) {
        this.elements[elt] = true;
    }
}

/************************************************************
 * DESTRUCTIVE OPERATIONS
 * Change the existing set
 ************************************************************/

/**
 * Destructive set insertion
 * Insert x into the set. Does not complain if x already in the set.
 * @param x: any value
 */
NameSet.prototype.insert = function(x) {
    this.elements[x] = true;
}

/**
 * Destructive set deletion.
 * Removes x from the set. Does not complain if x not in the set.
 * Note: This used to be called just "delete" but delete is a reserved
 * word, so we call this deleteName instead
 *
 * @param x: any value
 */
NameSet.prototype.deleteName = function(x) {
    delete this.elements[x];
}

/**
 * Destructive set union
 * Change this set to have the union of its elements with the elements of the other set
 * @param otherSet: a NameSet
 */
NameSet.prototype.unite = function(otherSet) {
    for (let elt in otherSet.elements) {
        this.elements[elt] = true;
    }
}

/**
 * Destructive set intersection
 * Change this set to have the intersection of its elements with the elements of the other set
 * @param otherSet: a NameSet
 */
NameSet.prototype.intersect = function(otherSet) {
    for (let elt in this.elements) {
        if (!otherSet.elements[elt]) {
            delete this.elements[elt];
        }
    }
}

/**
 * Destructive set difference
 * Change this set to have the difference of its elements with the elements of the other set
 * @param otherSet: a NameSet
 */
NameSet.prototype.subtract = function(otherSet) {
    for (let elt in this.elements) {
        if (otherSet.elements[elt]) {
            delete this.elements[elt];
        }
    }
}

/**
 * Destructive set renaming
 * Modifies existing set to rename those elements that are in the given renaming.
 * Since multiple elements may rename to the same element, this may reduce the
 * size of the set.
 * @param substitution: a substitution mapping old names to new names
 *
 */
NameSet.prototype.rename = function(substitution) {
    this.mirror(this.renamed(substitution));
}

/************************************************************
 * NONDESTRUCTIVE OPERATIONS
 * Return new sets/lists/strings
 ************************************************************/

/**
 * Nondestructive set insertion
 * Insert x into the set. Does not complain if x already in the set.
 * @param x: any value
 */
NameSet.prototype.insertion = function(x) {
    const result = this.copy();
    result.insert(x);
    return result;
}

/**
 * Nondestructive set deletion.
 * Returns a new set containing the elements of this set except for x.
 * * @param x: any value
 */
NameSet.prototype.deletion = function(x) {
    const result = this.copy();
    result.deleteName(x);
    return result;
}


/**
 * Nondestructive set union
 * @param otherSet: a NameSet
 * @returns a new set that is the union of this set and the other set.
 */
NameSet.prototype.union = function(otherSet) {
    const result = this.copy();
    result.unite(otherSet);
    return result;
}

/**
 * Nondestructive set intersection
 * @param otherSet: a NameSet
 * @returns a new set that is the intersection of this set and the other set.
 */
NameSet.prototype.intersection = function(otherSet) {
    const result = this.copy();
    result.intersect(otherSet);
    return result;
}

/**
 * Nondestructive set difference
 * @param otherSet: a NameSet
 * @returns a new set that is the differences of this set and the other set.
 */
NameSet.prototype.difference = function(otherSet) {
    const result = this.copy();
    result.subtract(otherSet);
    return result;
}

/**
 * @param substitution: a substitution mapping old names to new names
 * @returns a new set that renames the elements of this set using the given renaming.
 * If a name is not in the dictionary, it is inserted unchange in the output set.
 */
NameSet.prototype.renamed = function(substitution) {
    const result = new NameSet();
    for (let elt in this.elements) {
        const renamedElt = substitution.apply(elt);
        if (renamedElt) {
            result.insert(renamedElt);
        } else {
            result.insert(elt);
        }
    }
    return result;
}

/**
 * @param setList: an array of NameSets
 * @returns a NameSet that is the union of all the given sets
 */
NameSet.unionAll = function(setList) {
    const result = new NameSet();
    for (let i = 0, oneSet; oneSet = setList[i]; i++) {
        result.unite(oneSet)
    }
    return result;
}

/**
 * @param setList: an array of NameSets
 * @returns a NameSet that is the intersection of all the given sets
 */
NameSet.intersectAll = function(setList) {
    if (setList.length === 0) {
        return new NameSet();
    } else {
        const result = setList[0];
        for (let i = 1, oneSet; oneSet = setList[i]; i++) {
            result.intersect(oneSet)
        }
        return result;
    }
}
