"""
Example algorithms for testing the complexity analyzer.
"""

# O(1) - Constant Time
def get_first_element(arr):
    """Get the first element of an array."""
    if not arr:
        return None
    return arr[0]


# O(log n) - Logarithmic
def binary_search(arr, target):
    """Binary search for target in sorted array."""
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1


# O(n) - Linear
def linear_search(arr, target):
    """Linear search for target in array."""
    for i, element in enumerate(arr):
        if element == target:
            return i
    return -1


# O(n) - Linear with O(n) space
def duplicate_array(arr):
    """Create a copy of the array."""
    result = []
    for element in arr:
        result.append(element)
    return result


# O(n log n) - Linearithmic
def merge_sort(arr):
    """Sort array using merge sort."""
    if len(arr) <= 1:
        return arr
    
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    
    return merge(left, right)


def merge(left, right):
    """Merge two sorted arrays."""
    result = []
    i = j = 0
    
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    
    result.extend(left[i:])
    result.extend(right[j:])
    return result


# O(n²) - Quadratic
def bubble_sort(arr):
    """Sort array using bubble sort."""
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr


# O(n²) - Quadratic with nested loops
def find_pairs_with_sum(arr, target_sum):
    """Find all pairs that sum to target."""
    pairs = []
    n = len(arr)
    
    for i in range(n):
        for j in range(i + 1, n):
            if arr[i] + arr[j] == target_sum:
                pairs.append((arr[i], arr[j]))
    
    return pairs


# O(n³) - Cubic
def matrix_multiply(A, B):
    """Multiply two matrices."""
    n = len(A)
    m = len(B[0])
    p = len(B)
    
    result = [[0] * m for _ in range(n)]
    
    for i in range(n):
        for j in range(m):
            for k in range(p):
                result[i][j] += A[i][k] * B[k][j]
    
    return result


# O(2^n) - Exponential
def fibonacci_recursive(n):
    """Calculate fibonacci number recursively (inefficient)."""
    if n <= 1:
        return n
    return fibonacci_recursive(n - 1) + fibonacci_recursive(n - 2)


# O(n) with O(n) space - Dynamic Programming
def fibonacci_dp(n):
    """Calculate fibonacci number with memoization."""
    if n <= 1:
        return n
    
    dp = [0] * (n + 1)
    dp[1] = 1
    
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    
    return dp[n]


# O(n!) - Factorial
def generate_permutations(arr):
    """Generate all permutations of array."""
    if len(arr) <= 1:
        return [arr]
    
    result = []
    for i, element in enumerate(arr):
        remaining = arr[:i] + arr[i + 1:]
        for perm in generate_permutations(remaining):
            result.append([element] + perm)
    
    return result


# Complex example - Multiple complexities
def complex_algorithm(data, queries):
    """
    Process data and answer queries.
    
    - Building index: O(n)
    - Each query: O(log n)
    - Total: O(n + q * log n) where n = len(data), q = len(queries)
    """
    # Build sorted index - O(n log n)
    sorted_data = sorted(enumerate(data), key=lambda x: x[1])
    values = [x[1] for x in sorted_data]
    indices = [x[0] for x in sorted_data]
    
    results = []
    
    # Answer each query using binary search - O(q * log n)
    for query in queries:
        idx = binary_search(values, query)
        if idx != -1:
            results.append(indices[idx])
        else:
            results.append(-1)
    
    return results


if __name__ == "__main__":
    # Test the algorithms
    arr = [64, 34, 25, 12, 22, 11, 90]
    
    print("Original array:", arr)
    print("Bubble sorted:", bubble_sort(arr.copy()))
    print("Merge sorted:", merge_sort(arr.copy()))
    print("Binary search for 25:", binary_search(sorted(arr), 25))
    print("Fibonacci(10):", fibonacci_dp(10))
    print("Permutations of [1,2,3]:", generate_permutations([1, 2, 3]))
