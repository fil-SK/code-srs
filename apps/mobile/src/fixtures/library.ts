import type { MobileLibraryViewModel } from '@/src/types/library'

// Intentional route-level presentation fixture. A future mobile composition
// root will replace this factory with shared hooks and derived deck metrics.
export function createMobileLibraryFixture(): MobileLibraryViewModel {
  return {
    collections: [
      { id: 'all', name: 'All Decks', kind: 'all' },
      { id: 'fixture-interview-core', name: 'Interview Core', kind: 'collection' },
      { id: 'fixture-languages-cpp', name: 'Languages & C++', kind: 'collection' },
      { id: 'unfiled', name: 'Unfiled', kind: 'unfiled' },
      { id: 'fixture-systems', name: 'Systems', kind: 'collection' },
      { id: 'fixture-research', name: 'Research', kind: 'collection' },
    ],
    decks: [
      {
        id: 'fixture-security-engineering',
        name: 'Security Engineering',
        description: 'Security concepts, threat models, and best practices',
        cardCount: 0,
        dueCount: 0,
        progressPercent: 0,
        lastStudiedLabel: 'Never',
      },
      {
        id: 'fixture-computer-networks',
        name: 'Computer Networks',
        description: 'Network layers, routing, TCP/IP, and protocols',
        cardCount: 0,
        dueCount: 0,
        progressPercent: 0,
        lastStudiedLabel: 'Never',
      },
      {
        id: 'fixture-compiler-papers',
        name: 'Compiler Research Papers',
        description: 'Key papers on compiler design and optimizations',
        cardCount: 0,
        dueCount: 0,
        progressPercent: 0,
        lastStudiedLabel: 'Never',
      },
      {
        id: 'fixture-leetcode-patterns',
        name: 'LeetCode Patterns',
        description: 'Common patterns and problem-solving techniques',
        cardCount: 0,
        dueCount: 0,
        progressPercent: 0,
        lastStudiedLabel: 'Never',
      },
      {
        id: 'fixture-algorithms',
        name: 'Algorithms & Problem Solving',
        description: 'Invariants, data structures, graph reasoning, and more',
        cardCount: 30,
        dueCount: 23,
        progressPercent: 76,
        lastStudiedLabel: 'Today',
      },
      {
        id: 'fixture-compilers',
        name: 'Compilers & MLIR',
        description: 'Transferable compiler concepts from theory to IR',
        cardCount: 28,
        dueCount: 18,
        progressPercent: 63,
        lastStudiedLabel: 'Yesterday',
      },
      {
        id: 'fixture-modern-cpp',
        name: 'Modern C++ & Memory',
        description: 'Values, lifetime, ownership, and performance',
        cardCount: 24,
        dueCount: 12,
        progressPercent: 58,
        lastStudiedLabel: '2 days ago',
      },
      {
        id: 'fixture-distributed-systems',
        name: 'Systems & Distributed Systems',
        description: 'Concurrency, storage, networking, and scaling',
        cardCount: 20,
        dueCount: 7,
        progressPercent: 41,
        lastStudiedLabel: '4 days ago',
      },
    ],
  }
}
