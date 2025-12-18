// Example JavaScript algorithms for complexity analysis

// O(1) - Constant
function getFirst(arr) {
    return arr[0];
}

// O(n) - Linear
function sumArray(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        sum += arr[i];
    }
    return sum;
}

// O(n²) - Quadratic
function hasDuplicate(arr) {
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] === arr[j]) {
                return true;
            }
        }
    }
    return false;
}

// O(n) with O(n) space - Using hash set
function hasDuplicateOptimized(arr) {
    const seen = new Set();
    for (const item of arr) {
        if (seen.has(item)) {
            return true;
        }
        seen.add(item);
    }
    return false;
}

// O(n log n) - Quick sort
function quickSort(arr) {
    if (arr.length <= 1) return arr;
    
    const pivot = arr[Math.floor(arr.length / 2)];
    const left = arr.filter(x => x < pivot);
    const middle = arr.filter(x => x === pivot);
    const right = arr.filter(x => x > pivot);
    
    return [...quickSort(left), ...middle, ...quickSort(right)];
}

// O(2^n) - Power set
function powerSet(arr) {
    const result = [[]];
    
    for (const element of arr) {
        const newSubsets = result.map(subset => [...subset, element]);
        result.push(...newSubsets);
    }
    
    return result;
}

module.exports = {
    getFirst,
    sumArray,
    hasDuplicate,
    hasDuplicateOptimized,
    quickSort,
    powerSet
};
